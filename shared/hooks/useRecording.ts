'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getRecordingStatus, 
  startRecording, 
  stopRecording, 
  getRecordingDownloadUrl, 
  uploadRecordingFile
} from '@/shared/lib/candidates';
import { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';

export interface RecordingData {
  enabled: boolean;
  autoStart: boolean;
  status: 'idle' | 'starting' | 'recording' | 'stopping' | 'completed' | 'failed';
  startedAt?: string | null;
  stoppedAt?: string | null;
  duration?: number | null;
  fileUrl?: string | null;
  fileKey?: string | null;
  fileSize?: number | null;
  format?: string;
  resolution?: string;
  fps?: number;
  bitrate?: number;
  error?: string | null;
  recordingId?: string;
}

interface UseRecordingOptions {
  meetingId: string;
  enabled?: boolean;
  pollInterval?: number;
  onStatusChange?: (recording: RecordingData | null) => void;
  agoraClient?: IAgoraRTCClient | null;
  localAudioTrack?: ILocalAudioTrack | null;
  localVideoTrack?: ILocalVideoTrack | null;
  remoteAudioTracks?: ILocalAudioTrack[];
  remoteVideoTracks?: ILocalVideoTrack[];
  isScreenSharing?: boolean; // Check if screen sharing is already active
  screenShareTrack?: ILocalVideoTrack | null; // Reuse existing screen share track if available
}

export function useRecording({ 
  meetingId, 
  enabled = true, 
  pollInterval = 5000,
  onStatusChange,
  agoraClient,
  localAudioTrack,
  localVideoTrack,
  remoteAudioTracks = [],
  remoteVideoTracks = [],
  isScreenSharing = false,
  screenShareTrack = null
}: UseRecordingOptions) {
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingMimeTypeRef = useRef<string>('video/webm'); // Store the MIME type used for recording
  const tabStreamRef = useRef<MediaStream | null>(null); // Store the tab stream for cleanup
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // Canvas for capturing visible page
  const canvasStreamRef = useRef<MediaStream | null>(null); // Canvas stream
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null); // Interval for capturing frames

  // Fetch recording status
  const fetchStatus = useCallback(async () => {
    if (!meetingId) return;
    
    try {
      const response = await getRecordingStatus(meetingId);
      if (response.success && response.data?.recording) {
        const recordingData = response.data.recording;
        setRecording(recordingData);
        setError(null);
        
        // Call status change callback
        if (onStatusChange) {
          onStatusChange(recordingData);
        }
      }
    } catch (err: any) {
      // Don't set error for 401/403/404 as they might be expected (unauthenticated, not authorized, or recording not enabled)
      if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
        setRecording(null);
        setError(null);
        if (onStatusChange) {
          onStatusChange(null);
        }
        return;
      }
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch recording status';
      setError(errorMessage);
      console.error('Failed to fetch recording status:', err);
    }
  }, [meetingId, onStatusChange]);

  // Start client-side recording using MediaRecorder
  const startClientRecording = useCallback(async () => {
    try {
      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      
      // First, try to reuse existing screen share track if available
      if (isScreenSharing && screenShareTrack) {
        try {
          const existingTrack = (screenShareTrack as any).getMediaStreamTrack?.();
          if (existingTrack && existingTrack.kind === 'video') {
            videoTrack = existingTrack;
            console.log('Reusing existing screen share track for recording');
          }
        } catch (e) {
          console.warn('Could not reuse screen share track:', e);
        }
      }
      
      // If no existing screen share, use canvas to capture visible page
      // This avoids the screen sharing prompt for recording
      if (!videoTrack) {
        // Create a canvas to capture the visible page
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas size to match viewport
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvasRef.current = canvas;

        // Create a stream from the canvas
        const canvasStream = canvas.captureStream(30); // 30 fps
        canvasStreamRef.current = canvasStream;
        videoTrack = canvasStream.getVideoTracks()[0];

        if (!videoTrack) {
          throw new Error('Could not create video track from canvas');
        }

        // Function to capture the visible page to canvas
        const captureFrame = () => {
          if (!canvasRef.current || !ctx) return;

          try {
            // Update canvas size to match current viewport
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Fill with background color matching the meeting page
            ctx.fillStyle = '#111827'; // bg-gray-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Capture all video elements from the page (local and remote participants)
            const videoElements = document.querySelectorAll('video');
            
            videoElements.forEach((video) => {
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                try {
                  // Get video element position on page
                  const videoRect = video.getBoundingClientRect();
                  
                  // Only draw if video is visible and has valid dimensions
                  if (videoRect.width > 0 && videoRect.height > 0 && 
                      videoRect.top < window.innerHeight && 
                      videoRect.bottom > 0 &&
                      videoRect.left < window.innerWidth &&
                      videoRect.right > 0) {
                    // Draw video frame to canvas at its actual position
                    ctx.drawImage(
                      video, 
                      videoRect.left, 
                      videoRect.top, 
                      videoRect.width, 
                      videoRect.height
                    );
                  }
                } catch (e) {
                  // Cross-origin or other error - skip this video
                  console.warn('Could not capture video element:', e);
                }
              }
            });
            
            // Also capture canvas elements if any (for screen shares)
            const canvasElements = document.querySelectorAll('canvas');
            canvasElements.forEach((canvasEl) => {
              if (canvasEl !== canvasRef.current) { // Don't capture our own canvas
                try {
                  const canvasRect = canvasEl.getBoundingClientRect();
                  if (canvasRect.width > 0 && canvasRect.height > 0) {
                    ctx.drawImage(
                      canvasEl,
                      canvasRect.left,
                      canvasRect.top,
                      canvasRect.width,
                      canvasRect.height
                    );
                  }
                } catch (e) {
                  console.warn('Could not capture canvas element:', e);
                }
              }
            });
            
            // Note: This captures video elements but not full page UI
            // For full page capture with UI elements, html2canvas library would be needed
            // But this approach avoids screen sharing prompt and captures all video participants
          } catch (e) {
            console.warn('Error capturing frame:', e);
          }
        };

        // Start capturing frames
        captureIntervalRef.current = setInterval(captureFrame, 1000 / 30); // 30 fps
        captureFrame(); // Capture first frame immediately

        console.log('Canvas-based recording started - capturing visible page');
      }

      if (!videoTrack) {
        throw new Error('No video track available for recording');
      }

      // Get microphone audio for recording
      let microphoneTrack: MediaStreamTrack | null = null;
      if (localAudioTrack) {
        try {
          const micTrack = (localAudioTrack as any).getMediaStreamTrack?.();
          if (micTrack && micTrack.kind === 'audio') {
            microphoneTrack = micTrack;
            console.log('Added microphone audio track');
          }
        } catch (e) {
          console.warn('Could not get microphone track:', e);
        }
      }

      // Get remote audio tracks for better quality
      const remoteAudioTracksForRecording: MediaStreamTrack[] = [];
      remoteAudioTracks.forEach((track) => {
        try {
          const mediaTrack = (track as any).getMediaStreamTrack?.();
          if (mediaTrack && mediaTrack.kind === 'audio') {
            remoteAudioTracksForRecording.push(mediaTrack);
          }
        } catch (e) {
          console.warn('Could not get remote audio track:', e);
        }
      });

      // Create combined stream
      const tracksToRecord: MediaStreamTrack[] = [videoTrack];
      
      // Add all audio tracks (microphone + remote participants)
      if (microphoneTrack) {
        tracksToRecord.push(microphoneTrack);
      }
      remoteAudioTracksForRecording.forEach(track => {
        tracksToRecord.push(track);
      });

      // Create the combined stream
      const combinedStream = new MediaStream(tracksToRecord);
      
      console.log('Recording stream created with:', {
        hasVideo: !!videoTrack,
        hasMicrophoneAudio: !!microphoneTrack,
        remoteAudioTracks: remoteAudioTracksForRecording.length,
        videoTrackLabel: videoTrack.label,
      });

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }

      // Determine best mime type
      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000, // 128 kbps
      });

      // Store the MIME type for later use
      recordingMimeTypeRef.current = mimeType;
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle stop event
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', recordedChunksRef.current.length);
      };

      // Handle errors
      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;

      console.log('Page recording started successfully');
    } catch (err: any) {
      console.error('Failed to start client-side recording:', err);
      // Clean up on error
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach(track => track.stop());
        canvasStreamRef.current = null;
      }
      if (canvasRef.current) {
        canvasRef.current = null;
      }
      throw new Error(err.message || 'Failed to start client-side recording');
    }
  }, [localAudioTrack, isScreenSharing, screenShareTrack, remoteAudioTracks]); // Include screen sharing state

  // Stop client-side recording
  const stopClientRecording = useCallback(async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        // Use the stored MIME type or fallback to mediaRecorder.mimeType or default
        const mimeType = recordingMimeTypeRef.current || mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;
        recordingStartTimeRef.current = null;
        recordingMimeTypeRef.current = 'video/webm'; // Reset
        
        // Clean up canvas capture
        if (captureIntervalRef.current) {
          clearInterval(captureIntervalRef.current);
          captureIntervalRef.current = null;
        }
        
        // Clean up canvas stream
        if (canvasStreamRef.current) {
          canvasStreamRef.current.getTracks().forEach(track => track.stop());
          canvasStreamRef.current = null;
        }
        
        // Clean up canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          canvasRef.current = null;
        }
        
        // Clean up tab stream (if we used screen share)
        if (tabStreamRef.current) {
          tabStreamRef.current.getTracks().forEach(track => track.stop());
          tabStreamRef.current = null;
        }
        
        console.log('Recording stopped, blob size:', blob.size, 'type:', blob.type);
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error('Error stopping recording'));
      };

      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      } else {
        reject(new Error('Recording is not active'));
      }
    });
  }, []);

  // Start recording
  const handleStartRecording = useCallback(async (options?: {
    format?: 'mp4' | 'webm' | 'm3u8';
    resolution?: string;
    fps?: number;
    bitrate?: number;
  }) => {
    if (!meetingId) return;
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Step 1: Call backend API to start recording
      const response = await startRecording(meetingId, options);
      if (!response.success || !response.data?.recording) {
        throw new Error(response.message || 'Failed to start recording');
      }

      // Step 2: Start client-side recording using MediaRecorder
      await startClientRecording();

      // Step 3: Update state
      setRecording(response.data.recording);
      setError(null);
      
      // Start polling for status updates
      if (!isPolling) {
        setIsPolling(true);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to start recording';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [meetingId, isPolling, startClientRecording]);

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (!meetingId) return;
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Step 1: Stop client-side recording and get the blob
      const recordingBlob = await stopClientRecording();
      
      // Step 2: Call backend API to stop recording
      const response = await stopRecording(meetingId);
      if (!response.success || !response.data?.recording) {
        throw new Error(response.message || 'Failed to stop recording');
      }

      // Step 3: Upload the recording file
      setIsUploading(true);
      setUploadProgress(0);

      // Determine file extension and MIME type
      let fileExtension = 'webm';
      let fileMimeType = recordingBlob.type || 'video/webm';
      
      if (fileMimeType.includes('webm')) {
        fileExtension = 'webm';
        fileMimeType = 'video/webm';
      } else if (fileMimeType.includes('mp4')) {
        fileExtension = 'mp4';
        fileMimeType = 'video/mp4';
      } else if (fileMimeType.includes('quicktime')) {
        fileExtension = 'mov';
        fileMimeType = 'video/quicktime';
      } else if (fileMimeType.includes('x-msvideo')) {
        fileExtension = 'avi';
        fileMimeType = 'video/x-msvideo';
      } else if (fileMimeType.includes('matroska')) {
        fileExtension = 'mkv';
        fileMimeType = 'video/x-matroska';
      } else {
        // Default to webm if unknown
        fileExtension = 'webm';
        fileMimeType = 'video/webm';
      }

      // Create File object with correct MIME type
      const recordingFile = new File([recordingBlob], `recording_${meetingId}_${Date.now()}.${fileExtension}`, {
        type: fileMimeType,
      });

      console.log('Uploading recording file:', {
        name: recordingFile.name,
        type: recordingFile.type,
        size: recordingFile.size,
      });

      const uploadResponse = await uploadRecordingFile(
        meetingId,
        recordingFile,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      if (uploadResponse.success && uploadResponse.data?.recording) {
        setRecording(uploadResponse.data.recording);
        setError(null);
      } else {
        throw new Error(uploadResponse.message || 'Failed to upload recording');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to stop recording';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [meetingId, stopClientRecording]);

  // Download recording
  const handleDownloadRecording = useCallback(async () => {
    if (!meetingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getRecordingDownloadUrl(meetingId);
      if (response.success && response.data?.downloadUrl) {
        // Open download URL in new tab
        window.open(response.data.downloadUrl, '_blank');
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to get download URL');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to download recording';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  // Poll for status updates - always poll when enabled so all participants can see recording status
  useEffect(() => {
    if (!enabled || !meetingId) return;

    // Initial fetch
    fetchStatus();

    // Always set up polling when enabled so all participants can see recording status updates
    // This ensures remote participants see when someone else starts recording
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [enabled, meetingId, fetchStatus, pollInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Clean up canvas stream
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach(track => track.stop());
        canvasStreamRef.current = null;
      }
      // Clean up canvas
      if (canvasRef.current) {
        canvasRef.current = null;
      }
      // Clean up tab stream
      if (tabStreamRef.current) {
        tabStreamRef.current.getTracks().forEach(track => track.stop());
        tabStreamRef.current = null;
      }
    };
  }, []);

  return {
    recording,
    loading,
    error,
    uploadProgress,
    isUploading,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    downloadRecording: handleDownloadRecording,
    refreshStatus: fetchStatus,
  };
}
