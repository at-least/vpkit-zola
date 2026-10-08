// What static/vpkit-zola.js does, checked in a browser on test/parity-site:
// each step does what a reader would. The sidebar's, the local nav's and
// the aside's steps assert what VitePress's components do then; the
// navbar's run on test/vitepress-build (VitePress's build of the same site)
// as well, and what each step leaves (attributes, the focus, the stored
// appearance) must be the same on both. test/layout.mjs compares how the
// opened states look.
//
//   node test/behavior.mjs
//
// Exits 1, listing every failed assertion.

import { rmSync } from 'node:fs';
import { chromium } from 'playwright-chromium';

import { VITEPRESS_BUILD, checkVitepressBuild, serve, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
const LOCAL = 'https://vitepress.test';
const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

async function open(browser, width, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route(`${OURS}/**`, serve(site.out));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${OURS}/guide/getting-started/`);
  return { page, context, errors };
}

// the same page on both sides, and the selectors a scenario needs on each
const SIDES = {
  vitepress: {
    url: `${LOCAL}/guide/getting-started.html`,
    s: {
      switch: '.VPNavBarAppearance .VPSwitchAppearance',
      flyout: '.VPNavBarMenu li:nth-child(5) .VPFlyout',
      flyoutButton: '.VPNavBarMenu li:nth-child(5) .VPFlyout > .button',
      flyoutLinks: '.VPNavBarMenu li:nth-child(5) .VPFlyout a',
      hamburger: '.VPNavBarHamburger',
      screen: '#VPNavScreen',
      screenGroupButton: '.VPNavScreenMenuGroup > .button',
      screenLink: '.VPNavScreen .VPNavScreenMenuLink',
      covered: ['.VPSkipLink', '.VPLocalNav', '.VPSidebar', '.VPContent', '.VPFooter'],
    },
  },
  theme: {
    url: `${OURS}/guide/getting-started/`,
    s: {
      switch: '.vp-nav-bar__appearance .vp-switch-appearance',
      flyout: '.vp-nav-bar__menu li:nth-child(5) .vp-flyout',
      flyoutButton: '.vp-nav-bar__menu li:nth-child(5) .vp-flyout > .vp-flyout__button',
      flyoutLinks: '.vp-nav-bar__menu li:nth-child(5) .vp-flyout a',
      hamburger: '.vp-nav-bar-hamburger',
      screen: '#VPNavScreen',
      screenGroupButton: '.vp-nav-menu-group--screen > .vp-nav-menu-group__button',
      screenLink: '.vp-nav-screen .vp-nav-menu-link--screen',
      covered: ['.vp-skip-link', '.vp-local-nav', '.vp-sidebar', '#VPContent', '.vp-footer'],
    },
  },
};

// run a scenario on VitePress's page and on the theme's, in fresh contexts
// (options: Playwright's), and require the same result; returns the
// theme's. known: { reason, strip(result) }, a difference the theme means
// to have: strip takes it out of both results before they are compared
async function both(name, options, scenario, known) {
  const result = {};
  for (const side of ['vitepress', 'theme']) {
    const context = await browser.newContext(options);
    await context.route(`${OURS}/**`, serve(site.out));
    await context.route(`${LOCAL}/**`, serve(VITEPRESS_BUILD));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(SIDES[side].url);
    await page.evaluate(() => document.fonts.ready);
    await settle(page);
    result[side] = await scenario(page, SIDES[side].s, context);
    check(!errors.length, `${name}: page errors on ${side}: ${errors.join(' | ')}`);
    await context.close();
  }
  const theme = structuredClone(result.theme);
  if (known) {
    known.strip(result.vitepress);
    known.strip(result.theme);
    console.log(`KNOWN ${name}: ${known.reason}`);
  }
  const [a, b] = [JSON.stringify(result.vitepress), JSON.stringify(result.theme)];
  check(a === b, `${name}: VitePress ${a} | theme ${b}`);
  return theme;
}

// until, for three frames in a row, no element has an enter or leave class,
// nothing animates and the header (where the navbar's overflow engine
// decides in animation frames) has not changed
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let last = null;
        let stable = 0;
        const tick = () => {
          const busy =
            !!document.querySelector('[class*="-enter-"], [class*="-leave-"]') ||
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

checkVitepressBuild();
const site = zolaBuild(OURS, 'test/parity-site');
const browser = await chromium.launch();
try {
  // the sidebar on a phone: Menu opens it, Escape closes it and gives the
  // focus back to Menu, the backdrop closes it too
  {
    const { page, context, errors } = await open(browser, 375);
    const state = () =>
      page.evaluate(() => ({
        open: document.querySelector('.vp-sidebar').classList.contains('vp-sidebar--open'),
        expanded: document.querySelector('.vp-local-nav__menu').getAttribute('aria-expanded'),
        backdrop: !document.querySelector('.vp-backdrop').hidden,
        locked: document.body.style.overflow === 'hidden',
        focus: document.activeElement?.className ?? '',
      }));
    await page.click('.vp-local-nav__menu');
    await settle(page);
    let s = await state();
    check(s.open && s.expanded === 'true' && s.backdrop && s.locked, `sidebar: Menu should open it, backdrop shown, page locked: ${JSON.stringify(s)}`);
    await page.keyboard.press('Escape');
    await settle(page);
    s = await state();
    check(!s.open && s.expanded === 'false' && !s.backdrop && !s.locked, `sidebar: Escape should close it: ${JSON.stringify(s)}`);
    check(s.focus.includes('vp-local-nav__menu'), `sidebar: Escape should give the focus back to Menu, it is on .${s.focus}`);
    await page.click('.vp-local-nav__menu');
    await settle(page);
    // the backdrop: between the sidebar's edge and the page's (the scrollbar
    // gutter the locked page keeps is not the page)
    const x = await page.evaluate(
      () => (document.querySelector('.vp-sidebar').getBoundingClientRect().right + document.documentElement.clientWidth) / 2,
    );
    await page.mouse.click(x, 450);
    await settle(page);
    s = await state();
    check(!s.open && !s.backdrop && !s.locked, `sidebar: the backdrop should close it: ${JSON.stringify(s)}`);
    check(!errors.length, `sidebar: page errors: ${errors.join(' | ')}`);
    await context.close();
  }

  // a collapsible section closes and opens from its caret
  {
    const { page, context } = await open(browser, 1280);
    await settle(page);
    const section = '.vp-sidebar-group:nth-of-type(1) .vp-sidebar-item--level-0';
    const state = () =>
      page.evaluate((sel) => {
        const item = document.querySelector(sel);
        return {
          collapsed: item.classList.contains('vp-sidebar-item--collapsed'),
          expanded: item.querySelector('.vp-sidebar-item__caret').getAttribute('aria-expanded'),
          items: getComputedStyle(item.querySelector('.vp-sidebar-item__items')).display,
        };
      }, section);
    await page.click(`${section} > .vp-sidebar-item__item > .vp-sidebar-item__caret`);
    let s = await state();
    check(s.collapsed && s.expanded === 'false' && s.items === 'none', `section: the caret should close it: ${JSON.stringify(s)}`);
    await page.click(`${section} > .vp-sidebar-item__item > .vp-sidebar-item__caret`);
    s = await state();
    check(!s.collapsed && s.expanded === 'true' && s.items !== 'none', `section: the caret should open it again: ${JSON.stringify(s)}`);
    await context.close();
  }

  // the outline dropdown: its button opens it, Escape and a click outside close it
  {
    const { page, context } = await open(browser, 375);
    const isOpen = () =>
      page.evaluate(() => {
        const items = document.querySelector('.vp-local-nav-outline-dropdown__items');
        return !items.hidden && document.querySelector('.vp-local-nav-outline-dropdown > button').getAttribute('aria-expanded') === 'true';
      });
    await page.click('.vp-local-nav-outline-dropdown > button');
    await settle(page);
    check(await isOpen(), 'dropdown: its button should open it');
    await page.keyboard.press('Escape');
    await settle(page);
    check(!(await isOpen()), 'dropdown: Escape should close it');
    await page.click('.vp-local-nav-outline-dropdown > button');
    await settle(page);
    await page.mouse.click(200, 700);
    await settle(page);
    check(!(await isOpen()), 'dropdown: a click outside should close it');
    await context.close();
  }

  // the aside: the heading last scrolled past has the active link and the
  // marker beside it; at the top, none
  {
    const { page, context } = await open(browser, 1280, 400);
    await page.waitForTimeout(200);
    const state = () =>
      page.evaluate(() => ({
        active: document.querySelector('.vp-doc-outline-item__active')?.getAttribute('href') ?? null,
        marker: getComputedStyle(document.querySelector('.vp-doc-aside-outline__outline-marker')).opacity,
      }));
    let s = await state();
    check(s.active === null && s.marker === '0', `outline: at the top no link should be active: ${JSON.stringify(s)}`);
    await page.evaluate(() => {
      const h = document.getElementById('installation');
      window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(h).scrollMarginTop) + 1);
    });
    await page.waitForTimeout(300); // the scroll handler debounces by 100ms
    s = await state();
    check(s.active === '#installation' && s.marker === '1', `outline: past Installation its link should be active: ${JSON.stringify(s)}`);
    await context.close();
  }

  // the appearance switch: what it stores, the page's dark class, its state
  // and title, after each click, from a light system and from a dark one;
  // and transitions are off for each change (VueUse adds and removes a
  // style element)
  for (const scheme of ['light', 'dark']) {
    // VitePress renders the switch on the server, unchecked, and Vue does
    // not correct an attribute while hydrating: on a page dark from the
    // start its switch says unchecked until the first change
    const known = scheme === 'dark' && {
      reason: "VitePress's switch is aria-checked=false on a page that loads dark (its server render, which hydration keeps); the theme's says true",
      strip: (r) => delete r[0].checked,
    };
    const r = await both(`appearance, ${scheme} system`, { viewport: { width: 1440, height: 900 }, colorScheme: scheme }, async (page, s) => {
      await page.evaluate(() => {
        window.transitionsOff = 0;
        new MutationObserver((records) => {
          for (const r of records) for (const n of r.addedNodes) if (n.nodeName === 'STYLE' && n.textContent.includes('transition:none!important')) window.transitionsOff++;
        }).observe(document.head, { childList: true });
      });
      const look = () =>
        page.evaluate((sel) => {
          const button = document.querySelector(sel);
          return {
            stored: localStorage.getItem('vitepress-theme-appearance'),
            dark: document.documentElement.classList.contains('dark'),
            checked: button.getAttribute('aria-checked'),
            title: button.title,
            transitionsOff: window.transitionsOff,
            styleLeft: [...document.querySelectorAll('style')].some((st) => st.textContent.includes('transition:none!important')),
          };
        }, s.switch);
      const seen = [await look()];
      for (let i = 0; i < 2; i++) {
        await page.click(s.switch);
        seen.push(await look());
      }
      return seen;
    }, known);
    const want = scheme === 'light' ? ['auto', 'dark', 'auto'] : ['auto', 'light', 'auto'];
    check(r.every((x) => x.checked === String(x.dark)), `appearance, ${scheme} system: the switch should say checked exactly when the page is dark: ${JSON.stringify(r)}`);
    check(r.map((x) => x.stored).join() === want.join(), `appearance, ${scheme} system: stored ${r.map((x) => x.stored)}, VitePress stores ${want}`);
    check(r[1].transitionsOff === 1 && r[2].transitionsOff === 2, `appearance, ${scheme} system: a change should turn transitions off once: ${JSON.stringify(r)}`);
  }
  // the appearance follows the system while auto, and another tab's choice
  await both('appearance, system and other tabs', { viewport: { width: 1440, height: 900 }, colorScheme: 'light' }, async (page, s, context) => {
    const dark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
    const seen = { start: await dark() };
    await page.emulateMedia({ colorScheme: 'dark' });
    seen.systemDark = await dark();
    await page.emulateMedia({ colorScheme: 'light' });
    seen.systemLight = await dark();
    const other = await context.newPage();
    await other.goto(page.url());
    await other.click(s.switch);
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
    seen.otherTab = await dark();
    seen.stored = await page.evaluate(() => localStorage.getItem('vitepress-theme-appearance'));
    return seen;
  });

  // a flyout with a mouse: hovering its button opens it, the click that
  // follows keeps it open, the next one closes it, the pointer leaving closes
  // it; with the keyboard: Enter opens it, the focus moving into its menu
  // keeps it open, Escape closes it with the focus back on its button, the
  // focus moving out of it closes it
  const flyout = await both('flyout', { viewport: { width: 1440, height: 900 } }, async (page, s) => {
    const expanded = () => page.getAttribute(s.flyoutButton, 'aria-expanded');
    const focusOn = (target) => page.evaluate((t) => document.activeElement === document.querySelector(t), target);
    const seen = {};
    await page.hover(s.flyoutButton);
    seen.hover = await expanded();
    await page.click(s.flyoutButton);
    seen.clickAfterHover = await expanded();
    await page.click(s.flyoutButton);
    seen.secondClick = await expanded();
    await page.click(s.flyoutButton);
    seen.thirdClick = await expanded();
    await page.mouse.move(1430, 880);
    seen.pointerLeft = await expanded();
    await page.focus(s.flyoutButton);
    await page.keyboard.press('Enter');
    seen.enter = await expanded();
    await page.keyboard.press('Tab');
    seen.tabIntoMenu = [await expanded(), await page.evaluate((l) => document.activeElement === document.querySelector(l), s.flyoutLinks)];
    await page.keyboard.press('Escape');
    seen.escape = [await expanded(), await focusOn(s.flyoutButton)];
    await page.keyboard.press('Enter');
    const links = await page.locator(s.flyoutLinks).count();
    for (let i = 0; i <= links; i++) await page.keyboard.press('Tab');
    seen.tabOut = await expanded();
    return seen;
  });
  check(flyout.hover === 'true' && flyout.clickAfterHover === 'true' && flyout.secondClick === 'false' && flyout.escape[1], `flyout: ${JSON.stringify(flyout)}`);

  // a flyout by touch: a tap opens it, a tap outside closes it
  await both('flyout, touch', { viewport: { width: 1440, height: 900 }, hasTouch: true }, async (page, s) => {
    const expanded = () => page.getAttribute(s.flyoutButton, 'aria-expanded');
    await page.tap(s.flyoutButton);
    const tapped = await expanded();
    await page.touchscreen.tap(700, 600);
    return [tapped, await expanded()];
  });

  // the nav screen: the hamburger opens it with the page locked and the
  // rest inert; a group opens in place; Escape closes it with the focus
  // back on the hamburger; it opens again with its groups closed; a link on
  // it closes it; the window turning 48rem wide closes it
  const screen = await both('nav screen', { viewport: { width: 375, height: 800 } }, async (page, s) => {
    const look = () =>
      page.evaluate((s) => {
        const screen = document.querySelector(s.screen);
        return {
          expanded: document.querySelector(s.hamburger).getAttribute('aria-expanded'),
          shown: !!screen && screen.checkVisibility(),
          locked: getComputedStyle(document.body).overflow,
          inert: s.covered.map((c) => document.querySelector(c)?.inert ?? null),
          groups: screen?.checkVisibility() ? [...document.querySelectorAll(s.screenGroupButton)].map((b) => b.getAttribute('aria-expanded')) : [],
          focusOnHamburger: document.activeElement === document.querySelector(s.hamburger),
        };
      }, s);
    const seen = {};
    await page.click(s.hamburger);
    await settle(page);
    seen.open = await look();
    await page.click(s.screenGroupButton);
    seen.groupOpen = await look();
    await page.keyboard.press('Escape');
    await settle(page);
    seen.escape = await look();
    await page.click(s.hamburger);
    await settle(page);
    seen.reopened = await look();
    await page.click(s.screenLink);
    await settle(page);
    seen.link = await look();
    await page.click(s.hamburger);
    await settle(page);
    await page.setViewportSize({ width: 800, height: 800 });
    await settle(page);
    seen.wide = await look();
    return seen;
  });
  check(
    screen.open.shown && screen.open.locked === 'hidden' && screen.groupOpen.groups[0] === 'true' &&
      !screen.escape.shown && screen.escape.focusOnHamburger && screen.reopened.groups[0] === 'false' &&
      !screen.link.shown && !screen.wide.shown && screen.wide.locked === 'visible',
    `nav screen: ${JSON.stringify(screen)}`,
  );

  // appearance = false: no switch and no dark mode, whatever the OS
  // prefers, as VitePress's isDark is then false
  {
    const light = zolaBuild(OURS, 'test/parity-site', (config) => {
      if (!config.includes('\n[extra]\n')) throw new Error('test/parity-site/config.toml has no [extra]');
      return config.replace('\n[extra]\n', '\n[extra]\nappearance = false\n');
    });
    try {
      for (const width of [375, 768, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: 'dark' });
        await context.route(`${OURS}/**`, serve(light.out));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(`${OURS}/guide/getting-started/`);
        await settle(page);
        const s = await page.evaluate(() => ({
          switches: document.querySelectorAll('.vp-switch-appearance, .vp-nav-appearance').length,
          script: !!document.getElementById('check-dark-mode'),
          dark: document.documentElement.classList.contains('dark'),
          stored: localStorage.getItem('vitepress-theme-appearance'),
        }));
        check(!s.switches && !s.script && !s.dark && s.stored === null && !errors.length, `appearance = false [${width}px]: ${JSON.stringify(s)} ${errors.join(' | ')}`);
        await context.close();
      }
    } finally {
      rmSync(light.dir, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
  rmSync(site.dir, { recursive: true, force: true });
}

for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`behavior: ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
