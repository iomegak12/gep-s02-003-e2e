import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { statusColors } from '../theme/tokens';

function colorFor(state) {
  if (state === 'ok') return statusColors.healthOk;
  if (state === 'slow') return statusColors.healthSlow;
  if (state === 'down') return statusColors.healthDown;
  return '#9CA3AF';
}

export default function HealthDots({ services, onPress, showLabels = false }) {
  const items = [
    { label: 'IAM', state: services?.iam?.state },
    { label: 'SUP', state: services?.supplier?.state },
    { label: 'PO',  state: services?.po?.state },
  ];

  return (
    <Pressable onPress={onPress} style={styles.row} hitSlop={8}>
      {items.map((s) => (
        <View key={s.label} style={styles.cell}>
          <View style={[styles.dot, { backgroundColor: colorFor(s.state) }]} />
          {showLabels ? <Text style={styles.label}>{s.label}</Text> : null}
        </View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  cell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
