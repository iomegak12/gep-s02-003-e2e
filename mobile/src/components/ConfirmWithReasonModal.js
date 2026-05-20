import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Portal, Dialog, Button, TextInput, HelperText, Text, useTheme } from 'react-native-paper';

/**
 * Generic "confirm with reason" dialog. Used by Reject (PO) in Phase 3;
 * reused later by Cancel (PO), Blacklist (Supplier), Deactivate (Supplier).
 *
 * Props:
 *   visible       — boolean
 *   title         — dialog title (e.g., "Reject purchase order")
 *   message       — short context line (e.g., "PO-2026-00042 will be sent back to the buyer.")
 *   confirmLabel  — button label (default "Confirm")
 *   confirmTone   — 'destructive' | 'primary' (default 'destructive')
 *   minLength     — minimum reason length (default 5, per spec)
 *   loading       — disables actions while a mutation is in flight
 *   onCancel      — close without action
 *   onConfirm     — async (reason) => void
 */
export default function ConfirmWithReasonModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmTone = 'destructive',
  minLength = 5,
  loading = false,
  onCancel,
  onConfirm,
}) {
  const theme = useTheme();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setTouched(false);
    }
  }, [visible]);

  const tooShort = reason.trim().length < minLength;
  const showError = touched && tooShort;
  const destructive = confirmTone === 'destructive';

  const submit = async () => {
    setTouched(true);
    if (tooShort) return;
    await onConfirm?.(reason.trim());
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={loading ? undefined : onCancel} dismissable={!loading}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {message ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              {message}
            </Text>
          ) : null}
          <TextInput
            label="Reason"
            value={reason}
            onChangeText={setReason}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder={`At least ${minLength} characters`}
            error={showError}
          />
          <HelperText type={showError ? 'error' : 'info'} visible>
            {showError ? `Reason must be at least ${minLength} characters.` : `${reason.trim().length} / ${minLength}+`}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            onPress={submit}
            mode="contained"
            loading={loading}
            disabled={loading}
            buttonColor={destructive ? theme.colors.error : undefined}
            textColor={destructive ? theme.colors.onError : undefined}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
