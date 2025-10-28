'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getMeetingInfo, joinMeeting } from '@/shared/lib/candidates';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

interface MeetingInfo {
  meetingId: string;
  title: string;
  status: string;
  currentParticipants: number;
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

  const [joinForm, setJoinForm] = useState({
    name: '',
    email: '',
  });

  // Agora states
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);
  const [participantNames, setParticipantNames] = useState<{[uid: string]: string}>({});

  // Refs for Agora
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (meetingId && token) {
      fetchMeetingInfo();
    } else {
      setError('Invalid meeting link. Missing meeting ID or token.');
      setIsLoading(false);
    }
  }, [meetingId, token]);

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
      
      // Request permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
      // Create container for remote video with name overlay
      const videoContainer = document.createElement('div');
      videoContainer.id = `remote-video-container-${user.uid}`;
      videoContainer.className = 'relative bg-gray-800 rounded-lg overflow-hidden';
      videoContainer.style.width = '100%';
      videoContainer.style.height = '256px';
      
      // Create video element
      const remoteVideoElement = document.createElement('div');
      remoteVideoElement.id = `remote-video-${user.uid}`;
      remoteVideoElement.className = 'w-full h-full bg-gray-700';
      remoteVideoElement.style.objectFit = 'cover';
      
      // Create name overlay
      const nameOverlay = document.createElement('div');
      nameOverlay.id = `remote-name-${user.uid}`;
      nameOverlay.className = 'absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm text-white';
      nameOverlay.textContent = `Participant ${user.uid}`; // Default name, will be updated if we have the actual name
      
      // Assemble the container
      videoContainer.appendChild(remoteVideoElement);
      videoContainer.appendChild(nameOverlay);
      
      // Add to the grid
      document.getElementById('remote-videos')?.appendChild(videoContainer);
      
      // Play the video
      user.videoTrack?.play(remoteVideoElement);
      
      // Update participant names if we have the user's name
      if (user.name) {
        setParticipantNames(prev => ({
          ...prev,
          [user.uid]: user.name
        }));
        nameOverlay.textContent = user.name;
      }
    }
    
    if (mediaType === 'audio') {
      user.audioTrack?.play();
    }
    
    setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
  };

  const handleUserUnpublished = (user: any, mediaType: 'audio' | 'video') => {
    if (mediaType === 'video') {
      const videoContainer = document.getElementById(`remote-video-container-${user.uid}`);
      videoContainer?.remove();
    }
  };

  const handleUserLeft = (user: any) => {
    const videoContainer = document.getElementById(`remote-video-container-${user.uid}`);
    videoContainer?.remove();
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
    }
  };

  const toggleVideo = async () => {
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
      console.log('Video toggled:', !isVideoOn);
    }
  };

  const leaveCall = async () => {
    setIsLeaving(true);
    
    try {
      // Stop local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }

      // Leave channel
      if (clientRef.current) {
        await clientRef.current.leave();
      }

      // Clean up remote video elements
      const remoteVideosContainer = document.getElementById('remote-videos');
      if (remoteVideosContainer) {
        remoteVideosContainer.innerHTML = '';
      }

      setIsVideoCallActive(false);
      setRemoteUsers([]);
      setParticipantNames({});
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
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <div className="bg-gray-800 p-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold">{joinResult.data.meeting.title}</h1>
              <p className="text-sm text-gray-400">
                {joinResult.data.participant.name} • {remoteUsers.length + 1} participants
              </p>
            </div>
            <button
              onClick={leaveCall}
              disabled={isLeaving}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md disabled:opacity-50"
            >
              {isLeaving ? 'Leaving...' : 'Leave Call'}
            </button>
          </div>

          {/* Video Grid */}
          <div className="flex-1 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden">
                <div
                  ref={localVideoElementRef}
                  className="w-full h-64 bg-gray-700"
                  style={{ 
                    minHeight: '256px',
                    objectFit: 'cover'
                  }}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  {joinResult.data.participant.name} (You)
                </div>
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-gray-600 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      <p className="text-sm">Camera Off</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remote Videos */}
              <div id="remote-videos" className="contents" />
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 p-4">
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.794L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.794a1 1 0 011.617.794zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${!isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                {isVideoOn ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>

              <button
                onClick={leaveCall}
                disabled={isLeaving}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
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
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Status: {meetingInfo.status}</span>
              <span>Participants: {meetingInfo.currentParticipants}</span>
            </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            disabled={isJoining}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : 'Join Meeting'}
          </button>
        </form>
      </div>
    </div>
  );
}
