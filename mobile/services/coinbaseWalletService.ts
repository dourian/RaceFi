import AsyncStorage from "@react-native-async-storage/async-storage";

// Import the real Coinbase Wallet Mobile SDK functions
import {
  configure,
  initiateHandshake,
  makeRequest,
  isCoinbaseWalletInstalled,
  isConnected as sdkIsConnected,
  resetSession,
} from "@coinbase/wallet-mobile-sdk";

export interface CoinbaseWalletConfig {
  hostURL: string;
  callbackURL: string;
  hostPackageName: string;
}

export interface WalletConnectionResult {
  address: string;
  provider: string;
  chainId: string;
}

export interface SignMessageResult {
  signature: string;
  message: string;
}

export interface SignTransactionResult {
  signature: string;
  transactionHash: string;
}

class CoinbaseWalletService {
  private isInitialized = false;
  private connectedAddress: string | null = null;
  private currentChainId: string = "0x2105"; // Base mainnet
  private currentAccount: any = null;

  /**
   * Initialize the Coinbase Wallet Mobile SDK
   */
  async initialize(config: CoinbaseWalletConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing real Coinbase Wallet Mobile SDK...");

      // Configure the SDK with proper URL objects
      configure({
        callbackURL: new URL(config.callbackURL),
        hostURL: new URL(config.hostURL),
        hostPackageName: config.hostPackageName,
      });

      // Check for cached address
      const cachedAddress = await AsyncStorage.getItem(
        "coinbase_wallet_address"
      );
      if (cachedAddress) {
        this.connectedAddress = cachedAddress;
        console.log("Found cached Coinbase Wallet address:", cachedAddress);
      }

      this.isInitialized = true;
      console.log("Coinbase Wallet Mobile SDK initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize Coinbase Wallet SDK:", error);
      throw new Error("Failed to initialize Coinbase Wallet SDK");
    }
  }

  /**
   * Connect to Coinbase Wallet
   */
  async connect(): Promise<WalletConnectionResult> {
    if (!this.isInitialized) {
      throw new Error("Coinbase Wallet SDK not initialized");
    }

    try {
      console.log("Initiating real Coinbase Wallet connection...");

      // Check if Coinbase Wallet is installed
      const isInstalled = await isCoinbaseWalletInstalled();
      if (!isInstalled) {
        throw new Error(
          "Coinbase Wallet app is not installed. Please install it first."
        );
      }

      // Start the handshake process
      const [results, account] = await initiateHandshake([
        {
          method: "eth_requestAccounts",
          params: [],
        },
      ]);

      console.log("Handshake completed, processing results...");

      if (!results || results.length === 0) {
        throw new Error("No results returned from wallet");
      }

      // Extract account information
      if (account && account.address) {
        const address = account.address;
        this.connectedAddress = address;
        this.currentAccount = account;

        // Cache the address
        await AsyncStorage.setItem("coinbase_wallet_address", address);

        console.log("Real Coinbase Wallet connected successfully:", address);

        return {
          address,
          provider: "coinbase",
          chainId: this.currentChainId,
        };
      } else {
        throw new Error("No account information returned from wallet");
      }
    } catch (error) {
      console.error("Coinbase Wallet connection error:", error);
      throw error;
    }
  }

  /**
   * Sign a personal message
   */
  async signMessage(message: string): Promise<SignMessageResult> {
    if (!this.connectedAddress || !this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Signing real message with Coinbase Wallet...");

      const results = await makeRequest(
        [
          {
            method: "personal_sign",
            params: [message, this.connectedAddress],
          },
        ],
        this.currentAccount
      );

      if (!results || results.length === 0) {
        throw new Error("No signature returned");
      }

      const result = results[0];
      if (result.errorCode) {
        throw new Error(`Signing failed: ${result.errorMessage}`);
      }

      const signature = result.result;
      if (!signature) {
        throw new Error("No signature in result");
      }

      console.log("Message signed successfully with real signature");

      return {
        signature: signature,
        message: message,
      };
    } catch (error) {
      console.error("Message signing error:", error);
      throw error;
    }
  }

  /**
   * Sign a transaction
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
  }): Promise<SignTransactionResult> {
    if (!this.connectedAddress || !this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Signing real transaction with Coinbase Wallet...");

      const txParams = {
        from: transaction.fromAddress,
        to: transaction.toAddress,
        value: transaction.weiValue,
        data: transaction.data || "0x",
        nonce: transaction.nonce,
        gasPrice: transaction.gasPriceInWei,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        gas: transaction.gasLimit,
        chainId: transaction.chainId,
      };

      const results = await makeRequest(
        [
          {
            method: "eth_signTransaction",
            params: [txParams],
          },
        ],
        this.currentAccount
      );

      if (!results || results.length === 0) {
        throw new Error("No signature returned");
      }

      const result = results[0];
      if (result.errorCode) {
        throw new Error(`Transaction signing failed: ${result.errorMessage}`);
      }

      const signature = result.result;
      if (!signature) {
        throw new Error("No signature in result");
      }

      console.log("Transaction signed successfully with real signature");

      return {
        signature: signature,
        transactionHash: "", // Will be available after transaction is sent
      };
    } catch (error) {
      console.error("Transaction signing error:", error);
      throw error;
    }
  }

  /**
   * Send a transaction
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
    if (!this.connectedAddress || !this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Sending real transaction with Coinbase Wallet...");

      const txParams = {
        from: transaction.fromAddress,
        to: transaction.toAddress,
        value: transaction.weiValue,
        data: transaction.data || "0x",
        nonce: transaction.nonce,
        gasPrice: transaction.gasPriceInWei,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        gas: transaction.gasLimit,
        chainId: transaction.chainId,
      };

      const results = await makeRequest(
        [
          {
            method: "eth_sendTransaction",
            params: [txParams],
          },
        ],
        this.currentAccount
      );

      if (!results || results.length === 0) {
        throw new Error("No transaction hash returned");
      }

      const result = results[0];
      if (result.errorCode) {
        throw new Error(`Transaction sending failed: ${result.errorMessage}`);
      }

      const transactionHash = result.result;
      if (!transactionHash) {
        throw new Error("No transaction hash in result");
      }

      console.log(
        "Transaction sent successfully with real hash:",
        transactionHash
      );

      return {
        transactionHash: transactionHash,
      };
    } catch (error) {
      console.error("Transaction sending error:", error);
      throw error;
    }
  }

  /**
   * Switch to Base network
   */
  async switchToBaseNetwork(): Promise<void> {
    if (!this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Switching to real Base network...");

      const results = await makeRequest(
        [
          {
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x2105" }], // Base mainnet
          },
        ],
        this.currentAccount
      );

      if (results && results.length > 0) {
        const result = results[0];
        if (result.errorCode) {
          throw new Error(`Network switching failed: ${result.errorMessage}`);
        }
        this.currentChainId = "0x2105";
        console.log("Successfully switched to real Base network!");
      }
    } catch (error) {
      console.error("Failed to switch to Base network:", error);
      throw error;
    }
  }

  /**
   * Add Base network to wallet
   */
  async addBaseNetwork(): Promise<void> {
    if (!this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Adding real Base network to wallet...");

      const networkParams = {
        chainId: "0x2105",
        chainName: "Base",
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://mainnet.base.org"],
        blockExplorerUrls: ["https://basescan.org"],
        iconUrls: [
          "https://raw.githubusercontent.com/ethereum-optimism/brand-kit/main/assets/svg/Base_Network_Logo.svg",
        ],
      };

      const results = await makeRequest(
        [
          {
            method: "wallet_addEthereumChain",
            params: [networkParams],
          },
        ],
        this.currentAccount
      );

      if (results && results.length > 0) {
        const result = results[0];
        if (result.errorCode) {
          throw new Error(`Network addition failed: ${result.errorMessage}`);
        }
        console.log("Base network successfully added to real wallet!");
      }
    } catch (error) {
      console.error("Failed to add Base network:", error);
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
    if (!this.currentAccount) {
      throw new Error("Wallet not connected");
    }

    try {
      console.log("Watching real asset with Coinbase Wallet...");

      const assetParams = {
        type: asset.type,
        options: {
          address: asset.address,
          symbol: asset.symbol,
          decimals: asset.decimals,
          image: asset.image,
        },
      };

      const results = await makeRequest(
        [
          {
            method: "wallet_watchAsset",
            params: [assetParams],
          },
        ],
        this.currentAccount
      );

      if (results && results.length > 0) {
        const result = results[0];
        if (result.errorCode) {
          throw new Error(`Asset watching failed: ${result.errorMessage}`);
        }
        console.log(`Real asset ${asset.symbol} successfully added to wallet!`);
      }
    } catch (error) {
      console.error("Failed to watch asset:", error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect(): Promise<void> {
    try {
      // Reset the SDK session
      resetSession();

      this.connectedAddress = null;
      this.currentAccount = null;
      this.isInitialized = false;

      // Remove cached address
      await AsyncStorage.removeItem("coinbase_wallet_address");

      console.log("Real Coinbase Wallet disconnected successfully");
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connectedAddress !== null && this.isInitialized;
  }

  /**
   * Get connected address
   */
  getConnectedAddress(): string | null {
    return this.connectedAddress;
  }

  /**
   * Get current chain ID
   */
  getCurrentChainId(): string {
    return this.currentChainId;
  }

  /**
   * Validate Ethereum address format
   */
  isValidAddress(address: string): boolean {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  /**
   * Check if using fallback mode (should always be false now)
   */
  isUsingFallback(): boolean {
    return false; // We're using the real SDK now!
  }
}

export const coinbaseWalletService = new CoinbaseWalletService();
