// vpkit-zola's checks in a browser.
//
//   node test/render.mjs
//
// Builds the theme's own site with zola into a temporary directory and
// renders it in headless Chromium:
//
// 1. Markdown parity. The parity page (content/parity/markdown.md, VitePress's
//    markdown guide written for Zola) against the page VitePress
//    v2.0.0-alpha.20 rendered for vitepress.dev (vpkit's copy,
//    node_modules/vpkit/test/upstream/pages). Each .vp-doc renders alone at
//    the same width, upstream with VitePress's stylesheets (vpkit's verbatim
//    copies), the theme with static/vpkit-zola.css, both with Inter from the
//    same files. Blocks pair by the heading they follow, elements within a
//    block by their tag, classes and place; tokens inside code lines are
//    not paired (Giallo and Shiki split them differently), but each line's
//    text is. Every computed style, ::before and ::after, and box (relative
//    to its block) is compared, in light and dark.
// 2. Giallo's colors. On the built page, every token's computed color is
//    the light or the dark half of its inline light-dark(), as the page's
//    appearance says, also when the OS prefers the other one.
// 3. The copy button copies the code, without Giallo's line numbers.
//
// Exits 1, listing every difference, when any check fails.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';

import { PROPS, PSEUDO_PROPS, ROOT, TYPES, UPSTREAM, same, zolaBuild } from './lib.mjs';

const ORIGIN = 'https://check.test';
const read = (file) => readFileSync(file, 'utf8');

// widths of .vp-doc: a phone, and VitePress's content column
const WIDTHS = [[375, 327], [1280, 688]];
const DARK_AT = 1280;
const BODY = 'color:var(--vp-c-text-1);background-color:var(--vp-c-bg);margin:0';

// intentional differences: { element: /path/, prop: /name/, within?, reason }
// (within: the most a length may differ by; any value when absent)
const known = [
  {
    element: /span\.lang\[0\]$/,
    prop: /^(text|box x|box width|left|width)$/,
    reason: "the label is Giallo's name for the language (javascript, typescript, markdown) where VitePress shows the fence's (js, ts, md)",
  },
  {
    element: /div(\.active)?\.language(\.line-numbers-mode)?\[\d+\] > pre\[0\]( > code\[0\]( > span\.(highlighted\.)?line\[\d+\])?)?$/,
    prop: /^(color|border-(top|right|bottom|left)-color)$/,
    reason: "code text takes the Giallo theme's foreground, Shiki's in VitePress (vpkit has no code colors); the borders are currentColor",
  },
  {
    element: /div\.language\.line-numbers-mode\[\d+\] > pre\[0\]$/,
    prop: /^(position|top|right|bottom|left)$/,
    reason: "static, so Giallo's line numbers can leave the scrolling pre for VitePress's column",
  },
  {
    element: /> code\[0\]( > span\.(highlighted\.)?line\[\d+\])?$/,
    prop: /^(box width|width)$/,
    within: 0.25,
    reason: "Giallo and Shiki split a line into different token spans, and each span's text starts on a 1/64px boundary (code is as wide as its longest line)",
  },
  {
    element: /div\.vp-code-group\[\d+\] > div\.tabs\[0\] > input\[\d+\]$/,
    prop: /^(top|bottom)$/,
    reason: "a code group's radio inputs are fixed and invisible (VitePress's CSS): the top and bottom they compute to are their place on the page, and the parity page has fewer sections above",
  },
];

// what upstream elements the theme does not render, and why
const upstreamOnly = [
  { element: /a\.footnote-anchor\[\d+\]$/, reason: "markdown-it-footnote's empty jump target; Zola puts the id on the sup" },
  { element: /label\.task-list-item-label\[\d+\]$/, reason: "VitePress wraps a task's text in a label; Zola leaves it in the item" },
];

// ---- the two sides --------------------------------------------------------

