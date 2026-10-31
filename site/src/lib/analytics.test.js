import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';
import {
  EVENTS,
  queuedAnalyticsForTests,
  recordPageView,
  resetAnalyticsForTests,
  setRumClient,
  track,
  trackInternalNavigation,
} from './analytics.js';
import {resetAnalyticsCatalogForTests} from './contentContext.js';

const common = {
  api_family: 'orders',
  content_id: 'api/a',
  content_type: 'api',
  developer_type: 'unknown',
  language: 'none',
  selling_partner_scope: 'unknown',
};

function context(route, contentId, pageId = route) {
  return {...common, route, pageId, content_id: contentId};
}

function catalog() {
  return {
    version: 1,
    contexts: [
      context('/a', 'api/a'),
      context('/b', 'api/b'),
      context('/community/ideas/:id', 'idea/community', '/community/ideas/:id'),
      context('/community/questions/:id', 'question/community', '/community/questions/:id'),
    ],
    codeIds: ['model/orders'],
    navigationIds: ['test-navigation'],
    resourceIds: ['resource/api-models'],
  };
}

function installCatalog(value = catalog()) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {url: 'https://hub.example/a'});
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  if (value) {
    const element = document.createElement('script');
    element.id = 'hub-analytics-catalog';
    element.type = 'application/json';
    element.textContent = JSON.stringify(value);
    document.head.append(element);
  }
  resetAnalyticsCatalogForTests();
  resetAnalyticsForTests();
  process.env.NODE_ENV = 'test';
}

function clientLog({throwEvents = false} = {}) {
  const calls = [];
  return {
    calls,
    client: {
      recordPageView: (payload) => calls.push(['page', payload]),
      recordEvent: (name, payload) => {
        if (throwEvents) throw new Error('secret exception text');
        calls.push(['event', name, payload]);
      },
    },
  };
}

test('attaches exact fixed schemas and common dimensions', () => {
  installCatalog();
  const log = clientLog();
  setRumClient(log.client);
  assert.equal(recordPageView('/a?token=secret#fragment'), true);
  assert.equal(track(EVENTS.contentCopy, {codeId: 'model/orders', language: 'json'}, '/a'), true);
  assert.equal(track(EVENTS.helpfulVote, {helpful: true}, '/a'), true);
  assert.equal(track(EVENTS.outboundClick, {destinationType: 'models_source', resourceId: 'resource/api-models'}, '/a'), true);
  assert.equal(track(EVENTS.communityAction, {action: 'ask_question', section: 'questions'}, '/a'), true);
  assert.equal(trackInternalNavigation('test-navigation', '/b?ignored=yes', '/a'), true);

  const page = log.calls[0][1];
  assert.deepEqual(Object.keys(page).sort(), ['pageAttributes', 'pageId']);
  assert.equal(page.pageId, '/a');
  assert.deepEqual(Object.keys(page.pageAttributes).sort(), Object.keys(common).sort());
  for (const call of log.calls.slice(1)) {
    assert.equal(JSON.stringify(call).includes('secret'), false);
    assert.equal(JSON.stringify(call).includes('https://'), false);
  }
  assert.deepEqual(Object.keys(log.calls[1][2]).sort(), [...Object.keys(common), 'code_id'].sort());
  assert.deepEqual(Object.keys(log.calls[2][2]).sort(), [...Object.keys(common), 'helpful'].sort());
  assert.deepEqual(Object.keys(log.calls[3][2]).sort(), [...Object.keys(common), 'destination_type', 'resource_id'].sort());
  assert.deepEqual(Object.keys(log.calls[4][2]).sort(), [...Object.keys(common), 'action', 'section'].sort());
  assert.deepEqual(Object.keys(log.calls[5][2]).sort(), [...Object.keys(common), 'navigation_id', 'target_content_id'].sort());
});

test('loads after an early page view without reinterpreting queued context', () => {
  installCatalog(null);
  recordPageView('/a');
  const element = document.createElement('script');
  element.id = 'hub-analytics-catalog';
  element.textContent = JSON.stringify(catalog());
  document.head.append(element);
  recordPageView('/b');
  const log = clientLog();
  setRumClient(log.client);
  assert.deepEqual(log.calls.map((call) => call[1].pageId), ['/unknown', '/b']);
});

test('resolves rapid routes, unknown paths, and numeric community routes safely', () => {
  installCatalog();
  recordPageView('/a');
  recordPageView('/b');
  recordPageView('/not-authored');
  recordPageView('/community/questions/987654?ignored=yes');
  recordPageView('/community/ideas/42#ignored');
  recordPageView('/community/questions/%2e%2e');
  const log = clientLog();
  setRumClient(log.client);
  assert.deepEqual(log.calls.map((call) => call[1].pageId), [
    '/a',
    '/b',
    '/unknown',
    '/community/questions/:id',
    '/community/ideas/:id',
    '/unknown',
  ]);
});

test('drops unknown keys, invalid allowlist values, and early identifier interactions', () => {
  installCatalog();
  assert.equal(track(EVENTS.helpfulVote, {helpful: true, email: 'person@example.com'}, '/a'), false);
  assert.equal(track(EVENTS.outboundClick, {destinationType: 'https://example.com'}, '/a'), false);
  assert.equal(track(EVENTS.contentCopy, {codeId: 'missing', language: 'json'}, '/a'), false);
  assert.equal(trackInternalNavigation('missing', '/b', '/a'), false);
  assert.equal(queuedAnalyticsForTests().length, 0);

  installCatalog(null);
  assert.equal(track(EVENTS.contentCopy, {codeId: 'model/orders', language: 'json'}, '/a'), false);
  assert.equal(queuedAnalyticsForTests().length, 0);
});

test('keeps one mixed 50-event queue in emission order', () => {
  installCatalog();
  recordPageView('/a');
  track(EVENTS.helpfulVote, {helpful: true}, '/a');
  for (let index = 0; index < 60; index += 1) recordPageView(index % 2 ? '/a' : '/b');
  assert.equal(queuedAnalyticsForTests().length, 50);
  const log = clientLog();
  setRumClient(log.client);
  assert.equal(log.calls.length, 50);
  assert.equal(log.calls[0][0], 'page');
  assert.equal(log.calls[1][0], 'event');
  assert.equal(log.calls[1][1], EVENTS.helpfulVote);
});

test('contains transport exceptions and remains functional with no RUM client', () => {
  installCatalog();
  const throwing = clientLog({throwEvents: true});
  setRumClient(throwing.client);
  assert.doesNotThrow(() => track(EVENTS.helpfulVote, {helpful: false}, '/a'));
  setRumClient(null);
  assert.doesNotThrow(() => recordPageView('/a'));
  assert.doesNotThrow(() => track(EVENTS.helpfulVote, {helpful: true}, '/a'));
});
