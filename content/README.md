# Demo content copies

Small, read-only copies of files from two public SP-API repositories, used only to demo the Developer Hub. The folder layout under each repository name matches the original repository.

| Folder | Source | Commit | License |
|---|---|---|---|
| `selling-partner-api-models/` | https://github.com/amzn/selling-partner-api-models | `db2936aa19f4b48185173c385c51ab115166f221` | Apache-2.0 (`LICENSE`, `NOTICE` included) |
| `selling-partner-api-samples/` | https://github.com/amzn/selling-partner-api-samples | `21589c4a467d433c2cb95e80ae61eb28213f2d67` | MIT-0 (`LICENSE` included) |

Rules:

- The original repositories are the source of truth. Do not edit these copies, and never push, open issues, or comment on the originals from this project.
- Files were downloaded over HTTPS at the commits above. There is no clone, fork, submodule, or git remote pointing at the originals.
- Only a sample is copied. Sample solutions include their README and docs, not their code.

## What is included and why

Six APIs, chosen so the hub's metrics show each coverage situation:

| API | Situation | Models | Samples |
|---|---|---|---|
| Data Kiosk | Full coverage | model, Sales and Traffic schema | Java and Python recipes, sample solution README, deployment doc, diagrams |
| Easy Ship | Recipes only | model | `RetrieveOrder` and `GetHandoverSlots` in Java and PHP |
| Orders | Thin coverage | `orders_2026-01-01.json` | B2B delivery experience recipe (Java) |
| Vendor Direct Fulfillment | Vendor audience, C# only | orders model (2021-12-28) | sample solution README |
| Tokens and LWA | Cross-cutting auth | tokens model | LWA rotation README and deployment doc |
| Vehicles | Gap: no samples | model | none, on purpose |

Also included: each repository's `README.md`, `code-recipes/README.md`, `use-cases/README.md`, and `code-recipes/java/src/main/java/util/Recipe.java` (used by the Java recipes).

Two hot topics are adapted as hub posts in `site/blog/`, shortened from Discussions #253 and #588 in the samples repository. Each post links to its original.

## Refreshing

Download the same paths at a newer commit and update the commit column above. Do not use `git clone` or `git submodule` for this folder.
