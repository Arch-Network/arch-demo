import React, { useState, useEffect, useCallback } from 'react';
import { RpcConnection, MessageUtil, PubkeyUtil, Instruction, Message } from '@saturnbtcio/arch-sdk';
import { Copy, Check, AlertCircle, Globe, Github, Network } from 'lucide-react';
import { Buffer } from 'buffer';
import { useWallet } from '../hooks/useWallet';
import * as borsh from 'borsh';
import AnimatedBackground from './AnimatedBackground';
import { createTransaction } from '../utils/cryptoHelpers';


// Configure global Buffer for browser environment
window.Buffer = Buffer;

// Environment variables for configuration
const client = new RpcConnection('/api');
const PROGRAM_PUBKEY = (import.meta as any).env.VITE_PROGRAM_PUBKEY;
const WALL_ACCOUNT_PUBKEY = (import.meta as any).env.VITE_WALL_ACCOUNT_PUBKEY;

interface GraffitiMessage {
  timestamp: number;
  name: string;
  message: string;
}

interface GraffitiWallHeader {
  message_count: number;
  max_messages: number;
}

interface WalletOption {
  name: string;
  icon: string;
  isAvailable: () => boolean;
}

const WalletSelector = ({ 
  selectedWallet, 
  onSelect, 
  wallets 
}: { 
  selectedWallet: string;
  onSelect: (wallet: string) => void;
  wallets: WalletOption[];
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      {wallets.map((wallet) => (
        <button
          key={wallet.name}
          onClick={() => onSelect(wallet.name)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
            ${selectedWallet === wallet.name 
              ? 'bg-arch-orange text-arch-black' 
              : 'bg-arch-black/30 hover:bg-arch-black/50 text-arch-white'}
          `}
        >
          <img 
            src={wallet.icon} 
            alt={`${wallet.name} logo`} 
            className="w-5 h-5 object-contain"
          />
          <span className="font-medium">{wallet.name}</span>
          {selectedWallet === wallet.name && (
            <Check className="w-4 h-4" />
          )}
        </button>
      ))}
    </div>
  );
};

const GraffitiWallComponent = () => {

  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // State management
  const wallet = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [isAccountCreated, setIsAccountCreated] = useState(false);
  const [isProgramDeployed, setIsProgramDeployed] = useState(false);
  const [wallData, setWallData] = useState<GraffitiMessage[]>([]);  
  
  // Form state
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectedWallet, setSelectedWallet] = useState<string>('Xverse');

  const addDebugLog = (message: string) => {
    setDebugInfo(prev => [...prev.slice(-4), message]); // Keep last 5 messages
  };

  // Convert account pubkey once
  const accountPubkey = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);

  const schema = {
    struct: {
      messages: {
        seq: {
          struct: {
            timestamp: 'i64',
            name: { array: { type: 'u8', len: 64 } },
            message: { array: { type: 'u8', len: 64 } }
          }
        }
      }
    }
  };

  // Utility Functions
  const copyToClipboard = () => {
    navigator.clipboard.writeText(`arch-cli account create --name <unique_name> --program-id ${PROGRAM_PUBKEY}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if the program is deployed on the network
  const checkProgramDeployed = useCallback(async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(PROGRAM_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsProgramDeployed(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error checking program:', error);
      setError('The Arch Graffiti program has not been deployed to the network yet. Please run `arch-cli deploy`.');
    }
  }, []);

  // Check if the wall account exists
  const checkAccountCreated = useCallback(async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      if (accountInfo) {
        setIsAccountCreated(true);
        setError(null);
      }
    } catch (error) {
      console.error('Error checking account:', error);
      setIsAccountCreated(false);
      setError('The wall account has not been created yet. Please run the account creation command.');
    }
  }, []);

  // Fetch and parse wall messages
  const fetchWallData = useCallback(async () => {
    try {
      const pubkeyBytes = PubkeyUtil.fromHex(WALL_ACCOUNT_PUBKEY);
      const accountInfo = await client.readAccountInfo(pubkeyBytes);
      
      if (!accountInfo || !accountInfo.data) {
        setWallData([]);
        return;
      }

      const data = accountInfo.data;

      // Read header (first 8 bytes)
      const header = {
        message_count: new DataView(data.buffer).getUint32(0, true),
        max_messages: new DataView(data.buffer).getUint32(4, true)
      };

      const messages: GraffitiMessage[] = [];
      const HEADER_SIZE = 8;
      const MESSAGE_SIZE = 8 + 64 + 64; // timestamp + name + message

      // Read messages
      for (let i = 0; i < header.message_count; i++) {
        const offset = HEADER_SIZE + (i * MESSAGE_SIZE);
        
        // Read timestamp (8 bytes)
        const timestamp = Number(new DataView(data.buffer).getBigInt64(offset, true));
        
        // Read name (64 bytes)
        const nameBytes = data.slice(offset + 8, offset + 8 + 64);
        const name = new TextDecoder().decode(nameBytes.filter(x => x !== 0));
        
        // Read message (64 bytes)
        const messageBytes = data.slice(offset + 8 + 64, offset + 8 + 64 + 64);
        const message = new TextDecoder().decode(messageBytes.filter(x => x !== 0));

        messages.push({ timestamp, name, message });
      }

      setWallData(messages);
      setError(null);
    } catch (error) {
      console.error('Error fetching wall data:', error);
      setError('Failed to fetch wall data');
    }
  }, []);

  // Initialize component
  useEffect(() => {
    checkProgramDeployed();
    checkAccountCreated();
  }, [checkAccountCreated, checkProgramDeployed]);

  // Set up polling for wall data
  useEffect(() => {
    if (!isAccountCreated) return;

    fetchWallData();
    const interval = setInterval(fetchWallData, 5000);
    return () => clearInterval(interval);
  }, [isAccountCreated, fetchWallData]);

  // Message handlers
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    const bytes = new TextEncoder().encode(newName);

    if (bytes.length <= 64) {
      setName(newName);
      setIsFormValid(newName.trim() !== '' && message.trim() !== '');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newMessage = e.target.value;
    const bytes = new TextEncoder().encode(newMessage);

    if (bytes.length <= 64) {
      setMessage(newMessage);
      setIsFormValid(name.trim() !== '' && newMessage.trim() !== '');
    }
  };

  const handleAddToWall = async () => {
    if (!message.trim() || !name.trim() || !isAccountCreated || !wallet.isConnected) {
      setError("Name and message are required, account must be created, and wallet must be connected.");
      return;
    }

    try {
      const data = serializeGraffitiData(name, message);

      if (!wallet.publicKey) {
        throw new Error('No public key available from wallet');
      }

      // Handle Unisat public key format differently
      let pubkeyBytes: Uint8Array;
      if (wallet.provider === 'Unisat' || wallet.provider === 'Leather' || wallet.provider === 'OKX') {
        // Remove the network prefix (first byte) from Unisat's public key
        const rawPubkey = hexToUint8Array(wallet.publicKey);
        pubkeyBytes = rawPubkey.slice(1); // Remove the first byte (network prefix)
      } else {
        pubkeyBytes = PubkeyUtil.fromHex(wallet.publicKey);
      }

      console.log(`Wallet provider: ${wallet.provider}`);
      console.log(`Raw public key: ${wallet.publicKey}`);
      console.log(`Processed pubkey bytes: ${pubkeyBytes}`);

      const instruction: Instruction = {
        program_id: PubkeyUtil.fromHex(PROGRAM_PUBKEY),
        accounts: [
          { 
            pubkey: pubkeyBytes,
            is_signer: true, 
            is_writable: false 
          },
          { 
            pubkey: accountPubkey, 
            is_signer: false, 
            is_writable: true 
          },
        ],
        data: new Uint8Array(data),
      };

      const messageObj: Message = {
        signers: [pubkeyBytes],
        instructions: [instruction],
      };

      console.log(`Pubkey: ${pubkeyBytes}`);
      const messageHash = MessageUtil.hash(messageObj);
      console.log(`Message hash: ${messageHash.toString()}`);

      const signature = await wallet.signMessage(Buffer.from(messageHash).toString('hex'));
      console.log(`Raw signature: ${signature}`);

      // Convert the signature to bytes
      const signatureBytes = new Uint8Array(Buffer.from(signature, 'base64'));

      // If not Unisat, slice off the first two bytes
      const processedSignatureBytes = signatureBytes.slice(2);

      console.log(`Processed signature bytes: ${processedSignatureBytes}`);
      console.log(`Transaction: ${JSON.stringify(messageObj)}`);

      const result = await client.sendTransaction({
        version: 0,
        signatures: [processedSignatureBytes],
        message: messageObj,
      });

      if (result) {
        await fetchWallData();
        setMessage('');
        setName('');
      }
    } catch (error) {
      console.error('Error adding to wall:', error);
      setError(`Failed to add to wall: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const serializeGraffitiData = (name: string, message: string): number[] => {
    // Create fixed-size arrays
    const nameArray = new Uint8Array(64).fill(0);
    const messageArray = new Uint8Array(64).fill(0);
    
    // Convert strings to bytes
    const nameBytes = new TextEncoder().encode(name);
    const messageBytes = new TextEncoder().encode(message);
    
    // Copy bytes into fixed-size arrays (will truncate if too long)
    nameArray.set(nameBytes.slice(0, 64));
    messageArray.set(messageBytes.slice(0, 64));
    
    // Create the params object matching the Rust struct
    const params = {
        name: Array.from(nameArray),
        message: Array.from(messageArray)
    };
    
    // Define the schema for borsh serialization
    const schema = {
        struct: {
            name: { array: { type: 'u8', len: 64 } },
            message: { array: { type: 'u8', len: 64 } }
        }
    };
    
    return Array.from(borsh.serialize(schema, params));
};

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isFormValid) {
        handleAddToWall();
      }
    }
  };

  // Submit new message
  const submitMessage = async (name: string, message: string) => {
    try {
      if (!wallet.isConnected) {
        setError('Please connect your wallet first');
        return;
      }

      // Prepare the instruction data
      const nameBytes = new TextEncoder().encode(name.padEnd(64, '\0'));
      const messageBytes = new TextEncoder().encode(message.padEnd(64, '\0'));
      
      // Combine into a single buffer
      const instructionData = new Uint8Array([
        ...nameBytes,
        ...messageBytes
      ]);

      // Create and send transaction
      const transaction = await createTransaction(
        PROGRAM_PUBKEY,
        WALL_ACCOUNT_PUBKEY,
        true,
        true,
        Buffer.from(instructionData).toString('hex'),
        wallet.privateKey!
      );

      await client.sendTransaction(transaction);
      
      // Refresh the wall data
      await fetchWallData();
      
      setError(null);
    } catch (error) {
      console.error('Error submitting message:', error);
      setError('Failed to submit message');
    }
  };

  const hexToUint8Array = (hex: string): Uint8Array => {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    const numbers = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      numbers[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return numbers;
  };

  return (
    <>
    <AnimatedBackground />
    <div className="min-h-screen relative">      
    
      <div className="bg-gradient-to-br from-arch-gray/90 to-gray-900/90 backdrop-blur-sm p-8 rounded-lg shadow-lg max-w-4xl mx-auto relative z-10">
        <h2 className="text-3xl font-bold mb-6 text-center text-arch-white">Graffiti Wall</h2>

        <div className="mb-4 p-4 bg-arch-black rounded-lg hidden">
        <h4 className="text-arch-orange font-bold mb-2">Debug Info:</h4>
        <div className="text-arch-white text-sm font-mono">
          <p>Wallet Connected: {String(wallet.isConnected)}</p>
          <p>Public Key: {wallet.publicKey || 'none'}</p>
          <p>Address: {wallet.address || 'none'}</p>
          {debugInfo.map((log, i) => (
            <p key={i} className="text-xs">{log}</p>
          ))}
        </div>

      </div>

      {!wallet.isConnected ? (
        <div className="space-y-4 mb-4">
          <div className="bg-arch-black/30 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-lg font-medium text-arch-white mb-3">
              Select Wallet
            </h3>
            <WalletSelector
              selectedWallet={selectedWallet}
              onSelect={setSelectedWallet}
              wallets={wallet.availableWallets}
            />
            
            <button
              onClick={async () => {
                try {
                  addDebugLog(`Attempting connection with ${selectedWallet}...`);
                  await wallet.connect(selectedWallet);
                  addDebugLog('Wallet connected successfully');
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  addDebugLog(`Connection error: ${errorMessage}`);
                  setError(`Failed to connect: ${errorMessage}`);
                }
              }}
              className="w-full mt-4 bg-arch-orange text-arch-black font-medium py-2 px-4 rounded-lg hover:bg-arch-orange/90 transition-colors duration-200"
            >
              Connect {selectedWallet}
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-4 bg-arch-black/30 p-3 rounded-lg">
          <div className="flex-grow">
            <p className="text-sm text-arch-gray-400">Connected to {wallet.provider}</p>
            <p className="font-mono text-xs text-arch-white truncate">
              {wallet.address || wallet.publicKey}
            </p>
          </div>
          <button
            onClick={wallet.disconnect}
            className="px-3 py-1.5 bg-arch-black/50 text-arch-white text-sm font-medium rounded-lg hover:bg-arch-black/70 transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      )}
      

      {!isAccountCreated ? (
        <div className="bg-arch-black p-6 rounded-lg">
          <h3 className="text-2xl font-bold mb-4 text-arch-white">Account Setup Required</h3>
          <p className="text-arch-white mb-4">To participate in the Graffiti Wall, please create an account using the Arch CLI:</p>
          <div className="relative mb-4">
            <pre className="bg-gray-800 p-4 rounded-lg text-arch-white overflow-x-auto">
              <code>
                arch-cli account create --name &lt;unique_name&gt; --program-id {PROGRAM_PUBKEY}
              </code>
            </pre>
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 p-2 bg-arch-orange text-arch-black rounded hover:bg-arch-white transition-colors duration-300"
              title="Copy to clipboard"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-arch-white mb-4">Run this command in your terminal to set up your account.</p>
          
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="bg-arch-black p-6 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-arch-white">Add to Wall</h3>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Your Name (required, max 64 bytes)"
                className="w-full px-3 py-2 bg-arch-gray text-arch-white rounded-md focus:outline-none focus:ring-2 focus:ring-arch-orange mb-2"
                required
              />
              <textarea
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Your Message (required, max 64 bytes)"
                className="w-full px-3 py-2 bg-arch-gray text-arch-white rounded-md focus:outline-none focus:ring-2 focus:ring-arch-orange mb-2"
                required
              />
              <button 
                onClick={handleAddToWall}
                className={`w-full font-bold py-2 px-4 rounded-lg transition duration-300 ${
                  isFormValid 
                    ? 'bg-arch-orange text-arch-black hover:bg-arch-white hover:text-arch-orange' 
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
                disabled={!isFormValid}
              >
                Add to the Wall
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="bg-arch-black p-6 rounded-lg">
              <h3 className="text-2xl font-bold mb-4 text-arch-white">Wall Messages</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {[...wallData].reverse().map((item, index) => (
                  <div key={index} className="bg-arch-gray p-3 rounded-lg">
                    <p className="font-bold text-arch-orange">{new Date(item.timestamp * 1000).toLocaleString()}</p>
                    <p className="text-arch-white"><span className="font-semibold">{item.name}:</span> {item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-arch-gray">
        <div className="flex justify-center space-x-8 text-sm text-arch-white">
          <span className="flex items-center">
            © <a 
              href="https://www.arch.network/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-arch-orange transition duration-300 mx-1 font-bold"
            >
              Arch Network
            </a> 2024 | All rights reserved
          </span>
          <a 
            href="https://github.com/Arch-Network" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center hover:text-arch-orange transition duration-300"
          >
            <Github className="w-4 h-4 mr-2" />
            Developers
          </a>
        </div>
      </div>
    </div>
  </div>
  </>
  );
};

export default GraffitiWallComponent;