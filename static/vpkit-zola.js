// vpkit-zola's page behavior, without a build step: what VitePress's Vue
// components do in the browser, as plain JavaScript on the markup the
// templates render with vpkit's classes. Each part names the VitePress
// source it follows (src/client/theme-default unless said otherwise).

// ---- shared ---------------------------------------------------------------

// Vue's <Transition> for an element shown and hidden with the hidden
// attribute: name-enter-from and name-enter-active as it appears, -to from
// the frame after, all removed when its transition ends; the same with
// leave as it goes, hidden at the end, then afterLeave. A new call cancels
// a running one.
const transitions = new WeakMap();
function transition(el, name, show, afterLeave) {
  const token = {};
  transitions.set(el, token);
  const phase = show ? 'enter' : 'leave';
  for (const p of ['enter', 'leave']) {
    for (const s of ['from', 'active', 'to']) el.classList.remove(`${name}-${p}-${s}`);
  }
  if (show) el.hidden = false;
  el.classList.add(`${name}-${phase}-from`, `${name}-${phase}-active`);
  void el.offsetHeight; // as Vue forces a reflow before leaving
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (transitions.get(el) !== token) return;
      el.classList.remove(`${name}-${phase}-from`);
      el.classList.add(`${name}-${phase}-to`);
      whenTransitionEnds(el, () => {
        if (transitions.get(el) !== token) return;
        el.classList.remove(`${name}-${phase}-active`, `${name}-${phase}-to`);
        if (!show) {
          el.hidden = true;
          afterLeave?.();
        }
      });
    }),
  );
}

// Vue's v-if for an element the template renders hidden: off, it is out
// of the document, where CSS sibling selectors (+, :first-child) do not
// see it; on, it is back in its place, which a comment keeps
const anchors = new WeakMap();
function render(el, on) {
  let anchor = anchors.get(el);
  if (!anchor) {
    anchor = document.createComment('');
    el.before(anchor);
    anchors.set(el, anchor);
    el.hidden = false;
  }
  if (!on) el.remove();
  else if (!el.isConnected) anchor.after(el);
}

// done after the element's longest transition, as Vue times it
function whenTransitionEnds(el, done) {
  const s = getComputedStyle(el);
  const ms = (list) => list.split(',').map((t) => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000));
  const durations = ms(s.transitionDuration);
  const delays = ms(s.transitionDelay);
  const total = Math.max(0, ...durations.map((d, i) => d + delays[i % delays.length]));
  if (!total) return done();
  let finished = false;
  const end = (e) => {
    if (finished || (e && e.target !== el)) return;
    finished = true;
    el.removeEventListener('transitionend', end);
    done();
  };
  el.addEventListener('transitionend', end);
  setTimeout(end, total + 1);
}

// composables/scroll-lock.ts: the page stops scrolling while the sidebar or
// a dropdown is open. lockScroll() returns the unlock for that one lock.
const isIOS =
  /iP(?:ad|hone|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const scrollKeys = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const listenerOptions = { capture: true, passive: false };
let overflowLockCount = 0;
let eventLockCount = 0;
let initialOverflow;
let initialGutter;

function isScrollable(target) {
  let el = target instanceof Element ? target : null;
  while (el && el !== document.body) {
    const { overflowX, overflowY } = getComputedStyle(el);
    if (
      ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) ||
      ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth)
    ) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function blockScroll(e) {
  if ('touches' in e && e.touches.length > 1) return;
  if (!isScrollable(e.target)) e.preventDefault();
}

function blockScrollKeys(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || !scrollKeys.has(e.key)) return;
  const el = e.target;
  if (el instanceof HTMLElement && (el.isContentEditable || el.matches('input, textarea, select'))) return;
  blockScroll(e);
}

function lockOverflow() {
  if (++overflowLockCount > 1) return;
  const html = document.documentElement;
  if (!getComputedStyle(html).scrollbarGutter.includes('stable')) {
    initialGutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = 'stable';
  }
  initialOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  if (isIOS) document.addEventListener('touchmove', blockScroll, listenerOptions);
}

function unlockOverflow() {
  if (--overflowLockCount > 0) return;
  if (isIOS) document.removeEventListener('touchmove', blockScroll, listenerOptions);
  document.body.style.overflow = initialOverflow ?? '';
  if (initialGutter !== undefined) document.documentElement.style.scrollbarGutter = initialGutter;
  initialOverflow = initialGutter = undefined;
}

