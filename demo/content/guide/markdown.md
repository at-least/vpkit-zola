+++
title = "Markdown"
description = "Zola's markdown with VitePress's styles, and VitePress's markdown extensions as components."
updated = 2026-10-09T00:00:00Z
+++

# Markdown

Pages are written in Zola's markdown (CommonMark with tables, task lists, footnotes and GitHub's alerts). The theme rewrites the HTML Zola makes into the HTML VitePress makes, so VitePress's styles for markdown apply as they are. VitePress's extensions that Zola's markdown does not have are components, called from the markdown.

## Header Anchors

Headings get an anchor link after their text (`insert_anchor_links = "right"`). A heading's id comes from its text; to give it another, add it after the text:

```md
## Using custom anchors {#my-anchor}
```

## Links

A link to another page is best written as its file under `content/`, with `@/`: Zola checks it when it builds, and fails on a page that does not exist.

```md
[Getting Started](@/guide/getting-started.md)
[the home page](@/_index.md)
[a heading on a page](@/guide/getting-started.md#configuration)
```

Links to other sites open in a new tab with `external_links_target_blank` and `external_links_no_referrer`, as VitePress's do.

## GitHub-Style Tables

| Tables        |      Are      |  Cool |
| ------------- | :-----------: | ----: |
| col 3 is      | right-aligned | $1600 |
| col 2 is      |   centered    |   $12 |
| zebra stripes |   are neat    |    $1 |

## Task Lists

- [x] Write the docs
- [ ] Publish them

## Emoji :tada:

With `render_emoji = true` under `[markdown]`, `:tada:` becomes :tada:.

## Footnotes

Footnotes[^1] gather at the end of the page, as VitePress's do (`bottom_footnotes = true`).

[^1]: Like this one.

## GitHub-flavored Alerts

```md
> [!NOTE]
> Highlights information that users should take into account, even when skimming.
```

> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.

## Custom Containers

VitePress's `:::` containers are `vp_container`, around the markdown they hold:

{% raw %}
```md
{% <vp_container type="info"> %}
This is an info box.
{% </vp_container> %}
```
{% endraw %}

{% <vp_container type="info"> %}
This is an info box.
{% </vp_container> %}

{% <vp_container type="tip"> %}
This is a tip.
{% </vp_container> %}

{% <vp_container type="warning"> %}
This is a warning.
{% </vp_container> %}

{% <vp_container type="danger"> %}
This is a dangerous warning.
{% </vp_container> %}

{% <vp_container type="details"> %}
This is a details block.
{% </vp_container> %}

The types are `info`, `tip`, `warning`, `danger`, `details`, `note`, `important` and `caution`.

### Custom Title

`title` replaces the type's label, `open={true}` shows a details block open, and `no_title={true}` leaves the title out (a details block always has one):

{% raw %}
```md
{% <vp_container type="danger" title="STOP"> %}
Danger zone, do not proceed
{% </vp_container> %}

{% <vp_container type="details" title="Click me to toggle the code" open={true}> %}
The code, or anything else.
{% </vp_container> %}

{% <vp_container type="tip" no_title={true}> %}
Just want to try it out? Skip to [Getting Started](@/guide/getting-started.md).
{% </vp_container> %}
```
{% endraw %}

{% <vp_container type="danger" title="STOP"> %}
Danger zone, do not proceed
{% </vp_container> %}

{% <vp_container type="details" title="Click me to toggle the code" open={true}> %}
The code, or anything else.
{% </vp_container> %}

{% <vp_container type="tip" no_title={true}> %}
Just want to try it out? Skip to [Getting Started](@/guide/getting-started.md).
{% </vp_container> %}

