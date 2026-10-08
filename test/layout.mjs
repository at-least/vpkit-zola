// vpkit-zola's layout against vitepress.dev's.
//
//   node test/layout.mjs
//
// Builds test/parity-site (vitepress.dev's guide sidebar and the headings of
// its getting-started page) with the theme and renders its page next to
// vitepress.dev as VitePress rendered it in a browser: vpkit's snapshots
// (node_modules/vpkit/test/upstream/pages/hydrated), with the stylesheets of
// the same deploy and their scripts blocked. Where a snapshot was taken after
// a click (the open sidebar, the open outline dropdown), the theme's page gets
// the same click and its transitions run out. Each pair of subtrees is walked
// in document order, vitepress.dev's without its own additions (ads), the
// theme's without what it keeps hidden (where Vue renders nothing); every
// element's tag, text, computed style, ::before and ::after, and box is
// compared at each width, and in dark mode at 1280.
//
// Exits 1, listing every difference, when any check fails.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';

import { PROPS, PSEUDO_PROPS, ROOT, TYPES, UPSTREAM, same, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
const SITE = 'https://vitepress.dev';
const HYDRATED = join(UPSTREAM, 'pages/hydrated');
const DARK_AT = 1280;

// snapshot: a hydrated page; path: the theme's page; click: what opens the
// state the snapshot shows; pairs: [vitepress.dev's subtree, the theme's];
// drop: vitepress.dev's elements the theme does not render
const checks = [
  {
    name: 'sidebar',
    snapshot: 'guide_getting-started.1280',
    path: '/guide/getting-started/',
    widths: [960, 1280, 1440, 1600],
    pairs: [['.VPSidebar', '.vp-sidebar']],
  },
  {
    name: 'sidebar open',
    snapshot: 'guide_getting-started.375.sidebar-open',
    path: '/guide/getting-started/',
    widths: [375, 768],
    click: '.vp-local-nav__menu',
    pairs: [
      ['.VPSidebar', '.vp-sidebar'],
      ['.VPBackdrop', '.vp-backdrop'],
    ],
  },
  {
    name: 'local nav',
    snapshot: 'guide_getting-started.1280',
    path: '/guide/getting-started/',
    widths: [375, 768, 960],
    pairs: [['.VPLocalNav', '.vp-local-nav']],
  },
  {
    name: 'local nav, outline open',
    snapshot: 'guide_getting-started.375.outline-open',
    path: '/guide/getting-started/',
    widths: [375, 768],
    click: '.vp-local-nav-outline-dropdown > button',
    pairs: [['.VPLocalNav', '.vp-local-nav']],
  },
  {
    name: 'aside',
    snapshot: 'guide_getting-started.1280',
    path: '/guide/getting-started/',
    widths: [1280, 1440, 1600],
    pairs: [['.VPDoc .aside', '.vp-doc-page__aside']],
    drop: '.VPDocAsideCarbonAds, .VPDocAsideSponsors',
  },
];

// intentional differences: { check: /name/, element: /path/, prop: /name/,
// within?, reason } (within: the most a length may differ by)
const known = [
  {
    check: /^aside/,
    element: /^div\.aside$/,
    prop: /^(box height|height)$/,
    reason: "the aside's column is as tall as the doc beside it, and the parity page is shorter than vitepress.dev's",
  },
  {
    check: /^aside/,
    element: /^div\.aside > div\[1\] > div\[0\] > div\[0\] > div\[1\]$/,
    prop: /^(box height|height)$/,
    reason: "the spacer takes the aside's free height, which vitepress.dev's Carbon ads share below it",
  },
  {
    check: /^(aside|local nav, outline open)/,
    element: /./,
    prop: /^(box y|box height|height|bottom|top)$/,
    within: 0.25,
    reason: "vitepress.dev's minified CSS has line-height 2.28571 for VitePress's 2.2857143, so each outline line is 1/64px shorter there; vpkit keeps the source value",
  },
  {
    check: /^local nav/,
    element: /^div\.VPLocalNav/,
    prop: /^box y$/,
    reason: "vpkit-zola has no navbar yet: below 60rem VitePress's VPNav is in the flow above the local nav, 64px tall",
  },
];

const fonts = join(ROOT, 'node_modules/vpkit/fonts');

async function routes(context, site) {
  await context.route(`${OURS}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(site, path);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: `not found: ${path}` });
    route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
  });
  await context.route(`${SITE}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    const page = /^\/snapshot\/([\w.-]+)$/.exec(path);
    if (page) return route.fulfill({ body: readFileSync(join(HYDRATED, `${page[1]}.html`)), contentType: 'text/html' });
    if (path.startsWith('/assets/') && path.endsWith('.css')) {
      return route.fulfill({ body: readFileSync(join(HYDRATED, 'assets', path.slice('/assets/'.length))), contentType: 'text/css' });
    }
    // VitePress's Inter subsets, hashed: vpkit's copies of the same files
    const font = /^\/assets\/(inter-[a-z-]+)\.[\w-]+\.woff2$/.exec(path);
    if (font) return route.fulfill({ body: readFileSync(join(fonts, `${font[1]}.woff2`)), contentType: 'font/woff2' });
    route.abort(); // scripts: the snapshot is already what they rendered
  });
}

