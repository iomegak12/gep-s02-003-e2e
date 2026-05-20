import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip, useTheme } from 'react-native-paper';

/**
 * Horizontal chip row of selectable status filters. `value === null` means "All".
 */
export default function StatusFilterBar({ options, value, onChange }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip
        compact
        selected={value === null}
        onPress={() => onChange(null)}
        style={styles.chip}
        showSelectedCheck={false}
      >
        All
      </Chip>
      {options.map((opt) => (
        <Chip
          key={opt}
          compact
          selected={value === opt}
          onPress={() => onChange(opt)}
          style={styles.chip}
          showSelectedCheck={false}
        >
          {opt.replace(/_/g, ' ')}
        </Chip>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  chip: { marginRight: 6 },
});