The default titles are settings, so a site in another language can have its own: see [Internationalization](@/guide/i18n.md#translating-the-texts).

### Nesting

A container can hold another:

{% raw %}
```md
{% <vp_container type="info" title="Outer container"> %}
This box contains another container.

{% <vp_container type="details" title="Inner container"> %}
More markdown.
{% </vp_container> %}
{% </vp_container> %}
```
{% endraw %}

{% <vp_container type="info" title="Outer container"> %}
This box contains another container.

{% <vp_container type="details" title="Inner container"> %}
More markdown.
{% </vp_container> %}
{% </vp_container> %}

{% <vp_container type="warning" title="Inside a list"> %}
A container's own lines are not indented, so inside a list item it ends the list. There, use an alert (`> [!WARNING]`), which nests.
{% </vp_container> %}

## Badge

VitePress's `<Badge>` is `vp_badge`:

{% raw %}
```md
### Title {{ <vp_badge type="info" text="default" /> }} {#title-info}
### Title {{ <vp_badge type="tip" text="^1.9.0" /> }} {#title-tip}
### Title {{ <vp_badge type="warning" text="beta" /> }} {#title-warning}
### Title {{ <vp_badge type="danger" text="caution" /> }} {#title-danger}
```
{% endraw %}

### Title {{ <vp_badge type="info" text="default" /> }} {#title-info}
### Title {{ <vp_badge type="tip" text="^1.9.0" /> }} {#title-tip}
### Title {{ <vp_badge type="warning" text="beta" /> }} {#title-warning}
### Title {{ <vp_badge type="danger" text="caution" /> }} {#title-danger}

The types are `info`, `note`, `tip` (the default), `important`, `caution`, `warning` and `danger`. A badge can enclose markdown instead of taking `text`: {% <vp_badge type="info"> %}custom **element**{% </vp_badge> %}.

{% raw %}
```md
{% <vp_badge type="info"> %}custom **element**{% </vp_badge> %}
```
{% endraw %}

In a heading, Zola puts a badge's text into the heading's id, where VitePress leaves it out: give the heading its own id (`{{ "{#" }}title-info}` above). The outline leaves the badge out, as VitePress's does.

## Code Blocks

Zola's highlighter, Giallo, colors code with the two themes the site picks, one for each appearance; the theme switches them with the page's light and dark mode. Every block has VitePress's copy button and language label.

```js
export default {
  name: 'MyComponent',
  // ...
}
```

### Line Highlighting

`hl_lines` marks lines (VitePress's `{4}`):

````md
```js,hl_lines=4
export default {
  data () {
    return {
      msg: 'Highlighted!'
    }
  }
}
```
````

```js,hl_lines=4
export default {
  data () {
    return {
      msg: 'Highlighted!'
    }
  }
}
```

Several lines and ranges: `hl_lines=1 4 6-8`.

### Line Numbers

`linenos` numbers the lines (VitePress's `:line-numbers`), from `linenostart` if given:

````md
```ts,linenos
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```
````

```ts,linenos
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```

## Code Groups

VitePress's `::: code-group` is `vp_code_group`. Each block's tab is its `name=` (VitePress's `[title]`):

{% raw %}
````md
{% <vp_code_group> %}

```toml,name=config.toml
[extra]
search = true
```

```toml,name=content/vp-search.md
+++
template = "vp-search-index.html"
+++
```

{% </vp_code_group> %}
````
{% endraw %}

{% <vp_code_group> %}

```toml,name=config.toml
[extra]
search = true
```

```toml,name=content/vp-search.md
+++
template = "vp-search-index.html"
+++
```

{% </vp_code_group> %}

## Tera in Markdown

Zola renders the markdown of a page that calls a component as a Tera template, before it renders the markdown. In such a page, a literal `{{ "{{" }}`, `{{ "{%" }}` or `{{ "{#" }}`, in code too, goes inside `{{ "{% raw %}" }}` … `{{ "{% endraw %}" }}`. A heading's `{{ "{#" }}id}` is fine as it is.

## What Is Not There

From VitePress's markdown guide, these have no equivalent: Vue in markdown (`<script setup>`, components, `{{ "{{ }}" }}` interpolation), line notations in code (`// [!code focus]`, `++`, `--`, `error`, `warning`), inline footnotes, `[[toc]]`, `<<<` snippets and `<!--@include-->` files, and math.
