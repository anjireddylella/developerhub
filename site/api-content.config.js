const MODEL_COMMIT = 'db2936aa19f4b48185173c385c51ab115166f221';
const SAMPLE_COMMIT = '21589c4a467d433c2cb95e80ae61eb28213f2d67';
const MODELS_REPO = 'https://github.com/amzn/selling-partner-api-models';
const SAMPLES_REPO = 'https://github.com/amzn/selling-partner-api-samples';
const HUB_REPO = 'https://github.com/anjireddylella/developerhub';

const modelSource = (sourcePath, digest) => ({
  localPath: `selling-partner-api-models/${sourcePath}`,
  sourcePath,
  commit: MODEL_COMMIT,
  digest,
  sourceUrl: `${MODELS_REPO}/blob/${MODEL_COMMIT}/${sourcePath}`,
  commitUrl: `${MODELS_REPO}/commit/${MODEL_COMMIT}`,
  historyUrl: `${MODELS_REPO}/commits/main/${sourcePath}`,
  licenseRoutes: [
    '/licenses/selling-partner-api-models/license',
    '/licenses/selling-partner-api-models/notice',
  ],
  licenseSourceUrls: [
    `${MODELS_REPO}/blob/${MODEL_COMMIT}/LICENSE`,
    `${MODELS_REPO}/blob/${MODEL_COMMIT}/NOTICE`,
  ],
});

const recipeSource = ({id, title, language, sourcePath, digest, start, end, note}) => ({
  id,
  title,
  language,
  codeId: `recipe/${id}/${language}`,
  localPath: `selling-partner-api-samples/${sourcePath}`,
  sourcePath,
  commit: SAMPLE_COMMIT,
  digest,
  sourceUrl: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/${sourcePath}`,
  start,
  end,
  note,
  licenseRoute: '/licenses/selling-partner-api-samples/license',
  licenseUrl: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/LICENSE`,
});

const genericQuestions = {
  hubUrl: '/community/questions',
  askUrl: `${HUB_REPO}/discussions/new?category=q-a`,
};

const config = {
  repositories: {
    models: {url: MODELS_REPO, commit: MODEL_COMMIT},
    samples: {url: SAMPLES_REPO, commit: SAMPLE_COMMIT},
  },
  authorization: {
    text: 'Authorization and role requirements are not encoded in this pinned model. Follow the official Connecting to the Selling Partner API guide and the API-specific role documentation before calling these operations.',
    connectingGuide: 'https://developer-docs.amazon/sp-api/docs/connecting-to-the-selling-partner-api',
  },
  licenses: [
    {
      id: 'models-license',
      title: 'Selling Partner API models license',
      route: '/licenses/selling-partner-api-models/license',
      localPath: 'selling-partner-api-models/LICENSE',
      sourcePath: 'LICENSE',
      commit: MODEL_COMMIT,
      digest: '09e8a9bcec8067104652c168685ab0931e7868f9c8284b66f5ae6edae5f1130b',
      repositoryUrl: MODELS_REPO,
      sourceUrl: `${MODELS_REPO}/blob/${MODEL_COMMIT}/LICENSE`,
    },
    {
      id: 'models-notice',
      title: 'Selling Partner API models NOTICE',
      route: '/licenses/selling-partner-api-models/notice',
      localPath: 'selling-partner-api-models/NOTICE',
      sourcePath: 'NOTICE',
      commit: MODEL_COMMIT,
      digest: 'd4290ed64c2edd0fce1d84e3f9dfb2881240fe534def76b8cd29ed6af683e287',
      repositoryUrl: MODELS_REPO,
      sourceUrl: `${MODELS_REPO}/blob/${MODEL_COMMIT}/NOTICE`,
    },
    {
      id: 'samples-license',
      title: 'Selling Partner API samples license',
      route: '/licenses/selling-partner-api-samples/license',
      localPath: 'selling-partner-api-samples/LICENSE',
      sourcePath: 'LICENSE',
      commit: SAMPLE_COMMIT,
      digest: '7cb750713252efd1d578837ba8785b61319109906f0c10b87adab7cf4badfc42',
      repositoryUrl: SAMPLES_REPO,
      sourceUrl: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/LICENSE`,
    },
  ],
  apis: [
    {
      slug: 'data-kiosk',
      title: 'Data Kiosk API',
      version: '2023-11-15',
      status: 'Demo snapshot',
      apiFamily: 'data-kiosk',
      sellingPartnerScope: 'unknown',
      summary: 'Submit GraphQL queries, monitor their progress, and retrieve generated documents.',
      guideUrl: 'https://developer-docs.amazon/sp-api/docs/data-kiosk-api-v2023-11-15-reference',
      model: {
        ...modelSource(
          'models/data-kiosk-api-model/dataKiosk_2023-11-15.json',
          'ce2b4a7eb421af8454432489889de57f78deef95ad7cf4f380f3b3daf8831ce7',
        ),
        selectedOperations: ['getQueries', 'createQuery', 'cancelQuery', 'getQuery', 'getDocument'],
        codeId: 'model/data-kiosk',
      },
      recipeGroups: [
        {
          id: 'data-kiosk-submit-query',
          title: 'Submit a query',
          description: 'Create a Data Kiosk query and return its query ID.',
          entries: [
            recipeSource({
              id: 'data-kiosk/submit-query',
              title: 'Submit query',
              language: 'java',
              sourcePath: 'code-recipes/java/src/main/java/datakiosk/DataKioskQueryRecipe.java',
              digest: '55ffd7f3a2310dc45597e881d7f10fb1ea72865d933a87050348151a7f8a481c',
              start: '    private String submitQuery() {',
              end: '    private Map<String, Object> parseNotification(',
            }),
            recipeSource({
              id: 'data-kiosk/submit-query',
              title: 'Submit query',
              language: 'python',
              sourcePath: 'code-recipes/python/src/recipes/datakiosk/datakiosk_query_recipe.py',
              digest: 'bd436f7afe5c46e4f6bd1d418bfb0258e5f122b7de91f7c820dfcd9071f4f158',
              start: '    def submit_query(self) -> str:',
              end: '    # -------------------------------------------------------------------------\n    # Step 2 – Handle DATA_KIOSK_QUERY_PROCESSING_FINISHED notification',
            }),
          ],
        },
      ],
      recipesEmpty: null,
      samples: [
        {
          id: 'data-kiosk-workflow',
          title: 'Data Kiosk workflow sample',
          description: 'A deployable educational workflow for submitting queries, processing notifications, and storing generated documents.',
          languages: ['Java', 'Python'],
          applicability: 'seller',
          warning: 'Educational sample only. Review its architecture, permissions, security, and costs before adapting it.',
          localPath: 'selling-partner-api-samples/use-cases/data-kiosk/README.md',
          digest: 'dafb3af682440af9a65da5f487d11e767db163d74733722a361883d2e3aeb3f1',
          sourceUrl: `${SAMPLES_REPO}/tree/${SAMPLE_COMMIT}/use-cases/data-kiosk`,
          licenseUrl: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/LICENSE`,
          readmeUrl: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/use-cases/data-kiosk/README.md`,
          documentation: [
            {
              label: 'Deployment guide',
              url: `${SAMPLES_REPO}/blob/${SAMPLE_COMMIT}/use-cases/data-kiosk/docs/DEPLOYMENT.md`,
            },
          ],
        },
      ],
      samplesEmpty: null,
      topics: [
        {
          title: 'Parsing reports efficiently',
          description: 'Cross-API guidance for resilient parsing of JSON and other report formats.',
          route: '/blog/parsing-reports-efficiently',
        },
      ],
      topicsEmpty: null,
      questions: genericQuestions,
    },
    {
      slug: 'orders',
      title: 'Orders API',
      version: '2026-01-01',
      status: 'Demo snapshot',
      apiFamily: 'orders',
      sellingPartnerScope: 'unknown',
      summary: 'Search orders and retrieve a selected order using the pinned 2026 model.',
      guideUrl: 'https://developer-docs.amazon/sp-api/reference/searchorders',
      model: {
        ...modelSource(
          'models/orders-api-model/orders_2026-01-01.json',
          'cd5d1fda9b9b301970e3349868e19703f65af83213e24385b850bb46a2667588',
        ),
        selectedOperations: ['searchOrders', 'getOrder'],
        codeId: 'model/orders',
      },
      recipeGroups: [
        {
          id: 'orders-legacy-get-order',
          title: 'Related legacy recipe: get order (v0)',
          description: 'This exact excerpt calls Orders API v0. It is not compatible code for the displayed Orders API v2026-01-01 model.',
          legacy: true,
          entries: [
            recipeSource({
              id: 'orders/legacy-get-order',
              title: 'Get order (legacy v0)',
              language: 'java',
              sourcePath: 'code-recipes/java/src/main/java/b2bdeliveryexperience/BusinessDeliveryExperienceRecipe.java',
              digest: '1f32d0c44175f0f33ff079e9e5a4abd5eecfd2a64505ed3053702a898ba6ed35',
              start: '    /**\n     * Gets order details - no Restricted Data Token required.',
              end: '    /**\n     * Gets Purchase Order Number - REQUIRES Restricted Data Token (RDT) for PII access.',
              note: 'Use the migration hot topic before adapting this legacy v0 recipe.',
            }),
          ],
        },
      ],
      recipesEmpty: null,
      samples: [],
      samplesEmpty: 'No Orders sample solution is included in this demo snapshot. The B2B delivery item above is a legacy code recipe, not a deployable sample solution.',
      topics: [
        {
          title: 'Migrate to Orders API v2026-01-01',
          description: 'A short migration guide adapted from the source samples repository.',
          route: '/blog/orders-api-v2026-01-01-migration',
        },
      ],
      topicsEmpty: null,
      questions: {
        ...genericQuestions,
        discussionUrl: `${HUB_REPO}/discussions/6`,
        discussionLabel: 'Discuss the Orders migration',
      },
    },
    {
      slug: 'vehicles',
      title: 'Vehicles API',
      version: '2024-11-01',
      status: 'Demo snapshot',
      apiFamily: 'vehicles',
      sellingPartnerScope: 'unknown',
      summary: 'Retrieve the latest collection of automotive vehicle definitions.',
      guideUrl: 'https://developer-docs.amazon/sp-api/reference/vehicles-v2024-11-01',
      model: {
        ...modelSource(
          'models/vehicles-api-model/vehicles_2024-11-01.json',
          'eb3ba539e293191648ea6a723b9f5a29f13a3de2e0ccb225cb04def402a292d0',
        ),
        selectedOperations: ['getVehicles'],
        codeId: 'model/vehicles',
      },
      recipeGroups: [],
      recipesEmpty: 'No recipe is included in this demo snapshot.',
      samples: [],
      samplesEmpty: 'No sample solution is included in this demo snapshot.',
      topics: [],
      topicsEmpty: 'No related hot topic is included in this demo snapshot.',
      questions: genericQuestions,
    },
    {
      slug: 'easy-ship',
      title: 'Easy Ship API',
      version: '2022-03-23',
      status: 'Demo snapshot',
      apiFamily: 'easy-ship',
      sellingPartnerScope: 'unknown',
      summary: 'Find handover slots and create, retrieve, or update scheduled packages.',
      guideUrl: 'https://developer-docs.amazon/sp-api/reference/easy-ship-v2022-03-23',
      model: {
        ...modelSource(
          'models/easy-ship-model/easyShip_2022-03-23.json',
          'fa3e41886100ed28be343eb76eb71471509c2fcbf7de4cd6f35c6a8d03f4ad52',
        ),
        selectedOperations: [
          'listHandoverSlots',
          'getScheduledPackage',
          'createScheduledPackage',
          'updateScheduledPackages',
          'createScheduledPackageBulk',
        ],
        codeId: 'model/easy-ship',
      },
      recipeGroups: [
        {
          id: 'easy-ship-retrieve-order',
          title: 'Retrieve order',
          description: 'Calls Orders API v0 to identify an Easy Ship order; it is related setup, not an Easy Ship model operation.',
          entries: [
            recipeSource({
              id: 'easy-ship/retrieve-order',
              title: 'Retrieve order',
              language: 'java',
              sourcePath: 'code-recipes/java/src/main/java/easyship/RetrieveOrderRecipe.java',
              digest: '70c46f752735bd772d1c8a8d34b0f8893430529adc5ab9a994d1269608fc782e',
              start: '    private GetOrderResponse getOrder() {',
              end: '    private GetOrderItemsResponse getOrderItems() {',
            }),
            recipeSource({
              id: 'easy-ship/retrieve-order',
              title: 'Retrieve order',
              language: 'php',
              sourcePath: 'code-recipes/php/src/easyship/RetrieveOrderRecipe.php',
              digest: '69062741b22dc81d88bf67cb77eba3deb787c5ba7daef8c95935b44d81de32bc',
              start: '    private function getOrder()\n    {',
              end: '    private function getOrderItems()\n    {',
            }),
          ],
        },
        {
          id: 'easy-ship-handover-slots',
          title: 'Get handover slots',
          description: 'Build a package request and call listHandoverSlots.',
          entries: [
            recipeSource({
              id: 'easy-ship/get-handover-slots',
              title: 'Get handover slots',
              language: 'java',
              sourcePath: 'code-recipes/java/src/main/java/easyship/GetHandoverSlotsRecipe.java',
              digest: '7094bf1dc6e1e7ae1d01866182ff059fdae73a927360f3dbf13a925c6b1af2ac',
              start: '    private ListHandoverSlotsResponse listHandoverSlots() {',
              end: '    private Dimensions createPackageDimensions() {',
            }),
            recipeSource({
              id: 'easy-ship/get-handover-slots',
              title: 'Get handover slots',
              language: 'php',
              sourcePath: 'code-recipes/php/src/easyship/GetHandoverSlotsRecipe.php',
              digest: '0d915f76d868f3739875da7f11a7c131615203a47005a6a7bd11b2218bb26c8d',
              start: '    private function listHandoverSlots()\n    {',
              end: '    private function createPackageDimensions(): Dimensions\n    {',
            }),
          ],
        },
      ],
      recipesEmpty: null,
      samples: [],
      samplesEmpty: 'No sample solution is included in this demo snapshot.',
      topics: [],
      topicsEmpty: 'No related hot topic is included in this demo snapshot.',
      questions: genericQuestions,
    },
  ],
};

export default config;
