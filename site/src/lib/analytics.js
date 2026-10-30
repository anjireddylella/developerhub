// Thin wrapper around Amazon CloudWatch RUM.
// Components call track(); if RUM is not configured (local dev, or before the
// app monitor exists) events are logged to the console in development and
// dropped in production.

let rum = null;
const queue = [];

export function setRumClient(client) {
  rum = client;
  while (queue.length) {
    const [type, data] = queue.shift();
    rum.recordEvent(type, data);
  }
}

export function getRumClient() {
  return rum;
}

// Strip values that look like seller, order, or token data before anything
// leaves the browser. Developers paste these into search boxes and URLs.
const SENSITIVE_PATTERNS = [
  /Atz[ar]\|[^\s"']+/g, // LWA access / refresh tokens
  /\b\d{3}-\d{7}-\d{7}\b/g, // Amazon order IDs
  /\bA[0-9A-Z]{9,20}\b/g, // seller / merchant / marketplace-style IDs
  /[\w.+-]+@[\w-]+\.[\w.]+/g, // email addresses
];

export function scrub(value) {
  if (typeof value !== 'string') return value;
  return SENSITIVE_PATTERNS.reduce((v, re) => v.replace(re, '[redacted]'), value);
}

function scrubObject(data) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, scrub(v)]));
}

export function track(type, data = {}) {
  const clean = scrubObject(data);
  if (rum) {
    rum.recordEvent(type, clean);
    return;
  }
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.info('[analytics]', type, clean);
    return;
  }
  // RUM may still be initializing; keep a small buffer.
  if (queue.length < 50) queue.push([type, clean]);
}

export const EVENTS = {
  helpfulVote: 'hub_helpful_vote',
  outboundClick: 'hub_outbound_click',
  communityAction: 'hub_community_action',
};
