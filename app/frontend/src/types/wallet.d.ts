// UniSat Wallet
declare interface UniSat {
  requestAccounts(): Promise<string[]>;
  getAccounts(): Promise<string[]>;
  // Add other methods as needed
}

// OKX Wallet
declare interface OKXWallet {
  bitcoin?: {
    connect(): Promise<string[]>;
    getAccounts(): Promise<string[]>;
    // Add other methods as needed
  };
}

// Leather Wallet
declare interface Leather {
  enable(): Promise<void>;
  getAddresses(): Promise<string[]>;
  request(params: { method: string; params: any }): Promise<any>;
}

declare interface LeatherProvider {
  enable(): Promise<void>;
  getAddresses(): Promise<string[]>;
}

// Xverse Providers
declare interface XverseProviders {
  BitcoinProvider: {
    request(method: string, params: any): Promise<any>;
  }
}

declare interface BtcProvider {
  isleather: boolean;
  request(method: string, params?: any): Promise<any>;
}

declare global {
  interface Window {
    XverseProviders?: XverseProviders;
    unisat?: UniSat;
    okxwallet?: OKXWallet;
    leather?: Leather;
    LeatherProvider?: LeatherProvider;
    btc?: BtcProvider;
  }
}
