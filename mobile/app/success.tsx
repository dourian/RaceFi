import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, typography, borderRadius } from "./theme";

export default function SuccessScreen() {
  const router = useRouter();

  useEffect(() => {
    // Close in-app browser when returning via deep link
    WebBrowser.dismissBrowser();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Purchase Successful</Text>
      <Text style={styles.subtitle}>
        Your funds will arrive shortly. You can return to continue staking.
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace("/(tabs)/index") }>
        <Text style={styles.buttonText}>Back to Browse</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
