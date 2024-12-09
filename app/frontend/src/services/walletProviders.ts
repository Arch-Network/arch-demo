import { WalletProvider } from '../types/wallet';

export const checkWalletAvailability = (windowObj: any, identifier: string): boolean => {
  return !!(windowObj && windowObj[identifier]);
};

export const walletProviders: WalletProvider[] = [
  {
    name: 'Xverse',
    icon: '/xverse.png',
    isAvailable: () => checkWalletAvailability(window, 'XverseProviders'),
    connect: async () => {
      const response = await window.XverseProviders?.BitcoinProvider.request('getAddresses', {
        purposes: ['payment'],
        message: 'Connect to Arch Network',
      });
      
      if (!response?.addresses?.[0]?.address) {
        throw new Error('Failed to get address from Xverse wallet');
      }

      return {
        address: response.addresses[0].address,
        publicKey: response.addresses[0].publicKey
      };
    },
    disconnect: async () => {
      // Xverse doesn't have a disconnect method, so we just resolve
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      const response = await window.XverseProviders?.BitcoinProvider.request('signMessage', {
        message,
        address: state.address, // You'll need to store this in state
      });
      return response.signature;
    }
  },
  {
    name: 'Unisat',
    icon: '/unisat.png',
    isAvailable: () => checkWalletAvailability(window, 'unisat'),
    connect: async () => {
      console.log('Unisat object', window.unisat);
      const accounts = await window.unisat.requestAccounts();
      console.log('Unisat accounts', accounts);
      return {
        address: accounts[0],
        publicKey: accounts[0] // Unisat doesn't provide publicKey directly
      };
    },
    disconnect: async () => {
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      return await window.unisat.signMessage(message);
    }
  },
  {
    name: 'OKX',
    icon: '/okx.png',
    isAvailable: () => checkWalletAvailability(window, 'okxwallet'),
    connect: async () => {
      const accounts = await window.okxwallet.bitcoin.connect();
      return {
        address: accounts[0],
        publicKey: accounts[0]
      };
    },
    disconnect: async () => {
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      return await window.okxwallet.bitcoin.signMessage(message);
    }
  },
  {
    name: 'Leather',
    icon: '/leather.png',
    isAvailable: () => {
    
      console.log('Checking Leather availability:', window.btc?.isLeather);
      return !!(window.btc?.isLeather);
    },
    connect: async () => {
      if (!window.btc && !window.btc?.isLeather) {
        throw new Error('Leather wallet not found');
      }
      
      try {
        const response = await window.btc.request('getAddresses');
        console.log('Leather response', response);
        
        // Find the p2tr address from the response
        const p2trAddress = response?.result?.addresses?.find(
          (addr: any) => addr.type === 'p2tr'
        );

        if (!p2trAddress) {
          throw new Error('No P2TR address returned from Leather wallet');
        }

        return {
          address: p2trAddress.address,
          publicKey: p2trAddress.publicKey
        };
      } catch (error) {
        console.error('Leather connect error:', error);
        throw error;
      }
    },
    disconnect: async () => {
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      if (!window.btc) {
        throw new Error('Leather wallet not found');
      }
      return await window.btc.request('signMessage', { message });
    }
  }
];
