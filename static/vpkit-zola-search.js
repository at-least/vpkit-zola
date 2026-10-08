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

// ---- the box ---------------------------------------------------------------

// VPLocalSearchBox.vue: the box over the page, its query kept for the
// session and the detailed list's choice for good; results as the query
// changes (200ms after), the first selected, the arrows (and on a Mac
// Ctrl+P, Ctrl+N) moving the selection, Enter going to it; a page's
// matches marked, and in the detailed list each section's text from its
// page. Escape, the backdrop, the back button or the browser's back close
// it; the focus stays inside while it is open, and is nowhere after, as
// VitePress leaves it.
const FILTER_KEY = 'vitepress:local-search-filter';
const DETAILED_KEY = 'vitepress:local-search-detailed-list';
const C = 'vp-local-search-box';
let index = null; // the MiniSearch, once loaded: a promise
let close = null; // the open box's, if one is

// indexUrl: the search page's; lockScroll: the page's scroll lock
// (static/vpkit-zola.js), which returns its unlock
export function open(indexUrl, lockScroll) {
  if (close) return;
  const template = document.getElementById(C);
  const el = template.content.firstElementChild.cloneNode(true);
  const $ = (part) => el.querySelector(`.${C}__${part}`);
  const input = el.querySelector('input');
  const resultsEl = $('results');
  const spinner = $('search-loading');
  const toggle = $('toggle-layout-button');
  const reset = $('clear-button');

  // useSessionStorage and useLocalStorage write their defaults
  if (sessionStorage.getItem(FILTER_KEY) === null) sessionStorage.setItem(FILTER_KEY, '');
  if (localStorage.getItem(DETAILED_KEY) === null) localStorage.setItem(DETAILED_KEY, 'false');
  let filterText = sessionStorage.getItem(FILTER_KEY);
  let showDetailedList = localStorage.getItem(DETAILED_KEY) === 'true';
  let results = [];
  let selectedIndex = -1;
  let disableMouseOver = true;
  let enableNoResults = false;
  let loading = true;
  let searching = false;
  input.value = filterText;

  function renderState() {
    const busy = loading || searching;
    spinner.classList.toggle(`${C}__active`, busy);
    if (busy) {
      spinner.setAttribute('role', 'status');
      spinner.setAttribute('aria-label', 'Loading search results');
    } else {
      spinner.removeAttribute('role');
      spinner.removeAttribute('aria-label');
    }
    toggle.classList.toggle(`${C}__detailed-list`, showDetailedList);
    reset.disabled = filterText.length <= 0;
    const listed = results.length > 0;
    for (const [node, name, value] of [
      [el, 'aria-owns', 'localsearch-list'],
      [input, 'aria-controls', 'localsearch-list'],
      [resultsEl, 'id', 'localsearch-list'],
      [resultsEl, 'role', 'listbox'],
      [resultsEl, 'aria-labelledby', 'localsearch-label'],
    ]) {
      if (listed) node.setAttribute(name, value);
      else node.removeAttribute(name);
    }
    if (selectedIndex > -1) input.setAttribute('aria-activedescendant', `localsearch-item-${selectedIndex}`);
    else input.removeAttribute('aria-activedescendant');
    resultsEl.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function renderSelection() {
    for (const li of resultsEl.querySelectorAll(':scope > li[role="option"]')) {
      const selected = Number(li.querySelector('a').dataset.index) === selectedIndex;
      li.setAttribute('aria-selected', selected ? 'true' : 'false');
      li.querySelector('a').classList.toggle(`${C}__selected`, selected);
    }
    renderState();
  }

  function renderResults() {
    resultsEl.replaceChildren(
      ...results.map((p, i) => {
        const li = document.createElement('li');
        li.id = `localsearch-item-${i}`;
        li.setAttribute('aria-selected', selectedIndex === i ? 'true' : 'false');
        li.setAttribute('role', 'option');
        const titles = p.titles
          .map((t) => `<span class="${C}__title"><span>${t}</span><span class="vpi-chevron-right ${C}__local-search-icon"></span></span>`)
          .join('');
        const excerpt = showDetailedList
          ? `<div class="${C}__excerpt-wrapper">${p.text ? `<div inert class="${C}__excerpt"><div class="vp-doc">${p.text}</div></div>` : ''}<div class="${C}__excerpt-gradient-bottom"></div><div class="${C}__excerpt-gradient-top"></div></div>`
          : '';
        li.innerHTML = `<a href="${p.id}" data-index="${i}" class="${C}__result${selectedIndex === i ? ` ${C}__selected` : ''}"><div><div class="${C}__titles"><span class="${C}__title-icon">#</span>${titles}<span class="${C}__title ${C}__main"><span>${p.title}</span></span></div>${excerpt}</div></a>`;
        li.firstElementChild.setAttribute('aria-label', [...p.titles, p.title].join(' > '));
        return li;
      }),
    );
    if (filterText && !results.length && enableNoResults) {
      const li = document.createElement('li');
      li.className = `${C}__no-results`;
      li.append('No results for "', Object.assign(document.createElement('strong'), { textContent: filterText }), '"');
      resultsEl.append(li);
    }
    renderState();
  }

  // the search, as watchDebounced runs it: at once on opening, then 200ms
  // after the last change of the index, the query or the detailed list
  let run = 0;
  let timer = null;
  const schedule = (now = false) => {
    run++;
    searching = false;
    clearTimeout(timer);
    if (now) search(run);
    else timer = setTimeout(() => search(run), 200);
  };

  async function search(id) {
    const canceled = () => id !== run;
    const idx = loading ? null : await index;
    if (!idx) {
      results = [];
      renderResults();
      return;
    }
    searching = true;
    results = idx.search(filterText).slice(0, 16);
    enableNoResults = true;
    selectedIndex = results.length ? 0 : -1;
    const texts = showDetailedList ? await Promise.all(results.map((r) => excerpt(r.id))) : [];
    if (canceled()) return;
    results = results.map((r, i) => ({ ...r, text: texts[i] ?? '' }));
    renderResults();
    const terms = new Set(results.flatMap((r) => Object.keys(r.match)));
    unmark(resultsEl);
    if (terms.size) markRegExp(resultsEl, formMarkRegex(terms));
    for (const ex of el.querySelectorAll(`.${C}__result .${C}__excerpt`)) {
      ex.querySelector('mark[data-markjs="true"]')?.scrollIntoView({ block: 'center' });
    }
    resultsEl.firstElementChild?.scrollIntoView({ block: 'start' });
    resultsEl.querySelector(`.${C}__result.${C}__selected`)?.scrollIntoView({ block: 'nearest' });
    searching = false;
    renderState();
  }

  // keyboard selection
  const scrollToSelected = () => resultsEl.querySelector(`.${C}__result.${C}__selected`)?.scrollIntoView({ block: 'nearest' });
  function select(step, event) {
    event.preventDefault();
    selectedIndex += step;
    if (selectedIndex < 0) selectedIndex = results.length - 1;
    if (selectedIndex >= results.length) selectedIndex = 0;
    disableMouseOver = true;
    renderSelection();
    scrollToSelected();
  }
  const isMacCtrlShortcut = (e) =>
    e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && document.documentElement.classList.contains('mac');

  function onKeydown(e) {
    if (e.key === 'ArrowUp') return select(-1, e);
    if (e.key === 'ArrowDown') return select(1, e);
    if ((e.key === 'p' || e.key === 'P') && isMacCtrlShortcut(e)) return select(-1, e);
    if ((e.key === 'n' || e.key === 'N') && isMacCtrlShortcut(e)) return select(1, e);
    if (e.key === 'Enter') {
      if (e.isComposing) return;
      if (e.target instanceof HTMLButtonElement && e.target.type !== 'submit') return;
      const selected = results[selectedIndex];
      if (e.target instanceof HTMLInputElement && !selected) {
        e.preventDefault();
        return;
      }
      if (selected) {
        go(selected.id);
        closeBox();
      }
      return;
    }
    if (e.key === 'Escape') return closeBox();
    if (e.key === 'Tab') trapTab(e);
  }

  // focus-trap, as useFocusTrap sets it up: Tab stays inside the box
  function trapTab(e) {
    const tabbable = [...el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')].filter((n) =>
      n.checkVisibility(),
    );
    if (!tabbable.length) return;
    const first = tabbable[0];
    const last = tabbable.at(-1);
    if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  }

  const focusInput = (selectAll = true) => {
    input.focus();
    if (selectAll) input.select();
  };

  el.querySelector('form').addEventListener('submit', (e) => e.preventDefault());
  el.querySelector('form').addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') focusInput();
  });
  input.addEventListener('input', () => {
    filterText = input.value;
    sessionStorage.setItem(FILTER_KEY, filterText);
    enableNoResults = false;
    renderState();
    schedule();
  });
  reset.addEventListener('click', () => {
    filterText = '';
    sessionStorage.setItem(FILTER_KEY, '');
    enableNoResults = false;
    renderState();
    schedule();
    queueMicrotask(() => focusInput(false));
  });
  toggle.addEventListener('click', () => {
    if (selectedIndex <= -1) return;
    showDetailedList = !showDetailedList;
    localStorage.setItem(DETAILED_KEY, String(showDetailedList));
    renderState();
    schedule();
  });
  $('back-button').addEventListener('click', () => closeBox());
  $('backdrop').addEventListener('click', () => closeBox());
  resultsEl.addEventListener('mousemove', (e) => {
    if (!disableMouseOver) return;
    const index = Number.parseInt(e.target.closest?.(`.${C}__result`)?.dataset.index);
    if (index >= 0 && index !== selectedIndex) {
      selectedIndex = index;
      renderSelection();
    }
    disableMouseOver = false;
  });
  resultsEl.addEventListener('mouseover', (e) => {
    const a = e.target.closest?.(`.${C}__result`);
    if (!a || a.contains(e.relatedTarget) || disableMouseOver) return;
    selectedIndex = Number(a.dataset.index);
    renderSelection();
  });
  resultsEl.addEventListener('focusin', (e) => {
    const a = e.target.closest?.(`.${C}__result`);
    if (!a) return;
    selectedIndex = Number(a.dataset.index);
    renderSelection();
  });
  // a result's link goes where VitePress's router takes it
  resultsEl.addEventListener('click', (e) => {
    const a = e.target.closest?.(`.${C}__result`);
    if (!a) return;
    if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      go(a.href);
    }
    closeBox();
  });

  // the browser's back closes it: a history entry of its own
  const onPopstate = () => closeBox();
  document.body.appendChild(el);
  focusInput();
  history.pushState(null, '', null);
  window.addEventListener('popstate', onPopstate);
  window.addEventListener('keydown', onKeydown);
  const unlock = lockScroll();

  function closeBox() {
    if (!close) return;
    close = null;
    run++;
    clearTimeout(timer);
    window.removeEventListener('popstate', onPopstate);
    window.removeEventListener('keydown', onKeydown);
    el.remove();
    unlock();
  }
  close = closeBox;

  renderResults();
  schedule(true);
  index ??= loadDocs(indexUrl).then(searchIndex);
  index.then(() => {
    if (close !== closeBox) return;
    loading = false;
    renderState();
    schedule();
  });
}

