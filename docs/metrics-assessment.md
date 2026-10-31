# SP-API content metrics assessment

**Status:** Proposal for the Developer Hub demo. This is not a final report. It shows the team and our manager what the hub could measure and what that would let us decide.

**Question:** Which of the content we publish do developers actually use, what is working, and what needs to improve?

**Short answer:** The proof of concept can now identify the API, content type, language, and selling-partner scope of admitted hub events. It still cannot establish production usage or whether content led to working code. The priorities below separate what the demo implements from later production measurement.

See [Developer Hub content strategy](content-strategy.md) for the ownership, publication, synchronization, and portal-boundary decisions that this assessment measures.

Sources: [selling-partner-api-models](https://github.com/amzn/selling-partner-api-models), [selling-partner-api-samples](https://github.com/amzn/selling-partner-api-samples), and the hub code in `site/` and `tools/demo-traffic/`. Repository numbers are as of October 31, 2026.

---

## 0. Scope and ground rules

**All changes happen in the Developer Hub repository only.**

`amzn/selling-partner-api-models` and `amzn/selling-partner-api-samples` are public, published by the SP-API team, and used by many external developers. This project makes **no changes** to them. That rule covers commits, pull requests, issues, labels, comments, settings, and workflow files.

What "part of the hub" means:

- In this POC, four curated API experiences appear as native hub pages: Data Kiosk, Orders, Vehicles, and Easy Ship. The pages include bounded model summaries, selected exact recipe excerpts, sample overviews where available, and pinned source links.
- The POC build reads immutable local snapshots at model commit `db2936aa19f4b48185173c385c51ab115166f221` and samples commit `21589c4a467d433c2cb95e80ae61eb28213f2d67`. It makes no upstream request.
- Each hub page links to the exact original file on GitHub, which remains the source of truth. The hub also publishes the applicable license material.
- A future production sync would be read-only and open a reviewable pull request only in Developer Hub, as described in the [content strategy](content-strategy.md). It would never write to either upstream repository.
- Every metric in this document is collected by the hub, or read from public or read-only sources. None requires a change to the two repositories.

Where this assessment found problems in those repositories (section 2.1), the hub works around them in its own pages. The findings go to the repository owners as a note. We do not fix them ourselves.

**Implemented scope:** This demo intentionally uses four APIs and selected source material rather than generating the full upstream catalogs. Full-catalog ingestion remains future production work.

---

## 1. What we publish

| Repository | What it is | Inventory | GitHub signals |
|---|---|---|---|
| selling-partner-api-models | Reference catalog | 57 API models, 4 schemas (Data Kiosk, Feeds, Notifications, Reports), LWA auth helpers in 5 languages, documents helper, Postman collection | 923 stars, 790 forks, 3,934 issues (247 open), 102 PRs |
| selling-partner-api-samples | Learning catalog | Code recipes (Java 10 areas, Python 5, PHP 4, C# none), 14 sample-solution folders, local AI sandbox, `@amazon-sp-api-release/sp-api-dev-mcp` (releases v1.0.1 to v1.0.5) | 216 stars, 89 forks, 19 issues (1 open), 539 PRs |

Other channels: YouTube videos, hot topics (blog), and GitHub Discussions questions and ideas. These were not reviewed for this assessment.

Two developer types use this content:

- **Solution providers** build apps that many sellers or vendors use.
- **Private developers** build for their own account.

The POC records `developer_type: unknown`. A future system may distinguish these groups only through an explicit developer choice. `selling_partner_scope` is separate metadata about content applicability.

## 2. Why the current signals fall short

| Signal | What it tells us | What it hides |
|---|---|---|
| Stars and forks | Someone bookmarked or copied a whole repository | Which of the 57 models or 14 samples; whether it worked; which developer type used it. Models forks mostly mean "generating a client." |
| Models issues | Ongoing confusion (247 open) | Which API, because issues are not labeled by model |
| Samples issues | Almost nothing (19 lifetime) | Problems go to Developer Support, so the repo looks healthier than it is |
| GitHub traffic | Views, clones, top 10 paths, top 10 referrers | Kept 14 days only; top 10 paths cannot cover 57 models |
| Sample User-Agent | API calls from deployed samples (for example `Data Kiosk Sample App/1.0/Java`) | Lost when code is copied into a real app; opt-out instructions are inaccurate (see 2.1) |

### 2.1 Problems found in the samples repository

For the owners only. The hub does not change this repository.

- `use-cases/README.md` links "B2B Pricing" to `use-cases/pricing-b2b`, which returns 404.
- `use-cases/auth-lifecycle-management` exists but is not listed in the README.
- `METRICS_GUIDE.md` tells Python users to set `OPT_OUT` in `use-cases/data-kiosk/code/python/src/utils/api_utils.py`. That file has no `OPT_OUT` and always sends the User-Agent. The Python Pricing and Merchant Fulfillment samples do have it.

## 3. What the hub captures today

The POC analytics boundary (`site/src/lib/analytics.js`, `site/src/clientModules/analytics.js`) admits only bounded, allowlisted data:

- Native page views with a normalized page ID and generated content context
- `hub_content_copy`: successful copy actions identified by an allowlisted code ID and language
- `hub_internal_navigation`: explicit instrumented navigation identified by an allowlisted navigation ID and target content ID
- `hub_outbound_click`: destination type and an optional allowlisted resource ID, never a raw URL or link label
- `hub_helpful_vote`: yes/no with content context
- `hub_community_action`: allowlisted ask, submit, and open actions by section

Every admitted event has `content_id`, `content_type`, `api_family`, `language`, `selling_partner_scope`, and `developer_type`. The last field is always `unknown` in this POC. `selling_partner_scope` describes content applicability and must never be used to infer developer type.

Automatic RUM performance, JavaScript-error, resource-URL, and X-Ray telemetry is disabled. With RUM unset, the site and all interactions continue to work without contacting AWS. CloudWatch metrics produced by the separate demo-traffic tool are outside this feature and are not evidence that production analytics are enabled.

### 3.1 Current implementation status

| Capability | POC status | Production qualification |
|---|---|---|
| Four curated API pages and pinned exact links | Implemented | Full-catalog refresh and owner review process remain future work |
| Local search across bounded metadata | Implemented | Search text is not collected; a privacy-reviewed demand signal is future work |
| Content-aware page, copy, navigation, outbound, feedback, and community events | Implemented in code | Requires approved RUM configuration and production validation before reporting |
| Helpful-vote reasons | Not implemented | Future P1 work |
| GitHub traffic, issue, support, API-call, YouTube, and npm ingestion | Not implemented | Future read-only integrations requiring owner agreements |
| Consent-based journeys and explicit developer type | Not implemented | Requires consent and privacy decisions |

The two adapted hot topics keep provenance and engagement separate. Orders uses source Discussion [#253](https://github.com/amzn/selling-partner-api-samples/discussions/253) and Developer Hub engagement Discussion [#6](https://github.com/anjireddylella/developerhub/discussions/6). Reports uses source Discussion [#588](https://github.com/amzn/selling-partner-api-samples/discussions/588) and Developer Hub engagement Discussion [#7](https://github.com/anjireddylella/developerhub/discussions/7).

### 3.2 Privacy boundary

The hub does not collect raw code, clipboard text, search text, URL query strings, link text, Discussion bodies, GitHub author or login values, seller or vendor identifiers, marketplace or order identifiers, emails, tokens, credentials, or arbitrary exception text. Allowlisted schemas reject unknown fields before transport, and sensitive-value scanning is defense in depth. Unavailable RUM events are reported as unavailable, never converted to zero activity.

---

## 4. Recommendations by priority

Effort: **S** = under a week, **M** = 1 to 3 weeks, **L** = more than 3 weeks or needs another team.

Items marked **POC implemented** exist in this repository but are not claims of deployed production measurement. The remaining recommendations preserve the future production plan. Every item is a change to the Developer Hub repository, or a read-only data source. None needs a change to the models or samples repositories.

### P0: Do first. Without these, the dashboards cannot answer the main question.

#### 4.1 Generate hub pages for models, recipes, and samples (M, POC implemented for four APIs)

The POC reads checked-in, digest-verified snapshots and creates:

- One curated page per selected API model, with version, selected operations, and exact pinned links
- Exact bounded recipe excerpts grouped by API and language
- Sample-solution overviews where the snapshot provides them, with explicit coverage gaps otherwise

A future production version can expand coverage through the reviewable, read-only synchronization proposal. It must not infer the inventory from a potentially stale README or silently publish unreviewed upstream changes.

**Impact in the demo:** Selected models, recipes, and samples become measurable hub content without exposing full model bodies in browser assets.

#### 4.2 Add a content catalog to every admitted RUM event (M, POC implemented)

The build emits a bounded analytics catalog from API configuration, hot-topic frontmatter, docs, resources, search, and community route patterns. Page views, helpful votes, successful copies, explicit internal navigation, and outbound clicks carry these fields:

| Field | Values |
|---|---|
| `content_id` | Stable slug such as `model/orders`, `recipe/easy-ship/retrieve-order`, or `topic/orders-v2026-01-01-migration` |
| `content_type` | api, model, recipe, sample, doc, hot_topic, announcement, resource, question, idea, search, or unknown |
| `api_family` | Supported family such as orders or data-kiosk, `cross-cutting`, or `unknown` |
| `selling_partner_scope` | seller, vendor, both, or unknown; describes content applicability only |
| `language` | java, python, php, json, graphql, multiple, none, or unknown |
| `developer_type` | solution_provider, private_developer, or unknown; always unknown in this POC |

`developer_type` may change from `unknown` only when a developer explicitly supplies it under an approved consent design. Never derive it from `selling_partner_scope`, GitHub data, cookies, content choice, or behavior.

**Impact in the demo:** Admitted events can be split by API, content type, language, and content scope. This is code-level capability, not proof that a production RUM monitor is receiving events.

#### 4.3 Link to the exact file on GitHub, with content context on the click (S, POC implemented)

Hub pages link to exact files or folders at pinned commits. Outbound events contain the page's generated content context and a destination type; they do not contain a URL or link label.

**Impact in the demo:** The team can distinguish model-source, sample-source, official-documentation, Developer Hub Discussion, and other outbound intent without collecting arbitrary URLs.

#### 4.4 Send the repository findings to the owners (S)

Share section 2.1 with the samples repository owners as a note or message. Do not open an issue or pull request from this project.

**Impact when done:** The owners can fix the broken link and the opt-out mismatch on their own schedule. That fix is needed before anyone uses sample User-Agent counts (4.9) as a metric.

### P1: Do next. These add the "did it help, and what is missing" side.

#### 4.5 Add a reason to "Not helpful" (S)

After 👎, offer one click: outdated, missing sample, my language is not covered, not enough detail, not for my use case.

**Impact when done:** A low helpful rate turns into a specific fix. Show the helpful rate only after a minimum number of votes (for example 20), so a single vote does not rank a page.

#### 4.6 Use privacy-safe search demand signals (M; local search implemented, analytics deferred)

The POC search covers API pages, selected model/recipe/sample entries, docs, hot topics, announcements, resources, and community titles. It runs locally and never sends search text to analytics.

A production demand signal needs privacy review before implementation. Prefer an allowlisted topic taxonomy or an explicit feedback action over raw queries. Do not collect raw search text, because developers may paste tokens, order IDs, account identifiers, or code. If a reviewed design records zero-result demand, report unavailable instrumentation as unavailable rather than zero.

**Impact when done safely:** The team can identify content gaps without turning free-form search into a sensitive-data channel.

#### 4.7 Record copy-to-clipboard on code blocks (S, POC implemented)

After a successful native Copy action, send `hub_content_copy` with the allowlisted `code_id`, actual displayed language, and generated page context. Never send copied code or clipboard text. Failed or uninstrumented copies emit no event and remain usable.

**Impact in the demo:** Copy rate distinguishes content people read from code they choose to take, while preserving the code privacy boundary.

#### 4.8 Nightly GitHub traffic and issue export, read-only (M)

This is already planned. A scheduled job in the hub repository reads GitHub's traffic API for both repositories: views, clones, referrers, and popular paths. It stores them in CloudWatch Logs, because GitHub deletes them after 14 days.

The job also reads models issues and assigns each to an API in the hub's own data, by matching model names in the title and body. No labels are added to the models repository.

Access note: GitHub's traffic API needs a token from someone with push access to those repositories, even though the job only reads. Ask the owners for a fine-grained token limited to read access, or for them to run the export and share the files.

**Impact when done:** History beyond 14 days, and the 247 open model issues become a pain chart by API, without touching the repositories.

#### 4.9 Count sample User-Agent calls from SP-API request logs (L, needs SP-API service team)

Ask the SP-API service team for weekly totals by sample name and language. Do not join them to an application, developer, or seller. This reads existing logs and changes no code.

**Impact when done:** Shows which sample solutions are deployed and run, not just viewed. A sample with many hub views and no API calls is read but not deployed, so its setup steps need work. Treat the numbers as approximate until the owners fix the opt-out mismatch (4.4).

### P2: Do later. These measure outcomes and cover other channels.

#### 4.10 Developer Support cases and first-call success by API (L, needs Support and SP-API teams)

Monthly, by API family: support case count, plus median time from app registration to first successful call, if that data exists.

**Impact when done:** Answers the question leadership will ask: "After we published content for Orders, did Orders support cases go down?" Content views become an outcome.

#### 4.11 Consent-based cookies (M, needs the consent decision)

Enable `allowCookies(true)` after consent through Shortbread.

**Impact when done:** Return visits, doc-to-sample-to-copy funnels, and one helpful vote per person. Until then, treat funnel and helpful numbers as approximate.

#### 4.12 Collect an explicit developer type (S, requires consent and privacy approval)

Offer an optional choice such as `solution_provider` or `private_developer`. Keep `developer_type: unknown` unless the developer explicitly supplies it under the approved consent design. Do not infer developer type from seller/vendor scope, GitHub identity, cookies, selected content, or behavior.

**Impact when done:** Content can be compared for solution providers and private developers without confusing who the developer is with whether content applies to sellers or vendors.

#### 4.13 YouTube and npm in the same store (M)

Pull YouTube Analytics (views, average view duration, retention) and public daily npm downloads for `sp-api-dev-mcp` by version. Tag each with a `content_id`. Alternatively, embed videos on hub pages and record `video_progress` at 25, 50, 75, and 100 percent.

**Impact when done:** All channels show up on one dashboard, so the team can compare a video against a hot topic on the same API.

#### 4.14 Community health by API (S, after 4.2)

Add median hours to first answer and unanswered share, broken down by API. Both are already on the later list. This uses the hub's own GitHub Discussions repository.

**Impact when done:** Shows which APIs the community cannot answer, so they need official content or a team response.

---

## 5. Dashboards and metric definitions

Publish CloudWatch metrics only with the low-cardinality dimensions `content_type`, `api_family`, `language`, `selling_partner_scope`, and `developer_type`. Do not create a metric dimension per page or `content_id`; keep `content_id` in bounded event/log analysis for ranked tables. This avoids high-cardinality cost and an unusable metric console.

Use one agreed reporting window, such as trailing 28 days, and define rates consistently:

| Measure | Numerator | Denominator | Rule |
|---|---|---|---|
| Page views | Admitted native page-view events | Not a rate | Count within the selected window; do not substitute server requests |
| Copy rate | Successful `hub_content_copy` events | Page views for the same content and window | A missing or disabled RUM stream is unavailable, not 0% |
| Helpful rate | `hub_helpful_vote` events where `helpful=true` | All helpful-vote events for the same content and window | Show only after the agreed minimum vote count, such as 20 |
| Internal-navigation rate | `hub_internal_navigation` events | Page views for the same source content and window | Includes only links with explicit instrumentation |
| Outbound rate | `hub_outbound_click` events | Page views for the same content and window | Break down by allowlisted destination type, not raw URL |

A rate may exceed a per-user interpretation because cookies are off and repeated actions are possible. Dashboards must display **unavailable** when the required event stream, monitor configuration, or denominator is unavailable. They must never convert missing telemetry into zero.

| Dashboard | Filters | Widgets | Answers |
|---|---|---|---|
| Content performance | Time, API family, content type, language, selling-partner scope, developer type | Reach, helpful rate, copy rate, internal-navigation rate, outbound rate; table of high-reach, low-action items | What works, and what is read but not used |
| Coverage | Language, selling-partner scope | Grid of API family by content type: published or not, with 28-day reach | What to build next, starting with APIs people already visit |
| Community health | API family, category | Unanswered share, hours to first answer, new questions, top ideas | Where developers are stuck |
| Artifacts | Repository, channel | GitHub views and clones, top paths, npm downloads, YouTube retention, sample API calls; publish dates marked | Whether publishing a piece changed usage |

Alerts worth having:

- Helpful rate drops in the week after a publish
- Unanswered questions older than the response target
- The same zero-result search repeating

Do not alert on stars.

## 6. Expected result once P0 and P1 are complete

| Question | Today | After P0 and P1 |
|---|---|---|
| Which APIs get the most developer attention? | Unknown before content context | Rankable in an enabled event stream by API family, language, selling-partner scope, and explicitly supplied developer type |
| Which content helps, and why not? | Yes/no per URL | Helpful rate per item, with a reason |
| Is the code being used? | Stars | Copy events, per-file clicks, sample API calls |
| What should we publish next? | Guesswork | Zero-result searches plus coverage gaps, ranked by reach |
| Which models and samples are in demand? | Top 10 paths, 14 days | Every item, measured on the hub, with full history |

## 7. Suggested demo scope

For the team and manager demo, the implemented subset of 4.1 to 4.3 plus 4.7 is enough to show content-aware page, copy, internal-navigation, outbound, and feedback events end to end. Use a few models and samples, not all 57 and 14. A developer opens the Orders model page, opens a Java recipe, copies the code, and votes that the page is not helpful. The event payloads identify the content without including code, search text, URLs, or developer identifiers. Helpful-vote reasons remain future work.

## 8. Before public launch (not needed for the demo)

- Separate demo traffic from real traffic, or retire `tools/demo-traffic`.
- Publish metrics with a role limited to `cloudwatch:PutMetricData` on the `DeveloperHub` namespace instead of `IibsAdminAccess`.
- Have privacy and security review the fixed event schemas and sensitive-value checks in `src/lib/analytics.js`. Preserve the exclusions for raw code, clipboard text, search text, GitHub identities, seller/vendor and marketplace identifiers, order IDs, credentials, and arbitrary error text.
- Agree with the models and samples owners on how hub pages credit and link back to their repositories, and how often the pinned commit is updated.

## 9. Not verified in this assessment

- The existing CloudWatch dashboard (DeveloperHub-Analytics) was not reviewed, only the code that feeds it.
- Recipes on `developer-docs.amazon/sp-api/recipes` were not counted. The coverage grid has to include them.
- The share of samples PRs opened by bots was not measured.
- Whether SP-API request logs keep User-Agent (4.9), and whether first-call data exists (4.10), needs confirmation from the owning teams.
