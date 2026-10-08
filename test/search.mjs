// The local search's indexes against VitePress's, for the same site.
//
//   node test/search.mjs
//
// Builds test/parity-site and indexes each language's search page's docs
// as the theme's script does (static/vpkit-zola-search.js: VitePress's
// section splitter, MiniSearch with VitePress's options); reads the index
// VitePress serialized into test/vitepress-build for each locale of
// test/vitepress-site, the same site. Every section must match (its page
// and anchor, title, titles, in the same order), and every (field, term,
// section) count of the inverted index: the same documents, so the same
// results and ranks. The Chinese pages' anchors are Zola's, which
// transliterates CJK headings where VitePress keeps them: their sections
// are compared by their place in the page.
//
// Exits 1, listing every difference.

import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { searchIndex } from '../static/vpkit-zola-search.js';
import { VITEPRESS_BUILD, checkVitepressBuild, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
checkVitepressBuild();

// VitePress's locale, the theme's search page for it, whether anchors compare
const LOCALES = [
  { locale: 'root', page: 'vp-search/index.html', anchors: true },
  { locale: 'zh', page: 'zh/vp-search/index.html', anchors: false },
];

const site = zolaBuild(OURS, 'test/parity-site');
let pages;
try {
  pages = LOCALES.map((l) => readFileSync(join(site.out, l.page), 'utf8'));
} finally {
  rmSync(site.dir, { recursive: true, force: true });
}

// a section's page and anchor, on either side, or its page and place in it
const key = (id) => id.replace(OURS, '').replace(/\.html(?=#|$)/, '').replace(/\/(?=#|$)/, '').replace(/^\//, '');
const sections = (index, anchors) => {
  const seen = new Map();
  return Object.entries(index.documentIds).map(([short, id]) => {
    let k = key(id);
    if (!anchors) {
      const page = k.replace(/#.*/, '');
      seen.set(page, (seen.get(page) ?? -1) + 1);
      k = `${page} section ${seen.get(page)}`;
    }
    return { short, key: k, ...index.storedFields[short] };
  });
};
const show = (s) => s && JSON.stringify({ key: s.key, title: s.title, titles: s.titles });

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

const chunks = readdirSync(join(VITEPRESS_BUILD, 'assets/chunks'));
let failed = 0;
for (const [i, { locale, anchors }] of LOCALES.entries()) {
  const chunk = chunks.find((f) => f.startsWith(`@localSearchIndex${locale}.`));
  const upstream = JSON.parse((await import(join(VITEPRESS_BUILD, 'assets/chunks', chunk))).default);
  const docs = JSON.parse(/<script type="application\/json" id="vp-search-index">([\s\S]*?)<\/script>/.exec(pages[i])[1]).filter(Boolean);
  const theme = JSON.parse(JSON.stringify(searchIndex(docs)));

  const failures = [];
  const [a, b] = [sections(upstream, anchors), sections(theme, anchors)];
  for (let j = 0; j < Math.max(a.length, b.length); j++) {
    if (show(a[j]) !== show(b[j])) failures.push(`section ${j}: VitePress ${show(a[j])} | theme ${show(b[j])}`);
  }
  const [ta, tb] = [terms(upstream, a), terms(theme, b)];
  const entries = new Set([...ta.keys(), ...tb.keys()]);
  for (const e of entries) if (ta.get(e) !== tb.get(e)) failures.push(`${e}: VitePress ${ta.get(e) ?? 'none'} | theme ${tb.get(e) ?? 'none'}`);

  for (const f of failures) console.log(`DIFF  ${locale}: ${f}`);
  console.log(`search index ${locale}: ${a.length} sections, ${entries.size} term counts compared, ${failures.length} failures`);
  failed += failures.length;
}
process.exit(failed ? 1 : 0);
