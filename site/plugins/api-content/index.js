import path from 'node:path';
import config from '../../api-content.config.js';
import RESOURCES from '../../src/data/resources.js';
import {buildApiContent, buildSearchCatalog} from './buildApiData.js';
import {serializeAnalyticsCatalog, validateAnalyticsCatalog} from './catalogValidation.js';

export const NAVIGATION_IDS = Object.freeze([
  'api-breadcrumb',
  'api-card',
  'api-local-license',
  'api-related-topic',
  'api-section',
  'community-breadcrumb',
  'community-item',
  'home-card',
  'home-community-item',
  'home-community-list',
  'home-primary',
  'search-community',
  'search-result',
  'search-shortcut',
].sort());

const commonContext = ({
  route,
  pageId = route,
  contentId,
  contentType,
  apiFamily = 'cross-cutting',
  language = 'none',
  sellingPartnerScope = 'unknown',
}) => ({
  route,
  pageId,
  content_id: contentId,
  content_type: contentType,
  api_family: apiFamily,
  language,
  selling_partner_scope: sellingPartnerScope,
  developer_type: 'unknown',
});

function routeOnly(value) {
  const route = value.split(/[?#]/, 1)[0].replace(/\/{2,}/g, '/');
  return route.length > 1 ? route.replace(/\/$/, '') : route;
}

function resolvedContexts(allContent) {
  const contexts = [];
  const docs = allContent?.['docusaurus-plugin-content-docs']?.default?.loadedVersions
    ?.flatMap((version) => version.docs || []) || [];
  for (const doc of docs) {
    const metadata = doc.metadata || doc;
    const frontMatter = metadata.frontMatter || {};
    contexts.push(commonContext({
      route: routeOnly(metadata.permalink),
      contentId: `doc/${metadata.id}`,
      contentType: 'doc',
      apiFamily: frontMatter.api_family || 'cross-cutting',
      sellingPartnerScope: frontMatter.selling_partner_scope || 'unknown',
    }));
  }
  const posts = allContent?.['docusaurus-plugin-content-blog']?.default?.blogPosts || [];
  for (const post of posts) {
    const metadata = post.metadata || post;
    const frontMatter = metadata.frontMatter || {};
    contexts.push(commonContext({
      route: routeOnly(metadata.permalink),
      contentId: frontMatter.content_id || `blog/${metadata.id}`,
      contentType: frontMatter.content_type || 'hot_topic',
      apiFamily: frontMatter.api_family || 'cross-cutting',
      sellingPartnerScope: frontMatter.selling_partner_scope || 'unknown',
    }));
  }
  return contexts;
}

export function buildAnalyticsCatalog({apis, licenses, resources, allContent}) {
  const contexts = [
    commonContext({route: '/', pageId: '/home', contentId: 'home', contentType: 'unknown'}),
    commonContext({route: '/apis', contentId: 'api/index', contentType: 'api'}),
    commonContext({route: '/blog', contentId: 'hot-topic/index', contentType: 'hot_topic'}),
    commonContext({route: '/community/ideas', contentId: 'idea/index', contentType: 'idea'}),
    commonContext({
      route: '/community/ideas/:id',
      contentId: 'idea/community',
      contentType: 'idea',
    }),
    commonContext({route: '/community/questions', contentId: 'question/index', contentType: 'question'}),
    commonContext({
      route: '/community/questions/:id',
      contentId: 'question/community',
      contentType: 'question',
    }),
    commonContext({route: '/resources', contentId: 'resource/index', contentType: 'resource'}),
    commonContext({route: '/search', contentId: 'search/index', contentType: 'search'}),
    ...apis.map((api) => commonContext({
      route: `/apis/${api.slug}`,
      contentId: `api/${api.slug}`,
      contentType: 'api',
      apiFamily: api.apiFamily,
      sellingPartnerScope: api.sellingPartnerScope,
    })),
    ...licenses.map((license) => commonContext({
      route: license.route,
      contentId: `doc/${license.id}`,
      contentType: 'doc',
    })),
    ...resolvedContexts(allContent),
  ];
  const uniqueContexts = [...new Map(contexts.map((context) => [context.route, context])).values()]
    .sort((left, right) => left.route < right.route ? -1 : left.route > right.route ? 1 : 0);
  const codeIds = apis.flatMap((api) => [
    api.model.codeId,
    ...api.recipeGroups.flatMap((group) => group.entries.map((entry) => entry.codeId)),
  ]).sort();
  const resourceIds = resources.flatMap((group) => group.items.map((item) => `resource/${item.id}`)).sort();
  return validateAnalyticsCatalog({
    version: 1,
    contexts: uniqueContexts,
    codeIds,
    navigationIds: [...NAVIGATION_IDS],
    resourceIds,
  });
}

export default function apiContentPlugin(context) {
  const contentRoot = path.resolve(context.siteDir, '..', 'content');
  let loadedContent;
  let analyticsCatalog;

  return {
    name: 'api-content',

    async loadContent() {
      loadedContent = await buildApiContent(config, contentRoot);
      return loadedContent;
    },

    async contentLoaded({content, actions}) {
      const {addRoute, createData} = actions;
      const cards = content.apis.map((api) => ({
        slug: api.slug,
        title: api.title,
        version: api.version,
        status: api.status,
        apiFamily: api.apiFamily,
        sellingPartnerScope: api.sellingPartnerScope,
        summary: api.summary,
        operationCount: api.model.projection.operations.length,
        recipeCount: api.recipeGroups.flatMap((group) => group.entries).length,
        sampleCount: api.samples.length,
      }));
      const indexData = await createData('api-index.json', JSON.stringify({apis: cards}));
      addRoute({
        path: '/apis',
        component: '@site/src/components/ApiExperience/ApiIndexPage',
        modules: {data: indexData},
        exact: true,
      });

      for (const api of content.apis) {
        const apiData = await createData(`api-${api.slug}.json`, JSON.stringify(api));
        addRoute({
          path: `/apis/${api.slug}`,
          component: '@site/src/components/ApiExperience/ApiPage',
          modules: {data: apiData},
          exact: true,
        });
      }

      for (const license of content.licenses) {
        const licenseData = await createData(`license-${license.id}.json`, JSON.stringify(license));
        addRoute({
          path: license.route,
          component: '@site/src/components/ApiExperience/LicensePage',
          modules: {data: licenseData},
          exact: true,
        });
      }
    },

    async allContentLoaded({allContent, actions}) {
      const records = buildSearchCatalog({
        apis: loadedContent.apis,
        resources: RESOURCES,
        allContent,
      });
      analyticsCatalog = buildAnalyticsCatalog({
        apis: loadedContent.apis,
        licenses: loadedContent.licenses,
        resources: RESOURCES,
        allContent,
      });
      actions.setGlobalData({records});
    },

    injectHtmlTags() {
      if (!analyticsCatalog) throw new Error('Analytics catalog was not generated');
      return {
        headTags: [{
          tagName: 'script',
          attributes: {type: 'application/json', id: 'hub-analytics-catalog'},
          innerHTML: serializeAnalyticsCatalog(analyticsCatalog),
        }],
      };
    },
  };
}
