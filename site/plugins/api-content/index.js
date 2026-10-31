import path from 'node:path';
import config from '../../api-content.config.js';
import RESOURCES from '../../src/data/resources.js';
import {buildApiContent, buildSearchCatalog} from './buildApiData.js';

export default function apiContentPlugin(context) {
  const contentRoot = path.resolve(context.siteDir, '..', 'content');
  let loadedContent;

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
      actions.setGlobalData({records});
    },
  };
}
