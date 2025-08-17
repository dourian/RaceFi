import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { stakingService } from '../services/stakingService';
import { payoutService } from '../services/payoutService';
import { useWallet } from '../contexts/WalletContext';
import { supabase } from '../lib/supabase';

interface StakeEntry {
  id: number;
  challengeName: string;
  stakeAmount: number;
  status: 'active' | 'completed' | 'winner' | 'expired';
  challengeEndDate: string;
  completionTime?: string;
  winnings?: number;
}

export const StakingHistory: React.FC = () => {
  const { isConnected } = useWallet();
  const [stakes, setStakes] = useState<StakeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isConnected) {
      loadStakingHistory();
    }
  }, [isConnected]);

  const loadStakingHistory = async () => {
    try {
      setLoading(true);
      
      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Get user's stakes with challenge information
      const { data: stakesData, error } = await supabase
        .from('challenge_attendees')
        .select(`
          id,
          stake_amount,
          status,
          completion_time,
          challenges (
            id,
            name,
            end_date,
            is_active
          )
        `)
        .eq('profile_id', profile.id)
        .not('stake_transaction_hash', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading staking history:', error);
        return;
      }

      // Process stakes data
      const processedStakes: StakeEntry[] = stakesData?.map(stake => {
        const now = new Date();
        const endDate = new Date(stake.challenges?.end_date || '');
        const isExpired = endDate < now;
        
        let status: StakeEntry['status'] = 'active';
        if (stake.status === 'completed') {
          // Check if user won (this would need additional logic to determine winner)
          status = 'completed';
        } else if (isExpired) {
          status = 'expired';
        }

        return {
          id: stake.id,
          challengeName: stake.challenges?.name || 'Unknown Challenge',
          stakeAmount: stake.stake_amount,
          status,
          challengeEndDate: stake.challenges?.end_date || '',
          completionTime: stake.completion_time || undefined,
        };
      }) || [];

      setStakes(processedStakes);
    } catch (error) {
      console.error('Error loading staking history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStakingHistory();
    setRefreshing(false);
  };

  const getStatusColor = (status: StakeEntry['status']) => {
    switch (status) {
      case 'active': return '#007AFF';
      case 'completed': return '#34C759';
      case 'winner': return '#FFD700';
      case 'expired': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: StakeEntry['status']) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'winner': return 'Winner';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyTitle}>Connect Your Wallet</Text>
          <Text style={styles.emptySubtitle}>
            Connect a wallet to view your staking history
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading staking history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Staking History</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#8E8E93" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>

      {stakes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No Stakes Yet</Text>
          <Text style={styles.emptySubtitle}>
            Join challenges to start staking and competing!
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {stakes.map((stake) => (
            <View key={stake.id} style={styles.stakeCard}>
              <View style={styles.stakeHeader}>
                <Text style={styles.challengeName} numberOfLines={2}>
                  {stake.challengeName}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(stake.status) }]}>
                  <Text style={styles.statusText}>
                    {getStatusText(stake.status)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.stakeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Stake Amount</Text>
                  <Text style={styles.detailValue}>${stake.stakeAmount}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(stake.challengeEndDate).toLocaleDateString()}
                  </Text>
                </View>
                
                {stake.completionTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={styles.detailValue}>
                      {new Date(stake.completionTime).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                
                {stake.winnings && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Winnings</Text>
                    <Text style={[styles.detailValue, styles.winningsText]}>
                      +${stake.winnings}
                    </Text>
                  </View>
                )}
              </View>
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
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  stakeCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  stakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stakeDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  winningsText: {
    color: '#34C759',
  },
});
