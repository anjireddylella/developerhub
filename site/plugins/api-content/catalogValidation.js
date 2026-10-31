const encoder = new TextEncoder();

export const CATALOG_LIMITS = Object.freeze({
  id: 100,
  title: 160,
  summary: 320,
  route: 240,
  apiFamily: 40,
  language: 20,
  contentType: 20,
  label: 40,
  labels: 5,
  apiRecords: 50,
  resolvedRecords: 100,
  resourceRecords: 25,
  baseBytes: 192 * 1024,
  communityBytes: 64 * 1024,
});

export const ANALYTICS_CATALOG_LIMITS = Object.freeze({
  totalBytes: 64 * 1024,
  contextBytes: 32 * 1024,
  contexts: 250,
  codeIds: 32,
  navigationIds: 128,
  resourceIds: 32,
  idSetBytes: 8 * 1024,
});

export const CONTENT_TYPES = Object.freeze([
  'api',
  'model',
  'recipe',
  'sample',
  'hot_topic',
  'announcement',
  'doc',
  'resource',
  'question',
  'idea',
  'search',
  'unknown',
]);
export const API_FAMILIES = Object.freeze([
  'data-kiosk',
  'orders',
  'vehicles',
  'easy-ship',
  'reports',
  'cross-cutting',
  'unknown',
]);
export const LANGUAGES = Object.freeze([
  'java',
  'python',
  'php',
  'json',
  'graphql',
  'multiple',
  'none',
  'unknown',
]);
export const SELLING_PARTNER_SCOPES = Object.freeze(['seller', 'vendor', 'both', 'unknown']);
export const DEVELOPER_TYPES = Object.freeze(['solution_provider', 'private_developer', 'unknown']);

