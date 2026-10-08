+++
title = "Markdown Extensions"
description = "VitePress's markdown guide, the parts Zola renders: the page the theme's checks compare with vitepress.dev's."

[extra]
outline = "deep"
+++

<!-- From VitePress's docs/en/guide/markdown.md (v2.0.0-alpha.20, MIT),
     its rendered output written in Zola's markdown: {4} is hl_lines=4,
     :line-numbers is linenos, Zola has no inline footnotes, and links to
     sections left out go to vitepress.dev. -->

# Markdown Extensions

VitePress comes with built in Markdown Extensions.

## Header Anchors

Headers automatically get anchor links applied. Rendering of anchors can be configured using the `markdown.anchor` option.

### Custom anchors

To specify a custom anchor tag for a heading instead of using the auto-generated one, add a suffix to the heading:

```
# Using custom anchors {#my-anchor}
```

This allows you to link to the heading as `#my-anchor` instead of the default `#using-custom-anchors`.

## Links

Both internal and external links get special treatment.

### External Links

Outbound links automatically get `target="_blank" rel="noreferrer"`:

- [vuejs.org](https://vuejs.org)
- [VitePress on GitHub](https://github.com/vuejs/vitepress)

## Frontmatter

[YAML frontmatter](https://jekyllrb.com/docs/front-matter/) is supported out of the box:

```yaml
---
title: Blogging Like a Hacker
lang: en-US
---
```

This data will be available to the rest of the page, along with all custom and theming components.

For more details, see [Frontmatter](../reference/frontmatter-config).

## GitHub-Style Tables

**Input**

```md
| Tables        |      Are      |  Cool |
| ------------- | :-----------: | ----: |
| col 3 is      | right-aligned | $1600 |
| col 2 is      |   centered    |   $12 |
| zebra stripes |   are neat    |    $1 |
```

**Output**

| Tables        |      Are      |   Cool |
| ------------- | :-----------: | -----: |
| col 3 is      | right-aligned | $1600 |
| col 2 is      |   centered    |   $12 |
| zebra stripes |   are neat    |    $1 |

## Task Lists

**Input**

```md
- [ ] Write the press release
- [x] Update the website
```

**Output**

- [ ] Write the press release
- [x] Update the website

## Footnotes

**Input**

```md
Footnotes are supported[^1], including inline ones^[This is an inline footnote.].

[^1]: Definitions can contain **markdown** and are rendered at the end of the page.
```

**Output**

Footnotes are supported[^1], including inline ones[^2].

[^1]: Definitions can contain **markdown** and are rendered at the end of the page.
[^2]: This is an inline footnote.

## GitHub-flavored Alerts

VitePress also supports [GitHub-flavored alerts](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts) to render as callouts. They will be rendered the same as the [custom containers](https://vitepress.dev/guide/markdown#custom-containers). Unlike on GitHub, text placed right after the marker becomes the title of the alert (`> [!NOTE] Custom Title`), and [containers you registered yourself](https://vitepress.dev/guide/markdown#registering-new-containers) work here too.

```md
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

By default, alert colors match GitHub's, with caution and danger both rendering in red. Enable [`themeConfig.gradedContainers`](../reference/default-theme-config#gradedcontainers) to use a graded severity scale: danger (red), warning (orange), and caution (yellow). Note that `[!DANGER]` is a VitePress extension and will render as a regular blockquote on GitHub.

{% raw %}
## Syntax Highlighting in Code Blocks

VitePress uses [Shiki](https://github.com/shikijs/shiki) to highlight language syntax in Markdown code blocks, using coloured text. Shiki supports a wide variety of programming languages. All you need to do is append a valid language alias to the beginning backticks for the code block:

**Input**

````
```js
export default {
  name: 'MyComponent',
  // ...
}
```
````

````
```html
<ul>
  <li v-for="todo in todos" :key="todo.id">
    {{ todo.text }}
  </li>
</ul>
```
````

**Output**

```js
export default {
  name: 'MyComponent'
  // ...
}
```

```html
<ul>
  <li v-for="todo in todos" :key="todo.id">
    {{ todo.text }}
  </li>
</ul>
```

A [list of valid languages](https://shiki.style/languages) is available on Shiki's repository.

You may also customize syntax highlight theme, configure language aliases, and set custom language labels in app config. Please see [`markdown` options](../reference/site-config#markdown) for more details.
{% endraw %}

## Line Highlighting in Code Blocks

**Input**

````
```js{4}
export default {
  data () {
    return {
      msg: 'Highlighted!'
    }
  }
}
```
````

**Output**

```js,hl_lines=4
export default {
  data () {
    return {
      msg: 'Highlighted!'
    }
  }
}
```

In addition to a single line, you can also specify multiple single lines, ranges, or both:

- Line ranges: for example `{5-8}`, `{3-10}`, `{10-17}`
- Multiple single lines: for example `{4,7,9}`
- Line ranges and single lines: for example `{4,7-13,16,23-27,40}`

**Input**

````
```js{1,4,6-8}
export default { // Highlighted
  data () {
    return {
      msg: `Highlighted!
      This line isn't highlighted,
      but this and the next 2 are.`,
      motd: 'VitePress is awesome',
      lorem: 'ipsum'
    }
  }
}
```
````

**Output**

```js,hl_lines=1 4 6-8
export default { // Highlighted
  data () {
    return {
      msg: `Highlighted!
      This line isn't highlighted,
      but this and the next 2 are.`,
      motd: 'VitePress is awesome',
      lorem: 'ipsum',
    }
  }
}
```

## Line Numbers

You can enable line numbers for each code blocks via config:

```js
export default {
  markdown: {
    lineNumbers: true
  }
}
```

Please see [`markdown` options](../reference/site-config#markdown) for more details.

You can add `:line-numbers` / `:no-line-numbers` mark in your fenced code blocks to override the value set in config.

You can also customize the starting line number by adding `=` after `:line-numbers`. For example, `:line-numbers=2` means the line numbers in code blocks will start from `2`.

**Input**

````md
```ts {1}
// line-numbers is disabled by default
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```

```ts:line-numbers {1}
// line-numbers is enabled
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```

```ts:line-numbers=2 {1}
// line-numbers is enabled and start from 2
const line3 = 'This is line 3'
const line4 = 'This is line 4'
```
````

**Output**

```ts,hl_lines=1
// line-numbers is disabled by default
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```

```ts,linenos,hl_lines=1
// line-numbers is enabled
const line2 = 'This is line 2'
const line3 = 'This is line 3'
```

```ts,linenos,linenostart=2,hl_lines=1
// line-numbers is enabled and start from 2
const line3 = 'This is line 3'
const line4 = 'This is line 4'
```
