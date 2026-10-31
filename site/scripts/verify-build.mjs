import {readdir, readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const MAX_BLOG_ROUTE_BYTES = 512 * 1024;

const SCANNED_EXTENSIONS = new Set(['.html', '.js', '.json']);
const SAFE_PUBLIC_VALUES = new Set(['ATVPDKIKX0DER', 'AUTHORIZATION']);
const SENSITIVE_PATTERNS = [
  ['lwa-token', /\bAtz[ar]\|[^\s"'`<]+/g],
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
const ACCEPTED_PLACEHOLDER = /^(?:<[A-Za-z0-9_-]+>|\$\{[A-Z0-9_]+\}|\{\{[A-Za-z0-9_-]+\}\}|YOUR_[A-Z0-9_]+|REPLACE_ME|EXAMPLE|[xX]{4,})$/;
const LICENSE_ROUTES = [
  {
    route: '/licenses/selling-partner-api-models/license',
    source: 'content/selling-partner-api-models/LICENSE',
  },
  {
    route: '/licenses/selling-partner-api-models/notice',
    source: 'content/selling-partner-api-models/NOTICE',
  },
  {
    route: '/licenses/selling-partner-api-samples/license',
    source: 'content/selling-partner-api-samples/LICENSE',
  },
];

async function walkFiles(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, {withFileTypes: true})) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  await walk(directory);
  return files;
}

function decodeUtf8(buffer, label) {
  try {
    return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  } catch {
    throw new Error(`Generated asset verification failed: ${label}: invalid-utf8`);
  }
}

export function sensitiveRules(text) {
  const rules = new Set();
  for (const [name, pattern] of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (!SAFE_PUBLIC_VALUES.has(match[0])) rules.add(name);
    }
  }

  const assignment = /\b([A-Za-z][A-Za-z0-9_.-]{0,63})\s*(?:=|:|=>)\s*(["'`])([^"'`\r\n]*)\2/g;
  for (const match of text.matchAll(assignment)) {
    const key = match[1].replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    if (SENSITIVE_KEYS.has(key) && match[3] && !ACCEPTED_PLACEHOLDER.test(match[3])) {
      rules.add('sensitive-assignment');
    }
  }
  return [...rules].sort();
}

function routeDefinitions(source) {
  const routes = [];
  const pattern = /path:\s*'([^']+)'[\s\S]*?component:\s*ComponentCreator\('\1',\s*'([^']+)'\)/g;
  for (const match of source.matchAll(pattern)) routes.push({route: match[1], suffix: match[2]});
  return routes;
}

function chunkIds(value, result = new Set()) {
  if (typeof value === 'string' && /^[0-9a-f]{8}$/.test(value)) result.add(value);
  else if (Array.isArray(value)) value.forEach((item) => chunkIds(item, result));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => chunkIds(item, result));
  return result;
}

function routeChunkMap(routesSource, routeChunks) {
  const result = new Map();
  for (const {route, suffix} of routeDefinitions(routesSource)) {
    const metadata = routeChunks[`${route}-${suffix}`];
    if (metadata) result.set(route, chunkIds(metadata));
  }
  return result;
}

function htmlDecode(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function verifyLicenses({buildDir, repositoryRoot}) {
  const presence = await Promise.all(LICENSE_ROUTES.map(async ({route}) => {
    const filePath = path.join(buildDir, route.slice(1), 'index.html');
    try {
      return (await stat(filePath)).isFile();
    } catch {
      return false;
    }
  }));
  if (!presence.some(Boolean)) return;
  if (!presence.every(Boolean)) throw new Error('License route verification failed: incomplete-route-set');

  for (const {route, source} of LICENSE_ROUTES) {
    const sourceText = decodeUtf8(await readFile(path.join(repositoryRoot, source)), source);
    const html = decodeUtf8(await readFile(path.join(buildDir, route.slice(1), 'index.html')), route);
    const decoded = htmlDecode(html);
    if (!decoded.includes(sourceText)) throw new Error(`License route verification failed: ${route}: text-mismatch`);
  }
}

export async function verifyBuild({
  siteDir = path.resolve('.'),
  buildDir = path.resolve('build'),
  generatedDir = path.resolve('.docusaurus'),
  repositoryRoot = path.resolve('..'),
} = {}) {
  const resolvedSiteDir = await realpath(siteDir);
  const resolvedBuildDir = await realpath(buildDir);
  const resolvedGeneratedDir = await realpath(generatedDir);
  if (!resolvedBuildDir.startsWith(`${resolvedSiteDir}${path.sep}`)) {
    throw new Error('Generated asset verification failed: build directory escapes site');
  }

  const routesSource = await readFile(path.join(resolvedGeneratedDir, 'routes.js'), 'utf8');
  const routeChunks = JSON.parse(await readFile(path.join(resolvedGeneratedDir, 'routesChunkNames.json'), 'utf8'));
  const chunksByRoute = routeChunkMap(routesSource, routeChunks);
  const referenceCounts = new Map();
  for (const chunks of chunksByRoute.values()) {
    for (const chunk of chunks) referenceCounts.set(chunk, (referenceCounts.get(chunk) || 0) + 1);
  }

  const buildFiles = await walkFiles(resolvedBuildDir);
  const chunkAssets = new Map();
  for (const filePath of buildFiles) {
    if (!['.js', '.json'].includes(path.extname(filePath))) continue;
    const chunk = path.basename(filePath).match(/^([0-9a-f]{8})[.-]/)?.[1];
    if (!chunk) continue;
    const assets = chunkAssets.get(chunk) || [];
    assets.push(filePath);
    chunkAssets.set(chunk, assets);
  }

  let blogRoutes = 0;
  for (const [route, chunks] of chunksByRoute) {
    if (
      !route.startsWith('/blog/') ||
      route.startsWith('/blog/tags/') ||
      route === '/blog/tags' ||
      route === '/blog/archive' ||
      route === '/blog/authors'
    ) continue;
    blogRoutes += 1;
    let routeBytes = 0;
    for (const chunk of chunks) {
      if (referenceCounts.get(chunk) !== 1) continue;
      for (const asset of chunkAssets.get(chunk) || []) routeBytes += (await stat(asset)).size;
    }
    if (routeBytes > MAX_BLOG_ROUTE_BYTES) {
      throw new Error(`Blog route payload exceeds ${MAX_BLOG_ROUTE_BYTES} bytes: ${route}: ${routeBytes} bytes`);
    }
  }
  if (blogRoutes === 0) throw new Error('Blog route payload verification failed: no-blog-routes');

  for (const filePath of buildFiles) {
    if (!SCANNED_EXTENSIONS.has(path.extname(filePath))) continue;
    const relative = path.relative(resolvedBuildDir, filePath).split(path.sep).join('/');
    const text = decodeUtf8(await readFile(filePath), relative);
    const rules = sensitiveRules(text);
    if (rules.length) {
      throw new Error(`Generated asset verification failed: ${relative}: ${rules.join(',')}`);
    }
  }

  await verifyLicenses({buildDir: resolvedBuildDir, repositoryRoot});
  return {assets: buildFiles.filter((file) => SCANNED_EXTENSIONS.has(path.extname(file))).length, blogRoutes};
}

async function main() {
  const result = await verifyBuild();
  console.log(`Verified ${result.blogRoutes} blog routes and ${result.assets} generated assets.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
