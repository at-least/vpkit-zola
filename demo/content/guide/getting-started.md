+++
title = "Getting Started"
description = "Install the theme, set Zola's markdown options it needs, and write the first pages."
updated = 2026-10-09T00:00:00Z
+++

# Getting Started

## Installation

### Prerequisites

- [Zola](https://www.getzola.org/documentation/getting-started/installation/) 0.23.6 or later.
- A Zola site: `zola init my-docs` makes one.

### Add the theme

The theme goes into the site's `themes/` directory, as a git submodule:

```sh
git submodule add https://github.com/at-least/vpkit-zola themes/vpkit-zola
```

`git submodule update --remote themes/vpkit-zola` brings it up to date later. A plain `git clone` into `themes/vpkit-zola` works as well.

## Configuration

In `config.toml`, name the theme and set the markdown options it renders VitePress's markup from:

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

`github_alerts`, `bottom_footnotes`, `insert_anchor_links` and `style` are required, and `data_attr_position` must stay at its default, `"code"`. A site that sets them otherwise does not build: the theme stops the build and names the setting.

The theme's own settings go under `[extra]`, with the names VitePress's `themeConfig` uses, in snake case. The [settings reference](@/reference/settings.md) lists them all; a docs site usually starts with a navbar and a sidebar:

```toml
[extra]
nav = [
  { text = "Guide", link = "@/guide/introduction.md", active_match = "^/guide/" },
]
social_links = [{ icon = "github", link = "https://github.com/you/project" }]

[[extra.sidebar]]
text = "Guide"
items = [
  { text = "Introduction", link = "@/guide/introduction.md" },
  { text = "Installation", link = "@/guide/installation.md" },
]
```

A link written `@/…` is a page's file under `content/`: Zola checks it at build time.

## File Structure

A site's pages are Zola's: markdown files under `content/`, a section (`_index.md`) for each directory. A directory whose section has no page of its own sets `render = false`:

```
.
├─ config.toml
├─ content
│  ├─ _index.md          # the home page
│  └─ guide
│     ├─ _index.md       # render = false
│     ├─ introduction.md
│     └─ installation.md
├─ static                # served as they are: logo, images
└─ themes
   └─ vpkit-zola
```

### The home page

`content/_index.md` with `layout = "home"` is VitePress's home page: a hero and features, set in its front matter. See [Home Page](@/reference/home-page.md).

```toml
+++
title = "My Project"

[extra]
layout = "home"

[extra.hero]
name = "My Project"
text = "What it is, in a line"
actions = [{ theme = "brand", text = "Get Started", link = "@/guide/introduction.md" }]
+++
```

### Doc pages

Every other page is a doc: the sidebar on the left, the outline of its headings on the right, the doc footer below. Its front matter can turn parts of that off. See [Front Matter](@/reference/front-matter.md).

```toml
+++
title = "Introduction"
updated = 2026-10-09   # shown as "Last updated" with last_updated = true
+++

# Introduction
```

## Up and Running

```sh
zola serve
```

serves the site at `http://127.0.0.1:1111` and rebuilds it as files change; `zola build` writes it to `public/`, ready to publish as static files.

## What's Next?

- [Markdown](@/guide/markdown.md): what VitePress's markdown becomes in Zola's.
- [Search](@/reference/search.md): one page more turns on VitePress's local search.
- [Internationalization](@/guide/i18n.md): a site in several languages.
- [Coming from VitePress](@/guide/coming-from-vitepress.md): moving a VitePress site over.
