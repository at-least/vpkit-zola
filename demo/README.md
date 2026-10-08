# The demo

rustpress's documentation ([at-least/rustpress](https://github.com/at-least/rustpress), `docs/`: 25 pages written in VitePress's markdown, about rustpress, a VitePress-compatible generator in Rust) rendered by vpkit-zola. The text is rustpress's.

```sh
cd demo && zola serve
```

`themes/vpkit-zola` links to this repository. `convert.py` made the site from rustpress's `docs/` (`python3 demo/convert.py ../rustpress/docs demo`, Python 3 with PyYAML). What VitePress's markdown becomes:

- YAML front matter: Zola's TOML, `title` and `description` as they are and the theme's keys under `[extra]` (`layout`, `hero`, `features`, `outline`, `sidebar`); a page without a title takes its first heading's; `updated` comes from git.
- Links to pages: Zola's `@/` paths, checked at build time. rustpress's two galleries (`themes.md`, `syntax-highlight.md`, driven by its scripts) are left out with their nav and sidebar entries; links to them go to their source on GitHub.
- `::: tip` … `:::`: `{% <vp_container type="tip"> %}` … `{% </vp_container> %}`, with titles, `{open}`, `{no-title}` and nesting; inside a list an alert (`> [!WARNING]`), as a component's own unindented lines would end the list. `::: code-group`: `vp_code_group`, each fence's `[title]` its `name=`. `::: raw`: `<div class="vp-raw">`.
- `<Badge>`: `vp_badge`; a heading with one gets VitePress's id for it (`{#…}`), which leaves the badge out where Zola's would not.
- Fences: `{1,4-5}` becomes `hl_lines`, `:line-numbers[=n]` `linenos[,linenostart]`, `// [!code highlight]` `hl_lines`; a standalone fence's `[title]` goes, as VitePress drops it, and so do the other notations (focus, diff, error, warning), which Zola has no equivalent for.
- `<<< @/snippets/…`: the file's code (its region, its lines) as a fence.
- A line or fence with `{{`, `{%` or `{#` in it: inside `{% raw %}` (Zola renders a page's markdown as a Tera template once it calls a component).
- `[[toc]]` goes.

Math (`$…$`) is left as written, as Zola renders none; emoji (`render_emoji`), footnotes, GitHub alerts and custom heading ids carry over as they are.
