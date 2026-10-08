+++
title = "Doc Footer"
description = "The edit link, the last updated date, the previous and next pages, and the site's footer."
updated = 2026-10-09T00:00:00Z
+++

# Doc Footer

Under each doc, VitePress's doc footer: a link to edit the page, the date it was last updated, and links to the pages before and after it.

## Edit Link

```toml
[extra]
edit_link = { pattern = "https://github.com/you/project/edit/main/content/:path", text = "Edit this page on GitHub" }
```

`:path` is the page's file under `content/` (`guide/introduction.md`). `text` defaults to "Edit this page".

## Last Updated

```toml
[extra]
last_updated = true
last_updated_text = "Last updated"   # the default
```

The date is a page's `updated` front matter, shown in the reader's language by the browser. A page without one shows none.

## Previous and Next

The links follow the page's sidebar: its neighbors in it, in order. A page the sidebar does not list has the sidebar's first page as its next; with [sidebars by path](@/reference/sidebar.md#a-sidebar-per-part-of-the-site), a page outside every path has no sidebar, and neither link. The labels are `doc_footer_prev` ("Previous page") and `doc_footer_next` ("Next page"); `false` for none.

A page can change its own:

```toml
[extra]
prev = false                                   # none
next = "Markdown"                              # the sidebar's link, with another text
# next = { text = "Markdown", link = "@/guide/markdown.md" }   # another page
```

A sidebar item's `doc_footer_text` replaces its `text` in these links.

## Site Footer

```toml
[extra]
footer = { message = "Released under the MIT License.", copyright = "Copyright © 2026 You" }
```

The site's footer shows at the foot of pages without a sidebar, the home page among them. Its texts may hold HTML. A page with `footer = false` under `[extra]` has none.
