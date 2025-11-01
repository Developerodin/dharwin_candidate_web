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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse = await getLogs();
      
      if (response?.results) {
        setLogs(response.results);
        setTotalResults(response.totalResults);
        setPage(response.page);
        setTotalPages(response.totalPages);
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
  }, []);

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

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold">
            Logs {(logs.length > 0 || loading) && `(${loading ? '...' : totalResults})`}
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
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                    No logs found
                  </td>
                </tr>
              )}
              {!loading && logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">
                    {log.user?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {log.email || log.user?.email || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
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
      </div>
    </div>
  );
}

