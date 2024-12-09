import React from 'react';
import { motion } from 'framer-motion';
import { Hash, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  txid: string;
  block_height: number;
  data: string;
  status: string;
  bitcoin_txids: string[] | null;
  created_at: string;
}

interface TransactionListProps {
  transactions?: Transaction[];
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions = [] }) => {
  const navigate = useNavigate();

  if (!transactions || transactions.length === 0) {
    return <div className="text-gray-400">No transactions to display</div>;
  }

  return (
    <div className="space-y-4">
      {transactions.map((tx, index) => (
        <motion.div
          key={tx.txid}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-arch-black/50 p-4 rounded-lg hover:bg-arch-gray/20 transition-colors cursor-pointer"
          onClick={() => navigate(`/transaction/${tx.txid}`)}
        >
          <div className="flex items-center space-x-3">
            <Hash className="text-arch-orange" size={16} />
            <span className="font-mono text-sm">{tx.txid.slice(0, 8)}...{tx.txid.slice(-8)}</span>
          </div>
          <div className="text-xs text-arch-gray-400 flex items-center mt-2">
            <Clock className="mr-2" size={12} />
            <span>{new Date(tx.created_at).toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default TransactionList;
