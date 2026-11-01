# Developer Hub content strategy

## Decision

Use three public repositories in total. A separate fourth repository for Developer Hub application code is not needed.

1. `amzn/selling-partner-api-models` remains authoritative for machine-readable API models and schemas.
2. `amzn/selling-partner-api-samples` remains authoritative for executable recipes and sample applications.
3. The Developer Hub repository contains the Docusaurus application, all new Solutions Architect educational content, content metadata, publishing automation, and the canonical GitHub Discussions for new general community activity.

The existing formal developer-documentation portal remains authoritative for complete API reference material owned by its current team.

The Developer Hub becomes the primary reading, discovery, and community experience: curated model summaries, inline code with copy controls, sample overviews, hot topics, tutorials, best practices, migration guides, unified search, questions, ideas, article feedback, and content analytics. Existing Discussions in the models and samples repositories remain available as historical records, but they are not the intended destination for new general Q&A, ideas, hot topics, or Solutions Architect guidance.

The hub renders source material as native Docusaurus and Prism content. It does not embed GitHub in an iframe or imitate a repository browser. Native pages keep navigation, accessibility, search, responsive behavior, and analytics consistent while exact pinned links preserve access to the complete source and history.

## Ownership

| Area | Canonical owner and location | Responsibilities |
|---|---|---|
| API models and schemas | `amzn/selling-partner-api-models` | Machine-readable contracts, model validation, release automation, source history, contributions, and model-defect Issues |
| Recipes and sample applications | `amzn/selling-partner-api-samples` | Executable code, tests, dependencies, deployment assets, source history, contributions, and sample-code-defect Issues |
| Solutions Architect educational content | Developer Hub repository | Hot topics, tutorials, best practices, workshops, migration guidance, cross-API troubleshooting, editorial review, and publication |
| New general community activity | Developer Hub GitHub Discussions | Questions, answers, ideas, article comments, reactions, and votes |
| Historical upstream Discussions | Existing models and samples repository Discussions | Existing records remain readable and linkable during transition; new general engagement should be directed to Developer Hub |
| Developer Hub content platform | Developer Hub repository owners | Docusaurus application code, templates, validation, metadata contracts, review policy, generated pages, search, analytics instrumentation, and publication automation |
| Complete formal API documentation | Existing developer-documentation portal and its owning team | Full formal API reference and documentation outside the Solutions Architect team's ownership |
| Hosting and telemetry | Developer Hub platform owners | Amplify deployment and CloudWatch RUM configuration; content authors do not need AWS access |

## Content placement rule

Educational content that remains useful without checking out a source repository belongs in Developer Hub. This includes hot topics, tutorials, migration guides, best practices, workshops, architecture guidance, FAQs, and cross-API troubleshooting.

Documentation coupled to an exact source tree remains beside that source. This includes build and test commands, dependencies, environment variables, contribution instructions, licenses, model-generation instructions, and deployment details that must change atomically with sample code. Developer Hub may render or summarize this material, but the source repository remains canonical.

Source repository Issues are for reproducible defects in their artifacts. General usage questions, content feedback, and feature ideas belong in Developer Hub Discussions. Account, registration, and production support cases continue to use official Developer Support.

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

Developer Hub is the recommended front door for discovery, reading, inline code copying, related-content navigation, helpful feedback, local search, hot topics, and general community engagement. Developers should not need to understand which repository stores a model or recipe merely to read and use it.

GitHub continues to handle complete source inspection, source history, clone and fork, pull requests, releases, contribution history, and technical Issues. The two source repositories remain visible when a developer intentionally chooses **View source**, **View history**, **Report a model defect**, **Report a sample-code defect**, or **Clone or fork on GitHub**. The existing developer-documentation portal remains the destination for complete formal API reference material.

New questions, answers, ideas, hot-topic comments, reactions, and votes use Developer Hub Discussions. Existing upstream Discussions remain historical records and may appear as attributed links or bounded search results. They should not compete as active destinations once the production transition is complete.

This boundary gives developers one coherent learning and engagement experience while retaining GitHub for operations that depend on repository capabilities.

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

The Developer Hub repository is the canonical home for all new Solutions Architect hot topics. A Solutions Architect creates one Markdown file by following the [hot-topic authoring runbook](hot-topic-authoring.md):

1. Run the scaffolder from `site/`.
2. Edit only the generated `blog/YYYY-MM-DD-<slug>.md` file.
3. For adapted historical content, retain a pinned source or source Discussion and visible attribution. Keep the Developer Hub engagement Discussion separate and point it only to the Developer Hub repository.
4. Run `npm run validate:content`, `npm test`, and `npm run build`, then use `npm run serve` for a local visual check.
5. Open a Developer Hub pull request. The read-only PR check builds sample data and uploads only `site/build/` as the three-day `developer-hub-preview` artifact. It does not deploy.
6. A content owner reviews accuracy, readability, attribution, links, metadata, responsive appearance, and dark mode. A code owner reviews platform or validator changes; ordinary one-file hot-topic changes need content review once ownership rules are configured.
7. Merge only after checks pass. The existing main-branch workflow performs the Amplify deployment; authoring requires no AWS access.

A new hot topic should not be copied in full into the models or samples repository Discussions. If those audiences need a notification, publish a short pointer to the canonical Developer Hub article. The article's associated Developer Hub Discussion stores comments and reactions rather than a second manually maintained copy of the article.

To roll back a bad publication, use `git revert` on the merged content commit and merge that revert through the same pull-request checks. Do not rewrite shared history or manually delete production content.

## Community transition

The final production move should be gradual:

1. Preserve existing upstream Discussions and their URLs as historical records.
2. Publish all new Solutions Architect articles in Developer Hub.
3. Direct new general Q&A, ideas, and article feedback to Developer Hub Discussions.
4. Keep source repository Issues open for model and sample-code defects only.
5. Add pinned notices and repository guidance pointing developers to the Developer Hub after the owning team approves the transition.
6. Surface selected historical discussions through attributed links or read-only search results rather than creating new engagement in the old locations.
7. Measure adoption before restricting old Discussion entry points.

This transition policy is a production decision. The POC does not modify the existing repositories or their Discussion settings.

## Measurement and privacy

[SP-API content metrics assessment](metrics-assessment.md) defines the implemented event contract, metric formulas, privacy exclusions, and future measurement priorities. The hub keeps detailed `content_id` analysis in events or logs and reserves CloudWatch metric dimensions for low-cardinality metadata. Search text, copied code, GitHub identities, seller or vendor identifiers, credentials, and other sensitive values are excluded.
