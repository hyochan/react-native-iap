import React, {useCallback} from 'react';

interface IapKitLinkProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const IAPKIT_URL = 'https://iapkit.com';
const TRACKING_URL =
  'https://www.hyo.dev/api/ad-banner/cmjf0l2460003249hfyh029dm';

export default function IapKitLink({
  children,
  className,
  style,
}: IapKitLinkProps) {
  const handleClick = useCallback(() => {
    // Fire tracking request (fire and forget)
    fetch(TRACKING_URL, {
      method: 'POST',
      mode: 'no-cors',
    }).catch(() => {
      // Ignore tracking errors
    });
  }, []);

  return (
    <a
      href={IAPKIT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}
