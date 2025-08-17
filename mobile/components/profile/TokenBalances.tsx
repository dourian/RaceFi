import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, FlatList } from "react-native";
import { colors, spacing, typography, borderRadius, shadows } from "../../app/theme";
import { ONRAMP_CONFIG } from "../../app/config";
import { EvmNetwork, listEvmTokenBalances, formatUnits, TokenBalanceDto } from "../../services/cdpService";
import { Card, CardHeader, CardContent } from "../ui";

const NETWORKS: EvmNetwork[] = ["base", "base-sepolia", "ethereum"];

export default function TokenBalances() {
  const [network, setNetwork] = useState<EvmNetwork>("base");
  const [address, setAddress] = useState<string>(ONRAMP_CONFIG.DEFAULT_DESTINATION || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TokenBalanceDto[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const canFetch = useMemo(() => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }, [address]);

  const fetchBalances = useCallback(async (append = false) => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listEvmTokenBalances({ network, address, pageToken: append ? nextPageToken : undefined });
      setItems((prev) => (append ? [...prev, ...res.balances] : res.balances));
      setNextPageToken(res.nextPageToken);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [address, network, nextPageToken, canFetch]);

  const renderItem = ({ item }: { item: TokenBalanceDto }) => {
    const value = formatUnits(item.amount.amount, item.amount.decimals);
    return (
      <View style={styles.row}>
        <View style={styles.tokenBadge}>
          <Text style={styles.tokenSymbol}>{item.token.symbol}</Text>
        </View>
        <View style={styles.rowMiddle}>
          <Text style={styles.tokenName}>{item.token.name}</Text>
          <Text style={styles.tokenMeta}>{shorten(item.token.contractAddress)}</Text>
        </View>
        <Text style={styles.amount}>{value}</Text>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <CardHeader title="🪙 Token Balances" />
      <CardContent>
        <Text style={styles.help}>
          Enter your EVM wallet address to view balances on the selected network.
        </Text>
        <View style={styles.controls}>
          <View style={styles.networkPills}>
            {NETWORKS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setNetwork(n)}
                style={[styles.pill, network === n && styles.pillActive]}
              >
                <Text style={[styles.pillText, network === n && styles.pillTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="0x... EVM address"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={address}
            onChangeText={setAddress}
          />

          <Pressable
            onPress={() => fetchBalances(false)}
            style={[styles.primaryButton, (!canFetch || loading) && styles.disabledButton]}
            disabled={!canFetch || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Fetch Balances</Text>
            )}
          </Pressable>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${item.token.contractAddress}_${idx}`}
          renderItem={renderItem}
          ListEmptyComponent={!loading ? (
            <Text style={styles.empty}>No balances yet.</Text>
          ) : null}
        />

        {nextPageToken && (
          <Pressable
            onPress={() => fetchBalances(true)}
            style={[styles.secondaryButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Load more</Text>
          </Pressable>
        )}
      </CardContent>
    </Card>
  );
}

function shorten(addr: string, size = 6) {
  if (!addr?.startsWith("0x") || addr.length <= size * 2 + 2) return addr;
  return `${addr.slice(0, size + 2)}…${addr.slice(-size)}`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  help: {
    ...typography.meta,
    marginBottom: spacing.md,
  },
  controls: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  networkPills: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    color: colors.text,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  pillTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  primaryButton: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    ...shadows.button,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  error: {
    color: "#ef4444",
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tokenBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenSymbol: {
    ...typography.h3,
    fontSize: 12,
    textTransform: "uppercase",
  },
  rowMiddle: {
    flex: 1,
  },
  tokenName: {
    ...typography.body,
  },
  tokenMeta: {
    ...typography.meta,
  },
  amount: {
    ...typography.h3,
  },
  empty: {
    ...typography.meta,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
