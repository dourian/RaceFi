import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Browse' }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload' }} />
    </Tabs>
  );
}

