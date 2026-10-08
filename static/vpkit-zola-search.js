// vpkit-zola's local search: VitePress's VPLocalSearchBox in plain
// JavaScript, on the markup the theme renders (templates/vp-nav.html), and
// its index as VitePress's localSearchPlugin builds it, from the pages the
// theme writes into its index page (templates/vp-search-index.html).
// static/vpkit-zola.js loads it on the first open, as VitePress loads the
// box. MiniSearch is VitePress's, at the version VitePress locks.

import MiniSearch from './vendor/minisearch.js';

// ---- the index -------------------------------------------------------------

// src/node/plugins/localSearchPlugin.ts, verbatim: a page's rendered
// markdown into sections, one per anchored heading, under the titles of
// the headings around it
const headingRegex = /<h(\d*).*?>(.*?<a.*? href="#.*?".*?>.*?<\/a>)<\/h\1>/gi;
const headingContentRegex = /(.*)<a.*? href="#(.*?)".*?>.*?<\/a>/i;

export function* splitPageIntoSections(html) {
  const result = html.split(headingRegex);
  result.shift();
  let parentTitles = [];
  for (let i = 0; i < result.length; i += 3) {
    const level = parseInt(result[i]) - 1;
    const heading = result[i + 1];
    const headingResult = headingContentRegex.exec(heading);
    const title = clearHtmlTags(headingResult?.[1] ?? '').trim();
    const anchor = headingResult?.[2] ?? '';
    const content = result[i + 2];
    if (!title || !content) continue;
    let titles = parentTitles.slice(0, level);
    titles[level] = title;
    titles = titles.filter(Boolean);
    yield { anchor, titles, text: getSearchableText(content) };
    if (level === 0) {
      parentTitles = [title];
    } else {
      parentTitles[level] = title;
    }
  }
}

function getSearchableText(content) {
  content = clearHtmlTags(content);
  return content;
}

function clearHtmlTags(str) {
  return str.replace(/<[^>]*>/g, '');
}

// the index's documents, from the docs of the index page ({ url, file,
// html }): VitePress indexes its files in sorted order (a section's
// _index.md as its index.md), a section of each; a later one with the
// same id replaces the earlier
export function documents(docs) {
  const key = (doc) => doc.file.replace(/(^|\/)_index\.md$/, '$1index.md');
  const sorted = [...docs].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  const byId = new Map();
  for (const doc of sorted) {
    for (const section of splitPageIntoSections(doc.html)) {
      if (!section || !(section.text || section.titles)) break;
      const { anchor, text, titles } = section;
      const id = anchor ? [doc.url, anchor].join('#') : doc.url;
      byId.delete(id);
      byId.set(id, { id, text, title: titles.at(-1), titles: titles.slice(0, -1) });
    }
  }
  return [...byId.values()];
}

// VPLocalSearchBox's MiniSearch, its options as VitePress's
export function searchIndex(docs) {
  const index = new MiniSearch({
    fields: ['title', 'titles', 'text'],
    storeFields: ['title', 'titles'],
    searchOptions: { fuzzy: 0.2, prefix: true, boost: { title: 4, text: 2, titles: 1 } },
  });
  index.addAll(documents(docs));
  return index;
}

// the index page's docs
async function loadDocs(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`vpkit-zola: the search index ${url}: ${response.status}`);
  const page = new DOMParser().parseFromString(await response.text(), 'text/html');
  return JSON.parse(page.getElementById('vp-search-index').textContent).filter(Boolean);
}
