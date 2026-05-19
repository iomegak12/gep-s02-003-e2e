import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, List, Switch, RadioButton, Text, useTheme, Divider } from 'react-native-paper';
import Constants from 'expo-constants';
import { useThemeMode } from '../../src/theme/ThemeProvider';
import { RAW_BASE_URLS } from '../../src/api/client';

export default function Settings() {
  const theme = useTheme();
  const { mode, setMode, effective } = useThemeMode();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Title title="Appearance" />
        <Card.Content>
          <RadioButton.Group onValueChange={setMode} value={mode}>
            <RadioButton.Item label="Follow system" value="system" />
            <RadioButton.Item label="Light" value="light" />
            <RadioButton.Item label="Dark" value="dark" />
          </RadioButton.Group>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Currently rendering: {effective}
          </Text>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="Back-end endpoints" />
        <Card.Content style={{ gap: 4 }}>
          <Text variant="labelSmall">IAM</Text>
          <Text style={styles.mono}>{RAW_BASE_URLS.IAM_URL || '(unset)'}</Text>
          <Divider style={{ marginVertical: 4 }} />
          <Text variant="labelSmall">Supplier</Text>
          <Text style={styles.mono}>{RAW_BASE_URLS.SUPPLIER_URL || '(unset)'}</Text>
          <Divider style={{ marginVertical: 4 }} />
          <Text variant="labelSmall">Purchase Order</Text>
          <Text style={styles.mono}>{RAW_BASE_URLS.PO_URL || '(unset)'}</Text>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Title title="App" />
        <Card.Content>
          <List.Item title="Version" description={Constants.expoConfig?.version || '—'} />
          <List.Item title="Package" description={Constants.expoConfig?.android?.package || '—'} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});
