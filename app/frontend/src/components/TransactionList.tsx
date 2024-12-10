import React from 'react';
import { motion } from 'framer-motion';
import { Hash, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  txid: string;
  block_height: number;
  status: string;
  created_at: string;
  // Add other fields as needed
}

interface TransactionListProps {
  transactions: Transaction[];
  compact?: boolean;
}

export function TransactionList({ transactions, compact }: TransactionListProps) {
  if (!transactions || transactions.length === 0) {
    console.log(transactions);
    return (
      <div className="text-center py-8 text-gray-400">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div
          key={tx.txid}
          className="bg-arch-black/30 rounded-lg p-4 hover:bg-arch-black/40 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-mono text-sm text-arch-orange">
                {tx.txid.substring(0, 8)}...{tx.txid.substring(tx.txid.length - 8)}
              </div>
              <div className="text-sm text-gray-400">
                Block: {tx.block_height}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                {new Date(tx.created_at).toLocaleString()}
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