// VitePress's stylesheets for the markdown, as its theme loads them; fonts.css
// without its webfont marker (a Google Fonts import), its subsets from the
// font files vpkit copied from VitePress
function upstreamCss() {
  const fonts = read(join(UPSTREAM, 'fonts.css'))
    .replace(/\/\* webfont-marker-begin \*\/[\s\S]*?\/\* webfont-marker-end \*\//, '')
    .replaceAll("url('../fonts/", "url('/fonts/");
  return [
    read(join(UPSTREAM, 'vars.css')), fonts, read(join(UPSTREAM, 'base.css')),
    read(join(UPSTREAM, 'utils.css')), read(join(UPSTREAM, 'icons.css')),
    read(join(UPSTREAM, 'vp-doc.css')), read(join(UPSTREAM, 'custom-block.css')),
    read(join(UPSTREAM, 'vp-code-group.css')),
  ].join('\n');
}

async function serve(context, site) {
  const css = upstreamCss();
  await context.route(`${ORIGIN}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === '/upstream.css') return route.fulfill({ body: css, contentType: 'text/css' });
    let file;
    if (path.startsWith('/fonts/')) file = join(ROOT, 'static', path);
    else if (path.startsWith('/zola/')) {
      if (path.endsWith('/')) path += 'index.html';
      file = join(site, path.slice('/zola/'.length));
    }
    if (!file || !existsSync(file)) return route.fulfill({ status: 404, body: `not found: ${path}` });
    route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
  });
}

// ---- markdown parity --------------------------------------------------------

// Render a .vp-doc alone and describe each element: its block (the heading
// it follows), its place in the block, text, computed style and box.
async function describe(context, stylesheet, html, viewport, docWidth, dark) {
  const page = await context.newPage();
  await page.setViewportSize({ width: viewport, height: 900 });
  await page.goto(`${ORIGIN}/zola/404.html`); // an origin for the page; its content is replaced
  await page.setContent(
    `<!doctype html><html${dark ? ' class="dark"' : ''}><head><base href="${ORIGIN}/"><link rel="stylesheet" href="${stylesheet}"></head>` +
      `<body style="${BODY}"><div style="margin:0 24px;max-width:${docWidth}px">${html}</div></body></html>`,
    { waitUntil: 'load' },
  );
  await page.evaluate(() => document.fonts.ready);
  const items = await page.evaluate(
    ([props, pseudoProps]) => {
      for (const animation of document.getAnimations()) animation.finish();
      const sigOf = (el) => {
        let tag = el.tagName.toLowerCase();
        const cls = [...el.classList]
          .filter((c) => !['shiki', 'shiki-themes', 'github-light', 'github-dark', 'giallo'].includes(c))
          .map((c) => (c.startsWith('language-') ? 'language' : c))
          .sort();
        if (tag === 'blockquote' && cls.includes('custom-block')) tag = 'div';
        return tag + cls.map((c) => `.${c}`).join('');
      };
      const place = (el) => {
        const sig = sigOf(el);
        const same = [...el.parentElement.children].filter((c) => sigOf(c) === sig);
        return `${sig}[${same.indexOf(el)}]`;
      };
      const style = (el, rect, origin) => {
        const s = getComputedStyle(el);
        // an element without a box (display: none) has no place to compare
        const boxed = el.getClientRects().length > 0;
        const v = {
          'box x': boxed ? rect.x - origin.x : 'none', 'box y': boxed ? rect.y - origin.y : 'none',
          'box width': rect.width, 'box height': rect.height,
        };
        for (const p of props) v[p] = s.getPropertyValue(p);
        for (const pseudo of ['::before', '::after']) {
          const ps = getComputedStyle(el, pseudo);
          v[`${pseudo} content`] = ps.content;
          if (ps.content === 'none' || ps.content === 'normal') continue;
          for (const p of pseudoProps) v[`${pseudo} ${p}`] = ps.getPropertyValue(p);
        }
        // a line's text without Giallo's line number in it
        const text = (n) => (n.nodeType === 1 && n.matches('.giallo-ln') ? '' : n.textContent);
        if (el.children.length === 0 || el.matches('span.line')) v.text = [...el.childNodes].map(text).join('').replace(/\s+/g, ' ').trim();
        return v;
      };
      // where a line number's digits are drawn
      const glyphs = (el, origin) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        const s = getComputedStyle(el);
        const v = { 'text x': r.x - origin.x, 'text y': r.y - origin.y, 'text height': r.height, text: el.textContent };
        for (const p of ['color', 'font-family', 'font-size', 'line-height']) v[p] = s.getPropertyValue(p);
        return v;
      };
      const content = document.querySelector('.vp-doc > div');
      const out = [];
      let segment = '(top)';
      const count = {};
      const sigs = {};
      for (const block of content.children) {
        if (/^H[1-3]$/.test(block.tagName)) segment = `#${block.id}`;
        if (block.matches('hr.footnotes-sep, section.footnotes')) segment = '(footnotes)';
        count[segment] = (count[segment] ?? -1) + 1;
        // a block's place counts the blocks like it in its section
        const sig = sigOf(block);
        sigs[segment] ??= {};
        sigs[segment][sig] = (sigs[segment][sig] ?? -1) + 1;
        const bpath = `${sig}[${sigs[segment][sig]}]`;
        const blockRect = block.getBoundingClientRect();
        const docRect = content.getBoundingClientRect();
        // the block itself: where it starts depends on the page above it
        const own = style(block, blockRect, { x: docRect.x, y: blockRect.y });
        out.push({ segment, block: count[segment], path: bpath, key: `${segment} ${bpath}`, values: own });
        const walk = (el, path) => {
          for (const child of el.children) {
            const p = `${path} > ${place(child)}`;
            if (child.matches('.line-numbers-wrapper > *')) continue;
            if (!child.matches('.giallo-ln')) {
              out.push({ segment, block: count[segment], path: p, key: `${segment} ${p}`, values: style(child, child.getBoundingClientRect(), blockRect) });
            }
            if (!child.matches('span.line')) walk(child, p);
          }
        };
        walk(block, bpath);
        // line numbers, by their order in the block: VitePress's spans in
        // the column, Giallo's at the start of each line
        const numbers = block.querySelectorAll('.line-numbers-wrapper > .line-number, .giallo-ln');
        numbers.forEach((n, i) => {
          const p = `${bpath} > (line number)[${i}]`;
          out.push({ segment, block: count[segment], path: p, key: `${segment} ${p}`, values: glyphs(n, blockRect) });
        });
      }
      return out;
    },
    [PROPS, PSEUDO_PROPS],
  );
  await page.close();
  return items;
}

