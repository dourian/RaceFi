import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { TimeControls } from "../helpers/timeManager";
import { colors, spacing, typography } from "../app/theme";

// Development component to control time simulation
// This should only be shown in development mode
export default function DevTimeControls() {
  const handleAdvanceDays = (days: number) => {
    TimeControls.advanceDays(days);
  };

  const handleAdvanceHours = (hours: number) => {
    TimeControls.advanceHours(hours);
  };

  const handleReset = () => {
    TimeControls.reset();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⏰ Dev Time Controls</Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.buttonSmall]}
          onPress={() => handleAdvanceHours(1)}
        >
          <Text style={styles.buttonText}>+1h</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonSmall]}
          onPress={() => handleAdvanceHours(6)}
        >
          <Text style={styles.buttonText}>+6h</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonMedium]}
          onPress={() => handleAdvanceDays(1)}
        >
          <Text style={styles.buttonText}>+1 day</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonMedium]}
          onPress={() => handleAdvanceDays(3)}
        >
          <Text style={styles.buttonText}>+3 days</Text>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.buttonMedium]}
          onPress={() => handleAdvanceDays(7)}
        >
          <Text style={styles.buttonText}>+1 week</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonLarge, styles.resetButton]}
          onPress={handleReset}
        >
          <Text style={[styles.buttonText, styles.resetButtonText]}>
            Reset Time
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: spacing.md,
    borderRadius: 12,
    margin: spacing.md,
  },
  title: {
    ...typography.h3,
    color: "white",
    textAlign: "center",
    marginBottom: spacing.md,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  button: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSmall: {
    flex: 0.2,
  },
  buttonMedium: {
    flex: 0.3,
  },
  buttonLarge: {
    flex: 0.5,
  },
  resetButton: {
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  resetButtonText: {
    color: "white",
  },
});
