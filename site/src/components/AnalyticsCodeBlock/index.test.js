import assert from 'node:assert/strict';
import test from 'node:test';
import {copyCodeAndReport} from './copyBehavior.js';
import {validateCodeAnalytics} from './context.js';

function catalog(ids = []) {
  return {hasCodeId: (id) => ids.includes(id)};
}

test('validates code analytics without retaining code or metadata', () => {
  assert.deepEqual(
    validateCodeAnalytics('recipe/orders/get-order/java', 'java', catalog(['recipe/orders/get-order/java'])),
    {codeId: 'recipe/orders/get-order/java', language: 'java'},
  );
  assert.equal(validateCodeAnalytics('missing', 'java', catalog([])), null);
  assert.equal(validateCodeAnalytics('recipe/orders/get-order/java', 'ruby', catalog(['recipe/orders/get-order/java'])), null);
});

test('reports only identifier context after clipboard success', async () => {
  const code = 'const token = "never-report-this";';
  const copied = [];
  const reported = [];
  await copyCodeAndReport({
    code,
    copy: async (value) => copied.push(value),
    analyticsContext: {codeId: 'model/orders', language: 'json'},
    report: (value) => reported.push(value),
  });
  assert.deepEqual(copied, [code]);
  assert.deepEqual(reported, [{codeId: 'model/orders', language: 'json'}]);
  assert.equal(JSON.stringify(reported).includes(code), false);
});

test('does not report uninstrumented or failed clipboard actions', async () => {
  const reported = [];
  await copyCodeAndReport({
    code: 'safe copy',
    copy: async () => true,
    analyticsContext: null,
    report: (value) => reported.push(value),
  });
  await assert.rejects(() => copyCodeAndReport({
    code: 'failed copy',
    copy: async () => { throw new Error('clipboard denied'); },
    analyticsContext: {codeId: 'model/orders', language: 'json'},
    report: (value) => reported.push(value),
  }));
  assert.deepEqual(reported, []);
});
