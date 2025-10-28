'use client';

import React, { useState } from 'react';
import { createMeeting } from '@/shared/lib/candidates';
import { convertIndianTimeToUTC, getCurrentISTTimeString } from '@/shared/lib/timezone';

interface MeetingFormData {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
}

interface MeetingResponse {
  success: boolean;
  data: {
    meetingId: string;
    title: string;
    meetingUrl: string;
    joinToken: string;
    channelName: string;
    appId: string;
    status: string;
  };
}

export default function GenerateMeetingLinkPage() {
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60,
    maxParticipants: 10,
    allowGuestJoin: true,
    requireApproval: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<MeetingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMeetingResult(null);

    try {
      // Convert Indian time to UTC before sending to API
      const meetingData = {
        ...formData,
        scheduledAt: formData.scheduledAt ? convertIndianTimeToUTC(formData.scheduledAt) : formData.scheduledAt
      };
      
      const result = await createMeeting(meetingData);
      setMeetingResult(result);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate Meeting Link</h1>
        
        {!meetingResult ? (
          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Interview with John Doe"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technical interview for Software Engineer position"
                />
              </div>

              <div>
                <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time * (IST)
                </label>
                <input
                  type="datetime-local"
                  id="scheduledAt"
                  name="scheduledAt"
                  value={formData.scheduledAt}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="15"
                  max="480"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Participants
                </label>
                <input
                  type="number"
                  id="maxParticipants"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowGuestJoin"
                      checked={formData.allowGuestJoin}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Allow Guest Join</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="requireApproval"
                      checked={formData.requireApproval}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Require Approval</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Meeting...' : 'Create Meeting'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Meeting Created Successfully!</h2>
              <p className="text-gray-600">Your meeting link has been generated and is ready to share.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Title</label>
                <p className="text-lg font-semibold text-gray-900">{meetingResult.data.title}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting URL</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={meetingResult.data.meetingUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(meetingResult.data.meetingUrl)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Join Token</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={meetingResult.data.joinToken}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(meetingResult.data.joinToken)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meeting ID</label>
                  <p className="text-sm text-gray-900 font-mono">{meetingResult.data.meetingId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {meetingResult.data.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => {
                  setMeetingResult(null);
                  setFormData({
                    title: '',
                    description: '',
                    scheduledAt: '',
                    duration: 60,
                    maxParticipants: 10,
                    allowGuestJoin: true,
                    requireApproval: false,
                  });
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Create Another Meeting
              </button>
              <button
                onClick={() => window.open(meetingResult.data.meetingUrl, '_blank')}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Join Meeting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
