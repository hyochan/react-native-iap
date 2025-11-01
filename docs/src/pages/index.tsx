import {useEffect} from 'react';
import {useHistory} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home() {
  const history = useHistory();
  const introUrl = useBaseUrl('/docs/intro');

  useEffect(() => {
    history.replace(introUrl);
  }, [history, introUrl]);

  return null;
}
