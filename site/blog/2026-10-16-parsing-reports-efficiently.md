---
slug: parsing-reports-efficiently
title: "Parsing reports efficiently"
authors: [spapi-team]
date: 2026-10-16
tags: [reports, best-practices]
description: Practical rules for parsing SP-API report documents without breaking when formats change.
# Content catalog fields (see docs/metrics-assessment.md, item 4.2)
content_id: topic/parsing-reports-efficiently
content_type: hot_topic
api_family: reports
audience: both
source_discussion: https://github.com/amzn/selling-partner-api-samples/discussions/588
source_category: Reporting & Analytics
---

:::note Demo copy
This is a shortened copy of [Discussion #588](https://github.com/amzn/selling-partner-api-samples/discussions/588) in `amzn/selling-partner-api-samples`, used to demo the Developer Hub. Read the original for all ten tips.
:::

Reports come in several formats, can be customized by sellers, and may be compressed. A parser that assumes a fixed layout will break. These rules keep a Reports API integration working as reports change.

{/* truncate */}

## Rules for a resilient parser

1. **Don't assume a fixed schema.** New columns, values, and elements can appear without notice, in any order. Map the fields you need and ignore the rest.
2. **Log unknown fields** instead of dropping them silently. They often signal new functionality.
3. **Check `compressionAlgorithm`** in the `getReportDocument` response. If it is `GZIP`, decompress before parsing.
4. **Branch on format** using the `Content-Type` header: tab-separated, CSV, XML, or JSON (Data Kiosk output is JSON).
5. **Download right away.** The pre-signed URL expires after 5 minutes. Don't cache it. Call `getReportDocument` again if the download fails.
6. **Don't hard-code the encoding.** Most flat files are UTF-8, but some use Windows-1252 or Shift-JIS, and some start with a byte-order mark.
7. **Expect seller customization.** Some inventory and order reports can be customized per seller and marketplace in Seller Central.

## Start from working code

The Reports code recipes (Java, Python, PHP) cover requesting, downloading, decompressing, and parsing a report.

## Related content

- [Reports code recipes](https://github.com/amzn/selling-partner-api-samples/tree/main/code-recipes)
- [Data Kiosk sample solution](https://github.com/amzn/selling-partner-api-samples/tree/main/use-cases/data-kiosk)
- [Original discussion](https://github.com/amzn/selling-partner-api-samples/discussions/588)
