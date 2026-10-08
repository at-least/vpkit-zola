// VitePress's build of test/vitepress-site: the reference test/layout.mjs
// and test/behavior.mjs run next to the theme, scripts and all.
// test/vitepress-site is test/parity-site written for VitePress. VitePress
// builds it at the version vpkit ports (vpkit's test/upstream/SOURCE), from
// a clone of vuejs/vitepress checked out at that tag, its dependencies
// installed and its dist built (pnpm install, pnpm build).
//
//   node scripts/build-vitepress-site.mjs [clone, default ../vitepress]
//
// Writes test/vitepress-build/: the site without its font files (the tests
// serve vpkit's copies of the same fonts), and SOURCE, which names the
// version and the hash of test/vitepress-site it was built from; the tests
// refuse a build whose source has changed since.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { ROOT, UPSTREAM, VITEPRESS_BUILD, VITEPRESS_SITE, vitepressSiteHash } from '../test/lib.mjs';

const clone = resolve(process.argv[2] ?? join(ROOT, '../vitepress'));
const pinned = /vuejs\/vitepress v([\w.-]+)/.exec(readFileSync(join(UPSTREAM, 'SOURCE'), 'utf8'))[1];
const version = JSON.parse(readFileSync(join(clone, 'package.json'), 'utf8')).version;
if (version !== pinned) throw new Error(`${clone} is VitePress ${version}, vpkit ports ${pinned}`);

// the site's markdown compiles to modules that import vue: they resolve it
// from the clone's node_modules, linked in next to the copy
const dir = mkdtempSync(join(tmpdir(), 'vitepress-site-'));
try {
  cpSync(VITEPRESS_SITE, join(dir, 'site'), { recursive: true });
  symlinkSync(join(clone, 'node_modules'), join(dir, 'node_modules'), 'dir');
  execFileSync('node', [join(clone, 'bin/vitepress.js'), 'build', join(dir, 'site')], { stdio: 'pipe' });
  const out = join(dir, 'site/.vitepress/dist');
  const page = readFileSync(join(out, 'guide/getting-started.html'), 'utf8');
  const generator = /<meta name="generator" content="([^"]+)">/.exec(page)?.[1];
  if (generator !== `VitePress v${pinned}`) throw new Error(`the build says ${generator}`);
  rmSync(VITEPRESS_BUILD, { recursive: true, force: true });
  cpSync(out, VITEPRESS_BUILD, { recursive: true, filter: (f) => !f.endsWith('.woff2') });
  writeFileSync(
    join(VITEPRESS_BUILD, 'SOURCE'),
    `test/vitepress-site built by VitePress v${pinned} (node scripts/build-vitepress-site.mjs)\nsite sha256 ${vitepressSiteHash()}\n`,
  );
  console.log(`test/vitepress-build: VitePress v${pinned}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
