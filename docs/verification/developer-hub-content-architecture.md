# Developer Hub content architecture verification

## Test context

- Date: 2026-10-31 (convergence rerun at 21:50 UTC)
- Browser: Google Chrome 156.0.8078.79, headless, device scale factor 1
- Site origin: `http://127.0.0.1:3000`
- Tested site revision: `3354b9b` plus the verified API-guide URL correction in `site/api-content.config.js`.
- Environment: production build and server with GitHub, RUM, and AWS variables unset; sample Discussions were used
- Browser evidence: `.agents/tasks/developer-hub-content-architecture/visual-verification/browser-checks.json` (workflow artifact, not committed)
- Screenshot checksums: `.agents/tasks/developer-hub-content-architecture/visual-verification/SHA256SUMS` (workflow artifact, not committed)

## Automated checks

| Command | Result |
|---|---|
| `cd /Users/alella/Documents/Explore/BuilderHub-poc/site && npm run validate:content && npm test && npm run build` | Pass. 3 blog files validated, 45 tests passed, Docusaurus production build succeeded, and post-build verification checked 3 blog routes and 103 generated assets. |
| `cd /Users/alella/Documents/Explore/BuilderHub-poc/site && npm run serve -- --host 127.0.0.1 --port 3000` | Pass. The detached equivalent served the production build on `127.0.0.1:3000`; `/apis` returned successfully. |
| Browser matrix and interaction script | Pass. The convergence rerun covered 84 route/viewport/theme combinations, 42 unique internal paths, all required interactions, pinned-source checks, and no-RUM checks. It regenerated 14 screenshots and the checksum manifest. |

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
| `/community/questions` | 320 / 768 / 1280 | Pass | Pass |
| `/community/ideas` | 320 / 768 / 1280 | Pass | Pass |
| `/resources` | 320 / 768 / 1280 | Pass | Pass |
| `/licenses/selling-partner-api-models/license` | 320 / 768 / 1280 | Pass | Pass |
| `/licenses/selling-partner-api-models/notice` | 320 / 768 / 1280 | Pass | Pass |
| `/licenses/selling-partner-api-samples/license` | 320 / 768 / 1280 | Pass | Pass |

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

## Official guide URL checks

The convergence review found that the old Orders, Vehicles, and Easy Ship `/docs/*-reference` destinations rendered Amazon's Page Not Found page. The approved correction uses current official API-reference destinations:

- Orders: `https://developer-docs.amazon/sp-api/reference/searchorders`, verified as the `searchOrders` operation reference for the selected v2026 model operation.
- Vehicles: `https://developer-docs.amazon/sp-api/reference/vehicles-v2024-11-01`, verified as the `Vehicles v2024-11-01` API reference.
- Easy Ship: `https://developer-docs.amazon/sp-api/reference/easy-ship-v2022-03-23`, verified as the `Easy Ship v2022-03-23` API reference.
- Data Kiosk remains `https://developer-docs.amazon/sp-api/docs/data-kiosk-api-v2023-11-15-reference`; it resolved to the `Data Kiosk v2023-11-15` reference.
- The shared connecting guide and SP-API documentation root also resolved successfully.

The `developer-docs.amazon.com` search results redirected to the canonical `developer-docs.amazon` host already allowed by the catalog validator. No upstream GitHub repository was contacted.

## Analytics and privacy checks

RUM configuration was unset. All pages, search, copy, wrapping, feedback, tabs, cards, internal navigation, and Discussion links remained functional. The browser made resource requests only to `127.0.0.1:3000`; it made no RUM or AWS request. Production mode emitted no application analytics payload to the console. Unit tests separately passed fixed-schema page-view and custom-event validation, queue behavior, RUM transport failure containment, sensitive-value rejection, and exclusion of copied code.

The search check confirmed that input stays local. Browser evidence contains no copied code, search text beyond fixed test strings, GitHub identity, seller/vendor identifier, credential, or live telemetry payload.

## Representative screenshots

Screenshots are 1280 by 900 CSS pixels and live only in the workflow artifact directory. Light and dark screenshots were captured for each listed page. The API route matrix supplies DOM and overflow evidence at 320 and 768 pixels.

| Screenshot | SHA-256 |
|---|---|
| `apis--light--1280.png` | `1e174ee719e2c8cc5069979d3644426b09c40372e1ce8e0728e755d51884ffd9` |
| `apis--dark--1280.png` | `c0a3272778cce86407a9c75936e8fde905d08dc4ace157977d61b4956943688d` |
| `apis--data-kiosk--light--1280.png` | `744cfe193011a88eddaaa067e825d5bbb30eee1eccbd85da4f3eee977ba85fc9` |
| `apis--data-kiosk--dark--1280.png` | `bd1b1b2d100be82b27b4dc675f6a961fd55ea13cdd1e7061b3874a5ec9900872` |
| `apis--orders--light--1280.png` | `7a8383150d9a2718af6079ae3b07139f70e933f783286c5f5b933094d8970aca` |
| `apis--orders--dark--1280.png` | `5dfb313c7751c2624b649ec29929df8ad404ddc4ad2c8abf60b790df3e7dd8ca` |
| `apis--vehicles--light--1280.png` | `a12935de4759fdebe0c7873fe5a9f1dadbb5de3706563d9054d661b52a7ebfe2` |
| `apis--vehicles--dark--1280.png` | `de74e9028236b4750ee0d19d67a37c9e4dc09e96635dac7ec9e6d3fe040242c1` |
| `search--light--1280.png` | `35e38286dec1dea00f390670adde79631f2a7ba5e4d4aaa293df39ccba73f2c2` |
| `search--dark--1280.png` | `8c3a33db2bed80bddcd3cbc3b258397cac2d8f2baa09b42ac8ceb2920914d988` |
| `blog--orders-api-v2026-01-01-migration--light--1280.png` | `6f79869aa16bea29da140fd4625b363e99ddec3c05bf88148e28916cc20403f5` |
| `blog--orders-api-v2026-01-01-migration--dark--1280.png` | `be631c1b1f71467e5f811aa346cea1a90930df15ecf0a3337c71875800e1791e` |
| `blog--parsing-reports-efficiently--light--1280.png` | `1c2602b962e30cb621cfdaa5f17e686ac800cb329b2c628f8f7e2289f383d9a2` |
| `blog--parsing-reports-efficiently--dark--1280.png` | `c637c7b29513264e4361b74b17f564dbd7bff66b2256bf75d0c5f288f4e2d000` |

A fresh `shasum -a 256` run produced the same values written to `SHA256SUMS`.

## PR-preview workflow checks

`.github/workflows/pr-check.yml` retains only `contents: read`, runs `npm ci`, content validation, tests, and build, and pins `actions/upload-artifact` to `ea165f8d65b6e75b540449e92b4886f43607fa02` (v4.6.2). The artifact path is only `site/build`, retention is three days, and the job summary gives download, unzip, and `npx serve developer-hub-preview` instructions. The workflow contains no AWS credential, AWS action, deployment command, or deployment step.
