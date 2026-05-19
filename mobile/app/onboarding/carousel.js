import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, useWindowDimensions, Pressable } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GepLogo from '../../src/components/GepLogo';

const ONBOARDED_KEY = 'nexus.onboarded';

const SLIDES = [
  {
    key: 's1',
    title: 'Unified Supplier Directory',
    body: 'Find, vet, and act on every supplier — categories, ratings, and status all in one view.',
    accent: '#3E46FF',
  },
  {
    key: 's2',
    title: 'Purchase Orders That Move',
    body: 'Create, submit, and track POs with explicit approvals, line items, and spend visibility.',
    accent: '#10B981',
  },
  {
    key: 's3',
    title: 'Approvals On The Go',
    body: 'Approver inbox at your fingertips — approve or reject within your authority, anywhere.',
    accent: '#F59E0B',
  },
];

export default function Carousel() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const onMomentumScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index: i }) => (
          <View style={[styles.slide, { width }]}>
            <Animated.View entering={FadeIn.delay(80).duration(500)} style={styles.illustration}>
              <LinearGradient
                colors={[item.accent + '33', '#ffffff00']}
                style={styles.bubble}
              >
                <GepLogo size={84} color={item.accent} accent="#ffffff" />
              </LinearGradient>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.copy}>
              <Text variant="headlineMedium" style={styles.title}>
                {item.title}
              </Text>
              <Text variant="bodyLarge" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
                {item.body}
              </Text>
            </Animated.View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === index ? theme.colors.primary : theme.colors.outlineVariant,
                  width: i === index ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={finish} hitSlop={8}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>Skip</Text>
          </Pressable>
          <Button mode="contained" onPress={next} contentStyle={{ paddingHorizontal: 16 }}>
            {index < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  illustration: { alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  bubble: { width: 240, height: 240, borderRadius: 120, alignItems: 'center', justifyContent: 'center' },
  copy: { alignItems: 'center', gap: 12 },
  title: { textAlign: 'center', fontWeight: '700' },
  body: { textAlign: 'center', maxWidth: 320 },
  footer: { padding: 24, gap: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
