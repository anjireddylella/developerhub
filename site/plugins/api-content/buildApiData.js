import {createHash} from 'node:crypto';
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {
  CATALOG_LIMITS,
  sensitiveValueRules,
  utf8Bytes,
  validateBaseCatalog,
} from './catalogValidation.js';

export const MODEL_PROJECTION_LIMIT = 20 * 1024;
export const RECIPE_LIMIT = 8 * 1024;
export const API_ROUTE_LIMIT = 64 * 1024;
export const LICENSE_AGGREGATE_LIMIT = 128 * 1024;

const STRING_LIMITS = Object.freeze({
  title: 120,
  version: 40,
  host: 120,
  path: 240,
  operationId: 100,
  summary: 240,
  description: 600,
  parameter: 80,
  responseDescription: 300,
});
const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const SOURCE_EXTENSIONS = new Set(['.json', '.java', '.py', '.php', '.md', '']);
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertUnicode(value, label) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error(`${label}: invalid-unicode`);
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error(`${label}: invalid-unicode`);
    }
  }
}

export function truncateUtf8(value, limit, label = 'value') {
  if (typeof value !== 'string') throw new Error(`${label}: expected-string`);
  assertUnicode(value, label);
  if (utf8Bytes(value) <= limit) return {value, truncated: false};
  const ellipsis = '…';
  let output = '';
  for (const character of value) {
    if (utf8Bytes(output + character + ellipsis) > limit) break;
    output += character;
  }
  return {value: `${output}${ellipsis}`, truncated: true};
}

function admittedString(value, limit, context) {
  const text = value == null ? '' : String(value);
  const rules = sensitiveValueRules(text);
  if (rules.length) throw new Error(`${context}: ${rules.join(',')}`);
  return truncateUtf8(text, limit, context);
}

function responseEntries(responses, apiSlug, operationId) {
  return Object.entries(responses || {}).slice(0, 10).map(([code, response]) => {
    const description = admittedString(
      response?.description,
      STRING_LIMITS.responseDescription,
      `${apiSlug}:${operationId}:response-description`,
    );
    return {
      code: admittedString(code, 20, `${apiSlug}:${operationId}:response-code`).value,
      description: description.value,
      ...(description.truncated ? {descriptionTruncated: true} : {}),
    };
  });
}

function parameterEntries(parameters, apiSlug, operationId) {
  return (parameters || []).slice(0, 20).map((parameter) => ({
    name: admittedString(
      parameter?.name,
      STRING_LIMITS.parameter,
      `${apiSlug}:${operationId}:parameter-name`,
    ).value,
    in: admittedString(
      parameter?.in,
      STRING_LIMITS.parameter,
      `${apiSlug}:${operationId}:parameter-location`,
    ).value,
    required: parameter?.required === true,
    type: admittedString(
      parameter?.type || parameter?.schema?.type || 'object',
      STRING_LIMITS.parameter,
      `${apiSlug}:${operationId}:parameter-type`,
    ).value,
  }));
}