function lockEvents() {
  if (++eventLockCount > 1) return;
  document.addEventListener('wheel', blockScroll, listenerOptions);
  document.addEventListener('touchmove', blockScroll, listenerOptions);
  document.addEventListener('keydown', blockScrollKeys, listenerOptions);
}

function unlockEvents() {
  if (--eventLockCount > 0) return;
  document.removeEventListener('wheel', blockScroll, listenerOptions);
  document.removeEventListener('touchmove', blockScroll, listenerOptions);
  document.removeEventListener('keydown', blockScrollKeys, listenerOptions);
}

function lockScroll() {
  const useEvents = window.innerWidth > document.documentElement.clientWidth && !CSS.supports('scrollbar-gutter', 'stable');
  if (useEvents) lockEvents();
  else lockOverflow();
  return useEvents ? unlockEvents : unlockOverflow;
}

// support/utils.ts
function throttleAndDebounce(fn, delay) {
  let timeoutId;
  let called = false;
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (!called) {
      fn();
      called = true;
      setTimeout(() => (called = false), delay);
    } else timeoutId = setTimeout(fn, delay);
  };
}

// ---- appearance --------------------------------------------------------------

// src/client/app/data.ts: isDark is VueUse's useDark (useColorMode,
// useStorage, usePreferredDark) on the key vitepress-theme-appearance. The
// stored preference is auto, dark or light; auto when nothing is stored,
// and then stored. The page is dark when it is dark, or auto and the system
// is dark. A switch stores the opposite of what shows, as auto when that is
// the system's. Each change sets `dark` on <html> with transitions off for
// that moment; the page follows the system while auto, and other tabs'
// changes. With appearance = false the head has no check-dark-mode script
// and none of this runs: VitePress's isDark is then always false.
if (document.getElementById('check-dark-mode')) {
  const KEY = 'vitepress-theme-appearance';
  const CSS_DISABLE_TRANS =
    '*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}';
  const preferredDark = matchMedia('(prefers-color-scheme: dark)');
  const switches = document.querySelectorAll('.vp-switch-appearance');
  const read = (raw) => {
    if (raw != null) return raw;
    localStorage.setItem(KEY, 'auto');
    return 'auto';
  };
  let store = read(localStorage.getItem(KEY));
  let applied = null;
  const system = () => (preferredDark.matches ? 'dark' : 'light');
  const state = () => (store === 'auto' ? system() : store);

  // useColorMode's updateHTMLAttrs, on a change of state; VPSwitchAppearance
  function apply() {
    const mode = state();
    if (mode === applied) return;
    applied = mode;
    const style = document.createElement('style');
    style.appendChild(document.createTextNode(CSS_DISABLE_TRANS));
    document.head.appendChild(style);
    document.documentElement.classList.toggle('dark', mode === 'dark');
    window.getComputedStyle(style).opacity;
    document.head.removeChild(style);
    for (const s of switches) {
      s.setAttribute('aria-checked', String(mode === 'dark'));
      s.title = mode === 'dark' ? s.dataset.lightTitle : s.dataset.darkTitle;
    }
  }

  function setStore(value) {
    store = value;
    if (localStorage.getItem(KEY) !== value) localStorage.setItem(KEY, value);
    apply();
  }

  for (const s of switches) {
    s.addEventListener('click', () => {
      const mode = state() === 'dark' ? 'light' : 'dark';
      setStore(system() === mode ? 'auto' : mode);
    });
  }
  preferredDark.addEventListener('change', apply);
  window.addEventListener(
    'storage',
    (e) => {
      if (e.storageArea !== localStorage) return;
      if (e.key == null) return setStore('auto');
      if (e.key !== KEY || e.newValue === store) return;
      store = read(e.newValue);
      apply();
    },
    { passive: true },
  );
  apply();
}

// ---- the navbar ----------------------------------------------------------------

// VPFlyout.vue and composables/flyout.ts. With a mouse a flyout opens as the
// pointer enters its button and closes as it leaves the button and the
// menu; a hover-open absorbs the click that follows it. A click toggles it.
// Escape closes it (and returns the focus to its button when the focus was
// inside), as do a pointerdown outside and the focus moving out of it.
let focusedElement = document.activeElement;
const focusWatchers = new Set();
document.addEventListener('focusin', () => {
  if (document.activeElement === focusedElement) return;
  focusedElement = document.activeElement;
  for (const watcher of focusWatchers) watcher(focusedElement);
});

