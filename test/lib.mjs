// What vpkit-zola's browser checks share: the repository's places, the
// computed properties they compare, how lengths may round, and a zola build
// into a temporary directory.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const UPSTREAM = join(ROOT, 'node_modules/vpkit/test/upstream');
// test/vitepress-site, and VitePress's build of it
export const VITEPRESS_SITE = join(ROOT, 'test/vitepress-site');
export const VITEPRESS_BUILD = join(ROOT, 'test/vitepress-build');

// what test/vitepress-site holds, as one hash: test/vitepress-build/SOURCE
// records the one it was built from
export function vitepressSiteHash() {
  const hash = createHash('sha256');
  for (const f of readdirSync(VITEPRESS_SITE, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(VITEPRESS_SITE.length + 1))
    .sort()) {
    hash.update(`${f}\0`).update(readFileSync(join(VITEPRESS_SITE, f))).update('\0');
  }
  return hash.digest('hex');
}

// fail unless test/vitepress-build was built from test/vitepress-site as it is
export function checkVitepressBuild() {
  const built = /^site sha256 ([0-9a-f]{64})$/m.exec(readFileSync(join(VITEPRESS_BUILD, 'SOURCE'), 'utf8'))?.[1];
  if (built !== vitepressSiteHash()) {
    throw new Error('test/vitepress-build is stale: node scripts/build-vitepress-site.mjs');
  }
}

const SIDES = ['top', 'right', 'bottom', 'left'];
export const PROPS = [
  'display', 'position', ...SIDES, 'z-index', 'box-sizing',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  ...SIDES.map((s) => `margin-${s}`), ...SIDES.map((s) => `padding-${s}`),
  ...SIDES.flatMap((s) => [`border-${s}-width`, `border-${s}-style`, `border-${s}-color`]),
  ...['top-left', 'top-right', 'bottom-right', 'bottom-left'].map((c) => `border-${c}-radius`),
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
  'overflow-x', 'overflow-y', 'visibility', 'opacity', 'transform',
  'color', 'background-color', 'background-image', 'box-shadow',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration-line', 'text-transform', 'white-space', 'vertical-align',
  'cursor', 'transition-property', 'transition-duration', 'mask-image', 'list-style-type',
];
export const PSEUDO_PROPS = [
  'content', 'display', 'position', ...SIDES, 'width', 'height', 'color', 'background-color',
  'background-image', 'opacity', 'transform', 'mask-image',
];

// lengths match within 1/32px: layout rounds to 1/64px; an SVG data URL
// matches the same SVG however it is encoded (minifiers and Tailwind
// re-encode them differently)
const PX = /^-?\d+(\.\d+)?px$/;
const DATA_URL = /url\("data:image\/svg\+xml,([^"]*)"\)/g;
const svgText = (v) =>
  v.replace(DATA_URL, (_, data) => `url(svg:${decodeURIComponent(data).replace(/"/g, "'").replace(/\s*(\/?>)/g, '$1').replace(/\s+/g, ' ').trim()})`);
export function same(a, b) {
  if (typeof a === 'string' && typeof b === 'string' && a.includes('data:image/svg+xml')) [a, b] = [svgText(a), svgText(b)];
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1 / 32;
  return typeof a === 'string' && typeof b === 'string' && PX.test(a) && PX.test(b) && Math.abs(parseFloat(a) - parseFloat(b)) <= 1 / 32;
}

export const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.html': 'text/html', '.svg': 'image/svg+xml' };

// a Playwright route serving a site's files: index.html for a directory,
// and Inter's subsets, hashed in VitePress's builds, from vpkit's copies of
// the same files
const FONTS = join(ROOT, 'node_modules/vpkit/fonts');
export function serve(root) {
  return (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.endsWith('/')) path += 'index.html';
    const font = /^\/assets\/(inter-[a-z-]+)\.[\w-]+\.woff2$/.exec(path);
    const file = font ? join(FONTS, `${font[1]}.woff2`) : join(root, path);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: `not found: ${path}` });
    route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
  };
}

// Build a Zola site into a temporary directory: the theme's own (site
// omitted), or one under test/ that uses the theme, which then sees this
// repository as themes/vpkit-zola; edit, if given, rewrites that site's
// config.toml. Returns { dir, out }; remove dir after.
export function zolaBuild(baseUrl, site, edit) {
  const dir = mkdtempSync(join(tmpdir(), 'vpkit-zola-check-'));
  const out = join(dir, 'out');
  let root = ROOT;
  if (site) {
    root = join(dir, 'site');
    cpSync(join(ROOT, site), root, { recursive: true });
    mkdirSync(join(root, 'themes'));
    symlinkSync(ROOT, join(root, 'themes/vpkit-zola'), 'dir');
    if (edit) writeFileSync(join(root, 'config.toml'), edit(readFileSync(join(root, 'config.toml'), 'utf8')));
  }
  try {
    execFileSync('zola', ['--root', root, 'build', '--base-url', baseUrl, '--output-dir', out], { stdio: 'pipe' });
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`zola build ${site ?? '.'}: ${e.stderr}`);
  }
  return { dir, out };
}
