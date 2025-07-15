import React, {useEffect, useState} from 'react';
import {Redirect} from 'react-router-dom';
import useBaseUrl from '@docusaurus/useBaseUrl';
import AdFit from '../uis/AdFit';

export default function Home() {
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRedirect(true);
    }, 5000); // Show v13 info for 5 seconds before redirect

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (showRedirect) {
      location.href = '/docs/get-started';
    }
  }, [showRedirect]);

  return (
    <div style={{padding: '20px', textAlign: 'center'}}>
      <div
        style={{
          backgroundColor: '#f8f9fa',
          border: '2px solid #007acc',
          borderRadius: '8px',
          padding: '20px',
          margin: '20px 0',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <h2 style={{color: '#007acc', marginBottom: '16px'}}>
          🎉 react-native-iap v13.0.0 Released!
        </h2>

        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '6px',
            padding: '16px',
            margin: '16px 0',
            textAlign: 'left',
          }}
        >
          <h3
            style={{color: '#856404', margin: '0 0 12px 0', fontSize: '16px'}}
          >
            📢 About This Update (v13.0.0)
          </h3>
          <p style={{fontSize: '14px', margin: '8px 0', fontWeight: 'bold'}}>
            This update focuses on API compatibility with expo-iap and will be
            the final major release.
          </p>
          <ul
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '8px 0',
              paddingLeft: '20px',
            }}
          >
            <li>
              🔄 <strong>API Synchronization</strong>: Maximum compatibility
              with expo-iap API specifications
            </li>
            <li>
              ⚠️ <strong>Deprecation Notice</strong>: react-native-iap will be
              deprecated in favor of expo-iap
            </li>
            <li>
              🚫 <strong>No Further Updates</strong>: No additional feature
              updates or major releases are planned
            </li>
            <li>
              🏗️ <strong>Modern Features</strong>: For TurboModules support and
              latest React Native features, please migrate to{' '}
              <a
                href="https://github.com/hyochan/expo-iap"
                style={{color: '#007acc'}}
              >
                expo-iap
              </a>
            </li>
          </ul>
          <p
            style={{
              fontSize: '14px',
              margin: '12px 0 0 0',
              fontWeight: 'bold',
              color: '#856404',
            }}
          >
            Migration is highly recommended for:
          </p>
          <ul
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              margin: '8px 0',
              paddingLeft: '20px',
            }}
          >
            <li>TurboModules support</li>
            <li>Better performance and stability</li>
            <li>Continued updates and support</li>
            <li>Modern React Native architecture</li>
          </ul>
        </div>

        <p style={{fontSize: '16px', lineHeight: '1.5', margin: '12px 0'}}>
          New features added for compatibility with expo-iap v2.5.2:
        </p>
        <ul style={{textAlign: 'left', fontSize: '14px', lineHeight: '1.6'}}>
          <li>iOS receipt validation methods</li>
          <li>Enhanced useIAP hook with callback support</li>
          <li>iOS 16+ transaction fields support</li>
          <li>Field name compatibility for expo-iap</li>
        </ul>
        <p style={{fontSize: '14px', color: '#666', marginTop: '16px'}}>
          Check out the{' '}
          <a href="/docs/migrate_to_13.0.0" style={{color: '#007acc'}}>
            migration guide
          </a>{' '}
          for detailed information.
        </p>
      </div>

      <AdFit
        unit="DAN-YTmjDwlbcP42HBg6"
        height={100}
        width={320}
        className="adfit-top"
        style={{
          height: 100,
          width: 320,
          marginTop: 24,
        }}
      />

      <p style={{fontSize: '12px', color: '#888', marginTop: '16px'}}>
        Redirecting to getting started guide in 5 seconds...
      </p>
    </div>
  );
}
