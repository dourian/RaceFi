import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { getStoredWalletAddress, setStoredWalletAddress, clearStoredWalletAddress } from '../helpers/walletStorage';
import { colors, spacing, typography, borderRadius } from '../app/theme';

interface Props {
  onSaved?: (addr: string | null) => void;
}

export default function WalletAddressInput({ onSaved }: Props) {
  const [value, setValue] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const v = await getStoredWalletAddress();
      setSaved(v);
      if (v) setValue(v);
    })();
  }, []);

  const handleSave = async () => {
    const addr = value.trim();
    if (!addr) return;
    await setStoredWalletAddress(addr);
    setSaved(addr);
    onSaved?.(addr);
  };

  const handleClear = async () => {
    await clearStoredWalletAddress();
    setSaved(null);
    setValue('');
    onSaved?.(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Wallet address</Text>
      <TextInput
        style={styles.input}
        placeholder="0x..."
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={setValue}
      />
      <View style={{ height: spacing.xs }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={handleSave} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>{saved ? 'Update' : 'Save'}</Text>
        </Pressable>
        {saved && (
          <Pressable onPress={handleClear} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Clear</Text>
          </Pressable>
        )}
      </View>
      {saved ? (
        <Text style={styles.meta}>Using: {shorten(saved)}</Text>
      ) : (
        <Text style={styles.meta}>No wallet saved</Text>
      )}
    </View>
  );
}

function shorten(s: string, size = 6) {
  if (!s) return s;
  if (s.length <= size * 2) return s;
  return `${s.slice(0, size)}…${s.slice(-size)}`;
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  label: { ...typography.meta, marginBottom: 6, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  primaryText: { color: 'white', fontWeight: '600' },
  secondaryBtn: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text },
  meta: { ...typography.meta, marginTop: 6 },
});
