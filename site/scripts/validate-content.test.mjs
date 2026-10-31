import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {createHotTopic} from './new-hot-topic.mjs';
import {MAX_BLOG_BYTES, validateBlogSource, validateContent} from './validate-content.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.resolve(SCRIPT_DIR, '../templates/hot-topic.md');

function originalPost(overrides = {}) {
  const values = {
    slug: 'example-topic',
    title: 'Example topic',
    authors: '[spapi-team]',
    date: '2026-02-01',
    tags: '[orders, guidance]',
    description: 'A bounded example description.',
    content_id: 'topic/example-topic',
    content_type: 'hot_topic',
    api_family: 'orders',
    selling_partner_scope: 'both',
    provenance: 'original',
    ...overrides,
  };
  return `---\n${Object.entries(values).map(([key, value]) => `${key}: ${value}`).join('\n')}\n---\n\nSummary.\n\n{/* truncate */}\n`;
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hub-content-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  return directory;
}

async function scaffoldSite(t) {
  const siteDir = await temporaryDirectory(t);
  await mkdir(path.join(siteDir, 'blog'));
  await mkdir(path.join(siteDir, 'templates'));
  await writeFile(path.join(siteDir, 'templates', 'hot-topic.md'), await readFile(TEMPLATE_PATH));
  return siteDir;
}

const REQUIRED_ARGS = [
  '--title', 'A new Orders guide',
  '--description', 'Steps for adopting the new Orders workflow.',
  '--api-family', 'orders',
  '--scope', 'both',
];

test('validates exact-size content and rejects one byte over', async () => {
  const filePath = '/tmp/2026-02-01-example-topic.md';
  const base = Buffer.from(originalPost());
  const exact = Buffer.concat([base, Buffer.alloc(MAX_BLOG_BYTES - base.length, 0x20)]);
  const accepted = await validateBlogSource({buffer: exact, filePath});
  assert.deepEqual(accepted.errors, []);

  const rejected = await validateBlogSource({buffer: Buffer.concat([exact, Buffer.from('x')]), filePath});
  assert.match(rejected.errors.join('\n'), /file exceeds 262144 bytes/);
});

test('enforces adapted attribution, pinned links, and engagement host', async () => {
  const source = 'https://github.com/amzn/selling-partner-api-samples/discussions/253';
  const post = originalPost({
    provenance: 'adapted',
    source_discussion: source,
    source_category: 'Orders Management',
    engagement_discussion: 'https://github.com/other/repo/discussions/6',
  }) + `\n:::note Source attribution\nAdapted from [the source](${source}).\n:::\n\n[Unpinned](https://github.com/amzn/selling-partner-api-models/blob/main/model.json)\n`;
  const result = await validateBlogSource({buffer: Buffer.from(post), filePath: '/tmp/2026-02-01-example-topic.md'});
  assert.match(result.errors.join('\n'), /Developer Hub discussion/);
  assert.match(result.errors.join('\n'), /unpinned source file/);

  const missingAttribution = await validateBlogSource({
    buffer: Buffer.from(originalPost({
      provenance: 'adapted',
      source_discussion: source,
      source_category: 'Orders Management',
    })),
    filePath: '/tmp/2026-02-01-example-topic.md',
  });
  assert.match(missingAttribution.errors.join('\n'), /matching visible source attribution/);
});

test('detects duplicate slugs and content IDs across blog files', async (t) => {
  const blogDir = await temporaryDirectory(t);
  await writeFile(path.join(blogDir, '2026-02-01-example-topic.md'), originalPost());
  await writeFile(path.join(blogDir, '2026-02-02-other.md'), originalPost({date: '2026-02-02'}));
  await assert.rejects(validateContent({blogDir}), /duplicate slug[\s\S]*duplicate content_id/);
});

test('authoring creates one valid adapted post', async (t) => {
  const siteDir = await scaffoldSite(t);
  const outputPath = await createHotTopic([
    ...REQUIRED_ARGS,
    '--provenance', 'adapted',
    '--source-discussion', 'https://github.com/amzn/selling-partner-api-samples/discussions/253',
    '--source-category', 'Orders Management',
    '--engagement-discussion', 'https://github.com/anjireddylella/developerhub/discussions/6',
    '--tag', 'migration',
    '--tag', 'orders',
  ], {siteDir, dateNow: () => '2026-02-01'});

  assert.equal(path.basename(outputPath), '2026-02-01-a-new-orders-guide.md');
  const source = await readFile(outputPath, 'utf8');
  assert.match(source, /:::note Source attribution/);
  assert.match(source, /engagement_discussion: "https:\/\/github.com\/anjireddylella\/developerhub\/discussions\/6"/);
  assert.deepEqual(await validateContent({blogDir: path.join(siteDir, 'blog')}), {files: 1});
});

test('authoring refuses overwrite, duplicate, and invalid provenance', async (t) => {
  const overwriteSite = await scaffoldSite(t);
  const output = path.join(overwriteSite, 'blog', '2026-02-01-a-new-orders-guide.md');
  await writeFile(output, 'occupied');
  await assert.rejects(
    createHotTopic([...REQUIRED_ARGS, '--provenance', 'original'], {siteDir: overwriteSite, dateNow: () => '2026-02-01'}),
    /Refusing to overwrite/,
  );

  const duplicateSite = await scaffoldSite(t);
  await writeFile(
    path.join(duplicateSite, 'blog', '2026-01-31-existing.md'),
    originalPost({slug: 'a-new-orders-guide', content_id: 'topic/a-new-orders-guide', date: '2026-01-31'}),
  );
  await assert.rejects(
    createHotTopic([...REQUIRED_ARGS, '--provenance', 'original'], {siteDir: duplicateSite, dateNow: () => '2026-02-01'}),
    /already uses this slug/,
  );

  const invalidSite = await scaffoldSite(t);
  await assert.rejects(
    createHotTopic([
      ...REQUIRED_ARGS,
      '--provenance', 'adapted',
    ], {siteDir: invalidSite, dateNow: () => '2026-02-01'}),
    /requires --source-discussion and --source-category/,
  );
  await assert.rejects(
    createHotTopic([
      ...REQUIRED_ARGS,
      '--provenance', 'original',
      '--source-discussion', 'https://github.com/amzn/selling-partner-api-samples/discussions/253',
      '--source-category', 'Orders Management',
    ], {siteDir: invalidSite, dateNow: () => '2026-02-01'}),
    /does not accept source options/,
  );
});
