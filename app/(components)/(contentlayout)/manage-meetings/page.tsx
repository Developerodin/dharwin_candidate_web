'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMeetingsList, getMeetingById, deleteMeetingById } from '@/shared/lib/candidates';
import Swal from 'sweetalert2';
import { Tooltip } from 'react-tooltip';

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

  const loadMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getMeetingsList();
      if (response.success && response.data?.meetings) {
        setMeetings(response.data.meetings);
        setTotalResults(response.data.meetings.length);
      } else {
        setError('Failed to load meetings');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
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
      } else {
        setDetailError(response?.message || 'Failed to load meeting details');
      }
    } catch (e: any) {
      setDetailError(e?.response?.data?.message || e?.message || 'Failed to load meeting details');
    } finally {
      setDetailLoading(false);
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
            onClick={loadMeetings}
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
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button onClick={closeDetail} className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


