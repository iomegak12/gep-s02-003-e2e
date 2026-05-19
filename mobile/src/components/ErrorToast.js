import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Snackbar, Text, useTheme } from 'react-native-paper';

export default function ErrorToast({ visible, error, onDismiss }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (!error) return null;

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={Snackbar.DURATION_INDEFINITE}
      action={{ label: 'Dismiss', onPress: onDismiss }}
      style={{ backgroundColor: theme.colors.inverseSurface }}
    >
      <View>
        <Text style={{ color: theme.colors.inverseOnSurface }}>{error.message}</Text>
        <Pressable onPress={() => setExpanded((v) => !v)} hitSlop={6}>
          <Text style={[styles.toggle, { color: theme.colors.inversePrimary }]}>
            {expanded ? 'Hide details' : 'Details'}
          </Text>
        </Pressable>
        {expanded ? (
          <View style={styles.details}>
            <Text style={[styles.mono, { color: theme.colors.inverseOnSurface }]}>code: {error.code}</Text>
            {error.correlationId ? (
              <Text style={[styles.mono, { color: theme.colors.inverseOnSurface }]}>cid: {error.correlationId}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  toggle: { marginTop: 4, fontSize: 12, textDecorationLine: 'underline' },
  details: { marginTop: 4 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
});
