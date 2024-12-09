import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './SearchBar';
import BlockList from './BlockList';
import ErrorMessage from './ErrorMessage';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';
import ProgramLeaderboard from './ProgramLeaderboard';
import { Trophy, Activity, Box, ArrowRightLeft, Code } from 'lucide-react';
import { ReactNode } from 'react';

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

interface Transaction {
  txid: string;
  timestamp: string;
  // Add other transaction properties you need
}

interface Block {
  hash: string;
  height: number;
  timestamp: string;
  // Add other block properties you need
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
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([]);
  const [recentBlocks, setRecentBlocks] = useState<Block[]>([]);

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

  const fetchLatestData = useCallback(async () => {
    try {
      const txResponse = await fetch(`${INDEXER_API_URL}/transactions/latest`);
      const blockResponse = await fetch(`${INDEXER_API_URL}/blocks/latest`);
      
      if (txResponse.ok && blockResponse.ok) {
        const txData = await txResponse.json();
        const blockData = await blockResponse.json();
        
        setLatestTransactions(txData);
        setRecentBlocks(blockData);
      }
    } catch (err) {
      console.error('Error fetching latest data:', err);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();
    const intervalId = setInterval(fetchLatestData, 10000); // Update every 10 seconds
    return () => clearInterval(intervalId);
  }, [fetchLatestData]);

  if (!serverStatus) {
    return <ErrorMessage message="The Arch Indexer API is not running. Please start the server using 'arch-cli indexer start'." />;
  }

  return (
    <>
      <AnimatedBackground />
      <div className="relative z-10 p-8 max-w-8xl mx-auto text-arch-white">
        {/* Hero Section with Key Metrics */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-6">
            Arch Network <span className="text-arch-orange">Explorer</span>
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Network Status"
              value={networkStats?.true_tps || "0"}
              subtitle="Current TPS"
              icon={<Activity className="text-green-400" />}
              trend="+5.2%"
              highlight
            />
            <MetricCard
              title="Latest Block"
              value={formatNumber(networkStats?.block_height || 0)}
              subtitle="Height"
              icon={<Box className="text-arch-orange" />}
            />
            <MetricCard
              title="Transactions"
              value={formatNumber(networkStats?.total_transactions || 0)}
              subtitle="24h Volume"
              icon={<ArrowRightLeft className="text-blue-400" />}
            />
            <MetricCard
              title="Active Programs"
              value={programs?.length || "0"}
              subtitle="Last 24h"
              icon={<Code className="text-purple-400" />}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Latest Transactions Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-arch-black/50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Latest Transactions</h2>
                <SearchBar onSearch={handleSearch} />
              </div>
              <TransactionList 
                transactions={latestTransactions} 
                compact 
              />
              <div className="mt-4 text-center">
                <Button variant="outline">View All Transactions</Button>
              </div>
            </div>

            {/* Recent Blocks Panel */}
            <div className="bg-arch-black/50 rounded-xl p-6">
              <h2 className="text-2xl font-semibold mb-6">Recent Blocks</h2>
              <BlockList blocks={recentBlocks} compact />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Top Programs */}
            <div className="bg-arch-black/50 rounded-xl p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Trophy className="text-arch-orange mr-3" size={24} />
                Top Programs
              </h2>
              <ProgramLeaderboard programs={programs} limit={5} />
              <div className="mt-4 text-center">
                <Button variant="ghost">View All Programs</Button>
              </div>
            </div>

            {/* Network Health */}
            <div className="bg-arch-black/50 rounded-xl p-6">
              <h2 className="text-2xl font-semibold mb-6">Network Health</h2>
              <div className="space-y-4">
                <HealthMetric
                  label="Sync Status"
                  value={syncStatus?.percentage_complete || "100%"}
                  status="success"
                />
                <HealthMetric
                  label="Node Version"
                  value="v1.2.3"
                  status="success"
                />
                <HealthMetric
                  label="Network Load"
                  value="Medium"
                  status="warning"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  trend?: string;
  highlight?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight
}) => (
  <div className={`
    p-6 rounded-xl 
    ${highlight ? 'bg-gradient-to-br from-arch-orange/20 to-arch-black/50' : 'bg-arch-black/50'}
  `}>
    <div className="flex justify-between items-start mb-4">
      <span className="text-sm text-arch-gray-400">{title}</span>
      {icon}
    </div>
    <div className="flex items-baseline">
      <span className="text-2xl font-bold">{value}</span>
      {trend && (
        <span className="ml-2 text-sm text-green-400">{trend}</span>
      )}
    </div>
    <span className="text-sm text-arch-gray-400">{subtitle}</span>
  </div>
);

interface HealthMetricProps {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'error';
}

const HealthMetric: React.FC<HealthMetricProps> = ({
  label,
  value,
  status
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-arch-gray-400">{label}</span>
    <div className="flex items-center">
      <span className="mr-2">{value}</span>
      <div className={`
        w-2 h-2 rounded-full
        ${status === 'success' ? 'bg-green-400' : 
          status === 'warning' ? 'bg-yellow-400' : 
          'bg-red-400'}
      `} />
    </div>
  </div>
);

const TransactionList: React.FC<{ transactions: Transaction[]; compact?: boolean }> = ({ 
  transactions, 
  compact 
}) => (
  <div className="space-y-2">
    {transactions?.map(tx => (
      <div key={tx.txid} className="p-4 bg-arch-black/30 rounded-lg">
        {tx.txid}
      </div>
    ))}
  </div>
);

const BlockList: React.FC<{ blocks: Block[]; compact?: boolean }> = ({ 
  blocks, 
  compact 
}) => (
  <div className="space-y-2">
    {blocks?.map(block => (
      <div key={block.hash} className="p-4 bg-arch-black/30 rounded-lg">
        Block {block.height}
      </div>
    ))}
  </div>
);

export default TransactionHistoryPage;