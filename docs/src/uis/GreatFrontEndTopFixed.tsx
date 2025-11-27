import GreatFrontEndBanner, {
  type BannerType,
} from './GreatFrontEndBanner';
import {useMemo} from 'react';

// Banner types with titles (excluding 'default' which has no title)
const BANNER_TYPES: BannerType[] = [
  'coding',
  'quiz',
  'system-design',
  'behavioral',
  'interview-guide',
  'system-design-guide',
  'study-plan',
  'questions',
  'javascript',
  'react',
];

export default function GreatFrontEndTopFixed() {
  // Select a random banner type on mount
  const bannerType = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * BANNER_TYPES.length);
    return BANNER_TYPES[randomIndex];
  }, []);

  return <GreatFrontEndBanner type={bannerType} />;
}
