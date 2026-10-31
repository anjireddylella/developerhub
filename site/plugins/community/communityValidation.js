import sanitizeHtml from 'sanitize-html';
import {
  CATALOG_LIMITS,
  sensitiveValueRules,
  utf8Bytes,
  validateCatalogRecords,
} from '../api-content/catalogValidation.js';

export const COMMUNITY_LIMITS = Object.freeze({
  recordsPerSection: 50,
  fetchedPerSection: 100,
  title: 160,
  url: 240,
  body: 96 * 1024,
  authorLogin: 39,
  avatarUrl: 300,
  labels: 5,
  labelName: 50,
  listModule: 256 * 1024,
  threadModule: 128 * 1024,
  homeModule: 64 * 1024,
  searchModule: 64 * 1024,
});

const CANONICAL_REPOSITORY = 'https://github.com/anjireddylella/developerhub';
const MAX_INTEGER = 2_147_483_647;
const VALIDATED = Symbol('validated-community-content');
const ALLOWED_TAGS = [
  'p', 'br', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
  'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'details',
  'summary', 'strong', 'em', 'del', 'kbd', 'a',
];

export class CommunityValidationError extends Error {
  constructor(rule, number = null) {
    super(`Community validation failed: ${rule}`);
    this.name = 'CommunityValidationError';
    this.rule = rule;
    this.discussionNumber = number;
  }
}

function fail(rule, number = null) {
  throw new CommunityValidationError(rule, number);
}

function hasInvalidUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function boundedString(value, rule, limit, number, {allowEmpty = false} = {}) {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && value.length === 0) ||
    hasInvalidUnicode(value) ||
    utf8Bytes(value) > limit
  ) {
    fail(rule, number);
  }
  return value;
}

function safeInteger(value, rule, number, {minimum = 0} = {}) {
  if (!Number.isInteger(value) || value < minimum || value > MAX_INTEGER) fail(rule, number);
  return value;
}

function safeBoolean(value, rule, number) {
  if (typeof value !== 'boolean') fail(rule, number);
  return value;
}

function scan(value, rule, number) {
  const matches = sensitiveValueRules(value);
  if (matches.length) fail(`${rule}:${matches.join(',')}`, number);
}

function normalizeTimestamp(value, rule, number) {
  boundedString(value, rule, 40, number);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    fail(rule, number);
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) fail(rule, number);
  return new Date(timestamp).toISOString();
}

function canonicalizeHref(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeDiscussionHtml(bodyHTML, number = null) {
  boundedString(bodyHTML, 'bodyHTML', COMMUNITY_LIMITS.body, number, {allowEmpty: true});
  const retainedAttributes = [];
  let safeBodyHtml;
  try {
    safeBodyHtml = sanitizeHtml(bodyHTML, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {a: ['href', 'title', 'rel']},
      allowedSchemes: ['https'],
      allowProtocolRelative: false,
      transformTags: {
        a: (_tagName, attributes) => {
          const transformed = {};
          const href = canonicalizeHref(attributes.href);
          if (href) transformed.href = href;
          if (typeof attributes.title === 'string') transformed.title = attributes.title;
          transformed.rel = 'nofollow noopener noreferrer';
          retainedAttributes.push(...Object.values(transformed));
          return {tagName: 'a', attribs: transformed};
        },
      },
    });
  } catch {
    fail('sanitizer', number);
  }

  if (hasInvalidUnicode(safeBodyHtml) || utf8Bytes(JSON.stringify(safeBodyHtml)) > COMMUNITY_LIMITS.body) {
    fail('safeBodyHtml-size', number);
  }
  const plainText = sanitizeHtml(safeBodyHtml, {allowedTags: [], allowedAttributes: {}});
  scan(plainText, 'body', number);
  for (const attribute of retainedAttributes) scan(attribute, 'body-attribute', number);
  return safeBodyHtml;
}

function normalizeAuthor(author, number) {
  if (author == null) return null;
  if (!author || typeof author !== 'object' || Array.isArray(author)) fail('author', number);
  const login = boundedString(author.login, 'author-login', COMMUNITY_LIMITS.authorLogin, number);
  if (!/^[A-Za-z0-9-]{1,39}$/.test(login)) fail('author-login', number);
  scan(login, 'author-login', number);

  const avatarUrl = author.avatarUrl;
  if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
    boundedString(avatarUrl, 'avatar-url', COMMUNITY_LIMITS.avatarUrl, number);
    let parsed;
    try {
      parsed = new URL(avatarUrl);
    } catch {
      fail('avatar-url', number);
    }
    if (
      parsed.protocol !== 'https:' ||
      !['avatars.githubusercontent.com', 'githubusercontent.com'].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password
    ) {
      fail('avatar-url', number);
    }
  }
  return {login};
}

function normalizeLabels(rawLabels, number) {
  const labels = rawLabels?.nodes ?? rawLabels ?? [];
  if (!Array.isArray(labels) || labels.length > COMMUNITY_LIMITS.labels) fail('labels', number);
  return labels.map((label) => {
    if (!label || typeof label !== 'object' || Array.isArray(label)) fail('label', number);
    const name = boundedString(label.name, 'label-name', COMMUNITY_LIMITS.labelName, number);
    if (utf8Bytes(name) > CATALOG_LIMITS.label) fail('label-name', number);
    scan(name, 'label-name', number);
    if (typeof label.color !== 'string' || !/^[0-9A-Fa-f]{6}$/.test(label.color)) {
      fail('label-color', number);
    }
    return {name, color: label.color.toLowerCase()};
  });
}

