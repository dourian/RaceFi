import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { payoutService } from '../services/payoutService';
import { stakingService } from '../services/stakingService';
import { supabase } from '../lib/supabase';

interface PendingPayout {
  challengeId: number;
  challengeName: string;
  endDate: string;
  totalStaked: number;
  participantCount: number;
  winner?: {
    name: string;
    walletAddress: string;
    completionTime: string;
  };
}

export const AdminPayoutInterface: React.FC = () => {
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayouts, setProcessingPayouts] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadPendingPayouts();
  }, []);

  const loadPendingPayouts = async () => {
    try {
      setLoading(true);
      
      // Get challenges that have ended and are still active
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lt('end_date', new Date().toISOString());

      if (error) {
        console.error('Error loading challenges:', error);
        return;
      }

      const payouts: PendingPayout[] = [];

      for (const challenge of challenges || []) {
        const isReady = await payoutService.isChallengeReadyForPayout(challenge.id);
        
        if (isReady) {
          const [totalStaked, participants, winner] = await Promise.all([
            stakingService.getTotalStakedAmount(challenge.id),
            stakingService.getChallengeParticipants(challenge.id),
            payoutService.getChallengeWinner(challenge.id),
          ]);

          payouts.push({
            challengeId: challenge.id,
            challengeName: challenge.name,
            endDate: challenge.end_date,
            totalStaked,
            participantCount: participants.length,
            winner: winner ? {
              name: `${winner.firstName} ${winner.lastName}`.trim() || 'Anonymous',
              walletAddress: winner.walletAddress,
              completionTime: winner.completionTime,
            } : undefined,
          });
        }
      }

      setPendingPayouts(payouts);
    } catch (error) {
      console.error('Error loading pending payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPayout = async (payout: PendingPayout) => {
    if (!payout.winner) {
      Alert.alert('Error', 'No winner found for this challenge');
      return;
    }

    Alert.alert(
      'Process Payout',
      `Send $${payout.totalStaked} to ${payout.winner.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          style: 'default',
          onPress: async () => {
            setProcessingPayouts(prev => new Set(prev).add(payout.challengeId));
            
            try {
              const transactionHash = await payoutService.processChallengeWinner(payout.challengeId);
              
              Alert.alert(
                'Payout Processed',
                `Successfully sent $${payout.totalStaked} to winner.\nTransaction: ${transactionHash?.slice(0, 10)}...`
              );
              
              // Refresh the list
              await loadPendingPayouts();
            } catch (error) {
              Alert.alert('Error', 'Failed to process payout');
              console.error('Payout error:', error);
            } finally {
              setProcessingPayouts(prev => {
                const newSet = new Set(prev);
                newSet.delete(payout.challengeId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading pending payouts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Payouts</Text>
        <TouchableOpacity onPress={loadPendingPayouts}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {pendingPayouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color="#34C759" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            No pending payouts to process at this time.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {pendingPayouts.map((payout) => (
            <View key={payout.challengeId} style={styles.payoutCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.challengeName}>{payout.challengeName}</Text>
                <Text style={styles.amount}>${payout.totalStaked}</Text>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.detailText}>
                  Ended: {new Date(payout.endDate).toLocaleDateString()}
                </Text>
                <Text style={styles.detailText}>
                  Participants: {payout.participantCount}
                </Text>
                
                {payout.winner && (
                  <View style={styles.winnerSection}>
                    <Text style={styles.winnerLabel}>Winner:</Text>
                    <Text style={styles.winnerName}>{payout.winner.name}</Text>
                    <Text style={styles.winnerAddress}>
                      {payout.winner.walletAddress.slice(0, 6)}...
                      {payout.winner.walletAddress.slice(-4)}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.processButton,
                  processingPayouts.has(payout.challengeId) && styles.processingButton
                ]}
                onPress={() => processPayout(payout)}
                disabled={processingPayouts.has(payout.challengeId)}
              >
                {processingPayouts.has(payout.challengeId) ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.processButtonText}>Process Payout</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  payoutCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  winnerSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  winnerLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  winnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  winnerAddress: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  processButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  processingButton: {
    backgroundColor: '#8E8E93',
  },
  processButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
