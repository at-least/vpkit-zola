// vpkit-zola's page behavior, without a build step.
//
// Copy buttons: VitePress's src/client/app/composables/copyCode.ts, as
// plain JavaScript. The code is the pre's text without the lines a diff
// removes, the elements marked .vp-copy-ignore and Giallo's line numbers
// (.giallo-ln, inside the pre where VitePress keeps them outside); shell
// prompts are dropped as VitePress drops them.

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
