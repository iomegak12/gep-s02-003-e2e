import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';

export default function Terms() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Title title="Terms of Service" />
        <Card.Content>
          <Text variant="bodyMedium">
            Placeholder. The Nexus SCM mobile app is provided for authorised users of the buying organisation. By using
            this app you agree to follow your organisation's procurement and information-security policies.
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
});
