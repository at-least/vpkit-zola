# vpkit-zola

A [Zola](https://www.getzola.org) theme with VitePress's look, built on [vpkit](https://github.com/at-least/vpkit). A docs site needs only `zola` (0.23.6 or later): the theme ships its stylesheet, fonts and script prebuilt, so there is no Node.js and no build step.

Work in progress. Done: the page skeleton and the markdown, as VitePress renders them. Not yet: the navbar, the sidebar, the outline, the home page, search.

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

## How it works

Zola renders markdown with its own markup. The theme's templates rewrite it into VitePress's markup (`templates/vp-markdown.html`, string replacements on what Zola writes), so vpkit's `content.css`, VitePress's own styles for markdown, applies as it is:

- each code block is wrapped as VitePress's are, in `div.language-<lang>` with the copy button and the language label; highlighted lines become `.line.highlighted`
- GitHub alerts (`> [!NOTE]` …) take VitePress's custom-block classes and title
- footnotes, task lists and heading anchors take VitePress's classes

What vpkit cannot style, `css/zola.css` does: Giallo's line numbers, and alerts that stay `<blockquote>`s.

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

`npm test` builds this site with zola and renders it in headless Chromium (`test/render.mjs`):

- `content/parity/markdown.md`, VitePress's markdown guide written for Zola, against the page VitePress rendered for vitepress.dev: each `.vp-doc` alone at two widths and in dark mode, every element's computed style, pseudo-elements and box compared. Intentional differences are listed with their reasons in the script; one that stops occurring fails the run.
- every Giallo token's color, light and dark, with the appearance stored or taken from the OS
- the copy button, which must copy the code without its line numbers

The CSS is compiled unminified: Tailwind's minifier rounds `line-height: 1.3333333` to `1.33333`, which makes each `h2` 1/64px shorter.

## License

MIT (`LICENSE`). The prebuilt stylesheet holds vpkit's CSS, which ports VitePress's (MIT, `LICENSE-VitePress`; `content/parity/markdown.md` is VitePress's guide text) and Lucide's icons (ISC, `LICENSE-Lucide`). The fonts in `static/fonts/` are Inter, under the SIL Open Font License 1.1 (`LICENSE-Inter`).
