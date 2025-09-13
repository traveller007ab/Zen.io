import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { DatabaseIcon } from './Icons';

type Status = 'connecting' | 'connected' | 'error';

export const StatusBar: React.FC = () => {
  const [status, setStatus] = useState<Status>('connecting');

  useEffect(() => {
    const checkConnection = async () => {
      // The correct way to check is a lightweight query on the new table.
      const { error } = await supabase
        .from('canvases')
        .select('id')
        .limit(0);

      if (error) {
        console.error("Supabase connection error:", error.message);
        setStatus('error');
      } else {
        setStatus('connected');
      }
    };
    checkConnection();
  }, []);

  const statusConfig = {
    connecting: {
      text: 'Establishing Connection...',
      color: 'text-cyan-400/70',
      iconClass: 'animate-pulse'
    },
    connected: {
      text: 'Workspace Sync | Nominal',
      color: 'text-cyan-400',
      iconClass: 'text-glow'
    },
    error: {
      text: 'Sync Error | Connection Failed',
      color: 'text-red-500',
      iconClass: 'text-glow'
    },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="shrink-0 h-8 bg-black/30 backdrop-filter backdrop-blur-sm border-t border-cyan-500/20 flex items-center justify-end px-4 text-xs z-10">
      <div className="flex items-center space-x-2">
         <DatabaseIcon className={`w-3.5 h-3.5 ${currentStatus.color} ${currentStatus.iconClass}`} />
        <span className={`font-medium ${currentStatus.color}`}>{currentStatus.text}</span>
      </div>
    </div>
  );
};