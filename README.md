# vpkit-zola

A [Zola](https://www.getzola.org) theme with VitePress's look, built on [vpkit](https://github.com/at-least/vpkit). A docs site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, fonts and script prebuilt, so there is no Node.js and no build step.

Work in progress. Done: the page skeleton, the markdown, the navbar (with the extra menu, the appearance switch, social links and the phone's nav screen), the sidebar, the local nav (narrow screens), the aside with the outline, the doc footer, the site footer, the home page, the 404 page, the local search, sites in several languages, sidebars by path, and VitePress's custom containers, badges and code groups in markdown, as VitePress renders them.

## Use

```sh
git submodule add https://github.com/at-least/vpkit-zola themes/vpkit-zola
```

In `config.toml`:

```toml
theme = "vpkit-zola"

[markdown]
github_alerts = true
bottom_footnotes = true
insert_anchor_links = "right"
external_links_target_blank = true   # as VitePress does
external_links_no_referrer = true    # as VitePress does

[markdown.highlighting]
style = "inline"
light_theme = "github-light"   # any Giallo theme, or one `theme` for both
dark_theme = "github-dark"
```

`github_alerts`, `bottom_footnotes`, `insert_anchor_links` and `style` are required, and `data_attr_position` must stay at its default, `"code"`: the templates stop the build and say which setting is wrong.

A docs site usually goes on with a navbar and a sidebar under `[extra]`, with the names VitePress's `themeConfig` uses, in snake case. The theme's documentation has the rest: `demo/` is a site built with the theme (`cd demo && zola serve`), its pages in `demo/content/`.

- Guide: [What is vpkit-zola?](demo/content/guide/what-is-vpkit-zola.md), [Getting Started](demo/content/guide/getting-started.md), [Markdown](demo/content/guide/markdown.md) (Zola's markdown with VitePress's styles; containers, badges and code groups as components), [Internationalization](demo/content/guide/i18n.md), [Coming from VitePress](demo/content/guide/coming-from-vitepress.md).
- Reference: [Settings](demo/content/reference/settings.md) (every setting and its default), [Front Matter](demo/content/reference/front-matter.md), [Navbar](demo/content/reference/navbar.md), [Sidebar](demo/content/reference/sidebar.md), [Home Page](demo/content/reference/home-page.md), [Doc Footer](demo/content/reference/doc-footer.md), [Search](demo/content/reference/search.md).

## How it works

Zola renders markdown with its own markup. The theme's templates rewrite it into VitePress's markup (`templates/vp-markdown.html`, string replacements on what Zola writes), so vpkit's `content.css`, VitePress's own styles for markdown, applies as it is:

- each code block is wrapped as VitePress's are, in `div.language-<lang>` with the copy button and the language label; highlighted lines become `.line.highlighted`
- GitHub alerts (`> [!NOTE]` …) take VitePress's custom-block classes and title
- footnotes, task lists and heading anchors take VitePress's classes

What vpkit cannot style, `css/zola.css` does: Giallo's line numbers, and alerts that stay `<blockquote>`s.

The layout is VitePress's components with vpkit's class names (`vpkit/layout.css`): the templates write the markup VitePress's Vue components render, the outline from Zola's table of contents at build time where VitePress fills it in the browser. What Vue renders only in the browser (the extra menu, the nav screen, the search box) is in the page, hidden or as a template, until the script needs it. `static/vpkit-zola.js` does what those components do on the page, in plain JavaScript: the appearance switch (VueUse's `useDark`, on VitePress's storage key), the flyouts, the navbar's overflow into the extra menu, the nav screen, the sidebar opening over the page on narrow screens, sections collapsing, the outline dropdown, the aside's active heading, the last updated date in the reader's language, the language links keeping the page's hash, the code groups' tabs. The local search's box and index are `static/vpkit-zola-search.js`, loaded when the box first opens, with MiniSearch at the version VitePress uses (`static/vendor/minisearch.js`).

The social link icons are built into the stylesheet as VitePress generates its `vp-icons.css`, from `@iconify-json/simple-icons` with Iconify's utilities, for the icons `templates/vp-nav.html` lists.

Code colors are Giallo's, from the themes the site picks. Giallo writes each token's two colors inline as `light-dark()`; the theme ties them to the page's appearance (VitePress's `html.dark`, set by the stored choice or the OS) instead of the OS alone. The code block background stays vpkit's.

Known differences from VitePress: the language label shows Giallo's name for the language (`javascript` where VitePress shows the fence's `js`; the search index reads it too); Zola's markdown has no inline footnotes or line notations (`// [!code focus]`), and containers, badges and code groups are components ([Markdown](demo/content/guide/markdown.md)); a link within the page (the outline's, a heading's anchor) is the browser's, which leaves the focus on the link where VitePress's router moves it to the heading (as the theme does for a search result); and the search index reads code with its markup characters escaped as Giallo writes them (`&lt;`) where VitePress reads Shiki's (`&#x3C;`), so the stray terms those leave in an index differ.

