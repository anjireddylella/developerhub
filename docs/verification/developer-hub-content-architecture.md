# Developer Hub content architecture verification

## Test context

- Date: 2026-10-31
- Browser: Google Chrome 156.0.8078.79, headless, device scale factor 1
- Site origin: `http://127.0.0.1:3000`
- Tested site revision: `e14dc4a` plus the FEAT-005 documentation and read-only PR-workflow working-tree changes. FEAT-005 does not change rendered site code.
- Environment: production build and server with GitHub, RUM, and AWS variables unset; sample Discussions were used
- Browser evidence: `.agents/tasks/developer-hub-content-architecture/visual-verification/browser-checks.json` (workflow artifact, not committed)
- Screenshot checksums: `.agents/tasks/developer-hub-content-architecture/visual-verification/SHA256SUMS` (workflow artifact, not committed)

## Automated checks

| Command | Result |
|---|---|
| `cd /Users/alella/Documents/Explore/BuilderHub-poc/site && npm run validate:content && npm test && npm run build` | Pass. 3 blog files validated, 45 tests passed, Docusaurus production build succeeded, and post-build verification checked 3 blog routes and 103 generated assets. |
| `cd /Users/alella/Documents/Explore/BuilderHub-poc/site && npm run serve -- --host 127.0.0.1 --port 3000` | Pass. The detached equivalent served the production build on `127.0.0.1:3000`; `/apis` returned successfully. |
| Browser matrix and interaction script | Pass. 48 route/viewport/theme combinations, 23 unique internal paths, all required interactions, pinned-source checks, and no-RUM checks passed. |

The final Git status and explicit-diff command is recorded after documentation completion in the feature findings. Generated `site/build/` and `site/.docusaurus/` remain ignored.

## Route, viewport, and theme matrix

Each cell records a browser pass. A pass required the exact pathname, requested `data-theme`, a `main` landmark, exactly one main `h1`, ordered `h1`–`h3` levels, at least one keyboard-focusable control, no document-level horizontal overflow, no iframe, and no non-local resource request. CSS widths are in pixels; browser viewport height was 900 CSS pixels.

| Route | Width | Light | Dark |
|---|---:|---|---|
| `/apis` | 320 | Pass | Pass |
| `/apis` | 768 | Pass | Pass |
| `/apis` | 1280 | Pass | Pass |
| `/apis/data-kiosk` | 320 | Pass | Pass |
| `/apis/data-kiosk` | 768 | Pass | Pass |
| `/apis/data-kiosk` | 1280 | Pass | Pass |
| `/apis/orders` | 320 | Pass | Pass |
| `/apis/orders` | 768 | Pass | Pass |
| `/apis/orders` | 1280 | Pass | Pass |
| `/apis/vehicles` | 320 | Pass | Pass |
| `/apis/vehicles` | 768 | Pass | Pass |
| `/apis/vehicles` | 1280 | Pass | Pass |
| `/apis/easy-ship` | 320 | Pass | Pass |
| `/apis/easy-ship` | 768 | Pass | Pass |
| `/apis/easy-ship` | 1280 | Pass | Pass |
| `/search` | 320 | Pass | Pass |
| `/search` | 768 | Pass | Pass |
| `/search` | 1280 | Pass | Pass |
| `/blog/orders-api-v2026-01-01-migration` | 320 | Pass | Pass |
| `/blog/orders-api-v2026-01-01-migration` | 768 | Pass | Pass |
| `/blog/orders-api-v2026-01-01-migration` | 1280 | Pass | Pass |
| `/blog/parsing-reports-efficiently` | 320 | Pass | Pass |
| `/blog/parsing-reports-efficiently` | 768 | Pass | Pass |
| `/blog/parsing-reports-efficiently` | 1280 | Pass | Pass |

## DOM, keyboard, and assistive-technology checks

| Check | Result | Evidence |
|---|---|---|
| Skip navigation | Pass | Tab from the document body focused **Skip to main content**. |
| API section links | Pass | The API model section link accepted focus; Enter changed the hash to `#api-model`. |
| Language tabs | Pass | Java accepted focus, Arrow Right moved focus to Python, and Enter selected Python with `aria-selected="true"`. |
| Code wrapping | Pass | The **Toggle word wrap** button accepted focus; Space toggled the enabled class. |
| Code copy | Pass | The **Copy code to clipboard** button accepted focus; Space completed the copy and changed its live status and accessible label to **Copied**. |
| API cards and navigation | Pass | An API card accepted focus; Enter navigated to `/apis/data-kiosk`. |
| Helpful feedback | Pass | The Yes button accepted focus; Space displayed the `role="status"` message **Thanks for the feedback.** with RUM unset. |
| Discussion action | Pass | **Ask on GitHub** accepted focus and resolved to the canonical `anjireddylella/developerhub` new-Discussion route. No external navigation was performed. |
| Search label | Pass | The visible label is associated with `#hub-search`; the input has `type="search"`. |
| Search result semantics and focus | Pass | Typing `orders` retained input focus, announced **8 results.** through the polite status, and rendered eight semantic list items. |
| Search navigation | Pass | The first result accepted focus; Enter navigated to `/apis/orders`. |
| Search truncation | Pass | A 201-character input was limited to 200 characters, retained input focus, and visibly/politely announced the limit. |
| Focus, headings, and overflow | Pass | Every matrix row had focusable controls, one `h1`, ordered headings, and document width no greater than viewport width. Code and operations-table containers did not widen the page. |

