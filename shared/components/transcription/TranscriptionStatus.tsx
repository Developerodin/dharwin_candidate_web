'use client';

import React from 'react';

interface TranscriptionStatusProps {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  error?: string | null;
}

const TranscriptionStatus: React.FC<TranscriptionStatusProps> = ({ status, error }) => {
  const statusConfig = {
    idle: { label: 'Not Started', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
    processing: { label: 'Processing...', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
    completed: { label: 'Completed', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-600' },
    failed: { label: 'Failed', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span>{config.label}</span>
      {status === 'processing' && (
        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {status === 'failed' && error && (
        <span className="ml-1 text-xs opacity-75">({error})</span>
      )}
    </div>
  );
};

export default TranscriptionStatus;

