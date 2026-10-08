# vpkit-zola

A [Zola](https://www.getzola.org) theme with VitePress's look, built on [vpkit](https://github.com/at-least/vpkit). A docs site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, fonts and script prebuilt, so there is no Node.js and no build step.

Work in progress. Done: the page skeleton, the markdown, the navbar (with the extra menu, the appearance switch, social links and the phone's nav screen), the sidebar, the local nav (narrow screens), the aside with the outline, the doc footer, the site footer, the home page, the 404 page, the local search and sites in several languages, as VitePress renders them.

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

The sidebar and the outline are set as in VitePress's `themeConfig`, under `[extra]`:

```toml
[extra]
outline = 2            # the headings in the outline: 2, [2, 3], "deep" (2 to 6) or false

[[extra.sidebar]]
text = "Guide"
collapsed = false      # set it (true or false) to make the section collapsible
items = [
  { text = "Introduction", link = "@/guide/introduction.md" },
  { text = "Nested", items = [{ text = "Details", link = "@/guide/details.md" }] },
  { text = "Zola", link = "https://www.getzola.org" },
]
```

A link is a Zola path (`@/…`, checked at build time), a path on the site or a URL. The page's item is active, and the sections around it open. A page can set `sidebar = false`, `aside = false` or its own `outline` in its front matter's `[extra]`. The labels are settings too: `outline_label` ("On this page"), `sidebar_menu_label` ("Menu"), `return_to_top_label` ("Return to top").

The navbar, also as in `themeConfig`:

```toml
[extra]
logo = { src = "/logo.svg", width = 24, height = 24 }   # or "/logo.svg", or { light = "…", dark = "…" }
site_title = "My Docs"   # default: config.title; false: logo only
appearance = true        # the light/dark switch; false: always light
nav = [
  { text = "Guide", link = "@/guide/introduction.md", active_match = "^/guide/" },
  { text = "More", items = [
    { text = "Changelog", link = "https://example.com/changelog" },
    { text = "Elsewhere", items = [{ text = "Blog", link = "https://example.com/blog" }] },
  ] },
]
social_links = [{ icon = "github", link = "https://github.com/you/project" }]
```

Under each doc, and at the foot of pages without a sidebar:

```toml
[extra]
edit_link = { pattern = "https://github.com/you/project/edit/main/content/:path", text = "Edit this page on GitHub" }
last_updated = true      # a doc's `updated` date (front matter), in the reader's language
footer = { message = "Released under the MIT License.", copyright = "Copyright © 2026 You" }
```

`:path` is the doc's file under `content/`. The links to the previous and next pages follow the sidebar's order, as in VitePress; their labels are `doc_footer_prev` ("Previous page") and `doc_footer_next` ("Next page"), `false` for none, and `last_updated_text` ("Last updated") labels the date. A doc's own `[extra]` can set `edit_link`, `last_updated` or `footer` to `false`, and `prev` and `next` to `false`, a text, or `{ text, link }`.

A home page is VitePress's `layout: home`, set in a page's or section's front matter (usually `content/_index.md`):

```toml
+++
title = "My Project"

[extra]
layout = "home"

[extra.hero]
name = "My Project"
text = "What it is, in a line"
tagline = "Why it matters"
image = { src = "/logo.svg", alt = "My Project" }
actions = [
  { theme = "brand", text = "Get Started", link = "@/guide/introduction.md" },
  { theme = "alt", text = "GitHub", link = "https://github.com/you/project" },
]

[[extra.features]]
icon = "⚡"                  # HTML, or an image: { src, width?, height?, wrap? }
title = "Fast"
details = "One line, or a list: [\"…\", \"…\"]"
link = "@/guide/speed.md"    # optional, with link_text
link_text = "Learn more"
+++

Markdown here goes below the features.
```

The features sit two, three or four to a row by their number, as in VitePress. A home page has no sidebar or local nav, and the navbar is transparent until the page scrolls.

The local search is VitePress's (its button and box, its index and ranking), without Node: turn it on under `[extra]` and add the page the theme writes the index into, `content/vp-search.md` (and `content/vp-search.<code>.md` for each other language, the same):

```toml
[extra]
search = true
search_button_text = "Search"   # the default
```

```toml
+++
title = "Search index"
template = "vp-search-index.html"
in_search_index = false

[extra]
search = false
+++
```

The index page holds every page's text; the box loads it on its first open, splits it into sections at the headings and ranks them with MiniSearch, all as VitePress does (`/` or Ctrl+K opens it). A page with `search = false` in its `[extra]` stays out. Zola's own `build_search_index` is not needed.

The 404 page is VitePress's, its texts set by `not_found = { code, title, quote, link, link_label, link_text }` under `[extra]` (each optional).

A nav item is a link or a group, a flyout in the bar and a list that opens in place on a phone; a group holds links and titled groups of links. `active_match` is a regular expression tested on the page's path (Zola's `current_path`, such as `/guide/introduction/`); without one, a link is active on its own page. Social link icons are Simple Icons': `bluesky`, `codeberg`, `discord`, `facebook`, `github`, `gitlab`, `instagram`, `linkedin`, `mastodon`, `npm`, `slack`, `twitter`, `x`, `youtube` (`aria_label` overrides the name read out). What does not fit the bar moves into the extra menu (…) as in VitePress: the social links first, then the switch, then menu items from the right. The labels: `nav_menu_label` ("Main Navigation"), `extra_menu_label` ("More options"), `mobile_menu_label` ("Menu"), `dark_mode_switch_label` ("Appearance"), `dark_mode_switch_title` ("Switch to dark theme"), `light_mode_switch_title` ("Switch to light theme").

VitePress's markdown extensions that Zola's markdown lacks are components, called from a page's markdown: custom containers (`::: tip`), badges (`<Badge>`) and code groups (`::: code-group`), rendered as VitePress renders them.

~~~md
{% <vp_container type="tip"> %}
Markdown, as in `::: tip`.
{% </vp_container> %}

{% <vp_container type="details" title="Click me" open={true}> %}
More markdown.
{% </vp_container> %}

## Options {{ <vp_badge type="warning" text="beta" /> }} {#options}

{% <vp_code_group> %}

```js,name=config.js
export default {}
```

```ts,name=config.ts
export default {} satisfies Config
```

{% </vp_code_group> %}
~~~

A container's `type` is `info`, `tip`, `warning`, `danger`, `details`, `note`, `important` or `caution`; `title` replaces the type's label, `open={true}` opens a details block and `no_title={true}` leaves the title out. A badge's `type` is `info`, `note`, `tip` (the default), `important`, `caution`, `warning` or `danger`, its text `text` or what it encloses (`{% <vp_badge type="info"> %}…{% </vp_badge> %}`). In a heading, Zola puts a badge's text into the heading's id where VitePress leaves it out: give the heading its id (`{#options}`); the outline leaves the badge out, as VitePress's does. A code group's tabs are its blocks' names, Zola's `name=` (VitePress's `[title]`). Zola renders the markdown of a page that calls a component as a Tera template first, so in such a page write a literal `{{`, `{%` or `{#` (in code too) inside `{% raw %}…{% endraw %}`; a heading's `{#id}` is fine as it is.

