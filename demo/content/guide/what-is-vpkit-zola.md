+++
title = "What is vpkit-zola?"
description = "A Zola theme with VitePress's default theme design, for docs sites without Node.js."
updated = 2026-10-09T00:00:00Z
+++

# What is vpkit-zola?

vpkit-zola is a theme for [Zola](https://www.getzola.org), the static site generator that comes as one binary, with the look of [VitePress](https://vitepress.dev)'s default theme: its navbar, sidebar, outline, home page, search box, dark mode and markdown styles. A site that uses it needs `zola` and nothing else. The theme ships its stylesheet, fonts and script prebuilt, so there is no Node.js, no `package.json` and no build step in the site.

You are reading a site built with it.

## Why

VitePress makes good-looking documentation, but every project that uses it carries a Node.js toolchain: a `package.json`, a lock file, `node_modules`, and a build that needs them. For a project that is not otherwise a JavaScript project, that is a lot to carry for the look of its docs.

The look is CSS and a little behavior. [vpkit](https://github.com/at-least/vpkit) ports VitePress's theme to plain CSS classes; this theme writes the markup VitePress's components write, with vpkit's classes, from Zola's templates, and does in a small script what VitePress's components do in the browser.

## How close to VitePress

The theme is checked against VitePress itself (v2.0.0-alpha.20, the version vpkit ports). Its tests build the same site with VitePress and with Zola, run both in a browser, and compare every element's computed style and box: the navbar at the widths where what fits it changes, the sidebar, the local nav, the outline, the doc footer, the home page, the 404 page, the search box with its results, a site in two languages, and VitePress's markdown guide. What a click or a key does is compared too: flyouts, the phone's nav screen, the appearance switch, the search box's keys.

Where the two differ on purpose, the tests list why; [Coming from VitePress](@/guide/coming-from-vitepress.md) lists what a VitePress site has to change.

## What it does not do

VitePress is a Vue application: a page can import Vue components, interpolate `{{ "{{ }}" }}` expressions and run `<script setup>`, and the site loads as a single-page app. vpkit-zola is a theme for a static site generator. Its pages are plain HTML pages with a small script, and its markdown is Zola's:

- no Vue in markdown;
- VitePress's markdown extensions that Zola lacks are [components](@/guide/markdown.md#custom-containers) (containers, badges, code groups), and some are not there at all (line notations such as `// [!code focus]`, file includes, math);
- code is highlighted by Zola's highlighter, Giallo, with the themes the site picks, rather than by Shiki.
