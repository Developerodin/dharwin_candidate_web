'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  startTranscription, 
  getTranscriptionStatus, 
  getTranscript 
} from '@/shared/lib/candidates';
import TranscriptionStatus from './TranscriptionStatus';
import TranscriptViewer from './TranscriptViewer';
import TranscriptExport from './TranscriptExport';

interface TranscriptPageProps {
  meetingId: string;
  autoPoll?: boolean;
  pollInterval?: number;
}

interface TranscriptionStatusData {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
  speakers?: number;
}

interface TranscriptData {
  transcript: string;
  rawTranscript?: any;
  speakers?: string[];
  participantMapping?: Record<string, string>;
  fileUrl?: string;
}

const TranscriptPage: React.FC<TranscriptPageProps> = ({ 
  meetingId, 
  autoPoll = true,
  pollInterval = 5000 
}) => {
  const [status, setStatus] = useState<TranscriptionStatusData | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await getTranscriptionStatus(meetingId);
      const statusData = response?.data?.transcription || response?.transcription;
      setStatus(statusData);
      setError(null);

      // If completed, fetch transcript
      if (statusData?.status === 'completed') {
        try {
          const transcriptResponse = await getTranscript(meetingId);
          const transcriptData = transcriptResponse?.data || transcriptResponse;
          setTranscript(transcriptData);
        } catch (err: any) {
          console.error('Failed to fetch transcript:', err);
          // Don't set error here, just log it
        }
      }

      // Stop polling if completed or failed
      if (statusData?.status === 'completed' || statusData?.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to get transcription status';
      setError(errorMessage);
      console.error('Failed to get transcription status:', err);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    // Set up polling if autoPoll is enabled and status is processing
    if (autoPoll && status?.status === 'processing') {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      pollIntervalRef.current = setInterval(() => {
        fetchStatus();
      }, pollInterval);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [status?.status, autoPoll, pollInterval, fetchStatus]);

  const handleStartTranscription = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await startTranscription(meetingId, 'en');
      // Refresh status after starting
      setTimeout(() => {
        fetchStatus();
        // Resume polling
        if (autoPoll && !pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(() => {
            fetchStatus();
          }, pollInterval);
        }
      }, 1000);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Failed to start transcription';
      setError(errorMessage);
      console.error('Failed to start transcription:', err);
      
      // If it's a configuration error, also update the status
      if (errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('not configured')) {
        setStatus(prev => prev ? { ...prev, status: 'failed', error: errorMessage } : { status: 'failed', error: errorMessage });
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleRetry = () => {
    handleStartTranscription();
  };

  const handleSave = (updatedTranscript: string) => {
    setTranscript(prev => prev ? { ...prev, transcript: updatedTranscript } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading transcription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-page space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Meeting Transcript</h2>
        {status && <TranscriptionStatus status={status.status} error={status.error || undefined} />}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {status?.status === 'completed' && transcript && (
        <>
          <TranscriptViewer
            meetingId={meetingId}
            transcript={transcript.transcript}
            isEditable={true}
            onSave={handleSave}
          />
          <TranscriptExport meetingId={meetingId} />
        </>
      )}

      {status?.status === 'processing' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-blue-700 font-medium">Transcription is being processed...</p>
          <p className="text-blue-600 text-sm mt-2">This may take a few minutes. The page will update automatically when complete.</p>
        </div>
      )}

      {status?.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">Transcription Failed</h3>
              {status.error && (
                <div className="mb-4">
                  <p className="text-red-700 text-sm mb-2">{status.error}</p>
                  {status.error.toLowerCase().includes('api key') || status.error.toLowerCase().includes('not configured') ? (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 text-xs font-medium mb-1">Configuration Issue</p>
                      <p className="text-yellow-700 text-xs">
                        The transcription service requires API configuration. Please contact your administrator to configure the AssemblyAI API key in the backend environment variables.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              <button
                onClick={handleRetry}
                disabled={isStarting || (status.error ? (status.error.toLowerCase().includes('api key') || status.error.toLowerCase().includes('not configured')) : false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={status.error && (status.error.toLowerCase().includes('api key') || status.error.toLowerCase().includes('not configured')) ? 'Cannot retry: Configuration issue must be resolved first' : undefined}
              >
                {isStarting ? 'Starting...' : 'Retry Transcription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status?.status === 'idle' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">Transcription has not been started yet.</p>
          <button
            onClick={handleStartTranscription}
            disabled={isStarting}
            className="px-6 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? 'Starting...' : 'Start Transcription'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TranscriptPage;

