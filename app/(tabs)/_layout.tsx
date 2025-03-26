import { Tabs } from 'expo-router';
import { Inbox, Settings, MessageCircle } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useSegments } from 'expo-router';

export default function TabLayout() {
  // Track the last viewed message ID
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const segments = useSegments();

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
        tabBarActiveTintColor: '#007AFF',
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
          // Remove the conditional href that was hiding the tab
          title: 'Detalle del Mensaje',
          headerTitle: 'Detalle del Mensaje',
          headerShown: true,
          headerLeft: () => <MessageCircle size={24} color="#007AFF" style={{ marginLeft: 10 }} />,
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}