function flyout(el) {
  const button = el.querySelector(':scope > .vp-flyout__button');
  const menu = el.querySelector(':scope > .vp-flyout__menu');
  let open = false;
  let openedByHover = false;
  const setOpen = (value) => {
    open = value;
    button.setAttribute('aria-expanded', String(value));
  };
  const close = () => {
    setOpen(false);
    openedByHover = false;
  };
  const onPointerLeave = (e) => {
    if (e.pointerType !== 'mouse') return;
    const to = e.relatedTarget;
    if (to && (button.contains(to) || menu.contains(to))) return;
    close();
  };
  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse' || open) return;
    setOpen(true);
    openedByHover = true;
  });
  button.addEventListener('pointerleave', onPointerLeave);
  menu.addEventListener('pointerleave', onPointerLeave);
  button.addEventListener('click', () => {
    if (open && openedByHover) {
      openedByHover = false;
      return;
    }
    openedByHover = false;
    setOpen(!open);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open) return;
    const restoreFocus = el.contains(document.activeElement);
    close();
    if (restoreFocus) el.querySelector('button')?.focus();
  });
  window.addEventListener('pointerdown', (e) => {
    if (open && !el.contains(e.target)) close();
  });
  focusWatchers.add((focused) => {
    if (focused !== el && !el.contains(focused)) close();
  });
  return { close };
}

