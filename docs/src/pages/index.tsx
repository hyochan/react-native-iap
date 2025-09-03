import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '../components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const heroImageUrl = useBaseUrl('/img/icon.png');

  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <Heading as="h1" className="hero__title">
              {siteConfig.title}
            </Heading>
            <p className="hero__subtitle">{siteConfig.tagline}</p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/intro"
              >
                Get Started - 5min ⏱️
              </Link>
              <Link
                className="button button--outline button--lg"
                to="/docs/installation"
                style={{marginLeft: '1rem'}}
              >
                Installation Guide
              </Link>
            </div>
          </div>
          <div className={styles.heroImage}>
            <img
              src={heroImageUrl}
              alt="React Native IAP Hero"
              className={styles.heroImg}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - In-App Purchase for Expo & React Native`}
      description="Powerful in-app purchase solution for Expo and React Native with TypeScript support, centralized error handling, and cross-platform compatibility."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
