// What vpkit-zola's browser checks share: the repository's places, the
// computed properties they compare, how lengths may round, and a zola build
// into a temporary directory.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const UPSTREAM = join(ROOT, 'node_modules/vpkit/test/upstream');

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

// lengths match within 1/32px: layout rounds to 1/64px
const PX = /^-?\d+(\.\d+)?px$/;
export function same(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1 / 32;
  return typeof a === 'string' && typeof b === 'string' && PX.test(a) && PX.test(b) && Math.abs(parseFloat(a) - parseFloat(b)) <= 1 / 32;
}

export const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.html': 'text/html' };

// Build a Zola site into a temporary directory: the theme's own (site
// omitted), or one under test/ that uses the theme, which then sees this
// repository as themes/vpkit-zola. Returns { dir, out }; remove dir after.
export function zolaBuild(baseUrl, site) {
  const dir = mkdtempSync(join(tmpdir(), 'vpkit-zola-check-'));
  const out = join(dir, 'out');
  let root = ROOT;
  if (site) {
    root = join(dir, 'site');
    cpSync(join(ROOT, site), root, { recursive: true });
    mkdirSync(join(root, 'themes'));
    symlinkSync(ROOT, join(root, 'themes/vpkit-zola'), 'dir');
  }
  try {
    execFileSync('zola', ['--root', root, 'build', '--base-url', baseUrl, '--output-dir', out], { stdio: 'pipe' });
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`zola build ${site ?? '.'}: ${e.stderr}`);
  }
  return { dir, out };
}
