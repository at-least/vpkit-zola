+++
title = "Coming from VitePress"
description = "What a VitePress site changes to build with Zola and vpkit-zola."
updated = 2026-10-09T00:00:00Z
+++

# Coming from VitePress

A VitePress site's pages move to Zola's `content/` with small changes, and its configuration moves from `.vitepress/config.ts` to `config.toml`. The look stays.

## Configuration

`themeConfig`'s keys are `[extra]`'s, in snake case:

| VitePress (`themeConfig`) | vpkit-zola (`[extra]`) |
| --- | --- |
| `logo`, `siteTitle` | `logo`, `site_title` |
| `nav` (`activeMatch`) | `nav` (`active_match`) |
| `sidebar`, an array or an object by path | `sidebar`, a list or a table by path |
| `socialLinks` | `social_links` |
| `editLink` | `edit_link` |
| `lastUpdated` | `last_updated`, with each page's `updated` date |
| `docFooter` | `doc_footer_prev`, `doc_footer_next` |
| `outline` | `outline`, `outline_label` |
| `footer` | `footer` |
| `notFound` | `not_found` |
| `search: { provider: 'local' }` | `search = true` and an index page |
| `locales` (site config) | Zola's `[languages]` and `locales` |
| `head` (site config), `[tag, attrs, innerHTML]` | `head`, `{ tag, attrs, content }`, a site path in an `href` or `src` through Zola's `base_url` |

A sidebar's `base` has no equivalent: write each link whole. The [settings reference](@/reference/settings.md) has every key.

## Pages

A page's YAML front matter keeps working: Zola reads YAML between `---` lines as well as TOML between `+++` lines. Zola's own keys (`title`, `description`) stay at the top; the theme's (`layout`, `hero`, `features`, `outline`, `sidebar`, `aside`, `prev`, `next`, `editLink`, `lastUpdated`, `footer`) go under `extra`, in snake case. See [Front Matter](@/reference/front-matter.md).

A page whose title VitePress takes from its first heading needs a `title` for Zola.

## Links

VitePress's links are paths: `./getting-started`, `/guide/routing#anchor`. Zola's work too, as paths on the site, but a link to the page's file, `@/guide/getting-started.md#anchor`, is checked when the site builds.

## Markdown

| VitePress | vpkit-zola |
| --- | --- |
| `::: tip Title` … `:::` | `vp_container`, with `type` and `title` ([Markdown](@/guide/markdown.md#custom-containers)) |
| `::: details Title {open}` | `vp_container` with `type="details"` and `open={true}` |
| `::: code-group` | `vp_code_group` ([Markdown](@/guide/markdown.md#code-groups)) |
| `<Badge type="tip" text="new" />` | `vp_badge` ([Markdown](@/guide/markdown.md#badge)) |
| ```` ```js{1,4-6} ```` | ```` ```js,hl_lines=1 4-6 ```` |
| ```` ```ts:line-numbers=5 ```` | ```` ```ts,linenos,linenostart=5 ```` |
| ```` ```js [config.js] ```` in a code group | ```` ```js,name=config.js ```` |
| `// [!code highlight]` | `hl_lines` |
| `<<< @/snippets/file.js` | the code, in a fenced block |
| `<!--@include: ./part.md-->` | the part's text, in the page |
| `[[toc]]` | none: the outline shows it |

Containers, alerts, badges and code groups look as they do in VitePress; the [Markdown](@/guide/markdown.md) guide shows them.

## What Does Not Carry Over

- Vue in markdown: components, `<script setup>`, `{{ "{{ }}" }}` interpolation, `<ClientOnly>`.
- Line notations other than highlighting: focus, diff (`++`, `--`), error and warning.
- Math (`$…$`): Zola renders none, and shows it as written.
- A custom theme in Vue: vpkit-zola's templates are Zola's (Tera) templates.
- The single-page app: pages load as pages. A link to a heading on the same page leaves the focus on the link, where VitePress's router moves it to the heading.
