import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { useHealth } from '../../src/hooks/useHealth';
import { statusColors } from '../../src/theme/tokens';
import { RAW_BASE_URLS } from '../../src/api/client';

function dotColor(state) {
  if (state === 'ok') return statusColors.healthOk;
  if (state === 'slow') return statusColors.healthSlow;
  if (state === 'down') return statusColors.healthDown;
  return '#9CA3AF';
}

function ServiceRow({ name, url, status }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor(status?.state) }]} />
      <View style={{ flex: 1 }}>
        <Text variant="titleSmall">{name}</Text>
        <Text style={[styles.url, { color: theme.colors.onSurfaceVariant }]}>{url || '(unset)'}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {status?.state === 'unknown'
            ? 'checking…'
            : `${status?.state?.toUpperCase()} · ${status?.latencyMs ?? '—'} ms · ${status?.checkedAt?.slice(11, 19) ?? ''}`}
        </Text>
      </View>
    </View>
  );
}

export default function Health() {
  const { services } = useHealth();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Title title="Service health" subtitle="Polled every 30s" />
        <Card.Content style={{ gap: 16 }}>
          <ServiceRow name="IAM" url={RAW_BASE_URLS.IAM_URL} status={services.iam} />
          <ServiceRow name="Supplier" url={RAW_BASE_URLS.SUPPLIER_URL} status={services.supplier} />
          <ServiceRow name="Purchase Order" url={RAW_BASE_URLS.PO_URL} status={services.po} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  url: { fontFamily: 'monospace', fontSize: 11, marginTop: 2 },
});
