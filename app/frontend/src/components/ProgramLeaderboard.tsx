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
}

// Add this mapping at the top of the file, outside the component
const PROGRAM_NAME_MAPPING: { [key: string]: string } = {
  "836f0e206b4f8e9c84991d4182f19f30e1434858a8898efca26a304f94e28906": "FunkyBit",
  // Add more mappings here
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
    <div className="space-y-4">
      {programs.map((program, index) => (
        <div 
          key={program.program_id} 
          className="bg-arch-black p-4 rounded-lg hover:bg-arch-gray/20 transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Trophy className="text-arch-orange mr-2" size={16} />
              <span className="text-arch-orange font-bold">#{index + 1}</span>
            </div>
            <span className="text-sm bg-arch-orange/20 text-arch-orange px-2 py-1 rounded">
              {program.transaction_count.toLocaleString()} txs
            </span>
          </div>
          
          <div 
            className="text-sm mb-2 cursor-pointer" 
            title="Click to view program transactions"
            onClick={() => navigate(`/program/${program.program_id}`)}
          >
            <div className="flex items-center space-x-2">
              <Hash className="text-arch-orange" size={14} />
              <span className="font-mono hover:text-arch-orange transition-colors duration-300">
                {truncateProgramId(program.program_id)}
              </span>
              {/* Add this to display the project name if it exists */}
              {getProjectName(program.program_id) && (
                <span className="text-arch-gray-400 ml-1">({getProjectName(program.program_id)})</span>
              )}
            </div>
          </div>
          <div className="text-xs text-arch-gray-400 flex items-center">
            <Clock className="mr-1" size={12} />
            <span>Last seen: {new Date(program.last_seen_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProgramLeaderboard; 