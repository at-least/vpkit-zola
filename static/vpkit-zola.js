// vpkit-zola's page behavior, without a build step: what VitePress's Vue
// components do in the browser, as plain JavaScript on the markup the
// templates render with vpkit's classes. Each part names the VitePress
// source it follows (src/client/theme-default unless said otherwise).

// ---- shared ---------------------------------------------------------------

// Vue's <Transition> for an element shown and hidden with the hidden
// attribute: name-enter-from and name-enter-active as it appears, -to from
// the frame after, all removed when its transition ends; the same with
// leave as it goes, hidden at the end. A new call cancels a running one.
const transitions = new WeakMap();
function transition(el, name, show) {
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
        if (!show) el.hidden = true;
      });
    }),
  );
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