// let transitions finish: no element keeps an enter or leave class, no
// animation runs, the sidebar's groups have their caret transitions back
async function settle(page) {
  await page.waitForFunction(
    () =>
      !document.querySelector('[class*="-enter-"], [class*="-leave-"], .vp-sidebar-group--no-transition') &&
      document.getAnimations().every((a) => a.playState !== 'running'),
  );
}

// every element of a subtree in document order, skipping drop and [hidden]
async function describe(page, selector, drop) {
  return page.evaluate(
    ([selector, drop, props, pseudoProps]) => {
      const root = document.querySelector(selector);
      if (!root) throw new Error(`no ${selector}`);
      const out = [];
      const walk = (el, path) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const v = { 'box x': r.x, 'box y': r.y, 'box width': r.width, 'box height': r.height, tag: el.tagName.toLowerCase() };
        for (const p of props) v[p] = s.getPropertyValue(p);
        for (const pseudo of ['::before', '::after']) {
          const ps = getComputedStyle(el, pseudo);
          v[`${pseudo} content`] = ps.content;
          if (ps.content === 'none' || ps.content === 'normal') continue;
          for (const p of pseudoProps) v[`${pseudo} ${p}`] = ps.getPropertyValue(p);
        }
        const kids = [...el.children].filter((c) => !c.hidden && !(drop && c.matches(drop)));
        if (!kids.length) v.text = el.textContent.replace(/\s+/g, ' ').trim();
        out.push({ path, values: v });
        kids.forEach((c, i) => walk(c, `${path} > ${c.tagName.toLowerCase()}[${i}]`));
      };
      walk(root, root.tagName.toLowerCase() + (root.classList.length ? `.${root.classList[0]}` : ''));
      return out;
    },
    [selector, drop ?? null, PROPS, PSEUDO_PROPS],
  );
}

const failures = [];
const expected = [];
let compared = 0;

const site = zolaBuild(OURS, 'test/parity-site');
const browser = await chromium.launch();
try {
  for (const c of checks) {
    const runs = c.widths.map((w) => [w, false]);
    if (c.widths.includes(DARK_AT)) runs.push([DARK_AT, true]);
    for (const [width, dark] of runs) {
      const run = `${c.name} [${width}px${dark ? ' dark' : ''}]`;
      const sides = {};
      for (const side of ['upstream', 'theme']) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'light' });
        await routes(context, site.out);
        if (dark) await context.addInitScript(() => localStorage.setItem('vitepress-theme-appearance', 'dark'));
        const page = await context.newPage();
        await page.goto(side === 'upstream' ? `${SITE}/snapshot/${c.snapshot}` : `${OURS}${c.path}`);
        await page.evaluate(() => document.fonts.ready);
        // hover nothing that reacts, and let what a hover started run out
        const away = () => page.mouse.move(width - 1, 899);
        await away();
        if (side === 'theme') {
          await settle(page);
          if (c.click) {
            await page.click(c.click);
            await away();
          }
        }
        await settle(page);
        sides[side] = [];
        for (const [up, ours] of c.pairs) {
          sides[side].push(await describe(page, side === 'upstream' ? up : ours, side === 'upstream' ? c.drop : null));
        }
        await context.close();
      }
      c.pairs.forEach(([up], i) => {
        const a = sides.upstream[i];
        const b = sides.theme[i];
        if (a.length !== b.length || a.some((x, j) => x.values.tag !== b[j].values.tag)) {
          const at = a.findIndex((x, j) => !b[j] || x.values.tag !== b[j].values.tag);
          failures.push(`${run} ${up}: ${a.length} elements on vitepress.dev, ${b.length} in the theme; first different: ${a[at]?.path ?? '(none)'} | ${b[at]?.path ?? '(none)'}`);
          return;
        }
        a.forEach((x, j) => {
          for (const prop of Object.keys({ ...x.values, ...b[j].values })) {
            compared++;
            if (same(x.values[prop], b[j].values[prop])) continue;
            const line = `${run} ${x.path} ${prop}: vitepress.dev ${x.values[prop]} | theme ${b[j].values[prop]}`;
            const k = known.find(
              (k) =>
                k.check.test(c.name) && k.element.test(x.path) && k.prop.test(prop) &&
                (k.within === undefined || Math.abs(parseFloat(x.values[prop]) - parseFloat(b[j].values[prop])) <= k.within),
            );
            if (!k) {
              failures.push(line);
              continue;
            }
            k.hits = (k.hits ?? 0) + 1;
            expected.push(line);
          }
        });
      });
    }
  }
} finally {
  await browser.close();
  rmSync(site.dir, { recursive: true, force: true });
}

for (const k of known) {
  if (k.hits) console.log(`KNOWN ${k.hits}× ${k.check} ${k.element} ${k.prop}: ${k.reason}`);
  else failures.push(`known difference no longer occurs, remove it: ${k.check} ${k.element} ${k.prop}`);
}
for (const f of failures) console.log(`DIFF  ${f}`);
console.log(`layout parity: ${checks.length} checks, ${compared} values compared, ${failures.length} failures, ${expected.length} known`);
process.exit(failures.length ? 1 : 0);
