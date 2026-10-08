// vpkit-zola's layout against VitePress's.
//
//   node test/layout.mjs [pattern]     pattern: run the checks it matches
//
// Builds test/parity-site (vitepress.dev's guide sidebar and the headings of
// its getting-started page, and a navbar) with the theme and renders its
// page next to VitePress's, one of two:
// - vitepress.dev as VitePress rendered it in a browser: vpkit's snapshots
//   (node_modules/vpkit/test/upstream/pages/hydrated), with the stylesheets
//   of the same deploy and their scripts blocked. Where a snapshot was taken
//   after a click (the open sidebar, the open outline dropdown), the theme's
//   page gets the same click.
// - test/vitepress-build, VitePress's build of the same site, live: both
//   pages run their scripts and get the same steps (a hover, clicks, a
//   scroll), so what VitePress's components decide in the browser (what fits
//   the navbar, what a click opens) is compared too.
// Transitions run out before anything is read. Each pair of subtrees is
// walked in document order, VitePress's without vitepress.dev's own
// additions (ads), the theme's without what it keeps hidden (where Vue
// renders nothing); every element's tag, text, computed style, ::before and
// ::after, and box is compared at each width, and in dark mode at 1280.
//
// Exits 1, listing every difference, when any check fails.

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-chromium';