## Develop

The prebuilt files come from vpkit, a sibling checkout:

```sh
git clone https://github.com/at-least/vpkit ../vpkit
npm install
npm run build   # static/vpkit-zola.css and static/fonts/, from css/ and vpkit
npm test        # static/ is up to date, then the browser checks
zola serve      # this repository's own site: the markdown parity page
cd demo && zola serve   # the documentation, built with the theme
```

`npm test` builds sites with zola and renders them in headless Chromium:

- `test/render.mjs`, on this site: `content/parity/markdown.md`, VitePress's markdown guide written for Zola, against the page VitePress rendered for vitepress.dev, each `.vp-doc` alone at two widths and in dark mode, every element's computed style, pseudo-elements and box compared; every Giallo token's color, light and dark, with the appearance stored or taken from the OS; the copy button, which must copy the code without its line numbers.
- `test/layout.mjs`, on `test/parity-site` (vitepress.dev's guide sidebar and the headings of its getting-started page, a navbar, and a Chinese locale with vitepress.dev's labels): the sidebar, the local nav and the aside against vitepress.dev as VitePress rendered it in a browser (vpkit's snapshots, with the site's own stylesheets), opened as the snapshots were where they show a click (the sidebar on a phone, the outline dropdown); the navbar, the nav screen, the language menu, the doc footer, the footer, the home page, the 404 page, the search box and the Chinese pages against `test/vitepress-build`, VitePress's build of the same site, both running their scripts and given the same hovers, clicks and scrolls; at widths around each breakpoint (for the navbar, where what fits the bar changes) and in dark mode.
- `test/search.mjs`: the local search's index for each language of `test/parity-site` against the one VitePress built for the same locale, section by section and term by term.
- `test/behavior.mjs`, on `test/parity-site`: what the script does, step by step: the sidebar opening and closing (Escape gives the focus back, the backdrop closes it), a section collapsing, the outline dropdown closing on Escape or a click outside, the aside's active heading as the page scrolls; and, next to `test/vitepress-build` with the same steps and required to end the same, the appearance switch (what it stores, following the OS and other tabs), a flyout by mouse, keyboard and touch, the nav screen, the language menu (its links keeping the page's hash) and its accordion on a phone, the search box (shortcuts, keys, the query kept, back, Enter), a code group's tabs, a Chinese page's alert and container titles and copy button.

- `test/demo.mjs`: the documentation in `demo/` builds, its pages without VitePress syntax showing as text.

`test/vitepress-site` is `test/parity-site` written for VitePress; `test/vitepress-build` is its build by VitePress v2.0.0-alpha.20, the version vpkit ports, committed so the tests need no VitePress. After changing the site, rebuild it from a clone of VitePress at that tag with its dependencies installed and built (the tests refuse a stale build):

```sh
node scripts/build-vitepress-site.mjs ../vitepress
```

Intentional differences are listed with their reasons in the scripts; one that stops occurring fails the run.

The CSS is compiled unminified: Tailwind's minifier rounds `line-height: 1.3333333` to `1.33333`, which makes each `h2` 1/64px shorter.

## License

MIT (`LICENSE`). The prebuilt stylesheet holds vpkit's CSS, which ports VitePress's (MIT, `LICENSE-VitePress`; `content/parity/markdown.md` is VitePress's guide text, `test/vitepress-build` VitePress's build and the logo in the test sites VitePress's), Lucide's icons (ISC, `LICENSE-Lucide`) and Simple Icons' (CC0-1.0). `static/vendor/minisearch.js` is MiniSearch (MIT, `LICENSE-MiniSearch`). The documentation's markdown examples follow VitePress's guide (MIT). The fonts in `static/fonts/` are Inter, under the SIL Open Font License 1.1 (`LICENSE-Inter`).
