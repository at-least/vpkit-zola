// test/parity-site as a VitePress site: the same title, logo, nav, social
// links, sidebar and pages. scripts/build-vitepress-site.mjs builds it into
// test/vitepress-build, the reference the tests run next to the theme.
export default {
  title: 'VitePress',
  lastUpdated: true,
  themeConfig: {
    editLink: { pattern: 'https://github.com/vuejs/vitepress/edit/main/docs/en/:path', text: 'Edit this page on GitHub' },
    footer: { message: 'Released under the MIT License.', copyright: 'Copyright © 2019-present Evan You' },
    logo: { src: '/vitepress-logo-mini.svg', width: 24, height: 24 },
    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Reference', link: '/reference/site-config', activeMatch: '/reference/' },
      { text: 'Plugins', link: '/plugins' },
      { text: 'Showcase', link: '/showcase' },
      {
        text: 'Ecosystem',
        items: [
          {
            text: 'Resources',
            items: [
              { text: 'Team', link: '/team' },
              { text: 'Blog', link: 'https://blog.vuejs.org/' },
            ],
          },
          {
            text: 'Help',
            items: [
              { text: 'Discord', link: 'https://chat.vuejs.org/' },
              { text: 'GitHub Discussions', link: 'https://github.com/vuejs/vitepress/discussions' },
            ],
          },
        ],
      },
      { text: 'Sponsor', link: 'https://github.com/sponsors/yyx990803' },
      {
        text: '2.0.0-alpha.20',
        items: [
          { text: '1.6.4', link: 'https://vuejs.github.io/vitepress/v1/' },
          { text: 'Changelog', link: 'https://github.com/vuejs/vitepress/blob/main/CHANGELOG.md' },
          { text: 'Contributing', link: 'https://github.com/vuejs/vitepress/blob/main/.github/contributing.md' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' },
      { icon: 'discord', link: 'https://chat.vuejs.org/' },
      { icon: 'x', link: 'https://x.com/vuejs' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        collapsed: false,
        items: [
          { text: 'What is VitePress?', link: '/guide/what-is-vitepress' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Routing', link: '/guide/routing' },
          { text: 'Deploy', link: '/guide/deploy' },
        ],
      },
      {
        text: 'Writing',
        collapsed: false,
        items: [
          { text: 'Markdown Extensions', link: '/guide/markdown' },
          { text: 'Asset Handling', link: '/guide/asset-handling' },
          { text: 'Frontmatter', link: '/guide/frontmatter' },
          { text: 'Using Vue in Markdown', link: '/guide/using-vue' },
          { text: 'Internationalization', link: '/guide/i18n' },
        ],
      },
      {
        text: 'Customization',
        collapsed: false,
        items: [
          { text: 'Using a Custom Theme', link: '/guide/custom-theme' },
          { text: 'Extending the Default Theme', link: '/guide/extending-default-theme' },
          { text: 'Build-Time Data Loading', link: '/guide/data-loading' },
          { text: 'SSR Compatibility', link: '/guide/ssr-compat' },
          { text: 'Connecting to a CMS', link: '/guide/cms' },
        ],
      },
      {
        text: 'Experimental',
        collapsed: false,
        items: [
          { text: 'MPA Mode', link: '/guide/mpa-mode' },
          { text: 'Sitemap Generation', link: '/guide/sitemap-generation' },
        ],
      },
      {
        items: [{ text: 'Config & API Reference', link: '/reference/site-config' }],
      },
    ],
  },
};
