import { ReactNode } from "react";
import { View, Text, StyleSheet, Image, ViewStyle } from "react-native";
import { colors, spacing, typography, shadows } from "../app/theme";

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  return <View style={[styles.card, style as any]}>{children}</View>;
}

export function CardHeader({
  title,
  icon,
}: {
  title: string;
  icon?: ReactNode;
}) {
  return (
    <View style={styles.headerRow}>
      {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <View style={{ paddingTop: spacing.sm }}>{children}</View>;
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

import { resolveImageSource } from "../helpers/assetResolver";

export function Avatar({ source, size = 32 }: { source: any; size?: number }) {
  // Normalize source: allow local asset path strings, URL strings, or ImageSource objects
  let normalized: any = null;
  if (typeof source === "string") {
    // Try local asset resolver first
    normalized = resolveImageSource(source);
    // If not a known local asset and looks like a URL, convert to { uri }
    if (!normalized && /^(https?:)?\/\//i.test(source)) {
      normalized = { uri: source };
    }
  } else {
    normalized = source;
  }

  if (!normalized) {
    // Fallback placeholder circle when no image
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.background,
        }}
      ></View>
    );
  }
  return (
    <Image
      source={normalized}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    ></Image>
  );
}

export function Badge({
  children,
  variant = "default",
  style,
}: {
  children: ReactNode;
  variant?: "default" | "secondary" | "outline";
  style?: ViewStyle;
}) {
  const badgeStyle =
    variant === "default"
      ? styles.badgeDefault
      : variant === "secondary"
        ? styles.badgeSecondary
        : styles.badgeOutline;

  const textStyle =
    variant === "outline" ? styles.badgeTextOutline : styles.badgeText;

  return (
    <View style={[badgeStyle, style]}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

export function Progress({
  value,
  style,
}: {
  value: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.progressContainer, style]}>
      <View style={[styles.progressBar, { width: `${value}%` }]} />
    </View>
  );
}

export function Separator({ style }: { style?: ViewStyle }) {
  return <View style={[styles.separator, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    ...shadows.card,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { ...typography.h2, fontWeight: "bold" },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as "bold",
    color: colors.accentStrong,
  },
  statLabel: { ...typography.meta },
  badgeDefault: {
    backgroundColor: colors.accentStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeSecondary: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeTextOutline: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.text + "20", // 20% opacity
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.accentStrong,
  },
  separator: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: spacing.sm,
  },
});
