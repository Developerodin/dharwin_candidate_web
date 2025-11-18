'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMeetingsList, getMeetingById, deleteMeetingById, getRecordingStatus, getRecordingDownloadUrl, shareMeeting } from '@/shared/lib/candidates';
import Swal from 'sweetalert2';
import { Tooltip } from 'react-tooltip';
import TranscriptPage from '@/shared/components/transcription/TranscriptPage';

type Meeting = {
  meetingId: string;
  title: string;
  description: string;
  status: string;
  scheduledAt: string; // ISO
  duration: number; // minutes
  maxParticipants: number;
  currentParticipants: number;
  totalJoined: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
  isRecurring: boolean;
  meetingUrl: string;
  joinToken: string;
  createdBy: string;
  participants: any[];
  hostParticipants: any[];
  channelName: string;
  id: string;
};

type ApiResponse = {
  success: boolean;
  data: {
    meetings: Meeting[];
  };
  message: string;
};

export default function ManageMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'active' | 'ended' | 'cancelled'>('all');
  const [recordingStatuses, setRecordingStatuses] = useState<Record<string, any>>({});
  const [loadingRecordings, setLoadingRecordings] = useState<Record<string, boolean>>({});
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareMeetingId, setShareMeetingId] = useState<string | null>(null);
  const [shareEmails, setShareEmails] = useState<string[]>([]);
  const [shareEmailInput, setShareEmailInput] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const loadMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getMeetingsList();
      if (response.success && response.data?.meetings) {
        setMeetings(response.data.meetings);
        setTotalResults(response.data.meetings.length);
        // Load recording statuses for all meetings
        loadAllRecordingStatuses(response.data.meetings);
      } else {
        setError('Failed to load meetings');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadAllRecordingStatuses = async (meetings: Meeting[]) => {
    // Load recording statuses for all meetings in parallel
    const statusPromises = meetings.map(async (meeting) => {
      try {
        const response = await getRecordingStatus(meeting.meetingId);
        if (response?.success && response?.data?.recording) {
          return { meetingId: meeting.meetingId, recording: response.data.recording };
        }
        return { meetingId: meeting.meetingId, recording: null };
      } catch (e: any) {
        // Recording might not exist, which is fine
        return { meetingId: meeting.meetingId, recording: null };
      }
    });

    const results = await Promise.all(statusPromises);
    const statusMap: Record<string, any> = {};
    results.forEach((result) => {
      statusMap[result.meetingId] = result.recording;
    });
    setRecordingStatuses(statusMap);
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const openDetail = async (meetingId: string) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedMeeting(null);
    try {
      const response = await getMeetingById(meetingId);
      if (response?.success && response?.data) {
        // Some APIs return data directly or wrapped; try common shapes
        const meeting = response.data.meeting || response.data;
        setSelectedMeeting(meeting);
        // Also load recording status
        loadRecordingStatus(meetingId);
      } else {
        setDetailError(response?.message || 'Failed to load meeting details');
      }
    } catch (e: any) {
      setDetailError(e?.response?.data?.message || e?.message || 'Failed to load meeting details');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadRecordingStatus = async (meetingId: string) => {
    setLoadingRecordings((prev) => ({ ...prev, [meetingId]: true }));
    try {
      const response = await getRecordingStatus(meetingId);
      if (response?.success && response?.data?.recording) {
        setRecordingStatuses((prev) => ({
          ...prev,
          [meetingId]: response.data.recording,
        }));
      } else {
        // No recording found or not started
        setRecordingStatuses((prev) => ({
          ...prev,
          [meetingId]: null,
        }));
      }
    } catch (e: any) {
      // Recording might not exist, which is fine
      setRecordingStatuses((prev) => ({
        ...prev,
        [meetingId]: null,
      }));
    } finally {
      setLoadingRecordings((prev) => ({ ...prev, [meetingId]: false }));
    }
  };

  const handleDownloadRecording = async (meetingId: string) => {
    try {
      const response = await getRecordingDownloadUrl(meetingId);
      if (response?.success && response?.data?.downloadUrl) {
        // Open download URL in new tab
        window.open(response.data.downloadUrl, '_blank');
        void Swal.fire({
          icon: 'success',
          title: 'Download started',
          text: 'Recording download has started.',
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      } else {
        throw new Error('Download URL not available');
      }
    } catch (e: any) {
      void Swal.fire({
        icon: 'error',
        title: 'Download failed',
        text: e?.response?.data?.message || e?.message || 'Could not download recording. Please try again.',
      });
    }
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedMeeting(null);
    setDetailError(null);
  };

  const copyMeetingLink = async (meetingUrl: string, meetingId: string) => {
    try {
      await navigator.clipboard.writeText(meetingUrl);
      setCopiedMeetingId(meetingId);
      setTimeout(() => setCopiedMeetingId(null), 1500);
      void Swal.fire({
        icon: 'success',
        title: 'Link copied',
        text: 'Meeting link copied to clipboard.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e) {
      void Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: 'Could not copy the meeting link. Please try again.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const handleDeleteMeeting = async (meetingId: string, meetingTitle: string) => {
    const result = await Swal.fire({
      title: 'Delete Meeting?',
      text: `Are you sure you want to delete "${meetingTitle}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
      await deleteMeetingById(meetingId);
      setMeetings((prev) => prev.filter((m) => m.meetingId !== meetingId));
      setTotalResults((prev) => Math.max(0, prev - 1));
      void Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Meeting has been deleted successfully.',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (e: any) {
      void Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: e?.response?.data?.message || e?.message || 'Unable to delete meeting. Please try again.',
      });
    }
  };

  const openShareModal = (meetingId: string) => {
    setShareMeetingId(meetingId);
    setShareEmails([]);
    setShareEmailInput('');
    setShareMessage('');
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareMeetingId(null);
    setShareEmails([]);
    setShareEmailInput('');
    setShareMessage('');
  };

  const addEmail = () => {
    const email = shareEmailInput.trim();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      void Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      return;
    }

    // Check for duplicates
    if (shareEmails.includes(email)) {
      void Swal.fire({
        icon: 'warning',
        title: 'Duplicate Email',
        text: 'This email has already been added.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      return;
    }

    setShareEmails([...shareEmails, email]);
    setShareEmailInput('');
  };

  const removeEmail = (emailToRemove: string) => {
    setShareEmails(shareEmails.filter(email => email !== emailToRemove));
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleShareMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shareMeetingId) return;

    // Check if there are any emails added
    if (shareEmails.length === 0) {
      void Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please add at least one email address.',
      });
      return;
    }

    setIsSharing(true);
    try {
      const shareData: { emails: string[]; message?: string } = {
        emails: shareEmails,
      };
      if (shareMessage.trim()) {
        shareData.message = shareMessage.trim();
      }
      
      await shareMeeting(shareMeetingId, shareData);
      void Swal.fire({
        icon: 'success',
        title: 'Invite Sent',
        text: `Meeting invite has been sent to ${shareEmails.length} ${shareEmails.length === 1 ? 'email' : 'emails'}.`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      closeShareModal();
    } catch (e: any) {
      void Swal.fire({
        icon: 'error',
        title: 'Share Failed',
        text: e?.response?.data?.message || e?.message || 'Unable to share meeting invite. Please try again.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  const displayedMeetings = !loading
    ? meetings.filter((m) => (statusFilter === 'all' ? true : m.status === statusFilter))
    : meetings;

  return (
    <div className="space-y-6 mt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Meetings</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-xs text-gray-600">Status</label>
            <select
              id="statusFilter"
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => {
              loadMeetings();
            }}
            disabled={loading}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href="/generate-meeting-link"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Create Meeting
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold">
            Meetings {(displayedMeetings.length > 0 || loading) && `(${loading ? '...' : displayedMeetings.length})`}
          </h2>
        </div>
        <div className="relative overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 font-medium text-gray-700">Title</th>
                <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 font-medium text-gray-700">Scheduled</th>
                <th className="px-4 py-2 font-medium text-gray-700">Duration</th>
                <th className="px-4 py-2 font-medium text-gray-700">Participants</th>
                <th className="px-4 py-2 font-medium text-gray-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading meetings...
                  </td>
                </tr>
              )}
              {!loading && displayedMeetings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No meetings found{statusFilter !== 'all' ? ` for status "${statusFilter}"` : ''}
                  </td>
                </tr>
              )}
              {!loading && displayedMeetings.map((m) => (
                <tr key={m.meetingId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.description}</div>
                    <div className="text-xs text-gray-400">ID: {m.meetingId}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.status === 'scheduled' 
                        ? 'bg-blue-100 text-blue-800' 
                        : m.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(m.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{m.duration} min</td>
                  <td className="px-4 py-2 text-gray-700">
                    <div>{m.currentParticipants}/{m.maxParticipants}</div>
                    <div className="text-xs text-gray-500">Total: {m.totalJoined}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      {(() => {
                        const recording = recordingStatuses[m.meetingId];
                        // Only show recording button if a completed recording exists
                        if (recording && recording.status === 'completed') {
                          return (
                            <button
                              onClick={() => handleDownloadRecording(m.meetingId)}
                              className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                              title="View recording"
                              data-tooltip-id="meeting-actions-tip"
                              data-tooltip-content="View recording"
                            >
                              {/* Video/Recording icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4ZM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2Z"/>
                              </svg>
                            </button>
                          );
                        }
                        // Don't show anything if no recording is available
                        return null;
                      })()}
                      {m.status !== 'ended' && (
                        <button
                          onClick={() => copyMeetingLink(m.meetingUrl, m.meetingId)}
                          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                          title={copiedMeetingId === m.meetingId ? 'Copied' : 'Copy meeting link'}
                          aria-label={copiedMeetingId === m.meetingId ? 'Copied meeting link' : 'Copy meeting link'}
                          data-tooltip-id="meeting-actions-tip"
                          data-tooltip-content={copiedMeetingId === m.meetingId ? 'Copied!' : 'Copy meeting link'}
                        >
                          {copiedMeetingId === m.meetingId ? (
                            // Check icon
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-green-600">
                              <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          ) : (
                            // Clipboard icon
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-700">
                              <path d="M16 2H8a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8v-2H4V8h2v2h12V6a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2h4a2 2 0 0 1 2 2v2h2V4a2 2 0 0 0-2-2Zm-4 4H8V4h4v2Z" />
                            </svg>
                          )}
                        </button>
                      )}
                      {m.status !== 'ended' && (
                        <button
                          onClick={() => openShareModal(m.meetingId)}
                          className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50"
                          title="Share meeting invite"
                          data-tooltip-id="meeting-actions-tip"
                          data-tooltip-content="Share meeting invite"
                        >
                          {/* Share/Email icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => openDetail(m.meetingId)}
                        className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                        title="View details"
                        data-tooltip-id="meeting-actions-tip"
                        data-tooltip-content="View details"
                      >
                        {/* Eye icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-gray-700">
                          <path d="M12 5c-7.633 0-10 7-10 7s2.367 7 10 7 10-7 10-7-2.367-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(m.meetingId, m.title)}
                        className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        title="Delete meeting"
                        data-tooltip-id="meeting-actions-tip"
                        data-tooltip-content="Delete meeting"
                      >
                        {/* Trash icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M9 3a1 1 0 0 0-1 1v1H5a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2h-3V4a1 1 0 0 0-1-1H9Zm2 5a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Zm4 0a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1ZM7 8a1 1 0 0 0-1 1v8a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1Zm-1 13a2 2 0 0 1-2-2V8h16v11a2 2 0 0 1-2 2H6Z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Tooltip id="meeting-actions-tip" place="top" className="z-[60]" />
      {/* Detail Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative z-10 w-full max-w-xl rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Meeting Details</h3>
              <button onClick={closeDetail} className="rounded-md p-1 hover:bg-gray-100" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-4 text-sm">
              {detailLoading && (
                <div className="py-6 text-center text-gray-500">Loading details...</div>
              )}
              {!detailLoading && detailError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{detailError}</div>
              )}
              {!detailLoading && !detailError && selectedMeeting && (
                <div className="space-y-3">
                  {Array.isArray(selectedMeeting.hostParticipants) && selectedMeeting.hostParticipants.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Hosts</div>
                      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                        {selectedMeeting.hostParticipants.map((h: any, idx: number) => (
                          <li key={idx} className="px-3 py-2 flex items-center justify-between">
                            <div className="mr-2">
                              <div className="text-sm font-medium text-gray-900">{h?.name || 'Unnamed Host'}</div>
                              <div className="text-xs text-gray-600">{h?.email || '-'}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Title</div>
                    <div className="font-medium">{selectedMeeting.title}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Description</div>
                    <div className="text-gray-700">{selectedMeeting.description}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-500">Meeting ID</div>
                      <div className="text-gray-700">{selectedMeeting.meetingId}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Status</div>
                      <div className="text-gray-700">{selectedMeeting.status}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Scheduled At</div>
                      <div className="text-gray-700">{new Date(selectedMeeting.scheduledAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Duration</div>
                      <div className="text-gray-700">{selectedMeeting.duration} min</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Participants</div>
                      <div className="text-gray-700">{selectedMeeting.currentParticipants}/{selectedMeeting.maxParticipants} (Total joined: {selectedMeeting.totalJoined})</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Recurring</div>
                      <div className="text-gray-700">{selectedMeeting.isRecurring ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Guest Join Allowed</div>
                      <div className="text-gray-700">{selectedMeeting.allowGuestJoin ? 'Yes' : 'No'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Requires Approval</div>
                      <div className="text-gray-700">{selectedMeeting.requireApproval ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Meeting URL</div>
                    <a href={selectedMeeting.meetingUrl} target="_blank" rel="noreferrer" className="text-primary underline break-all">{selectedMeeting.meetingUrl}</a>
                  </div>
                  {selectedMeeting.joinToken && (
                    <div>
                      <div className="text-xs text-gray-500">Join Token</div>
                      <div className="font-mono break-all text-gray-700">{selectedMeeting.joinToken}</div>
                    </div>
                  )}
                  {selectedMeeting.channelName && (
                    <div>
                      <div className="text-xs text-gray-500">Channel</div>
                      <div className="text-gray-700">{selectedMeeting.channelName}</div>
                    </div>
                  )}
                  {/* Recording Section */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-gray-700">Recording</div>
                      {loadingRecordings[selectedMeeting.meetingId] && (
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                    </div>
                    {(() => {
                      const recording = recordingStatuses[selectedMeeting.meetingId];
                      if (loadingRecordings[selectedMeeting.meetingId]) {
                        return <div className="text-xs text-gray-500">Loading recording status...</div>;
                      }
                      if (!recording) {
                        return (
                          <div className="text-xs text-gray-500">
                            No recording available for this meeting.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-gray-500">Status</div>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                recording.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : recording.status === 'recording'
                                  ? 'bg-red-100 text-red-800'
                                  : recording.status === 'stopping'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {recording.status}
                              </span>
                            </div>
                            {recording.status === 'completed' && (
                              <button
                                onClick={() => handleDownloadRecording(selectedMeeting.meetingId)}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                                  <path d="M12 15.577l-3.539-3.538a1 1 0 00-1.414 1.414l4.243 4.243a1 1 0 001.414 0l4.243-4.243a1 1 0 00-1.414-1.414L12 15.577zM12 4v11.577h2V4h-2z"/>
                                </svg>
                                Download
                              </button>
                            )}
                          </div>
                          {recording.startedAt && (
                            <div>
                              <div className="text-xs text-gray-500">Started At</div>
                              <div className="text-xs text-gray-700">{new Date(recording.startedAt).toLocaleString()}</div>
                            </div>
                          )}
                          {recording.stoppedAt && (
                            <div>
                              <div className="text-xs text-gray-500">Stopped At</div>
                              <div className="text-xs text-gray-700">{new Date(recording.stoppedAt).toLocaleString()}</div>
                            </div>
                          )}
                          {recording.duration && (
                            <div>
                              <div className="text-xs text-gray-500">Duration</div>
                              <div className="text-xs text-gray-700">
                                {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                              </div>
                            </div>
                          )}
                          {recording.fileSize && (
                            <div>
                              <div className="text-xs text-gray-500">File Size</div>
                              <div className="text-xs text-gray-700">
                                {(recording.fileSize / (1024 * 1024)).toFixed(2)} MB
                              </div>
                            </div>
                          )}
                          {recording.format && (
                            <div>
                              <div className="text-xs text-gray-500">Format</div>
                              <div className="text-xs text-gray-700 uppercase">{recording.format}</div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Transcription Section */}
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">Transcription</div>
                    {selectedMeeting && (
                      <div className="mt-2">
                        <TranscriptPage meetingId={selectedMeeting.meetingId} autoPoll={true} pollInterval={5000} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button onClick={closeDetail} className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Share Meeting Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeShareModal} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Share Meeting Invite</h3>
              <button 
                onClick={closeShareModal} 
                className="rounded-md p-1 hover:bg-gray-100" 
                aria-label="Close"
                disabled={isSharing}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gray-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleShareMeeting}>
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label htmlFor="share-emails" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Addresses <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      id="share-emails"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter email address"
                      value={shareEmailInput}
                      onChange={(e) => setShareEmailInput(e.target.value)}
                      onKeyDown={handleEmailInputKeyDown}
                      disabled={isSharing}
                    />
                    <button
                      type="button"
                      onClick={addEmail}
                      disabled={isSharing || !shareEmailInput.trim()}
                      className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-1">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      Add
                    </button>
                  </div>
                  {shareEmails.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shareEmails.map((email, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800"
                        >
                          {email}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            disabled={isSharing}
                            className="ml-1 rounded-full hover:bg-blue-200 focus:outline-none disabled:opacity-50"
                            aria-label={`Remove ${email}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {shareEmails.length === 0 
                      ? 'Add email addresses one by one. Press Enter or click Add to add each email.'
                      : `${shareEmails.length} ${shareEmails.length === 1 ? 'email' : 'emails'} added.`
                    }
                  </p>
                </div>
                <div>
                  <label htmlFor="share-message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    id="share-message"
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Looking forward to our discussion!"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    disabled={isSharing}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
                <button
                  type="button"
                  onClick={closeShareModal}
                  className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50"
                  disabled={isSharing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 mr-1">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                      Send Invite
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


