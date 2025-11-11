'use client';

import React, { useState } from 'react';
import { updateTranscript } from '@/shared/lib/candidates';

interface TranscriptViewerProps {
  meetingId: string;
  transcript: string;
  isEditable?: boolean;
  onSave?: (updatedTranscript: string) => void;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ 
  meetingId, 
  transcript, 
  isEditable = true,
  onSave 
}) => {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateTranscript(meetingId, editedTranscript);
      setIsEditing(false);
      onSave && onSave(editedTranscript);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save transcript');
      console.error('Failed to save transcript:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedTranscript(transcript);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Meeting Transcript</h3>
        {isEditable && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="transcript-content">
        {isEditing ? (
          <textarea
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            className="w-full min-h-[400px] font-mono text-sm p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            rows={20}
          />
        ) : (
          <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800 bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto">
            {transcript}
          </pre>
        )}
      </div>
    </div>
  );
};

export default TranscriptViewer;

