import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

// Inline SVG mark for Nexus SCM (placeholder until a designer asset lands at assets/branding/gep-logo.svg).
// Uses two stacked shapes to evoke "stacked supply" — replace with the official logo when available.
export default function BrandLogo({ size = 64, color = '#1d20e9', accent = '#3E46FF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="8" y="8" width="48" height="48" rx="10" fill={color} />
      <Path
        d="M20 38 L32 22 L44 38 Z"
        fill={accent}
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect x="24" y="40" width="16" height="8" rx="2" fill="#ffffff" />
    </Svg>
  );
}
