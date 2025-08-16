import { ReactNode } from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { colors, spacing, typography, shadows } from '../app/theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function CardHeader({ title, icon }: { title: string; icon?: ReactNode }) {
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
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Avatar({ source, size = 32 }: { source: any; size?: number }) {
  return <Image source={source} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { ...typography.h2 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.accentStrong },
  statLabel: { ...typography.meta },
});

