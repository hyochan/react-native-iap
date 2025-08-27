import React, { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home() {
  useEffect(() => {
    location.href = '/docs/get-started';
  }, []);

  return null;
}
