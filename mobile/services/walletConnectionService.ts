import { Alert } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { coinbaseWalletService, CoinbaseWalletConfig } from './coinbaseWalletService';

export interface WalletConnectionResult {
  address: string;
  provider: string;
  chainId?: string;
}

class WalletConnectionService {
  private readonly BASE_CHAIN_ID = 8453;
  private readonly BASE_RPC_URL = "https://mainnet.base.org";
  private connectedAddress: string | null = null;
  private isInitialized = false;

  /**
   * Initialize wallet services
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Coinbase Wallet SDK
      const config: CoinbaseWalletConfig = {
        hostURL: 'https://wallet.coinbase.com/wsegue',
        callbackURL: 'racefi://wallet-callback',
        hostPackageName: 'org.toshi',
      };

      await coinbaseWalletService.initialize(config);
      
      // Check for cached address
      const cachedAddress = await AsyncStorage.getItem('wallet_address');
      if (cachedAddress) {
        this.connectedAddress = cachedAddress;
        console.log('Found cached wallet address:', cachedAddress);
      }

      this.isInitialized = true;
      console.log('Wallet services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize wallet services:', error);
      throw new Error('Failed to initialize wallet connection');
    }
  }

  /**
   * Connect to Coinbase Wallet
   */
  async connectCoinbaseWallet(): Promise<WalletConnectionResult> {
    try {
      console.log("Connecting to Coinbase Wallet...");

      await this.initialize();
      
      // Connect using Coinbase Wallet service
      const result = await coinbaseWalletService.connect();
      
      if (!this.isValidAddress(result.address)) {
        throw new Error("Invalid wallet address received");
      }

      this.connectedAddress = result.address;
      
      // Cache the address
      await AsyncStorage.setItem('wallet_address', result.address);
      
      console.log("Coinbase Wallet connected successfully with address:", result.address);

      // Try to switch to Base network
      try {
        await coinbaseWalletService.switchToBaseNetwork();
      } catch (switchError) {
        console.log('Failed to switch to Base network, trying to add it...');
        try {
          await coinbaseWalletService.addBaseNetwork();
        } catch (addError) {
          console.log('Failed to add Base network, continuing with current network');
        }
      }

      return {
        address: result.address,
        provider: result.provider,
        chainId: result.chainId,
      };
    } catch (error) {
      console.error("Coinbase Wallet connection error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to connect to Coinbase Wallet");
    }
  }

  /**
   * Connect to MetaMask (fallback to demo for now)
   */
  async connectMetaMask(): Promise<WalletConnectionResult> {
    try {
      console.log("MetaMask connection not implemented yet. Use Coinbase Wallet instead.");
      
      // For now, show an alert directing users to use Coinbase Wallet
      return new Promise((resolve, reject) => {
        Alert.alert(
          'MetaMask Not Available',
          'Please use Coinbase Wallet for Base network connections.',
          [
            { text: 'OK', onPress: () => reject(new Error('MetaMask not available')) }
          ]
        );
      });
    } catch (error) {
      console.error("MetaMask connection error:", error);
      throw error;
    }
  }

  /**
   * Connect using WalletConnect protocol (redirects to Coinbase Wallet)
   */
  async connectWalletConnect(): Promise<WalletConnectionResult> {
    try {
      console.log("Connecting via Coinbase Wallet...");

      // For now, redirect to Coinbase Wallet connection
      return await this.connectCoinbaseWallet();
    } catch (error) {
      console.error("Wallet connection error:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to connect wallet");
    }
  }

  /**
   * Sign a message using the connected wallet
   */
  async signMessage(message: string): Promise<{ signature: string; message: string }> {
    if (!this.connectedAddress) {
      throw new Error('No wallet connected');
    }

    try {
      return await coinbaseWalletService.signMessage(message);
    } catch (error) {
      console.error('Message signing error:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction using the connected wallet
   */
  async signTransaction(transaction: {
    fromAddress: string;
    toAddress?: string;
    weiValue: string;
    data?: string;
    nonce?: number;
    gasPriceInWei?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasLimit?: string;
    chainId: string;
  }): Promise<{ signature: string; transactionHash: string }> {
    if (!this.connectedAddress) {
      throw new Error('No wallet connected');
    }

    try {
      return await coinbaseWalletService.signTransaction(transaction);
    } catch (error) {
      console.error('Transaction signing error:', error);
      throw error;
    }
  }

  /**
   * Send a transaction using the connected wallet
   */
  async sendTransaction(transaction: {
    fromAddress: string;
    toAddress?: string;
    weiValue: string;
    data?: string;
    nonce?: number;
    gasPriceInWei?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasLimit?: string;
    chainId: string;
  }): Promise<{ transactionHash: string }> {
    if (!this.connectedAddress) {
      throw new Error('No wallet connected');
    }

    try {
      return await coinbaseWalletService.sendTransaction(transaction);
    } catch (error) {
      console.error('Transaction sending error:', error);
      throw error;
    }
  }

  /**
   * Validate wallet address format
   */
  isValidAddress(address: string): boolean {
    return coinbaseWalletService.isValidAddress(address);
  }

  /**
   * Disconnect from current wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (coinbaseWalletService.isConnected()) {
        await coinbaseWalletService.disconnect();
      }
      
      this.connectedAddress = null;
      await AsyncStorage.removeItem('wallet_address');
      console.log("Wallet disconnected successfully");
    } catch (error) {
      console.error("Disconnect error:", error);
      throw new Error("Failed to disconnect wallet");
    }
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return coinbaseWalletService.isConnected();
  }

  /**
   * Get connected accounts
   */
  getAccounts(): string[] {
    const address = coinbaseWalletService.getConnectedAddress();
    return address ? [address] : [];
  }

  /**
   * Get current chain ID
   */
  getCurrentChainId(): string {
    return coinbaseWalletService.getCurrentChainId();
  }

  /**
   * Switch to Base network
   */
  async switchToBaseNetwork(): Promise<void> {
    try {
      await coinbaseWalletService.switchToBaseNetwork();
    } catch (error) {
      console.error('Failed to switch to Base network:', error);
      throw error;
    }
  }

  /**
   * Add Base network to wallet
   */
  async addBaseNetwork(): Promise<void> {
    try {
      await coinbaseWalletService.addBaseNetwork();
    } catch (error) {
      console.error('Failed to add Base network:', error);
      throw error;
    }
  }

  /**
   * Watch a token asset
   */
  async watchAsset(asset: {
    type: string;
    address: string;
    symbol: string;
    decimals: number;
    image?: string;
  }): Promise<void> {
    try {
      await coinbaseWalletService.watchAsset(asset);
    } catch (error) {
      console.error('Failed to watch asset:', error);
      throw error;
    }
  }

  /**
   * Handle deep link responses from Coinbase Wallet
   */
  handleDeepLink(url: string): void {
    console.log('Handling deep link:', url);
    // The Coinbase Wallet SDK handles deep links internally
  }

  /**
   * Handle deep link callback (for production implementation)
   */
  handleDeepLinkCallback(url: string): WalletConnectionResult | null {
    try {
      const parsedUrl = new URL(url);
      const address = parsedUrl.searchParams.get("address");
      const provider = parsedUrl.searchParams.get("provider");

      if (address && provider && this.isValidAddress(address)) {
        return { address, provider };
      }

      return null;
    } catch (error) {
      console.error("Deep link parsing error:", error);
      return null;
    }
  }
}

export const walletConnectionService = new WalletConnectionService();
