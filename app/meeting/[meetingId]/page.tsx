'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getMeetingInfo, joinMeeting, leaveMeeting, listParticipantsInMeeting, getScreenShareToken } from '@/shared/lib/candidates';
import { convertToIST, formatISTDateTime, getTimeUntilIST, isMeetingInFutureIST, isUserInIndia, formatUTCForUserRegion, msUntil } from '@/shared/lib/timezone';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack, ILocalVideoTrack } from 'agora-rtc-sdk-ng';

interface MeetingInfo {
  meetingId: string;
  title: string;
  status: string;
  currentParticipants: number;
  scheduledAt?: string;
  duration?: number;
  maxParticipants?: number;
  allowGuestJoin?: boolean;
  requireApproval?: boolean;
  participants?: Participant[];
}

interface Participant {
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  isActive: boolean;
}

interface AgoraToken {
  token: string;
  channelName: string;
  account: string;
  role: number;
  expirationTime: number;
  appId: string;
}

interface JoinMeetingResponse {
  success: boolean;
  data: {
    meeting: MeetingInfo;
    participant: Participant;
    agoraToken: AgoraToken;
    meetingUrl: string;
  };
}

export default function MeetingJoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId as string;
  const token = searchParams.get('token');

  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinResult, setJoinResult] = useState<JoinMeetingResponse | null>(null);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [isMeetingScheduled, setIsMeetingScheduled] = useState(false);

  const [joinForm, setJoinForm] = useState({
    name: '',
    email: '',
  });

  // Agora states
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);
  const [participantNames, setParticipantNames] = useState<{[uid: string]: string}>({});
  const [isStartingScreenShare, setIsStartingScreenShare] = useState(false);
  const [remoteVideoStates, setRemoteVideoStates] = useState<{[uid: string]: {hasVideo: boolean; hasAudio: boolean; hasScreenShare: boolean}}>({});
  const remoteVideoRefs = useRef<{[uid: string]: HTMLDivElement | null}>({});
  const remoteScreenRefs = useRef<{[uid: string]: HTMLDivElement | null}>({});
  // Track separate video tracks for camera and screen share per user
  const remoteUsersWithTracks = useRef<{[uid: string]: {cameraTrack?: any; screenTrack?: any; audioTrack?: any}}>({});

  // Refs for Agora
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const screenShareClientRef = useRef<IAgoraRTCClient | null>(null); // Separate client for screen sharing
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localScreenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localVideoElementRef = useRef<HTMLDivElement>(null);
  const localScreenElementRef = useRef<HTMLDivElement>(null);
  const mainClientUidRef = useRef<string | number | null>(null); // Store main client UID to derive screen share UID
  
  // Responsive layout management
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [stageHeight, setStageHeight] = useState<number>(0);
  const [gridColumns, setGridColumns] = useState<number>(2);
  const [tileHeight, setTileHeight] = useState<number>(220);
  const [overflowCount, setOverflowCount] = useState<number>(0);

  const setRemoteMicMuted = (uid: string | number, muted: boolean) => {
    const container = document.getElementById(`remote-video-container-${uid}`) as HTMLDivElement | null;
    if (!container) return;
    let badge = document.getElementById(`mic-badge-${uid}`) as HTMLDivElement | null;
    if (!badge) {
      badge = document.createElement('div');
      badge.id = `mic-badge-${uid}`;
      badge.className = 'absolute top-2 right-2 px-1 py-2 rounded-full text-xs text-white flex items-center gap-1';
      container.appendChild(badge);
    }
    badge.className = `absolute top-2 right-2 px-1 py-2 rounded-full text-xs text-white flex items-center gap-1 ${muted ? 'bg-red-600' : 'bg-green-600'}`;
    badge.innerHTML = muted
      ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 4a3 3 0 016 0v3a3 3 0 11-6 0V4zm8.707 9.293a1 1 0 10-1.414 1.414l1 1a1 1 0 001.414-1.414l-1-1zM3.293 3.293a1 1 0 011.414 0l12 12a1 1 0 01-1.414 1.414l-2.034-2.034A6.978 6.978 0 0111 16.917V19a1 1 0 11-2 0v-2.083A7.003 7.003 0 013 10a1 1 0 112 0 5 5 0 008.071 3.95l-1.42-1.42A3.001 3.001 0 017 10V8.414L3.293 4.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>'
      : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a3 3 0 00-3 3v3a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 10a5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.917V19a1 1 0 11-2 0v-2.083A7 7 0 013 10a1 1 0 112 0z"/></svg>';
  };

  const recomputeLayout = () => {
    const headerH = headerRef.current?.offsetHeight || 0;
    const footerH = footerRef.current?.offsetHeight || 0;
    const availableH = Math.max(0, window.innerHeight - headerH - footerH - 24);
    setStageHeight(availableH);

    const containerW = gridRef.current?.clientWidth || window.innerWidth;
    const minTileW = 300;
    const gap = 16; // tailwind gap-4
    const totalTiles = 1 + remoteUsers.length; // local + remotes
    // Limit columns to number of tiles so early joins use full width
    const possibleCols = Math.max(1, Math.floor((containerW + gap) / (minTileW + gap)));
    const columns = Math.min(totalTiles, possibleCols);
    setGridColumns(columns);

    const tileW = Math.floor((containerW - gap * (columns - 1)) / columns);
    const computedTileH = Math.floor(tileW * 9 / 16);
    const rows = Math.max(1, Math.floor((availableH + gap) / (computedTileH + gap)));
    setTileHeight(computedTileH);

    const capacity = columns * rows;
    const extra = Math.max(0, totalTiles - capacity);
    setOverflowCount(extra);

    // Apply tile heights to existing remote containers
    requestAnimationFrame(() => {
      // Check if screen sharing is active (local or remote)
      const hasRemoteScreenShare = remoteUsers.some((user: any) => {
        const uidStr = user.uid?.toString();
        const isScreenShareUid = uidStr && (
          (typeof user.uid === 'number' && user.uid > 1000000) ||
          (typeof uidStr === 'string' && uidStr.includes('-screen'))
        );
        const mainUid = mainClientUidRef.current;
        const isLocalUser = mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString());
        if (isScreenShareUid || isLocalUser) return false;
        const videoState = remoteVideoStates[user.uid] || { hasVideo: false, hasAudio: false, hasScreenShare: false };
        return videoState.hasScreenShare;
      });
      const hasAnyScreenShare = isScreenSharing || hasRemoteScreenShare;

      // If screen sharing is active, show all participants
      const showRemotes = hasAnyScreenShare ? remoteUsers.length : Math.max(0, capacity - 1);
      
      remoteUsers.forEach((u: any, index: number) => {
        const el = document.getElementById(`remote-video-container-${u.uid}`) as HTMLDivElement | null;
        if (el) {
          el.style.height = `${computedTileH}px`;
          el.style.display = index < showRemotes ? '' : 'none';
        }
      });
      
      // Remove overflow indicator and don't create it if screen sharing is active
      const overflowEl = document.getElementById('overflow-indicator');
      if (overflowEl) overflowEl.remove();
      if (extra > 0 && !hasAnyScreenShare && gridRef.current) {
        const badge = document.createElement('div');
        badge.id = 'overflow-indicator';
        badge.className = 'relative bg-gray-800 rounded-xl overflow-hidden shadow-lg flex items-center justify-center';
        badge.style.height = `${computedTileH}px`;
        const inner = document.createElement('div');
        inner.className = 'text-white text-lg font-semibold bg-black/50 px-3 py-2 rounded-full';
        inner.textContent = `+${extra} more`;
        badge.appendChild(inner);
        gridRef.current.appendChild(badge);
      }
      const localEl = document.getElementById('local-video-container') as HTMLDivElement | null;
      if (localEl) {
        localEl.style.height = `${computedTileH}px`;
      }
    });
  };

  useEffect(() => {
    const onResize = () => recomputeLayout();
    recomputeLayout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recomputeLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUsers.length, isScreenSharing]);

  // Calculate real-time participant count (excluding screen share UIDs and local user)
  const participantCount = useMemo(() => {
    const filteredRemoteUsers = remoteUsers.filter((user: any) => {
      const uidStr = user.uid?.toString();
      const isScreenShareUid = uidStr && (
        (typeof user.uid === 'number' && user.uid > 1000000) ||
        (typeof uidStr === 'string' && uidStr.includes('-screen'))
      );
      const mainUid = mainClientUidRef.current;
      const isLocalUser = mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString());
      return !isScreenShareUid && !isLocalUser;
    });
    return 1 + filteredRemoteUsers.length; // 1 for local user + remote users
  }, [remoteUsers]);

  // Update participant name displays when participantNames state changes
  useEffect(() => {
    remoteUsers.forEach((remoteUser: any) => {
      const uidStr = remoteUser.uid?.toString();
      const name = participantNames[uidStr] || participantNames[remoteUser.uid] || participantNames[remoteUser.account];
      if (name) {
        const nameOverlay = document.getElementById(`remote-name-${remoteUser.uid}`);
        if (nameOverlay) {
          nameOverlay.textContent = name;
        }
        const screenLabel = document.getElementById(`remote-screen-label-${remoteUser.uid}`);
        if (screenLabel) {
          screenLabel.textContent = `Screen Share - ${name}`;
        }
      }
    });
  }, [participantNames, remoteUsers]);

  // Attach video tracks to refs when they're ready
  useEffect(() => {
    remoteUsers.forEach((user: any) => {
      const videoState = remoteVideoStates[user.uid];
      if (!videoState) return;

      const userTracks = remoteUsersWithTracks.current[user.uid];
      
      // Play camera track if available
      if (videoState.hasVideo && userTracks?.cameraTrack) {
        const videoRef = remoteVideoRefs.current[user.uid];
        if (videoRef) {
          userTracks.cameraTrack.play(videoRef);
        }
      }
      
      // Play screen share track if available
      if (videoState.hasScreenShare && userTracks?.screenTrack) {
        const screenRef = remoteScreenRefs.current[user.uid];
        if (screenRef) {
          userTracks.screenTrack.play(screenRef);
        }
      }

      // Play audio track if available
      if (userTracks?.audioTrack) {
        userTracks.audioTrack.play();
      }
    });
  }, [remoteUsers, remoteVideoStates]);
  
  // Ensure local screen share preview attaches when the container mounts
  useEffect(() => {
    if (isScreenSharing && localScreenTrackRef.current && localScreenElementRef.current) {
      try {
        localScreenTrackRef.current.play(localScreenElementRef.current);
      } catch {}
    }
  }, [isScreenSharing]);

  useEffect(() => {
    if (meetingId && token) {
      fetchMeetingInfo();
    } else {
      setError('Invalid meeting link. Missing meeting ID or token.');
      setIsLoading(false);
    }
  }, [meetingId, token]);

  // Countdown timer effect
  useEffect(() => {
    if (!meetingInfo?.scheduledAt) return;

    const updateCountdown = () => {
      const timeDiff = msUntil(meetingInfo.scheduledAt!);

      if (timeDiff > 0) {
        setIsMeetingScheduled(true);
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        let countdown = '';
        if (days > 0) countdown += `${days}d `;
        if (hours > 0) countdown += `${hours}h `;
        if (minutes > 0) countdown += `${minutes}m `;
        countdown += `${seconds}s`;

        setTimeUntilStart(countdown);
      } else {
        setIsMeetingScheduled(false);
        setTimeUntilStart('');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [meetingInfo?.scheduledAt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.leave();
      }
      if (screenShareClientRef.current) {
        screenShareClientRef.current.leave();
        screenShareClientRef.current.removeAllListeners();
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
      }
      if (localScreenTrackRef.current) {
        localScreenTrackRef.current.close();
      }
    };
  }, []);

  const fetchMeetingInfo = async () => {
    try {
      const result = await getMeetingInfo(meetingId, token!);
      setMeetingInfo(result.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch meeting information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setJoinForm(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to get the correct participant name
  // Falls back to form data if backend returns wrong participant data
  const getParticipantDisplayName = () => {
    if (!joinResult) return joinForm.name || 'Participant';
    
    const backendName = joinResult.data.participant.name;
    const backendEmail = joinResult.data.participant.email;
    const userEmail = joinResult.data.agoraToken?.account || joinForm.email;
    
    // Check if backend returned the correct participant by matching email
    if (backendEmail && userEmail && backendEmail.toLowerCase() === userEmail.toLowerCase()) {
      return backendName || joinForm.name || 'Participant';
    }
    
    // If emails don't match, try to find the correct participant from the participants array
    const meetingData = joinResult.data.meeting as any;
    if (meetingData?.participants && Array.isArray(meetingData.participants)) {
      const correctParticipant = meetingData.participants.find(
        (p: any) => p.email && userEmail && p.email.toLowerCase() === userEmail.toLowerCase()
      );
      if (correctParticipant?.name) {
        return correctParticipant.name;
      }
    }
    
    // Fall back to form data if backend returns "Dummy" or wrong data
    if (!backendName || backendName.toLowerCase() === 'dummy' || backendEmail !== userEmail) {
      return joinForm.name || 'Participant';
    }
    
    return backendName;
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setError(null);

    try {
      const result = await joinMeeting(meetingId, {
        joinToken: token!,
        name: joinForm.name,
        email: joinForm.email,
      });
      setJoinResult(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join meeting');
    } finally {
      setIsJoining(false);
    }
  };

  const initializeAgoraCall = async () => {
    if (!joinResult?.data.agoraToken) return;

    try {
      const { agoraToken } = joinResult.data;
      
      // Request permissions first, and immediately stop the temporary stream
      try {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        permissionStream.getTracks().forEach((t) => t.stop());
      } catch (permissionError) {
        console.error('Permission denied:', permissionError);
        setError('Camera and microphone permissions are required for video calls.');
        return;
      }
      
      // Create Agora client
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      // Set up event handlers with client reference
      client.on('user-published', (user: any, mediaType: 'audio' | 'video') => {
        handleUserPublished(user, mediaType, client);
      });
      client.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
        handleUserUnpublished(user, mediaType, client);
      });
      client.on('user-left', (user: any) => {
        handleUserLeft(user, client);
      });

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localAudioTrackRef.current = audioTrack;
      localVideoTrackRef.current = videoTrack;
      
      console.log('Local tracks created:', {
        audioTrack: !!audioTrack,
        videoTrack: !!videoTrack,
        videoTrackEnabled: videoTrack.enabled
      });

      // Join the channel
      const uid = await client.join(agoraToken.appId, agoraToken.channelName, agoraToken.token, agoraToken.account);
      mainClientUidRef.current = uid; // Store the UID for screen share client
      
      // Publish local tracks
      await client.publish([audioTrack, videoTrack]);

      // Play local video
      if (localVideoElementRef.current) {
        videoTrack.play(localVideoElementRef.current);
        console.log('Local video track playing on element:', localVideoElementRef.current);
      } else {
        console.error('Local video element not found');
      }
      
      // Ensure video is visible after a short delay
      setTimeout(() => {
        if (localVideoElementRef.current && videoTrack) {
          console.log('Retrying local video play...');
          videoTrack.play(localVideoElementRef.current);
        }
      }, 1000);

      setIsVideoCallActive(true);
      console.log('Successfully joined Agora channel:', agoraToken.channelName);
      
      // Fetch participant names after joining
      await fetchParticipantNames();
    } catch (error) {
      console.error('Failed to initialize Agora call:', error);
      setError(`Failed to start video call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Fetch and map participant names from backend
  const fetchParticipantNames = async () => {
    try {
      const participantsData = await listParticipantsInMeeting(meetingId);
      const participants = participantsData?.data || participantsData || [];
      
      // Create a mapping of account/email/uid to participant info
      const nameMap: {[key: string]: string} = {};
      participants.forEach((p: any) => {
        const participantName = p.name || p.email || `Participant`;
        // Map by account (which might be email) or UID
        if (p.account) {
          nameMap[p.account] = participantName;
        }
        if (p.uid) {
          nameMap[p.uid] = participantName;
        }
        if (p.email) {
          nameMap[p.email] = participantName;
        }
        // Also map by string UID if it's a number
        if (p.uid && typeof p.uid === 'number') {
          nameMap[p.uid.toString()] = participantName;
        }
      });
      
      // Update participant names state
      setParticipantNames(prev => {
        const updated = { ...prev, ...nameMap };
        return updated;
      });
      
      // Update existing remote user displays after state update
      setTimeout(() => {
        setRemoteUsers((currentRemoteUsers: any[]) => {
          currentRemoteUsers.forEach((remoteUser: any) => {
            const name = nameMap[remoteUser.uid] || nameMap[remoteUser.uid?.toString()] || nameMap[remoteUser.account];
            if (name) {
              const nameOverlay = document.getElementById(`remote-name-${remoteUser.uid}`);
              if (nameOverlay) {
                nameOverlay.textContent = name;
              }
              const screenLabel = document.getElementById(`remote-screen-label-${remoteUser.uid}`);
              if (screenLabel) {
                screenLabel.textContent = `Screen Share - ${name}`;
              }
            }
          });
          return currentRemoteUsers;
        });
      }, 0);
    } catch (error) {
      console.error('Failed to fetch participant names:', error);
    }
  };

  const handleUserPublished = async (user: any, mediaType: 'audio' | 'video', sourceClient?: IAgoraRTCClient) => {
    // Declare variables at the top for use throughout the function
    const uidStr = user.uid?.toString();
    const isScreenShareUid = uidStr && (
      (typeof user.uid === 'number' && user.uid > 1000000) ||
      (typeof uidStr === 'string' && uidStr.includes('-screen'))
    );
    
    // Use the client that triggered the event, or determine based on UID pattern
    let client: IAgoraRTCClient | null = null;
    
    if (sourceClient) {
      // Use the client that triggered the event
      client = sourceClient;
    } else {
      // Fallback: determine which client to use based on UID pattern
      client = isScreenShareUid ? screenShareClientRef.current : clientRef.current;
    }
    
    if (!client) return;
    
    await client.subscribe(user, mediaType);
    
    // Fetch participant names when a new user publishes
    await fetchParticipantNames();
    
    if (mediaType === 'video') {
      // Check if this is a screen share by UID pattern or track label
      const isScreenShare = isScreenShareUid || 
        (user.videoTrack && user.videoTrack.trackLabel && 
         (user.videoTrack.trackLabel.includes('screen') || user.videoTrack.trackLabel.includes('display')));
      
      if (isScreenShare) {
        // This is a screen share track - find the corresponding camera UID
        let cameraUid: string | number | undefined;
        
        // Derive camera UID from screen share UID
        if (typeof user.uid === 'number' && user.uid > 1000000) {
          cameraUid = user.uid - 1000000;
        } else if (typeof uidStr === 'string' && uidStr.includes('-screen')) {
          cameraUid = uidStr.replace('-screen', '');
        }
        
        if (cameraUid !== undefined) {
          const cameraUidStr = cameraUid.toString();
          
          // Initialize tracks for camera UID if not exists
          if (!remoteUsersWithTracks.current[cameraUidStr]) {
            remoteUsersWithTracks.current[cameraUidStr] = {};
          }
          
          // Store screen share track under camera UID
          remoteUsersWithTracks.current[cameraUidStr].screenTrack = user.videoTrack;
          
          // Update state for the camera UID
          setRemoteVideoStates(prev => ({
            ...prev,
            [cameraUidStr]: {
              ...prev[cameraUidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
              hasScreenShare: true,
            }
          }));
        } else {
          // Fallback: treat as standalone screen share
          if (!remoteUsersWithTracks.current[uidStr]) {
            remoteUsersWithTracks.current[uidStr] = {};
          }
          remoteUsersWithTracks.current[uidStr].screenTrack = user.videoTrack;
          
          setRemoteVideoStates(prev => ({
            ...prev,
            [uidStr]: {
              ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
              hasScreenShare: true,
            }
          }));
        }
      } else {
        // This is a camera track
        if (!remoteUsersWithTracks.current[uidStr]) {
          remoteUsersWithTracks.current[uidStr] = {};
        }
        remoteUsersWithTracks.current[uidStr].cameraTrack = user.videoTrack;
        
        // Update state
        setRemoteVideoStates(prev => ({
          ...prev,
          [uidStr]: {
            ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
            hasVideo: true,
            hasScreenShare: !!remoteUsersWithTracks.current[uidStr]?.screenTrack,
            hasAudio: !!remoteUsersWithTracks.current[uidStr]?.audioTrack || !!user.audioTrack,
          }
        }));
      }
    }
    
    if (mediaType === 'audio') {
      // Audio always comes from the main client (camera UID)
      const uidStr = user.uid?.toString();
      if (!remoteUsersWithTracks.current[uidStr]) {
        remoteUsersWithTracks.current[uidStr] = {};
      }
      remoteUsersWithTracks.current[uidStr].audioTrack = user.audioTrack;
      
      user.audioTrack?.play();
      setRemoteMicMuted(user.uid, false);
      // Update audio state
      setRemoteVideoStates(prev => ({
        ...prev,
        [uidStr]: {
          ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
          hasAudio: true,
        }
      }));
    }
    
    // Update remote users list - ensure user exists with latest tracks
    // Skip screen share UIDs - they're already mapped to camera UIDs
    // Don't add screen share UIDs to remoteUsers - they're handled via camera UID mapping
    if (isScreenShareUid) {
      return;
    }
    
    // Also filter out the local user's own UID
    const mainUid = mainClientUidRef.current;
    if (mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString())) {
      return;
    }
    
    setRemoteUsers(prev => {
      const existing = prev.find(u => u.uid === user.uid);
      if (existing) {
        // Update existing user with latest tracks
        return prev.map(u => u.uid === user.uid ? { ...u, ...user } : u);
      } else {
        // Add new user
        return [...prev, user];
      }
    });
  };

  const handleUserUnpublished = (user: any, mediaType: 'audio' | 'video', sourceClient?: IAgoraRTCClient) => {
    if (mediaType === 'video') {
      const uidStr = user.uid?.toString();
      // Check if this is a screen share UID
      const isScreenShareUid = uidStr && (
        (typeof user.uid === 'number' && user.uid > 1000000) ||
        (typeof uidStr === 'string' && uidStr.includes('-screen'))
      );
      
      if (isScreenShareUid) {
        // This is a screen share track - find the corresponding camera UID
        let cameraUid: string | number | undefined;
        
        // Derive camera UID from screen share UID
        if (typeof user.uid === 'number' && user.uid > 1000000) {
          cameraUid = user.uid - 1000000;
        } else if (typeof uidStr === 'string' && uidStr.includes('-screen')) {
          cameraUid = uidStr.replace('-screen', '');
        }
        
        if (cameraUid !== undefined) {
          const cameraUidStr = cameraUid.toString();
          if (remoteUsersWithTracks.current[cameraUidStr]) {
            remoteUsersWithTracks.current[cameraUidStr].screenTrack = undefined;
          }
          
          // Update state for camera UID
          setRemoteVideoStates(prev => ({
            ...prev,
            [cameraUidStr]: {
              ...prev[cameraUidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
              hasScreenShare: false,
            }
          }));
        } else {
          // Fallback: treat as standalone screen share
          if (remoteUsersWithTracks.current[uidStr]) {
            remoteUsersWithTracks.current[uidStr].screenTrack = undefined;
          }
          
          setRemoteVideoStates(prev => ({
            ...prev,
            [uidStr]: {
              ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
              hasScreenShare: false,
            }
          }));
        }
      } else {
        // This is a camera track
        if (remoteUsersWithTracks.current[uidStr]) {
          remoteUsersWithTracks.current[uidStr].cameraTrack = undefined;
        }
        
        // Update state
        setRemoteVideoStates(prev => ({
          ...prev,
          [uidStr]: {
            ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
            hasVideo: false,
          }
        }));
      }
    }
    if (mediaType === 'audio') {
      const uidStr = user.uid?.toString();
      if (remoteUsersWithTracks.current[uidStr]) {
        remoteUsersWithTracks.current[uidStr].audioTrack = undefined;
      }
      setRemoteMicMuted(user.uid, true);
      // Update audio state
      setRemoteVideoStates(prev => ({
        ...prev,
        [uidStr]: {
          ...prev[uidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
          hasAudio: false,
        }
      }));
    }
  };

  const handleUserLeft = (user: any, sourceClient?: IAgoraRTCClient) => {
    const uidStr = user.uid?.toString();
    const isScreenShareUid = uidStr && (
      (typeof user.uid === 'number' && user.uid > 1000000) ||
      (typeof uidStr === 'string' && uidStr.includes('-screen'))
    );
    
    // If it's a screen share UID, find the corresponding camera UID and clean up
    if (isScreenShareUid) {
      let cameraUid: string | number | undefined;
      if (typeof user.uid === 'number' && user.uid > 1000000) {
        cameraUid = user.uid - 1000000;
      } else if (typeof uidStr === 'string' && uidStr.includes('-screen')) {
        cameraUid = uidStr.replace('-screen', '');
      }
      
      if (cameraUid !== undefined) {
        const cameraUidStr = cameraUid.toString();
        // Remove screen share from camera UID's state
        setRemoteVideoStates(prev => ({
          ...prev,
          [cameraUidStr]: {
            ...prev[cameraUidStr] || { hasVideo: false, hasAudio: false, hasScreenShare: false },
            hasScreenShare: false,
          }
        }));
        
        // Clean up screen share track
        if (remoteUsersWithTracks.current[cameraUidStr]) {
          remoteUsersWithTracks.current[cameraUidStr].screenTrack = undefined;
        }
        delete remoteScreenRefs.current[cameraUidStr];
      }
      return; // Don't remove screen share UID from remoteUsers (it was never added)
    }
    
    // For camera UIDs, remove from remoteUsers
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    setParticipantNames(prev => {
      const newNames = { ...prev };
      delete newNames[user.uid];
      return newNames;
    });
    setRemoteVideoStates(prev => {
      const newStates = { ...prev };
      delete newStates[user.uid];
      return newStates;
    });
    // Clean up refs and tracks
    delete remoteVideoRefs.current[user.uid];
    delete remoteScreenRefs.current[user.uid];
    delete remoteUsersWithTracks.current[user.uid];
  };

  const toggleMute = async () => {
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
      // Update local mic badge immediately
      const localBadge = document.getElementById('local-mic-badge');
      if (localBadge) {
        const nowMuted = !isMuted;
        localBadge.className = `absolute top-2 right-2 px-1 py-2 rounded-full text-xs text-white flex items-center gap-1 ${nowMuted ? 'bg-red-600' : 'bg-green-600'}`;
        localBadge.innerHTML = nowMuted
          ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 4a3 3 0 016 0v3a3 3 0 11-6 0V4zm8.707 9.293a1 1 0 10-1.414 1.414l1 1a1 1 0 001.414-1.414l-1-1zM3.293 3.293a1 1 0 011.414 0l12 12a1 1 0 01-1.414 1.414l-2.034-2.034A6.978 6.978 0 0111 16.917V19a1 1 0 11-2 0v-2.083A7.003 7.003 0 013 10a1 1 0 112 0 5 5 0 008.071 3.95l-1.42-1.42A3.001 3.001 0 017 10V8.414L3.293 4.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>'
          : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a3 3 0 00-3 3v3a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 10a5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.917V19a1 1 0 11-2 0v-2.083A7 7 0 013 10a1 1 0 112 0z"/></svg>';
      }
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
      console.log('Video toggled:', !isVideoOn);
    }
  };

  const startScreenShare = async () => {
    try {
      if (!clientRef.current || !joinResult?.data.agoraToken) return;
      if (isStartingScreenShare) return;
      setIsStartingScreenShare(true);

      // Create screen share track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 15,
        }
      }, 'disable');

      localScreenTrackRef.current = screenTrack;

      // Create a separate client for screen sharing
      // Use a different UID as per Agora docs (mainUid + 1000000 for numbers, or append '-screen' for strings)
      const { agoraToken } = joinResult.data;
      const mainUid = mainClientUidRef.current;
      
      if (!mainUid) {
        throw new Error('Main client UID not found');
      }
      
      // Derive screen share UID: if main UID is a number, add 1000000; if string, append '-screen'
      const screenShareUid = typeof mainUid === 'number' 
        ? mainUid + 1000000 
        : `${mainUid}-screen`;
      
      // Request a token for the screen share UID from the backend
      let screenShareToken: string;
      try {
        const screenShareTokenResponse = await getScreenShareToken(meetingId, {
          joinToken: token!,
          screenShareUid: screenShareUid,
          email: joinResult.data.participant.email,
        });
        
        // The response should contain an agoraToken with the token for screen share UID
        if (screenShareTokenResponse?.data?.agoraToken?.token) {
          screenShareToken = screenShareTokenResponse.data.agoraToken.token;
        } else if (screenShareTokenResponse?.agoraToken?.token) {
          screenShareToken = screenShareTokenResponse.agoraToken.token;
        } else {
          // Fallback: try to use the same token (might work if backend generates non-UID-bound tokens)
          screenShareToken = agoraToken.token;
          console.warn('Screen share token not found in response, using main token as fallback');
        }
      } catch (tokenError: any) {
        console.error('Failed to get screen share token:', tokenError);
        // Fallback: try to use the same token (might work if backend generates non-UID-bound tokens)
        screenShareToken = agoraToken.token;
        console.warn('Using main token as fallback for screen share');
      }
      
      const screenShareClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      screenShareClientRef.current = screenShareClient;

      // Set up event handlers for screen share client with client reference
      screenShareClient.on('user-published', (user: any, mediaType: 'audio' | 'video') => {
        handleUserPublished(user, mediaType, screenShareClient);
      });
      screenShareClient.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
        handleUserUnpublished(user, mediaType, screenShareClient);
      });
      screenShareClient.on('user-left', (user: any) => {
        handleUserLeft(user, screenShareClient);
      });

      // Join the same channel with the screen share client using different UID and token
      await screenShareClient.join(agoraToken.appId, agoraToken.channelName, screenShareToken, screenShareUid);

      // Publish screen share track using the separate client
      await screenShareClient.publish(screenTrack);

      // Mark sharing true to mount the preview container, then attach track
      setIsScreenSharing(true);

      // Defer play until the element is in the DOM
      setTimeout(() => {
        if (localScreenElementRef.current) {
          try { screenTrack.play(localScreenElementRef.current); } catch {}
        }
      }, 0);

      // Stop when user ends sharing from browser UI
      // @ts-ignore: Agora track emits "track-ended"
      screenTrack.on('track-ended', () => {
        stopScreenShare();
      });

      console.log('Screen sharing started successfully with separate client - camera track remains published');
    } catch (error: any) {
      const cancelled = error?.name === 'NotAllowedError' || error?.code === 'PERMISSION_DENIED' || error?.code === 'OPERATION_ABORTED';
      if (cancelled) {
        // User canceled the screen selection; stay in the call without elevating to a fatal error UI
        console.info('Screen sharing prompt was cancelled by the user.');
        setIsScreenSharing(false);
      } else {
        console.warn('Failed to start screen sharing:', error);
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        
        // Check if it's a token/auth error
        if (errorMessage.includes('token') || errorMessage.includes('authorized') || errorMessage.includes('CAN_NOT_GET_GATEWAY_SERVER')) {
          setError(`Failed to start screen sharing: Token authentication failed. The backend may need to generate tokens that support multiple UIDs for screen sharing.`);
        } else {
          setError(`Failed to start screen sharing: ${errorMessage}`);
        }
      }
    } finally {
      setIsStartingScreenShare(false);
    }
  };

  const stopScreenShare = async () => {
    try {
      if (localScreenTrackRef.current && screenShareClientRef.current) {
        // Unpublish screen share track
        await screenShareClientRef.current.unpublish(localScreenTrackRef.current);
        
        // Leave the screen share client channel
        await screenShareClientRef.current.leave();
        
        // Stop and close the track
        localScreenTrackRef.current.stop();
        localScreenTrackRef.current.close();
        localScreenTrackRef.current = null;
      }

      // Clean up screen share client
      if (screenShareClientRef.current) {
        screenShareClientRef.current.removeAllListeners();
        screenShareClientRef.current = null;
      }

      // Clear screen share element
      if (localScreenElementRef.current) {
        localScreenElementRef.current.innerHTML = '';
      }

      // Camera track remains published on main client - no need to re-publish
      setIsScreenSharing(false);
      console.log('Screen sharing stopped successfully - camera track remains published');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
    }
  };

  const leaveCall = async () => {
    setIsLeaving(true);
    
    try {
      // Call leaveMeeting API
      if (joinResult?.data?.participant?.email) {
        try {
          await leaveMeeting(meetingId, {
            email: joinResult.data.participant.email,
          });
        } catch (apiError) {
          console.error('Error calling leaveMeeting API:', apiError);
          // Continue with cleanup even if API call fails
        }
      }

      // Stop local tracks
      if (localAudioTrackRef.current) {
        try { await localAudioTrackRef.current.setEnabled(false); } catch {}
        try { localAudioTrackRef.current.stop(); } catch {}
        try { localAudioTrackRef.current.close(); } catch {}
      }
      if (localVideoTrackRef.current) {
        try { await localVideoTrackRef.current.setEnabled(false); } catch {}
        try { localVideoTrackRef.current.stop(); } catch {}
        try { localVideoTrackRef.current.close(); } catch {}
      }
      if (localScreenTrackRef.current) {
        try { localScreenTrackRef.current.stop(); } catch {}
        try { localScreenTrackRef.current.close(); } catch {}
      }

      // Leave channels
      if (clientRef.current) {
        await clientRef.current.leave();
      }
      if (screenShareClientRef.current) {
        await screenShareClientRef.current.leave();
        screenShareClientRef.current.removeAllListeners();
      }

      // Clean up remote video elements
      const remoteVideosContainer = document.getElementById('video-grid');
      if (remoteVideosContainer) {
        remoteVideosContainer.innerHTML = '';
      }

      // Clear local video element
      if (localVideoElementRef.current) {
        try { localVideoElementRef.current.innerHTML = ''; } catch {}
      }
      if (localScreenElementRef.current) {
        try { localScreenElementRef.current.innerHTML = ''; } catch {}
      }

      setIsVideoCallActive(false);
      setIsScreenSharing(false);
      setRemoteUsers([]);
      setParticipantNames({});

      // Null refs so GC can reclaim devices
      localAudioTrackRef.current = null;
      localVideoTrackRef.current = null;
      localScreenTrackRef.current = null;
      clientRef.current = null;
      screenShareClientRef.current = null;
      mainClientUidRef.current = null;
    } catch (error) {
      console.error('Error leaving call:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meeting information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (joinResult) {
    if (isVideoCallActive) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
          {/* Top Bar */}
          <div ref={headerRef} className="flex items-center justify-between px-6 py-3 bg-gray-800/80 backdrop-blur border-b border-gray-700">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold truncate">{joinResult.data.meeting.title}</h1>
              <p className="text-xs sm:text-sm text-gray-400 truncate">{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</p>
            </div>
            <button
              onClick={leaveCall}
              disabled={isLeaving}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md disabled:opacity-50"
            >
              <span className="hidden sm:inline">{isLeaving ? 'Leaving...' : 'Leave Call'}</span>
              <i className='ri-phone-fill text-lg' style={{ transform: 'rotate(135deg)' }}></i>
            </button>
          </div>

          {/* Stage */}
          {(() => {
            // Check if there are any remote screen shares
            const hasRemoteScreenShare = remoteUsers.some((user: any) => {
              const uidStr = user.uid?.toString();
              const isScreenShareUid = uidStr && (
                (typeof user.uid === 'number' && user.uid > 1000000) ||
                (typeof uidStr === 'string' && uidStr.includes('-screen'))
              );
              const mainUid = mainClientUidRef.current;
              const isLocalUser = mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString());
              if (isScreenShareUid || isLocalUser) return false;
              const videoState = remoteVideoStates[user.uid] || { hasVideo: false, hasAudio: false, hasScreenShare: false };
              return videoState.hasScreenShare;
            });
            const hasAnyScreenShare = isScreenSharing || hasRemoteScreenShare;
            
            return (
              <div className={`${hasAnyScreenShare && 'md:flex md:gap-4'} flex-1 px-4 sm:px-6 py-4`} style={{ height: stageHeight ? `${stageHeight}px` : undefined, overflow: 'hidden' }}>
                {/* Screen Shares Section - Show all screen shares (local and remote) */}
                {(isScreenSharing || hasRemoteScreenShare) && (
                  <div className={`${hasAnyScreenShare && 'md:w-2/3'} flex flex-col gap-4 mb-4 md:mb-0`}>
                    {/* Local Screen Share */}
                    {isScreenSharing && (
                      <div className="relative bg-gray-800 rounded-xl overflow-hidden w-full h-full shadow-lg">
                        <div ref={localScreenElementRef} className="w-full h-full bg-gray-700" style={{ objectFit: 'contain' }}/>
                        <div className="absolute top-2 left-2 bg-red-600/90 px-2 py-1 rounded-lg text-xs sm:text-sm text-white font-medium">
                          Your Screen Share
                        </div>
                      </div>
                    )}

                    {/* Remote Screen Shares */}
                    {remoteUsers
                      .filter((user: any) => {
                        const uidStr = user.uid?.toString();
                        const isScreenShareUid = uidStr && (
                          (typeof user.uid === 'number' && user.uid > 1000000) ||
                          (typeof uidStr === 'string' && uidStr.includes('-screen'))
                        );
                        const mainUid = mainClientUidRef.current;
                        const isLocalUser = mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString());
                        return !isScreenShareUid && !isLocalUser;
                      })
                      .filter((user: any) => {
                        const videoState = remoteVideoStates[user.uid] || { hasVideo: false, hasAudio: false, hasScreenShare: false };
                        return videoState.hasScreenShare;
                      })
                      .map((user: any) => {
                        const uidStr = user.uid?.toString();
                        const videoState = remoteVideoStates[user.uid] || { hasVideo: false, hasAudio: false, hasScreenShare: false };
                        const participantName = participantNames[uidStr] || participantNames[user.uid] || participantNames[user.account] || `Participant ${user.uid}`;
                        
                        return (
                          <div key={`screen-${user.uid}`} id={`remote-screen-container-${user.uid}`}
                            className="relative bg-gray-800 rounded-xl overflow-hidden w-full h-full shadow-lg"
                          >
                            <div ref={(el) => { remoteScreenRefs.current[user.uid] = el; }}
                              id={`remote-screen-${user.uid}`} className="w-full h-full bg-gray-700"
                              style={{ objectFit: 'contain' }}
                            />
                            <div id={`remote-screen-label-${user.uid}`}
                              className="absolute top-2 left-2 bg-red-600/90 px-2 py-1 rounded-lg text-xs sm:text-sm text-white font-medium"
                            >
                              Screen Share - {participantName}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Video Grid - Only camera feeds */}
                <div className={`${hasAnyScreenShare && 'md:w-1/3'} flex-1 ${hasAnyScreenShare ? 'overflow-auto' : ''}`}>
                  <div id="video-grid" ref={gridRef}
                    className={`md:${hasAnyScreenShare && participantCount > 2 ? 'grid-cols-2' : hasAnyScreenShare ?'grid-cols-1' : participantCount === 1 ? 'grid-cols-1' : participantCount === 3 || participantCount === 6 || participantCount === 5 ? 'grid-cols-3' : participantCount === 7 || participantCount === 8 ? 'grid-cols-4' : 'grid-cols-2'} grid gap-4 w-full`}
                  >
                    {/* Local camera tile */}
                    <div id="local-video-container" className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video w-full max-h-[80vh]">
                      <div
                        ref={localVideoElementRef}
                        className="w-full h-full bg-gray-700"
                        style={{ objectFit: 'cover' }}
                      />
                      <div id="local-mic-badge" className={`absolute top-2 right-2 py-2 px-1 rounded-full text-xs text-white flex items-center gap-1 ${isMuted ? 'bg-red-600' : 'bg-green-600'}`}>
                        {isMuted ? (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 4a3 3 0 016 0v3a3 3 0 11-6 0V4zm8.707 9.293a1 1 0 10-1.414 1.414l1 1a1 1 0 001.414-1.414l-1-1zM3.293 3.293a1 1 0 011.414 0l12 12a1 1 0 01-1.414 1.414l-2.034-2.034A6.978 6.978 0 0111 16.917V19a1 1 0 11-2 0v-2.083A7.003 7.003 0 013 10a1 1 0 112 0 5 5 0 008.071 3.95l-1.42-1.42A3.001 3.001 0 017 10V8.414L3.293 4.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                            {/* <span>Muted</span> */}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a3 3 0 00-3 3v3a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 10a5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.917V19a1 1 0 11-2 0v-2.083A7 7 0 013 10a1 1 0 112 0z"/></svg>
                            {/* <span>On</span> */}
                          </>
                        )}
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded-lg text-xs sm:text-sm">
                        {getParticipantDisplayName()} (You)
                      </div>
                      {!isVideoOn && (
                        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                          <div className="text-center text-gray-200">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            <p className="text-sm">Camera Off</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remote camera video containers - only camera feeds, no screen shares */}
                    {remoteUsers
                      .filter((user: any) => {
                        // Filter out screen share UIDs and local user's own UID
                        const uidStr = user.uid?.toString();
                        const isScreenShareUid = uidStr && (
                          (typeof user.uid === 'number' && user.uid > 1000000) ||
                          (typeof uidStr === 'string' && uidStr.includes('-screen'))
                        );
                        const mainUid = mainClientUidRef.current;
                        const isLocalUser = mainUid && (user.uid === mainUid || user.uid?.toString() === mainUid.toString());
                        
                        return !isScreenShareUid && !isLocalUser;
                      })
                      .map((user: any) => {
                        const uidStr = user.uid?.toString();
                        const videoState = remoteVideoStates[user.uid] || { hasVideo: false, hasAudio: false, hasScreenShare: false };
                        const participantName = participantNames[uidStr] || participantNames[user.uid] || participantNames[user.account] || `Participant ${user.uid}`;
                        const isAudioOn = videoState.hasAudio && !remoteUsers.find((u: any) => u.uid === user.uid && !u.audioTrack);

                        return (
                          <div
                            key={`video-${user.uid}`} 
                            id={`remote-video-container-${user.uid}`}
                            className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video w-full max-h-[80vh]"
                          >
                            {videoState.hasVideo ? (
                              <div ref={(el) => { remoteVideoRefs.current[user.uid] = el; }} id={`remote-video-${user.uid}`}
                                className="w-full h-full bg-gray-700"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                  </div>
                                  <div className="text-lg font-medium">{participantName}</div>
                                  <div className="text-sm text-gray-300 mt-1">Camera Off</div>
                                </div>
                              </div>
                            )}
                            <div id={`remote-name-${user.uid}`}
                              className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded-lg text-xs sm:text-sm text-white"
                            >
                              {participantName}
                            </div>
                            <div id={`mic-badge-${user.uid}`}
                              className={`absolute top-2 right-2 px-1 py-2 rounded-full text-xs text-white flex items-center gap-1 ${isAudioOn ? 'bg-green-600' : 'bg-red-600'}`}
                            >
                              {isAudioOn ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 2a3 3 0 00-3 3v3a3 3 0 006 0V5a3 3 0 00-3-3z"/>
                                  <path d="M5 10a5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.917V19a1 1 0 11-2 0v-2.083A7 7 0 013 10a1 1 0 112 0z"/>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 4a3 3 0 016 0v3a3 3 0 11-6 0V4zm8.707 9.293a1 1 0 10-1.414 1.414l1 1a1 1 0 001.414-1.414l-1-1zM3.293 3.293a1 1 0 011.414 0l12 12a1 1 0 01-1.414 1.414l-2.034-2.034A6.978 6.978 0 0111 16.917V19a1 1 0 11-2 0v-2.083A7.003 7.003 0 013 10a1 1 0 112 0 5 5 0 008.071 3.95l-1.42-1.42A3.001 3.001 0 017 10V8.414L3.293 4.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Bottom Controls (Meet-like pill) */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="mx-auto w-full flex justify-center">
              <div className="inline-flex items-center gap-3 bg-gray-800/90 border border-gray-700 rounded-full px-3 sm:px-4 py-2 shadow-xl">
                <button
                  onClick={toggleMute}
                  className={`px-4 py-1.5 rounded-full transition ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`px-4 py-1.5 rounded-full transition ${!isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoOn ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  disabled={isStartingScreenShare}
                  className={`px-4 py-1.5 rounded-full transition ${isStartingScreenShare ? 'opacity-50 cursor-not-allowed bg-gray-700' : isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isScreenSharing ? 'Stop presenting' : 'Present now'}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2h-5v1h3a1 1 0 010 2H6a1 1 0 110-2h3v-1H4a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
                  </svg>
                </button>

                <button onClick={leaveCall} disabled={isLeaving}
                  className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  title="Leave call"
                >
                  <i className='ri-phone-fill text-lg' style={{ transform: 'rotate(135deg)' }}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Successfully Joined!</h2>
            <p className="text-gray-600">You are now connected to the meeting.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting</label>
              <p className="text-lg font-semibold text-gray-900">{joinResult.data.meeting.title}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <p className="text-gray-900">{getParticipantDisplayName()}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {joinResult.data.participant.role}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Participants</label>
              <p className="text-gray-900">{joinResult.data.meeting.currentParticipants}</p>
            </div>
          </div>

          <button
            onClick={initializeAgoraCall}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Start Video Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Meeting</h1>
          <p className="text-gray-600">Enter your details to join the meeting</p>
        </div>

        {meetingInfo && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">{meetingInfo.title}</h3>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Status: {meetingInfo.status}</span>
              <span>Participants: {meetingInfo.currentParticipants}</span>
            </div>
            
            {isMeetingScheduled && meetingInfo.scheduledAt && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Meeting starts in:</p>
                    <p className="text-lg font-bold text-yellow-900">{timeUntilStart}</p>
                    <p className="text-xs text-yellow-700">
                      Scheduled for: {isUserInIndia() ? formatISTDateTime(meetingInfo.scheduledAt) : formatUTCForUserRegion(meetingInfo.scheduledAt)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleJoinMeeting} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={joinForm.name}
              onChange={handleJoinFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={joinForm.email}
              onChange={handleJoinFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email address"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining || isMeetingScheduled}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : isMeetingScheduled ? 'Meeting Not Started Yet' : 'Join Meeting'}
          </button>
        </form>
      </div>
    </div>
  );
}
