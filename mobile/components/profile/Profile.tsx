import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/authContext";
import { colors, shadows, spacing, typography } from "../../app/theme";
import WalletBalance from "../WalletBalance";
import TokenBalances from "./TokenBalances";
import WalletAddressInput from "../WalletAddressInput";
import * as Linking from "expo-linking";
import { getStoredWalletAddress } from "../../helpers/walletStorage";
import { useBalance } from "../../contexts/balanceContext";

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { hasBalance } = useBalance();

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            Alert.alert("Error", "Failed to sign out");
          }
        },
      },
    ]);
  };

  const [claiming, setClaiming] = React.useState(false);

  async function handleClaimTestnet() {
    try {
      setClaiming(true);
      const addr = (await getStoredWalletAddress())?.trim();
      if (!addr) {
        Alert.alert(
          "No wallet",
          "Add a wallet address above to receive the tip.",
        );
        return;
      }
      const { PayoutService } = await import("../../services/payoutService");
      const resp = await PayoutService.win(addr);
      if (!resp.ok) {
        Alert.alert("Claim failed", resp.error || "Unknown error");
        return;
      }
      const hash = resp.txHash as string | undefined;
      Alert.alert("Submitted", hash ? `Tx: ${hash}` : "Transaction submitted");
      if (hash) {
        try {
          await Linking.openURL(`https://sepolia.basescan.org/tx/${hash}`);
        } catch {}
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <FlatList
        data={[]}
        keyExtractor={(_, i) => String(i)}
        ListHeaderComponent={
          <View>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.subtitle}>
                Manage your account and earnings
              </Text>
            </View>

            {/* Wallet Balance Section */}
            <View style={styles.section}>
              <WalletBalance style={styles.walletBalance} />
            </View>

            {/* Cash Out Section */}
            {hasBalance() && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.claimBtn, claiming && { opacity: 0.7 }]}
                  onPress={handleClaimTestnet}
                  disabled={claiming}
                >
                  <Text style={styles.claimBtnText}>
                    {claiming ? "Processing…" : "Cash Out"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Token Balances Section */}
            <View style={styles.section}>
              <TokenBalances />
            </View>

            {/* Wallet Address Section */}
            <View style={styles.section}>
              <View style={styles.userInfo}>
                <Text style={styles.sectionTitle}>Wallet Address</Text>
                <Text style={styles.sectionSubtitle}>
                  Used for staking and verification
                </Text>
                <WalletAddressInput />
              </View>
            </View>

            {/* User Info Section */}
            <View style={styles.section}>
              <View style={styles.userInfo}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>User ID</Text>
                  <Text style={styles.infoValue}>{user?.id}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Joined</Text>
                  <Text style={styles.infoValue}>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Sign Out Section */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomPadding} />
          </View>
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 4,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  subtitle: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  walletBalance: {
    marginBottom: 0,
  },
  userInfo: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 18,
    marginBottom: spacing.xs,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.meta,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
    ...shadows.button,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: spacing.xl,
  },
  claimBtn: {
    backgroundColor: "#111827",
    paddingVertical: spacing.md,
    borderRadius: 10,
    alignItems: "center",
    ...shadows.button,
  },
  claimBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});

export { Profile };
export default Profile;