export function projectModel(model, selectedOperations, apiSlug) {
  if (!model || typeof model !== 'object' || !model.paths || !Array.isArray(selectedOperations)) {
    throw new Error(`${apiSlug}: invalid-model`);
  }
  const found = new Map();
  for (const [routePath, pathItem] of Object.entries(model.paths)) {
    for (const [method, operation] of Object.entries(pathItem || {})) {
      if (!HTTP_METHODS.has(method.toLowerCase()) || !operation?.operationId) continue;
      if (!selectedOperations.includes(operation.operationId)) continue;
      if (found.has(operation.operationId)) throw new Error(`${apiSlug}: duplicate-operation`);
      found.set(operation.operationId, {routePath, method, operation});
    }
  }

  const operations = selectedOperations.map((operationId) => {
    const match = found.get(operationId);
    if (!match) throw new Error(`${apiSlug}: missing-operation:${operationId}`);
    const description = admittedString(
      match.operation.description,
      STRING_LIMITS.description,
      `${apiSlug}:${operationId}:description`,
    );
    const summary = admittedString(
      match.operation.summary,
      STRING_LIMITS.summary,
      `${apiSlug}:${operationId}:summary`,
    );
    return {
      method: match.method.toUpperCase(),
      path: admittedString(match.routePath, STRING_LIMITS.path, `${apiSlug}:${operationId}:path`).value,
      operationId: admittedString(
        operationId,
        STRING_LIMITS.operationId,
        `${apiSlug}:${operationId}:operation-id`,
      ).value,
      summary: summary.value,
      description: description.value,
      ...(description.truncated ? {descriptionTruncated: true} : {}),
      parameters: parameterEntries(match.operation.parameters, apiSlug, operationId),
      responses: responseEntries(match.operation.responses, apiSlug, operationId),
    };
  });

  const projection = {
    swagger: admittedString(model.swagger, 20, `${apiSlug}:swagger`).value,
    info: {
      title: admittedString(model.info?.title, STRING_LIMITS.title, `${apiSlug}:title`).value,
      version: admittedString(model.info?.version, STRING_LIMITS.version, `${apiSlug}:version`).value,
    },
    host: admittedString(model.host, STRING_LIMITS.host, `${apiSlug}:host`).value,
    schemes: (model.schemes || []).slice(0, 3).map((scheme) =>
      admittedString(scheme, 20, `${apiSlug}:scheme`).value,
    ),
    operations,
  };
  const bytes = utf8Bytes(JSON.stringify(projection, null, 2));
  if (bytes > MODEL_PROJECTION_LIMIT) throw new Error(`${apiSlug}: model-projection-size`);
  return projection;
}

function markerCount(source, marker) {
  let count = 0;
  let offset = 0;
  while (true) {
    const match = source.indexOf(marker, offset);
    if (match === -1) return count;
    count += 1;
    offset = match + Math.max(marker.length, 1);
  }
}

export function extractRecipeRange(source, recipe) {
  const normalized = source.replace(/\r\n/g, '\n');
  if (markerCount(normalized, recipe.start) !== 1) throw new Error(`${recipe.id}: start-marker`);
  if (markerCount(normalized, recipe.end) !== 1) throw new Error(`${recipe.id}: end-marker`);
  const start = normalized.indexOf(recipe.start);
  const end = normalized.indexOf(recipe.end);
  if (end <= start) throw new Error(`${recipe.id}: marker-order`);
  const excerpt = normalized.slice(start, end);
  if (utf8Bytes(excerpt) > RECIPE_LIMIT) throw new Error(`${recipe.id}: excerpt-size`);
  const rules = sensitiveValueRules(excerpt);
  if (rules.length) throw new Error(`${recipe.id}: ${rules.join(',')}`);
  return excerpt;
}

export async function resolveContainedFile(contentRoot, relativePath, extensions = SOURCE_EXTENSIONS) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) {
    throw new Error(`${relativePath}: path-containment`);
  }
  const root = await realpath(contentRoot);
  const candidate = path.resolve(root, relativePath);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${relativePath}: path-containment`);
  }
  if (!extensions.has(path.extname(candidate))) throw new Error(`${relativePath}: extension`);
  let resolved;
  try {
    resolved = await realpath(candidate);
  } catch {
    throw new Error(`${relativePath}: missing-file`);
  }
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`${relativePath}: path-containment`);
  if (!(await stat(resolved)).isFile()) throw new Error(`${relativePath}: not-file`);
  return resolved;
}

function decodeUtf8(buffer, label) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  } catch {
    throw new Error(`${label}: invalid-utf8`);
  }
}

export async function readDigestVerified(contentRoot, source) {
  if (!DIGEST_PATTERN.test(source.digest)) throw new Error(`${source.localPath}: digest-format`);
  const filePath = await resolveContainedFile(contentRoot, source.localPath);
  const buffer = await readFile(filePath);
  const digest = createHash('sha256').update(buffer).digest('hex');
  if (digest !== source.digest) throw new Error(`${source.localPath}: digest-mismatch`);
  return decodeUtf8(buffer, source.localPath);
}

function assertHttps(url, label, expectedHost) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label}: url`);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.hostname !== expectedHost
  ) {
    throw new Error(`${label}: url`);
  }
  return parsed;
}

