import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, symlink, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import config from '../../api-content.config.js';
import {
  API_ROUTE_LIMIT,
  MODEL_PROJECTION_LIMIT,
  RECIPE_LIMIT,
  buildApiContent,
  buildResolvedContentRecords,
  extractRecipeRange,
  projectModel,
  readDigestVerified,
  resolveContainedFile,
  truncateUtf8,
  validateManifest,
} from './buildApiData.js';
import {sensitiveValueRules, utf8Bytes} from './catalogValidation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(here, '../../../content');

function cloneConfig() {
  return structuredClone(config);
}

function collectKeys(value, keys = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, keys));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      keys.add(key);
      collectKeys(item, keys);
    }
  }
  return keys;
}

test('builds bounded API payloads from every real snapshot', async () => {
  const result = await buildApiContent(config, contentRoot);
  assert.equal(result.apis.length, 4);
  const expectedOperations = new Map([
    ['data-kiosk', 5],
    ['orders', 2],
    ['vehicles', 1],
    ['easy-ship', 5],
  ]);
  const projectionCeilings = new Map([
    ['data-kiosk', 11820],
    ['orders', 6010],
    ['vehicles', 2237],
    ['easy-ship', 12358],
  ]);
  for (const api of result.apis) {
    assert.equal(api.model.projection.operations.length, expectedOperations.get(api.slug));
    const projectionBytes = utf8Bytes(JSON.stringify(api.model.projection, null, 2));
    assert.ok(projectionBytes <= projectionCeilings.get(api.slug));
    assert.ok(projectionBytes <= MODEL_PROJECTION_LIMIT);
    assert.ok(utf8Bytes(JSON.stringify(api)) <= API_ROUTE_LIMIT);
    assert.equal(api.sellingPartnerScope, 'unknown');
    assert.match(api.model.sourceUrl, new RegExp(`/blob/${api.model.commit}/`));
  }

  const orders = result.apis.find((api) => api.slug === 'orders');
  const forbidden = ['schema', 'schemas', 'example', 'examples', 'definitions', 'security', 'headers', 'body'];
  const keys = collectKeys(orders.model.projection);
  forbidden.forEach((key) => assert.equal(keys.has(key), false));
  assert.equal([...keys].some((key) => key.startsWith('x-')), false);
  assert.equal(orders.recipeGroups[0].legacy, true);
  assert.match(orders.recipeGroups[0].description, /not compatible code/);
  assert.equal(orders.samples.length, 0);
  assert.match(orders.samplesEmpty, /legacy code recipe, not a deployable sample solution/);

  const vehicles = result.apis.find((api) => api.slug === 'vehicles');
  assert.equal(vehicles.recipeGroups.length, 0);
  assert.equal(vehicles.samples.length, 0);
  assert.match(vehicles.recipesEmpty, /No recipe/);
  assert.match(vehicles.samplesEmpty, /No sample solution/);
});

test('extracts all seven exact digest-verified recipe ranges', async () => {
  const result = await buildApiContent(config, contentRoot);
  const excerpts = result.apis.flatMap((api) => api.recipeGroups.flatMap((group) => group.entries));
  assert.equal(excerpts.length, 7);
  const expectedBytes = [630, 458, 487, 362, 199, 727, 534];
  assert.deepEqual(excerpts.map((entry) => utf8Bytes(entry.excerpt)), expectedBytes);
  for (const entry of excerpts) {
    assert.ok(utf8Bytes(entry.excerpt) <= RECIPE_LIMIT);
    assert.deepEqual(sensitiveValueRules(entry.excerpt), []);
    assert.ok(entry.excerpt.startsWith(entry.start));
    assert.equal(entry.excerpt.includes(entry.end), false);
  }
});

test('projects primitive parameters and truncates Unicode within byte limits', () => {
  const model = {
    swagger: '2.0',
    info: {title: 'Test', version: '1'},
    host: 'example.com',
    schemes: ['https'],
    paths: {
      '/items': {
        get: {
          operationId: 'listItems',
          description: '🙂'.repeat(400),
          parameters: [
            {name: 'limit', in: 'query', required: true, type: 'integer'},
            {name: 'body', in: 'body', schema: {$ref: '#/definitions/Input'}},
          ],
          responses: {'200': {description: '🙂'.repeat(200)}},
          'x-private': 'discarded',
        },
      },
    },
    definitions: {Input: {type: 'object'}},
  };
  const projection = projectModel(model, ['listItems'], 'test');
  assert.equal(projection.operations[0].parameters[0].type, 'integer');
  assert.equal(projection.operations[0].parameters[1].type, 'object');
  assert.equal(projection.operations[0].descriptionTruncated, true);
  assert.equal(projection.operations[0].responses[0].descriptionTruncated, true);
  assert.ok(utf8Bytes(projection.operations[0].description) <= 600);
  assert.doesNotThrow(() => JSON.stringify(projection));
  assert.throws(() => truncateUtf8('\ud800', 10, 'test'), /invalid-unicode/);
});

