+++
title = "Settings"
description = "Every setting the theme reads under [extra] in config.toml, with its default."
updated = 2026-10-09T00:00:00Z
+++

# Settings

The theme's settings go under `[extra]` in `config.toml`. Their defaults are in the theme's `theme.toml`; a site sets only what it changes. In a site with several languages, a locale can give any of them for its language ([Internationalization](@/guide/i18n.md)).

The markdown options the theme needs are Zola's, under `[markdown]`: see [Getting Started](@/guide/getting-started.md#configuration).

## Layout

| Setting | Default | |
| --- | --- | --- |
| `logo` | none | The image before the title: a path, `{ src, width?, height?, alt? }`, or `{ light, dark, alt? }` for each appearance. [Navbar](@/reference/navbar.md) |
| `site_title` | `config.title` | The title beside the logo (HTML allowed), or `false` for none. |
| `nav` | `[]` | The navbar's links and groups. [Navbar](@/reference/navbar.md) |
| `social_links` | `[]` | Icons linking elsewhere. [Navbar](@/reference/navbar.md#social-links) |
| `appearance` | `true` | The light and dark switch; `false`: always light. |
| `sidebar` | none | Groups of links, or a table of them by path. [Sidebar](@/reference/sidebar.md) |
| `outline` | `2` | The headings in the outline: `2`, `[2, 3]`, `"deep"` (2 to 6) or `false`. |
| `footer` | `{}` | `{ message?, copyright? }` (HTML) at the foot of pages without a sidebar. [Doc Footer](@/reference/doc-footer.md#site-footer) |
| `not_found` | `{}` | The 404 page's texts: `{ code?, title?, quote?, link?, link_label?, link_text? }`. |

## Doc Footer

| Setting | Default | |
| --- | --- | --- |
| `edit_link` | `{}` | `{ pattern, text? }`: a link under each doc, `:path` in the pattern its file under `content/`. [Doc Footer](@/reference/doc-footer.md) |
| `last_updated` | `false` | The date a doc's `updated` front matter gives, under it. |
| `last_updated_text` | `"Last updated"` | Its label. |
| `doc_footer_prev` | `"Previous page"` | The label of the link to the previous page, or `false` for no link. |
| `doc_footer_next` | `"Next page"` | The same for the next page. |

## Search

| Setting | Default | |
| --- | --- | --- |
| `search` | `false` | VitePress's local search; needs the index page. [Search](@/reference/search.md) |
| `search_button_text` | `"Search"` | The navbar button's text, and the search box's placeholder. |
| `search_box` | `{}` | The search box's texts. [Search](@/reference/search.md#texts) |

## Languages

| Setting | Default | |
| --- | --- | --- |
| `locales` | `[]` | One entry per language, with its settings. [Internationalization](@/guide/i18n.md) |
| `lang_menu_label` | `"Change language"` | The language menu's label. |

## Labels

| Setting | Default |
| --- | --- |
| `outline_label` | `"On this page"` |
| `sidebar_menu_label` | `"Menu"` |
| `return_to_top_label` | `"Return to top"` |
| `nav_menu_label` | `"Main Navigation"` |
| `extra_menu_label` | `"More options"` |
| `mobile_menu_label` | `"Menu"` |
| `dark_mode_switch_label` | `"Appearance"` |
| `dark_mode_switch_title` | `"Switch to dark theme"` |
| `light_mode_switch_title` | `"Switch to light theme"` |
| `skip_to_content_label` | `"Skip to content"` |

## Markdown

| Setting | Default | |
| --- | --- | --- |
| `container_labels` | `{}` | The containers' and alerts' default titles: `{ tip?, info?, warning?, danger?, details?, note?, important?, caution? }` (`"TIP"`, `"INFO"`, …, `"Details"`). |
| `code_copy_button` | `{}` | The copy button's texts: `{ tooltip_text?, copied_text? }` (`"Copy code"`, `"Copied"`). |
