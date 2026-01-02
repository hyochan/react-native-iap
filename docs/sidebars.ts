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
      link: {
        type: 'doc',
        id: 'api/index',
      },
      items: [
        'api/types',
        {
          type: 'category',
          label: 'Core Methods',
          link: {type: 'doc', id: 'api/methods/core-methods'},
          items: [
            'api/methods/unified-apis',
            'api/methods/listeners',
            'api/methods/ios-specific',
            'api/methods/android-specific',
          ],
        },
        'api/use-iap',
        {
          type: 'category',
          label: 'Error Handling',
          link: {type: 'doc', id: 'api/error-handling'},
          items: ['api/error-codes'],
        },
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
      type: 'category',
      label: 'Migrations',
      items: ['guides/migration-v13-to-v14'],
    },
    {
      type: 'doc',
      id: 'guides/ai-assistants',
      label: 'AI Assistants',
    },
    {
      type: 'doc',
      id: 'sponsors',
      label: 'Sponsors',
    },
  ],
};

export default sidebars;
