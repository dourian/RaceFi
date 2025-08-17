import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthWrapper } from "../../components/auth/AuthWrapper";
import { LocationProvider } from "../../contexts/locationContext";
import { View } from "react-native";
import { colors, shadows, spacing } from "../theme";

export default function TabsLayout() {
  return (
    <LocationProvider>
      <AuthWrapper>
        <View style={{ flex: 1, width: "100%", height: "100%" }}>
        <Tabs
          initialRouteName="index"
          screenOptions={{
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              height: 65,
              borderRadius: 100,
              position: "absolute",
              bottom: 40,
              left: 0,
              right: 0,
              marginHorizontal: spacing.lg,
              backgroundColor: "rgba(255,255,255,0.97)",
              ...shadows.nav,
            },
            tabBarLabelStyle: { display: "none" },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="trophies"
            options={{
              title: "Trophies",
              tabBarIcon: ({ color }) => (
                <Ionicons
                  name="trophy-outline"
                  size={24}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="index"
            options={{
              title: "Browse",
              tabBarIcon: ({ color }) => (
                <Ionicons
                  name="compass-outline"
                  size={28}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color }) => (
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={color}
                />
              ),
              }}
            />
          </Tabs>
        </View>
      </AuthWrapper>
    </LocationProvider>
  );
}
