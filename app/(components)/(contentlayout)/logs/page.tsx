'use client';

import React, { useEffect, useState } from 'react';
import { getLogs } from '@/shared/lib/candidates';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
};

type Log = {
  id: string;
  email: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  loginTime: string;
  logoutTime: string | null;
  isActive: boolean;
  user: User;
};

type ApiResponse = {
  results: Log[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchValue, setSearchValue] = useState<string>('');

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getLogs(page, limit);
      
      if (response?.results) {
        setLogs(response.results);
        setFilteredLogs(response.results);
        setTotalResults(response.totalResults || 0);
        setPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
      } else {
        setError('Failed to load logs');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Apply filters
  useEffect(() => {
    let filtered = [...logs];

    // Filter by status (active/inactive)
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter((log) => log.isActive === isActive);
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((log) => {
        const role = (log.role || log.user?.role || '').toLowerCase();
        return role === roleFilter.toLowerCase();
      });
    }

    // Filter by search (name or email)
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      filtered = filtered.filter((log) => {
        const name = (log.user?.name || '').toLowerCase();
        const email = (log.email || log.user?.email || '').toLowerCase();
        return name.includes(searchTerm) || email.includes(searchTerm);
      });
    }

    setFilteredLogs(filtered);
  }, [logs, statusFilter, roleFilter, searchValue]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 mt-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Login Logs</h1>
        <button
          onClick={loadLogs}
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

        <div className="flex items-center gap-2">
          <label htmlFor="roleFilter" className="text-sm font-medium text-gray-700">
            Role:
          </label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[250px]">
          <label htmlFor="searchInput" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Search:
          </label>
          <input
            id="searchInput"
            type="text"
            placeholder="Search by name or email..."
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

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold">
            Logs {loading ? '(...)' : `(${filteredLogs.length}${filteredLogs.length !== totalResults ? ` of ${totalResults}` : ''})`}
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
                <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 font-medium text-gray-700">Email</th>
                <th className="px-4 py-2 font-medium text-gray-700">Role</th>
                <th className="px-4 py-2 font-medium text-gray-700">IP Address</th>
                <th className="px-4 py-2 font-medium text-gray-700">Status</th>
                <th className="px-4 py-2 font-medium text-gray-700">Login Time</th>
                <th className="px-4 py-2 font-medium text-gray-700">Logout Time</th>
                <th className="px-4 py-2 font-medium text-gray-700">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.length === 0 && logs.length > 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    No logs match the current filters
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.length === 0 && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    No logs found
                  </td>
                </tr>
              )}
              {!loading && filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">
                    {log.user?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {log.email || log.user?.email || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${log.user?.role === "user" ? 'bg-yellow-100' : 'bg-blue-100'} ${log.user?.role === "user" ? 'text-yellow-800' : 'text-blue-800'}`}>
                      {log.role || log.user?.role || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {log.ipAddress || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {log.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatDate(log.loginTime)}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatDate(log.logoutTime)}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className="block max-w-md truncate" title={log.userAgent || 'N/A'}>
                      {log.userAgent || 'N/A'}
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
            <div className="flex items-center gap-2">
              <label htmlFor="limitSelect" className="text-sm text-gray-700">
                Items per page:
              </label>
              <select
                id="limitSelect"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1); // Reset to first page when changing limit
                }}
                disabled={loading}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalResults)} of {totalResults} records
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

