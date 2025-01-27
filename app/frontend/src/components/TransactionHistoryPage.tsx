import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from './SearchBar';
import BlockList from './BlockList';
import ErrorMessage from './ErrorMessage';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from './AnimatedBackground';
import ProgramLeaderboard from './ProgramLeaderboard';
import { Trophy, Activity, Box, ArrowRightLeft, Code } from 'lucide-react';
import { Button } from './ui/button';
import { ReactNode } from 'react';
import TransactionList from './TransactionList';

const INDEXER_API_URL =  (import.meta as any).env.VITE_INDEXER_API_URL || 'http://localhost:3003/api';
const SYNC_THRESHOLD = 2;
const BLOCKS_PER_PAGE = parseInt((import.meta as any).env.VITE_BLOCKS_PER_PAGE || '20', 10);

interface BlockData {
  height: number;
  hash: string;
  transaction_count: number;
  timestamp: string;
}

interface Transaction {
  txid: string;
  block_height: number;
  status: string;
  created_at: string;
  data: any;
  bitcoin_txids: string[] | null;
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
  current_tps: number;
  average_tps: number;
  peak_tps: number;
  daily_transactions: number;
}

interface ProgramStats {
  program_id: string;
  transaction_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  trend?: string;
  highlight?: boolean;
  secondaryValue?: string;
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
      // Add logging for debugging
      console.log('Searching for:', searchTerm);

      const response = await fetch(`${INDEXER_API_URL}/search?term=${encodeURIComponent(searchTerm)}`);
      console.log('Search response status:', response.status);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Search result:', result);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.type || !result.data) {
        setError('Invalid search result format');
        return;
      }

      switch (result.type) {
        case 'block':
          if (result.data.hash) {
            navigate(`/block/${result.data.hash}`);
          } else if (result.data.height) {
            navigate(`/block/${result.data.height}`);
          } else {
            setError('Invalid block data received');
          }
          break;

        case 'transaction':
          if (result.data.txid) {
            navigate(`/transaction/${result.data.txid}`);
          } else {
            setError('Invalid transaction data received');
          }
          break;

        default:
          setError(`Unknown result type: ${result.type}`);
      }
    } catch (err) {
      console.error('Error during search:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during the search');
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

  const fetchLatestTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${INDEXER_API_URL}/transactions?limit=5`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest transactions');
      }
      const data = await response.json();
      setLatestTransactions(data.slice(0, 5));
    } catch (err) {
      console.error('Error fetching latest transactions:', err);
    }
  }, []);

  useEffect(() => {
    fetchLatestTransactions();
    const intervalId = setInterval(fetchLatestTransactions, 60000); // Update every minute
    return () => clearInterval(intervalId);
  }, [fetchLatestTransactions]);

  const networkLoadStatus = (networkStats?.current_tps ?? 0) > (networkStats?.average_tps ?? 0) * 1.5
    ? 'High' 
    : (networkStats?.current_tps ?? 0) > (networkStats?.average_tps ?? 0)
      ? 'Medium' 
      : 'Low';

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
              value={networkStats?.current_tps?.toFixed(2) || "0"}
              subtitle="Current TPS"
              icon={<Activity className="text-green-400" />}
              secondaryValue={`Peak: ${networkStats?.peak_tps?.toFixed(2) || "0"}`}
              highlight
            />
            <MetricCard
              title="Latest Block"
              value={formatNumber(networkStats?.block_height || 0)}
              subtitle="Height"
              icon={<Box className="text-arch-orange" />}
            />
            <MetricCard
              title="24h Transactions"
              value={formatNumber(networkStats?.daily_transactions || 0)}
              subtitle="Volume"
              icon={<ArrowRightLeft className="text-blue-400" />}
              secondaryValue={`Avg TPS: ${networkStats?.average_tps?.toFixed(2) || "0"}`}
            />
            <MetricCard
              title="Total Transactions"
              value={formatNumber(networkStats?.total_transactions || 0)}
              subtitle="All Time"
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
              {/* <div className="mt-4 text-center">
                <Button variant="outline">View All Transactions</Button>
              </div> */}
            </div>

            {/* Recent Blocks Panel */}
            <div className="bg-arch-black/50 rounded-xl p-6">
              <h2 className="text-2xl font-semibold mb-6">Recent Blocks</h2>
              <BlockList blocks={blocks} compact />
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
                  value="v0.2.17"
                  status="success"
                />
                <HealthMetric
                  label="Network Load"
                  value={networkLoadStatus}
                  status={networkLoadStatus === 'High' ? 'error' : 'warning'}
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
  secondaryValue?: string;
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

export default TransactionHistoryPage;