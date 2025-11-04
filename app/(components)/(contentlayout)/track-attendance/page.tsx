'use client';

import React, { useEffect, useState } from 'react';
import { getAttendance } from '@/shared/lib/candidates';
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

export default function TrackAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');

  const loadAttendance = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getAttendance(page, limit);
      
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
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Apply filters
  useEffect(() => {
    let filtered = [...attendance];

    // Filter by status (active/inactive)
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((record) => record.isActive === isActive);
    }

    // Filter by search (candidate name, email, date, or day)
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      filtered = filtered.filter((record) => {
        const candidateName = (record.candidate?.fullName || '').toLowerCase();
        const candidateEmail = (record.candidateEmail || '').toLowerCase();
        const dateStr = record.date ? new Date(record.date).toLocaleDateString().toLowerCase() : '';
        const dayStr = (record.day || '').toLowerCase();
        return candidateName.includes(searchTerm) || 
               candidateEmail.includes(searchTerm) ||
               dateStr.includes(searchTerm) || 
               dayStr.includes(searchTerm);
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
      <Seo title="Track Attendance" />
      <Pageheader currentpage="Track Attendance" activepage="Pages" mainpage="Track Attendance" />
      <div className="space-y-6 mt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Track Attendance</h1>
          <button
            onClick={loadAttendance}
            disabled={loading}
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
              placeholder="Search by candidate name, email, date or day..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="limitSelect" className="text-sm font-medium text-gray-700">
              Per Page:
            </label>
            <select
              id="limitSelect"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1); // Reset to first page when limit changes
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
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
              Records {loading ? '(...)' : `(${totalResults} total, showing ${filteredAttendance.length} on this page)`}
            </h2>
          </div>
          <div className="relative overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-700">Candidate</th>
                  <th className="px-4 py-2 font-medium text-gray-700">Email</th>
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
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                      Loading attendance records...
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.length === 0 && attendance.length > 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                      No records match the current filters
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.length === 0 && attendance.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                )}
                {!loading && filteredAttendance.map((record: AttendanceRecord) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">
                      {record.candidate?.fullName || 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {record.candidateEmail || 'N/A'}
                    </td>
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
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1 || loading}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages || loading}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalResults)} of {totalResults} records
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

