import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { supplierStatusColor, poStatusColor } from '../theme/tokens';

function hexAlpha(hex, alpha = 0.15) {
  // Best-effort: convert #RRGGBB to rgba.
  if (!hex || hex[0] !== '#' || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function StatusBadge({ value, kind = 'po' }) {
  if (!value) return null;
  const map = kind === 'supplier' ? supplierStatusColor : poStatusColor;
  const color = map[value] || '#6B7280';
  const isCancelled = kind === 'po' && value === 'CANCELLED';
  return (
    <View
      style={[
        styles.badge,
        isCancelled
          ? { borderColor: color, borderWidth: 1, backgroundColor: 'transparent' }
          : { backgroundColor: hexAlpha(color, 0.15) },
      ]}
    >
      <Text style={[styles.text, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  text: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
