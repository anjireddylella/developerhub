import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import hub from '../../hub.config.js';
import {
  COMMUNITY_LIMITS,
  normalizeDiscussion,
  prepareCommunityContent,
  sanitizeDiscussionHtml,
} from './communityValidation.js';
import {buildCommunityPayloads, serializeCommunityContent} from './index.js';
import {utf8Bytes} from '../api-content/catalogValidation.js';

function discussion(overrides = {}) {
  return {
    number: 1,
    title: 'How do I call this API?',
    url: 'https://untrusted.example/discussions/source',
    bodyHTML: '<p>Use the documented request flow.</p>',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    upvoteCount: 2,
    isAnswered: true,
    locked: false,
    author: {
      login: 'sample-user',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
    comments: {totalCount: 3},
    labels: {nodes: [{name: 'orders-api', color: '1D76DB'}]},
    reactionGroups: [{content: 'THUMBS_UP', reactors: {totalCount: 4}}],
    unknown: 'must not be retained',
    ...overrides,
  };
}

function content(source = 'sample', questions = [discussion()], ideas = []) {
  return {source, questions, ideas};
}

function actionsSpy() {
  const serialized = [];
  const routes = [];
  let globalData;
  return {
    serialized,
    routes,
    get globalData() {
      return globalData;
    },
    actions: {
      async createData(name, value) {
        serialized.push({name, value});
        return name;
      },
      addRoute(route) {
        routes.push(route);
      },
      setGlobalData(value) {
        globalData = value;
      },
    },
  };
}

test('uses the fixed Developer Hub repository even when the old override is set', () => {
  assert.equal(hub.github.owner, 'anjireddylella');
  assert.equal(hub.github.name, 'developerhub');
});

test('normalizes bounded scalars, reconstructs the URL, and discards source-only fields', () => {
  const normalized = normalizeDiscussion(discussion());
  assert.deepEqual(Object.keys(normalized), [
    'number', 'title', 'url', 'safeBodyHtml', 'createdAt', 'updatedAt', 'isAnswered',
    'locked', 'author', 'replies', 'labels', 'votes',
  ]);
  assert.equal(normalized.url, 'https://github.com/anjireddylella/developerhub/discussions/1');
  assert.deepEqual(normalized.author, {login: 'sample-user'});
  assert.equal(normalized.votes, 6);
  assert.equal(normalized.labels[0].color, '1d76db');
  assert.ok(!('bodyHTML' in normalized));
  assert.ok(!('unknown' in normalized));
});

test('sanitizes to passive HTML and canonical HTTPS links', () => {
  const html = sanitizeDiscussionHtml(`
    <h2 id="x">Heading</h2>
    <p class="lead" onclick="attack()">Text <strong>strong</strong></p>
    <a href="https://example.com/path?tracking=yes#fragment" title="Guide" data-x="1">safe</a>
    <a href="http://example.com/path">http</a>
    <a href="//example.com/path">relative</a>
    <img src="https://tracker.example/pixel.png"><svg><use href="x"></use></svg>
    <iframe src="https://tracker.example"></iframe><form><input value="x"></form>
    <video src="https://tracker.example/video"></video><script>alert(1)</script>
  `);
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<strong>strong<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com\/path"/);
  assert.match(html, /title="Guide"/);
  assert.match(html, /rel="nofollow noopener noreferrer"/);
  for (const forbidden of [
    'onclick', 'class=', 'id=', 'data-x', '<img', '<svg', '<iframe', '<form', '<input',
    '<video', '<script', 'tracker.example', '?tracking', '#fragment', 'href="http:', 'href="//',
  ]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

test('rejects sensitive body text and retained attributes without reporting source values', () => {
  const fixtures = [
    ['Atzr|super-secret', 'lwa-token'],
    ['123-1234567-1234567', 'amazon-order-id'],
    ['A1234567890', 'amazon-account-id'],
    ['private@example.com', 'email'],
    ['-----BEGIN PRIVATE KEY-----', 'private-key'],
    ['clientSecret = "not-a-placeholder"', 'sensitive-assignment'],
  ];
  for (const [secret, rule] of fixtures) {
    assert.throws(
      () => sanitizeDiscussionHtml(`<p>${secret}</p>`),
      (error) => error.message.includes(rule) && !error.message.includes(secret),
    );
  }
  assert.throws(
    () => sanitizeDiscussionHtml('<a href="https://example.com/private@example.com">link</a>'),
    (error) => error.message.includes('email') && !error.message.includes('private@example.com'),
  );
  assert.doesNotThrow(() => sanitizeDiscussionHtml('<p>clientSecret = "${CLIENT_SECRET}"</p>'));
});

test('enforces scalar, label, avatar, count, timestamp, and escaped-body bounds', () => {
  const invalid = [
    discussion({number: 0}),
    discussion({title: 'x'.repeat(161)}),
    discussion({createdAt: 'yesterday'}),
    discussion({isAnswered: 1}),
    discussion({upvoteCount: -1}),
    discussion({author: {login: 'bad_login', avatarUrl: ''}}),
    discussion({author: {login: 'valid-user', avatarUrl: 'https://example.com/avatar'}}),
    discussion({labels: {nodes: [{name: 'x', color: 'blue'}]}}),
    discussion({labels: {nodes: Array.from({length: 6}, (_, index) => ({name: `l${index}`, color: 'abcdef'}))}}),
  ];
  for (const item of invalid) assert.throws(() => normalizeDiscussion(item));
  assert.throws(() => normalizeDiscussion(discussion({bodyHTML: 'x'.repeat(COMMUNITY_LIMITS.body + 1)})));
  assert.throws(() => normalizeDiscussion(discussion({bodyHTML: '"'.repeat(COMMUNITY_LIMITS.body)})), /safeBodyHtml-size/);
});

test('fails equivalent invalid sample data and quarantines live data with fixed diagnostics', () => {
  const secret = 'private@example.com';
  const invalid = discussion({number: 7, bodyHTML: `<p>${secret}</p>`});
  assert.throws(
    () => prepareCommunityContent(content('sample', [invalid])),
    (error) => error.message.includes('email') && !error.message.includes(secret),
  );

  const diagnostics = [];
  const prepared = prepareCommunityContent(content('github', [discussion(), invalid]), {
    logger: (line) => diagnostics.push(line),
  });
  assert.equal(prepared.questions.items.length, 1);
  assert.equal(prepared.questions.unavailableCount, 1);
  assert.deepEqual(diagnostics, ['[hub-community] quarantined questions discussion 7 (body:email).']);
  assert.equal(diagnostics.join('').includes(secret), false);
});

test('caps each section and logs only dropped live record identifiers', () => {
  const records = Array.from({length: 55}, (_, index) => discussion({
    number: index + 1,
    updatedAt: `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:00Z`,
  }));
  assert.throws(() => prepareCommunityContent(content('sample', records)), /record-count/);

  const diagnostics = [];
  const live = prepareCommunityContent(content('github', records), {
    logger: (line) => diagnostics.push(line),
  });
  assert.equal(live.questions.items.length, COMMUNITY_LIMITS.recordsPerSection);
  assert.equal(live.questions.unavailableCount, 5);
  assert.equal(diagnostics.length, 5);
  assert.ok(diagnostics.every((line) => line.includes('(aggregate-size)')));
});

test('treats aggregate overflow as fatal for samples and drops whole live records', () => {
  const limits = {...COMMUNITY_LIMITS, threadModule: 100};
  const sample = prepareCommunityContent(content('sample'));
  assert.throws(() => buildCommunityPayloads(sample, {limits}), /thread-size/);

  const diagnostics = [];
  const live = prepareCommunityContent(content('github'));
  const payloads = buildCommunityPayloads(live, {limits, logger: (line) => diagnostics.push(line)});
  assert.equal(payloads.threads.length, 0);
  assert.equal(payloads.lists[0].data.items.length, 0);
  assert.equal(payloads.lists[0].data.section.unavailableCount, 1);
  assert.deepEqual(diagnostics, ['[hub-community] quarantined questions discussion 1 (aggregate-size).']);
});

test('enforces list, home, and search aggregate caps in strict and live modes', () => {
  const raw = content('sample', [discussion()], [discussion({number: 2, title: 'An idea'})]);
  const sample = prepareCommunityContent(raw);
  const baseline = buildCommunityPayloads(sample);
  const empty = buildCommunityPayloads(prepareCommunityContent(content('sample', [], [])));
  const listLimit = Math.max(
    utf8Bytes(JSON.stringify(empty.lists[0].data)),
    utf8Bytes(JSON.stringify(baseline.lists[0].data)) - 1,
  );
  const homeLimit = utf8Bytes(JSON.stringify({
    source: baseline.globalData.source,
    latestQuestions: baseline.globalData.latestQuestions,
    topIdeas: baseline.globalData.topIdeas,
  })) - 1;
  const searchLimit = utf8Bytes(JSON.stringify(baseline.globalData.communitySearch)) - 1;

  assert.throws(
    () => buildCommunityPayloads(sample, {limits: {...COMMUNITY_LIMITS, listModule: listLimit}}),
    /list-size/,
  );
  assert.throws(
    () => buildCommunityPayloads(sample, {limits: {...COMMUNITY_LIMITS, homeModule: homeLimit}}),
    /home:aggregate-size/,
  );
  assert.throws(
    () => buildCommunityPayloads(sample, {limits: {...COMMUNITY_LIMITS, searchModule: searchLimit}}),
    /community-search:aggregate-size/,
  );

  for (const constrained of [
    {listModule: listLimit},
    {homeModule: homeLimit},
    {searchModule: searchLimit},
  ]) {
    const live = prepareCommunityContent({...raw, source: 'github'});
    const diagnostics = [];
    const payloads = buildCommunityPayloads(live, {
      limits: {...COMMUNITY_LIMITS, ...constrained},
      logger: (line) => diagnostics.push(line),
    });
    assert.ok(diagnostics.length > 0);
    assert.ok(diagnostics.every((line) => line.includes('(aggregate-size)')));
    assert.ok(payloads.lists.some((list) => list.data.section.unavailableCount > 0));
  }
});

test('serializes only bounded list, thread, home, and search projections', async () => {
  const samplePath = new URL('./sample-data.json', import.meta.url);
  const raw = JSON.parse(await readFile(samplePath, 'utf8'));
  const prepared = prepareCommunityContent({
    source: 'sample',
    questions: raw.questions,
    ideas: raw.ideas,
  });
  const payloads = buildCommunityPayloads(prepared);

  for (const list of payloads.lists) {
    assert.ok(utf8Bytes(JSON.stringify(list.data)) <= COMMUNITY_LIMITS.listModule);
    for (const item of list.data.items) {
      assert.deepEqual(Object.keys(item), [
        'number', 'title', 'updatedAt', 'isAnswered', 'locked', 'author', 'replies', 'labels', 'votes',
      ]);
    }
  }
  for (const thread of payloads.threads) {
    assert.ok(utf8Bytes(JSON.stringify(thread.data)) <= COMMUNITY_LIMITS.threadModule);
    assert.ok('safeBodyHtml' in thread.data.item);
    assert.ok(!('bodyHTML' in thread.data.item));
  }
  const home = {
    source: payloads.globalData.source,
    latestQuestions: payloads.globalData.latestQuestions,
    topIdeas: payloads.globalData.topIdeas,
  };
  assert.ok(utf8Bytes(JSON.stringify(home)) <= COMMUNITY_LIMITS.homeModule);
  assert.ok(utf8Bytes(JSON.stringify(payloads.globalData.communitySearch)) <= COMMUNITY_LIMITS.searchModule);
  for (const item of payloads.globalData.communitySearch) {
    assert.deepEqual(Object.keys(item), ['number', 'title', 'labels', 'section', 'route']);
  }
});

test('quarantined records never reach createData or setGlobalData', async () => {
  const secret = 'private@example.com';
  const invalid = discussion({number: 9, title: 'Private item', bodyHTML: `<p>${secret}</p>`});
  const spy = actionsSpy();
  await serializeCommunityContent(content('github', [discussion(), invalid]), spy.actions, {
    logger: () => {},
  });

  const browserPayload = JSON.stringify({serialized: spy.serialized, globalData: spy.globalData});
  assert.equal(browserPayload.includes(secret), false);
  assert.equal(browserPayload.includes('Private item'), false);
  assert.equal(browserPayload.includes('/discussions/9'), false);
  assert.equal(spy.routes.some((route) => route.path.endsWith('/9')), false);
});

test('never serializes source URLs, avatars, unknown fields, or raw bodyHTML', async () => {
  const raw = discussion({
    url: 'https://source.example/private-path',
    unknown: 'unknown-source-value',
  });
  const spy = actionsSpy();
  await serializeCommunityContent(content('sample', [raw]), spy.actions);
  const browserPayload = JSON.stringify({serialized: spy.serialized, globalData: spy.globalData});
  assert.equal(browserPayload.includes('source.example'), false);
  assert.equal(browserPayload.includes('avatars.githubusercontent.com'), false);
  assert.equal(browserPayload.includes('unknown-source-value'), false);
  assert.equal(browserPayload.includes('bodyHTML'), false);
  assert.match(browserPayload, /safeBodyHtml/);
  assert.ok(browserPayload.includes('https://github.com/anjireddylella/developerhub/discussions/1'));
});
