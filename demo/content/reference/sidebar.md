+++
title = "Sidebar"
description = "Groups of links, collapsible sections, a sidebar per part of the site, the outline."
updated = 2026-10-09T00:00:00Z
+++

# Sidebar

The sidebar is VitePress's: groups of links down the left of each doc, beside the doc on a wide screen and over it, behind the local nav's Menu button, on a narrow one.

```toml
[[extra.sidebar]]
text = "Guide"
items = [
  { text = "Introduction", link = "@/guide/introduction.md" },
  { text = "Getting Started", link = "@/guide/getting-started.md" },
]

[[extra.sidebar]]
text = "Reference"
items = [
  { text = "Settings", link = "@/reference/settings.md" },
]
```

## Items

An item is a link, a group of items, or both:

| Key | |
| --- | --- |
| `text` | Its text (HTML allowed). |
| `link` | A page's file (`@/…`), a path on the site or a URL. |
| `items` | The items under it, up to six levels deep. |
| `collapsed` | `true` or `false` makes it a section that collapses, closed or open at first; without it, it does not. |
| `target`, `rel` | The link's; a link to another site gets `target="_blank"` and `rel="noreferrer"` without them. |
| `doc_footer_text` | The link's text in the doc footer's previous and next links, instead of `text`. |

The page's own item is active, and the sections around it open. A group without `text` is a list with no title.

## A Sidebar per Part of the Site

As VitePress's sidebar can be an object by path, `sidebar` can be a table of lists by path:

```toml
[[extra.sidebar."/guide/"]]
text = "Guide"
items = [{ text = "Introduction", link = "@/guide/introduction.md" }]

[[extra.sidebar."/reference/"]]
text = "Reference"
items = [{ text = "Settings", link = "@/reference/settings.md" }]
```

A page takes the list whose path its own starts with, the longest first, and has no sidebar when none does. This site works that way: the guide and the reference have a sidebar each.

## Without a Sidebar

A page with `sidebar = false` under `[extra]` in its front matter has none, and a site without `sidebar` has none anywhere. A page without a sidebar shows the site's footer.

## The Outline

Beside each doc, from 1280px wide, the aside lists the doc's headings, the one being read marked; on a narrower screen the local nav's "On this page" drops the same list down.

```toml
[extra]
outline = [2, 3]          # h2 and h3; 2 (the default), "deep" (h2 to h6) or false
outline_label = "Contents"
```

A page's front matter can set its own `outline`, or `aside = false` for no aside.
