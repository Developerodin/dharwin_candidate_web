'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getMeetingInfo, joinMeeting } from '@/shared/lib/candidates';
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

  // Refs for Agora
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localScreenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localVideoElementRef = useRef<HTMLDivElement>(null);
  const localScreenElementRef = useRef<HTMLDivElement>(null);
  const wasCameraPublishedBeforeShareRef = useRef<boolean>(false);
  
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
      badge.className = 'absolute top-2 right-2 px-2 py-1 rounded text-xs text-white flex items-center gap-1';
      container.appendChild(badge);
    }
    badge.className = `absolute top-2 right-2 px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${muted ? 'bg-red-600' : 'bg-green-600'}`;
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
      const showRemotes = Math.max(0, capacity - 1);
      remoteUsers.forEach((u: any, index: number) => {
        const el = document.getElementById(`remote-video-container-${u.uid}`) as HTMLDivElement | null;
        if (el) {
          el.style.minWidth = `${minTileW}px`;
          el.style.height = `${computedTileH}px`;
          el.style.display = index < showRemotes ? '' : 'none';
        }
      });
      const overflowEl = document.getElementById('overflow-indicator');
      if (overflowEl) overflowEl.remove();
      if (extra > 0 && gridRef.current) {
        const badge = document.createElement('div');
        badge.id = 'overflow-indicator';
        badge.className = 'relative bg-gray-800 rounded-xl overflow-hidden shadow-lg flex items-center justify-center';
        badge.style.minWidth = `${minTileW}px`;
        badge.style.height = `${computedTileH}px`;
        const inner = document.createElement('div');
        inner.className = 'text-white text-lg font-semibold bg-black/50 px-3 py-2 rounded-full';
        inner.textContent = `+${extra} more`;
        badge.appendChild(inner);
        gridRef.current.appendChild(badge);
      }
      const localEl = document.getElementById('local-video-container') as HTMLDivElement | null;
      if (localEl) {
        localEl.style.minWidth = `${minTileW}px`;
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

      // Set up event handlers
      client.on('user-published', handleUserPublished);
      client.on('user-unpublished', handleUserUnpublished);
      client.on('user-left', handleUserLeft);

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
      await client.join(agoraToken.appId, agoraToken.channelName, agoraToken.token, agoraToken.account);
      
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
    } catch (error) {
      console.error('Failed to initialize Agora call:', error);
      setError(`Failed to start video call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUserPublished = async (user: any, mediaType: 'audio' | 'video') => {
    await clientRef.current?.subscribe(user, mediaType);
    
    if (mediaType === 'video') {
      // Check if this is a screen share (Agora uses different track types)
      const isScreenShare = user.videoTrack && user.videoTrack.trackLabel && 
        (user.videoTrack.trackLabel.includes('screen') || user.videoTrack.trackLabel.includes('display'));
      
      if (isScreenShare) {
        // Handle screen share
        const screenContainerId = `remote-screen-container-${user.uid}`;
        let screenContainer = document.getElementById(screenContainerId) as HTMLDivElement | null;
        if (!screenContainer) {
          screenContainer = document.createElement('div');
          screenContainer.id = screenContainerId;
          screenContainer.className = 'relative bg-gray-800 rounded-lg overflow-hidden col-span-full';
          screenContainer.style.width = '100%';
          screenContainer.style.height = '400px';
          screenContainer.style.maxWidth = '800px';
          screenContainer.style.margin = '0 auto';
          document.getElementById('video-grid')?.appendChild(screenContainer);
        } else {
          screenContainer.innerHTML = '';
        }

        // Create screen share element
        const remoteScreenElement = document.createElement('div');
        remoteScreenElement.id = `remote-screen-${user.uid}`;
        remoteScreenElement.className = 'w-full h-full bg-gray-700';
        remoteScreenElement.style.objectFit = 'contain';

        // Screen share label
        const screenLabel = document.createElement('div');
        screenLabel.id = `remote-screen-label-${user.uid}`;
        screenLabel.className = 'absolute top-2 left-2 bg-red-600 bg-opacity-90 px-2 py-1 rounded text-sm text-white font-medium';
        screenLabel.textContent = `Screen Share - ${participantNames[user.uid] || `Participant ${user.uid}`}`;

        // Assemble and play
        screenContainer.appendChild(remoteScreenElement);
        screenContainer.appendChild(screenLabel);
        user.videoTrack?.play(remoteScreenElement);
      } else {
        // Handle regular video
        const containerId = `remote-video-container-${user.uid}`;
        let videoContainer = document.getElementById(containerId) as HTMLDivElement | null;
        if (!videoContainer) {
          videoContainer = document.createElement('div');
          videoContainer.id = containerId;
          videoContainer.className = 'relative bg-gray-800 rounded-xl overflow-hidden shadow-lg';
          videoContainer.style.width = '100%';
          document.getElementById('video-grid')?.appendChild(videoContainer);
        } else {
          // Clear any existing placeholder/previous elements
          videoContainer.innerHTML = '';
        }

        // Create (or recreate) the target element for video track
        const remoteVideoElement = document.createElement('div');
        remoteVideoElement.id = `remote-video-${user.uid}`;
        remoteVideoElement.className = 'w-full h-full bg-gray-700';
        remoteVideoElement.style.objectFit = 'cover';

        // Name overlay
        const nameOverlay = document.createElement('div');
        nameOverlay.id = `remote-name-${user.uid}`;
        nameOverlay.className = 'absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm text-white';
        nameOverlay.textContent = `Participant ${user.uid}`;

        // Mic badge (initialize from current audio state if available)
        const micBadge = document.createElement('div');
        micBadge.id = `mic-badge-${user.uid}`;
        const isAudioOn = !!user.audioTrack; // best-effort: presence implies unmuted
        micBadge.className = `absolute top-2 right-2 px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${isAudioOn ? 'bg-green-600' : 'bg-red-600'}`;
        micBadge.innerHTML = isAudioOn
          ? '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a3 3 0 00-3 3v3a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 10a5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.917V19a1 1 0 11-2 0v-2.083A7 7 0 013 10a1 1 0 112 0z"/></svg>'
          : '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 4a3 3 0 016 0v3a3 3 0 11-6 0V4zm8.707 9.293a1 1 0 10-1.414 1.414l1 1a1 1 0 001.414-1.414l-1-1zM3.293 3.293a1 1 0 011.414 0l12 12a1 1 0 01-1.414 1.414l-2.034-2.034A6.978 6.978 0 0111 16.917V19a1 1 0 11-2 0v-2.083A7.003 7.003 0 013 10a1 1 0 112 0 5 5 0 008.071 3.95l-1.42-1.42A3.001 3.001 0 017 10V8.414L3.293 4.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';

        // Assemble and play
        videoContainer.appendChild(remoteVideoElement);
        videoContainer.appendChild(nameOverlay);
        videoContainer.appendChild(micBadge);
        user.videoTrack?.play(remoteVideoElement);

        // Update display name if available
        if (user.name) {
          setParticipantNames(prev => ({ ...prev, [user.uid]: user.name }));
          nameOverlay.textContent = user.name;
        }
      }
    }
    
    if (mediaType === 'audio') {
      user.audioTrack?.play();
      setRemoteMicMuted(user.uid, false);
    }
    
    setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
  };

  const handleUserUnpublished = (user: any, mediaType: 'audio' | 'video') => {
    if (mediaType === 'video') {
      // Check if this was a screen share
      const screenContainer = document.getElementById(`remote-screen-container-${user.uid}`);
      if (screenContainer) {
        // Remove screen share container completely
        screenContainer.remove();
        return;
      }

      // Handle regular video
      const videoContainer = document.getElementById(`remote-video-container-${user.uid}`);
      if (videoContainer) {
        // Clear the video element but keep the container
        const videoElement = document.getElementById(`remote-video-${user.uid}`);
        if (videoElement) {
          videoElement.innerHTML = '';
          
          // Create placeholder content
          const placeholder = document.createElement('div');
          placeholder.className = 'w-full h-full bg-gray-700 flex items-center justify-center';
          
          const content = document.createElement('div');
          content.className = 'text-center text-white';
          
          // Avatar icon
          const avatar = document.createElement('div');
          avatar.className = 'w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center mx-auto mb-3';
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('fill', 'currentColor');
          svg.setAttribute('class', 'w-8 h-8 text-gray-300');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
          svg.appendChild(path);
          avatar.appendChild(svg);
          
          // Participant name
          const name = document.createElement('div');
          name.className = 'text-lg font-medium';
          name.textContent = participantNames[user.uid] || `Participant ${user.uid}`;
          
          // Camera off text
          const status = document.createElement('div');
          status.className = 'text-sm text-gray-300 mt-1';
          status.textContent = 'Camera Off';
          
          content.appendChild(avatar);
          content.appendChild(name);
          content.appendChild(status);
          placeholder.appendChild(content);
          
          videoElement.appendChild(placeholder);
        }
      }
    }
    if (mediaType === 'audio') {
      setRemoteMicMuted(user.uid, true);
    }
  };

  const handleUserLeft = (user: any) => {
    const videoContainer = document.getElementById(`remote-video-container-${user.uid}`);
    const screenContainer = document.getElementById(`remote-screen-container-${user.uid}`);
    
    videoContainer?.remove();
    screenContainer?.remove();
    
    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    setParticipantNames(prev => {
      const newNames = { ...prev };
      delete newNames[user.uid];
      return newNames;
    });
  };

  const toggleMute = async () => {
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setEnabled(isMuted);
      setIsMuted(!isMuted);
      // Update local mic badge immediately
      const localBadge = document.getElementById('local-mic-badge');
      if (localBadge) {
        const nowMuted = !isMuted;
        localBadge.className = `absolute top-2 right-2 px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${nowMuted ? 'bg-red-600' : 'bg-green-600'}`;
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
      if (!clientRef.current) return;
      if (isStartingScreenShare) return;
      setIsStartingScreenShare(true);

      // Create screen share track via Agora only (single prompt)
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: {
          width: 1280,
          height: 720,
          frameRate: 15,
        }
      }, 'disable');

      localScreenTrackRef.current = screenTrack;

      // Unpublish camera video before publishing screen to avoid multiple video tracks
      if (clientRef.current && localVideoTrackRef.current) {
        try {
          await clientRef.current.unpublish(localVideoTrackRef.current);
          wasCameraPublishedBeforeShareRef.current = true;
        } catch {}
      }

      // Publish screen share track
      if (clientRef.current) {
        await clientRef.current.publish(screenTrack);
      }

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

      console.log('Screen sharing started successfully');
    } catch (error: any) {
      const cancelled = error?.name === 'NotAllowedError' || error?.code === 'PERMISSION_DENIED' || error?.code === 'OPERATION_ABORTED';
      if (cancelled) {
        // User canceled the screen selection; stay in the call without elevating to a fatal error UI
        console.info('Screen sharing prompt was cancelled by the user.');
        setIsScreenSharing(false);
      } else {
        console.warn('Failed to start screen sharing:', error);
        setError(`Failed to start screen sharing: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsStartingScreenShare(false);
    }
  };

  const stopScreenShare = async () => {
    try {
      if (localScreenTrackRef.current && clientRef.current) {
        // Unpublish screen share track
        await clientRef.current.unpublish(localScreenTrackRef.current);
        
        // Stop and close the track
        localScreenTrackRef.current.stop();
        localScreenTrackRef.current.close();
        localScreenTrackRef.current = null;
      }

      // Clear screen share element
      if (localScreenElementRef.current) {
        localScreenElementRef.current.innerHTML = '';
      }

      // Re-publish camera video if it was previously published
      if (clientRef.current && localVideoTrackRef.current && wasCameraPublishedBeforeShareRef.current) {
        try {
          await clientRef.current.publish(localVideoTrackRef.current);
          if (localVideoElementRef.current) {
            try { localVideoTrackRef.current.play(localVideoElementRef.current); } catch {}
          }
        } catch {}
        wasCameraPublishedBeforeShareRef.current = false;
      }

      setIsScreenSharing(false);
      console.log('Screen sharing stopped successfully');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
    }
  };

  const leaveCall = async () => {
    setIsLeaving(true);
    
    try {
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

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave();
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
              <p className="text-xs sm:text-sm text-gray-400 truncate">{joinResult.data.participant.name} • {remoteUsers.length + 1} participants</p>
            </div>
            <button
              onClick={leaveCall}
              disabled={isLeaving}
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md disabled:opacity-50"
            >
              <span className="hidden sm:inline">{isLeaving ? 'Leaving...' : 'Leave Call'}</span>
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Stage */}
          <div className="flex-1 px-4 sm:px-6 py-4" style={{ height: stageHeight ? `${stageHeight}px` : undefined, overflow: 'hidden' }}>
            {/* Local Screen Share (optional stage) */}
            {isScreenSharing && (
              <div className="relative bg-gray-800 rounded-xl overflow-hidden w-full max-w-none mb-4 shadow-lg">
                <div
                  ref={localScreenElementRef}
                  className="w-full bg-gray-700"
                  style={{ minHeight: '360px', height: '45vh', objectFit: 'contain' }}
                />
                <div className="absolute top-2 left-2 bg-red-600/90 px-2 py-1 rounded text-xs sm:text-sm text-white font-medium">
                  Your Screen Share
                </div>
              </div>
            )}

            {/* Full-width/height responsive grid */}
            <div className="w-full h-full">
              <div
                id="video-grid"
                ref={gridRef}
                className="grid gap-4 w-full h-full overflow-hidden"
                style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(300px, 1fr))` }}
              >
                {/* Local camera tile */}
                <div id="local-video-container" className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg aspect-video">
                  <div
                    ref={localVideoElementRef}
                    className="w-full h-full bg-gray-700"
                    style={{ objectFit: 'cover' }}
                  />
                    <div id="local-mic-badge" className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white flex items-center gap-1 ${isMuted ? 'bg-red-600' : 'bg-green-600'}`}>
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
                  <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs sm:text-sm">
                    {joinResult.data.participant.name} (You)
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

                {/* Remote containers appended by handlers */}
              </div>
            </div>
          </div>

          {/* Bottom Controls (Meet-like pill) */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="mx-auto w-full flex justify-center">
              <div className="inline-flex items-center gap-3 bg-gray-800/90 border border-gray-700 rounded-full px-3 sm:px-4 py-2 shadow-xl">
                <button
                  onClick={toggleMute}
                  className={`p-2 sm:p-3 rounded-full transition ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
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
                  className={`p-2 sm:p-3 rounded-full transition ${!isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoOn ? (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                  disabled={isStartingScreenShare}
                  className={`p-2 sm:p-3 rounded-full transition ${isStartingScreenShare ? 'opacity-50 cursor-not-allowed bg-gray-700' : isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isScreenSharing ? 'Stop presenting' : 'Present now'}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2h-5v1h3a1 1 0 010 2H6a1 1 0 110-2h3v-1H4a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h10a1 1 0 100-2H5z" clipRule="evenodd" />
                  </svg>
                </button>

                <button
                  onClick={leaveCall}
                  disabled={isLeaving}
                  className="p-2 sm:p-3 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  title="Leave call"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
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
              <p className="text-gray-900">{joinResult.data.participant.name}</p>
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
