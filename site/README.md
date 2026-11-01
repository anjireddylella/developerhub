# SP-API Developer Hub (proof of concept)

Docusaurus site that serves as the front door for SP-API developers: docs, curated API experiences, hot topics, local search, community questions and ideas backed by GitHub Discussions, and a resources directory. Optional analytics go to Amazon CloudWatch RUM.

## Run locally

```bash
cd site
npm ci
npm run validate:content
npm test
npm run build      # production build into build/
npm run serve      # serve the production build
npm start          # development server at http://localhost:3000
```

With no environment variables set, the site uses sample discussions, shows a notice where Giscus replies would appear, and keeps RUM disabled. Content validation, tests, build, and local preview require no upstream-repository access or AWS access.

## Routes

| Route | Content |
|---|---|
| `/docs` | Authored guides |
| `/apis` | Curated index for Data Kiosk, Orders, Vehicles, and Easy Ship |
| `/apis/<slug>` | Native model summary, exact recipe excerpts, sample overview, related topics, and community actions |
| `/blog` | Hot topics and announcements |
| `/search` | Local metadata search across APIs, models, recipes, samples, docs, blog posts, resources, and community titles |
| `/community/questions`, `/community/ideas` | GitHub Discussions-backed community lists |
| `/resources` | Curated resource directory |

Search runs only in the browser against a bounded build-time catalog. It does not index model bodies, code, Discussion bodies, or search text, and it does not send the query to analytics.

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| Docs | `docs/` | Markdown. Sidebar is generated from the folder. |
| API content | `api-content.config.js`, `plugins/api-content/` | Build-time plugin verifies pinned local sources, creates API and license routes, and emits bounded search and analytics catalogs. |
| Hot topics | `blog/`, `templates/hot-topic.md`, `scripts/new-hot-topic.mjs` | One validated Markdown file per post. See [Hot-topic authoring](#hot-topic-authoring). |
| Content validation | `scripts/validate-content.mjs` | Checks metadata, attribution, links, ownership, provenance, size, and duplicate IDs before builds. |
| Questions and ideas | `plugins/community/` | Build-time plugin reads GitHub Discussions when configured and creates `/community/questions/<n>` and `/community/ideas/<n>` pages. Invalid live records are quarantined. |
| Replies and votes | `src/components/GiscusThread/` | Giscus embedded per thread (`mapping="number"`). Votes = 👍 reactions + GitHub upvotes. |
| Helpful votes | `src/components/Helpful/`, `src/theme/*/Footer` | 👍/👎 on docs, blog posts, and API pages; still works when RUM is unavailable. |
| Analytics | `src/clientModules/analytics.js`, `src/lib/analytics.js`, `src/lib/contentContext.js` | Bounded page views, copy, internal navigation, outbound, helpful, and community events with generated content context. |
| Resources | `src/data/resources.js` | Stable IDs support search anchors and privacy-safe outbound events. |
| Settings | `hub.config.js` | Community categories, Giscus, and optional RUM are read from environment variables. |

## Pinned local sources

The POC never fetches source content during validation or build. It reads immutable copies already checked in under `../content/`:

- `selling-partner-api-models` commit `db2936aa19f4b48185173c385c51ab115166f221`
- `selling-partner-api-samples` commit `21589c4a467d433c2cb95e80ae61eb28213f2d67`

`api-content.config.js` selects exact model operations, recipe ranges, samples, source URLs, commits, and SHA-256 digests. The plugin verifies those constraints before emitting browser data. Pages show bounded model projections and exact labeled recipe excerpts, link to pinned originals, and publish the applicable license material locally. Do not update the snapshots as part of ordinary page or hot-topic authoring.

## Hot-topic authoring

Create and edit one file:

```bash
npm run new:hot-topic -- \
  --title "Migrate to Orders API vNext" \
  --description "What changes and how to migrate." \
  --api-family orders \
  --scope both \
  --provenance original
```

The generated metadata makes the post discoverable, searchable, feedback-enabled, and analytics-aware without a catalog or configuration edit. Adapted posts require source Discussion/category fields and visible matching attribution. An optional engagement Discussion must belong to `anjireddylella/developerhub`. The command never creates a Discussion or changes an upstream repository. `templates/hot-topic.md` shows every front-matter field.

## Environment variables

| Variable | Used at | Purpose |
|---|---|---|
| `HUB_GITHUB_TOKEN` | build | Token with `discussions: read`. Never sent to the browser. Without it, local and PR builds use checked-in sample data. |
| `HUB_QA_CATEGORY_SLUG`, `HUB_IDEAS_CATEGORY_SLUG` | build | Discussion category slugs. Defaults `q-a` and `ideas`. |
| `GISCUS_REPO_ID` | build | From https://giscus.app/. Enables in-page replies and voting. |
| `RUM_APP_MONITOR_ID`, `RUM_IDENTITY_POOL_ID`, `RUM_REGION` | build | CloudWatch RUM app monitor. Leave unset to disable analytics. |
| `RUM_SESSION_SAMPLE_RATE` | build | 0 to 1. Default 1. |

The canonical community repository is `anjireddylella/developerhub`; it is not selected by an environment variable.

## Analytics and privacy

Every admitted event receives build-generated context: `content_id`, `content_type`, `api_family`, `language`, `selling_partner_scope`, and `developer_type`. `developer_type` remains `unknown` because the POC does not ask the developer to identify it and never infers it. Events use allowlisted IDs and enums; raw code, clipboard text, search text, link labels, Discussion bodies, GitHub identities, seller/vendor IDs, query strings, credentials, and arbitrary errors are excluded. Automatic RUM error, performance, and X-Ray telemetry is disabled.

RUM runs with cookies off, so sessions are not linked across page loads. Before launch:

1. Confirm the cookie-consent tool for this site (AWS sites use Shortbread) and call `allowCookies(true)` on the RUM client only after consent.
2. Turn on custom events in the RUM app monitor, or custom content events are dropped.
3. Have privacy and security review the event allowlist and sensitive-value checks in `src/lib/analytics.js`.

## Pull-request preview

`.github/workflows/pr-check.yml` uses sample data and `contents: read` only. It runs validation, tests, and build, then uploads only `site/build/` as `developer-hub-preview` for three days. It has no AWS or deployment step. Download the artifact from the workflow summary, unzip it, and run `npx serve developer-hub-preview` locally.

## Deploy

`.github/workflows/deploy.yml` builds with live discussions and deploys to an Amplify app created with "Deploy without Git", using GitHub OIDC (no long-lived AWS keys). It runs on pushes to `main`, on discussion and comment events, and hourly to pick up new votes. `.github/workflows/pr-check.yml` builds PRs with sample data and no secrets. Content authors do not run deployment commands or make AWS changes.

## Not built yet

- Automated, reviewable production synchronization from allowlisted upstream paths
- Nightly export of GitHub traffic for the models and samples repositories
- Community health metrics such as unanswered share and time to first answer
- Content Security Policy headers on the Amplify app
- Infrastructure template for the Amplify app, RUM monitor, and deploy role