const failures = [];
const expected = [];
let compared = 0;

function compare(run, up, theme) {
  const ours = new Map(theme.map((t) => [t.key, t]));
  const theirs = new Map(up.map((u) => [u.key, u]));
  // the theme renders a part of each section the guide has: its blocks must
  // be the first ones of the same section
  const themeSegments = new Set(theme.map((t) => t.segment));
  for (const t of theme) {
    if (!theirs.has(t.key)) failures.push(`${run} ${t.key}: the theme renders it, VitePress does not`);
  }
  const blocksIn = (items, segment) => new Set(items.filter((i) => i.segment === segment).map((i) => i.block));
  for (const u of up) {
    if (!themeSegments.has(u.segment) || ours.has(u.key)) continue;
    // a block of this section the theme leaves out (VitePress's has more)
    if (!blocksIn(theme, u.segment).has(u.block)) continue;
    const why = upstreamOnly.find((x) => x.element.test(u.path));
    if (why) {
      why.hits = (why.hits ?? 0) + 1;
      continue;
    }
    failures.push(`${run} ${u.key}: VitePress renders it, the theme does not`);
  }
  for (const t of theme) {
    const u = theirs.get(t.key);
    if (!u) continue;
    for (const prop of Object.keys({ ...u.values, ...t.values })) {
      // text: of elements without children, on both sides
      if (prop === 'text' && (u.values.text === undefined || t.values.text === undefined)) continue;
      compared++;
      const a = u.values[prop];
      const b = t.values[prop];
      if (same(a, b)) continue;
      const line = `${run} ${t.key} ${prop}: VitePress ${a} | theme ${b}`;
      const k = known.find(
        (x) => x.element.test(t.path) && x.prop.test(prop) && (x.within === undefined || Math.abs(parseFloat(a) - parseFloat(b)) <= x.within),
      );
      if (!k) {
        failures.push(line);
        continue;
      }
      k.hits = (k.hits ?? 0) + 1;
      expected.push(line);
    }
  }
}

// ---- Giallo's colors and the copy button --------------------------------------

const rgb = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

