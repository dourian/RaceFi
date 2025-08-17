import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../contexts/WalletContext';
import { WalletConnectionModal } from './WalletConnectionModal';
import { coinbaseWalletService } from '../services/coinbaseWalletService';

interface WalletConnectionButtonProps {
  style?: any;
  showBalance?: boolean;
}

export const WalletConnectionButton: React.FC<WalletConnectionButtonProps> = ({
  style,
  showBalance = false,
}) => {
  const { walletAddress, isConnected, isConnecting, disconnectWallet, chainId, switchToBaseNetwork, addBaseNetwork } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const handlePress = () => {
    if (isConnected) {
      // Show disconnect option
      setIsDisconnecting(true);
      setTimeout(async () => {
        try {
          await disconnectWallet();
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
        } finally {
          setIsDisconnecting(false);
        }
      }, 500);
    } else {
      setShowModal(true);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: string | null) => {
    if (!chainId) return 'Unknown';
    switch (chainId) {
      case '0x1':
        return 'ETH';
      case '0x2105':
        return 'Base';
      case '0xa':
        return 'OP';
      case '0xa4b1':
        return 'ARB';
      default:
        return chainId.slice(2, 6);
    }
  };

  const isBaseNetwork = chainId === '0x2105';

  const handleSwitchToBase = async () => {
    setIsSwitchingNetwork(true);
    try {
      await switchToBaseNetwork();
      Alert.alert('Success', 'Switched to Base network!');
    } catch (error) {
      console.error('Failed to switch to Base network:', error);
      Alert.alert('Network Error', 'Failed to switch to Base network. Please try again.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const handleAddBaseNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await addBaseNetwork();
      Alert.alert('Success', 'Base network added to your wallet!');
    } catch (error) {
      console.error('Failed to add Base network:', error);
      Alert.alert('Network Error', 'Failed to add Base network. Please try again.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  if (isConnected && walletAddress) {
    const isFallbackMode = coinbaseWalletService.isUsingFallback();
    
    return (
      <View style={[styles.container, style]}>
        <View style={styles.connectedContainer}>
          <View style={styles.walletInfo}>
            <Ionicons name="wallet" size={20} color="#10B981" />
            <View style={styles.addressContainer}>
              <Text style={styles.connectedText}>
                {formatAddress(walletAddress)}
              </Text>
              <View style={styles.networkContainer}>
                <View style={[
                  styles.networkBadge,
                  isBaseNetwork ? styles.baseNetworkBadge : styles.otherNetworkBadge
                ]}>
                  <Text style={styles.networkText}>
                    {getNetworkName(chainId)}
                  </Text>
                </View>
                {!isBaseNetwork && (
                  <View style={styles.networkActions}>
                    <TouchableOpacity
                      style={styles.networkButton}
                      onPress={handleSwitchToBase}
                      disabled={isSwitchingNetwork}
                    >
                      {isSwitchingNetwork ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Text style={styles.networkButtonText}>Base</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {/* Fallback Mode Indicator */}
              {isFallbackMode && (
                <View style={styles.fallbackIndicator}>
                  <Text style={styles.fallbackText}>Demo Mode</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handlePress}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.connectButton}
        onPress={handlePress}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </>
        )}
      </TouchableOpacity>

      <WalletConnectionModal
        isVisible={showModal}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  addressContainer: {
    flex: 1,
  },
  connectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  networkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  baseNetworkBadge: {
    backgroundColor: '#10B981',
  },
  otherNetworkBadge: {
    backgroundColor: '#F59E0B',
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  networkActions: {
    flexDirection: 'row',
    gap: 4,
  },
  networkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  networkButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  disconnectButton: {
    padding: 4,
  },
  fallbackIndicator: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
  },
});
