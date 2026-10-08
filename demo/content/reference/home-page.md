+++
title = "Home Page"
description = "VitePress's home layout: the hero, the features, and markdown below them."
updated = 2026-10-09T00:00:00Z
+++

# Home Page

A page or section with `layout = "home"` under `[extra]` is VitePress's home page, usually `content/_index.md`. It has no sidebar and no local nav, and its navbar is transparent until the page scrolls. This site's home page is one.

## Hero

```toml
+++
title = "My Project"

[extra]
layout = "home"

[extra.hero]
name = "My Project"
text = "What it is, in a line"
tagline = "Why it matters"
image = { src = "/logo.svg", alt = "My Project" }
actions = [
  { theme = "brand", text = "Get Started", link = "@/guide/introduction.md" },
  { theme = "alt", text = "GitHub", link = "https://github.com/you/project" },
]
+++
```

| Key | |
| --- | --- |
| `name` | The large title in the brand color (HTML allowed). |
| `text` | The line below it. |
| `tagline` | The smaller line below that. |
| `image` | A path, `{ src, alt?, width?, height? }`, or `{ light, dark, alt? }`, beside the text on a wide screen. |
| `actions` | Buttons: `{ text, link, theme? }`, `theme` `"brand"` (the default) or `"alt"`. |

## Features

```toml
[[extra.features]]
icon = "⚡"
title = "Fast"
details = "One line of details."

[[extra.features]]
icon = { src = "/cube.svg", width = 32, height = 32 }
title = "A list"
details = ["Or several lines", "as a list"]
link = "@/guide/speed.md"
link_text = "Learn more"
```

| Key | |
| --- | --- |
| `icon` | HTML (an emoji), or an image: `{ src, alt?, width?, height? }` or `{ light, dark, alt? }`, 48px unless sized; `wrap = true` sets it on a tile. |
| `title` | The feature's title (HTML allowed). |
| `details` | A text (HTML allowed), or a list of them. |
| `link`, `link_text` | Makes the whole feature a link, with `link_text` at its foot. |

The features sit two, three or four to a row by their number, as VitePress's do.

## Below the Features

The page's markdown goes below the features, with the docs' styles.
