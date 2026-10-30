// Edit this list to change the Resources page. Clicks on these links are
// recorded as outbound-click events, so you can see which resources get used.
//
// TODO (needs owner input): add the official links for the SP-API website,
// SP-API SDK, and SP-API Developer Support listed in the samples repo README.

const RESOURCES = [
  {
    group: 'Documentation',
    items: [
      {
        title: 'SP-API documentation',
        href: 'https://developer-docs.amazon/sp-api/',
        description: 'The official reference and guides.',
      },
      {
        title: 'Connecting to the Selling Partner API',
        href: 'https://developer-docs.amazon/sp-api/docs/connecting-to-the-selling-partner-api',
        description: 'Get an LWA access token and make your first request.',
      },
    ],
  },
  {
    group: 'Models and client libraries',
    items: [
      {
        title: 'selling-partner-api-models',
        href: 'https://github.com/amzn/selling-partner-api-models',
        description: 'OpenAPI models for every SP-API, plus Java, C#, and Python client libraries.',
      },
    ],
  },
  {
    group: 'Code samples and tools',
    items: [
      {
        title: 'selling-partner-api-samples',
        href: 'https://github.com/amzn/selling-partner-api-samples',
        description: 'Code recipes and deployable sample solutions.',
      },
      {
        title: 'SP-API MCP server',
        href: 'https://www.npmjs.com/package/@amazon-sp-api-release/sp-api-dev-mcp',
        description: 'Local MCP server with the SP-API Dev Assistant and Workflow Builder.',
      },
    ],
  },
];

export default RESOURCES;
