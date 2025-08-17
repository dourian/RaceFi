# Wallet Connection Feature Implementation

This document describes the implementation of the wallet connection feature using Coinbase Wallet Mobile SDK for the RaceFi mobile app.

## Overview

The wallet connection feature allows users to:
- Connect their Coinbase Wallet to the app
- Sign messages and transactions
- Switch between different networks (with focus on Base network)
- View wallet information and network status
- Test wallet functionality through a demo interface

## Architecture

### Core Services

1. **`coinbaseWalletService.ts`** - Direct integration with Coinbase Wallet Mobile SDK
2. **`walletConnectionService.ts`** - High-level wallet connection management
3. **`walletTransactionService.ts`** - Transaction handling and validation utilities

### Context and Components

1. **`WalletContext.tsx`** - React context for wallet state management
2. **`WalletConnectionButton.tsx`** - Main wallet connection/disconnection button
3. **`WalletConnectionModal.tsx`** - Modal for selecting wallet type and managing networks
4. **`WalletDemo.tsx`** - Demo interface for testing wallet functionality

## Features

### Wallet Connection
- **Coinbase Wallet Integration**: Primary wallet connection using official SDK
- **Network Management**: Automatic Base network detection and switching
- **Deep Link Support**: Handles wallet callbacks and responses
- **Connection Persistence**: Remembers wallet connection across app sessions

### Network Support
- **Base Network**: Primary network for RaceFi operations
- **Network Switching**: Seamless switching between supported networks
- **Network Addition**: Automatic Base network addition if not present
- **Network Status Display**: Real-time network information

### Transaction Capabilities
- **Message Signing**: Sign personal messages for authentication
- **Transaction Signing**: Sign transactions without broadcasting
- **Transaction Broadcasting**: Send signed transactions to the network
- **Gas Estimation**: Automatic gas calculation and recommendations

### Security Features
- **Address Validation**: Ethereum address format validation
- **Transaction Validation**: Comprehensive transaction parameter validation
- **Error Handling**: Robust error handling and user feedback
- **Secure Storage**: Secure wallet address storage using AsyncStorage

## Installation and Setup

### Prerequisites
- React Native/Expo project
- Coinbase Wallet Mobile SDK: `@coinbase/wallet-mobile-sdk`
- AsyncStorage for data persistence

### Dependencies
```json
{
  "@coinbase/wallet-mobile-sdk": "^1.1.2",
  "@react-native-async-storage/async-storage": "2.1.2"
}
```

### Configuration
The wallet service is configured with:
- **Host URL**: `https://wallet.coinbase.com/wsegue`
- **Callback URL**: `racefi://wallet-callback`
- **Host Package**: `org.toshi` (Coinbase Wallet package name)

## Usage

### Basic Wallet Connection

```typescript
import { useWallet } from '../contexts/WalletContext';

const MyComponent = () => {
  const { 
    walletAddress, 
    isConnected, 
    connectWallet, 
    disconnectWallet 
  } = useWallet();

  // Connect wallet
  const handleConnect = async () => {
    try {
      await connectWallet('0x...');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Disconnection failed:', error);
    }
  };

  return (
    <View>
      {isConnected ? (
        <Text>Connected: {walletAddress}</Text>
      ) : (
        <Text>Not connected</Text>
      )}
    </View>
  );
};
```

### Message Signing

```typescript
import { useWallet } from '../contexts/WalletContext';

const MyComponent = () => {
  const { signMessage } = useWallet();

  const handleSignMessage = async () => {
    try {
      const result = await signMessage('Hello RaceFi!');
      console.log('Signature:', result.signature);
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return (
    <Button title="Sign Message" onPress={handleSignMessage} />
  );
};
```

### Transaction Signing

```typescript
import { useWallet } from '../contexts/WalletContext';
import { walletTransactionService } from '../services/walletTransactionService';

const MyComponent = () => {
  const { signTransaction, walletAddress } = useWallet();

  const handleSignTransaction = async () => {
    try {
      const transaction = {
        fromAddress: walletAddress!,
        toAddress: '0x...',
        weiValue: walletTransactionService.formatEthToWei('0.001'),
        data: '0x',
        chainId: '0x2105', // Base network
      };

      const result = await signTransaction(transaction);
      console.log('Transaction signed:', result.signature);
    } catch (error) {
      console.error('Transaction signing failed:', error);
    }
  };

  return (
    <Button title="Sign Transaction" onPress={handleSignTransaction} />
  );
};
```

### Network Management

