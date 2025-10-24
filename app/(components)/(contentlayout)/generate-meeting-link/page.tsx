"use client";
import React, { useState, useEffect } from 'react';
import { generateMultipleAgoraTokens, getAgoraConfig } from '@/shared/lib/candidates';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

interface Participant {
  id: string;
  channelName: string;
  uid: string;
  role: 1 | 2;
}

interface AgoraTokenResponse {
  token: string;
  channelName: string;
  uid: string;
  role: number;
  expirationTime: number;
  appId: string;
}

const GenerateMeetingLink = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', channelName: '', uid: '', role: 1 }
  ]);
  const [expirationTimeInSeconds, setExpirationTimeInSeconds] = useState(3600);
  const [agoraAppId, setAgoraAppId] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{
    participant: Participant;
    token: string;
    meetingUrl: string;
  }>>([]);

  // Fetch Agora App ID on component mount
  useEffect(() => {
    const fetchAgoraConfig = async () => {
      try {
        console.log('Fetching Agora configuration for meeting links...');
        const config = await getAgoraConfig();
        console.log('Agora Config Response:', config);
        
        if (config?.data?.appId) {
          console.log('Setting Agora App ID for meeting links:', config.data.appId);
          console.log('App ID length:', config.data.appId.length);
          console.log('App ID format valid:', config.data.appId.length === 32);
          console.log('Full API Response:', config);
          setAgoraAppId(config.data.appId);
        } else {
          console.error('No App ID found in config:', config);
          // Fallback to environment variable
          const fallbackAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
          if (fallbackAppId) {
            console.log('Using fallback App ID from environment:', fallbackAppId);
            setAgoraAppId(fallbackAppId);
          } else {
            // Final fallback to static App ID
            const STATIC_APP_ID = "bba65876c8d549e1b3a98a275f6d8624";
            console.log('Using static fallback App ID:', STATIC_APP_ID);
            setAgoraAppId(STATIC_APP_ID);
          }
        }
      } catch (error) {
        console.error('Error fetching Agora config:', error);
        // Try fallback to environment variable
        const fallbackAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        if (fallbackAppId) {
          console.log('API failed, using fallback App ID from environment:', fallbackAppId);
          setAgoraAppId(fallbackAppId);
        } else {
          // Final fallback to static App ID
          const STATIC_APP_ID = "bba65876c8d549e1b3a98a275f6d8624";
          console.log('API failed, using static fallback App ID:', STATIC_APP_ID);
          setAgoraAppId(STATIC_APP_ID);
        }
      }
    };
    
    fetchAgoraConfig();
  }, []);

  const addParticipant = () => {
    const newId = (participants.length + 1).toString();
    setParticipants(prev => [...prev, { 
      id: newId, 
      channelName: '', 
      uid: '', 
      role: 1 
    }]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length > 1) {
      setParticipants(prev => prev.filter(p => p.id !== id));
    }
  };

  const updateParticipant = (id: string, field: keyof Participant, value: string | number) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const validateForm = () => {
    for (const participant of participants) {
      if (!participant.channelName.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Channel Name Required',
          text: 'Please enter a channel name for all participants.',
          confirmButtonColor: '#36af4c'
        });
        return false;
      }
      if (!participant.uid.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'User ID Required',
          text: 'Please enter a user ID for all participants.',
          confirmButtonColor: '#36af4c'
        });
        return false;
      }
    }
    return true;
  };

  const generateMeetingLinks = async () => {
    if (!validateForm()) return;

    if (!agoraAppId) {
      Swal.fire({
        icon: 'error',
        title: 'Configuration Error',
        text: 'Agora App ID is not available. Please wait for configuration to load or refresh the page.',
        confirmButtonText: 'OK'
      });
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API call
      const apiData = {
        users: participants.map(p => ({
          channelName: p.channelName,
          uid: parseInt(p.uid) || 0,
          role: p.role
        })),
        expirationTimeInSeconds
      };

      // Call the API
      const response = await generateMultipleAgoraTokens(apiData);
      
      console.log('API Response:', response); // Debug logging
      
      // Handle the response structure - check for both possible formats
      const tokens = response?.data?.tokens || response?.tokens || [];
      
      console.log('Extracted tokens:', tokens); // Debug logging
      
      if (tokens && Array.isArray(tokens) && tokens.length > 0) {
        // Generate meeting URLs for each participant
        console.log('Generating meeting URLs with App ID:', agoraAppId);
        console.log('App ID length:', agoraAppId.length);
        
        const links = tokens.map((tokenData: AgoraTokenResponse, index: number) => {
          const participant = participants[index];
          const meetingUrl = `${window.location.origin}/meeting/${tokenData.channelName}?token=${tokenData.token}&uid=${tokenData.uid}&role=${tokenData.role}&expires=${tokenData.expirationTime}&appId=${agoraAppId}`;
          
          console.log(`Generated URL for participant ${index + 1}:`, meetingUrl);
          
          return {
            participant,
            token: tokenData.token,
            meetingUrl
          };
        });

        setGeneratedLinks(links);

        // Show success message with generated links
        const linksHtml = links.map((link: any, index: number) => `
          <div style="margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #36af4c;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #36af4c;">
              Participant ${index + 1} - Channel: ${link.participant.channelName}
            </p>
            <div style="background: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e5e7eb; word-break: break-all; font-size: 11px; color: #6b7280; margin-bottom: 8px;">
              ${link.meetingUrl}
            </div>
            <button 
              onclick="navigator.clipboard.writeText('${link.meetingUrl}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Link', 2000);"
              style="background: #36af4c; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;"
            >
              Copy Link
            </button>
          </div>
        `).join('');

        await Swal.fire({
          icon: 'success',
          title: 'Meeting Links Generated!',
          html: `
            <div style="text-align: left; line-height: 1.6;">
              <p style="margin-bottom: 15px; font-size: 16px;">
                Successfully generated ${links.length} meeting link(s)!
              </p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #36af4c;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: 600;">
                  Generated Meeting Links:
                </p>
                ${linksHtml}
              </div>
              <div style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-top: 15px;">
                <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">
                  📹 Meeting Features:
                </p>
                <ul style="margin: 5px 0 0 0; padding-left: 15px; font-size: 11px; color: #92400e;">
                  <li>Real-time video and audio communication</li>
                  <li>Screen sharing capabilities</li>
                  <li>Secure token-based authentication</li>
                  <li>Expires in ${Math.floor(expirationTimeInSeconds / 3600)} hours</li>
                </ul>
              </div>
              <p style="margin-top: 15px; font-size: 13px; color: #6b7280;">
                Share these links with participants to join the meeting. Each link is unique and secure.
              </p>
            </div>
          `,
          confirmButtonText: 'Got it!',
          confirmButtonColor: '#36af4c',
          width: '700px',
          padding: '2rem'
        });

      } else {
        console.error('Invalid response structure:', response);
        throw new Error(`Invalid response from server. Expected tokens array, got: ${JSON.stringify(response)}`);
      }

    } catch (error: any) {
      console.error('Error generating meeting links:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Generation Failed',
        text: error?.message || 'Failed to generate meeting links. Please try again.',
        confirmButtonColor: '#dc3545'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAllLinks = () => {
    if (generatedLinks.length > 0) {
      const allLinks = generatedLinks.map(link => 
        `${link.participant.channelName}: ${link.meetingUrl}`
      ).join('\n\n');
      
      navigator.clipboard.writeText(allLinks).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'All Links Copied!',
          text: 'All meeting links have been copied to clipboard.',
          confirmButtonColor: '#36af4c'
        });
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Generate Meeting Links
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create secure video meeting links for multiple participants. Each participant will get their unique link to join the meeting.
          </p>
        </div>

        {/* Error Display */}
        {hasError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <i className="ri-error-warning-line text-red-400 text-xl"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Configuration Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Unable to fetch Agora configuration. Please check your connection and try again.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="space-y-6">
            {/* Expiration Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Duration (hours)
              </label>
              <select
                value={Math.floor(expirationTimeInSeconds / 3600)}
                onChange={(e) => setExpirationTimeInSeconds(parseInt(e.target.value) * 3600)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#36af4c] focus:border-[#36af4c]"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={4}>4 Hours</option>
                <option value={8}>8 Hours</option>
                <option value={24}>24 Hours</option>
              </select>
            </div>

            {/* Participants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Meeting Participants
                </label>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="inline-flex items-center px-3 py-2 border border-[#36af4c] text-sm font-medium rounded-lg text-[#36af4c] bg-white hover:bg-[#36af4c] hover:text-white transition-colors duration-200"
                >
                  <i className="ri-add-line mr-1"></i>
                  Add Participant
                </button>
              </div>

              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <div key={participant.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Participant {index + 1}
                      </span>
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <i className="ri-delete-bin-line"></i>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Channel Name
                        </label>
                        <input
                          type="text"
                          value={participant.channelName}
                          onChange={(e) => updateParticipant(participant.id, 'channelName', e.target.value)}
                          placeholder="e.g., meeting-room-1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#36af4c] focus:border-[#36af4c] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          User ID
                        </label>
                        <input
                          type="text"
                          value={participant.uid}
                          onChange={(e) => updateParticipant(participant.id, 'uid', e.target.value)}
                          placeholder="e.g., 12345"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#36af4c] focus:border-[#36af4c] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Role
                        </label>
                        <select
                          value={participant.role}
                          onChange={(e) => updateParticipant(participant.id, 'role', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#36af4c] focus:border-[#36af4c] text-sm"
                        >
                          <option value={1}>Publisher (Host)</option>
                          <option value={2}>Subscriber (Guest)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={generateMeetingLinks}
                disabled={loading || participants.length === 0}
                className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-[#36af4c] hover:bg-[#2d8a3f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#36af4c] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ri-video-line mr-2 text-lg"></i>
                    Generate Meeting Links ({participants.length} participant{participants.length !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>

            {/* Generated Links Display */}
            {generatedLinks.length > 0 && (
              <div className="mt-8 bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generated Meeting Links
                  </h3>
                  <button
                    onClick={copyAllLinks}
                    className="inline-flex items-center px-3 py-2 border border-[#36af4c] text-sm font-medium rounded-lg text-[#36af4c] bg-white hover:bg-[#36af4c] hover:text-white transition-colors duration-200"
                  >
                    <i className="ri-copy-line mr-1"></i>
                    Copy All
                  </button>
                </div>

                <div className="space-y-3">
                  {generatedLinks.map((link, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Participant {index + 1} - {link.participant.channelName}
                          </p>
                          <p className="text-xs text-gray-500 break-all">
                            {link.meetingUrl}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(link.meetingUrl);
                            Swal.fire({
                              icon: 'success',
                              title: 'Copied!',
                              text: 'Meeting link copied to clipboard.',
                              timer: 1500,
                              showConfirmButton: false
                            });
                          }}
                          className="ml-3 inline-flex items-center px-3 py-1 border border-[#36af4c] text-xs font-medium rounded text-[#36af4c] bg-white hover:bg-[#36af4c] hover:text-white transition-colors duration-200"
                        >
                          <i className="ri-copy-line mr-1"></i>
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="ri-information-line text-blue-500 text-lg"></i>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    How it works
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each participant gets a unique meeting link</li>
                      <li>Links are secure and expire after the specified duration</li>
                      <li>Participants can join with video and audio</li>
                      <li>Screen sharing is available for all participants</li>
                      <li>Meeting links can be shared via email or messaging</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateMeetingLink;