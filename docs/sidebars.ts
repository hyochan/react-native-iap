import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/setup-ios',
        {
          type: 'category',
          label: 'Android Setup',
          link: {type: 'doc', id: 'getting-started/setup-android'},
          items: ['getting-started/setup-horizon'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/purchases',
        'guides/lifecycle',
        'guides/subscription-offers',
        'guides/subscription-validation',
        'guides/offer-code-redemption',
        'guides/alternative-billing',
        'guides/error-handling',
        'guides/expo-plugin',
        'guides/troubleshooting',
        'guides/faq',
        'guides/support',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/index',
        'api/use-iap',
        {
          type: 'category',
          label: 'Methods',
          items: [
            'api/methods/core-methods',
            'api/methods/listeners',
          ],
        },
        'api/types',
        'api/error-codes',
        'api/error-handling',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/purchase-flow',
        'examples/subscription-flow',
        'examples/available-purchases',
        'examples/offer-code',
        'examples/alternative-billing',
      ],
    },
    {
      type: 'doc',
      id: 'sponsors',
      label: 'Sponsors',
    },
  ],
};

export default sidebars;