async function colors(browser, url, os, stored) {
  const context = await browser.newContext({ colorScheme: os });
  await serve(context, site.out);
  if (stored) await context.addInitScript((v) => localStorage.setItem('vitepress-theme-appearance', v), stored);
  const page = await context.newPage();
  await page.goto(url);
  const result = await page.evaluate(() => {
    const dark = document.documentElement.classList.contains('dark');
    const tokens = [...document.querySelectorAll('.vp-doc pre.giallo span[style]')].map((s) => {
      const m = /color: light-dark\((#[0-9A-Fa-f]{6}), (#[0-9A-Fa-f]{6})\)/.exec(s.getAttribute('style'));
      return { pair: m && [m[1], m[2]], color: getComputedStyle(s).color, text: s.textContent };
    });
    const body = getComputedStyle(document.body);
    const probe = document.createElement('div');
    probe.style.color = 'var(--vp-c-text-1)';
    probe.style.backgroundColor = 'var(--vp-c-bg)';
    document.body.append(probe);
    const want = getComputedStyle(probe);
    return { dark, tokens, body: [body.color, body.backgroundColor], want: [want.color, want.backgroundColor] };
  });
  await context.close();
  return result;
}

// ---- run ----------------------------------------------------------------------

const site = zolaBuild(`${ORIGIN}/zola`);
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  await serve(context, site.out);
  const upstreamHtml = read(join(UPSTREAM, 'pages/guide_markdown.html'));
  const upstreamDoc = /<div style="position:relative;" class="vp-doc[^"]*"[^>]*>[\s\S]*?(?=<\/main>)/.exec(upstreamHtml)[0];
  const themeHtml = read(join(site.out, 'parity/markdown/index.html'));
  const themeDoc = /<div style="position:relative;" class="vp-doc">[\s\S]*?(?=<\/main>)/.exec(themeHtml)[0];
  const runs = WIDTHS.map(([v, w]) => [v, w, false]).concat([[DARK_AT, WIDTHS.find(([v]) => v === DARK_AT)[1], true]]);
  for (const [viewport, width, dark] of runs) {
    const up = await describe(context, '/upstream.css', upstreamDoc, viewport, width, dark);
    const theme = await describe(context, '/zola/vpkit-zola.css', themeDoc, viewport, width, dark);
    compare(`[${viewport}px${dark ? ' dark' : ''}]`, up, theme);
  }
  await context.close();

  // Giallo's colors follow the appearance: VitePress's check in the head
  // reads the stored choice, then the OS
  const url = `${ORIGIN}/zola/parity/markdown/`;
  let tokens = 0;
  for (const [os, stored, dark] of [['light', null, false], ['dark', null, true], ['dark', 'light', false], ['light', 'dark', true]]) {
    const r = await colors(browser, url, os, stored);
    const run = `[OS ${os}, stored ${stored ?? 'nothing'}]`;
    if (r.dark !== dark) failures.push(`${run} html.dark is ${r.dark}, expected ${dark}`);
    for (const t of r.tokens) {
      if (!t.pair) continue;
      tokens++;
      const want = rgb(t.pair[dark ? 1 : 0]);
      if (t.color !== want) failures.push(`${run} token ${JSON.stringify(t.text)}: ${t.color}, Giallo's ${dark ? 'dark' : 'light'} color is ${want}`);
    }
    if (r.body.join() !== r.want.join()) failures.push(`${run} body color, background ${r.body.join(' / ')}: expected ${r.want.join(' / ')}`);
  }
  if (tokens < 100) failures.push(`only ${tokens} Giallo tokens with light-dark() colors found`);

  // the copy button
  const clip = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await serve(clip, site.out);
  const page = await clip.newPage();
  await page.goto(url);
  const button = page.locator('div.language-typescript.line-numbers-mode > button.copy').first();
  await button.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const want = "// line-numbers is enabled\nconst line2 = 'This is line 2'\nconst line3 = 'This is line 3'";
  if (copied !== want) failures.push(`copy button copied ${JSON.stringify(copied)}, expected ${JSON.stringify(want)}`);
  if (!(await button.evaluate((b) => b.classList.contains('copied')))) failures.push('copy button: no .copied after the click');
  await clip.close();
  console.log(`giallo: ${tokens} token colors checked under 4 appearance settings; copy button checked`);
} finally {
  await browser.close();
  rmSync(site.dir, { recursive: true, force: true });
}

for (const k of known) {
  if (k.hits) console.log(`KNOWN ${k.hits}× ${k.element} ${k.prop}: ${k.reason}`);
  else failures.push(`known difference no longer occurs, remove it: ${k.element} ${k.prop}`);
}
for (const x of upstreamOnly) {
  if (x.hits) console.log(`UPSTREAM ONLY ${x.hits}× ${x.element}: ${x.reason}`);
  else failures.push(`upstream-only element no longer occurs, remove it: ${x.element}`);
}
for (const f of failures) console.log(`DIFF  ${f}`);
console.log(`markdown parity: ${compared} values compared, ${failures.length} failures, ${expected.length} known`);
process.exit(failures.length ? 1 : 0);
