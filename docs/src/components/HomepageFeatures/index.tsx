import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Cross-Platform',
    emoji: '🔄',
    description: (
      <>
        Works seamlessly on both iOS and Android with a unified API. Handle
        platform differences automatically while maintaining consistent behavior
        across devices.
      </>
    ),
  },
  {
    title: 'TypeScript First',
    emoji: '🎯',
    description: (
      <>
        Built with TypeScript from the ground up. Get full type safety,
        intelligent autocomplete, and catch errors at compile time for a better
        developer experience.
      </>
    ),
  },
  {
    title: 'Error Resilience',
    emoji: '🛡️',
    description: (
      <>
        Centralized error handling with meaningful error codes.
        Platform-specific errors are automatically mapped to standardized codes
        for consistent error management.
      </>
    ),
  },
  {
    title: 'Modern React Hooks',
    emoji: '🎣',
    description: (
      <>
        Use the powerful <code>useIAP</code> hook for all your in-app purchase
        needs. Clean, modern API that integrates perfectly with React function
        components.
      </>
    ),
  },
  {
    title: 'Receipt Validation',
    emoji: '🔍',
    description: (
      <>
        Built-in receipt validation for both iOS and Android. Verify purchases
        securely and handle edge cases automatically for reliable transaction
        processing.
      </>
    ),
  },
  {
    title: 'Up to Date',
    emoji: '🚀',
    description: (
      <>
        Always up-to-date with the latest StoreKit 2, Android Billing Library,
        and store requirements. Automatic compatibility with new iOS and Android
        versions for future-proof implementations.
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <div className={styles.featureEmoji} role="img">
          {emoji}
        </div>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