// src/client/app/router.ts, for a search result: another page loads; on
// this page the URL takes the hash (a history entry, a hashchange) and its
// heading scrolls to the top, as VitePress's router does in place
function go(href) {
  const next = new URL(href, location.href);
  if (next.origin !== location.origin || next.pathname !== location.pathname || next.search !== location.search) {
    location.href = next.href;
    return;
  }
  if (next.hash !== location.hash) {
    const oldURL = location.href;
    history.replaceState({ scrollPosition: window.scrollY }, '');
    history.pushState({}, '', next.href);
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: next.href }));
  }
  document.getElementById(decodeURIComponent(next.hash).slice(1))?.scrollIntoView({ block: 'start' });
}

// ---- the excerpts ------------------------------------------------------------

// a section's markdown from its page, for the detailed list: what follows
// its heading up to the next, as VitePress takes it from the page's
// component; the last 16 pages kept
const pages = new Map();
async function excerpt(id) {
  const [url, anchor] = id.split('#');
  let sections = pages.get(url);
  if (!sections) {
    sections = new Map();
    const response = await fetch(url);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    for (let heading of page.querySelector('.vp-doc')?.querySelectorAll('h1, h2, h3, h4, h5, h6') ?? []) {
      const href = heading.querySelector('a')?.getAttribute('href');
      const id = href?.startsWith('#') && href.slice(1);
      if (!id) continue;
      let html = '';
      while ((heading = heading.nextElementSibling) && !/^h[1-6]$/i.test(heading.tagName)) html += heading.outerHTML;
      sections.set(id, html);
    }
    if (pages.size >= 16) pages.delete(pages.keys().next().value);
  } else pages.delete(url);
  pages.set(url, sections);
  return sections.get(anchor) ?? '';
}

// ---- marks -----------------------------------------------------------------

// mark.js's markRegExp and unmark, for what the box needs: each match in a
// text node wrapped in <mark data-markjs="true">
function formMarkRegex(terms) {
  return new RegExp(
    [...terms]
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`)
      .join('|'),
    'gi',
  );
}

function markRegExp(root, regex) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const parts = [];
    let last = 0;
    regex.lastIndex = 0;
    for (let match; (match = regex.exec(text)) && match[0]; ) {
      parts.push(text.slice(last, match.index));
      const mark = document.createElement('mark');
      mark.setAttribute('data-markjs', 'true');
      mark.textContent = match[0];
      parts.push(mark);
      last = match.index + match[0].length;
    }
    if (!parts.length) continue;
    parts.push(text.slice(last));
    node.replaceWith(...parts.filter((p) => p !== ''));
  }
}

function unmark(root) {
  for (const mark of root.querySelectorAll('mark[data-markjs="true"]')) mark.replaceWith(...mark.childNodes);
  root.normalize();
}

