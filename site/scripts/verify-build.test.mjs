import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {MAX_BLOG_ROUTE_BYTES, sensitiveRules, verifyBuild} from './verify-build.mjs';

async function fixture(t, {ordersBytes = 16, sharedBytes = 16, ordersContent} = {}) {
  const siteDir = await mkdtemp(path.join(os.tmpdir(), 'hub-build-'));
  t.after(() => rm(siteDir, {recursive: true, force: true}));
  const buildDir = path.join(siteDir, 'build');
  const generatedDir = path.join(siteDir, '.docusaurus');
  const assetsDir = path.join(buildDir, 'assets', 'js');
  await mkdir(assetsDir, {recursive: true});
  await mkdir(generatedDir, {recursive: true});

  await writeFile(path.join(generatedDir, 'routes.js'), `
import ComponentCreator from '@docusaurus/ComponentCreator';
export default [
  {path: '/blog/orders', component: ComponentCreator('/blog/orders', 'aaa'), exact: true},
  {path: '/blog/reports', component: ComponentCreator('/blog/reports', 'bbb'), exact: true},
];
`);
  await writeFile(path.join(generatedDir, 'routesChunkNames.json'), JSON.stringify({
    '/blog/orders-aaa': {__comp: '11111111', content: '22222222'},
    '/blog/reports-bbb': {__comp: '11111111', content: '33333333'},
  }));
  await writeFile(path.join(assetsDir, '11111111.shared.js'), 's'.repeat(sharedBytes));
  await writeFile(path.join(assetsDir, '22222222.orders.js'), ordersContent ?? 'o'.repeat(ordersBytes));
  await writeFile(path.join(assetsDir, '33333333.reports.js'), 'r'.repeat(16));
  return {siteDir, buildDir, generatedDir, repositoryRoot: path.dirname(siteDir)};
}

test('charges route-specific assets but excludes shared chunks', async (t) => {
  const options = await fixture(t, {
    ordersBytes: MAX_BLOG_ROUTE_BYTES,
    sharedBytes: MAX_BLOG_ROUTE_BYTES + 1,
  });
  const result = await verifyBuild(options);
  assert.equal(result.blogRoutes, 2);
});

test('rejects a blog route one byte over the payload limit', async (t) => {
  const options = await fixture(t, {ordersBytes: MAX_BLOG_ROUTE_BYTES + 1});
  await assert.rejects(
    verifyBuild(options),
    new RegExp(`Blog route payload exceeds ${MAX_BLOG_ROUTE_BYTES} bytes: /blog/orders: ${MAX_BLOG_ROUTE_BYTES + 1} bytes`),
  );
});

test('rejects sensitive generated assets with fixed non-sensitive diagnostics', async (t) => {
  const token = 'Atza|this-value-must-never-be-logged';
  const options = await fixture(t, {ordersContent: `const example = "${token}";`});
  await assert.rejects(verifyBuild(options), (error) => {
    assert.match(error.message, /assets\/js\/22222222\.orders\.js: lwa-token/);
    assert.doesNotMatch(error.message, /this-value-must-never-be-logged/);
    return true;
  });
});

test('detects every sensitive-value class and accepts bounded placeholders', () => {
  assert.deepEqual(sensitiveRules('accessToken = "${ACCESS_TOKEN}"; clientId: "EXAMPLE";'), []);
  assert.deepEqual(
    sensitiveRules([
      'Atzr|secret',
      '123-1234567-1234567',
      'A1234567890',
      'person@example.com',
      '-----BEGIN PRIVATE KEY-----',
      'clientSecret = "not-a-placeholder"',
    ].join('\n')),
    ['amazon-account-id', 'amazon-order-id', 'email', 'lwa-token', 'private-key', 'sensitive-assignment'],
  );
});
