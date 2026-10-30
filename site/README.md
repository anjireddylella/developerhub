# SP-API Developer Hub (proof of concept)

Docusaurus site that serves as the front door for SP-API developers: docs, hot topics (blog), community questions and ideas backed by GitHub Discussions, and a resources directory. Analytics go to Amazon CloudWatch RUM.

## Run locally

```bash
cd site
npm ci
npm start          # dev server at http://localhost:3000
npm run build      # production build into build/
npm run serve      # serve the production build
```

With no environment variables set, the site uses sample discussions, shows a notice where Giscus replies would appear, and logs analytics events to the browser console.

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| Docs | `docs/` | Markdown. Sidebar is generated from the folder. |
| Hot topics | `blog/` | One Markdown file per post. Authors in `blog/authors.yml`. |
| Questions and ideas | `plugins/community/` | Build-time plugin reads GitHub Discussions and creates `/community/questions/<n>` and `/community/ideas/<n>` pages. |
| Replies and votes | `src/components/GiscusThread/` | Giscus embedded per thread (`mapping="number"`). Votes = 👍 reactions + GitHub upvotes. |
| Helpful votes | `src/components/Helpful/`, `src/theme/*/Footer` | 👍/👎 on every doc and blog post, sent to RUM. |
| Analytics | `src/clientModules/analytics.js`, `src/lib/analytics.js` | Page views, outbound clicks, helpful votes, community actions. Sensitive-looking values are redacted before sending. |
| Resources | `src/data/resources.js` | Edit the list; the page renders it. |
| Settings | `hub.config.js` | Everything is read from environment variables. |

## Environment variables

| Variable | Used at | Purpose |
|---|---|---|
| `HUB_GITHUB_REPO` | build | `owner/name` of the repo with Discussions. Default `amzn/selling-partner-api-hub`. |
| `HUB_GITHUB_TOKEN` | build | Token with `discussions: read`. In CI this is the workflow `GITHUB_TOKEN`. Never sent to the browser. |
| `HUB_QA_CATEGORY_SLUG`, `HUB_IDEAS_CATEGORY_SLUG` | build | Discussion category slugs. Defaults `q-a` and `ideas`. |
| `GISCUS_REPO_ID` | build | From https://giscus.app/. Enables in-page replies and voting. |
| `RUM_APP_MONITOR_ID`, `RUM_IDENTITY_POOL_ID`, `RUM_REGION` | build | CloudWatch RUM app monitor. Leave unset to disable analytics. |
| `RUM_SESSION_SAMPLE_RATE` | build | 0 to 1. Default 1. |

## Deploy

`.github/workflows/deploy.yml` builds with live discussions and deploys to an Amplify app created with "Deploy without Git", using GitHub OIDC (no long-lived AWS keys). It runs on pushes to `main`, on discussion and comment events, and hourly to pick up new votes. `.github/workflows/pr-check.yml` builds PRs with sample data and no secrets.

## Analytics and consent

RUM runs with cookies off, so sessions are not linked across page loads. Before launch:

1. Confirm the cookie-consent tool for this site (AWS sites use Shortbread) and call `allowCookies(true)` on the RUM client after consent.
2. Turn on custom events in the RUM app monitor, or the helpful-vote and click events are dropped.
3. Review `SENSITIVE_PATTERNS` in `src/lib/analytics.js` with privacy/security.

## Not built yet

- Search (local search plugin, with zero-result queries sent to RUM)
- Nightly export of GitHub traffic for the models and samples repos
- Community health metrics (unanswered %, time to first answer)
- Content Security Policy headers on the Amplify app
- Infrastructure template for the Amplify app, RUM monitor, and deploy role
