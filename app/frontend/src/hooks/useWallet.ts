import { useState, useCallback } from 'react';
import { walletProviders } from '../services/walletProviders';
import { ConnectedWallet } from '../types/wallet';

export function useWallet() {
  const [state, setState] = useState<ConnectedWallet>(() => {
    const savedState = localStorage.getItem('walletState');
    return savedState ? JSON.parse(savedState) : {
      provider: null,
      isConnected: false,
      publicKey: null,
      address: null,
    };
  });

  const connect = useCallback(async (providerName: string) => {
    const provider = walletProviders.find(p => p.name === providerName);
    if (!provider) throw new Error('Wallet provider not found');
    
    if (!provider.isAvailable()) {
      throw new Error(`${providerName} wallet is not installed`);
    }

    try {
      const result = await provider.connect();
      const newState = {
        provider: providerName,
        isConnected: true,
        address: result.address,
        publicKey: result.publicKey,
      };
      
      setState(newState);
      localStorage.setItem('walletState', JSON.stringify(newState));
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = walletProviders.find(p => p.name === state.provider);
    if (provider) {
      await provider.disconnect();
    }
    
    setState({
      provider: null,
      isConnected: false,
      publicKey: null,
      address: null,
    });
    localStorage.removeItem('walletState');
  }, [state.provider]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!state.isConnected) throw new Error('Wallet not connected');
    
    const provider = walletProviders.find(p => p.name === state.provider);
    if (!provider) throw new Error('Wallet provider not found');

    try {
      return await provider.signMessage(message);
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }, [state.isConnected, state.provider]);

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
    availableWallets: walletProviders.filter(p => p.isAvailable()),
  };
}