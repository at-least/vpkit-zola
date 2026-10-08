+++
title = "Front Matter"
description = "What a page's front matter sets: Zola's own keys, and the theme's under [extra]."
updated = 2026-10-09T00:00:00Z
+++

# Front Matter

A page's front matter is Zola's: TOML between `+++` lines, or YAML between `---` lines. Zola's own keys stay at the top; the theme's go under `[extra]`.

```toml
+++
title = "Introduction"
description = "What the project is."
updated = 2026-10-09

[extra]
outline = [2, 3]
prev = false
+++
```

## Zola's Keys

- `title`: the page's title, in its `<title>` and in search results.
- `description`: its `<meta name="description">`.
- `updated`: the date the doc footer shows as last updated, when the site sets `last_updated = true`.

## The Theme's Keys

### layout

`"doc"` (the default), or `"home"` for VitePress's home page: see [Home Page](@/reference/home-page.md). A home page takes `hero` and `features` under `[extra]` as well.

### outline

The headings in this page's outline, as the site's `outline` setting: `2`, `[2, 3]`, `"deep"` or `false`.

### sidebar

`false`: no sidebar on this page.

### aside

`false`: no aside (the outline on the right) on this page.

### prev, next

The links to the previous and next pages in the doc footer, which follow the sidebar otherwise: `false` for none, a text for the sidebar's link with another label, or `{ text, link }` for another page.

```toml
[extra]
prev = "Get Started"
next = { text = "Markdown", link = "@/guide/markdown.md" }
```

### edit_link, last_updated, footer

`false` turns the edit link, the last updated date or the site's footer off for this page.

### search

`false` leaves the page out of the search index.
