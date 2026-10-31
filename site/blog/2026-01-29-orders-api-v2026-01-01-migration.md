---
slug: orders-api-v2026-01-01-migration
title: "Migrate to Orders API v2026-01-01"
authors: [spapi-team]
date: 2026-01-29
tags: [orders, migrations, new-launch]
description: Move from Orders API v0 to v2026-01-01 with fewer calls and no Restricted Data Token for PII.
# Content catalog fields (see docs/metrics-assessment.md, item 4.2)
content_id: topic/orders-v2026-01-01-migration
content_type: hot_topic
api_family: orders
selling_partner_scope: seller
provenance: adapted
source_discussion: https://github.com/amzn/selling-partner-api-samples/discussions/253
source_category: Orders Management
engagement_discussion: https://github.com/anjireddylella/developerhub/discussions/6
---

:::note Source attribution
This is a shortened copy of [Discussion #253](https://github.com/amzn/selling-partner-api-samples/discussions/253) in `amzn/selling-partner-api-samples`, used to demo the Developer Hub. Read the original for the full guide and the Postman collection.
:::

Every app that calls Orders API v0 needs to move to v2026-01-01. The new version folds several v0 operations into one, so most integrations make far fewer calls. Buyer and address data no longer need a Restricted Data Token (RDT).

{/* truncate */}

## Why migrate

| | v0 | v2026-01-01 |
|---|---|---|
| Calls for complete order data | 5 (`getOrder`, `getOrderItems`, `getOrderBuyerInfo`, `getOrderAddress`, `getOrderItemsBuyerInfo`) | 1 (`getOrder` with `includedData`) |
| PII access | RDT required | Role-based, no RDT |
| Response size | Fixed | Choose sections with `includedData` |

The original post estimates an average 65% call reduction for high-volume callers.

## Choose what you get back with `includedData`

```http
GET /orders/2026-01-01/orders/{orderId}?includedData=BUYER,RECIPIENT,FULFILLMENT,PACKAGES
```

Values include `BUYER`, `RECIPIENT`, `FULFILLMENT`, `PROCEEDS`, `EXPENSE`, `PROMOTION`, `CANCELLATION`, and `PACKAGES`. Order items are always included. Request only what the workflow needs.

## Update search parameters and values

- Parameters are camelCase: `MarketplaceIds` becomes `marketplaceIds`, and `NextToken` becomes `paginationToken`. The new token expires after 24 hours.
- `OrderStatuses` becomes `fulfillmentStatuses`, and `FulfillmentChannels` becomes `fulfilledBy` (`MFN` is `MERCHANT`, `AFN` is `AMAZON`).
- Status values are upper snake case. Note the spelling change from `Canceled` to `CANCELLED`.
- Boolean flags such as `IsPrime` and `IsBusinessOrder` move into a `programs` array.

## Before go-live

Check that your app can reach the new endpoints, has the roles needed for buyer and recipient data, and parses the new response structure.

## Related content

- [Explore the Orders API in Developer Hub](pathname:///apis/orders)
- [Orders API model (orders_2026-01-01.json)](https://github.com/amzn/selling-partner-api-models/blob/db2936aa19f4b48185173c385c51ab115166f221/models/orders-api-model/orders_2026-01-01.json)
- [B2B delivery experience recipe (Java)](https://github.com/amzn/selling-partner-api-samples/blob/21589c4a467d433c2cb95e80ae61eb28213f2d67/code-recipes/java/src/main/java/b2bdeliveryexperience/BusinessDeliveryExperienceRecipe.java)
- [Original discussion with the Postman migration collection](https://github.com/amzn/selling-partner-api-samples/discussions/253)
- [Discuss this topic in Developer Hub](https://github.com/anjireddylella/developerhub/discussions/6)
