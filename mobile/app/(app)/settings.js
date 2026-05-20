import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {
  Card,
  List,
  RadioButton,
  Text,
  useTheme,
  Divider,
  Button,
  Snackbar,
  Chip,
} from 'react-native-paper';
import Constants from 'expo-constants';
import { useThemeMode } from '../../src/theme/ThemeProvider';
import { RAW_BASE_URLS } from '../../src/api/client';
import { useNotifications } from '../../src/notifications/NotificationsContext';

export default function Settings() {
  const theme = useTheme();
  const { mode, setMode, effective } = useThemeMode();
  const { token, permissionGranted } = useNotifications();
  const [toast, setToast] = useState(null);

  const copyToken = async () => {
    if (!token) return;
    try {
      await Clipboard.setStringAsync(token);
      setToast('FCM token copied to clipboard');
    } catch {
      setToast('Could not copy token');
    }
  };

  return (
    <View style={{ flex: 1 }}>
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
          <Card.Title title="Push notifications" />
          <Card.Content style={{ gap: 8 }}>
            <View style={styles.permRow}>
              <Text variant="bodyMedium">Permission</Text>
              <Chip
                compact
                style={{
                  backgroundColor: permissionGranted
                    ? theme.colors.primaryContainer
                    : theme.colors.errorContainer,
                }}
                textStyle={{
                  color: permissionGranted
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onErrorContainer,
                }}
              >
                {permissionGranted ? 'Granted' : 'Denied / pending'}
              </Chip>
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              FCM device token
            </Text>
            <Text style={styles.mono} selectable>
              {token || '(token not yet issued)'}
            </Text>
            <Button mode="outlined" onPress={copyToken} disabled={!token} style={{ marginTop: 4 }}>
              Copy token
            </Button>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Send a test push from Firebase Console → Cloud Messaging using this token. Include
              {' '}<Text style={styles.mono}>data.deep_link</Text> like
              {' '}<Text style={styles.mono}>/(app)/approvals</Text> to deep-link.
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <Card.Title title="App" />
          <Card.Content>
            <List.Item title="Version" description={Constants.expoConfig?.version || '—'} />
            <List.Item
              title="Package"
              description={Constants.expoConfig?.android?.package || '—'}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={!!toast}
        onDismiss={() => setToast(null)}
        duration={1800}
        style={{ backgroundColor: theme.colors.inverseSurface }}
      >
        <Text style={{ color: theme.colors.inverseOnSurface }}>{toast}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  permRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
