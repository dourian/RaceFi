import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../contexts/WalletContext';
import { walletTransactionService } from '../services/walletTransactionService';

export const WalletDemo: React.FC = () => {
  const { 
    walletAddress, 
    isConnected, 
    chainId, 
    signMessage, 
    signTransaction, 
    sendTransaction,
    switchToBaseNetwork,
    addBaseNetwork 
  } = useWallet();
  
  const [message, setMessage] = useState('Hello RaceFi! Sign this message to verify your wallet.');
  const [toAddress, setToAddress] = useState('0x000000000000000000000000000000000000dEaD');
  const [ethAmount, setEthAmount] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignMessage = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signMessage(message);
      Alert.alert(
        'Message Signed Successfully!',
        `Signature: ${result.signature.slice(0, 20)}...\n\nMessage: ${result.message}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignTransaction = async () => {
    if (!isConnected || !walletAddress) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const weiValue = walletTransactionService.formatEthToWei(ethAmount);
      const gasSettings = walletTransactionService.getRecommendedGasSettings();
      
      const transaction = {
        fromAddress: walletAddress,
        toAddress,
        weiValue,
        data: '0x',
        nonce: 0,
        maxFeePerGas: gasSettings.maxFeePerGas,
        maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
        gasLimit: gasSettings.gasLimit,
        chainId: chainId || '0x2105',
      };

      const result = await signTransaction(transaction);
      Alert.alert(
        'Transaction Signed Successfully!',
        `Signature: ${result.signature.slice(0, 20)}...\n\nTransaction Hash: ${result.transactionHash || 'N/A'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!isConnected || !walletAddress) {
      Alert.alert('Error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      const weiValue = walletTransactionService.formatEthToWei(ethAmount);
      const gasSettings = walletTransactionService.getRecommendedGasSettings();
      
      const transaction = {
        fromAddress: walletAddress,
        toAddress,
        weiValue,
        data: '0x',
        nonce: 0,
        maxFeePerGas: gasSettings.maxFeePerGas,
        maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
        gasLimit: gasSettings.gasLimit,
        chainId: chainId || '0x2105',
      };

      const result = await sendTransaction(transaction);
      Alert.alert(
        'Transaction Sent Successfully!',
        `Transaction Hash: ${result.transactionHash}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToBase = async () => {
    setIsLoading(true);
    try {
      await switchToBaseNetwork();
      Alert.alert('Success', 'Switched to Base network!');
    } catch (error) {
      console.error('Failed to switch to Base network:', error);
      Alert.alert('Network Error', 'Failed to switch to Base network. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBaseNetwork = async () => {
    setIsLoading(true);
    try {
      await addBaseNetwork();
      Alert.alert('Success', 'Base network added to your wallet!');
    } catch (error) {
      console.error('Failed to add Base network:', error);
      Alert.alert('Network Error', 'Failed to add Base network. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Wallet Demo</Text>
        <Text style={styles.subtitle}>Please connect your wallet to test functionality</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Wallet Demo</Text>
      
      {/* Real Wallet Info */}
      <View style={styles.realWalletInfo}>
        <Text style={styles.realWalletTitle}>✅ Real Wallet Connected</Text>
        <Text style={styles.realWalletText}>
          You're connected to the real Coinbase Wallet! All operations will use your actual wallet.
        </Text>
      </View>
      
      {/* Wallet Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wallet Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{walletAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Network:</Text>
          <Text style={styles.value}>
            {walletTransactionService.getNetworkName(chainId || '')} ({chainId})
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Base Network:</Text>
          <Text style={styles.value}>
            {walletTransactionService.isConnectedToBase() ? '✅ Connected' : '❌ Not Connected'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>
            🚀 Production Ready
          </Text>
        </View>
      </View>

      {/* Network Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Actions</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSwitchToBase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Switch to Base Network</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleAddBaseNetwork}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Add Base Network</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Message Signing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sign Message</Text>
        <Text style={styles.sectionDescription}>
          Sign a message with your real wallet private key
        </Text>
        <TextInput
          style={styles.textInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter message to sign"
          multiline
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSignMessage}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign Message</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Transaction Signing */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sign Transaction</Text>
        <Text style={styles.sectionDescription}>
          Sign a transaction with your real wallet (without broadcasting)
        </Text>
        <TextInput
          style={styles.textInput}
          value={toAddress}
          onChangeText={setToAddress}
          placeholder="To Address"
        />
        <TextInput
          style={styles.textInput}
          value={ethAmount}
          onChangeText={setEthAmount}
          placeholder="ETH Amount"
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSignTransaction}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign Transaction</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Send Transaction */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Send Transaction</Text>
        <Text style={styles.sectionDescription}>
          Send a real transaction to the blockchain
        </Text>
        <Text style={styles.warning}>
          ⚠️ This will actually send a transaction to the network. Make sure you have enough ETH for gas fees.
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleSendTransaction}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send Transaction</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
  realWalletInfo: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  realWalletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
  },
  realWalletText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  value: {
    fontSize: 14,
    color: '#6C757D',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
  },
  dangerButton: {
    backgroundColor: '#DC3545',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warning: {
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#856404',
    fontSize: 14,
  },
}); 