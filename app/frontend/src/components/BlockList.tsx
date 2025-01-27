import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash, Layers, Clock, User, FileText } from 'lucide-react';
import { formatTimestamp } from '../utils/dateUtils';
interface BlockData {
  height: number;
  hash: string;
  timestamp: string;
  transaction_count: number;
}

interface BlockListProps {
  blocks: BlockData[];
  compact?: boolean;
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};


const BlockList: React.FC<BlockListProps> = ({ blocks }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-arch-white">
        <thead className="text-xs uppercase bg-arch-gray">
          <tr>
            <th className="px-6 py-3">Block Hash</th>
            <th className="px-6 py-3">Slot</th>
            <th className="px-6 py-3">Time</th>
            <th className="px-6 py-3">Leader</th>
            <th className="px-6 py-3">Tx Count</th>
            <th className="px-6 py-3">Reward</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.hash} className="bg-arch-black border-b border-arch-gray hover:bg-arch-gray/20">
              <td className="px-6 py-4">
                <Link to={`/block/${block.hash}`} className="text-arch-orange hover:underline flex items-center">
                  <Hash size={16} className="mr-2" />
                  {block.hash.substring(0, 8)}...
                </Link>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <Layers size={16} className="mr-2 text-arch-orange" />
                  {formatNumber(block.height)}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <Clock size={16} className="mr-2 text-arch-orange" />
                  {formatTimestamp(block.timestamp)}              
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <User size={16} className="mr-2 text-arch-orange" />
                  Arch Node
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <FileText size={16} className="mr-2 text-arch-orange" />
                  {block.transaction_count ?? 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4">0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlockList;