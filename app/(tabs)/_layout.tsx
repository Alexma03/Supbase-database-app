import { Tabs } from 'expo-router';
import { Inbox, Settings, MessageCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSegments } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const segments = useSegments();
  const { colors, actualTheme } = useTheme();

  // Check if a message is currently being viewed
  useEffect(() => {
    if (segments.length >= 2 && segments[0] === '(tabs)' && segments[1]?.startsWith('message/')) {
      const pathParts = segments[1].split('/');
      if (pathParts.length > 1) {
        const messageId = pathParts[1];
        setLastMessageId(messageId);
      }
    }
  }, [segments]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Submissions',
          tabBarIcon: ({ color, size }) => <Inbox size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="message/[id]"
        options={{
          title: 'Detalle del Mensaje',
          headerTitle: 'Detalle del Mensaje',
          headerShown: true,
          headerLeft: () => <MessageCircle size={24} color={colors.primary} style={{ marginLeft: 10 }} />,
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}