---
sidebar_position: 1
title: Start here
description: The shortest path from zero to your first Selling Partner API call.
---

# Start here

The Selling Partner API (SP-API) lets you build applications that work with Amazon seller and vendor data: orders, listings, inventory, reports, and more. This page is a short path to your first call. The [official SP-API documentation](https://developer-docs.amazon/sp-api/) remains the source of truth for every detail.

## 1. Register as a developer and create an app

Register in Solution Provider Portal or Seller Central, then create an app client. You'll get a **client ID** and **client secret**.

## 2. Get a Login with Amazon (LWA) access token

Exchange your refresh token for a short-lived access token at `https://api.amazon.com/auth/o2/token`. Access tokens expire after about an hour, so refresh them as needed.

:::warning Keep credentials private
Never share your client secret, refresh token, or access token in community posts, screenshots, or public code.
:::

## 3. Call an operation

Send the access token in the `x-amz-access-token` header, along with a `user-agent` that names your application:

```http
GET /catalog/2022-04-01/items/EXAMPLEASIN?marketplaceIds=ATVPDKIKX0DER HTTP/1.1
host: sellingpartnerapi-na.amazon.com
user-agent: MySellingTool/1.0 (Language=Java/21)
x-amz-access-token: LWA_ACCESS_TOKEN_EXAMPLE
x-amz-date: 20261026T120000Z
```

See [Connecting to the Selling Partner API](https://developer-docs.amazon/sp-api/docs/connecting-to-the-selling-partner-api) for the full steps.

## Next steps

- Browse [code recipes and sample solutions](https://github.com/amzn/selling-partner-api-samples).
- Generate a client from the [API models](https://github.com/amzn/selling-partner-api-models).
- Stuck? [Ask the community](/community/questions).
