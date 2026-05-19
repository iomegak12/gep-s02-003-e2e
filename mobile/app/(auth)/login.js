import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Text, TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import GepLogo from '../../src/components/GepLogo';
import PersonaIcon from '../../src/components/PersonaIcon';
import ErrorToast from '../../src/components/ErrorToast';
import { SAMPLE_CREDENTIALS } from '../../src/auth/sampleCredentials';
import { useAuth } from '../../src/auth/AuthContext';
import { login as apiLogin } from '../../src/api/iam';
import { extractApiError } from '../../src/api/client';
import { landingForRoles } from '../../src/utils/roles';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErr, setFieldErr] = useState({});

  const fillFrom = (p) => {
    setEmail(p.email);
    setPassword(p.password);
    setFieldErr({});
    setError(null);
  };

  const onSubmit = async () => {
    setFieldErr({});
    setError(null);
    const errs = {};
    if (!email) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    if (Object.keys(errs).length) {
      setFieldErr(errs);
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiLogin(email.trim(), password);
      await signIn(data);
      const dest = landingForRoles(data?.user?.roles || []);
      router.replace(dest);
    } catch (err) {
      const apiErr = extractApiError(err);
      if (apiErr.code === 'VALIDATION_FAILED') {
        setFieldErr({ email: 'Check your inputs', password: 'Check your inputs' });
      }
      setError(apiErr);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: theme.colors.background }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.duration(450)} style={styles.brand}>
          <GepLogo size={56} color={theme.colors.primary} accent={theme.colors.primaryContainer} />
          <Text variant="titleLarge" style={styles.brandText}>
            Nexus SCM
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sign in to your procurement workspace
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(120).duration(450)} style={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            mode="outlined"
            error={!!fieldErr.email}
            left={<TextInput.Icon icon="email-outline" />}
          />
          <HelperText type="error" visible={!!fieldErr.email}>
            {fieldErr.email}
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            mode="outlined"
            error={!!fieldErr.password}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={secure ? 'eye-outline' : 'eye-off-outline'}
                onPress={() => setSecure((v) => !v)}
              />
            }
          />
          <HelperText type="error" visible={!!fieldErr.password}>
            {fieldErr.password}
          </HelperText>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submit}
            contentStyle={{ paddingVertical: 6 }}
          >
            Sign In
          </Button>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(220).duration(450)} style={styles.sampleBlock}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            QUICK FILL — SAMPLE PERSONAS
          </Text>
          <View style={styles.sampleRow}>
            {SAMPLE_CREDENTIALS.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [
                  styles.sampleBtn,
                  { backgroundColor: p.accent, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => fillFrom(p)}
                accessibilityLabel={`Fill credentials for ${p.label}`}
              >
                <PersonaIcon variant={p.id} size={28} color="#fff" />
                <Text style={styles.sampleLabel}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <ErrorToast visible={!!error} error={error} onDismiss={() => setError(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 24, gap: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 4, marginBottom: 8 },
  brandText: { fontWeight: '700' },
  form: { gap: 0 },
  submit: { marginTop: 8, borderRadius: 4 },
  sampleBlock: { gap: 12 },
  sampleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sampleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  sampleLabel: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
});