The two existing hot-topic pages visibly retain source attribution, source Discussion links, and engagement links. Their pre-existing `:::note Source attribution` delimiters render as inline text in the current site; this does not hide the attribution or break layout, but a later content-platform change can migrate the syntax to the Docusaurus 3 titled-admonition form together with its validator fixture.

## Link and source checks

- All 23 unique internal paths discovered from the required pages returned HTTP 2xx or 3xx from the local production server.
- Every API page had no iframe or embedded repository browser.
- Every **View exact original file** model URL contained model commit `db2936aa19f4b48185173c385c51ab115166f221` and the expected exact model path.
- All four Easy Ship recipe links contained samples commit `21589c4a467d433c2cb95e80ae61eb28213f2d67` and an exact `code-recipes/` path.
- The Orders hot topic retained upstream source Discussion 253 and Developer Hub engagement Discussion 6.
- The Reports hot topic retained upstream source Discussion 588 and Developer Hub engagement Discussion 7.
- External source links were syntax/DOM checked only. Verification did not contact either upstream `amzn` repository.

## Analytics and privacy checks

RUM configuration was unset. All pages, search, copy, wrapping, feedback, tabs, cards, internal navigation, and Discussion links remained functional. The browser made resource requests only to `127.0.0.1:3000`; it made no RUM or AWS request. Production mode emitted no application analytics payload to the console. Unit tests separately passed fixed-schema page-view and custom-event validation, queue behavior, RUM transport failure containment, sensitive-value rejection, and exclusion of copied code.

The search check confirmed that input stays local. Browser evidence contains no copied code, search text beyond fixed test strings, GitHub identity, seller/vendor identifier, credential, or live telemetry payload.

## Representative screenshots

Screenshots are 1280 by 900 CSS pixels and live only in the workflow artifact directory. Light and dark screenshots were captured for each listed page. The API route matrix supplies DOM and overflow evidence at 320 and 768 pixels.

| Screenshot | SHA-256 |
|---|---|
| `apis--light--1280.png` | `7c57c07fc943092e27817f723d6917aa3ee063d6b642fc50d3ee6b82bb3f8633` |
| `apis--dark--1280.png` | `f5306bb358f82e63f5f1b63140a3a4b29ec8858a7d854ce408f4d7b947fb098f` |
| `apis--data-kiosk--light--1280.png` | `4025b149dbe9f281a3606e616810c1879c272ef40e3fdc74cca92eb37bc97622` |
| `apis--data-kiosk--dark--1280.png` | `7f10f8d799c6b37f06bd62ba1f48d10f9e28c8a1453f917f41753334e8f819d9` |
| `apis--orders--light--1280.png` | `f1385676c5496ab4875148e5161fc6bbe4a86e49942cf10b56402555b8d479e4` |
| `apis--orders--dark--1280.png` | `18355c8e9405506b84847da9a71172609a377cca0f2df55e477828a340a55f6b` |
| `apis--vehicles--light--1280.png` | `8fd3c5ffcdc7fd63d3be3cde1ccc71a2b57872ee629cd6bbee15786a89f8b8ec` |
| `apis--vehicles--dark--1280.png` | `99da186512c09f016ace8647dc785cb5e204d80822fbb2940000540594881a22` |
| `search--light--1280.png` | `73c8fa422bb6657cf6c38e4f79cab041a3e7db81944066fe9128b75ceb9deddb` |
| `search--dark--1280.png` | `3e1926f29fc824ceef4105d11a81260d412efec80461e4dec2935503e767196b` |
| `blog--orders-api-v2026-01-01-migration--light--1280.png` | `7bd168f63e4e2b0ecc1a5676e40feeb9e0d6456735cbaa9e4c31fbcd9ecbd166` |
| `blog--orders-api-v2026-01-01-migration--dark--1280.png` | `1472b369c02ebbff28358302ee001c2dee4cbe9ed73b5b0de1a66249960858e0` |
| `blog--parsing-reports-efficiently--light--1280.png` | `1e693ae3e7e5e1df33acf76fee0e4a6f2260caaf8c36ff4c6fdc20723bd64d4c` |
| `blog--parsing-reports-efficiently--dark--1280.png` | `3d3bcbbd39366fa88b3ab8da6642211fda4368a9f0cf5f5f4e9b6307a8aa691a` |

A fresh `shasum -a 256` run produced the same values written to `SHA256SUMS`.

## PR-preview workflow checks

`.github/workflows/pr-check.yml` retains only `contents: read`, runs `npm ci`, content validation, tests, and build, and pins `actions/upload-artifact` to `ea165f8d65b6e75b540449e92b4886f43607fa02` (v4.6.2). The artifact path is only `site/build`, retention is three days, and the job summary gives download, unzip, and `npx serve developer-hub-preview` instructions. The workflow contains no AWS credential, AWS action, deployment command, or deployment step.
