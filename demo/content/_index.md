+++
title = "vpkit-zola"
description = "VitePress's look for Zola: a docs theme with no Node.js and no build step."

[extra]
layout = "home"

[extra.hero]
name = "vpkit-zola"
text = "VitePress's look, built with Zola"
tagline = "A docs theme for one binary: no Node.js, no build step."
image = { src = "/logo.svg", alt = "vpkit-zola" }
actions = [
  { theme = "brand", text = "What is vpkit-zola?", link = "@/guide/what-is-vpkit-zola.md" },
  { theme = "alt", text = "Getting Started", link = "@/guide/getting-started.md" },
  { theme = "alt", text = "GitHub", link = "https://github.com/at-least/vpkit-zola" },
]

[[extra.features]]
icon = "🎨"
title = "VitePress's design"
details = "The navbar, sidebar, outline, home page, search box and markdown styles of VitePress's default theme, checked against VitePress's own rendering."

[[extra.features]]
icon = "📦"
title = "Only zola"
details = "The stylesheet, fonts and script ship prebuilt in the theme. A site needs zola and nothing else."

[[extra.features]]
icon = "🔍"
title = "Local search"
details = "VitePress's search box, index and ranking, from an index page Zola builds with the site."

[[extra.features]]
icon = "🌐"
title = "Several languages"
details = "A language menu and settings per language, on Zola's multilingual sites."
link = "@/guide/i18n.md"
link_text = "Learn more"
+++