A site in more than one language ([Zola's `[languages]`](https://www.getzola.org/documentation/content/multilingual/)) gets VitePress's language menu: a flyout in the navbar (in the extra menu when the bar is full, opening in place on a phone's nav screen) linking the page to the same path in each other language, the page's hash and query kept. Each language is an entry in `locales` under `[extra]`, which can give any setting in this README for that language: it replaces the site's, a whole setting at a time (a locale's `nav` or `search_box` replaces the site's), as a VitePress locale's `themeConfig` does.

```toml
[languages.zh]
title = "我的文档"            # Zola: each language has its own title

[extra]
lang_menu_label = "Change language"   # the default

[[extra.locales]]
code = "en"                   # the language's code in Zola
label = "English"
lang = "en-US"                # optional: the pages' and the links' lang (default: the code)

[[extra.locales]]
code = "zh"
label = "简体中文"
lang = "zh-Hans"
dir = "ltr"                   # optional
lang_menu_label = "多语言"
nav = [{ text = "指南", link = "@/guide/introduction.zh.md" }]
outline_label = "页面导航"
```

A page in another language is the file with its code, `content/guide/introduction.zh.md`; Zola places it under `/zh/` only with its section in that language too (`content/guide/_index.zh.md`, `render = false` if it has no page of its own). The navbar's title links to the language's home. Zola's heading anchors follow `[slugify] anchors`, which by default transliterates CJK headings where VitePress keeps the characters.

The texts VitePress lets a locale translate are settings here too: the labels above, `skip_to_content_label` ("Skip to content"), the search box's (VitePress's local search translations) and the markdown's (its container labels and copy button). Each key is optional; these are the defaults:

```toml
[extra]
search_box = { display_details = "Display detailed list", reset_button_title = "Reset search", back_button_title = "Close search", no_results_text = "No results for", select_text = "to select", select_key_aria_label = "enter", navigate_text = "to navigate", navigate_up_key_aria_label = "up arrow", navigate_down_key_aria_label = "down arrow", close_text = "to close", close_key_aria_label = "escape" }
container_labels = { tip = "TIP", info = "INFO", warning = "WARNING", danger = "DANGER", details = "Details", note = "NOTE", important = "IMPORTANT", caution = "CAUTION" }
code_copy_button = { tooltip_text = "Copy code", copied_text = "Copied" }
```

## How it works

Zola renders markdown with its own markup. The theme's templates rewrite it into VitePress's markup (`templates/vp-markdown.html`, string replacements on what Zola writes), so vpkit's `content.css`, VitePress's own styles for markdown, applies as it is:

- each code block is wrapped as VitePress's are, in `div.language-<lang>` with the copy button and the language label; highlighted lines become `.line.highlighted`
- GitHub alerts (`> [!NOTE]` …) take VitePress's custom-block classes and title
- footnotes, task lists and heading anchors take VitePress's classes

What vpkit cannot style, `css/zola.css` does: Giallo's line numbers, and alerts that stay `<blockquote>`s.

The layout is VitePress's components with vpkit's class names (`vpkit/layout.css`): the templates write the markup VitePress's Vue components render, the outline from Zola's table of contents at build time where VitePress fills it in the browser. What Vue renders only in the browser (the extra menu, the nav screen, the search box) is in the page, hidden or as a template, until the script needs it. `static/vpkit-zola.js` does what those components do on the page, in plain JavaScript: the appearance switch (VueUse's `useDark`, on VitePress's storage key), the flyouts, the navbar's overflow into the extra menu, the nav screen, the sidebar opening over the page on narrow screens, sections collapsing, the outline dropdown, the aside's active heading, the last updated date in the reader's language, the language links keeping the page's hash, the code groups' tabs. The local search's box and index are `static/vpkit-zola-search.js`, loaded when the box first opens, with MiniSearch at the version VitePress uses (`static/vendor/minisearch.js`).

The social link icons are built into the stylesheet as VitePress generates its `vp-icons.css`, from `@iconify-json/simple-icons` with Iconify's utilities, for the icons `templates/vp-nav.html` lists.

Code colors are Giallo's, from the themes the site picks. Giallo writes each token's two colors inline as `light-dark()`; the theme ties them to the page's appearance (VitePress's `html.dark`, set by the stored choice or the OS) instead of the OS alone. The code block background stays vpkit's.

Known differences from VitePress: the language label shows Giallo's name for the language (`javascript` where VitePress shows the fence's `js`; the search index reads it too); Zola's markdown has no inline footnotes or line notations (`// [!code focus]`), and containers, badges and code groups are the components above; a link within the page (the outline's, a heading's anchor) is the browser's, which leaves the focus on the link where VitePress's router moves it to the heading (as the theme does for a search result); and the search index reads code with its markup characters escaped as Giallo writes them (`&lt;`) where VitePress reads Shiki's (`&#x3C;`), so the stray terms those leave in an index differ.