function validatePinnedUrl(source, repositoryUrl, label, kind = 'blob') {
  const repository = new URL(repositoryUrl);
  const parsed = assertHttps(source.sourceUrl, label, 'github.com');
  const expected = `${repository.pathname}/${kind}/${source.commit}/${source.sourcePath}`;
  if (parsed.pathname !== expected || parsed.search || parsed.hash) throw new Error(`${label}: pinned-url`);
}

export function validateManifest(config) {
  if (!config || !Array.isArray(config.apis) || !Array.isArray(config.licenses)) {
    throw new Error('api-content: invalid-config');
  }
  assertHttps(config.authorization?.connectingGuide, 'authorization-guide', 'developer-docs.amazon');
  const slugs = new Set();
  const codeIds = new Set();
  for (const api of config.apis) {
    if (!SLUG_PATTERN.test(api.slug) || slugs.has(api.slug)) throw new Error(`${api.slug}: slug`);
    slugs.add(api.slug);
    if (api.status !== 'Demo snapshot' || api.sellingPartnerScope !== 'unknown') {
      throw new Error(`${api.slug}: snapshot-metadata`);
    }
    if (!COMMIT_PATTERN.test(api.model.commit) || !DIGEST_PATTERN.test(api.model.digest)) {
      throw new Error(`${api.slug}: model-source`);
    }
    assertHttps(api.guideUrl, `${api.slug}: guide`, 'developer-docs.amazon');
    validatePinnedUrl(api.model, config.repositories.models.url, `${api.slug}: model`);
    if (!Array.isArray(api.model.selectedOperations) || api.model.selectedOperations.length === 0) {
      throw new Error(`${api.slug}: selected-operations`);
    }
    if (new Set(api.model.selectedOperations).size !== api.model.selectedOperations.length) {
      throw new Error(`${api.slug}: duplicate-operation`);
    }
    if (codeIds.has(api.model.codeId)) throw new Error(`${api.slug}: duplicate-code-id`);
    codeIds.add(api.model.codeId);
    const recipes = api.recipeGroups.flatMap((group) => group.entries);
    if (recipes.length > 4 || (recipes.length === 0) === !api.recipesEmpty) {
      throw new Error(`${api.slug}: recipe-coverage`);
    }
    if ((api.samples.length === 0) === !api.samplesEmpty) throw new Error(`${api.slug}: sample-coverage`);
    if ((api.topics.length === 0) === !api.topicsEmpty) throw new Error(`${api.slug}: topic-coverage`);
    for (const recipe of recipes) {
      if (!['java', 'python', 'php'].includes(recipe.language)) throw new Error(`${recipe.id}: language`);
      if (!COMMIT_PATTERN.test(recipe.commit) || !DIGEST_PATTERN.test(recipe.digest)) {
        throw new Error(`${recipe.id}: source`);
      }
      validatePinnedUrl(recipe, config.repositories.samples.url, recipe.id);
      if (codeIds.has(recipe.codeId)) throw new Error(`${recipe.id}: duplicate-code-id`);
      codeIds.add(recipe.codeId);
    }
  }
  if (slugs.size !== 4) throw new Error('api-content: api-count');
  for (const license of config.licenses) {
    if (!COMMIT_PATTERN.test(license.commit) || !DIGEST_PATTERN.test(license.digest)) {
      throw new Error(`${license.id}: source`);
    }
    validatePinnedUrl(license, license.repositoryUrl, license.id);
  }
  return config;
}

export async function buildApiContent(config, contentRoot) {
  validateManifest(config);
  const apis = [];
  for (const api of config.apis) {
    const modelText = await readDigestVerified(contentRoot, api.model);
    let model;
    try {
      model = JSON.parse(modelText);
    } catch {
      throw new Error(`${api.slug}: invalid-json`);
    }
    const projection = projectModel(model, api.model.selectedOperations, api.slug);
    const recipeGroups = [];
    for (const group of api.recipeGroups) {
      const entries = [];
      for (const recipe of group.entries) {
        const source = await readDigestVerified(contentRoot, recipe);
        entries.push({...recipe, excerpt: extractRecipeRange(source, recipe)});
      }
      recipeGroups.push({...group, entries});
    }
    for (const sample of api.samples) await readDigestVerified(contentRoot, sample);
    const output = {
      ...api,
      authorization: config.authorization,
      model: {...api.model, projection},
      recipeGroups,
    };
    if (utf8Bytes(JSON.stringify(output)) > API_ROUTE_LIMIT) throw new Error(`${api.slug}: route-size`);
    apis.push(output);
  }

  const licenses = [];
  let licenseBytes = 0;
  for (const license of config.licenses) {
    const text = await readDigestVerified(contentRoot, license);
    licenseBytes += utf8Bytes(text);
    licenses.push({...license, text});
  }
  if (licenseBytes > LICENSE_AGGREGATE_LIMIT) throw new Error('licenses: aggregate-size');
  return {apis, licenses};
}

