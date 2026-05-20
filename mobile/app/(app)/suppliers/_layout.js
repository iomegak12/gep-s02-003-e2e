import { Stack } from 'expo-router';

// Hide the Stack header; the parent drawer's AppBar is the single source of truth.
// Hardware back / gesture back navigate between index ↔ detail.
export default function SuppliersStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
