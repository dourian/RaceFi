import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { walletConnectionService } from '../services/walletConnectionService';

interface WalletContextType {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: string | null;
  connectWallet: (address: string) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  updateWalletInProfile: (address: string) => Promise<void>;
  signMessage: (message: string) => Promise<{ signature: string; message: string }>;
  signTransaction: (transaction: any) => Promise<{ signature: string; transactionHash: string }>;
  sendTransaction: (transaction: any) => Promise<{ transactionHash: string }>;
  switchToBaseNetwork: () => Promise<void>;
  addBaseNetwork: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);

  useEffect(() => {
    loadWalletFromStorage();
    setupDeepLinkListener();
  }, []);

  const setupDeepLinkListener = () => {
    // Handle deep links when app is already open
    const handleDeepLink = (url: string) => {
      const result = walletConnectionService.handleDeepLinkCallback(url);
      if (result) {
        connectWallet(result.address);
      }
    };

    // Listen for incoming deep links
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  };

  const loadWalletFromStorage = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('wallet_address');
      if (storedAddress) {
        setWalletAddress(storedAddress);
        setIsConnected(true);
        
        // Get current chain ID
        try {
          const currentChainId = walletConnectionService.getCurrentChainId();
          setChainId(currentChainId);
        } catch (error) {
          console.log('Could not get current chain ID:', error);
        }
      }
    } catch (error) {
      console.error('Error loading wallet from storage:', error);
    }
  };

  const connectWallet = async (address: string) => {
    setIsConnecting(true);
    try {
      // Store wallet address locally
      await AsyncStorage.setItem('wallet_address', address);
      
      // Update profile in database
      await updateWalletInProfile(address);
      
      setWalletAddress(address);
      setIsConnected(true);
      
      // Get current chain ID
      try {
        const currentChainId = walletConnectionService.getCurrentChainId();
        setChainId(currentChainId);
      } catch (error) {
        console.log('Could not get current chain ID:', error);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await walletConnectionService.disconnect();
      
      // Remove wallet address from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ wallet_address: null })
          .eq('user_id', user.id);
      }
      
      setWalletAddress(null);
      setIsConnected(false);
      setChainId(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  };

  const updateWalletInProfile = async (address: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: address })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating wallet in profile:', error);
      throw error;
    }
  };

  const signMessage = async (message: string) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await walletConnectionService.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  };

  const signTransaction = async (transaction: any) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await walletConnectionService.signTransaction(transaction);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  };

  const sendTransaction = async (transaction: any) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      return await walletConnectionService.sendTransaction(transaction);
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  };

  const switchToBaseNetwork = async () => {
    try {
      await walletConnectionService.switchToBaseNetwork();
      setChainId('0x2105'); // Base mainnet
    } catch (error) {
      console.error('Error switching to Base network:', error);
      throw error;
    }
  };

  const addBaseNetwork = async () => {
    try {
      await walletConnectionService.addBaseNetwork();
      setChainId('0x2105'); // Base mainnet
    } catch (error) {
      console.error('Error adding Base network:', error);
      throw error;
    }
  };

  const value: WalletContextType = {
    walletAddress,
    isConnected,
    isConnecting,
    chainId,
    connectWallet,
    disconnectWallet,
    updateWalletInProfile,
    signMessage,
    signTransaction,
    sendTransaction,
    switchToBaseNetwork,
    addBaseNetwork,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
