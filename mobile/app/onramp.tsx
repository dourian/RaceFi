import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { ONRAMP_CONFIG, TOKEN_API_URL } from "./config";
import { useRouter } from "expo-router";
import { colors, spacing, typography, borderRadius, shadows } from "./theme";

// Minimal local builder for Coinbase Onramp URL to avoid RN bundling issues
function buildOnrampBuyUrl(params: {
  projectId?: string;
  sessionToken?: string;
  addresses?: Record<string, string[]>; // { address: [chain] }
  assets?: string[];
  presetFiatAmount?: number;
  presetCryptoAmount?: number;
  defaultPaymentMethod?: string;
  fiatCurrency?: string;
  redirectUrl?: string;
}) {
  const base = "https://pay.coinbase.com/buy";
  const url = new URL(base);
  // Coinbase expects appId for project
  if (params.sessionToken) url.searchParams.append("sessionToken", params.sessionToken);
  if (params.projectId) url.searchParams.append("appId", params.projectId);
  if (params.assets) url.searchParams.append("assets", JSON.stringify(params.assets));
  if (params.presetFiatAmount !== undefined)
    url.searchParams.append("presetFiatAmount", String(params.presetFiatAmount));
  if (params.presetCryptoAmount !== undefined)
    url.searchParams.append("presetCryptoAmount", String(params.presetCryptoAmount));
  if (params.defaultPaymentMethod)
    url.searchParams.append("defaultPaymentMethod", params.defaultPaymentMethod);
  if (params.fiatCurrency) url.searchParams.append("fiatCurrency", params.fiatCurrency);
  if (params.redirectUrl) url.searchParams.append("redirectUrl", params.redirectUrl);
  if (params.addresses)
    url.searchParams.append("addresses", JSON.stringify(params.addresses));
  // Optional sdkVersion can be omitted to keep minimal
  url.searchParams.sort();
  return url.toString();
}

export default function OnrampScreen() {
  const router = useRouter();
  const [fiatAmount, setFiatAmount] = useState<string>("");
  const [destination, setDestination] = useState<string>(ONRAMP_CONFIG.DEFAULT_DESTINATION);
  const [asset, setAsset] = useState<string>(ONRAMP_CONFIG.DEFAULT_ASSET);
  const [chain] = useState<string>(ONRAMP_CONFIG.DEFAULT_CHAIN);
  const projectId = ONRAMP_CONFIG.CDP_PROJECT_ID;

  const canLaunch = useMemo(() => {
    return Boolean(projectId) && Boolean(destination) && Number(fiatAmount) > 0;
  }, [projectId, destination, fiatAmount]);

  const handleOpenOnramp = useCallback(async () => {
    if (!projectId) {
      Alert.alert("Missing config", "Set EXPO_PUBLIC_CDP_PROJECT_ID to use Onramp.");
      return;
    }
    if (!destination) {
      Alert.alert("Destination required", "Enter a wallet address to receive funds.");
      return;
    }
    try {
      // Optional: fetch a session token from backend if secure init is enabled
      let sessionToken: string | undefined = undefined;
      if (TOKEN_API_URL) {
        try {
          const res = await fetch(`${TOKEN_API_URL}/onramp/session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: destination,
              chain,
              asset,
              amountUsd: Number(fiatAmount),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            sessionToken = data.sessionToken || data.token;
          } else {
            const text = await res.text();
            Alert.alert(
              "Onramp error",
              `Backend error ${res.status}: ${text.substring(0, 300)}`
            );
          }
        } catch (err: any) {
          Alert.alert("Network error", String(err?.message || err));
        }
      }

      const url = buildOnrampBuyUrl({
        projectId: sessionToken ? undefined : projectId,
        sessionToken,
        addresses: { [destination]: [chain] },
        assets: [asset],
        presetFiatAmount: Number(fiatAmount),
        fiatCurrency: "USD",
        redirectUrl: ONRAMP_CONFIG.DEFAULT_REDIRECT_URL,
      });

      if (!sessionToken && !projectId) {
        Alert.alert(
          "Missing configuration",
          "Secure initialization is enabled for your Coinbase project and no sessionToken was returned by the backend. Please set EXPO_PUBLIC_API_URL to your backend and ensure CDP_API_KEY is set on the server."
        );
        return;
      }
      await WebBrowser.openBrowserAsync(url, { dismissButtonStyle: "done", readerMode: false });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to open Coinbase Onramp.");
    }
  }, [asset, chain, destination, fiatAmount, projectId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buy crypto (Coinbase Onramp)</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Destination address</Text>
        <TextInput
          style={styles.input}
          placeholder="0x... or sol address"
          placeholderTextColor={colors.textMuted}
          value={destination}
          onChangeText={setDestination}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ height: spacing.md }} />

        <Text style={styles.label}>Amount (USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="50"
          placeholderTextColor={colors.textMuted}
          value={fiatAmount}
          onChangeText={setFiatAmount}
          keyboardType="numeric"
        />

        <View style={{ height: spacing.md }} />

        <Text style={styles.meta}>Asset: {asset} • Network: {chain}</Text>

        <Pressable
          onPress={handleOpenOnramp}
          style={[styles.primaryButton, !canLaunch && styles.disabledButton]}
          disabled={!canLaunch}
        >
          <Text style={styles.primaryButtonText}>Continue to Coinbase</Text>
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    fontSize: 20,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.medium,
  },
  label: {
    ...typography.meta,
    marginBottom: 6,
    color: colors.textMuted,
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
  meta: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.accentStrong,
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
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
});
