import {readdir, readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';

export const MAX_BLOG_BYTES = 256 * 1024;

const REQUIRED_FIELDS = [
  'slug',
  'title',
  'authors',
  'date',
  'tags',
  'description',
  'content_id',
  'content_type',
  'api_family',
  'selling_partner_scope',
  'provenance',
];
const OPTIONAL_FIELDS = [
  'source_discussion',
  'source_category',
  'engagement_discussion',
];
const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]);
const CONTENT_TYPES = new Set(['hot_topic', 'announcement']);
const API_FAMILIES = new Set([
  'cross-cutting',
  'data-kiosk',
  'easy-ship',
  'orders',
  'reports',
  'vehicles',
]);
const SCOPES = new Set(['seller', 'vendor', 'both']);
const PROVENANCE = new Set(['original', 'adapted']);
const HUB_ROUTES = new Set([
  '/',
  '/apis',
  '/apis/data-kiosk',
  '/apis/easy-ship',
  '/apis/orders',
  '/apis/vehicles',
  '/blog',
  '/community/ideas',
  '/community/questions',
  '/docs/intro',
  '/licenses/selling-partner-api-models/license',
  '/licenses/selling-partner-api-models/notice',
  '/licenses/selling-partner-api-samples/license',
  '/resources',
  '/search',
]);
const EXTERNAL_HOSTS = new Set([
  'developer-docs.amazon',
  'developer-docs.amazon.com',
  'github.com',
]);
const SOURCE_REPOSITORIES = new Set([
  'amzn/selling-partner-api-models',
  'amzn/selling-partner-api-samples',
]);
const ASCII_IDENTIFIER = /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MARKDOWN_LINK = /(?<!!)\[[^\]]*\]\(([^\s)]+)(?:\s+["'][^"']*["'])?\)/g;

function bytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function decodeUtf8(buffer, label) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  } catch {
    throw new Error(`${label}: invalid UTF-8`);
  }
}

function dateString(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? value : '';
}

function isRealDate(value) {
  if (!DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function checkString(errors, data, field, {maxBytes, pattern} = {}) {
  const value = data[field];
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${field} must be a non-empty string`);
    return;
  }
  if (maxBytes && bytes(value) > maxBytes) errors.push(`${field} exceeds ${maxBytes} bytes`);
  if (pattern && !pattern.test(value)) errors.push(`${field} has an invalid format`);
}

function checkStringList(errors, data, field, {maxItems, maxBytes}) {
  const values = data[field];
  if (!Array.isArray(values) || values.length === 0) {
    errors.push(`${field} must be a non-empty array`);
    return;
  }
  if (values.length > maxItems) errors.push(`${field} exceeds ${maxItems} entries`);
  values.forEach((value, index) => {
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${field}[${index}] must be a non-empty string`);
    } else if (bytes(value) > maxBytes) {
      errors.push(`${field}[${index}] exceeds ${maxBytes} bytes`);
    }
  });
}

function parseHttpsUrl(errors, data, field) {
  const raw = data[field];
  if (raw === undefined) return null;
  if (typeof raw !== 'string' || raw.length === 0 || !/^[\x00-\x7F]+$/.test(raw)) {
    errors.push(`${field} must be a non-empty ASCII URL`);
    return null;
  }
  if (raw.length > 500) errors.push(`${field} exceeds 500 bytes`);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) {
      errors.push(`${field} must be a plain HTTPS URL`);
      return null;
    }
    return url;
  } catch {
    errors.push(`${field} is not a valid URL`);
    return null;
  }
}

function validateSourceDiscussion(errors, data) {
  const url = parseHttpsUrl(errors, data, 'source_discussion');
  if (!url) return;
  const parts = url.pathname.split('/').filter(Boolean);
  const repository = parts.slice(0, 2).join('/');
  if (
    url.hostname !== 'github.com' ||
    !SOURCE_REPOSITORIES.has(repository) ||
    parts[2] !== 'discussions' ||
    !/^\d+$/.test(parts[3] || '') ||
    parts.length !== 4 ||
    url.search ||
    url.hash
  ) {
    errors.push('source_discussion must identify a discussion in an allowed source repository');
  }
}