const navBar = document.querySelector('.vp-nav-bar');
if (navBar) {
  const flyouts = new Map([...navBar.querySelectorAll('.vp-flyout')].map((el) => [el, flyout(el)]));

  // VPNavBar.vue: `top` while the page is not scrolled
  const updateTop = () => navBar.classList.toggle('vp-nav-bar--top', window.scrollY <= 0);
  window.addEventListener('scroll', updateTop, { passive: true });
  updateTop();

  // composables/nav-overflow.ts, priority+: what does not fit the bar moves
  // into the extra menu (…): the social links first, then the appearance
  // switch (translations last), then menu items from the right. A collapsed
  // unit stays in the bar, hidden but measurable. Below 48rem the engine
  // idles with all shown: the bar shows none of it, the nav screen has it.
  const UNITS = ['translations', 'appearance', 'socialLinks'];
  const ALL_VISIBLE = { visibleItemCount: Infinity, translations: true, appearance: true, socialLinks: true };
  const SLACK = 24; // headroom against sub-pixel rounding and the dividers
  let extraWidth = 48; // until the real `⋯` button has been measured once

  const container = navBar.querySelector('.vp-nav-bar__content-body');
  const menu = navBar.querySelector('.vp-nav-menu--bar');
  const items = menu ? [...menu.querySelectorAll(':scope > .vp-nav-menu__list > li')] : [];
  const clusters = {
    translations: null,
    appearance: navBar.querySelector('.vp-nav-bar__appearance'),
    socialLinks: navBar.querySelector('.vp-nav-bar__social-links'),
  };
  const extra = navBar.querySelector('.vp-nav-bar-extra');
  const extraMenu = extra.querySelector('.vp-menu');
  const overflowItems = extraMenu.querySelector(':scope > ul.vp-menu__group');
  const overflowLinks = overflowItems ? [...overflowItems.children] : [];
  const extraGroups = {
    appearance: extraMenu.querySelector('.vp-nav-appearance__menu-appearance')?.parentElement,
    socialLinks: extraMenu.querySelector('.vp-nav-bar-extra__social-links')?.parentElement,
  };
  const isEngineActive = matchMedia('(min-width: 48rem)');

  function computeNavFit(input) {
    const { itemWidths, available, extraWidth } = input;
    const itemsTotal = itemWidths.reduce((sum, w) => sum + w, 0);
    const clusterTotal = (input.translations ?? 0) + (input.appearance ?? 0) + (input.socialLinks ?? 0);
    if (itemsTotal + clusterTotal <= available) return ALL_VISIBLE;
    // something must collapse, so the `⋯` button needs room too
    const budget = available - extraWidth;
    if (itemsTotal > budget) {
      // the whole cluster collapses and the menu keeps what fits from the left
      let used = 0;
      let visibleItemCount = 0;
      for (const width of itemWidths) {
        if (used + width > budget) break;
        used += width;
        visibleItemCount++;
      }
      return {
        visibleItemCount,
        translations: input.translations == null,
        appearance: input.appearance == null,
        socialLinks: input.socialLinks == null,
      };
    }
    // the menu fits: the cluster collapses from its end
    const result = { ...ALL_VISIBLE };
    let used = itemsTotal;
    let dropRest = false;
    for (const unit of UNITS) {
      const width = input[unit];
      if (width == null) continue;
      if (dropRest || used + width > budget) {
        dropRest = true;
        result[unit] = false;
      } else {
        used += width;
      }
    }
    return result;
  }

  // natural width even while collapsed (clamped by max-width)
  const measureUnit = (el) => Math.max(el.offsetWidth, el.scrollWidth);

  function recompute() {
    if (!isEngineActive.matches) return applyResult(ALL_VISIBLE);
    if (extra.offsetWidth > 0) extraWidth = extra.offsetWidth;
    // the rest of the row is fixed occupancy
    let fixed = 0;
    for (const child of container.children) {
      if (child === menu || child === extra || Object.values(clusters).includes(child)) continue;
      fixed += child.offsetWidth;
    }
    const clusterWidth = (unit) => (clusters[unit] ? measureUnit(clusters[unit]) : null);
    applyResult(
      computeNavFit({
        itemWidths: items.map(measureUnit),
        translations: clusterWidth('translations'),
        appearance: clusterWidth('appearance'),
        socialLinks: clusterWidth('socialLinks'),
        available: container.clientWidth - fixed - SLACK,
        extraWidth,
      }),
    );
  }

  // VPNavMenu.vue, the clusters' components and VPNavBarExtra.vue: the
  // collapsed units, and the extra menu holding them (rendered only then)
  function applyResult(result) {
    items.forEach((li, i) => li.classList.toggle('vp-nav-menu__collapsed', i >= result.visibleItemCount));
    for (const unit of UNITS) clusters[unit]?.classList.toggle('vp-nav-bar__collapsed', !result[unit]);
    const overflowCount = Math.max(0, items.length - result.visibleItemCount);
    if (overflowItems) {
      render(overflowItems, overflowCount > 0);
      overflowLinks.forEach((li, i) => render(li, i >= result.visibleItemCount));
    }
    let hasContent = overflowCount > 0;
    for (const unit of ['appearance', 'socialLinks']) {
      if (!extraGroups[unit]) continue;
      render(extraGroups[unit], !result[unit]);
      hasContent ||= !result[unit];
    }
    if (!hasContent && extra.isConnected) flyouts.get(extra).close();
    render(extra, hasContent);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      recompute();
    });
  }
  const observer = new ResizeObserver(schedule);
  for (const el of [container, menu, extra, ...items, ...Object.values(clusters)]) if (el) observer.observe(el);
  isEngineActive.addEventListener('change', schedule);
  // a collapsed unit keeps its clamped box when the font swaps
  document.fonts.ready.then(schedule);
  schedule();

  // VPNavScreen.vue, VPNavBarHamburger.vue, composables/nav.ts and
  // Layout.vue: below 48rem the hamburger opens the nav screen, fading in,
  // with the page locked and what it covers inert. Escape closes it (the
  // focus back on the hamburger), as do its links and the window turning
  // 48rem wide. Its groups open in place, all closed each time it opens.
  const hamburger = navBar.querySelector('.vp-nav-bar-hamburger');
  const screen = document.getElementById('VPNavScreen');
  const covered = document.querySelectorAll('.vp-skip-link, .vp-local-nav, .vp-sidebar, #VPContent, .vp-footer');
  let isScreenOpen = false;
  let unlockScreen = null;

  function setGroupOpen(group, open) {
    group.classList.toggle('vp-nav-menu-group--open', open);
    group.querySelector(':scope > .vp-nav-menu-group__button').setAttribute('aria-expanded', String(open));
    group.querySelector(':scope > .vp-nav-menu-group__items').style.display = open ? '' : 'none';
  }

  function setScreen(open) {
    if (open === isScreenOpen) return;
    isScreenOpen = open;
    hamburger.classList.toggle('vp-nav-bar-hamburger--active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    navBar.classList.toggle('vp-nav-bar--screen-open', open);
    for (const el of covered) el.inert = open;
    if (open) {
      for (const group of screen.querySelectorAll('.vp-nav-menu-group--open')) setGroupOpen(group, false);
      transition(screen, 'vp-nav-screen--fade', true);
      unlockScreen ??= lockScroll();
    } else {
      transition(screen, 'vp-nav-screen--fade', false, () => {
        unlockScreen();
        unlockScreen = null;
      });
    }
  }

  hamburger.addEventListener('click', () => setScreen(!isScreenOpen));
  screen.addEventListener('click', (e) => {
    const button = e.target.closest('.vp-nav-menu-group__button');
    if (button) return setGroupOpen(button.parentElement, button.getAttribute('aria-expanded') !== 'true');
    if (e.target.closest('.vp-nav-menu-link, .vp-menu-link__link')) setScreen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isScreenOpen) return;
    setScreen(false);
    hamburger.focus();
  });
  isEngineActive.addEventListener('change', () => {
    if (isEngineActive.matches) setScreen(false);
  });
}

