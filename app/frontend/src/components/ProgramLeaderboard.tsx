import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Clock, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProgramStats {
  program_id: string;
  transaction_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

interface ProgramLeaderboardProps {
  programs: ProgramStats[];
  limit?: number;
}

// Add this mapping at the top of the file, outside the component
const PROGRAM_NAME_MAPPING: { [key: string]: string } = {
  // "836f0e206b4f8e9c84991d4182f19f30e1434858a8898efca26a304f94e28906": "FunkyBit",
  // "939333d5df6e9061815e41f8804f42d3f7059cee4841b6ea7277a53dbb6cda33": "Graffiti Wall",
  "0000000000000000000000000000000000000000000000000000000000000001": "System Program",
  // "10b1ec050c359a3ee7a47f648d1888638ce01389c79c15d53bc880482b4349ff": "Saturn DEX"
};

const ProgramLeaderboard: React.FC<ProgramLeaderboardProps> = ({ programs }) => {
  const navigate = useNavigate();

  // Function to truncate program ID
  const truncateProgramId = (id: string) => {
    if (id.length <= 12) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Handle click to copy full program ID
  const handleProgramIdClick = (programId: string) => {
    navigator.clipboard.writeText(programId);
  };

  // Add this helper function
  const getProjectName = (programId: string): string | null => {
    return PROGRAM_NAME_MAPPING[programId] || null;
  };

  return (
    <div className="space-y-6">
      {programs.map((program, index) => (
        <motion.div
          key={program.program_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-arch-black/50 p-6 rounded-xl hover:bg-arch-gray/20 transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-arch-orange/10 p-2 rounded-lg">
                <Trophy className="text-arch-orange" size={20} />
              </div>
              <span className="text-xl font-bold text-arch-orange">#{index + 1}</span>
            </div>
            <div className="bg-arch-orange/10 px-4 py-2 rounded-lg">
              <span className="text-arch-orange font-semibold">
                {program.transaction_count.toLocaleString()} txs
              </span>
            </div>
          </div>
          
          <div 
            className="group cursor-pointer" 
            title="Click to view program transactions"
            onClick={() => navigate(`/program/${program.program_id}`)}
          >
            <div className="flex items-center space-x-3 mb-3">
              <Hash className="text-arch-orange" size={16} />
              <span className="font-mono text-sm group-hover:text-arch-orange transition-colors duration-300">
                {truncateProgramId(program.program_id)}
              </span>
              {getProjectName(program.program_id) && (
                <span className="text-arch-gray-400 text-sm">
                  ({getProjectName(program.program_id)})
                </span>
              )}
            </div>
            <div className="text-xs text-arch-gray-400 flex items-center">
              <Clock className="mr-2" size={12} />
              <span>Last seen: {new Date(program.last_seen_at).toLocaleDateString()}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ProgramLeaderboard; 