const SAFE_PUBLIC_VALUES = new Set(['ATVPDKIKX0DER', 'AUTHORIZATION']);
const PATTERNS = [
  ['lwa-token', /\bAtz[ar]\|[^\s"'`]+/g],
  ['amazon-order-id', /\b\d{3}-\d{7}-\d{7}\b/g],
  ['amazon-account-id', /\bA[0-9A-Z]{9,20}\b/g],
  ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];
const SENSITIVE_KEYS = new Set([
  'clientid',
  'clientsecret',
  'refreshtoken',
  'accesstoken',
  'awssecretaccesskey',
  'secretaccesskey',
  'apikey',
  'authorization',
]);
const PLACEHOLDER = /^(?:<[A-Za-z0-9_-]+>|\$\{[A-Z0-9_]+\}|\{\{[A-Za-z0-9_-]+\}\}|YOUR_[A-Z0-9_]+|REPLACE_ME|EXAMPLE|[xX]{4,})$/;
const IDENTIFIER = /^[a-z0-9][a-z0-9/_-]{0,99}$/;
const NAVIGATION_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const PAGE_ID = /^\/[a-z0-9][a-z0-9/_:-]{0,119}$/;
const CONTEXT_KEYS = [
  'api_family',
  'content_id',
  'content_type',
  'developer_type',
  'language',
  'pageId',
  'route',
  'selling_partner_scope',
];

export function utf8Bytes(value) {
  return encoder.encode(value).byteLength;
}

export function sensitiveValueRules(value) {
  if (typeof value !== 'string') return [];
  const rules = new Set();
  for (const [name, pattern] of PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      if (!SAFE_PUBLIC_VALUES.has(match[0])) rules.add(name);
    }
  }

  const assignment = /\b([A-Za-z][A-Za-z0-9_.-]{0,63})\s*(?:=|:|=>)\s*(["'`])([^"'`\r\n]*)\2/g;
  for (const match of value.matchAll(assignment)) {
    const key = match[1].replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (SENSITIVE_KEYS.has(key) && match[3] && !PLACEHOLDER.test(match[3])) {
      rules.add('sensitive-assignment');
    }
  }
  return [...rules].sort();
}

function boundedString(value, field, limit, recordId) {
  if (typeof value !== 'string' || value.length === 0 || utf8Bytes(value) > limit) {
    throw new Error(`Search catalog validation failed: ${recordId}: ${field}`);
  }
  const rules = sensitiveValueRules(value);
  if (rules.length) {
    throw new Error(`Search catalog validation failed: ${recordId}: ${field}:${rules.join(',')}`);
  }
}

export function validateCatalogRecords(records, {maxRecords, maxBytes, label = 'base'} = {}) {
  if (!Array.isArray(records) || records.length > maxRecords) {
    throw new Error(`Search catalog validation failed: ${label}: record-count`);
  }
  const seen = new Set();
  for (const record of records) {
    if (!record || Object.getPrototypeOf(record) !== Object.prototype) {
      throw new Error(`Search catalog validation failed: ${label}: record`);
    }
    const id = record.id;
    boundedString(id, 'id', CATALOG_LIMITS.id, label);
    if (!IDENTIFIER.test(id) || seen.has(id)) {
      throw new Error(`Search catalog validation failed: ${id}: id`);
    }
    seen.add(id);
    boundedString(record.title, 'title', CATALOG_LIMITS.title, id);
    boundedString(record.summary, 'summary', CATALOG_LIMITS.summary, id);
    boundedString(record.route, 'route', CATALOG_LIMITS.route, id);
    if (!record.route.startsWith('/') || record.route.includes('?') || record.route.includes('..')) {
      throw new Error(`Search catalog validation failed: ${id}: route`);
    }
    boundedString(record.apiFamily, 'apiFamily', CATALOG_LIMITS.apiFamily, id);
    boundedString(record.language, 'language', CATALOG_LIMITS.language, id);
    boundedString(record.contentType, 'contentType', CATALOG_LIMITS.contentType, id);
    if (!Array.isArray(record.labels) || record.labels.length > CATALOG_LIMITS.labels) {
      throw new Error(`Search catalog validation failed: ${id}: labels`);
    }
    for (const item of record.labels) boundedString(item, 'label', CATALOG_LIMITS.label, id);
  }
  const bytes = utf8Bytes(JSON.stringify(records));
  if (bytes > maxBytes) throw new Error(`Search catalog validation failed: ${label}: aggregate-size`);
  return records;
}

export function validateBaseCatalog({apiRecords, resolvedRecords, resourceRecords}) {
  validateCatalogRecords(apiRecords, {
    maxRecords: CATALOG_LIMITS.apiRecords,
    maxBytes: CATALOG_LIMITS.baseBytes,
    label: 'api',
  });
  validateCatalogRecords(resolvedRecords, {
    maxRecords: CATALOG_LIMITS.resolvedRecords,
    maxBytes: CATALOG_LIMITS.baseBytes,
    label: 'resolved',
  });
  validateCatalogRecords(resourceRecords, {
    maxRecords: CATALOG_LIMITS.resourceRecords,
    maxBytes: CATALOG_LIMITS.baseBytes,
    label: 'resources',
  });
  const records = [...apiRecords, ...resolvedRecords, ...resourceRecords];
  if (new Set(records.map((record) => record.id)).size !== records.length) {
    throw new Error('Search catalog validation failed: base: duplicate-id');
  }
  if (utf8Bytes(JSON.stringify(records)) > CATALOG_LIMITS.baseBytes) {
    throw new Error('Search catalog validation failed: base: aggregate-size');
  }
  return records;
}

function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function analyticsError(rule) {
  throw new Error(`Analytics catalog validation failed: ${rule}`);
}

function validateContext(context) {
  if (!exactKeys(context, CONTEXT_KEYS)) analyticsError('context-keys');
  if (
    typeof context.route !== 'string' ||
    utf8Bytes(context.route) > 120 ||
    !/^\/(?:[a-z0-9][a-z0-9/_-]*(?::id)?|)$/.test(context.route) ||
    context.route.includes('//') ||
    context.route.includes('..')
  ) analyticsError('context-route');
  if (typeof context.pageId !== 'string' || utf8Bytes(context.pageId) > 120 || !PAGE_ID.test(context.pageId)) {
    analyticsError('context-page-id');
  }
  if (!IDENTIFIER.test(context.content_id)) analyticsError('context-content-id');
  if (!CONTENT_TYPES.includes(context.content_type)) analyticsError('context-content-type');
  if (!API_FAMILIES.includes(context.api_family)) analyticsError('context-api-family');
  if (!LANGUAGES.includes(context.language)) analyticsError('context-language');
  if (!SELLING_PARTNER_SCOPES.includes(context.selling_partner_scope)) analyticsError('context-scope');
  if (context.developer_type !== 'unknown') analyticsError('context-developer-type');
  for (const value of Object.values(context)) {
    if (typeof value === 'string' && sensitiveValueRules(value).length) analyticsError('context-sensitive');
  }
}

function validateIdSet(ids, name, maxCount, pattern, maxBytes) {
  if (!Array.isArray(ids) || ids.length > maxCount || utf8Bytes(JSON.stringify(ids)) > ANALYTICS_CATALOG_LIMITS.idSetBytes) {
    analyticsError(`${name}-limit`);
  }
  let prior = null;
  for (const id of ids) {
    if (typeof id !== 'string' || utf8Bytes(id) > maxBytes || !pattern.test(id) || id <= prior) {
      analyticsError(`${name}-id`);
    }
    if (sensitiveValueRules(id).length) analyticsError(`${name}-sensitive`);
    prior = id;
  }
}

export function validateAnalyticsCatalog(catalog) {
  if (!exactKeys(catalog, ['version', 'contexts', 'codeIds', 'navigationIds', 'resourceIds'])) {
    analyticsError('top-level-keys');
  }
  if (catalog.version !== 1) analyticsError('version');
  if (
    !Array.isArray(catalog.contexts) ||
    catalog.contexts.length > ANALYTICS_CATALOG_LIMITS.contexts ||
    utf8Bytes(JSON.stringify(catalog.contexts)) > ANALYTICS_CATALOG_LIMITS.contextBytes
  ) analyticsError('contexts-limit');
  let priorRoute = null;
  for (const context of catalog.contexts) {
    validateContext(context);
    if (context.route <= priorRoute) analyticsError('contexts-order');
    priorRoute = context.route;
  }
  validateIdSet(catalog.codeIds, 'code', ANALYTICS_CATALOG_LIMITS.codeIds, IDENTIFIER, 100);
  validateIdSet(catalog.navigationIds, 'navigation', ANALYTICS_CATALOG_LIMITS.navigationIds, NAVIGATION_ID, 64);
  validateIdSet(catalog.resourceIds, 'resource', ANALYTICS_CATALOG_LIMITS.resourceIds, IDENTIFIER, 100);
  if (utf8Bytes(JSON.stringify(catalog)) > ANALYTICS_CATALOG_LIMITS.totalBytes) analyticsError('aggregate-size');
  return catalog;
}

export function serializeAnalyticsCatalog(catalog) {
  validateAnalyticsCatalog(catalog);
  const serialized = JSON.stringify(catalog)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  if (/<\/script/i.test(serialized) || utf8Bytes(serialized) > ANALYTICS_CATALOG_LIMITS.totalBytes) {
    analyticsError('serialization');
  }
  return serialized;
}
