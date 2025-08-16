import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AuthWrapper } from "../auth/auth-wrapper";
import { LocationProvider } from "../contexts/locationContext";

export default function TabsLayout() {
  return (
    <LocationProvider>
      <AuthWrapper>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: "white",
            tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
            tabBarStyle: {
              backgroundColor: "#e64a00",
              borderTopColor: "#d63e00",
              height: 60,
            },
            tabBarLabelStyle: { display: "none" },
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Browse",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="compass-outline"
                  size={size ?? 22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="upload"
            options={{
              title: "Upload",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="cloud-upload-outline"
                  size={size ?? 22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="trophies"
            options={{
              title: "Trophies",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="trophy-outline"
                  size={size ?? 22}
                  color={color}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size ?? 22} color={color} />
              ),
            }}
          />
        </Tabs>
      </AuthWrapper>
    </LocationProvider>
  );
}
