# Hot-topic authoring runbook

Use this process to publish a hot topic by changing one Markdown file. It does not contact the upstream repositories, create a Discussion automatically, deploy the site, or require AWS access.

## Create the file

Install the locked dependencies once, then run the scaffolder from `site/`:

```bash
cd site
npm ci
npm run new:hot-topic -- \
  --title "Migrate to Orders API vNext" \
  --description "What changes and how to migrate." \
  --api-family orders \
  --scope both \
  --provenance original
```

The command creates `blog/YYYY-MM-DD-<slug>.md`. It refuses duplicate slugs, duplicate content IDs, and overwrites. After generation, edit only that file. The validator and build discover it for the blog, search, page context, feedback, and analytics catalog without a catalog or configuration edit.

## Field reference

| Field | Requirement |
|---|---|
| `slug`, `title`, `description`, `date` | Required; the filename date must match `date` |
| `authors`, `tags` | Required non-empty lists; the default author is `spapi-team` |
| `content_id` | Required stable ID in the form `topic/<slug>` |
| `content_type` | Required and fixed to `hot_topic` for this workflow |
| `api_family` | Required; use the relevant supported family or `cross-cutting` |
| `selling_partner_scope` | Required: `seller`, `vendor`, or `both`; this describes content applicability |
| `provenance` | Required: `original` or `adapted` |
| `source_discussion`, `source_category` | Required together for `adapted`; rejected for `original` |
| `engagement_discussion` | Optional Developer Hub Discussion URL under `anjireddylella/developerhub` |

Optional command flags include `--date YYYY-MM-DD`, repeatable `--tag`, `--author`, `--source-discussion`, `--source-category`, and `--engagement-discussion`.

## Adapted content and attribution

Use `--provenance adapted` only when adapting an upstream source Discussion. Supply both source fields:

```bash
npm run new:hot-topic -- \
  --title "Parsing reports safely" \
  --description "Practices for resilient report parsers." \
  --api-family reports \
  --scope both \
  --provenance adapted \
  --source-discussion "https://github.com/amzn/selling-partner-api-samples/discussions/588" \
  --source-category "Reporting & Analytics"
```

The generated visible attribution note must keep a Markdown link whose destination exactly matches `source_discussion`:

```md
:::note Source attribution
Adapted from [the original source discussion](https://github.com/amzn/selling-partner-api-samples/discussions/588).
:::
```

Use exact commit-pinned `blob/<40-character-commit>/...` or `tree/<40-character-commit>/...` links for upstream files and folders. Do not use a moving `main` link as the exact source. Preserve applicable license attribution. Never modify or open changes against either upstream `amzn` repository as part of this workflow.

## Optional engagement Discussion

If readers need a place to respond, manually create a Discussion in `anjireddylella/developerhub` under the appropriate Hot topics category. Add its URL with `--engagement-discussion` during scaffolding or as `engagement_discussion` in frontmatter. Add a visible **Discuss this topic** link in the post.

The source Discussion records provenance. The engagement Discussion stores POC reader conversation. Do not substitute one for the other, and do not point engagement at an upstream repository.

## Validate and preview

Run all checks from `site/` with no GitHub, RUM, or AWS variables required:

```bash
npm run validate:content
npm test
npm run build
npm run serve -- --host 127.0.0.1 --port 3000
```

Review the post page, the Hot topics list, `/search`, related internal and pinned external links, and helpful feedback. Check 320, 768, and 1280 CSS-pixel widths in light and dark mode. Confirm headings are ordered, focus is visible, code and tables do not widen the page, and keyboard controls work.

Validation checks metadata, provenance, exact attribution, URL ownership, pinned source links, internal links, duplicate IDs, UTF-8, and size limits. The build reads only local snapshots and needs no upstream-repository or AWS access.

## Pull-request review and preview

The PR check has `contents: read` permission only. It runs validation, tests, and the production build, then uploads only `site/build/` as `developer-hub-preview` for three days. It has no AWS or deployment step.

To inspect the artifact:

1. Open the PR workflow run and download `developer-hub-preview` from its summary.
2. Unzip the artifact.
3. From the directory containing the extracted build, run `npx serve developer-hub-preview`.
4. Open the local URL printed by `serve`.

The content reviewer checks technical accuracy, readability, source and license attribution, source-versus-engagement links, related content, metadata, mobile layout, dark mode, and feedback. Platform code changes also require a code-owner review.

## Merge and rollback

Merge only after the PR check and review pass. A push to `main` triggers the existing Amplify deployment workflow. Do not run a deployment or make AWS changes during authoring.

To remove a bad publication, create a normal `git revert` of the merged hot-topic commit, open a pull request for the revert, and merge after the same checks. Do not force-push, rewrite shared history, or manually delete deployed content.

See [Developer Hub content strategy](content-strategy.md) for ownership, portal boundaries, and the proposed production synchronization model.
