import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, shadows } from '../theme';

export default function UploadScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <Text style={styles.title}>Upload Run</Text>
      <Text style={styles.body}>Upload a GPX from Strava (placeholder).</Text>
      <Pressable
        onPress={() => Alert.alert('Not implemented', 'File picker placeholder')}
        style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="cloud-upload" size={18} color={colors.accentStrong} style={{ marginRight: 8 }} />
        <Text style={styles.primaryButtonText}>Choose GPX</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background },
  title: { ...typography.title },
  body: { ...typography.body },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accentStrong,
    ...shadows.button,
  },
  primaryButtonText: { color: colors.accentStrong, fontWeight: '700' },
});