export function buildApiSearchRecords(apis) {
  const records = [];
  for (const api of apis) {
    const route = `/apis/${api.slug}`;
    const common = {apiFamily: api.apiFamily, labels: [api.title, api.version]};
    records.push({
      id: `api/${api.slug}`,
      title: api.title,
      summary: api.summary,
      route,
      language: 'none',
      contentType: 'api',
      ...common,
    });
    records.push({
      id: `model/${api.slug}`,
      title: `${api.title} model`,
      summary: `Generated summary of ${api.model.selectedOperations.length} selected operations from the pinned ${api.version} model.`,
      route: `${route}#api-model`,
      language: 'json',
      contentType: 'model',
      ...common,
    });
    for (const group of api.recipeGroups) {
      for (const recipe of group.entries) {
        records.push({
          id: recipe.codeId,
          title: `${group.title} (${recipe.language})`,
          summary: group.description,
          route: `${route}#code-recipes`,
          language: recipe.language,
          contentType: 'recipe',
          ...common,
        });
      }
    }
    for (const sample of api.samples) {
      records.push({
        id: `sample/${api.slug}/${sample.id}`,
        title: sample.title,
        summary: sample.description,
        route: `${route}#samples`,
        language: 'multiple',
        contentType: 'sample',
        ...common,
      });
    }
  }
  return records;
}

export function buildResourceSearchRecords(resourceGroups) {
  return resourceGroups.flatMap((group) => group.items.map((resource) => ({
    id: `resource/${resource.id}`,
    title: resource.title,
    summary: resource.description,
    route: `/resources#${resource.id}`,
    apiFamily: 'cross-cutting',
    language: 'none',
    contentType: 'resource',
    labels: [group.group],
  })));
}

export function buildResolvedContentRecords(allContent) {
  const records = [];
  const docs = allContent?.['docusaurus-plugin-content-docs']?.default?.loadedVersions
    ?.flatMap((version) => version.docs || []) || [];
  for (const doc of docs) {
    const metadata = doc.metadata || doc;
    records.push({
      id: `doc/${metadata.id}`,
      title: metadata.title,
      summary: metadata.description || metadata.frontMatter?.description || 'Developer Hub documentation.',
      route: metadata.permalink,
      apiFamily: metadata.frontMatter?.api_family || 'cross-cutting',
      language: 'none',
      contentType: 'doc',
      labels: [],
    });
  }
  const posts = allContent?.['docusaurus-plugin-content-blog']?.default?.blogPosts || [];
  for (const post of posts) {
    const metadata = post.metadata || post;
    const frontMatter = metadata.frontMatter || {};
    records.push({
      id: frontMatter.content_id || `blog/${metadata.id}`,
      title: metadata.title,
      summary: metadata.description || frontMatter.description || 'Developer Hub update.',
      route: metadata.permalink,
      apiFamily: frontMatter.api_family || 'cross-cutting',
      language: 'none',
      contentType: frontMatter.content_type || 'hot_topic',
      labels: (metadata.tags || []).slice(0, CATALOG_LIMITS.labels).map((tag) => tag.label),
    });
  }
  return records;
}

export function buildSearchCatalog({apis, resources, allContent}) {
  return validateBaseCatalog({
    apiRecords: buildApiSearchRecords(apis),
    resolvedRecords: buildResolvedContentRecords(allContent),
    resourceRecords: buildResourceSearchRecords(resources),
  });
}
