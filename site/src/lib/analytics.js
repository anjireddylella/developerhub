import {LANGUAGES, sensitiveValueRules, utf8Bytes} from '../../plugins/api-content/catalogValidation.js';
import {loadAnalyticsCatalog} from './contentContext.js';

const MAX_QUEUE_SIZE = 50;
const MAX_ENVELOPE_BYTES = 2048;
const DESTINATION_TYPES = new Set([
  'models_source',
  'samples_source',
  'developer_hub_discussion',
  'official_docs',
  'other',
]);
const COMMUNITY_ACTIONS = new Set(['ask_question', 'submit_idea', 'open_discussion']);
const COMMUNITY_SECTIONS = new Set(['questions', 'ideas', 'hot_topics']);
const COPY_LANGUAGES = new Set(LANGUAGES);
const COMMON_KEYS = [
  'content_id',
  'content_type',
  'api_family',
  'language',
  'selling_partner_scope',
  'developer_type',
];

let rum = null;
let queue = [];
let warnedTransport = false;

export const EVENTS = Object.freeze({
  contentCopy: 'hub_content_copy',
  internalNavigation: 'hub_internal_navigation',
  helpfulVote: 'hub_helpful_vote',
  outboundClick: 'hub_outbound_click',
  communityAction: 'hub_community_action',
});

function warnDropped() {
  if (process.env.NODE_ENV !== 'development') return;
  // eslint-disable-next-line no-console
  console.warn('[analytics] Event did not match the analytics contract.');
}

function warnTransport() {
  if (warnedTransport || process.env.NODE_ENV !== 'development') return;
  warnedTransport = true;
  // eslint-disable-next-line no-console
  console.warn('[analytics] Analytics transport is unavailable.');
}

function exactKeys(value, expected) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actual = Object.keys(value).sort();
  return JSON.stringify(actual) === JSON.stringify([...expected].sort());
}

function currentPathname() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

function commonFields(context) {
  return Object.fromEntries(COMMON_KEYS.map((key) => [key, context[key]]));
}

export function scrub(value) {
  if (typeof value !== 'string') return value;
  if (!sensitiveValueRules(value).length) return value;
  return '[redacted]';
}

function scrubPayload(payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [
    key,
    value && Object.getPrototypeOf(value) === Object.prototype ? scrubPayload(value) : scrub(value),
  ]));
}

function admitEnvelope(kind, name, payload) {
  const clean = scrubPayload(payload);
  if (JSON.stringify(clean) !== JSON.stringify(payload)) {
    warnDropped();
    return null;
  }
  const envelope = kind === 'pageView' ? {pageView: clean} : {type: name, data: clean};
  if (utf8Bytes(JSON.stringify(envelope)) > MAX_ENVELOPE_BYTES) {
    warnDropped();
    return null;
  }
  return Object.freeze({kind, name, payload: Object.freeze(clean)});
}

function send(item, client = rum) {
  if (!client) return false;
  try {
    if (item.kind === 'pageView') client.recordPageView(item.payload);
    else client.recordEvent(item.name, item.payload);
    return true;
  } catch {
    warnTransport();
    return false;
  }
}

function emit(item) {
  if (!item) return false;
  if (rum) return send(item);
  if (process.env.NODE_ENV === 'development') {
    // Development logs contain only the event name and admitted payload.
    // eslint-disable-next-line no-console
    console.info('[analytics]', item.name || 'page_view', item.payload);
    return true;
  }
  if (queue.length < MAX_QUEUE_SIZE) queue.push(item);
  return true;
}

export function setRumClient(client) {
  rum = client || null;
  if (!rum) return;
  const pending = queue;
  queue = [];
  for (const item of pending) send(item, rum);
}

export function getRumClient() {
  return rum;
}

export function recordPageView(pathname = currentPathname()) {
  const context = loadAnalyticsCatalog().resolveContext(pathname);
  const payload = {
    pageId: context.pageId,
    pageAttributes: commonFields(context),
  };
  return emit(admitEnvelope('pageView', null, payload));
}

function buildCustomEvent(type, input, pathname) {
  const catalog = loadAnalyticsCatalog();
  const context = catalog.resolveContext(pathname);
  const common = commonFields(context);

  if (type === EVENTS.contentCopy) {
    if (!exactKeys(input, ['codeId', 'language']) || !catalog.hasCodeId(input.codeId) || !COPY_LANGUAGES.has(input.language)) {
      return null;
    }
    return {...common, language: input.language, code_id: input.codeId};
  }
  if (type === EVENTS.helpfulVote) {
    if (!exactKeys(input, ['helpful']) || typeof input.helpful !== 'boolean') return null;
    return {...common, helpful: input.helpful};
  }
  if (type === EVENTS.outboundClick) {
    const keys = input?.resourceId === undefined ? ['destinationType'] : ['destinationType', 'resourceId'];
    if (!exactKeys(input, keys) || !DESTINATION_TYPES.has(input.destinationType)) return null;
    if (input.resourceId !== undefined && !catalog.hasResourceId(input.resourceId)) return null;
    return {
      ...common,
      destination_type: input.destinationType,
      ...(input.resourceId === undefined ? {} : {resource_id: input.resourceId}),
    };
  }
  if (type === EVENTS.communityAction) {
    if (
      !exactKeys(input, ['action', 'section']) ||
      !COMMUNITY_ACTIONS.has(input.action) ||
      !COMMUNITY_SECTIONS.has(input.section)
    ) return null;
    return {...common, action: input.action, section: input.section};
  }
  return null;
}

export function track(type, input = {}, pathname = currentPathname()) {
  const payload = buildCustomEvent(type, input, pathname);
  if (!payload) {
    warnDropped();
    return false;
  }
  return emit(admitEnvelope('event', type, payload));
}

export function trackInternalNavigation(
  navigationId,
  targetPathname,
  pathname = currentPathname(),
) {
  const catalog = loadAnalyticsCatalog();
  if (!catalog.hasNavigationId(navigationId)) {
    warnDropped();
    return false;
  }
  const target = catalog.resolveContext(targetPathname);
  if (target.pageId === '/unknown') {
    warnDropped();
    return false;
  }
  const source = catalog.resolveContext(pathname);
  const payload = {
    ...commonFields(source),
    navigation_id: navigationId,
    target_content_id: target.content_id,
  };
  return emit(admitEnvelope('event', EVENTS.internalNavigation, payload));
}

export function resetAnalyticsForTests() {
  rum = null;
  queue = [];
  warnedTransport = false;
}

export function queuedAnalyticsForTests() {
  return [...queue];
}
