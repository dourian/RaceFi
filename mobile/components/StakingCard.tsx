import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useWallet } from '../contexts/WalletContext';
import { stakingService } from '../services/stakingService';
import { WalletConnectionModal } from './WalletConnectionModal';

interface StakingCardProps {
  challengeId: number;
  profileId: number;
  minimumStake: number;
  onStakeComplete?: () => void;
}

export const StakingCard: React.FC<StakingCardProps> = ({
  challengeId,
  profileId,
  minimumStake,
  onStakeComplete,
}) => {
  const { walletAddress, isConnected } = useWallet();
  const [stakeAmount, setStakeAmount] = useState(minimumStake.toString());
  const [isStaking, setIsStaking] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const [userStakeAmount, setUserStakeAmount] = useState(0);
  const [totalStaked, setTotalStaked] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    loadStakingInfo();
  }, [challengeId, profileId]);

  const loadStakingInfo = async () => {
    try {
      const [userStake, totalStake, hasUserStaked] = await Promise.all([
        stakingService.getUserStake(challengeId, profileId),
        stakingService.getTotalStakedAmount(challengeId),
        stakingService.hasUserStaked(challengeId, profileId),
      ]);

      setUserStakeAmount(userStake);
      setTotalStaked(totalStake);
      setHasStaked(hasUserStaked);
    } catch (error) {
      console.error('Error loading staking info:', error);
    }
  };

  const handleStake = async () => {
    if (!isConnected || !walletAddress) {
      setShowWalletModal(true);
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < minimumStake) {
      Alert.alert('Invalid Amount', `Minimum stake is $${minimumStake}`);
      return;
    }

    setIsStaking(true);
    try {
      const transactionHash = await stakingService.stakeForChallenge({
        challengeId,
        profileId,
        amount,
        walletAddress,
      });

      Alert.alert(
        'Stake Successful!',
        `You've staked $${amount} for this challenge.\nTransaction: ${transactionHash.slice(0, 10)}...`,
        [{ text: 'OK', onPress: () => onStakeComplete?.() }]
      );

      await loadStakingInfo();
    } catch (error) {
      Alert.alert('Staking Failed', 'Please try again later.');
      console.error('Staking error:', error);
    } finally {
      setIsStaking(false);
    }
  };

  if (hasStaked) {
    return (
      <View style={styles.container}>
        <View style={styles.stakedContainer}>
          <Text style={styles.stakedTitle}>✅ You're In!</Text>
          <Text style={styles.stakedAmount}>Your Stake: ${userStakeAmount}</Text>
          <Text style={styles.totalStaked}>Total Prize Pool: ${totalStaked}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join the Challenge</Text>
        <Text style={styles.subtitle}>Stake to participate and compete for the prize pool</Text>
      </View>

      <View style={styles.stakeInfo}>
        <Text style={styles.infoLabel}>Current Prize Pool</Text>
        <Text style={styles.prizePool}>${totalStaked}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Stake Amount (min. ${minimumStake})</Text>
        <TextInput
          style={styles.input}
          value={stakeAmount}
          onChangeText={setStakeAmount}
          placeholder={`${minimumStake}`}
          keyboardType="numeric"
          editable={!isStaking}
        />
      </View>

      <TouchableOpacity
        style={[styles.stakeButton, isStaking && styles.stakeButtonDisabled]}
        onPress={handleStake}
        disabled={isStaking}
      >
        {isStaking ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.stakeButtonText}>
            {isConnected ? 'Stake & Join' : 'Connect Wallet to Stake'}
          </Text>
        )}
      </TouchableOpacity>

      {!isConnected && (
        <Text style={styles.walletNote}>
          You need to connect a wallet to participate in challenges
        </Text>
      )}

      <WalletConnectionModal
        isVisible={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  stakeInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  prizePool: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  stakeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  stakeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  stakeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  walletNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stakedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  stakedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 12,
  },
  stakedAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  totalStaked: {
    fontSize: 16,
    color: '#666666',
  },
});
