# Developer Hub content strategy

## Decision

GitHub remains authoritative for API models, sample code, source Discussions, contribution and Git history, pull requests, releases, and clone or fork workflows. Developer Hub is the primary reading and discovery experience: curated model summaries, inline code with copy controls, sample overviews, hot topics, unified search, community entry points, and content analytics.

The hub renders source material as native Docusaurus and Prism content. It does not embed GitHub in an iframe or imitate a repository browser. Native pages keep navigation, accessibility, search, responsive behavior, and analytics consistent while exact pinned links preserve access to the complete source and history.

## Ownership

| Area | Owner | Responsibilities |
|---|---|---|
| Upstream models, samples, and source Discussions | Owners of `amzn/selling-partner-api-models` and `amzn/selling-partner-api-samples` | Original content, source history, releases, contributions, and upstream licenses |
| Developer Hub content platform | Developer Hub repository owners | Templates, validation, metadata contracts, review policy, generated pages, search, and publication |
| Hot-topic content | Solutions Architects | Prose, technical accuracy, attribution, related links, and optional Developer Hub Discussion creation |
| Hosting and telemetry | Platform owners | Existing Amplify deployment and CloudWatch RUM configuration; authors do not need AWS access |

## Proof-of-concept source model

The proof of concept builds only from checked-in, immutable copies under `content/`. It performs no network fetch and makes no change to either upstream repository.

- API models are pinned to `db2936aa19f4b48185173c385c51ab115166f221`.
- Samples are pinned to `21589c4a467d433c2cb95e80ae61eb28213f2d67`.
- The build verifies file digests, extracts bounded model projections and exact code excerpts, and rejects drift.
- Every excerpt is labeled and links to the exact file at the pinned commit.
- Local pages publish the applicable model license, model NOTICE, and sample-code license. Upstream license links remain available for provenance.
- Feature work must not update the checked-in snapshots. A refresh is a separate, reviewed content change.

This pinned-copy approach is deliberate for the demo. It provides deterministic builds without credentials, upstream access, or AWS access.

## Proposed production synchronization

Production synchronization is a proposal, not part of this implementation. A scheduled, read-only job could fetch an allowlist of upstream paths at a selected commit, validate licenses, manifests, digests, and payload limits, then write changes only to the Developer Hub repository. The job would open a reviewable pull request in Developer Hub. It would never push to, open a pull request against, or otherwise modify either `amzn` repository.

A content owner would review source selection, technical accuracy, attribution, and license changes. Normal Developer Hub validation, tests, and build checks would have to pass before merge and publication. Pinning the selected commit in the pull request keeps every refresh auditable and reversible.

## Portal boundaries

Developer Hub supports discovery, reading, inline code copying, related-content navigation, helpful feedback, local search, and entry points to community discussions. GitHub continues to handle full-file inspection, source history, clone and fork, pull requests, releases, contribution history, and Discussion storage.

The hub should link to those GitHub-native actions with truthful labels such as **View source**, **View history**, **Open discussion**, **Ask on GitHub**, and **Clone or fork on GitHub**. It should not simulate repository operations. This boundary lets developers read most guidance without switching portals while retaining GitHub for work that depends on repository or Discussion capabilities.

## Target API page structure

Every API page follows the same order:

1. Header metadata and source-attribution summary
2. Overview
3. Operations and authorization summary
4. Bounded API model projection
5. Exact code-recipe excerpts
6. Sample-solution overviews
7. Related hot topics
8. Questions and Discussion actions
9. Helpful feedback

The demo includes Data Kiosk, Orders, Vehicles, and Easy Ship. API applicability remains `unknown` unless a pinned or canonical source establishes it. Recipe and sample applicability are separate. A missing recipe, sample, hot topic, or dedicated Discussion renders an explicit coverage-gap message rather than invented content. Full schemas, unselected operations, setup code, and repository history remain available through pinned source links.

## Hot-topic publication

A Solutions Architect creates one Markdown file by following the [hot-topic authoring runbook](hot-topic-authoring.md):

1. Run the scaffolder from `site/`.
2. Edit only the generated `blog/YYYY-MM-DD-<slug>.md` file.
3. For adapted content, retain a pinned source or source Discussion and visible attribution. Keep the optional engagement Discussion separate and point it only to `anjireddylella/developerhub`.
4. Run `npm run validate:content`, `npm test`, and `npm run build`, then use `npm run serve` for a local visual check.
5. Open a Developer Hub pull request. The read-only PR check builds sample data and uploads only `site/build/` as the three-day `developer-hub-preview` artifact. It does not deploy.
6. A content owner reviews accuracy, readability, attribution, links, metadata, responsive appearance, and dark mode. A code owner reviews platform or validator changes; ordinary one-file hot-topic changes need content review once ownership rules are configured.
7. Merge only after checks pass. The existing main-branch workflow performs the Amplify deployment; authoring requires no AWS access.

To roll back a bad publication, use `git revert` on the merged content commit and merge that revert through the same pull-request checks. Do not rewrite shared history or manually delete production content.

## Measurement and privacy

[SP-API content metrics assessment](metrics-assessment.md) defines the implemented event contract, metric formulas, privacy exclusions, and future measurement priorities. The hub keeps detailed `content_id` analysis in events or logs and reserves CloudWatch metric dimensions for low-cardinality metadata. Search text, copied code, GitHub identities, seller or vendor identifiers, credentials, and other sensitive values are excluded.
