import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Hash, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Transaction {
  txid: string;
  block_height: number;
  data: string;
  status: string;
  bitcoin_txids: string[] | null;
  created_at: string;
}

interface TransactionResponse {
  total_count: number;
  transactions: Transaction[];
}

const INDEXER_API_URL = import.meta.env.VITE_INDEXER_API_URL || 'http://localhost:3003/api';
const TRANSACTIONS_PER_PAGE = 20;

// Define a type for the status
type TransactionStatus = {
  Failed?: boolean;
  reason?: string;
};

const ProgramTransactionsPage: React.FC = () => {
  const { programId } = useParams<{ programId: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
      const response = await fetch(
        `${INDEXER_API_URL}/programs/${programId}/transactions?limit=${TRANSACTIONS_PER_PAGE}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data: TransactionResponse = await response.json();
      setTransactions(data.transactions);
      setTotalCount(data.total_count);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [programId, currentPage]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (expandedTx) {
      fetchTransactionDetails(expandedTx);
    }
  }, [expandedTx]);

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const toggleTxExpansion = (txId: string) => {
    setExpandedTx(expandedTx === txId ? null : txId);
  };

  const fetchTransactionDetails = async (txId: string) => {
    try {
      const response = await fetch(`${INDEXER_API_URL}/transactions/${txId}`);
      if (!response.ok) throw new Error('Failed to fetch transaction details');
      const data = await response.json();
      setTransactionDetails(data);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
    }
  };

  const getStatusDisplay = (status: TransactionStatus | string): string => {
    if (typeof status === 'string') {
      return status;
    }
    return status.Failed ? 'Failed' : 'Processed';
  };

  const getStatusClass = (status: TransactionStatus | string): string => {
    let isFailed = false;
    
    if (typeof status === 'string') {
      try {
        // Try to parse the status if it's a JSON string
        const parsedStatus = JSON.parse(status);
        isFailed = !!parsedStatus.Failed;
      } catch {
        // If parsing fails, check the string directly
        isFailed = status.toLowerCase() === 'failed';
      }
    } else {
      isFailed = !!status.Failed;
    }
    
    return isFailed ? 'bg-red-500' : 'bg-green-500';
  };

  const renderTransactionRow = (tx: Transaction) => (
    <motion.div
      key={tx.txid}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-arch-black p-4 rounded-lg hover:bg-arch-gray/10 transition-colors duration-300"
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        {/* Status indicator */}
        <div className="col-span-1">
          <div className={`w-2 h-2 rounded-full ${getStatusClass(tx.status)}`} />
        </div>

        {/* Transaction ID */}
        <div className="col-span-5 font-mono text-sm truncate">
          <Link 
            to={`/transaction/${tx.txid}`}
            className="hover:text-arch-orange transition-colors duration-300"
          >
            {tx.txid}
          </Link>
        </div>

        {/* Block Height */}
        <div className="col-span-2 text-sm">
          <Link 
            to={`/block/${tx.block_height}`}
            className="hover:text-arch-orange transition-colors duration-300"
          >
            {tx.block_height}
          </Link>
        </div>

        {/* Timestamp */}
        <div className="col-span-3 text-sm text-arch-gray-400">
          {new Date(tx.created_at).toLocaleString()}
        </div>

        {/* Expand button */}
        <div className="col-span-1 text-right">
          <button
            onClick={() => toggleTxExpansion(tx.txid)}
            className="text-arch-orange hover:text-arch-orange/80 transition-colors duration-300"
          >
            {expandedTx === tx.txid ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expandedTx === tx.txid && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pl-6 border-l-2 border-arch-gray"
        >
          <p className="mb-2">
            <span className="text-arch-orange">Block Height:</span>{' '}
            <Link 
              to={`/block/${tx.block_height}`}
              className="hover:text-arch-orange transition-colors duration-300"
            >
              {tx.block_height}
            </Link>
          </p>
          <p className="mb-2">
            <span className="text-arch-orange">Status:</span> {getStatusDisplay(tx.status)}
          </p>
          {tx.bitcoin_txids && tx.bitcoin_txids.length > 0 && (
            <div>
              <span className="text-arch-orange">Bitcoin TxIDs:</span>
              <ul className="list-disc list-inside mt-2">
                {tx.bitcoin_txids.map((btcTxid) => (
                  <li key={btcTxid}>
                    <a
                      href={`https://mempool.space/testnet4/tx/${btcTxid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-arch-orange hover:underline"
                    >
                      {btcTxid}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="bg-arch-black p-6 rounded-lg mb-6">
        <h1 className="text-2xl font-bold mb-4">Program Details</h1>
        <div className="font-mono break-all text-arch-orange">{programId}</div>
      </div>

      {/* Transaction list header */}
      <div className="grid grid-cols-12 gap-4 px-4 mb-4 text-arch-gray-400 text-sm">
        <div className="col-span-1">Status</div>
        <div className="col-span-5">Transaction</div>
        <div className="col-span-2">Block</div>
        <div className="col-span-3">Time</div>
        <div className="col-span-1"></div>
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {transactions.map(renderTransactionRow)}
      </div>

      {/* Pagination controls */}
      <div className="mt-6 flex justify-center items-center space-x-4">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-arch-gray text-arch-white rounded hover:bg-arch-orange disabled:bg-arch-gray disabled:text-gray-500 transition duration-300"
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {Math.ceil(totalCount / TRANSACTIONS_PER_PAGE)}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage * TRANSACTIONS_PER_PAGE >= totalCount}
          className="px-4 py-2 bg-arch-gray text-arch-white rounded hover:bg-arch-orange disabled:bg-arch-gray disabled:text-gray-500 transition duration-300"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ProgramTransactionsPage; 