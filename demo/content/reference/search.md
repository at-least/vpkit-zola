+++
title = "Search"
description = "VitePress's local search, from an index page Zola builds with the site."
updated = 2026-10-09T00:00:00Z
+++

# Search

The search is VitePress's local search: its button in the navbar, its box over the page, and its index and ranking, built from the site's pages. It needs no service and no Node.js.

## Setup

Turn it on, and add the page the theme writes the index into:

{% <vp_code_group> %}

```toml,name=config.toml
[extra]
search = true
```

```toml,name=content/vp-search.md
+++
title = "Search index"
template = "vp-search-index.html"
in_search_index = false

[extra]
search = false
+++
```

{% </vp_code_group> %}

The index page holds the text of every page and section in its language. The box loads it the first time it opens, splits the pages into sections at their headings and ranks them with MiniSearch, as VitePress does. `/`, Ctrl+K or ⌘K opens it; the arrow keys choose a result and Enter goes to it.

A page with `search = false` under `[extra]` in its front matter stays out of the index. Zola's own `build_search_index` is not needed.

{% <vp_container type="tip"> %}
In a site with several languages, each language has its own index page, `content/vp-search.<code>.md`, the same as `content/vp-search.md`: VitePress keeps an index per language too.
{% </vp_container> %}

## Texts

`search_button_text` ("Search") is the button's text and the box's placeholder. The box's other texts, VitePress's local search translations, are `search_box`; each key is optional:

```toml
[extra]
search_box = { display_details = "Display detailed list", reset_button_title = "Reset search", back_button_title = "Close search", no_results_text = "No results for", select_text = "to select", select_key_aria_label = "enter", navigate_text = "to navigate", navigate_up_key_aria_label = "up arrow", navigate_down_key_aria_label = "down arrow", close_text = "to close", close_key_aria_label = "escape" }
```
