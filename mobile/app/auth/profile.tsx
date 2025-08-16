import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { useChallenge } from '../contexts/challengeContext';
import { useBalance } from '../contexts/balanceContext';
import { colors, shadows, spacing } from '../theme';
import WalletBalance from '../../components/WalletBalance';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { resetAllChallenges, simulateCompletedChallengesWithResults } = useChallenge();
  const { resetBalance } = useBalance();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleResetChallenges = () => {
    Alert.alert(
      'Reset All Challenges',
      'This will reset all challenge statuses back to not-joined. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All',
          style: 'destructive',
          onPress: () => {
            resetAllChallenges();
            resetBalance();
            Alert.alert('Success', 'All challenge statuses and balance have been reset');
          },
        },
      ]
    );
  };

  const handleSimulateCompletedChallenges = () => {
    Alert.alert(
      'Simulate Completed Challenges',
      'This will simulate all challenges as completed with results. You will be marked as winner of the first challenge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate',
          onPress: () => {
            simulateCompletedChallengesWithResults();
            Alert.alert('Success', 'All challenges have been simulated as completed with results!');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account and earnings</Text>
        </View>

        {/* Wallet Balance */}
        <WalletBalance style={styles.walletBalance} />

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
          
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>{user?.id}</Text>
          
          <Text style={styles.label}>Joined</Text>
          <Text style={styles.value}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {/* Testing Controls */}
        <View style={styles.testingSection}>
          <Text style={styles.testingTitle}>Testing Controls</Text>
          
          <TouchableOpacity style={styles.simulateButton} onPress={handleSimulateCompletedChallenges}>
            <Text style={styles.simulateButtonText}>Simulate Completed Races</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleResetChallenges}>
            <Text style={styles.resetButtonText}>Reset All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
  },
  walletBalance: {
    marginBottom: spacing.lg,
  },
  userInfo: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 5,
    marginTop: 15,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  testingSection: {
    marginBottom: spacing.xl,
  },
  testingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  simulateButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  simulateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#ff9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export { Profile };
export default Profile;
