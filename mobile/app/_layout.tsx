import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { colors, typography } from "./theme";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AuthProvider } from "../contexts/authContext";
import BalanceProvider from "../contexts/balanceContext";
import ChallengeProvider from "../contexts/challengeContext";
import { LocationProvider } from "../contexts/locationContext";
import { WalletProvider } from "../contexts/WalletContext";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { walletConnectionService } from '../services/walletConnectionService';

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
  useEffect(() => {
    // Set up deep link handling for Coinbase Wallet responses
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      if (url.startsWith('racefi://')) {
        walletConnectionService.handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LocationProvider>
          <BalanceProvider>
            <ChallengeProvider>
              <WalletProvider>
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
              </WalletProvider>
            </ChallengeProvider>
          </BalanceProvider>
        </LocationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
