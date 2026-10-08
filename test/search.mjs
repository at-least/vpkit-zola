// The local search's index against VitePress's, for the same site.
//
//   node test/search.mjs
//
// Builds test/parity-site and indexes its search page's docs as the
// theme's script does (static/vpkit-zola-search.js: VitePress's section
// splitter, MiniSearch with VitePress's options); reads the index
// VitePress serialized into test/vitepress-build for test/vitepress-site,
// the same site. Every section must match (its page and anchor, title,
// titles, in the same order), and every (field, term, section) count of
// the inverted index: the same documents, so the same results and ranks.
//
// Exits 1, listing every difference.

import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { searchIndex } from '../static/vpkit-zola-search.js';
import { VITEPRESS_BUILD, checkVitepressBuild, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
checkVitepressBuild();

const chunk = readdirSync(join(VITEPRESS_BUILD, 'assets/chunks')).find((f) => f.startsWith('@localSearchIndexroot.'));
const upstream = JSON.parse((await import(join(VITEPRESS_BUILD, 'assets/chunks', chunk))).default);

const site = zolaBuild(OURS, 'test/parity-site');
let page;
try {
  page = readFileSync(join(site.out, 'vp-search/index.html'), 'utf8');
} finally {
  rmSync(site.dir, { recursive: true, force: true });
}
const docs = JSON.parse(/<script type="application\/json" id="vp-search-index">([\s\S]*?)<\/script>/.exec(page)[1]).filter(Boolean);
const theme = JSON.parse(JSON.stringify(searchIndex(docs)));

// a section's page and anchor, on either side
const key = (id) => id.replace(OURS, '').replace(/\.html(?=#|$)/, '').replace(/\/(?=#|$)/, '').replace(/^\//, '');
const sections = (index) => Object.entries(index.documentIds).map(([short, id]) => ({ short, key: key(id), ...index.storedFields[short] }));
const show = (s) => s && JSON.stringify({ key: s.key, title: s.title, titles: s.titles });

const failures = [];
const [a, b] = [sections(upstream), sections(theme)];
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (show(a[i]) !== show(b[i])) failures.push(`section ${i}: VitePress ${show(a[i])} | theme ${show(b[i])}`);
}

const FIELDS = ['title', 'titles', 'text'];
const terms = (index, list) => {
  const keyOf = Object.fromEntries(list.map((s) => [s.short, s.key]));
  const out = new Map();
  for (const [term, fields] of index.index) {
    for (const [field, counts] of Object.entries(fields)) {
      for (const [short, n] of Object.entries(counts)) out.set(`${FIELDS[field]} "${term}" in ${keyOf[short]}`, n);
    }
  }
  return out;
};
const [ta, tb] = [terms(upstream, a), terms(theme, b)];
const entries = new Set([...ta.keys(), ...tb.keys()]);
for (const e of entries) if (ta.get(e) !== tb.get(e)) failures.push(`${e}: VitePress ${ta.get(e) ?? 'none'} | theme ${tb.get(e) ?? 'none'}`);

for (const f of failures) console.log(`DIFF  ${f}`);
console.log(`search index: ${a.length} sections, ${entries.size} term counts compared, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
