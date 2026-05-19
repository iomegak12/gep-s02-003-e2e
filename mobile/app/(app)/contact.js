import React from 'react';
import { ScrollView, StyleSheet, Linking } from 'react-native';
import { Card, List } from 'react-native-paper';

export default function Contact() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Title title="Contact Us" />
        <Card.Content>
          <List.Item
            title="Procurement Helpdesk"
            description="procurement-help@example.com"
            left={(p) => <List.Icon {...p} icon="email-outline" />}
            onPress={() => Linking.openURL('mailto:procurement-help@example.com').catch(() => {})}
          />
          <List.Item
            title="Phone"
            description="+91 80 0000 0000"
            left={(p) => <List.Icon {...p} icon="phone-outline" />}
            onPress={() => Linking.openURL('tel:+918000000000').catch(() => {})}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ scroll: { padding: 16, gap: 12 } });
