# vpkit-zola

A [Zola](https://www.getzola.org) theme with VitePress's look, built on [vpkit](https://github.com/at-least/vpkit). A docs site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, fonts and script prebuilt, so there is no Node.js and no build step.

Work in progress. Done: the page skeleton, the markdown, the navbar (with the extra menu, the appearance switch, social links and the phone's nav screen), the sidebar, the local nav (narrow screens) and the aside with the outline, as VitePress renders them. Not yet: translations, search, the doc footer, the home page.

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

A nav item is a link or a group, a flyout in the bar and a list that opens in place on a phone; a group holds links and titled groups of links. `active_match` is a regular expression tested on the page's path (Zola's `current_path`, such as `/guide/introduction/`); without one, a link is active on its own page. Social link icons are Simple Icons': `bluesky`, `codeberg`, `discord`, `facebook`, `github`, `gitlab`, `instagram`, `linkedin`, `mastodon`, `npm`, `slack`, `twitter`, `x`, `youtube` (`aria_label` overrides the name read out). What does not fit the bar moves into the extra menu (…) as in VitePress: the social links first, then the switch, then menu items from the right. The labels: `nav_menu_label` ("Main Navigation"), `extra_menu_label` ("More options"), `mobile_menu_label` ("Menu"), `dark_mode_switch_label` ("Appearance"), `dark_mode_switch_title` ("Switch to dark theme"), `light_mode_switch_title` ("Switch to light theme").

## How it works

Zola renders markdown with its own markup. The theme's templates rewrite it into VitePress's markup (`templates/vp-markdown.html`, string replacements on what Zola writes), so vpkit's `content.css`, VitePress's own styles for markdown, applies as it is:

- each code block is wrapped as VitePress's are, in `div.language-<lang>` with the copy button and the language label; highlighted lines become `.line.highlighted`
- GitHub alerts (`> [!NOTE]` …) take VitePress's custom-block classes and title
- footnotes, task lists and heading anchors take VitePress's classes

What vpkit cannot style, `css/zola.css` does: Giallo's line numbers, and alerts that stay `<blockquote>`s.

The layout is VitePress's components with vpkit's class names (`vpkit/layout.css`): the templates write the markup VitePress's Vue components render, the outline from Zola's table of contents at build time where VitePress fills it in the browser. What Vue renders only in the browser (the extra menu, the nav screen) is in the page, hidden, until the script needs it. `static/vpkit-zola.js` does what those components do on the page, in plain JavaScript: the appearance switch (VueUse's `useDark`, on VitePress's storage key), the flyouts, the navbar's overflow into the extra menu, the nav screen, the sidebar opening over the page on narrow screens, sections collapsing, the outline dropdown, the aside's active heading.

The social link icons are built into the stylesheet as VitePress generates its `vp-icons.css`, from `@iconify-json/simple-icons` with Iconify's utilities, for the icons `templates/vp-nav.html` lists.

Code colors are Giallo's, from the themes the site picks. Giallo writes each token's two colors inline as `light-dark()`; the theme ties them to the page's appearance (VitePress's `html.dark`, set by the stored choice or the OS) instead of the OS alone. The code block background stays vpkit's.

Known differences from VitePress: the language label shows Giallo's name for the language (`javascript` where VitePress shows the fence's `js`), and Zola's markdown has no inline footnotes, containers (`::: tip`), code groups or line notations (`// [!code focus]`).

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
- `test/layout.mjs`, on `test/parity-site` (vitepress.dev's guide sidebar and the headings of its getting-started page, and a navbar): the sidebar, the local nav and the aside against vitepress.dev as VitePress rendered it in a browser (vpkit's snapshots, with the site's own stylesheets), opened as the snapshots were where they show a click (the sidebar on a phone, the outline dropdown); the navbar and the nav screen against `test/vitepress-build`, VitePress's build of the same site, both running their scripts and given the same hovers, clicks and scrolls; at widths around each breakpoint (for the navbar, where what fits the bar changes) and in dark mode.
- `test/behavior.mjs`, on `test/parity-site`: what the script does, step by step: the sidebar opening and closing (Escape gives the focus back, the backdrop closes it), a section collapsing, the outline dropdown closing on Escape or a click outside, the aside's active heading as the page scrolls; and, next to `test/vitepress-build` with the same steps and required to end the same, the appearance switch (what it stores, following the OS and other tabs), a flyout by mouse, keyboard and touch, the nav screen.

`test/vitepress-site` is `test/parity-site` written for VitePress; `test/vitepress-build` is its build by VitePress v2.0.0-alpha.20, the version vpkit ports, committed so the tests need no VitePress. After changing the site, rebuild it from a clone of VitePress at that tag with its dependencies installed and built (the tests refuse a stale build):

```sh
node scripts/build-vitepress-site.mjs ../vitepress
```

Intentional differences are listed with their reasons in the scripts; one that stops occurring fails the run.

The CSS is compiled unminified: Tailwind's minifier rounds `line-height: 1.3333333` to `1.33333`, which makes each `h2` 1/64px shorter.

## License

MIT (`LICENSE`). The prebuilt stylesheet holds vpkit's CSS, which ports VitePress's (MIT, `LICENSE-VitePress`; `content/parity/markdown.md` is VitePress's guide text, `test/vitepress-build` VitePress's build and the logo in the test sites VitePress's), Lucide's icons (ISC, `LICENSE-Lucide`) and Simple Icons' (CC0-1.0). The fonts in `static/fonts/` are Inter, under the SIL Open Font License 1.1 (`LICENSE-Inter`).
