import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors, typography } from "./theme";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AuthProvider } from "./lib/auth-context";
import { LocationProvider } from "./contexts/locationContext";
import { ChallengeProvider } from "./contexts/challengeContext";
import { BalanceProvider } from "./contexts/balanceContext";

function CustomBackButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.back()}
      style={{
        paddingLeft: 16,
        paddingRight: 8,
        paddingVertical: 8,
      }}
    >
      <Ionicons name="arrow-back" size={24} color="white" />
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BalanceProvider>
          <ChallengeProvider>
            <StatusBar style="dark" backgroundColor={colors.background} />
            <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#e64a00" },
              headerTintColor: "white",
              headerTitleStyle: {
                ...typography.title,
                fontSize: 18,
                color: "white",
              },
              contentStyle: { backgroundColor: colors.background },
              headerBackTitle: "",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="challenge/[id]"
              options={{
                title: "Challenge",
                headerLeft: () => <CustomBackButton />,
                headerBackVisible: false,
              }}
            />
            <Stack.Screen
              name="recordRun"
              options={{
                headerShown: false,
              }}
            />
            </Stack>
          </ChallengeProvider>
        </BalanceProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