import { PROPS, PSEUDO_PROPS, ROOT, UPSTREAM, VITEPRESS_BUILD, checkVitepressBuild, same, serve, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
const SITE = 'https://vitepress.dev';
const LOCAL = 'https://vitepress.test';
const HYDRATED = join(UPSTREAM, 'pages/hydrated');
const DARK_AT = 1280;

// snapshot: a hydrated page of vitepress.dev, click: what opens the state it
// shows on the theme's page; or vitepress: test/vitepress-build's page, and
// steps: [action, VitePress's selector, the theme's] done on both, action
// hover, click, click all (each match) or scroll (to y = the selector), and
// expect: [VitePress's, the theme's] expressions that must be true after
// them (the state the steps are for was reached). path: the theme's page;
// pairs: [VitePress's subtree, the theme's]; drop: vitepress.dev's elements
// the theme does not render
const NAV_PAGE = { vitepress: '/guide/getting-started.html', path: '/guide/getting-started/' };
// shown, opacity and visibility included (a closed flyout's menu is in the
// page, transparent and hidden)
const shown = (selector) => `document.querySelector(${JSON.stringify(selector)})?.checkVisibility({ opacityProperty: true, visibilityProperty: true }) === true`;
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
  // the navbar where VitePress lays it out differently: on a phone, then
  // where the parity site's bar has no room for two menu items, the
  // appearance switch and the social links (768), for one item and both
  // (880, and 960 beside the sidebar), for both (1120), for the social
  // links (1200), and where all fits
  {
    name: 'navbar',
    ...NAV_PAGE,
    widths: [375, 768, 880, 960, 1120, 1200, 1280, 1440],
    pairs: [['.VPNav', '.vp-nav']],
  },
  {
    name: 'navbar, scrolled',
    ...NAV_PAGE,
    widths: [375, 1280],
    steps: [['scroll', '200', '200']],
    expect: [
      "scrollY === 200 && !document.querySelector('.VPNavBar').classList.contains('top')",
      "scrollY === 200 && !document.querySelector('.vp-nav-bar').classList.contains('vp-nav-bar--top')",
    ],
    pairs: [['.VPNav', '.vp-nav']],
  },
  {
    name: 'navbar, flyout open',
    ...NAV_PAGE,
    widths: [1280, 1440],
    steps: [['hover', '.VPNavBarMenu li:nth-child(5) .VPFlyout > .button', '.vp-nav-bar__menu li:nth-child(5) .vp-flyout > .vp-flyout__button']],
    expect: [shown('.VPNavBarMenu li:nth-child(5) .VPFlyout > .menu'), shown('.vp-nav-bar__menu li:nth-child(5) .vp-flyout > .vp-flyout__menu')],
    pairs: [['.VPNav', '.vp-nav']],
  },
  {
    name: 'navbar, extra menu open',
    ...NAV_PAGE,
    widths: [768, 960, 1120, 1200],
    // a hover: after a click the pointer moves away, which closes a flyout
    steps: [['hover', '.VPNavBarExtra > .button', '.vp-nav-bar-extra > .vp-flyout__button']],
    expect: [shown('.VPNavBarExtra > .menu'), shown('.vp-nav-bar-extra > .vp-flyout__menu')],
    pairs: [['.VPNav', '.vp-nav']],
  },
  {
    name: 'nav screen',
    ...NAV_PAGE,
    widths: [375, 640],
    steps: [['click', '.VPNavBarHamburger', '.vp-nav-bar-hamburger']],
    expect: [shown('#VPNavScreen'), shown('#VPNavScreen')],
    pairs: [['.VPNav', '.vp-nav']],
  },
  // the doc footer: the edit link, the last updated time, the pages
  // before and after, on a page in the sidebar, on one outside it (no
  // previous, the sidebar's first as next), and on one that sets the
  // options, without a sidebar, so the site's footer shows
  {
    name: 'doc footer',
    ...NAV_PAGE,
    widths: [375, 640, 960, 1280],
    pairs: [
      ['.VPDocFooter', '.vp-doc-footer'],
      ['.VPFooter', '.vp-footer'],
    ],
  },
  {
    name: 'doc footer, outside the sidebar',
    vitepress: '/outside.html',
    path: '/outside/',
    widths: [375, 1280],
    pairs: [['.VPDocFooter', '.vp-doc-footer']],
  },
  {
    name: 'doc footer and footer, page options',
    vitepress: '/guide/options.html',
    path: '/guide/options/',
    widths: [375, 768, 1280],
    pairs: [
      ['.VPDocFooter', '.vp-doc-footer'],
      ['.VPFooter', '.vp-footer'],
    ],
  },
  // a page with neither a sidebar nor an outline: no local nav until the
  // page has scrolled past the navbar, then a fixed one (a short window, so
  // the page can scroll)
  {
    name: 'page without sidebar or outline',
    vitepress: '/guide/options.html',
    path: '/guide/options/',
    widths: [375, 1280],
    height: 400,
    expect: ["!document.querySelector('.VPLocalNav')", "!document.querySelector('.vp-local-nav')"],
    pairs: [['.VPContent', '#VPContent']],
  },
  {
    name: 'page without sidebar or outline, scrolled',
    vitepress: '/guide/options.html',
    path: '/guide/options/',
    // from 60rem VitePress shows no local nav beside no sidebar
    widths: [375, 768],
    height: 400,
    steps: [['scroll', '100', '100']],
    expect: [shown('.VPLocalNav'), shown('.vp-local-nav')],
    pairs: [
      ['.VPLocalNav', '.vp-local-nav'],
      ['.VPContent', '#VPContent'],
    ],
  },
  // the home page: the hero, the features (four to a row from 60rem), the
  // markdown below them, the footer; the navbar transparent until scrolled
  {
    name: 'home',
    vitepress: '/index.html',
    path: '/',
    widths: [375, 640, 768, 960, 1280, 1440],
    pairs: [
      ['.VPNav', '.vp-nav'],
      ['.VPContent', '#VPContent'],
      ['.VPFooter', '.vp-footer'],
    ],
  },
  {
    name: 'home, scrolled',
    vitepress: '/index.html',
    path: '/',
    widths: [375, 1280],
    steps: [['scroll', '200', '200']],
    expect: [
      "scrollY === 200 && !document.querySelector('.VPNavBar').classList.contains('top')",
      "scrollY === 200 && !document.querySelector('.vp-nav-bar').classList.contains('vp-nav-bar--top')",
    ],
    pairs: [['.VPNav', '.vp-nav']],
  },
  {
    name: 'nav screen, groups open',
    ...NAV_PAGE,
    widths: [375],
    steps: [
      ['click', '.VPNavBarHamburger', '.vp-nav-bar-hamburger'],
      ['click all', '.VPNavScreenMenuGroup > .button', '.vp-nav-menu-group--screen > .vp-nav-menu-group__button'],
    ],
    expect: [
      "[...document.querySelectorAll('.VPNavScreenMenuGroup')].every((g) => g.classList.contains('open') && g.querySelector('.items').checkVisibility())",
      "[...document.querySelectorAll('.vp-nav-menu-group--screen')].every((g) => g.classList.contains('vp-nav-menu-group--open') && g.querySelector('.vp-nav-menu-group__items').checkVisibility())",
    ],
    pairs: [['.VPNav', '.vp-nav']],
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
    check: /^(aside|local nav, outline open|nav|doc footer|home|page without)/,
    element: /./,
    prop: /^(box y|box height|height|bottom|top|transform)$/,
    within: 0.25,
    reason: "VitePress's minified CSS rounds line heights to six digits (2.2857143 to 2.28571, 1.3333333 to 1.33333), so each such line (the outline's, the menus', a heading's, the doc footer's, the hero's) is 1/64px shorter there and what follows sits higher, or what is centered on it (the hero image's translate(-50%)) moves; vpkit keeps the source values",
  },
  {
    check: /^(nav|home)/,
    element: / > img\[0\]$/,
    prop: /^vertical-align$/,
    reason: "Tailwind's preflight gives an img vertical-align: middle where VitePress leaves baseline; the logo is a flex item, which vertical-align does not move",
  },
  {
    check: /^home/,
    element: /^div\.VPContent > div\[0\] > div\[0\] > div\[0\] > div\[1\] > div\[0\] > img\[1\]$/,
    prop: /^vertical-align$/,
    reason: "the same preflight rule on the hero image, which is absolutely positioned: vertical-align does not move it",
  },
];

