import React, {useCallback} from 'react';
import {IAPKIT_URL, TRACKING_URL} from '../constants';

interface IapKitLinkProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

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
