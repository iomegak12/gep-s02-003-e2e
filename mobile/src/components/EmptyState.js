import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

export default function EmptyState({ title, message, actionLabel, onAction, icon }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconBubble, { backgroundColor: theme.colors.elevation.level2 }]}>
        <Text style={{ fontSize: 28 }}>{icon || '·'}</Text>
      </View>
      {title ? (
        <Text variant="titleMedium" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {message ? (
        <Text variant="bodyMedium" style={[styles.msg, { color: theme.colors.onSurfaceVariant }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel ? (
        <Button mode="contained" onPress={onAction} style={styles.btn}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  iconBubble: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center' },
  msg: { textAlign: 'center', maxWidth: 320 },
  btn: { marginTop: 8 },
});
