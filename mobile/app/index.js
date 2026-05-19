import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/auth/AuthContext';

const ONBOARDED_KEY = 'nexus.onboarded';

export default function Entry() {
  const router = useRouter();
  const { hydrated, accessToken } = useAuth();

  useEffect(() => {
    (async () => {
      if (!hydrated) return;
      if (accessToken) {
        router.replace('/(app)/dashboard');
        return;
      }
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY).catch(() => null);
      if (onboarded === '1') {
        router.replace('/(auth)/login');
      } else {
        router.replace('/onboarding/carousel');
      }
    })();
  }, [hydrated, accessToken, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