const fonts = join(ROOT, 'node_modules/vpkit/fonts');

async function routes(context, site) {
  await context.route(`${OURS}/**`, serve(site));
  await context.route(`${LOCAL}/**`, serve(VITEPRESS_BUILD));
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

// let transitions finish and the navbar's overflow engine decide (it
// measures in animation frames): for three frames in a row, no element has
// an enter or leave class, nothing animates, the sidebar's groups have their
// caret transitions back and the header has not changed
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = null;
        let stable = 0;
        const tick = () => {
          const busy =
            !!document.querySelector('[class*="-enter-"], [class*="-leave-"], .vp-sidebar-group--no-transition') ||
            document.getAnimations().some((a) => a.playState === 'running');
          const now = document.querySelector('header')?.outerHTML ?? '';
          stable = !busy && now === last ? stable + 1 : 0;
          last = now;
          if (stable >= 3) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

// a check's step on one side
async function step(page, action, selector, away) {
  if (action === 'hover') await page.hover(selector);
  else if (action === 'click') {
    await page.click(selector);
    await away();
  } else if (action === 'click all') {
    const n = await page.locator(selector).count();
    if (!n) throw new Error(`no ${selector}`);
    for (let i = 0; i < n; i++) await page.locator(selector).nth(i).click();
    await away();
  } else if (action === 'scroll') await page.evaluate((y) => window.scrollTo(0, Number(y)), selector);
  else throw new Error(`no step ${action}`);
  await settle(page);
}

// every element of a subtree in document order, skipping drop and [hidden]
async function describe(page, selector, drop) {
  return page.evaluate(
    ([selector, drop, props, pseudoProps]) => {
      // lay the page out afresh first: after VitePress's hydration Chromium
      // can keep reporting an auto margin it computed before (0px where the
      // box is centered), until its element is laid out again
      const html = document.documentElement;
      const y = scrollY;
      html.style.setProperty('width', `${html.clientWidth - 1}px`);
      void html.offsetWidth;
      html.style.removeProperty('width');
      void html.offsetWidth;
      if (scrollY !== y) scrollTo(0, y);
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
        // a <bdi> is walked through: VitePress after v2.0.0-alpha.20 wraps
        // texts in them (vitepress.dev, and the theme as it does), the tag
        // does not, and around left-to-right text they change nothing
        const kids = [...el.children]
          .flatMap((c) => (c.tagName === 'BDI' ? [...c.children] : [c]))
          .filter((c) => !c.hidden && !(drop && c.matches(drop)));
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

// the same value but for its numbers (a length, a matrix(…)), each within
const NUMBER = /-?\d+(?:\.\d+)?(?:e-?\d+)?/g;
function numbersWithin(a, b, within) {
  const [na, nb] = [String(a).match(NUMBER) ?? [], String(b).match(NUMBER) ?? []];
  return (
    String(a).replace(NUMBER, '#') === String(b).replace(NUMBER, '#') &&
    na.length === nb.length && na.length > 0 &&
    na.every((n, i) => Math.abs(parseFloat(n) - parseFloat(nb[i])) <= within)
  );
}

const failures = [];
const expected = [];
let compared = 0;

const only = process.argv[2] ? new RegExp(process.argv[2]) : null;
checkVitepressBuild();
const site = zolaBuild(OURS, 'test/parity-site');
const browser = await chromium.launch();
try {
  for (const c of checks.filter((c) => !only || only.test(c.name))) {
    const runs = c.widths.map((w) => [w, false]);
    if (c.widths.includes(DARK_AT)) runs.push([DARK_AT, true]);
    for (const [width, dark] of runs) {
      const run = `${c.name} [${width}px${dark ? ' dark' : ''}]`;
      const sides = {};
      for (const side of ['upstream', 'theme']) {
        const height = c.height ?? 900;
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'light' });
        await routes(context, site.out);
        if (dark) await context.addInitScript(() => localStorage.setItem('vitepress-theme-appearance', 'dark'));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const url = side === 'theme' ? `${OURS}${c.path}` : c.snapshot ? `${SITE}/snapshot/${c.snapshot}` : `${LOCAL}${c.vitepress}`;
        await page.goto(url);
        await page.evaluate(() => document.fonts.ready);
        // hover nothing that reacts, and let what a hover started run out
        const away = () => page.mouse.move(width - 1, height - 1);
        await away();
        if (side === 'theme' || c.vitepress) await settle(page);
        if (side === 'theme' && c.click) {
          await page.click(c.click);
          await away();
        }
        for (const [action, up, ours] of c.steps ?? []) await step(page, action, side === 'theme' ? ours : up, away);
        await settle(page);
        if (c.expect && !(await page.evaluate(c.expect[side === 'theme' ? 1 : 0]))) {
          failures.push(`${run} ${side}: the steps did not reach their state: ${c.expect[side === 'theme' ? 1 : 0]}`);
        }
        if (errors.length) failures.push(`${run} ${side}: page errors: ${errors.join(' | ')}`);
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
                (k.within === undefined || numbersWithin(x.values[prop], b[j].values[prop], k.within)),
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

for (const k of known.filter((k) => checks.some((c) => k.check.test(c.name) && (!only || only.test(c.name))))) {
  if (k.hits) console.log(`KNOWN ${k.hits}× ${k.check} ${k.element} ${k.prop}: ${k.reason}`);
  else failures.push(`known difference no longer occurs, remove it: ${k.check} ${k.element} ${k.prop}`);
}
for (const f of failures) console.log(`DIFF  ${f}`);
console.log(`layout parity: ${checks.filter((c) => !only || only.test(c.name)).length} checks, ${compared} values compared, ${failures.length} failures, ${expected.length} known`);
process.exit(failures.length ? 1 : 0);
