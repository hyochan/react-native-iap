import React, {useCallback} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

interface IapKitBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

const BANNER_URL = 'https://iapkit.com';
const TRACKING_URL =
  'https://www.hyo.dev/api/ad-banner/cmjf0l2460003249hfyh029dm';

export default function IapKitBanner({
  className = 'iapkit-banner',
  style,
}: IapKitBannerProps) {
  const imageUrl = useBaseUrl('/img/iapkit-banner.gif');

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Fire tracking request (fire and forget)
      fetch(TRACKING_URL, {
        method: 'POST',
        mode: 'no-cors',
      }).catch(() => {
        // Ignore tracking errors
      });
    },
    [],
  );

  return (
    <div
      className={className}
      style={{
        marginTop: 0,
        marginBottom: 12,
        textAlign: 'center',
        ...style,
      }}
    >
      <a
        href={BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          display: 'inline-block',
          textDecoration: 'none',
        }}
      >
        <img
          src={imageUrl}
          alt="IapKit - In-App Purchase Validation Service"
          style={{
            border: 'none',
            display: 'block',
          }}
        />
      </a>
    </div>
  );
}