test('rejects missing operations, marker errors, and sensitive model strings', () => {
  const model = {
    swagger: '2.0',
    info: {title: 'Test', version: '1'},
    host: 'example.com',
    schemes: ['https'],
    paths: {},
  };
  assert.throws(() => projectModel(model, ['missing'], 'test'), /missing-operation/);
  assert.throws(
    () => projectModel({...model, paths: {'/x': {get: {operationId: 'x', description: 'Order 123-1234567-1234567'}}}}, ['x'], 'test'),
    /amazon-order-id/,
  );
  const recipe = {id: 'recipe/test', start: 'START', end: 'END'};
  assert.throws(() => extractRecipeRange('none', recipe), /start-marker/);
  assert.throws(() => extractRecipeRange('START START END', recipe), /start-marker/);
  assert.throws(() => extractRecipeRange('END START', recipe), /marker-order/);
});

test('sensitive scanner rejects every value rule and accepts near misses or placeholders', () => {
  const fixtures = [
    ['Atzr|real-value', 'lwa-token', 'Atzr placeholder'],
    ['123-1234567-1234567', 'amazon-order-id', '123-123456-1234567'],
    ['A1234567890', 'amazon-account-id', 'account-A123'],
    ['person@example.com', 'email', 'person at example dot com'],
    ['-----BEGIN PRIVATE KEY-----', 'private-key', 'BEGIN PRIVATE KEY'],
    ['clientSecret = "real-secret"', 'sensitive-assignment', 'clientSecret = "<CLIENT_SECRET>"'],
  ];
  for (const [bad, rule, good] of fixtures) {
    assert.ok(sensitiveValueRules(bad).includes(rule));
    assert.deepEqual(sensitiveValueRules(good), []);
  }
});

test('rejects digest mismatches, traversal, and symlinks outside content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'api-content-'));
  const content = path.join(root, 'content');
  const outside = path.join(root, 'outside.json');
  await mkdir(content);
  await writeFile(path.join(content, 'inside.json'), '{}');
  await writeFile(outside, '{}');
  await symlink(outside, path.join(content, 'link.json'));
  try {
    await assert.rejects(() => resolveContainedFile(content, '../outside.json'), /path-containment/);
    await assert.rejects(() => resolveContainedFile(content, 'link.json'), /path-containment/);
    await assert.rejects(
      () => readDigestVerified(content, {localPath: 'inside.json', digest: '0'.repeat(64)}),
      /digest-mismatch/,
    );
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('validates unknown API scope, coverage gaps, and exact URL hosts', () => {
  assert.doesNotThrow(() => validateManifest(config));
  const wrongScope = cloneConfig();
  wrongScope.apis[0].sellingPartnerScope = 'seller';
  assert.throws(() => validateManifest(wrongScope), /snapshot-metadata/);
  const missingGap = cloneConfig();
  missingGap.apis[2].recipesEmpty = null;
  assert.throws(() => validateManifest(missingGap), /recipe-coverage/);
  const wrongDocsHost = cloneConfig();
  wrongDocsHost.apis[0].guideUrl = 'https://developer-docs.amazon.com/sp-api/docs/example';
  assert.throws(() => validateManifest(wrongDocsHost), /guide: url/);
  const unpinned = cloneConfig();
  unpinned.apis[0].model.sourceUrl = unpinned.apis[0].model.sourceUrl.replace(`/blob/${unpinned.apis[0].model.commit}/`, '/blob/main/');
  assert.throws(() => validateManifest(unpinned), /pinned-url/);
});

test('uses Docusaurus-resolved doc and blog permalinks', () => {
  const records = buildResolvedContentRecords({
    'docusaurus-plugin-content-docs': {
      default: {
        loadedVersions: [{docs: [{metadata: {id: 'nested/file', title: 'Explicit route', description: 'A route fixture.', permalink: '/docs/not-the-file-path', frontMatter: {slug: '/not-the-file-path'}}}]}],
      },
    },
    'docusaurus-plugin-content-blog': {
      default: {
        blogPosts: [{metadata: {id: 'post', title: 'Post', description: 'Post summary.', permalink: '/blog/resolved', frontMatter: {content_id: 'topic/resolved', content_type: 'hot_topic', api_family: 'orders'}, tags: []}}],
      },
    },
  });
  assert.equal(records[0].route, '/docs/not-the-file-path');
  assert.equal(records[1].route, '/blog/resolved');
});
