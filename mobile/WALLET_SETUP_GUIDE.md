# Wallet Setup Guide

## Current Status: REAL WALLET INTEGRATION ✅

The wallet connection feature is now fully implemented with the **REAL Coinbase Wallet Mobile SDK**! No more fallback mode or demo addresses - this is the real deal.

## What's Working Now

✅ **Real Wallet Connection**: Connects to actual Coinbase Wallet app  
✅ **Real Message Signing**: Cryptographically valid signatures  
✅ **Real Transaction Signing**: Actual transaction signing  
✅ **Real Network Operations**: Real Base network switching  
✅ **Real Asset Watching**: Add tokens to your wallet  
✅ **Metro Compatible**: No bundling issues

## Requirements

### 1. Install Coinbase Wallet App

- **iOS**: Download from App Store
- **Android**: Download from Google Play Store
- **Create or Import** a wallet with some ETH

### 2. Add Base Network to Your Wallet

- **Network Name**: `Base`
- **RPC URL**: `https://mainnet.base.org`
- **Chain ID**: `8453`
- **Currency Symbol**: `ETH`
- **Block Explorer**: `https://basescan.org`

## How It Works

### Real Wallet Connection

1. **Tap "Connect Wallet"** in the app
2. **Select "Coinbase Wallet"**
3. **Coinbase Wallet app opens** automatically
4. **Approve connection** in your wallet
5. **Real wallet address** is connected and displayed

### Real Message Signing

- Messages are signed with your actual private key
- Signatures are cryptographically valid
- Can be verified on-chain

### Real Transaction Operations

- **Sign Transactions**: Sign without broadcasting
- **Send Transactions**: Actually send to blockchain
- **Real Gas Fees**: Pay actual network fees
- **Real Transaction Hashes**: Get actual blockchain transaction IDs

### Real Network Management

- **Switch to Base**: Actually switch your wallet network
- **Add Base Network**: Add Base to your wallet if not present
- **Network Detection**: Real-time network status

## Testing the Real Wallet

### 1. Connect Your Real Wallet

- Ensure Coinbase Wallet app is installed
- Tap "Connect Wallet" → "Coinbase Wallet"
- Approve the connection in your wallet app
- See your real wallet address displayed

### 2. Test Real Message Signing

- Go to Profile → Wallet Demo
- Enter a message to sign
- Tap "Sign Message"
- Approve in your wallet app
- Get a real, verifiable signature

### 3. Test Real Transactions

- Enter transaction details (recipient, amount)
- Tap "Sign Transaction" or "Send Transaction"
- Approve in your wallet app
- Get real transaction signatures/hashes

### 4. Test Network Operations

- Switch to Base network
- Add Base network if not present
- View real network status

## Security Features

✅ **Private Key Security**: Keys never leave your wallet  
✅ **Real Signatures**: Cryptographically valid signatures  
✅ **Transaction Validation**: Comprehensive parameter validation  
✅ **Error Handling**: Clear error messages for failures  
✅ **Secure Storage**: Wallet addresses stored securely

## Troubleshooting

### Wallet Not Connecting

- Ensure Coinbase Wallet app is installed
- Check app permissions
- Verify deep link configuration
- Restart both apps if needed

### Connection Fails

- Check if Coinbase Wallet app is running
- Ensure you have an active wallet
- Verify network connectivity
- Check console for detailed error messages

### Transaction Fails

- Ensure sufficient ETH for gas fees
- Verify you're on the correct network
- Check transaction parameters
- Ensure wallet is unlocked

### Network Issues

- Verify Base network is added to your wallet
- Check if you have ETH on Base network
- Ensure wallet supports the operation
- Try switching networks manually in wallet app

## Configuration

### App Configuration

The wallet is configured in `app.json`:

```json
{
  "expo": {
    "scheme": "racefi",
    "linking": {
      "prefixes": ["racefi://", "https://racefi.app"]
    }
  }
}
```

### Wallet Service Configuration

Real wallet service configuration in `coinbaseWalletService.ts`:

```typescript
// Real Coinbase Wallet SDK integration
import {
  configure,
  initiateHandshake,
  makeRequest,
  isCoinbaseWalletInstalled,
} from "@coinbase/wallet-mobile-sdk";

// Configure with real URLs
configure({
  callbackURL: new URL("racefi://wallet-callback"),
  hostURL: new URL("https://wallet.coinbase.com/wsegue"),
  hostPackageName: "org.toshi",
});
```

## API Reference

### Real Wallet Methods

| Method                  | Description                     | Returns                  |
| ----------------------- | ------------------------------- | ------------------------ |
| `connect()`             | Connect to real Coinbase Wallet | `WalletConnectionResult` |
| `signMessage()`         | Sign with real private key      | `SignMessageResult`      |
| `signTransaction()`     | Sign real transaction           | `SignTransactionResult`  |
| `sendTransaction()`     | Send to blockchain              | `{transactionHash}`      |
| `switchToBaseNetwork()` | Switch to real Base network     | `void`                   |
| `addBaseNetwork()`      | Add Base to wallet              | `void`                   |

### Real Transaction Parameters

```typescript
interface TransactionParams {
  fromAddress: string; // Your real wallet address
  toAddress: string; // Recipient address
  weiValue: string; // Amount in wei
  data?: string; // Contract data (optional)
  nonce?: number; // Transaction nonce
  gasPriceInWei?: string; // Gas price
  maxFeePerGas?: string; // EIP-1559 max fee
  maxPriorityFeePerGas?: string; // EIP-1559 priority fee
  gasLimit?: string; // Gas limit
  chainId: string; // Network chain ID
}
```

## Next Steps

1. **Test Real Functionality**: Connect your real wallet and test all features
2. **Add Base Network**: Ensure Base network is in your wallet
3. **Get Some ETH**: Add ETH to Base network for gas fees
4. **Start Using**: Begin real wallet operations

## Support

For technical support:

1. Check console logs for detailed error information
2. Verify Coinbase Wallet app is properly installed
3. Ensure Base network is added to your wallet
4. Check network connectivity and permissions

## Real Wallet Benefits

With real wallet integration, you can:

- **Connect Real Wallets**: Use your actual Coinbase Wallet
- **Sign Real Messages**: Cryptographically valid signatures
- **Send Real Transactions**: Actually interact with blockchain
- **Manage Real Networks**: Switch between real networks
- **Watch Real Assets**: Add tokens to your wallet
- **Real Security**: Your private keys stay secure

The wallet is now fully production-ready with real Coinbase Wallet integration!
