import {
  ANALYTICS_CATALOG_LIMITS,
  utf8Bytes,
  validateAnalyticsCatalog,
} from '../../plugins/api-content/catalogValidation.js';

const UNKNOWN_CONTEXT = Object.freeze({
  pageId: '/unknown',
  content_id: 'unknown',
  content_type: 'unknown',
  api_family: 'unknown',
  language: 'unknown',
  selling_partner_scope: 'unknown',
  developer_type: 'unknown',
});

let cachedFacade = null;
let warned = false;

function warnInvalidCatalog() {
  if (warned || process.env.NODE_ENV !== 'development') return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn('[analytics] Analytics catalog is unavailable.');
}

function normalizePathname(pathname) {
  if (typeof pathname !== 'string') return null;
  const withoutQuery = pathname.split(/[?#]/, 1)[0];
  if (!withoutQuery.startsWith('/') || /[^\x00-\x7f]/.test(withoutQuery)) return null;
  if (/%(?:2e|2f|5c)/i.test(withoutQuery)) return null;
  const normalized = withoutQuery.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
  if (normalized.includes('/./') || normalized.includes('/../') || normalized.endsWith('/..')) return null;
  return normalized;
}

function freezeCatalog(catalog) {
  for (const context of catalog.contexts) Object.freeze(context);
  Object.freeze(catalog.contexts);
  Object.freeze(catalog.codeIds);
  Object.freeze(catalog.navigationIds);
  Object.freeze(catalog.resourceIds);
  return Object.freeze(catalog);
}

function createFacade(catalog) {
  const staticContexts = new Map();
  let questions = null;
  let ideas = null;
  for (const context of catalog?.contexts || []) {
    if (context.route === '/community/questions/:id') questions = context;
    else if (context.route === '/community/ideas/:id') ideas = context;
    else staticContexts.set(context.route, context);
  }
  const codeIds = new Set(catalog?.codeIds || []);
  const navigationIds = new Set(catalog?.navigationIds || []);
  const resourceIds = new Set(catalog?.resourceIds || []);

  return Object.freeze({
    resolveContext(pathname) {
      const normalized = normalizePathname(pathname);
      if (!normalized) return UNKNOWN_CONTEXT;
      const exact = staticContexts.get(normalized);
      if (exact) return exact;
      if (/^\/community\/questions\/\d+$/.test(normalized)) return questions || UNKNOWN_CONTEXT;
      if (/^\/community\/ideas\/\d+$/.test(normalized)) return ideas || UNKNOWN_CONTEXT;
      return UNKNOWN_CONTEXT;
    },
    hasCodeId(id) {
      return typeof id === 'string' && codeIds.has(id);
    },
    hasNavigationId(id) {
      return typeof id === 'string' && navigationIds.has(id);
    },
    hasResourceId(id) {
      return typeof id === 'string' && resourceIds.has(id);
    },
  });
}

function emptyFacade() {
  return createFacade(null);
}

export function loadAnalyticsCatalog() {
  if (cachedFacade) return cachedFacade;
  if (typeof document === 'undefined') return emptyFacade();
  const element = document.getElementById('hub-analytics-catalog');
  if (!element) return emptyFacade();
  const text = element.textContent || '';
  if (!text || utf8Bytes(text) > ANALYTICS_CATALOG_LIMITS.totalBytes) {
    warnInvalidCatalog();
    return emptyFacade();
  }
  try {
    const catalog = freezeCatalog(validateAnalyticsCatalog(JSON.parse(text)));
    cachedFacade = createFacade(catalog);
    return cachedFacade;
  } catch {
    warnInvalidCatalog();
    return emptyFacade();
  }
}

export function resetAnalyticsCatalogForTests() {
  cachedFacade = null;
  warned = false;
}
