'use client';

import React, { useEffect, useState } from 'react';
import { getAttendanceByCandidate, fetchAllCandidates } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';

type AttendanceRecord = {
  id: string;
  candidate: {
    id: string;
    fullName: string;
    email: string;
  };
  candidateEmail: string;
  date: string;
  day: string;
  punchIn: string | null;
  punchOut: string | null;
  duration: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    results: AttendanceRecord[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
  results?: AttendanceRecord[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
};

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<string>('');
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');

  // Load current user and find candidate ID
  useEffect(() => {
    try {
      const data = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      setCurrentUser(data ? JSON.parse(data) : null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Resolve candidate ID from user data
  useEffect(() => {
    const resolveCandidateId = async () => {
      if (!currentUser) return;
      
      try {
        // If user role is 'user', try to find their candidate record
        if (currentUser.role === 'user') {
          const allCandidates = await fetchAllCandidates();
          const list = Array.isArray(allCandidates) ? allCandidates : (Array.isArray((allCandidates as any)?.results) ? (allCandidates as any).results : []);
          
          // Find candidate by owner ID or email
          const match = list.find((c: any) => {
            const byOwner = String(c?.owner) === String(currentUser.id || currentUser._id);
            const byEmail = (c?.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase();
            return byOwner || byEmail;
          });
          
          if (match?.id) {
            setCandidateId(match.id);
          }
        }
      } catch (e) {
        console.warn('Failed to resolve candidate ID', e);
      }
    };
    
    resolveCandidateId();
  }, [currentUser]);

  const loadAttendance = async () => {
    if (!candidateId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getAttendanceByCandidate(candidateId);
      
      if (response?.data?.results) {
        setAttendance(response.data.results);
        setFilteredAttendance(response.data.results);
        setTotalResults(response.data.totalResults || 0);
        setPage(response.data.page || 1);
        setTotalPages(response.data.totalPages || 1);
      } else if (response?.results) {
        setAttendance(response.results);
        setFilteredAttendance(response.results);
        setTotalResults(response.totalResults || 0);
        setPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
      } else {
        setError('Failed to load attendance');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      loadAttendance();
    }
  }, [candidateId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...attendance];

    // Filter by status (active/inactive)
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((record) => record.isActive === isActive);
    }

    // Filter by search (date or day)
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      filtered = filtered.filter((record) => {
        const dateStr = record.date ? new Date(record.date).toLocaleDateString().toLowerCase() : '';
        const dayStr = (record.day || '').toLowerCase();
        return dateStr.includes(searchTerm) || dayStr.includes(searchTerm);
      });
    }

    setFilteredAttendance(filtered);
  }, [attendance, statusFilter, searchValue]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString();
    } catch {
      return timeString;
    }
  };

  const formatDuration = (milliseconds: number) => {
    if (!milliseconds || milliseconds === 0) return 'N/A';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  };

  return (
    <>
      <Seo title="Attendance" />
      <Pageheader currentpage="Attendance" activepage="Pages" mainpage="Attendance" />
      <div className="space-y-6 mt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Attendance Records</h1>
          <button
            onClick={loadAttendance}
            disabled={loading || !candidateId}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-[250px]">
            <label htmlFor="searchInput" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Search:
            </label>
            <input
              id="searchInput"
              type="text"
              placeholder="Search by date or day..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!candidateId && !loading && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            Please log in as a candidate to view attendance records.
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Records {loading ? '(...)' : `(${filteredAttendance.length}${filteredAttendance.length !== attendance.length ? ` of ${attendance.length}` : ''})`}
            </h2>
            {!loading && totalPages > 1 && (
              <div className="text-xs text-gray-600">
                Page {page} of {totalPages}
              </div>
            )}
          </div>
          <div className="relative overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700">Date</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Day</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Punch In</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Punch Out</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Duration</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      Loading attendance records...
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.length === 0 && attendance.length > 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      No records match the current filters
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.length === 0 && attendance.length === 0 && candidateId && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {record.day || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatTime(record.punchIn)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatTime(record.punchOut)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatDuration(record.duration)}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        record.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      <span className="block max-w-md truncate" title={record.notes || 'N/A'}>
                        {record.notes || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

