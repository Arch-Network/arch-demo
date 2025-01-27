import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Hash, Clock, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatGMTTimestamp } from '../utils/dateUtils';

interface Transaction {
  txid: string;
  block_height: number;
  status: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  compact?: boolean;
}

export function TransactionList({ transactions, compact }: TransactionListProps) {
  const navigate = useNavigate();
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No transactions found
      </div>
    );
  }

  const handleCopy = async (txid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(txid);
    setCopiedTxId(txid);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleTxClick = (txid: string) => {
    navigate(`/transaction/${txid}`);
  };

  const truncateTxId = (txid: string) => {
    if (compact) {
      return `${txid.substring(0, 12)}...${txid.substring(txid.length - 12)}`;
    }
    return txid;
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div
          key={tx.txid}
          onClick={() => handleTxClick(tx.txid)}
          className="bg-arch-black/30 rounded-lg p-4 hover:bg-arch-black/40 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <div className="font-mono text-sm text-arch-orange group relative">
                <span className="break-all">
                  {truncateTxId(tx.txid)}
                </span>
                <button
                  onClick={(e) => handleCopy(tx.txid, e)}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy full transaction ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {copiedTxId === tx.txid && (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-arch-black px-2 py-1 rounded text-xs">
                    Copied!
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-400">
                Block: {tx.block_height}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                {formatGMTTimestamp(tx.created_at)}
              </div>
              <div className={`text-sm ${tx.status.includes("Failed") ? "text-red-400" : "text-green-400"}`}>
                {tx.status.replace(/['"]/g, '')}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TransactionList;