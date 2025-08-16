import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { useChallenge } from '../contexts/challengeContext';
import { colors, shadows } from '../theme';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { resetAllChallenges, simulateCompletedChallengesWithResults } = useChallenge();

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
            Alert.alert('Success', 'All challenge statuses have been reset');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Welcome back!</Text>
      </View>

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

      <TouchableOpacity style={styles.simulateButton} onPress={handleSimulateCompletedChallenges}>
        <Text style={styles.simulateButtonText}>Simulate Completed Races (Testing)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetButton} onPress={handleResetChallenges}>
        <Text style={styles.resetButtonText}>Reset All Challenges (Testing)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
  userInfo: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
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
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export { Profile };
export default Profile;
