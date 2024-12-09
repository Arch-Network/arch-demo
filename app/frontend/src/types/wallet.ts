export interface WalletProvider {
  name: string;
  icon: string;
  isAvailable: () => boolean;
  connect: () => Promise<{ address: string; publicKey?: string }>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}

export interface ConnectedWallet {
  provider: string;
  address: string | null;
  publicKey: string | null;
  isConnected: boolean;
}

export interface XverseProviders {
  BitcoinProvider: {
    request(method: string, params: any): Promise<any>;
  }
}