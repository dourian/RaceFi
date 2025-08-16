import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors, typography } from "./theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { ...typography.title, fontSize: 18 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="challenge/[id]" options={{ title: "Challenge" }} />
        <Stack.Screen name="record" options={{ title: "Record Run" }} />
      </Stack>
    </AuthProvider>
  );
}
