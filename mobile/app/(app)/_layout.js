import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useTheme } from 'react-native-paper';
import DrawerContent from '../../src/components/DrawerContent';
import AppBar from '../../src/components/AppBar';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ route }) => ({
        header: () => <AppBar title={titleFor(route?.name)} />,
        drawerStyle: { backgroundColor: theme.colors.surface, width: 288 },
        drawerType: 'front',
        swipeEdgeWidth: 60,
        sceneContainerStyle: { backgroundColor: theme.colors.background },
      })}
    >
      <Drawer.Screen name="dashboard"        options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="suppliers"        options={{ title: 'Suppliers' }} />
      <Drawer.Screen name="purchase-orders"  options={{ title: 'Purchase Orders' }} />
      <Drawer.Screen name="approvals"        options={{ title: 'Approvals' }} />
      <Drawer.Screen name="users"            options={{ title: 'Users' }} />
      <Drawer.Screen name="profile"          options={{ title: 'Profile', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings"         options={{ title: 'Settings', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="notifications"    options={{ title: 'Notifications', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="health"           options={{ title: 'Service Health', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="terms"            options={{ title: 'Terms' }} />
      <Drawer.Screen name="contact"          options={{ title: 'Contact Us' }} />
      <Drawer.Screen name="support"          options={{ title: 'Support' }} />
    </Drawer>
  );
}

function titleFor(name) {
  switch (name) {
    case 'dashboard': return 'Dashboard';
    case 'suppliers': return 'Suppliers';
    case 'purchase-orders': return 'Purchase Orders';
    case 'approvals': return 'Approvals';
    case 'users': return 'Users';
    case 'profile': return 'My Profile';
    case 'settings': return 'Settings';
    case 'notifications': return 'Notifications';
    case 'health': return 'Service Health';
    case 'terms': return 'Terms';
    case 'contact': return 'Contact Us';
    case 'support': return 'Support';
    default: return 'Nexus SCM';
  }
}