// ---- the sidebar -------------------------------------------------------------

// Layout.vue, VPSidebar.vue, composables/sidebar.ts and layout.ts: the local
// nav's Menu button opens the sidebar over the page with the backdrop and
// the page locked; the backdrop, Escape (focus back where it was) and a
// window turning desktop-wide close it.
const sidebar = document.querySelector('.vp-sidebar');
const backdrop = document.querySelector('.vp-backdrop');
const menuButton = document.querySelector('.vp-local-nav__menu');
let unlockSidebar = null;
let sidebarTrigger = null;

function openSidebar() {
  if (!sidebar || unlockSidebar) return;
  sidebarTrigger = document.activeElement;
  sidebar.classList.add('vp-sidebar--open');
  menuButton?.setAttribute('aria-expanded', 'true');
  transition(backdrop, 'vp-backdrop--fade', true);
  unlockSidebar = lockScroll();
  sidebar.focus(); // VPSidebar focuses its aside, as here
}

function closeSidebar() {
  if (!unlockSidebar) return;
  sidebar.classList.remove('vp-sidebar--open');
  menuButton?.setAttribute('aria-expanded', 'false');
  transition(backdrop, 'vp-backdrop--fade', false);
  unlockSidebar();
  unlockSidebar = null;
}

menuButton?.addEventListener('click', openSidebar);
backdrop?.addEventListener('click', closeSidebar);
window.addEventListener('keyup', (e) => {
  if (e.key === 'Escape' && unlockSidebar) {
    closeSidebar();
    sidebarTrigger?.focus();
  }
});
matchMedia('(min-width: 60rem)').addEventListener('change', closeSidebar);

// VPSidebarGroup.vue: no caret transition until 300ms after mounting
setTimeout(() => {
  for (const group of document.querySelectorAll('.vp-sidebar-group--no-transition')) {
    group.classList.remove('vp-sidebar-group--no-transition');
  }
}, 300);

// VPSidebarItem.vue and useSidebarItemControl: a collapsible section opens
// and closes from its caret, or from its row when it is not a link
function toggleSidebarItem(item) {
  if (!item.classList.contains('vp-sidebar-item--collapsible')) return;
  const collapsed = item.classList.toggle('vp-sidebar-item--collapsed');
  item.querySelector(':scope > .vp-sidebar-item__item > .vp-sidebar-item__caret')?.setAttribute('aria-expanded', String(!collapsed));
}

sidebar?.addEventListener('click', (e) => {
  const caret = e.target.closest('.vp-sidebar-item__caret');
  if (caret) return toggleSidebarItem(caret.closest('.vp-sidebar-item'));
  const row = e.target.closest('.vp-sidebar-item__item');
  if (row && !row.querySelector(':scope > .vp-sidebar-item__link')) toggleSidebarItem(row.parentElement);
});

// ---- the local nav ------------------------------------------------------------

