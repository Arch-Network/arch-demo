import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './SearchBar';
import BlockList from './BlockList';
import ErrorMessage from './ErrorMessage';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';
import ProgramLeaderboard from './ProgramLeaderboard';
import { Trophy } from 'lucide-react';

const INDEXER_API_URL =  (import.meta as any).env.VITE_INDEXER_API_URL || 'http://localhost:3003/api';
const SYNC_THRESHOLD = 2;
const BLOCKS_PER_PAGE = parseInt((import.meta as any).env.VITE_BLOCKS_PER_PAGE || '20', 10);

interface BlockData {
  height: number;
  hash: string;
  transaction_count: number;
  timestamp: string;
}

interface SyncStatus {
  current_block_height: number;
  latest_block_height: number;
  percentage_complete: string;
  is_synced: boolean;
  estimated_time_to_completion: string;
  elapsed_time: string;
  average_block_time: string;
}

interface NetworkStats {
  total_transactions: number;
  block_height: number;
  slot_height: number;
  tps: number;
  true_tps: number;
}

interface ProgramStats {
  program_id: string;
  transaction_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

const TransactionHistoryPage: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalBlocks, setTotalBlocks] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean>(false);
  const [showOnlyWithTx, setShowOnlyWithTx] = useState<boolean>(false);
  const [programs, setPrograms] = useState<ProgramStats[]>([]);

  const navigate = useNavigate();

  const checkServerStatus = useCallback(async () => {
    try {
      console.log(`Checking server status at ${INDEXER_API_URL.replace(/\/api$/, '/')}`);
      const response = await fetch(INDEXER_API_URL.replace(/\/api$/, '/'));
      if (!response.ok) {
        throw new Error('Server is not responding');
      }
      const data = await response.json();
      if (data.message === 'Arch Indexer API is running') {
        setServerStatus(true);
      }
    } catch (err) {
      console.error('Error checking server status:', err);
      setError('The Arch Indexer API is not running. Please start the server.');
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
  }, [checkServerStatus]);

  const fetchNetworkStats = useCallback(async () => {
    try {
      const response = await fetch(`${INDEXER_API_URL}/network-stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch network stats');
      }
      const data = await response.json();
      setNetworkStats(data);
    } catch (err) {
      console.error('Error fetching network stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchNetworkStats();
    const intervalId = setInterval(fetchNetworkStats, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, [fetchNetworkStats]);

  const fetchSyncStatus = useCallback(async () => {
    try {
      const response = await fetch(`${INDEXER_API_URL}/sync-status`);
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      const data = await response.json();
      setSyncStatus(data);
    } catch (err) {
      console.error('Error fetching sync status:', err);
    }
  }, []);

  useEffect(() => {
    fetchSyncStatus();
    const intervalId = setInterval(fetchSyncStatus, 60000);
    return () => clearInterval(intervalId);
  }, [fetchSyncStatus]);

  const fetchBlocks = useCallback(async (offset: number): Promise<void> => {
    try {
      setLoading(true);
      const filterParam = showOnlyWithTx ? '&filter_no_transactions=true' : '';
      const response = await fetch(`${INDEXER_API_URL}/blocks?offset=${offset}&limit=${BLOCKS_PER_PAGE}${filterParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blocks from indexer');
      }
      const data = await response.json();
      
      // Extract total count and blocks
      const { total_count, blocks } = data;
      
      setBlocks(blocks);
      setTotalBlocks(total_count);
    } catch (err) {
      console.error('Error fetching blocks:', err);
      setError('Failed to fetch blocks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showOnlyWithTx]);

  const handleNextPage = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  useEffect(() => {
    const offset = (currentPage - 1) * BLOCKS_PER_PAGE;
    fetchBlocks(offset);
  }, [currentPage, fetchBlocks]);

  useEffect(() => {
    const syncPercentage = syncStatus ? parseFloat(syncStatus.percentage_complete) : 0;
    console.log(`Sync percentage: ${syncPercentage}`);
    if (syncPercentage >= SYNC_THRESHOLD) {
      fetchBlocks(currentPage);
    }
  }, [syncStatus, currentPage, fetchBlocks]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const handleSearch = async (searchTerm: string) => {
    setLoading(true);
    setError(null);
  
    try {
      const response = await fetch(`${INDEXER_API_URL}/search?term=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const result = await response.json();
  
      if (result.type === 'block') {
        navigate(`/block/${result.data.hash}`);
      } else if (result.type === 'transaction') {
        navigate(`/transaction/${result.data.txid}`);
      } else {
        setError('No block or transaction found with the given ID.');
      }
    } catch (err) {
      console.error('Error during search:', err);
      setError('An error occurred during the search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncPercentage = syncStatus ? parseFloat(syncStatus.percentage_complete) : 0;
  const showBlocks = syncPercentage >= SYNC_THRESHOLD;
  const isFullySynced = syncPercentage >= 98;

  const fetchProgramLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${INDEXER_API_URL}/programs/leaderboard`);
      if (!response.ok) {
        throw new Error('Failed to fetch program leaderboard');
      }
      const data = await response.json();
      setPrograms(data);
    } catch (err) {
      console.error('Error fetching program leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    fetchProgramLeaderboard();
    const intervalId = setInterval(fetchProgramLeaderboard, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, [fetchProgramLeaderboard]);

  if (!serverStatus) {
    return <ErrorMessage message="The Arch Indexer API is not running. Please start the server using 'arch-cli indexer start'." />;
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 p-8 max-w-8xl mx-auto text-arch-white">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Network Stats - Now spans full width on mobile, 1/4 on desktop */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-arch-black p-6 rounded-xl shadow-lg mb-6"
            >
              <h2 className="text-2xl font-semibold mb-6">Network Stats</h2>
              {networkStats ? (
                <>
                  <div className="text-2xl font-bold text-arch-orange mb-4">
                    {networkStats.total_transactions.toLocaleString()}
                    <span className="text-sm text-arch-gray-400 ml-2">Total Transactions</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-arch-gray/20 p-4 rounded-lg">
                      <p className="text-sm text-arch-gray-400">Block Height</p>
                      <p className="text-lg font-semibold">{networkStats.block_height.toLocaleString()}</p>
                    </div>
                    <div className="bg-arch-gray/20 p-4 rounded-lg">
                      <p className="text-sm text-arch-gray-400">Slot Height</p>
                      <p className="text-lg font-semibold">{networkStats.slot_height.toLocaleString()}</p>
                    </div>
                    <div className="bg-arch-gray/20 p-4 rounded-lg">
                      <p className="text-sm text-arch-gray-400">TPS</p>
                      <p className="text-lg font-semibold">{typeof networkStats.tps === 'number' ? networkStats.tps.toFixed(2) : networkStats.tps}</p>
                    </div>
                    <div className="bg-arch-gray/20 p-4 rounded-lg">
                      <p className="text-sm text-arch-gray-400">True TPS</p>
                      <p className="text-lg font-semibold">{typeof networkStats.true_tps === 'number' ? networkStats.true_tps.toFixed(2) : networkStats.true_tps}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p>Loading network stats...</p>
              )}
            </motion.div>

            {/* Program Leaderboard */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-arch-black p-6 rounded-xl shadow-lg"
            >
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Trophy className="text-arch-orange mr-3" size={24} />
                Program Leaderboard
              </h2>
              <ProgramLeaderboard programs={programs} />
            </motion.div>
          </div>

          {/* Main content - Now spans full width on mobile, 3/4 on desktop */}
          <div className="lg:col-span-3">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold mb-6"
            >
              Block <span className="text-arch-orange">Explorer</span>
            </motion.h1>
    
            <AnimatePresence>
              {syncStatus && !isFullySynced && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-arch-gray p-4 rounded-lg mb-6"
                >
                  <h2 className="text-2xl font-semibold mb-4">
                    {showBlocks ? "Almost Synced" : "Syncing Blocks..."}
                  </h2>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
                    <motion.div 
                      className="bg-arch-orange h-2.5 rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: syncStatus.percentage_complete }}
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                  <p>Progress: {syncStatus.percentage_complete}</p>
                  <p>Current Block: {formatNumber(syncStatus.current_block_height)}</p>
                  <p>Latest Block: {formatNumber(syncStatus.latest_block_height)}</p>
                  {!showBlocks && (
                    <>
                      <p>Estimated Time to Completion: {syncStatus.estimated_time_to_completion}</p>
                      <p>Elapsed Time: {syncStatus.elapsed_time}</p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {showBlocks && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <SearchBar onSearch={handleSearch} />
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-arch-orange"></div>
                  </div>
                ) : error ? (
                  <ErrorMessage message={error} />
                ) : (
                  <>
                    <div className="mb-4 flex items-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOnlyWithTx}
                          onChange={(e) => {
                            setShowOnlyWithTx(e.target.checked);
                            setCurrentPage(1); // Reset to first page when toggling filter
                          }}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-arch-gray peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-arch-orange/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-arch-orange"></div>
                        <span className="ml-3 text-sm font-medium text-arch-white">Show only blocks with transactions</span>
                      </label>
                    </div>
                    <BlockList blocks={blocks} />                  
                    <div className="mt-6 flex justify-center items-center space-x-4">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-arch-gray text-arch-white rounded hover:bg-arch-orange disabled:bg-arch-gray disabled:text-gray-500 transition duration-300"
                      >
                        Previous
                      </button>
                      <span className="text-arch-white">
                        Page {currentPage} of {Math.ceil(totalBlocks / BLOCKS_PER_PAGE)}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage * BLOCKS_PER_PAGE >= totalBlocks}
                        className="px-4 py-2 bg-arch-gray text-arch-white rounded hover:bg-arch-orange disabled:bg-arch-gray disabled:text-gray-500 transition duration-300"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TransactionHistoryPage;