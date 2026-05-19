import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// Inline persona avatars used on the Login screen.
// `variant` ∈ 'buyer' | 'approver' | 'approver-lo' | 'admin'.
export default function PersonaIcon({ variant = 'buyer', size = 28, color = '#ffffff' }) {
  const head = 'M32 22a8 8 0 1 1 0 16 8 8 0 0 1 0-16z';

  let badge = null;
  if (variant === 'buyer') {
    badge = <Path d="M20 44 h24 v6 H20z" fill={color} />;
  } else if (variant === 'approver') {
    badge = <Path d="M22 46 l6 6 14-14" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  } else if (variant === 'approver-lo') {
    badge = (
      <>
        <Path d="M22 46 l6 6 14-14" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={48} cy={48} r={6} fill="#F59E0B" stroke={color} strokeWidth={2} />
      </>
    );
  } else if (variant === 'admin') {
    badge = (
      <Path
        d="M32 40 l8 4 v6 c0 4 -4 6 -8 6 s-8 -2 -8 -6 v-6 z"
        fill={color}
      />
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d={head} fill={color} />
      {badge}
    </Svg>
  );
}
