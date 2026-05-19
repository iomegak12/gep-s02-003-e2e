import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Card, List } from 'react-native-paper';

export default function Support() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Card mode="outlined">
        <Card.Title title="Support" />
        <Card.Content>
          <List.Item title="Knowledge base" description="Coming soon" left={(p) => <List.Icon {...p} icon="book-open-outline" />} />
          <List.Item title="Report a bug" description="See TROUBLESHOOTING.md" left={(p) => <List.Icon {...p} icon="bug-outline" />} />
          <List.Item title="Status page" description="Use the Service Health screen for live status" left={(p) => <List.Icon {...p} icon="heart-pulse" />} />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ scroll: { padding: 16, gap: 12 } });