```typescript
import { useWallet } from '../contexts/WalletContext';

const MyComponent = () => {
  const { 
    chainId, 
    switchToBaseNetwork, 
    addBaseNetwork 
  } = useWallet();

  const handleSwitchToBase = async () => {
    try {
      await switchToBaseNetwork();
      console.log('Switched to Base network');
    } catch (error) {
      console.error('Network switch failed:', error);
    }
  };

  const handleAddBaseNetwork = async () => {
    try {
      await addBaseNetwork();
      console.log('Base network added');
    } catch (error) {
      console.error('Network addition failed:', error);
    }
  };

  return (
    <View>
      <Text>Current Network: {chainId}</Text>
      <Button title="Switch to Base" onPress={handleSwitchToBase} />
      <Button title="Add Base Network" onPress={handleAddBaseNetwork} />
    </View>
  );
};
```

## API Reference

### WalletContext Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `connectWallet` | Connect wallet with address | `address: string` | `Promise<void>` |
| `disconnectWallet` | Disconnect current wallet | None | `Promise<void>` |
| `signMessage` | Sign a personal message | `message: string` | `Promise<{signature, message}>` |
| `signTransaction` | Sign a transaction | `transaction: TransactionParams` | `Promise<{signature, transactionHash}>` |
| `sendTransaction` | Send a transaction | `transaction: TransactionParams` | `Promise<{transactionHash}>` |
| `switchToBaseNetwork` | Switch to Base network | None | `Promise<void>` |
| `addBaseNetwork` | Add Base network to wallet | None | `Promise<void>` |

### WalletConnectionService Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `connectCoinbaseWallet` | Connect to Coinbase Wallet | None | `Promise<WalletConnectionResult>` |
| `connectMetaMask` | Connect to MetaMask | None | `Promise<WalletConnectionResult>` |
| `connectWalletConnect` | Connect via WalletConnect | None | `Promise<WalletConnectionResult>` |
| `disconnect` | Disconnect wallet | None | `Promise<void>` |
| `isConnected` | Check connection status | None | `boolean` |
| `getAccounts` | Get connected accounts | None | `string[]` |

### WalletTransactionService Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `validateTransactionParams` | Validate transaction parameters | `params: TransactionParams` | `{isValid, errors}` |
| `formatWeiToEth` | Convert wei to ETH | `wei: string` | `string` |
| `formatEthToWei` | Convert ETH to wei | `eth: string` | `string` |
| `getNetworkName` | Get network name from chain ID | `chainId: string` | `string` |
| `getRecommendedGasSettings` | Get recommended gas settings | None | `GasSettings` |

## Error Handling

The wallet services implement comprehensive error handling:

- **Connection Errors**: Network issues, SDK initialization failures
- **Validation Errors**: Invalid addresses, transaction parameters
- **User Rejection**: User denies wallet connection or transaction
- **Network Errors**: Failed network switching, gas estimation failures

All errors are logged and presented to users with meaningful messages.

## Security Considerations

1. **Private Key Security**: Private keys never leave the wallet
2. **Address Validation**: All addresses are validated before use
3. **Transaction Validation**: Comprehensive transaction parameter validation
4. **Secure Storage**: Wallet addresses stored securely using AsyncStorage
5. **Error Handling**: No sensitive information exposed in error messages

## Testing

The `WalletDemo` component provides a comprehensive testing interface for:
- Wallet connection/disconnection
- Message signing
- Transaction signing
- Network switching
- Transaction broadcasting

## Troubleshooting

### Common Issues

1. **Wallet Not Connecting**
   - Ensure Coinbase Wallet is installed
   - Check network connectivity
   - Verify app configuration

2. **Network Switching Fails**
   - Ensure wallet supports the target network
   - Check if network is already added
   - Verify chain ID format

3. **Transaction Fails**
   - Check wallet balance
   - Verify gas settings
   - Ensure correct network is selected

### Debug Information

Enable debug logging by checking console output for:
- SDK initialization status
- Connection attempts
- Network switching operations
- Transaction signing results

## Future Enhancements

1. **Multi-Wallet Support**: Support for additional wallet types
2. **Advanced Gas Management**: Dynamic gas estimation and optimization
3. **Transaction History**: Local transaction history tracking
4. **Batch Transactions**: Support for multiple transaction operations
5. **DeFi Integration**: Direct integration with DeFi protocols

## Support

For issues or questions regarding the wallet connection feature:
1. Check the console logs for error details
2. Verify wallet configuration and network settings
3. Ensure all dependencies are properly installed
4. Test with the WalletDemo component to isolate issues

## License

This implementation is part of the RaceFi mobile application and follows the project's licensing terms. 