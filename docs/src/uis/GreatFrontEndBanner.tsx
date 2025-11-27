import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export type BannerType =
  | 'default'
  | 'coding'
  | 'quiz'
  | 'system-design'
  | 'behavioral'
  | 'interview-guide'
  | 'system-design-guide'
  | 'study-plan'
  | 'questions'
  | 'javascript'
  | 'react';

interface GreatFrontEndBannerProps {
  type?: BannerType;
  className?: string;
  style?: React.CSSProperties;
}

const BANNER_CONFIG: Record<
  BannerType,
  {url: string; title?: string; description?: string}
> = {
  default: {
    url: 'https://www.greatfrontend.com?fpr=hyo73',
  },
  coding: {
    url: 'https://www.greatfrontend.com/prepare/coding?fpr=hyo73',
    title: 'Coding Interview Questions',
    description: 'Practice coding problems for technical interviews',
  },
  quiz: {
    url: 'https://www.greatfrontend.com/questions/formats/quiz?fpr=hyo73',
    title: 'Quiz Interview Questions',
    description: 'Test your knowledge with quiz-style questions',
  },
  'system-design': {
    url: 'https://www.greatfrontend.com/questions/formats/system-design?fpr=hyo73',
    title: 'Front End System Design Questions',
    description: 'Master system design for frontend applications',
  },
  behavioral: {
    url: 'https://www.greatfrontend.com/behavioral-interview-playbook?fpr=hyo73',
    title: 'Behavioral Interview Questions',
    description: 'Prepare for behavioral interview questions',
  },
  'interview-guide': {
    url: 'https://www.greatfrontend.com/front-end-interview-playbook?fpr=hyo73',
    title: 'Front End Interview Guidebook',
    description: 'Complete guide to frontend interviews',
  },
  'system-design-guide': {
    url: 'https://www.greatfrontend.com/front-end-system-design-playbook?fpr=hyo73',
    title: 'Front End System Design Guidebook',
    description: 'Comprehensive system design guide',
  },
  'study-plan': {
    url: 'https://www.greatfrontend.com/interviews/study-plans?fpr=hyo73',
    title: 'Study Plan',
    description: 'Structured learning paths for interview preparation',
  },
  questions: {
    url: 'https://www.greatfrontend.com/questions?fpr=hyo73',
    title: 'Framework-specific Practice Questions',
    description: 'Practice questions for popular frameworks',
  },
  javascript: {
    url: 'https://www.greatfrontend.com/questions/js?fpr=hyo73',
    title: 'JavaScript Interview Questions',
    description: 'Master JavaScript for technical interviews',
  },
  react: {
    url: 'https://www.greatfrontend.com/questions/react?fpr=hyo73',
    title: 'React Interview Questions',
    description: 'Prepare for React-specific interviews',
  },
};

export default function GreatFrontEndBanner({
  type = 'default',
  className = 'greatfrontend-banner',
  style,
}: GreatFrontEndBannerProps) {
  const config = BANNER_CONFIG[type];
  const imageUrl = useBaseUrl('/img/greatfrontend-js.gif');

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
        href={config.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          textDecoration: 'none',
        }}
      >
        <img
          src={imageUrl}
          alt="GreatFrontEnd"
          style={{
            maxWidth: '100%',
            height: 'auto',
            border: 'none',
            display: 'block',
          }}
        />
      </a>
      {config.title && (
        <div
          style={{
            marginTop: 0,
            fontSize: '0.85em',
          }}
        >
          <a
            href={config.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--ifm-color-primary)',
              textDecoration: 'underline',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {config.title}
          </a>
        </div>
      )}
    </div>
  );
}
