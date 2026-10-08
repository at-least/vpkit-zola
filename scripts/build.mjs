// Build the theme's prebuilt assets from vpkit, the files a docs site
// serves without Node: static/vpkit-zola.css and static/fonts/ (Inter,
// which vpkit's fonts.css loads relative to the stylesheet).
//
//   node scripts/build.mjs           write them
//   node scripts/build.mjs --check   fail if the committed ones differ
//
// The CSS is left unminified: Tailwind's minifier rounds numbers to six
// digits, and VitePress's line-height 1.3333333 as 1.33333 makes each h2
// 1/64px shorter.

import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS = join(ROOT, 'node_modules/vpkit/fonts');

function build(out) {
  mkdirSync(join(out, 'fonts'), { recursive: true });
  execFileSync(
    join(ROOT, 'node_modules/.bin/tailwindcss'),
    ['-i', join(ROOT, 'css/vpkit-zola.css'), '-o', join(out, 'vpkit-zola.css')],
    { stdio: 'pipe' },
  );
  for (const f of readdirSync(FONTS)) copyFileSync(join(FONTS, f), join(out, 'fonts', f));
}

// every built file, relative to its directory
function files(dir) {
  return ['vpkit-zola.css', ...readdirSync(join(dir, 'fonts')).map((f) => `fonts/${f}`)].sort();
}

if (process.argv[2] === '--check') {
  const tmp = mkdtempSync(join(tmpdir(), 'vpkit-zola-'));
  try {
    build(tmp);
    const want = files(tmp);
    const have = files(join(ROOT, 'static'));
    const stale = [
      ...want.filter((f) => !have.includes(f)).map((f) => `missing: static/${f}`),
      ...have.filter((f) => !want.includes(f)).map((f) => `extra: static/${f}`),
      ...want
        .filter((f) => have.includes(f))
        .filter((f) => !readFileSync(join(tmp, f)).equals(readFileSync(join(ROOT, 'static', f))))
        .map((f) => `differs: static/${f}`),
    ];
    for (const s of stale) console.log(s);
    console.log(stale.length ? 'static/ is stale: npm run build' : `static/ is up to date (${want.length} files)`);
    process.exit(stale.length ? 1 : 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
} else {
  rmSync(join(ROOT, 'static/fonts'), { recursive: true, force: true });
  build(join(ROOT, 'static'));
}
