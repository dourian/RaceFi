import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AuthWrapper } from '../auth/auth-wrapper';

export default function TabsLayout() {
  return (
    <AuthWrapper>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: '#e6e6ea',
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="compass-outline" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="upload"
          options={{
            title: 'Upload',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cloud-upload-outline" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size ?? 22} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthWrapper>
  );
}