function validateEngagementDiscussion(errors, data) {
  const url = parseHttpsUrl(errors, data, 'engagement_discussion');
  if (!url) return;
  if (
    url.hostname !== 'github.com' ||
    !/^\/anjireddylella\/developerhub\/discussions\/\d+$/.test(url.pathname) ||
    url.search ||
    url.hash
  ) {
    errors.push('engagement_discussion must identify a Developer Hub discussion');
  }
}

function validateExternalLink(errors, rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    errors.push('contains a malformed external link');
    return;
  }
  if (url.protocol !== 'https:' || !EXTERNAL_HOSTS.has(url.hostname)) {
    errors.push('contains an external link with an unsupported scheme or host');
    return;
  }
  if (url.hostname !== 'github.com') return;

  const parts = url.pathname.split('/').filter(Boolean);
  const repository = parts.slice(0, 2).join('/');
  if (!SOURCE_REPOSITORIES.has(repository)) return;
  if (parts[2] === 'blob' || parts[2] === 'tree') {
    if (!/^[0-9a-f]{40}$/.test(parts[3] || '')) {
      errors.push('contains an unpinned source file or folder link');
    }
  }
}

async function pathExists(target) {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

async function validateLinks(errors, content, filePath, knownRoutes) {
  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const target = match[1];
    if (target.startsWith('#')) continue;
    if (target.startsWith('pathname:///')) {
      const pathname = target.slice('pathname://'.length).split(/[?#]/, 1)[0];
      const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
      if (!knownRoutes.has(normalized)) errors.push(`contains an unresolved internal route: ${normalized}`);
      continue;
    }
    if (/^https?:\/\//.test(target)) {
      validateExternalLink(errors, target);
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')) {
      errors.push('contains a link with an unsupported scheme');
      continue;
    }

    const pathname = target.split(/[?#]/, 1)[0];
    if (!pathname) continue;
    if (pathname.startsWith('/')) {
      const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
      if (!knownRoutes.has(normalized)) errors.push(`contains an unresolved internal route: ${normalized}`);
      continue;
    }

    const resolved = path.resolve(path.dirname(filePath), decodeURIComponent(pathname));
    if (!(await pathExists(resolved))) errors.push('contains an unresolved relative file link');
  }
}

export async function listBlogFiles(blogDir) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile() && /\.mdx?$/.test(entry.name)) files.push(entryPath);
    }
  }
  await walk(blogDir);
  return files.sort();
}

