"use client"

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getMeetingInfo, getMeetingById, joinMeeting } from '@/shared/lib/candidates';

const isScreenSharing = false;

const formatScheduledDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const formattedMinutes = minutes.toString().padStart(2, '0');
  const formattedSeconds = seconds.toString().padStart(2, '0');
  
  return `${day} ${month} ${year} at ${hours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
};

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingId = params?.meetingId as string;
  const token = searchParams?.get('token') || '';

  const [meetingData, setMeetingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [isMeetingStarted, setIsMeetingStarted] = useState<boolean>(false);
  const [joinForm, setJoinForm] = useState({ name: '', email: '' });
  const [isJoining, setIsJoining] = useState(false);
  const [isParticipantJoined, setIsParticipantJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participants, setParticipants] = useState<any[]>([]);
  const [localParticipant, setLocalParticipant] = useState<any>(null);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) {
        console.log('Meeting ID not found');
        setLoading(false);
        return;
      }

      try {
        let response;
        if (token) {
          console.log('Fetching meeting data with token:', { meetingId, token });
          response = await getMeetingInfo(meetingId, token);
        } else {
          console.log('Fetching meeting data without token:', { meetingId });
          response = await getMeetingById(meetingId);
        }
        
        console.log('Meeting Data:', response);
        
        // Extract meeting data from response
        const meeting = response?.data?.meeting || response?.data || response;
        setMeetingData(meeting);
      } catch (error: any) {
        console.error('Error fetching meeting data:', error);
        console.error('Error details:', {
          message: error?.message,
          response: error?.response?.data
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingData();
  }, [meetingId, token]);

  // Countdown timer effect
  useEffect(() => {
    if (!meetingData?.scheduledAt) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const scheduledTime = new Date(meetingData.scheduledAt).getTime();
      const timeDiff = scheduledTime - now;

      if (timeDiff > 0) {
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
        setIsMeetingStarted(false);
      } else {
        setTimeUntilStart('Meeting has started');
        setIsMeetingStarted(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [meetingData?.scheduledAt]);

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!joinForm.name.trim() || !joinForm.email.trim()) {
      console.log('Name and email are required');
      return;
    }

    if (!token) {
      console.log('Join token is required');
      return;
    }

    setIsJoining(true);
    try {
      const response = await joinMeeting(meetingId, {
        joinToken: token,
        name: joinForm.name.trim(),
        email: joinForm.email.trim(),
      });
      
      console.log('Join Meeting API Response:', response);
      
      // Extract participant count from response
      const count = response?.data?.currentParticipants || 
                    response?.data?.meeting?.currentParticipants || 
                    response?.currentParticipants || 
                    0;
      
      // Extract participants from response
      const allParticipants = response?.data?.participants || 
                             response?.data?.meeting?.participants || 
                             response?.participants || 
                             [];
      
      // Extract current participant (the one who just joined)
      const currentParticipant = response?.data?.participant || {
        name: joinForm.name.trim(),
        email: joinForm.email.trim(),
      };
      
      // Combine all participants including the current one
      // Map participants to have id and name for display
      const formattedParticipants = allParticipants.map((p: any, index: number) => ({
        id: p.id || p.uid || index + 1,
        name: p.name || p.email || 'Unknown',
        email: p.email,
        isLocal: false,
      }));
      
      // Add current participant to the list
      const localParticipantData = {
        id: currentParticipant.id || currentParticipant.uid || 'local',
        name: currentParticipant.name || joinForm.name.trim(),
        email: currentParticipant.email || joinForm.email.trim(),
        isLocal: true,
      };
      
      // Combine all participants (current participant + others)
      const allParticipantsList = [localParticipantData, ...formattedParticipants];
      
      console.log('All Participants:', allParticipantsList);
      console.log('Participant Count from API (currentParticipants):', count);
      
      setParticipants(allParticipantsList);
      setLocalParticipant(localParticipantData);
      setParticipantCount(count);
      
      // If join is successful, set participant joined to true
      if (response) {
        setIsParticipantJoined(true);
      }
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data
      });
    } finally {
      setIsJoining(false);
    }
  };

  const isVideoStreamOn = false;

  return (
    <>
      {!isParticipantJoined ?
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Meeting</h1>
              <p className="text-gray-600">Enter your details to join the meeting</p>
            </div>
    
              {meetingData && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{meetingData.title || 'Meeting'}</h3>
                  {meetingData.description && (
                    <p className="text-sm text-gray-600 mb-2">{meetingData.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Status: {meetingData.status || 'N/A'}</span>
                    <span>Participants: {meetingData.currentParticipants || meetingData.totalJoined || 0}</span>
                  </div>
                  
                  {meetingData.scheduledAt && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className='text-sm font-medium text-yellow-800'>
                            Meeting starts in: <span className='font-bold text-yellow-900'>{timeUntilStart || 'Calculating...'}</span>
                          </p>
                          <p className="text-xs font-medium text-yellow-800">Scheduled for: {formatScheduledDate(meetingData.scheduledAt)}</p>
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
                  required
                  value={joinForm.name}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none text-black focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  disabled={isJoining}
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
                  required
                  value={joinForm.email}
                  onChange={(e) => setJoinForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email address"
                  disabled={isJoining}
                />
              </div>
    
              <button 
                type="submit"
                disabled={!isMeetingStarted || isJoining}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isJoining ? 'Joining...' : isMeetingStarted ? 'Join Meeting' : 'Meeting Not Started Yet'}
              </button>
            </form>
          </div>
        </div>
      :
        <div className="min-h-screen flex flex-col">
          {isScreenSharing &&
            <header className="flex justify-between border border-gray-700 rounded-md p-2 m-3 mb-1 bg-gray-800/90">
              <div className="flex items-center">
                <i className="ri-arrow-up-line text-md font-bold mr-2 border px-1.5 pt-0.5"></i>
                <h3 className="text-xs">{localParticipant?.name || 'You'} (Presenting)</h3>
              </div>
              <button className="text-xs bg-red-600 text-white px-4 py-1 rounded-lg">Stop Presenting</button>
            </header>
          }
          
          <main className="md:flex flex-1 p-3">
            <div className={`${isScreenSharing ? 'h-[calc(50vh-66px)] mb-4 md:mb-0 md:min-h-[calc(100vh-124px)] md:w-2/3 w-full' : 'hidden'} flex items-center justify-center bg-gray-800/90 border border-gray-700 rounded-lg p-4 mr-4`}>
              <span className="">
                <i className="ri-macbook-line text-5xl block mb-2"></i>
              </span>
            </div>
            <div className={`relative ${isScreenSharing ? 'w-full md:w-1/3' : 'w-full'}`}>
              {/* if only one user joined  */}
              {participantCount === 1 && 
                participants.slice(0, 1).map((participant) => (
                  <div key={participant.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(50vh-66px)] md:min-h-[calc(100vh-124px)]' : 'min-h-[calc(100vh-124px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                    {!isVideoStreamOn ?
                      <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{participant.name.split(" ")[0][0]}</span>
                    :
                      '' // display video stram here
                    }
                    <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{participant.name}</span>
                    <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                ))
              }
              {/* if two user joined  */}
              {participantCount === 2 && 
                <div className={`${isScreenSharing ? 'grid grid-cols-2 md:grid-cols-1 gap-2' : ''}`}>
                  <div className={`relative w-full ${isScreenSharing ? 'min-h-[calc(50vh-66px)]' : 'min-h-[calc(50vh-66px)] sm:min-h-[calc(100vh-124px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                    {!isVideoStreamOn ?
                      <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{participants[0]?.name?.split(" ")[0][0] || 'U'}</span>
                    :
                      '' // display video stram here
                    }
                    <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{participants[0]?.name || 'Unknown'}</span>
                    <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                  <div className={`absolute ${isScreenSharing ? 'min-h-[calc(50vh-66px)] relative' : 'min-h-[calc(50vh-66px)] sm:bottom-[10px] sm:right-[10px] sm:w-[250px] sm:h-[125px] sm:min-h-0 sm:mt-0 mt-2'} w-full rounded-md bg-green-500 flex items-center justify-center`}>
                    {!isVideoStreamOn ?
                      <span className={`text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20 ${isScreenSharing ? '' : 'sm:w-10 sm:h-10 sm:text-xl'}`}>{participants[1]?.name?.split(" ")[0][0] || 'U'}</span>
                    :
                      '' // display video stram here
                    }
                    <span className={`absolute bottom-[5px] left-[10px] text-white text-sm ${isScreenSharing ? '' : 'sm:text-xs'}`}>{participants[1]?.name || 'Unknown'}</span>
                    <span className="absolute top-[10px] right-[10px] bg-green-700 rounded-full sm:w-5 sm:h-5 w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                  </div>
                </div>
              }
              {/* if three user joined  */}
              {participantCount === 3 &&
                <div className={`${isScreenSharing ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} grid gap-4`}>
                  {participants.slice(0, 3).map((participant) => (
                    <div key={participant.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(30vh-66px)] md:min-h-[calc(35vh-66px)] lg:min-h-[calc(35vh-66px)]' : 'md:min-h-[calc(50vh-66px)] lg:min-h-[calc(100vh-124px)] min-h-[calc(35vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                      {!isVideoStreamOn ?
                        <span className="text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-20 h-20">{participant.name.split(" ")[0][0]}</span>
                      :
                        '' // display video stram here
                      }
                      <span className="absolute bottom-[10px] left-[10px] text-white text-sm">{participant.name}</span>
                      <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                    </div>
                  ))}
                </div>
              }
              {participantCount > 3 &&
                <>
                  {/* Grid for screens smaller than large - shows 4 users */}
                  {isScreenSharing &&
                    <div className={`md:hidden grid grid-cols-2 md:grid-cols-${isScreenSharing ? 2 : participantCount === 4 ? 2 : participantCount === 5 ? 3 : participantCount === 6 ? 3 : 4} gap-4`}>
                      {participants.slice(0, 4).map((participant, index) => (
                        <div key={participant.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(28vh-66px)] md:min-h-[calc(28vh-66px)]' : 'min-h-[calc(33vh-66px)] md:min-h-[calc(50vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                          {!isVideoStreamOn ?
                          <span className="text-xl sm:text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20">{participant.name.split(" ")[0][0]}</span>
                          :
                            '' // display video stram here
                          }
                          <span className="absolute bottom-[10px] left-[10px] text-white text-xs sm:text-sm">{participant.name}</span>
                          <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                          {index === 3 && participantCount > 4 && (
                            <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                              <span className="text-white text-xl md:text-2xl font-medium">+{participantCount - 3} more</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  }
                  {/* Grid for large screens and above - shows 8 users */}
                  <div className={`${isScreenSharing ? 'hidden md:grid grid-cols-2' : 'grid grid-cols-2'} md:grid-cols-${isScreenSharing ? 2 : participantCount === 4 ? 2 : participantCount === 5 ? 3 : participantCount === 6 ? 3 : 4} gap-4`}>
                    {participants.slice(0, 8).map((participant, index) => (
                      <div key={participant.id} className={`relative w-full ${isScreenSharing ? 'min-h-[calc(28vh-66px)] md:min-h-[calc(28vh-66px)]' : 'min-h-[calc(30vh-66px)] md:min-h-[calc(50vh-66px)]'} rounded-lg bg-red-500 flex items-center justify-center`}>
                        {!isVideoStreamOn ?
                          <span className="text-xl sm:text-3xl rounded-full bg-gray-700 text-white flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20">{participant.name.split(" ")[0][0]}</span>
                        :
                          '' // display video stram here
                        }
                        <span className="absolute bottom-[10px] left-[10px] text-white text-xs sm:text-sm">{participant.name}</span>
                        <span className="absolute top-[10px] right-[10px] bg-red-700 rounded-full w-6 h-6 flex items-center justify-center"><i className="ri-mic-off-line text-md"></i></span>
                        {index === 7 && participantCount > 8 && (
                          <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xl md:text-2xl font-medium">+{participantCount - 7} more</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              }
            </div>
          </main>

          <footer className="w-full mt-auto">
            <div className="flex justify-center p-1">
              <div className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-gray-800/90 border border-gray-700">
                <button title="Mute/Unmute" className="px-4 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-600">
                  <i className="ri-mic-off-line text-lg"></i>
                </button>
                <button title="Turn camera on/off" className="px-4 py-1 rounded-full bg-gray-700 text-white hover:bg-gray-600">
                  <i className="ri-video-line text-lg"></i>
                </button>
                <button title="Present now" className="px-4 py-1 rounded-full text-white bg-gray-700 hover:bg-gray-600">
                  <i className="ri-presentation-line text-lg"></i>
                </button>
                <button title="Leave call" className="px-4 py-1 rounded-full bg-red-600 text-white hover:bg-red-700">
                  <i className="ri-phone-fill text-lg" style={{ transform: 'rotate(135deg)' }}></i>
                </button>
              </div>
            </div>
          </footer>
        </div>
      }
    </>
  )
}