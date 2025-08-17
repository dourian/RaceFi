import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from "../app/theme";
import { Card, CardHeader, CardContent } from "./ui";
import { useBalance } from "../contexts/balanceContext";

interface WalletBalanceProps {
  style?: any;
}

const WalletBalance: React.FC<WalletBalanceProps> = ({ style }) => {
  const { balance, cashOutBalance, hasBalance } = useBalance();
  const [isLoading, setIsLoading] = useState(false);

  const handleCashOut = async () => {
    if (!hasBalance()) {
      Alert.alert("No Balance", "You don't have any balance to cash out.");
      return;
    }

    Alert.alert(
      "Cash Out All Winnings",
      `Are you sure you want to cash out ${balance.totalBalance.toFixed(2)} USDC to your wallet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cash Out",
          onPress: async () => {
            setIsLoading(true);
            try {
              cashOutBalance();
              Alert.alert(
                "Cash Out Successful!",
                `${balance.totalBalance.toFixed(2)} USDC has been sent to your wallet. It may take a few minutes to appear.`,
                [{ text: "OK" }],
              );
            } catch (error) {
              Alert.alert("Error", "Failed to cash out. Please try again.");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const formatUSDC = (amount: number) => `${amount.toFixed(2)} USDC`;

  return (
    <Card style={[styles.walletCard, style]}>
      <CardHeader
        title="💰 Wallet Balance"
        icon={<Ionicons name="wallet" size={18} color={colors.accentStrong} />}
      />
      <CardContent>
        {/* Main Balance Display */}
        <View style={styles.balanceContainer}>
          <LinearGradient
            colors={["#DAA520", "#FFD700"]}
            style={styles.balanceGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.balanceContent}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                {formatUSDC(balance.totalBalance)}
              </Text>
              {hasBalance() && (
                <Pressable
                  style={[
                    styles.cashOutButton,
                    isLoading && styles.disabledButton,
                  ]}
                  onPress={handleCashOut}
                  disabled={isLoading}
                >
                  <Ionicons
                    name="arrow-forward-circle"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.cashOutButtonText}>
                    {isLoading ? "Processing..." : "Cash Out All"}
                  </Text>
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.buyButton, shadows.button]}
            onPress={() => router.push("/onramp")}
          >
            <Ionicons name="card" size={16} color="white" />
            <Text style={styles.buyButtonText}>Buy USDC</Text>
          </Pressable>
        </View>

        {/* Balance Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatUSDC(balance.totalEarned)}
            </Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatUSDC(balance.totalCashedOut)}
            </Text>
            <Text style={styles.statLabel}>Total Cashed Out</Text>
          </View>
        </View>

        {/* Recent Transactions Preview */}
        {balance.transactions.length > 0 && (
          <View style={styles.transactionsPreview}>
            <Text style={styles.transactionsTitle}>Recent Activity</Text>
            {balance.transactions
              .slice(-3) // Show last 3 transactions
              .reverse()
              .map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={
                        transaction.type === "win" ? "trophy" : "arrow-forward"
                      }
                      size={14}
                      color={transaction.type === "win" ? "#DAA520" : "#10b981"}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {transaction.timestamp.toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "win" ? "#22c55e" : "#6b7280",
                      },
                    ]}
                  >
                    {transaction.type === "win" ? "+" : "-"}
                    {formatUSDC(transaction.amount)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Empty State */}
        {balance.totalEarned === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="trophy-outline"
              size={32}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>No Winnings Yet</Text>
            <Text style={styles.emptyDescription}>
              Win challenges to start earning USDC rewards!
            </Text>
          </View>
        )}
      </CardContent>
    </Card>
  );
};

const styles = StyleSheet.create({
  walletCard: {
    marginBottom: spacing.lg,
  },
  balanceContainer: {
    marginBottom: spacing.lg,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  buyButton: {
    backgroundColor: "#1652F0", // Coinbase blue
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  buyButtonText: {
    color: "white",
    fontWeight: "600",
  },
  balanceGradient: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  balanceContent: {
    padding: spacing.lg,
    alignItems: "center",
  },
  balanceLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: spacing.xs,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  balanceAmount: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: spacing.md,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cashOutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  disabledButton: {
    opacity: 0.6,
  },
  cashOutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: spacing.xs,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  transactionsPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  transactionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  transactionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default WalletBalance;