function normalizedReactionVotes(rawGroups, number) {
  const groups = rawGroups ?? [];
  if (!Array.isArray(groups)) fail('reaction-groups', number);
  let thumbsUp = 0;
  for (const group of groups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) fail('reaction-group', number);
    const count = group.reactors?.totalCount ?? 0;
    safeInteger(count, 'reaction-count', number);
    if (group.content === 'THUMBS_UP') thumbsUp += count;
    if (thumbsUp > MAX_INTEGER) fail('votes', number);
  }
  return thumbsUp;
}

export function normalizeDiscussion(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('record');
  const number = safeInteger(raw.number, 'number', null, {minimum: 1});
  const title = boundedString(raw.title, 'title', COMMUNITY_LIMITS.title, number);
  scan(title, 'title', number);
  const upvotes = safeInteger(raw.upvoteCount ?? 0, 'upvote-count', number);
  const reactionVotes = normalizedReactionVotes(raw.reactionGroups, number);
  if (upvotes + reactionVotes > MAX_INTEGER) fail('votes', number);

  const item = {
    number,
    title,
    url: `${CANONICAL_REPOSITORY}/discussions/${number}`,
    safeBodyHtml: sanitizeDiscussionHtml(raw.bodyHTML, number),
    createdAt: normalizeTimestamp(raw.createdAt, 'created-at', number),
    updatedAt: normalizeTimestamp(raw.updatedAt, 'updated-at', number),
    isAnswered: safeBoolean(raw.isAnswered, 'is-answered', number),
    locked: safeBoolean(raw.locked, 'locked', number),
    author: normalizeAuthor(raw.author, number),
    replies: safeInteger(raw.comments?.totalCount ?? 0, 'reply-count', number),
    labels: normalizeLabels(raw.labels, number),
    votes: upvotes + reactionVotes,
  };
  if (utf8Bytes(item.url) > COMMUNITY_LIMITS.url) fail('url', number);
  return item;
}

function safeDiagnosticNumber(raw) {
  return Number.isInteger(raw?.number) && raw.number >= 1 && raw.number <= MAX_INTEGER
    ? String(raw.number)
    : 'unknown';
}

export function logQuarantine(logger, section, number, rule) {
  logger(`[hub-community] quarantined ${section} discussion ${number} (${rule}).`);
}

function sortSection(section, items) {
  return [...items].sort(
    section === 'questions'
      ? (a, b) => b.updatedAt.localeCompare(a.updatedAt)
      : (a, b) => b.votes - a.votes || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function prepareCommunityContent(rawContent, {logger = console.warn} = {}) {
  const source = rawContent?.source;
  if (source !== 'sample' && source !== 'github') fail('source');
  const result = {source};

  for (const section of ['questions', 'ideas']) {
    const rawItems = rawContent[section];
    if (!Array.isArray(rawItems) || rawItems.length > COMMUNITY_LIMITS.fetchedPerSection) {
      fail(`${section}:record-count`);
    }
    const items = [];
    let unavailableCount = 0;
    for (const raw of rawItems) {
      try {
        items.push(normalizeDiscussion(raw));
      } catch (error) {
        if (source === 'sample') {
          const rule = error instanceof CommunityValidationError ? error.rule : 'validation';
          fail(`${section}:${rule}`, error.discussionNumber);
        }
        const rule = error instanceof CommunityValidationError ? error.rule : 'validation';
        logQuarantine(logger, section, safeDiagnosticNumber(raw), rule);
        unavailableCount += 1;
      }
    }

    const sorted = sortSection(section, items);
    if (sorted.length > COMMUNITY_LIMITS.recordsPerSection) {
      if (source === 'sample') fail(`${section}:record-count`);
      for (const item of sorted.splice(COMMUNITY_LIMITS.recordsPerSection)) {
        logQuarantine(logger, section, item.number, 'aggregate-size');
        unavailableCount += 1;
      }
    }
    result[section] = {
      items: sorted,
      unavailableCount: Math.min(unavailableCount, COMMUNITY_LIMITS.fetchedPerSection),
    };
  }

  Object.defineProperty(result, VALIDATED, {value: true});
  return result;
}

export function isPreparedCommunityContent(content) {
  return Boolean(content?.[VALIDATED]);
}

export function validateCommunitySearch(searchItems) {
  const records = searchItems.map((item) => ({
    id: `${item.section === 'questions' ? 'question' : 'idea'}/${item.number}`,
    title: item.title,
    summary: `Community ${item.section === 'questions' ? 'question' : 'idea'} stored in GitHub Discussions.`,
    route: item.route,
    apiFamily: 'cross-cutting',
    language: 'none',
    contentType: item.section === 'questions' ? 'question' : 'idea',
    labels: item.labels,
  }));
  for (const section of ['questions', 'ideas']) {
    validateCatalogRecords(records.filter((record) => record.contentType === (section === 'questions' ? 'question' : 'idea')), {
      maxRecords: COMMUNITY_LIMITS.recordsPerSection,
      maxBytes: COMMUNITY_LIMITS.searchModule,
      label: `community-${section}`,
    });
  }
  if (utf8Bytes(JSON.stringify(searchItems)) > COMMUNITY_LIMITS.searchModule) {
    fail('community-search:aggregate-size');
  }
  return searchItems;
}
