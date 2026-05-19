import React from 'react';
import Svg, { Rect, Text as SvgText, Circle } from 'react-native-svg';

/**
 * GEP wordmark — placeholder.
 *
 * Replace this component with the official gep.com brand asset when available:
 *   1. Drop the official SVG at `assets/branding/gep-logo.svg`.
 *   2. Import it directly: `import GepOfficial from '../../assets/branding/gep-logo.svg';`
 *      (react-native-svg-transformer is already configured in metro.config.js).
 *   3. Render it instead of the inline SVG below.
 *
 * Sizing: the component scales by `size` (height). Width auto-adjusts to keep the
 * "GEP" wordmark proportional (≈ 3:1 width-to-height).
 */
export default function GepLogo({
  size = 48,
  color = '#1d20e9',
  accent = '#3E46FF',
  variant = 'full', // 'full' | 'mark'
}) {
  if (variant === 'mark') {
    // Compact circular badge with the letter G — for app bars / avatars.
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Circle cx={32} cy={32} r={30} fill={color} />
        <SvgText
          x={32}
          y={42}
          fontSize={32}
          fontWeight="700"
          fill="#ffffff"
          textAnchor="middle"
          fontFamily="Roboto"
        >
          G
        </SvgText>
        <Circle cx={50} cy={18} r={4} fill={accent} />
      </Svg>
    );
  }

  // Full "GEP" wordmark on a pill background.
  const width = size * 2.6;
  return (
    <Svg width={width} height={size} viewBox="0 0 156 60" fill="none">
      <Rect x={0} y={0} width={156} height={60} rx={12} fill={color} />
      <SvgText
        x={78}
        y={42}
        fontSize={32}
        fontWeight="700"
        fill="#ffffff"
        textAnchor="middle"
        fontFamily="Roboto"
        letterSpacing={2}
      >
        GEP
      </SvgText>
      <Circle cx={134} cy={18} r={4} fill={accent} />
    </Svg>
  );
}
