import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import {listBlogFiles, validateBlogSource} from './validate-content.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(SCRIPT_DIR, '..');
const VALUE_OPTIONS = new Set([
  'title',
  'description',
  'api-family',
  'scope',
  'provenance',
  'date',
  'tag',
  'source-discussion',
  'source-category',
  'engagement-discussion',
  'author',
]);
const REQUIRED_OPTIONS = ['title', 'description', 'api-family', 'scope', 'provenance'];

function parseArguments(argv) {
  const options = {tag: []};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    if (!VALUE_OPTIONS.has(key)) throw new Error(`Unknown option: --${key}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    index += 1;
    if (key === 'tag') options.tag.push(value);
    else if (options[key] !== undefined) throw new Error(`Option --${key} may only be supplied once`);
    else options[key] = value;
  }
  for (const key of REQUIRED_OPTIONS) {
    if (!options[key]) throw new Error(`Missing required option: --${key}`);
  }
  return options;
}

function slugify(title) {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-');
  if (!slug) throw new Error('Title must contain letters or numbers');
  if (Buffer.byteLength(slug) > 80) throw new Error('Generated slug exceeds 80 bytes');
  return slug;
}

function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

function yamlString(value) {
  return JSON.stringify(value);
}

function replaceToken(template, token, value) {
  return template.split(`{{${token}}}`).join(value);
}

async function findDuplicate(blogDir, slug, contentId) {
  for (const filePath of await listBlogFiles(blogDir)) {
    let parsed;
    try {
      parsed = matter(await readFile(filePath, 'utf8'));
    } catch {
      continue;
    }
    if (parsed.data.slug === slug) return 'slug';
    if (parsed.data.content_id === contentId) return 'content_id';
  }
  return null;
}

export async function createHotTopic(argv, {
  siteDir = SITE_DIR,
  dateNow = utcDate,
} = {}) {
  const options = parseArguments(argv);
  if (!['original', 'adapted'].includes(options.provenance)) {
    throw new Error('--provenance must be original or adapted');
  }
  if (!['seller', 'vendor', 'both'].includes(options.scope)) {
    throw new Error('--scope must be seller, vendor, or both');
  }
  if (options.provenance === 'adapted' && (!options['source-discussion'] || !options['source-category'])) {
    throw new Error('Adapted provenance requires --source-discussion and --source-category');
  }
  if (options.provenance === 'original' && (options['source-discussion'] || options['source-category'])) {
    throw new Error('Original provenance does not accept source options');
  }

  const date = options.date || dateNow();
  const slug = slugify(options.title);
  const contentId = `topic/${slug}`;
  const blogDir = path.join(siteDir, 'blog');
  const outputPath = path.join(blogDir, `${date}-${slug}.md`);
  const duplicate = await findDuplicate(blogDir, slug, contentId);
  if (duplicate) throw new Error(`A blog post already uses this ${duplicate}`);

  const tags = options.tag.length ? [...new Set(options.tag)] : [options['api-family'], 'guidance'];
  const optionalFrontmatter = [];
  if (options['source-discussion']) {
    optionalFrontmatter.push(`source_discussion: ${yamlString(options['source-discussion'])}`);
    optionalFrontmatter.push(`source_category: ${yamlString(options['source-category'])}`);
  }
  if (options['engagement-discussion']) {
    optionalFrontmatter.push(`engagement_discussion: ${yamlString(options['engagement-discussion'])}`);
  }

  const attribution = options.provenance === 'adapted'
    ? `\n:::note Source attribution\nThis post adapts [the original discussion](${options['source-discussion']}). Read the source for the complete guidance.\n:::\n`
    : '';
  const relatedLinks = [];
  if (options['source-discussion']) relatedLinks.push(`- [Original source](${options['source-discussion']})`);
  if (options['engagement-discussion']) relatedLinks.push(`- [Discuss this topic in Developer Hub](${options['engagement-discussion']})`);
  if (!relatedLinks.length) relatedLinks.push('- Add official documentation and related Developer Hub pages.');

  let template = await readFile(path.join(siteDir, 'templates', 'hot-topic.md'), 'utf8');
  const replacements = {
    slug,
    title: yamlString(options.title),
    authors: `[${yamlString(options.author || 'spapi-team')}]`,
    date,
    tags: `[${tags.map(yamlString).join(', ')}]`,
    description: yamlString(options.description),
    apiFamily: yamlString(options['api-family']),
    scope: options.scope,
    provenance: options.provenance,
    optionalFrontmatter: optionalFrontmatter.length ? `\n${optionalFrontmatter.join('\n')}` : '',
    attribution,
    relatedContent: relatedLinks.join('\n'),
  };
  for (const [token, value] of Object.entries(replacements)) template = replaceToken(template, token, value);

  const validation = await validateBlogSource({buffer: Buffer.from(template), filePath: outputPath});
  if (validation.errors.length) {
    throw new Error(`Generated post is invalid:\n- ${validation.errors.join('\n- ')}`);
  }

  try {
    await writeFile(outputPath, template, {encoding: 'utf8', flag: 'wx'});
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error('Refusing to overwrite an existing blog post');
    throw error;
  }
  return outputPath;
}

async function main() {
  const outputPath = await createHotTopic(process.argv.slice(2));
  console.log(`Created ${path.relative(SITE_DIR, outputPath)}.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