// VPLocalNav.vue: on a page with neither an outline nor a sidebar it is
// there only once the page has scrolled past the navbar's height
const localNav = document.querySelector('.vp-local-nav--fixed');
if (localNav) {
  const probe = document.createElement('div');
  probe.style.cssText = 'position: absolute; visibility: hidden; height: var(--vp-nav-height)';
  document.body.appendChild(probe);
  const navHeight = probe.offsetHeight;
  probe.remove();
  const update = () => render(localNav, window.scrollY >= navHeight);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ---- the local nav's outline dropdown -------------------------------------------

// VPLocalNavOutlineDropdown.vue: the outline drops down under its button,
// as tall as the window below the navbar allows, the page locked; a click
// outside, Escape or a link closes it (a link without the animation, the page
// jumps). Return to top scrolls up; it is the whole button on a page
// without headers.
const dropdown = document.querySelector('.vp-local-nav-outline-dropdown');
if (dropdown) {
  const button = dropdown.querySelector(':scope > button');
  const items = dropdown.querySelector('.vp-local-nav-outline-dropdown__items');
  let unlockDropdown = null;

  // VPLocalNav.vue measures the navbar's height rather than parse the variable
  const probe = document.createElement('div');
  probe.style.cssText = 'position: absolute; visibility: hidden; height: var(--vp-nav-height)';
  document.body.appendChild(probe);
  const navHeight = probe.offsetHeight;
  probe.remove();

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const onClickOutside = (e) => {
    if (!dropdown.contains(e.target)) setOpen(false);
  };
  function setOpen(open) {
    if (!items || open === isOpen()) return;
    button.setAttribute('aria-expanded', String(open));
    button.classList.toggle('vp-local-nav-outline-dropdown__open', open);
    transition(items, 'vp-local-nav-outline-dropdown__flyout', open);
    if (open) {
      unlockDropdown = lockScroll();
      document.addEventListener('click', onClickOutside);
    } else {
      unlockDropdown?.();
      unlockDropdown = null;
      document.removeEventListener('click', onClickOutside);
    }
  }
  function scrollToTop() {
    setOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }

  button.addEventListener('click', () => {
    if (!items) return scrollToTop();
    dropdown.style.setProperty('--vp-vh', `${window.innerHeight + Math.min(window.scrollY - navHeight, 0)}px`);
    setOpen(!isOpen());
  });
  items?.addEventListener('click', (e) => {
    if (e.target.closest('.vp-local-nav-outline-dropdown__top-link')) return scrollToTop();
    if (e.target.closest('.vp-doc-outline-item__outline-link')) {
      items.style.transition = 'none';
      queueMicrotask(() => {
        setOpen(false);
        items.style.transition = '';
      });
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
}

// ---- the aside's outline --------------------------------------------------------

// composables/outline.ts useActiveAnchor: while the aside shows (80rem and
// wider), the link of the last heading scrolled past is active and the
// marker sits beside it; at the top none is, at the bottom the last one.
const outline = document.querySelector('.vp-doc-aside-outline');
if (outline) {
  const marker = outline.querySelector('.vp-doc-aside-outline__outline-marker');
  const isAsideVisible = matchMedia('(min-width: 80rem)');
  const headers = [...outline.querySelectorAll('a.vp-doc-outline-item__outline-link')]
    .map((a) => ({ element: document.getElementById(decodeURIComponent(a.hash.slice(1))), link: a.hash }))
    .filter((h) => h.element);
  let prevActiveLink = null;
  let ignoreScrollOnce = false;

  const getAbsoluteTop = (element) => {
    let offsetTop = 0;
    while (element !== document.body) {
      if (element === null) return NaN;
      offsetTop += element.offsetTop;
      element = element.offsetParent;
    }
    return offsetTop;
  };

  function activateLink(hash) {
    const activeLink = hash != null ? outline.querySelector(`a[href$="${decodeURIComponent(hash)}"]`) : null;
    if (activeLink === prevActiveLink) return;
    prevActiveLink?.classList.remove('vp-doc-outline-item__active');
    prevActiveLink = activeLink;
    if (activeLink) {
      activeLink.classList.add('vp-doc-outline-item__active');
      marker.style.top =
        activeLink.offsetTop +
        (activeLink.offsetParent?.offsetTop ?? 0) +
        (activeLink.offsetHeight - marker.offsetHeight) / 2 +
        'px';
      marker.style.opacity = '1';
      activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      marker.style.top = '';
      marker.style.opacity = '0';
    }
  }

  function setActiveLink() {
    if (!isAsideVisible.matches) return;
    if (ignoreScrollOnce) {
      ignoreScrollOnce = false;
      return;
    }
    const scrollY = window.scrollY;
    const isBottom = scrollY + window.innerHeight - document.body.offsetHeight >= 0;
    const tops = headers
      .map(({ element, link }) => ({
        link,
        top: getAbsoluteTop(element),
        scrollMarginTop: Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0,
      }))
      .filter(({ top }) => !Number.isNaN(top))
      .sort((a, b) => a.top - b.top);
    if (!tops.length || scrollY < 1) return activateLink(null);
    if (isBottom) return activateLink(tops.at(-1).link);
    let activeLink = null;
    for (const { link, top, scrollMarginTop } of tops) {
      if (top > scrollY + scrollMarginTop + 4) break;
      activeLink = link;
    }
    activateLink(activeLink);
  }

  requestAnimationFrame(setActiveLink);
  window.addEventListener('scroll', throttleAndDebounce(setActiveLink, 100));
  outline.addEventListener('click', (e) => {
    if (!isAsideVisible.matches) return;
    const hash = e.target instanceof Element ? e.target.closest('a')?.hash : null;
    if (hash) {
      ignoreScrollOnce = true;
      activateLink(hash);
    }
  });
}

// ---- the doc footer --------------------------------------------------------------

// VPDocFooterLastUpdated.vue: the last updated time, written on the page in
// the reader's language (the server knows neither it nor their time zone),
// with dateStyle and timeStyle medium; a date without a time (Zola's
// `updated = 2024-01-15`) is that day, wherever the reader is.
for (const time of document.querySelectorAll('.vp-last-updated time')) {
  const lang = navigator.language;
  const day = !time.dateTime.includes('T');
  time.textContent = new Intl.DateTimeFormat(lang, day ? { dateStyle: 'medium', timeZone: 'UTC' } : { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(time.dateTime),
  );
  if (lang && document.documentElement.lang !== lang) time.setAttribute('lang', lang);
  else time.removeAttribute('lang');
}

// ---- copy buttons ----------------------------------------------------------------

// src/client/app/composables/copyCode.ts. The code is the pre's text without
// the lines a diff removes, the elements marked .vp-copy-ignore and Giallo's
// line numbers (.giallo-ln, inside the pre where VitePress keeps them
// outside); shell prompts are dropped as VitePress drops them.

const ignoredNodes = ['.vp-copy-ignore', '.diff.remove', '.giallo-ln'].join(', ');
const shellLangs = ['shellscript', 'shell', 'bash', 'sh', 'zsh'];
const timeoutIdMap = new WeakMap();

window.addEventListener('click', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement) || !el.matches('div[class*="language-"] > button.copy')) return;
  const parent = el.parentElement;
  const sibling = el.nextElementSibling?.nextElementSibling; // <pre> tag
  if (!parent || !sibling) return;

  const clone = sibling.cloneNode(true);
  clone.querySelectorAll(ignoredNodes).forEach((node) => node.remove());
  clone.innerHTML = clone.innerHTML.replace(/\n+/g, '\n');
  let text = clone.textContent || '';
  const lang = /language-(\w+)/.exec(parent.className)?.[1] || '';
  if (shellLangs.includes(lang)) text = text.replace(/^ *(\$|>) /gm, '').trim();

  copyToClipboard(text).then(() => {
    el.classList.add('copied');
    clearTimeout(timeoutIdMap.get(el));
    const timeoutId = window.setTimeout(() => {
      el.classList.remove('copied');
      el.blur();
      timeoutIdMap.delete(el);
    }, 2000);
    timeoutIdMap.set(el, timeoutId);
  });
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const element = document.createElement('textarea');
    const previouslyFocusedElement = document.activeElement;
    element.value = text;
    // Prevent keyboard from showing on mobile
    element.setAttribute('readonly', '');
    element.style.contain = 'strict';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.fontSize = '12pt'; // Prevent zooming on iOS
    const selection = document.getSelection();
    const originalRange = selection ? selection.rangeCount > 0 && selection.getRangeAt(0) : null;
    document.body.appendChild(element);
    element.select();
    // Explicit selection workaround for iOS
    element.selectionStart = 0;
    element.selectionEnd = text.length;
    document.execCommand('copy');
    document.body.removeChild(element);
    if (originalRange) {
      selection.removeAllRanges(); // originalRange can't be truthy when selection is falsy
      selection.addRange(originalRange);
    }
    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) previouslyFocusedElement.focus();
  }
}
