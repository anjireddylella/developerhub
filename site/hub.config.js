// Single place for hub-specific settings.
// Values come from environment variables at build time so the same source
// works locally (sample data, no analytics) and in CI (live data, RUM on).
// None of these values are secrets: Giscus IDs and RUM IDs are public by
// design and end up in the browser bundle. The GitHub token is only used at
// build time and is never passed to the client.

const env = process.env;

const [owner, name] = 'anjireddylella/developerhub'.split('/');

export default {
  github: {
    owner,
    name,
    // Discussion category slugs as shown in GitHub URLs (/discussions/categories/<slug>).
    categories: {
      questions: env.HUB_QA_CATEGORY_SLUG || 'q-a',
      ideas: env.HUB_IDEAS_CATEGORY_SLUG || 'ideas',
    },
  },

  // https://giscus.app/ gives you these after the Giscus app is installed.
  giscus: {
    repoId: env.GISCUS_REPO_ID || '',
  },

  // Amazon CloudWatch RUM app monitor. Leave empty to disable analytics.
  rum: {
    appMonitorId: env.RUM_APP_MONITOR_ID || '',
    identityPoolId: env.RUM_IDENTITY_POOL_ID || '',
    region: env.RUM_REGION || 'us-east-1',
    // Fraction of sessions to record (0..1). Lower it if cost becomes a concern.
    sessionSampleRate: Number(env.RUM_SESSION_SAMPLE_RATE || 1),
  },
};
