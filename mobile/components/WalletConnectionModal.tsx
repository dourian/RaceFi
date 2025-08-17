import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useWallet } from '../contexts/WalletContext';
import { walletConnectionService } from '../services/walletConnectionService';
import { coinbaseWalletService } from '../services/coinbaseWalletService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WalletConnectionModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isVisible,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { connectWallet, isConnecting, chainId } = useWallet();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const snapPoints = useMemo(() => ['50%', '75%'], []);
  const isFallbackMode = coinbaseWalletService.isUsingFallback();

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const connectToCoinbase = async () => {
    setSelectedWallet('coinbase');
    try {
      console.log('Starting Coinbase wallet connection...');
      const result = await walletConnectionService.connectCoinbaseWallet();
      console.log('Wallet connection result:', result);
      await connectWallet(result.address);
      Alert.alert('Success', 'Coinbase Wallet connected successfully!');
      onClose();
    } catch (error) {
      console.error('Coinbase connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Connection Error', `Failed to connect to Coinbase Wallet: ${errorMessage}`);
    } finally {
      setSelectedWallet(null);
    }
  };

  const connectToMetaMask = async () => {
    setSelectedWallet('metamask');
    try {
      const result = await walletConnectionService.connectMetaMask();
      await connectWallet(result.address);
      Alert.alert('Success', 'MetaMask connected successfully!');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect MetaMask');
      console.error('MetaMask connection error:', error);
    } finally {
      setSelectedWallet(null);
    }
  };

  const connectWithWalletConnect = async () => {
    setSelectedWallet('walletconnect');
    try {
      const result = await walletConnectionService.connectWalletConnect();
      await connectWallet(result.address);
      Alert.alert('Success', 'Wallet connected via WalletConnect!');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to connect via WalletConnect');
      console.error('WalletConnect connection error:', error);
    } finally {
      setSelectedWallet(null);
    }
  };

  const switchToBaseNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await walletConnectionService.switchToBaseNetwork();
      Alert.alert('Success', 'Switched to Base network!');
    } catch (error) {
      console.error('Failed to switch to Base network:', error);
      Alert.alert('Network Error', 'Failed to switch to Base network. Please try again.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const addBaseNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await walletConnectionService.addBaseNetwork();
      Alert.alert('Success', 'Base network added to your wallet!');
    } catch (error) {
      console.error('Failed to add Base network:', error);
      Alert.alert('Network Error', 'Failed to add Base network. Please try again.');
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const getNetworkName = (chainId: string | null) => {
    if (!chainId) return 'Unknown';
    switch (chainId) {
      case '0x1':
        return 'Ethereum Mainnet';
      case '0x2105':
        return 'Base';
      case '0xa':
        return 'Optimism';
      case '0xa4b1':
        return 'Arbitrum One';
      default:
        return `Chain ID: ${chainId}`;
    }
  };

  const isBaseNetwork = chainId === '0x2105';

  React.useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        backdropComponent={renderBackdrop}
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetView style={styles.contentContainer}>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>
            Choose a wallet to connect and start staking on challenges
          </Text>

          {/* Fallback Mode Warning */}
          {isFallbackMode && (
            <View style={styles.fallbackWarning}>
              <Text style={styles.fallbackTitle}>⚠️ Demo Mode Active</Text>
              <Text style={styles.fallbackText}>
                Running in fallback mode. You can test wallet functionality, but real connections require the Coinbase Wallet app.
              </Text>
            </View>
          )}

          {/* Network Status */}
          {chainId && (
            <View style={styles.networkStatus}>
              <Text style={styles.networkLabel}>Current Network:</Text>
              <View style={styles.networkInfo}>
                <Text style={[
                  styles.networkName,
                  isBaseNetwork ? styles.baseNetwork : styles.otherNetwork
                ]}>
                  {getNetworkName(chainId)}
                </Text>
                {!isBaseNetwork && (
                  <View style={styles.networkActions}>
                    <TouchableOpacity
                      style={styles.networkButton}
                      onPress={switchToBaseNetwork}
                      disabled={isSwitchingNetwork}
                    >
                      {isSwitchingNetwork ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Text style={styles.networkButtonText}>Switch to Base</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.networkButton}
                      onPress={addBaseNetwork}
                      disabled={isSwitchingNetwork}
                    >
                      {isSwitchingNetwork ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                      ) : (
                        <Text style={styles.networkButtonText}>Add Base</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.walletOptions}>
            <TouchableOpacity
              style={[
                styles.walletButton,
                selectedWallet === 'coinbase' && styles.walletButtonSelected,
              ]}
              onPress={connectToCoinbase}
              disabled={isConnecting}
            >
              <View style={styles.walletButtonContent}>
                <View style={[styles.walletIcon, { backgroundColor: '#0052FF' }]} />
                <Text style={styles.walletButtonText}>Coinbase Wallet</Text>
                {selectedWallet === 'coinbase' && isConnecting && (
                  <ActivityIndicator size="small" color="#0052FF" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.walletButton,
                selectedWallet === 'metamask' && styles.walletButtonSelected,
              ]}
              onPress={connectToMetaMask}
              disabled={isConnecting}
            >
              <View style={styles.walletButtonContent}>
                <View style={[styles.walletIcon, { backgroundColor: '#F6851B' }]} />
                <Text style={styles.walletButtonText}>MetaMask</Text>
                {selectedWallet === 'metamask' && isConnecting && (
                  <ActivityIndicator size="small" color="#F6851B" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.walletButton,
                selectedWallet === 'walletconnect' && styles.walletButtonSelected,
              ]}
              onPress={connectWithWalletConnect}
              disabled={isConnecting}
            >
              <View style={styles.walletButtonContent}>
                <View style={[styles.walletIcon, { backgroundColor: '#3B99FC' }]} />
                <Text style={styles.walletButtonText}>WalletConnect</Text>
                {selectedWallet === 'walletconnect' && isConnecting && (
                  <ActivityIndicator size="small" color="#3B99FC" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: '#E0E0E0',
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 24,
  },
  networkStatus: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  networkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkName: {
    fontSize: 16,
    fontWeight: '600',
  },
  baseNetwork: {
    color: '#10B981',
  },
  otherNetwork: {
    color: '#F59E0B',
  },
  networkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  networkButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  walletOptions: {
    gap: 16,
    marginBottom: 32,
  },
  walletButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  walletButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  walletButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  walletButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  fallbackWarning: {
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});
