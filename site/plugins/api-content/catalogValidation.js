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
    if (!/^[a-z0-9][a-z0-9/_-]{0,99}$/.test(id) || seen.has(id)) {
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
