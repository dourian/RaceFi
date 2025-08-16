import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <> 
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="challenge/[id]" options={{ title: 'Challenge' }} />
        <Stack.Screen name="record" options={{ title: 'Record Run' }} />
      </Stack>
    </>
  );
}

