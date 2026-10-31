import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CATALOG_LIMITS,
  sensitiveValueRules,
  utf8Bytes,
  validateBaseCatalog,
  validateCatalogRecords,
} from './catalogValidation.js';

function record(overrides = {}) {
  return {
    id: 'api/orders',
    title: 'Orders API',
    summary: 'Search and retrieve orders.',
    route: '/apis/orders',
    apiFamily: 'orders',
    language: 'none',
    contentType: 'api',
    labels: ['Orders'],
    ...overrides,
  };
}

test('accepts bounded records and the configured base catalog limits', () => {
  const apiRecords = [record()];
  const resolvedRecords = [record({id: 'doc/start', route: '/docs/start', contentType: 'doc'})];
  const resourceRecords = [record({id: 'resource/models', route: '/resources#models', contentType: 'resource'})];
  const result = validateBaseCatalog({apiRecords, resolvedRecords, resourceRecords});
  assert.equal(result.length, 3);
  assert.ok(utf8Bytes(JSON.stringify(result)) < CATALOG_LIMITS.baseBytes);
});

test('rejects field, label, record-count, duplicate, route, and aggregate violations', () => {
  assert.throws(
    () => validateCatalogRecords([record({title: 'x'.repeat(161)})], {maxRecords: 1, maxBytes: 10000}),
    /title/,
  );
  assert.throws(
    () => validateCatalogRecords([record({labels: ['a', 'b', 'c', 'd', 'e', 'f']})], {maxRecords: 1, maxBytes: 10000}),
    /labels/,
  );
  assert.throws(
    () => validateCatalogRecords([record(), record({id: 'api/other'})], {maxRecords: 1, maxBytes: 10000}),
    /record-count/,
  );
  assert.throws(
    () => validateCatalogRecords([record(), record()], {maxRecords: 2, maxBytes: 10000}),
    /id/,
  );
  assert.throws(
    () => validateCatalogRecords([record({route: 'https://example.com'})], {maxRecords: 1, maxBytes: 10000}),
    /route/,
  );
  assert.throws(
    () => validateCatalogRecords([record()], {maxRecords: 1, maxBytes: 10}),
    /aggregate-size/,
  );
});

test('rejects sensitive values without exposing the matched value', () => {
  const secret = 'person@example.com';
  assert.deepEqual(sensitiveValueRules(secret), ['email']);
  assert.throws(
    () => validateCatalogRecords([record({summary: secret})], {maxRecords: 1, maxBytes: 10000}),
    (error) => error.message.includes('email') && !error.message.includes(secret),
  );
});
