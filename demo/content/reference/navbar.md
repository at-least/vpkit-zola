+++
title = "Navbar"
description = "The logo, the title, the nav's links and groups, social links, the appearance switch."
updated = 2026-10-09T00:00:00Z
+++

# Navbar

The navbar is VitePress's: the logo and the site's title, the search button, the nav, the language menu, the appearance switch and social links. On a phone they move into the nav screen behind the menu button.

## Site Title and Logo

```toml
[extra]
logo = "/logo.svg"
site_title = "My Docs"   # default: config.title; false: the logo alone
```

The logo is a path under `static/`, or a table:

```toml
logo = { src = "/logo.svg", width = 24, height = 24, alt = "My Docs" }
logo = { light = "/logo-light.svg", dark = "/logo-dark.svg", alt = "My Docs" }   # one for each appearance
```

The title links to the home page (in a site with several languages, the page's language's).

## Navigation Links

`nav` holds links and groups:

```toml
[extra]
nav = [
  { text = "Guide", link = "@/guide/introduction.md", active_match = "^/guide/" },
  { text = "Changelog", link = "https://github.com/you/project/releases" },
  { text = "More", items = [
    { text = "Team", link = "@/team.md" },
    { text = "Elsewhere", items = [
      { text = "Blog", link = "https://example.com/blog" },
    ] },
  ] },
]
```

A link is a page's file (`@/…`), a path on the site or a URL; one to another site opens in a new tab and shows VitePress's arrow. A group is a flyout in the bar and a list that opens in place on a phone; it holds links and titled groups of links.

### Active Links

A link is active on its own page. `active_match` is a regular expression tested on the page's path instead (Zola's `current_path`, such as `/guide/introduction/`): `"^/guide/"` keeps "Guide" active on every page of the guide. A group is active when one of its links is, or, given an `active_match` of its own, when that matches.

## Social Links

```toml
[extra]
social_links = [
  { icon = "github", link = "https://github.com/you/project" },
  { icon = "discord", link = "https://discord.gg/…", aria_label = "Our Discord" },
]
```

The icons are Simple Icons': `bluesky`, `codeberg`, `discord`, `facebook`, `github`, `gitlab`, `instagram`, `linkedin`, `mastodon`, `npm`, `slack`, `twitter`, `x`, `youtube`. `aria_label` replaces the name a screen reader reads out.

## Appearance

`appearance = true` (the default) shows VitePress's light and dark switch. The choice is stored as VitePress stores it, and the page follows the system's until one is made; `false` keeps the site light, with no switch.

## When the Bar Is Full

What does not fit the bar moves into the extra menu (…), as in VitePress: the social links first, then the appearance switch, then the language menu, then the nav's links from the right. Below 768px, the menu button opens the nav screen with all of it.

## Labels

`nav_menu_label` ("Main Navigation"), `extra_menu_label` ("More options"), `mobile_menu_label` ("Menu"), `dark_mode_switch_label` ("Appearance"), `dark_mode_switch_title` ("Switch to dark theme"), `light_mode_switch_title` ("Switch to light theme"), `lang_menu_label` ("Change language").
