import { useEffect, useRef, useState } from 'react';
import './LoginCarousel.css';

/**
 * Auto-advancing carousel for the login page's right-side brand panel.
 * Slides fade + slide-up on transition. Pauses on hover/focus, advances
 * every `intervalMs`. Manual dot navigation supported.
 *
 * Marketing copy is paraphrased from gep.com (public marketing page).
 */
const SLIDES = [
  {
    eyebrow: 'AI-powered procurement',
    headline: 'Agentic AI does the\nheavy lifting.',
    subhead: 'Automate sourcing, supplier and PO workflows end-to-end — humans review, AI executes.'
  },
  {
    eyebrow: 'Unified Source-to-Pay',
    headline: 'No silos.\nNo gaps.',
    subhead: 'One seamless platform for sourcing, contracts, suppliers, and payments.'
  },
  {
    eyebrow: 'Spend visibility',
    headline: 'Full visibility,\nfrom request to outcome.',
    subhead: 'Buyers get what they need faster while procurement keeps every rupee in view.'
  },
  {
    eyebrow: 'Supply chain resilience',
    headline: 'Build agile,\nresilient supply chains.',
    subhead: 'Powered by advanced AI and decades of procurement expertise.'
  },
  {
    eyebrow: 'Strategy · Software · Services',
    headline: 'Transformation,\nend-to-end.',
    subhead: 'Consulting, an AI-native platform, and managed services — delivered together.'
  }
];

export default function LoginCarousel({ intervalMs = 5500 }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % SLIDES.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [paused, intervalMs]);

  const onPause = () => setPaused(true);
  const onResume = () => setPaused(false);

  return (
    <div
      className="lc"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      tabIndex={-1}
    >
      {/* decorative ambient shapes */}
      <span className="lc__blob lc__blob--a" aria-hidden="true" />
      <span className="lc__blob lc__blob--b" aria-hidden="true" />
      <span className="lc__grid" aria-hidden="true" />

      <div className="lc__brand">
        <span className="lc__logo">N</span>
        <span>Nexus SCM</span>
      </div>

      <div className="lc__stage" aria-live="polite">
        {SLIDES.map((s, i) => (
          <article
            key={i}
            className={`lc__slide${i === idx ? ' is-active' : ''}${i < idx ? ' is-past' : ''}`}
            aria-hidden={i !== idx}
          >
            <div className="lc__eyebrow">{s.eyebrow}</div>
            <h2 className="lc__headline">
              {s.headline.split('\n').map((line, j) => <span key={j}>{line}</span>)}
            </h2>
            <p className="lc__subhead">{s.subhead}</p>
          </article>
        ))}
      </div>

      <div className="lc__dots" role="tablist" aria-label="Slide selector">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === idx}
            aria-label={`Go to slide ${i + 1}`}
            className={`lc__dot${i === idx ? ' is-active' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>

      <div className="lc__attribution t-body-sm">
        Inspired by public marketing copy from gep.com
      </div>
    </div>
  );
}
