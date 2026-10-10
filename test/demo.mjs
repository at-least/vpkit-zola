// The demo (demo/, rustpress's documentation converted) builds with the
// theme, and its pages show none of VitePress's syntax unconverted: no
// ::: container line, <Badge>, [[toc]], code notation or Tera tag in the
// text outside code. Every page's <head> but the search index's (a page of
// data, noindex) ends with the site's head setting, its favicon, the site
// path under base_url.
//
//   node test/demo.mjs
//
// Exits 1, listing what it finds.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ROOT } from './lib.mjs';

const dir = mkdtempSync(join(tmpdir(), 'vpkit-zola-demo-'));
const out = join(dir, 'site');
const failures = [];
let pages = 0;
try {
  execFileSync('zola', ['--root', join(ROOT, 'demo'), 'build', '--output-dir', out], { stdio: 'pipe' });
  for (const file of readdirSync(out, { recursive: true }).filter((f) => f.endsWith('index.html'))) {
    const html = readFileSync(join(out, file), 'utf8');
    if (!html.includes('<meta name="robots" content="noindex">') && !/<link (?=[^>]*\brel="icon")(?=[^>]*\bhref="http:\/\/127\.0\.0\.1:1111\/logo\.svg")[^>]*>\s*<\/head>/.test(html)) failures.push(`${file}: no favicon from head at the end of <head>`);
    const doc = /<div style="position:relative;" class="vp-doc">([\s\S]*?)<\/main>/.exec(html);
    if (!doc) continue;
    pages++;
    const text = doc[1].replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
    for (const [what, pattern] of [
      ['a ::: line', /<p>:{3,}/],
      ['a <Badge>', /&lt;Badge|<Badge/],
      ['[[toc]]', /\[\[toc\]\]/],
      ['a code notation', /\[!code /],
      ['a Tera tag', /\{\{|\{%/],
    ]) {
      if (pattern.test(text)) failures.push(`${file}: ${what}`);
    }
  }
} catch (e) {
  failures.push(`zola build demo: ${e.stderr ?? e.message}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`demo: ${pages} pages built, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