## Develop

The prebuilt files come from vpkit, a sibling checkout:

```sh
git clone https://github.com/at-least/vpkit ../vpkit
npm install
npm run build   # static/vpkit-zola.css and static/fonts/, from css/ and vpkit
npm test        # static/ is up to date, then the browser checks
zola serve      # this repository is the theme's demo site too
```

`npm test` builds sites with zola and renders them in headless Chromium:

- `test/render.mjs`, on this site: `content/parity/markdown.md`, VitePress's markdown guide written for Zola, against the page VitePress rendered for vitepress.dev, each `.vp-doc` alone at two widths and in dark mode, every element's computed style, pseudo-elements and box compared; every Giallo token's color, light and dark, with the appearance stored or taken from the OS; the copy button, which must copy the code without its line numbers.
- `test/layout.mjs`, on `test/parity-site` (vitepress.dev's guide sidebar and the headings of its getting-started page, a navbar, and a Chinese locale with vitepress.dev's labels): the sidebar, the local nav and the aside against vitepress.dev as VitePress rendered it in a browser (vpkit's snapshots, with the site's own stylesheets), opened as the snapshots were where they show a click (the sidebar on a phone, the outline dropdown); the navbar, the nav screen, the language menu, the doc footer, the footer, the home page, the 404 page, the search box and the Chinese pages against `test/vitepress-build`, VitePress's build of the same site, both running their scripts and given the same hovers, clicks and scrolls; at widths around each breakpoint (for the navbar, where what fits the bar changes) and in dark mode.
- `test/search.mjs`: the local search's index for each language of `test/parity-site` against the one VitePress built for the same locale, section by section and term by term.
- `test/behavior.mjs`, on `test/parity-site`: what the script does, step by step: the sidebar opening and closing (Escape gives the focus back, the backdrop closes it), a section collapsing, the outline dropdown closing on Escape or a click outside, the aside's active heading as the page scrolls; and, next to `test/vitepress-build` with the same steps and required to end the same, the appearance switch (what it stores, following the OS and other tabs), a flyout by mouse, keyboard and touch, the nav screen, the language menu (its links keeping the page's hash) and its accordion on a phone, the search box (shortcuts, keys, the query kept, back, Enter), a code group's tabs, a Chinese page's alert and container titles and copy button.

`test/vitepress-site` is `test/parity-site` written for VitePress; `test/vitepress-build` is its build by VitePress v2.0.0-alpha.20, the version vpkit ports, committed so the tests need no VitePress. After changing the site, rebuild it from a clone of VitePress at that tag with its dependencies installed and built (the tests refuse a stale build):

```sh
node scripts/build-vitepress-site.mjs ../vitepress
```

Intentional differences are listed with their reasons in the scripts; one that stops occurring fails the run.

The CSS is compiled unminified: Tailwind's minifier rounds `line-height: 1.3333333` to `1.33333`, which makes each `h2` 1/64px shorter.

## License

MIT (`LICENSE`). The prebuilt stylesheet holds vpkit's CSS, which ports VitePress's (MIT, `LICENSE-VitePress`; `content/parity/markdown.md` is VitePress's guide text, `test/vitepress-build` VitePress's build and the logo in the test sites VitePress's), Lucide's icons (ISC, `LICENSE-Lucide`) and Simple Icons' (CC0-1.0). `static/vendor/minisearch.js` is MiniSearch (MIT, `LICENSE-MiniSearch`). The fonts in `static/fonts/` are Inter, under the SIL Open Font License 1.1 (`LICENSE-Inter`).
