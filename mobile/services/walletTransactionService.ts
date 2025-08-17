import { walletConnectionService } from './walletConnectionService';

export interface TransactionParams {
  fromAddress: string;
  toAddress: string;
  weiValue: string;
  data?: string;
  nonce?: number;
  gasPriceInWei?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: string;
  chainId: string;
}

export interface MessageSigningParams {
  message: string;
  address: string;
}

export interface AssetWatchParams {
  type: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}

class WalletTransactionService {
  /**
   * Sign a personal message
   */
  async signMessage(params: MessageSigningParams): Promise<{ signature: string; message: string }> {
    try {
      return await walletConnectionService.signMessage(params.message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  /**
   * Sign a transaction
   */
  async signTransaction(params: TransactionParams): Promise<{ signature: string; transactionHash: string }> {
    try {
      return await walletConnectionService.signTransaction(params);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(params: TransactionParams): Promise<{ transactionHash: string }> {
    try {
      return await walletConnectionService.sendTransaction(params);
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Switch to Base network
   */
  async switchToBaseNetwork(): Promise<void> {
    try {
      await walletConnectionService.switchToBaseNetwork();
    } catch (error) {
      console.error('Error switching to Base network:', error);
      throw error;
    }
  }

  /**
   * Add Base network to wallet
   */
  async addBaseNetwork(): Promise<void> {
    try {
      await walletConnectionService.addBaseNetwork();
    } catch (error) {
      console.error('Error adding Base network:', error);
      throw error;
    }
  }

  /**
   * Watch a token asset
   */
  async watchAsset(params: AssetWatchParams): Promise<void> {
    try {
      await walletConnectionService.watchAsset(params);
    } catch (error) {
      console.error('Error watching asset:', error);
      throw error;
    }
  }

  /**
   * Get current chain ID
   */
  getCurrentChainId(): string {
    return walletConnectionService.getCurrentChainId();
  }

  /**
   * Check if connected to Base network
   */
  isConnectedToBase(): boolean {
    const currentChainId = this.getCurrentChainId();
    return currentChainId === '0x2105';
  }

  /**
   * Validate transaction parameters
   */
  validateTransactionParams(params: TransactionParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.fromAddress || !this.isValidAddress(params.fromAddress)) {
      errors.push('Invalid from address');
    }

    if (!params.toAddress || !this.isValidAddress(params.toAddress)) {
      errors.push('Invalid to address');
    }

    if (!params.weiValue || isNaN(Number(params.weiValue)) || Number(params.weiValue) < 0) {
      errors.push('Invalid wei value');
    }

    if (params.chainId && !this.isValidChainId(params.chainId)) {
      errors.push('Invalid chain ID');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate Ethereum address format
   */
  isValidAddress(address: string): boolean {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  /**
   * Validate chain ID format
   */
  isValidChainId(chainId: string): boolean {
    // Check if it's a valid hex string
    const hexRegex = /^0x[a-fA-F0-9]+$/;
    if (!hexRegex.test(chainId)) {
      return false;
    }

    // Check if it's not empty after 0x
    return chainId.length > 2;
  }

  /**
   * Format wei to ETH
   */
  formatWeiToEth(wei: string): string {
    const weiNumber = BigInt(wei);
    const ethNumber = Number(weiNumber) / Math.pow(10, 18);
    return ethNumber.toFixed(6);
  }

  /**
   * Format ETH to wei
   */
  formatEthToWei(eth: string): string {
    const ethNumber = parseFloat(eth);
    const weiNumber = BigInt(Math.floor(ethNumber * Math.pow(10, 18)));
    return weiNumber.toString();
  }

  /**
   * Get network name from chain ID
   */
  getNetworkName(chainId: string): string {
    switch (chainId) {
      case '0x1':
        return 'Ethereum Mainnet';
      case '0x2105':
        return 'Base';
      case '0xa':
        return 'Optimism';
      case '0xa4b1':
        return 'Arbitrum One';
      case '0x89':
        return 'Polygon';
      case '0x38':
        return 'BSC';
      default:
        return `Chain ID: ${chainId}`;
    }
  }

  /**
   * Get network symbol from chain ID
   */
  getNetworkSymbol(chainId: string): string {
    switch (chainId) {
      case '0x1':
        return 'ETH';
      case '0x2105':
        return 'Base';
      case '0xa':
        return 'OP';
      case '0xa4b1':
        return 'ARB';
      case '0x89':
        return 'MATIC';
      case '0x38':
        return 'BNB';
      default:
        return chainId.slice(2, 6);
    }
  }

  /**
   * Get recommended gas settings for Base network
   */
  getRecommendedGasSettings(): {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    gasLimit: string;
  } {
    // These are example values, should be fetched from network in production
    return {
      maxFeePerGas: '0x59682f00', // 1.5 Gwei
      maxPriorityFeePerGas: '0x59682f00', // 1.5 Gwei
      gasLimit: '0x186a0', // 100,000
    };
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(params: Omit<TransactionParams, 'gasLimit'>): Promise<string> {
    // This is a placeholder implementation
    // In production, you would call the network's estimateGas method
    const baseGas = 21000; // Base transaction gas
    const dataGas = params.data && params.data !== '0x' ? params.data.length / 2 * 16 : 0;
    const estimatedGas = baseGas + dataGas;
    
    return `0x${estimatedGas.toString(16)}`;
  }
}

export const walletTransactionService = new WalletTransactionService(); 