export async function validateBlogSource({buffer, filePath, knownRoutes = HUB_ROUTES}) {
  const label = path.basename(filePath);
  const errors = [];
  if (buffer.length > MAX_BLOG_BYTES) errors.push(`file exceeds ${MAX_BLOG_BYTES} bytes`);
  let source;
  try {
    source = decodeUtf8(buffer, label);
  } catch (error) {
    return {errors: [error.message], data: null};
  }

  let parsed;
  try {
    parsed = matter(source);
  } catch {
    return {errors: ['frontmatter is not valid YAML'], data: null};
  }
  const data = parsed.data;

  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined) errors.push(`missing required field: ${field}`);
  }
  for (const field of Object.keys(data)) {
    if (!ALLOWED_FIELDS.has(field)) errors.push(`unsupported frontmatter field: ${field}`);
  }

  checkString(errors, data, 'slug', {maxBytes: 80, pattern: SLUG});
  checkString(errors, data, 'title', {maxBytes: 160});
  checkString(errors, data, 'description', {maxBytes: 320});
  checkString(errors, data, 'content_id', {maxBytes: 100, pattern: ASCII_IDENTIFIER});
  checkString(errors, data, 'api_family', {maxBytes: 40, pattern: SLUG});
  checkStringList(errors, data, 'authors', {maxItems: 10, maxBytes: 80});
  checkStringList(errors, data, 'tags', {maxItems: 10, maxBytes: 40});

  const normalizedDate = dateString(data.date);
  if (!isRealDate(normalizedDate)) errors.push('date must be a real YYYY-MM-DD date');
  const filenameDate = label.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];
  if (!filenameDate || filenameDate !== normalizedDate) errors.push('frontmatter date must match the filename date');
  if (!CONTENT_TYPES.has(data.content_type)) errors.push('content_type is unsupported');
  if (!API_FAMILIES.has(data.api_family)) errors.push('api_family is unsupported');
  if (!SCOPES.has(data.selling_partner_scope)) errors.push('selling_partner_scope is unsupported');
  if (!PROVENANCE.has(data.provenance)) errors.push('provenance is unsupported');
  if (data.content_type === 'hot_topic' && !data.content_id?.startsWith('topic/')) {
    errors.push('hot-topic content_id must start with topic/');
  }
  if (data.content_type === 'announcement' && !data.content_id?.startsWith('announcement/')) {
    errors.push('announcement content_id must start with announcement/');
  }

  if (data.source_category !== undefined) checkString(errors, data, 'source_category', {maxBytes: 80});
  if (data.provenance === 'adapted') {
    if (data.content_type !== 'hot_topic') errors.push('only hot topics may use adapted provenance');
    if (data.source_discussion === undefined || data.source_category === undefined) {
      errors.push('adapted provenance requires source_discussion and source_category');
    }
    validateSourceDiscussion(errors, data);
    const attribution = parsed.content.match(/:::note\[Source attribution\]\s*\n([\s\S]*?)\n:::/);
    const linkedTargets = attribution ? [...attribution[1].matchAll(MARKDOWN_LINK)].map((match) => match[1]) : [];
    if (!attribution || !linkedTargets.includes(data.source_discussion)) {
      errors.push('adapted content requires a matching visible source attribution link');
    }
  } else if (data.provenance === 'original') {
    if (data.source_discussion !== undefined || data.source_category !== undefined) {
      errors.push('original provenance rejects source fields');
    }
  }

  if (data.source_discussion !== undefined && data.provenance !== 'adapted') {
    validateSourceDiscussion(errors, data);
  }
  if (data.engagement_discussion !== undefined) validateEngagementDiscussion(errors, data);
  await validateLinks(errors, parsed.content, filePath, knownRoutes);

  return {
    errors,
    data: {...data, date: normalizedDate},
    content: parsed.content,
  };
}

export async function validateContent({blogDir = path.resolve('blog')} = {}) {
  const resolvedBlogDir = await realpath(blogDir);
  const files = await listBlogFiles(resolvedBlogDir);
  const knownRoutes = new Set(HUB_ROUTES);
  const results = [];

  for (const filePath of files) {
    const buffer = await readFile(filePath);
    const preliminary = await validateBlogSource({buffer, filePath, knownRoutes});
    if (preliminary.data?.slug) knownRoutes.add(`/blog/${preliminary.data.slug}`);
    results.push({filePath, buffer, preliminary});
  }

  const seenSlugs = new Map();
  const seenContentIds = new Map();
  const failures = [];
  for (const result of results) {
    const validated = await validateBlogSource({
      buffer: result.buffer,
      filePath: result.filePath,
      knownRoutes,
    });
    for (const error of validated.errors) failures.push(`${path.basename(result.filePath)}: ${error}`);
    if (!validated.data) continue;
    for (const [field, seen] of [['slug', seenSlugs], ['content_id', seenContentIds]]) {
      const value = validated.data[field];
      if (typeof value !== 'string') continue;
      if (seen.has(value)) {
        failures.push(`${path.basename(result.filePath)}: duplicate ${field}`);
      } else {
        seen.set(value, result.filePath);
      }
    }
  }

  if (failures.length) throw new Error(`Content validation failed:\n- ${failures.join('\n- ')}`);
  return {files: files.length};
}

async function main() {
  const result = await validateContent();
  console.log(`Validated ${result.files} blog files.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
