import { AddressPurpose, request, MessageSigningProtocols } from 'sats-connect';
import { WalletProvider } from '../types/wallet';
import { convertToTaprootSignature } from '../utils/signatureUtils';

export const checkWalletAvailability = (windowObj: any, identifier: string): boolean => {
  return !!(windowObj && windowObj[identifier]);
};

export const walletProviders: WalletProvider[] = [
  {
    name: 'Xverse',
    icon: '/xverse_wallet.png',
    isAvailable: () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isXverseBrowser = !!(window.XverseProviders?.BitcoinProvider) || !!window.XverseProviders;
      
      if (isMobile && !isXverseBrowser) {
        const currentUrl = encodeURIComponent(window.location.href);
        if (window.confirm('You will be redirected to Xverse wallet to continue. Press OK to proceed.')) {
          window.location.href = `https://connect.xverse.app/browser?url=${currentUrl}`;
          setTimeout(() => {
            window.location.href = `xverse://browser?url=${currentUrl}`;
          }, 1000);
        }
        return false;
      }
      
      return checkWalletAvailability(window, 'XverseProviders');
    },
    connect: async () => {
      await request('wallet_connect', {
        message: 'Connect to Arch Network',
        addresses: [AddressPurpose.Ordinals],
      });

      const response = await window.XverseProviders?.BitcoinProvider.request('getAddresses', {
        purposes: [AddressPurpose.Ordinals],
        message: 'Connect to Arch Network',
        network: {
          type: 'Testnet'
        }
      });

      if (!response?.result?.addresses?.[0]) {
        throw new Error('No addresses returned from wallet');
      }

      const address = response.result.addresses[0].address;
      const publicKey = response.result.addresses[0].publicKey;

      // Store the address in local storage
      localStorage.setItem('xverseAddress', address);

      if (!publicKey) {
        throw new Error('No public key returned from Xverse wallet');
      }

      return {
        address,
        publicKey
      };
    },
    disconnect: async () => {
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      try {

        const signResult = await request('signMessage', {
          message,
          address: localStorage.getItem('xverseAddress') || '',
          protocol: MessageSigningProtocols.BIP322
        });
        console.log('Xverse signResult', signResult);

        if (!signResult?.result?.signature) {
          throw new Error('Failed to get signature from Xverse wallet');
        }

        return signResult.result.signature;
      } catch (error) {
        console.error('Error signing with Xverse:', error);
        throw error;
      }
    }
  },
  {
    name: 'Unisat',
    icon: '/unisat.png',
    isAvailable: () => checkWalletAvailability(window, 'unisat'),
    connect: async () => {
      const accounts = await window.unisat.requestAccounts();
      const publicKey = await window.unisat.getPublicKey();
      return {
        address: accounts[0],
        publicKey: publicKey
      };
    },
    disconnect: async () => {
      return Promise.resolve();
    },
    signMessage: async (message: string) => {
      console.log('Unisat signMessage', message);
      try {
        // Request BIP322 signature from Unisat
        const signature = await window.unisat.signMessage(message, "bip322-simple");
        console.log('Unisat bip322-simple signature', signature);

        return signature;
      } catch (error) {
        console.error('Error signing with Unisat:', error);
        throw error;
      }
    }
  },
  {
    name: 'OKX',
    icon: '/okx.png',
    isAvailable: () => checkWalletAvailability(window, 'okxwallet'),
    connect: async () => {
      try {
        const accounts = await window.okxwallet.bitcoin.connect();
        // Get the public key separately if possible
        let publicKey;
        try {
          publicKey = await window.okxwallet.bitcoin.getPublicKey();
        } catch (error) {
          console.warn('Could not get OKX public key:', error);
          publicKey = accounts[0]; // Fallback to address if public key isn't available
        }

        // Log the connection details for debugging
        console.log('OKX Wallet Connected:', {
          address: accounts[0],
          publicKey: publicKey
        });

        return {
          address: accounts[0],
          publicKey: publicKey
        };
      } catch (error) {
        console.error('Error connecting to OKX wallet:', error);
        throw error;
      }
    },
    disconnect: async () => {
      try {
        // Check if there's a disconnect method available
        if (window.okxwallet.bitcoin.disconnect) {
          await window.okxwallet.bitcoin.disconnect();
        }
        return Promise.resolve();
      } catch (error) {
        console.error('Error disconnecting OKX wallet:', error);
        return Promise.resolve();
      }
    },
    signMessage: async (message: string) => {
      try {
        const signature = await window.okxwallet.bitcoin.signMessage(message, "bip322-simple");
        console.log('OKX signature:', signature);
        return signature;
      } catch (error) {
        console.error('Error signing with OKX:', error);
        throw error;
      }
    }
  },
  {
    name: 'Leather',
    icon: '/leather.png',
    isAvailable: () => {
      return !!(window.btc?.isLeather);
    },
    connect: async () => {
      if (!window.btc && !window.btc?.isLeather) {
        throw new Error('Leather wallet not found');
      }
      
      try {
        const response = await window.btc.request('getAddresses', {
          network: 'testnet'
        });
        console.log('Leather response', response);
        
        // Find the p2tr address from the response
        const p2trAddress = response?.result?.addresses?.find(
          (addr: any) => addr.type === 'p2tr'
        );

        if (!p2trAddress) {
          throw new Error('No P2TR address returned from Leather wallet');
        }

        // Store the address in localStorage
        localStorage.setItem('leatherP2trAddress', p2trAddress.address);

        // Ensure we're getting the correct public key format
        let publicKey = p2trAddress.publicKey;
        if (typeof publicKey === 'string') {
          // Remove '0x' prefix if present
          publicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
          // Convert hex string to byte array if needed
          if (publicKey.match(/^[0-9a-fA-F]+$/)) {
            publicKey = Buffer.from(publicKey, 'hex').toString('hex');
          }
        }

        return {
          address: p2trAddress.address,
          publicKey: publicKey
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

      try {
        // Assume p2trAddress is already available
        const p2trAddress = localStorage.getItem('leatherP2trAddress');
        if (!p2trAddress) {
          throw new Error('No P2TR address found for signing');
        }

        console.log('Leather signMessage', message);
        const response = await window.btc.request('signMessage', {
          message,
          network: 'testnet',
          paymentType: 'p2tr',
          address: p2trAddress
        });

        console.log('Leather response', response);

        if (!response?.result?.signature) {
          throw new Error('Failed to get signature from Leather wallet');
        }

        return response.result.signature;
      } catch (error) {
        console.error('Error signing with Leather:', error);
        throw error;
      }
    }
  }
];
