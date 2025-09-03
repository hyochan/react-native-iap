import React, {useEffect} from 'react';

interface AdFitProps {
  className?: string;
  style?: React.CSSProperties;
  unit: string;
  height: number;
  width: number;
}

export default function AdFit({
  className = 'adfit',
  style,
  unit,
  height,
  width,
}: AdFitProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const targetElement = document.querySelector(`.${className}`);

      if (!targetElement) {
        console.warn(`AdFit: Element with class "${className}" not found`);
        return;
      }

      // Clear existing ads
      const existingAds = targetElement.querySelectorAll('.kakao_ad_area');
      const existingScripts = targetElement.querySelectorAll(
        'script[src*="kas/static/ba.min.js"]',
      );

      existingAds.forEach((ad) => ad.remove());
      existingScripts.forEach((script) => script.remove());

      const ins = document.createElement('ins');
      const scr = document.createElement('script');

      ins.className = 'kakao_ad_area';
      ins.style.cssText = 'display:none; width:100%;';
      scr.async = true;
      scr.type = 'text/javascript';
      scr.src = '//t1.daumcdn.net/kas/static/ba.min.js';

      ins.setAttribute('data-ad-width', width.toString());
      ins.setAttribute('data-ad-height', height.toString());
      ins.setAttribute('data-ad-unit', unit);

      targetElement.appendChild(ins);
      targetElement.appendChild(scr);
    }, 100);

    return () => clearTimeout(timer);
  }, [className, unit, height, width]);

  return (
    <div style={style}>
      <div className={className}></div>
    </div>
  );
}
