"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AgoraRTC, { 
  IAgoraRTCClient, 
  IAgoraRTCRemoteUser, 
  IMicrophoneAudioTrack, 
  ICameraVideoTrack,
  ConnectionState,
  ClientRole
} from 'agora-rtc-sdk-ng';
import Swal from 'sweetalert2';

interface MeetingState {
  isJoined: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  participants: number;
  connectionState: ConnectionState;
}

const MeetingPage = ({ params }: { params: { meetingId: string } }) => {
  const searchParams = useSearchParams();
  
  // Static fallback App ID
  const STATIC_APP_ID = "bba65876c8d549e1b3a98a275f6d8624";
  
  // Error boundary state
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [meetingState, setMeetingState] = useState<MeetingState>({
    isJoined: false,
    isMuted: false,
    isVideoOn: true,
    participants: 0,
    connectionState: 'DISCONNECTED'
  });

  // Refs for Agora
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoElementRef = useRef<HTMLDivElement>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement>(null);

  // Get meeting parameters from URL
  const channelName = params.meetingId || '';
  const token = searchParams.get('token') || '';
  const uid = searchParams.get('uid') || '';
  const role = searchParams.get('role') || '1';
  const expires = searchParams.get('expires') || '';
  const appId = searchParams.get('appId') || '';

  // Fallback: try to parse from URL hash if query params are missing
  const [fallbackParams, setFallbackParams] = useState<{
    token?: string;
    uid?: string;
    role?: string;
    expires?: string;
    appId?: string;
  }>({});

  // Use fallback parameters if main ones are missing
  const finalToken = token || fallbackParams.token || '';
  const finalUid = uid || fallbackParams.uid || '';
  const finalRole = role || fallbackParams.role || '1';
  const finalExpires = expires || fallbackParams.expires || '';
  
  // Validate and set App ID with fallbacks
  let finalAppId = appId || fallbackParams.appId || '';
  
  // If no App ID from URL, try environment variable
  if (!finalAppId) {
    finalAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '';
  }

  // If still no App ID, try to fetch from API as last resort
  const [apiAppId, setApiAppId] = useState<string>('');
  useEffect(() => {
    if (!finalAppId) {
      const fetchAppIdFromAPI = async () => {
        try {
          console.log('🔄 Attempting to fetch App ID from API as fallback...');
          const { getAgoraConfig } = await import('@/shared/lib/candidates');
          const config = await getAgoraConfig();
          if (config?.data?.appId) {
            console.log('✅ Got App ID from API:', config.data.appId);
            setApiAppId(config.data.appId);
          }
        } catch (error) {
          console.error('❌ Failed to fetch App ID from API:', error);
        }
      };
      fetchAppIdFromAPI();
    }
  }, [finalAppId]);

  // Use API App ID if available and no other App ID
  if (!finalAppId && apiAppId) {
    finalAppId = apiAppId;
  }
  
  // Enhanced App ID validation
  if (finalAppId) {
    console.log('🔍 App ID Validation:', {
      appId: finalAppId,
      length: finalAppId.length,
      expectedLength: 32,
      isCorrectLength: finalAppId.length === 32,
      isHex: /^[a-f0-9]+$/i.test(finalAppId),
      first8: finalAppId.substring(0, 8),
      last8: finalAppId.substring(finalAppId.length - 8),
      source: (appId || fallbackParams.appId) ? 'URL' : 'Environment'
    });
    
    // Validate App ID format (should be 32 characters)
    if (finalAppId.length !== 32) {
      console.error('❌ Invalid App ID length:', finalAppId.length, 'Expected: 32');
      finalAppId = '';
    }
    
    // Additional validation for hex characters
    if (finalAppId && !/^[a-f0-9]+$/i.test(finalAppId)) {
      console.error('❌ App ID contains invalid characters:', finalAppId);
      console.error('❌ Must contain only hexadecimal characters (0-9, a-f)');
      finalAppId = '';
    }
  }
  
  // Additional App ID validation
  if (finalAppId) {
    console.log('App ID validation:', {
      appId: finalAppId,
      length: finalAppId.length,
      is32Chars: finalAppId.length === 32,
      containsOnlyHex: /^[a-f0-9]+$/i.test(finalAppId),
      source: (appId || fallbackParams.appId) ? 'URL' : 'Environment',
      first8: finalAppId.substring(0, 8),
      last8: finalAppId.substring(finalAppId.length - 8)
    });
  }


  useEffect(() => {
    if (!token && !uid) {
      // Try to parse from URL hash
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        setFallbackParams({
          token: hashParams.get('token') || '',
          uid: hashParams.get('uid') || '',
          role: hashParams.get('role') || '1',
          expires: hashParams.get('expires') || '',
          appId: hashParams.get('appId') || ''
        });
      }
    }
  }, [token, uid]);

  // Use App ID from URL parameters (fetched during link generation)

  // Debug logging
  useEffect(() => {
    console.log('Meeting Parameters:', {
      channelName,
      token: token ? 'Present' : 'Missing',
      uid,
      role,
      expires,
      appId: appId ? `Present: ${appId}` : 'Missing',
      finalAppId: finalAppId ? `Present: ${finalAppId}` : 'Missing',
      searchParams: Object.fromEntries(searchParams.entries()),
      currentUrl: window.location.href
    });
    
    // Configuration validation
    if (!finalAppId) {
      console.error('❌ Agora App ID is missing!');
      console.error('Sources checked:', {
        urlAppId: appId,
        fallbackAppId: fallbackParams.appId,
        envAppId: process.env.NEXT_PUBLIC_AGORA_APP_ID
      });
    } else if (finalAppId.length !== 32) {
      console.error('❌ Invalid App ID length:', finalAppId.length, 'Expected: 32');
    } else if (!/^[a-f0-9]+$/i.test(finalAppId)) {
      console.error('❌ App ID contains invalid characters. Must be hexadecimal.');
    } else {
      console.log('✅ App ID validation passed:', finalAppId);
    }
  }, [channelName, token, uid, role, expires, appId, finalAppId, searchParams]);

  // Check if meeting has expired and set document title
  useEffect(() => {
    if (finalExpires) {
      const expirationTime = parseInt(finalExpires);
      const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
      
      console.log('Expiration check:', {
        expirationTime,
        currentTime,
        isExpired: expirationTime < currentTime,
        timeRemaining: expirationTime - currentTime
      });
      
      if (expirationTime < currentTime) {
        const timeExpired = currentTime - expirationTime;
        const hoursExpired = Math.floor(timeExpired / 3600);
        const minutesExpired = Math.floor((timeExpired % 3600) / 60);
        
        Swal.fire({
          icon: 'error',
          title: 'Meeting Expired',
          html: `
            <div style="text-align: left;">
              <p>This meeting link has expired.</p>
              <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px;">
                <strong>Expired:</strong> ${hoursExpired > 0 ? `${hoursExpired}h ` : ''}${minutesExpired}m ago<br/>
                <strong>Please request a new meeting link.</strong>
              </div>
            </div>
          `,
          confirmButtonText: 'OK'
        }).then(() => {
          window.close();
        });
        return;
      }
    }
    
    // Set document title
    if (channelName) {
      document.title = `Meeting: ${channelName}`;
    }
    
    // Mark as initialized
    setIsInitialized(true);
    
    // Set up countdown timer if meeting has expiration
    if (finalExpires) {
      const expirationTime = parseInt(finalExpires);
      const currentTime = Math.floor(Date.now() / 1000);
      const remaining = expirationTime - currentTime;
      
      if (remaining > 0) {
        setTimeRemaining(remaining);
        
        // Update countdown every second
        const interval = setInterval(() => {
          const now = Math.floor(Date.now() / 1000);
          const newRemaining = expirationTime - now;
          
          if (newRemaining <= 0) {
            setTimeRemaining(0);
            clearInterval(interval);
            // Show expiration warning
            Swal.fire({
              icon: 'warning',
              title: 'Meeting Expired',
              text: 'This meeting has expired. You will be redirected.',
              confirmButtonText: 'OK'
            }).then(() => {
              window.close();
            });
          } else {
            setTimeRemaining(newRemaining);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [finalExpires, channelName]);

  // Initialize Agora client
  useEffect(() => {
    if (!channelName || !finalToken || !finalUid || !finalAppId) {
      console.error('Missing meeting parameters:', { 
        channelName, 
        token: !!finalToken, 
        uid: finalUid,
        appId: !!finalAppId,
        fallbackParams,
        currentUrl: window.location.href
      });
      Swal.fire({
        icon: 'error',
        title: 'Invalid Meeting Link',
        html: `
          <div style="text-align: left;">
            <p>This meeting link is invalid or incomplete.</p>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px;">
              <strong>Missing parameters:</strong><br/>
              ${!channelName ? '• Channel Name<br/>' : ''}
              ${!finalToken ? '• Token<br/>' : ''}
              ${!finalUid ? '• User ID<br/>' : ''}
              ${!finalAppId ? '• Agora App ID<br/>' : ''}
            </div>
            <p style="margin-top: 10px; font-size: 12px; color: #666;">
              Please check the meeting link and try again.
            </p>
          </div>
        `,
        confirmButtonText: 'OK'
      }).then(() => {
        window.close();
      });
      return;
    }

    // Initialize Agora client
    console.log('Creating Agora client with App ID:', finalAppId);
    const client = AgoraRTC.createClient({ 
      mode: 'rtc', 
      codec: 'vp8' 
    });
    clientRef.current = client;
    
    // Test client creation
    console.log('Agora client created successfully:', !!client);
    console.log('Client mode:', client.mode);

    // Set up event listeners
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);
    client.on('connection-state-change', handleConnectionStateChange);

    return () => {
      if (clientRef.current) {
        clientRef.current.removeAllListeners();
        clientRef.current.leave();
      }
      
      // Clean up any remaining video elements
      if (remoteVideoContainerRef.current) {
        while (remoteVideoContainerRef.current.firstChild) {
          remoteVideoContainerRef.current.removeChild(remoteVideoContainerRef.current.firstChild);
        }
      }
    };
  }, [channelName, finalToken, finalUid, finalAppId]);

  const handleUserPublished = async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    try {
      await clientRef.current?.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        // Check if element already exists
        const existingElement = document.getElementById(`remote-video-${user.uid}`);
        if (existingElement) {
          existingElement.remove();
        }
        
        const remoteVideoElement = document.createElement('div');
        remoteVideoElement.id = `remote-video-${user.uid}`;
        remoteVideoElement.style.width = '100%';
        remoteVideoElement.style.height = '200px';
        remoteVideoElement.style.marginBottom = '10px';
        remoteVideoElement.style.borderRadius = '8px';
        remoteVideoElement.style.overflow = 'hidden';
        
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.appendChild(remoteVideoElement);
        }
        
        user.videoTrack?.play(remoteVideoElement);
      }
      
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    } catch (error) {
      console.error('Error handling user published:', error);
      setHasError(true);
    }
  };

  const handleUserUnpublished = (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
    if (mediaType === 'video') {
      const remoteVideoElement = document.getElementById(`remote-video-${user.uid}`);
      if (remoteVideoElement && remoteVideoElement.parentNode) {
        remoteVideoElement.parentNode.removeChild(remoteVideoElement);
      }
    }
  };

  const handleUserJoined = (user: IAgoraRTCRemoteUser) => {
    setMeetingState(prev => ({
      ...prev,
      participants: prev.participants + 1
    }));
  };

  const handleUserLeft = (user: IAgoraRTCRemoteUser) => {
    setMeetingState(prev => ({
      ...prev,
      participants: Math.max(0, prev.participants - 1)
    }));
    
    const remoteVideoElement = document.getElementById(`remote-video-${user.uid}`);
    if (remoteVideoElement && remoteVideoElement.parentNode) {
      remoteVideoElement.parentNode.removeChild(remoteVideoElement);
    }
  };

  const handleConnectionStateChange = (curState: ConnectionState) => {
    setMeetingState(prev => ({
      ...prev,
      connectionState: curState
    }));
  };

  const joinMeeting = async () => {
    if (!clientRef.current || !channelName || !finalToken || !finalUid) return;

    // Enhanced App ID validation before joining
    if (!finalAppId) {
      console.error('❌ No Agora App ID available');
      console.error('❌ Sources checked:', {
        urlAppId: appId,
        fallbackAppId: fallbackParams.appId,
        envAppId: process.env.NEXT_PUBLIC_AGORA_APP_ID,
        allSources: { appId, fallbackParams, env: process.env.NEXT_PUBLIC_AGORA_APP_ID }
      });
      
      Swal.fire({
        icon: 'error',
        title: 'Configuration Error',
        html: `
          <div style="text-align: left;">
            <p><strong>Agora App ID is not available.</strong></p>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px;">
              <p><strong>Sources checked:</strong></p>
              <ul style="margin: 5px 0; padding-left: 15px;">
                <li>URL Parameter: ${appId || 'Not found'}</li>
                <li>Fallback Parameter: ${fallbackParams.appId || 'Not found'}</li>
                <li>Environment Variable: ${process.env.NEXT_PUBLIC_AGORA_APP_ID || 'Not found'}</li>
              </ul>
            </div>
            <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
              Please ensure your Agora App ID is properly configured.
            </p>
          </div>
        `,
        confirmButtonText: 'Refresh Page'
      }).then(() => {
        window.location.reload();
      });
      return;
    }

    // Validate App ID format before joining
    if (finalAppId.length !== 32) {
      console.error('❌ Invalid App ID length:', finalAppId.length, 'Expected: 32');
      Swal.fire({
        icon: 'error',
        title: 'Invalid App ID',
        html: `
          <div style="text-align: left;">
            <p><strong>App ID length is invalid.</strong></p>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px;">
              <p><strong>Current:</strong> ${finalAppId.length} characters</p>
              <p><strong>Expected:</strong> 32 characters</p>
              <p><strong>App ID:</strong> ${finalAppId}</p>
            </div>
          </div>
        `,
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!/^[a-f0-9]+$/i.test(finalAppId)) {
      console.error('❌ App ID contains invalid characters:', finalAppId);
      Swal.fire({
        icon: 'error',
        title: 'Invalid App ID Format',
        html: `
          <div style="text-align: left;">
            <p><strong>App ID contains invalid characters.</strong></p>
            <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px;">
              <p><strong>App ID:</strong> ${finalAppId}</p>
              <p><strong>Expected:</strong> Only hexadecimal characters (0-9, a-f)</p>
            </div>
          </div>
        `,
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      setMeetingState(prev => ({ ...prev, isJoined: true }));

      // Join the channel
      console.log('Joining channel with:', {
        appId: finalAppId,
        channelName,
        token: finalToken ? 'Present' : 'Missing',
        uid: finalUid,
        appIdLength: finalAppId.length,
        appIdValid: finalAppId.length === 32
      });
      
      console.log('Attempting to join Agora channel...');
      console.log('App ID being used:', finalAppId);
      console.log('App ID type:', typeof finalAppId);
      console.log('App ID length:', finalAppId.length);
      console.log('App ID first 8 chars:', finalAppId.substring(0, 8));
      console.log('App ID last 8 chars:', finalAppId.substring(finalAppId.length - 8));
      console.log('Channel:', channelName);
      console.log('Token:', finalToken ? 'Present' : 'Missing');
      console.log('Token length:', finalToken.length);
      console.log('UID:', finalUid);
      console.log('UID type:', typeof finalUid);
      
      await clientRef.current.join(
        finalAppId,
        channelName,
        finalToken,
        parseInt(finalUid)
      );

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;

      // Publish tracks
      await clientRef.current.publish([audioTrack, videoTrack]);

      // Play local video
      if (localVideoElementRef.current) {
        videoTrack.play(localVideoElementRef.current);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Joined Meeting!',
        text: 'You have successfully joined the meeting.',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error: any) {
      console.error('Error joining meeting:', error);
      setMeetingState(prev => ({ ...prev, isJoined: false }));
      
      // Check for specific Agora errors
      let errorMessage = 'Failed to join the meeting. Please try again.';
      let showAppIdHelp = false;
      
      if (error && typeof error === 'object' && 'code' in error) {
        const agoraError = error as any;
        console.log('Agora Error Details:', {
          code: agoraError.code,
          message: agoraError.message,
          reason: agoraError.reason,
          appId: finalAppId,
          appIdLength: finalAppId.length,
          appIdValid: finalAppId.length === 32 && /^[a-f0-9]+$/i.test(finalAppId)
        });
        
        if (agoraError.code === 'CAN_NOT_GET_GATEWAY_SERVER') {
          errorMessage = 'Invalid Agora App ID or configuration. Please check your Agora account settings.';
          showAppIdHelp = true;
        } else if (agoraError.code === 'INVALID_VENDOR_KEY') {
          errorMessage = 'Invalid Agora App ID. Please verify your App ID is correct.';
          showAppIdHelp = true;
        } else if (agoraError.code === 'INVALID_TOKEN') {
          errorMessage = 'Invalid or expired token. Please generate a new meeting link.';
        } else if (agoraError.code === 'INVALID_CHANNEL_NAME') {
          errorMessage = 'Invalid channel name. Please check the meeting link.';
        } else if (agoraError.code === 'TOKEN_EXPIRED') {
          errorMessage = 'Meeting token has expired. Please request a new meeting link.';
        }
      }
      
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Join',
        html: showAppIdHelp ? `
          <div style="text-align: left;">
            <p>${errorMessage}</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px; font-size: 14px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Troubleshooting Steps:</h4>
              <ol style="margin: 0; padding-left: 20px; color: #666;">
                <li>Verify your Agora App ID is correct (32 characters, hex format)</li>
                <li>Check if your Agora account is active and has sufficient credits</li>
                <li>Ensure the App ID is properly configured in your environment</li>
                <li>Try refreshing the page to reload the configuration</li>
              </ol>
              <div style="margin-top: 10px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">
                <strong>Current App ID:</strong> ${finalAppId || 'Not configured'}<br/>
                <strong>App ID Length:</strong> ${finalAppId ? finalAppId.length : 0}/32<br/>
                <strong>App ID Valid:</strong> ${finalAppId && finalAppId.length === 32 && /^[a-f0-9]+$/i.test(finalAppId) ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        ` : errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  const leaveMeeting = async () => {
    if (!clientRef.current) return;

    try {
      // Stop and close local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }


      // Leave the channel
      await clientRef.current.leave();

      setMeetingState(prev => ({
        ...prev,
        isJoined: false,
        isMuted: false,
        isVideoOn: true,
        participants: 0
      }));

      // Clear video elements safely
      if (localVideoElementRef.current) {
        // Stop any playing tracks first
        if (localVideoTrackRef.current) {
          try {
            (localVideoTrackRef.current as any).stop();
          } catch (error) {
            console.warn('Error stopping video track:', error);
          }
        }
        localVideoElementRef.current.innerHTML = '';
      }
      if (remoteVideoContainerRef.current) {
        // Remove all child elements safely
        while (remoteVideoContainerRef.current.firstChild) {
          remoteVideoContainerRef.current.removeChild(remoteVideoContainerRef.current.firstChild);
        }
      }

    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  };

  const toggleMute = async () => {
    if (!localAudioTrackRef.current) return;

    try {
      if (meetingState.isMuted) {
        await localAudioTrackRef.current.setEnabled(true);
        setMeetingState(prev => ({ ...prev, isMuted: false }));
      } else {
        await localAudioTrackRef.current.setEnabled(false);
        setMeetingState(prev => ({ ...prev, isMuted: true }));
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const toggleVideo = async () => {
    if (!localVideoTrackRef.current) return;

    try {
      if (meetingState.isVideoOn) {
        await localVideoTrackRef.current.setEnabled(false);
        setMeetingState(prev => ({ ...prev, isVideoOn: false }));
      } else {
        await localVideoTrackRef.current.setEnabled(true);
        setMeetingState(prev => ({ ...prev, isVideoOn: true }));
      }
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };



  // Show loading state
  if (!isInitialized || !finalAppId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <i className="ri-loader-4-line text-2xl"></i>
          </div>
          <h2 className="text-xl font-semibold mb-2">Loading Meeting...</h2>
          <p className="text-gray-400">
            {!finalAppId ? 'Loading meeting configuration...' : 'Please wait while we prepare your meeting room.'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-3xl"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Meeting Error</h2>
          <p className="text-gray-400 mb-6">
            There was an error with the video meeting. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Meeting: {channelName}</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <i className="ri-user-line"></i>
            <span>{meetingState.participants + (meetingState.isJoined ? 1 : 0)} participants</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              meetingState.connectionState === 'CONNECTED' ? 'bg-green-500' : 
              meetingState.connectionState === 'CONNECTING' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-300 capitalize">{meetingState.connectionState.toLowerCase()}</span>
          </div>
          {timeRemaining !== null && timeRemaining > 0 && (
            <div className="flex items-center space-x-2 text-sm text-yellow-400">
              <i className="ri-timer-line"></i>
              <span>
                {Math.floor(timeRemaining / 3600)}h {Math.floor((timeRemaining % 3600) / 60)}m remaining
              </span>
            </div>
          )}
        </div>
        
         <div className="flex items-center space-x-3">
           {meetingState.isJoined && (
             <button
               onClick={leaveMeeting}
               className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
             >
               <i className="ri-phone-line mr-1"></i>
               Leave Meeting
             </button>
           )}
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {!meetingState.isJoined ? (
          // Join Meeting Screen
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center w-full max-w-4xl">

              <div className="mb-8">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-video-line text-3xl"></i>
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to Join?</h2>
                <p className="text-gray-400 mb-6">
                  Channel: <span className="font-semibold text-white">{channelName}</span>
                </p>
              </div>
              
              <button
                onClick={joinMeeting}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-lg font-semibold transition-colors flex items-center mx-auto"
              >
                <i className="ri-video-line mr-2"></i>
                Join Meeting
              </button>
            </div>
          </div>
        ) : (
          // Meeting Interface
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Local Video */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-3">Your Video</h3>
                <div 
                  ref={localVideoElementRef}
                  className="w-full h-64 bg-gray-700 rounded-lg overflow-hidden"
                ></div>
              </div>

              {/* Remote Videos */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Participants</h3>
                <div 
                  ref={remoteVideoContainerRef}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {/* Remote videos will be added here dynamically */}
                </div>
              </div>
            </div>

            {/* Controls Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Controls</h3>
                
                <div className="space-y-4">
                  {/* Audio Control */}
                  <button
                    onClick={toggleMute}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                      meetingState.isMuted 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <i className={`ri-${meetingState.isMuted ? 'mic-off' : 'mic'}-line mr-2`}></i>
                    {meetingState.isMuted ? 'Unmute' : 'Mute'}
                  </button>

                  {/* Video Control */}
                  <button
                    onClick={toggleVideo}
                    className={`w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${
                      !meetingState.isVideoOn 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <i className={`ri-${meetingState.isVideoOn ? 'video' : 'video-off'}-line mr-2`}></i>
                    {meetingState.isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
                  </button>


                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPage;
