// What static/vpkit-zola.js does, checked in a browser on test/parity-site:
// each step does what a reader would and asserts what VitePress's components
// do then (test/layout.mjs compares how the opened states look).
//
//   node test/behavior.mjs
//
// Exits 1, listing every failed assertion.

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright-chromium';

import { TYPES, zolaBuild } from './lib.mjs';

const OURS = 'https://parity.test';
const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

async function open(browser, width, height = 900) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.route(`${OURS}/**`, (route) => {
    let path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(site.out, path);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
    route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${OURS}/guide/getting-started/`);
  return { page, context, errors };
}

// until no enter/leave class is left and nothing animates
const settle = (page) =>
  page.waitForFunction(
    () =>
      !document.querySelector('[class*="-enter-"], [class*="-leave-"]') &&
      document.getAnimations().every((a) => a.playState !== 'running'),
  );

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
} finally {
  await browser.close();
  rmSync(site.dir, { recursive: true, force: true });
}

for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`behavior: ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
