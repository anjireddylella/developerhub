import assert from 'node:assert/strict';
import test from 'node:test';
import {buildAnalyticsCatalog, NAVIGATION_IDS} from './index.js';
import {serializeAnalyticsCatalog} from './catalogValidation.js';

const api = {
  slug: 'orders',
  apiFamily: 'orders',
  sellingPartnerScope: 'unknown',
  model: {codeId: 'model/orders'},
  recipeGroups: [{entries: [{codeId: 'recipe/orders/get-order/java'}]}],
};
const license = {id: 'models-license', route: '/licenses/models/license'};
const resources = [{items: [{id: 'api-models'}]}];
const allContent = {
  'docusaurus-plugin-content-docs': {
    default: {loadedVersions: [{docs: [{metadata: {id: 'intro', title: 'Intro', permalink: '/docs/intro'}}]}]},
  },
  'docusaurus-plugin-content-blog': {
    default: {blogPosts: [{metadata: {
      id: 'topic',
      title: 'Topic',
      permalink: '/blog/topic',
      frontMatter: {
        content_id: 'topic/orders',
        content_type: 'hot_topic',
        api_family: 'orders',
        selling_partner_scope: 'both',
      },
    }}]},
  },
};

test('builds one bounded analytics catalog from validated route metadata', () => {
  const catalog = buildAnalyticsCatalog({apis: [api], licenses: [license], resources, allContent});
  assert.equal(catalog.version, 1);
  assert.ok(catalog.contexts.some((context) => context.route === '/apis/orders' && context.content_id === 'api/orders'));
  assert.ok(catalog.contexts.some((context) => context.route === '/blog/topic' && context.selling_partner_scope === 'both'));
  assert.deepEqual(catalog.codeIds, ['model/orders', 'recipe/orders/get-order/java']);
  assert.deepEqual(catalog.navigationIds, NAVIGATION_IDS);
  assert.deepEqual(catalog.resourceIds, ['resource/api-models']);
  assert.deepEqual([...catalog.contexts].sort((a, b) => a.route < b.route ? -1 : 1), catalog.contexts);
});

test('escapes catalog text for a non-executable head script', () => {
  const catalog = buildAnalyticsCatalog({apis: [api], licenses: [license], resources, allContent});
  const serialized = serializeAnalyticsCatalog(catalog);
  assert.equal(serialized.includes('<'), false);
  assert.equal(serialized.includes('>'), false);
  assert.equal(serialized.includes('&'), false);
  assert.equal(/<\/script/i.test(serialized), false);
  assert.deepEqual(JSON.parse(serialized), catalog);
});
