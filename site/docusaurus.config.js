// @ts-check
// This runs in Node.js - don't use client-side code here (browser APIs, JSX...)
import {themes as prismThemes} from 'prism-react-renderer';
import hub from './hub.config.js';

const repoUrl = `https://github.com/${hub.github.owner}/${hub.github.name}`;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'SP-API Developer Hub',
  tagline: 'Docs, announcements, and the developer community for the Amazon Selling Partner API',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // TODO: replace with the real hostname once the custom domain is decided.
  url: 'https://example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Values the browser bundle needs. Nothing secret goes here.
  customFields: {
    repoUrl,
    github: hub.github,
    giscus: hub.giscus,
    rum: hub.rum,
  },

  clientModules: ['./src/clientModules/analytics.js'],

  plugins: ['./plugins/community'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          path: 'blog',
          routeBasePath: 'blog',
          blogTitle: 'Hot topics',
          blogDescription: 'Launches, deprecations, and migration notes for SP-API developers',
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'SP-API Developer Hub',
        logo: {
          alt: 'SP-API Developer Hub',
          src: 'img/logo.svg',
        },
        items: [
          {type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs'},
          {to: '/blog', label: 'Hot topics', position: 'left'},
          {to: '/community/questions', label: 'Questions', position: 'left'},
          {to: '/community/ideas', label: 'Ideas', position: 'left'},
          {to: '/resources', label: 'Resources', position: 'left'},
          {href: repoUrl, label: 'GitHub', position: 'right'},
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Learn',
            items: [
              {label: 'Start here', to: '/docs/intro'},
              {label: 'Hot topics', to: '/blog'},
              {label: 'Resources', to: '/resources'},
            ],
          },
          {
            title: 'Community',
            items: [
              {label: 'Questions', to: '/community/questions'},
              {label: 'Ideas', to: '/community/ideas'},
            ],
          },
          {
            title: 'Source',
            items: [
              {label: 'API models', href: 'https://github.com/amzn/selling-partner-api-models'},
              {label: 'Code samples', href: 'https://github.com/amzn/selling-partner-api-samples'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Amazon.com, Inc. or its affiliates.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
