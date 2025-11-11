'use client';

import React, { useState } from 'react';
import { downloadTranscript } from '@/shared/lib/candidates';

interface TranscriptExportProps {
  meetingId: string;
}

const TranscriptExport: React.FC<TranscriptExportProps> = ({ meetingId }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setIsExporting(format);
    setError(null);
    try {
      const response = await downloadTranscript(meetingId, format);
      const downloadUrl = response?.data?.downloadUrl || response?.downloadUrl;
      
      if (downloadUrl) {
        // Open download URL in new window
        window.open(downloadUrl, '_blank');
        
        // Or trigger download programmatically
        // const link = document.createElement('a');
        // link.href = downloadUrl;
        // link.download = `transcript_${meetingId}.${format}`;
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
      } else {
        throw new Error('Download URL not found in response');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || `Failed to export as ${format.toUpperCase()}`;
      setError(errorMessage);
      console.error(`Failed to export transcript as ${format}:`, err);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Transcript</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleExport('txt')}
          disabled={isExporting !== null}
          className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isExporting === 'txt' ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : (
            'Export as TXT'
          )}
        </button>
        
        {/* <button
          onClick={() => handleExport('docx')}
          disabled={true}
          className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed flex items-center gap-2"
          title="Coming soon"
        >
          Export as DOCX
          <span className="text-xs">(Coming Soon)</span>
        </button>
        
        <button
          onClick={() => handleExport('pdf')}
          disabled={true}
          className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md text-sm font-medium cursor-not-allowed flex items-center gap-2"
          title="Coming soon"
        >
          Export as PDF
          <span className="text-xs">(Coming Soon)</span>
        </button> */}
      </div>
    </div>
  );
};

export default TranscriptExport;

