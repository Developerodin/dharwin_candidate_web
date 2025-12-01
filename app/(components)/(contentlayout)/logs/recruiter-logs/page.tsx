'use client';

import React, { useEffect, useState } from 'react';
import { getRecruiterActivityLogs, getRecruiterActivityStatistics, getRecruiterActivitySummary } from '@/shared/lib/recruiterActivities';
import { fetchAllRecruiters } from '@/shared/lib/recruiters';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';

type Recruiter = {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type ActivityLog = {
  id: string;
  recruiter: Recruiter;
  activityType: string;
  description: string;
  job?: {
    id: string;
    title: string;
    organisation: {
      name: string;
    };
    status: string;
  } | null;
  candidate?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  meeting?: {
    id: string;
    title: string;
    scheduledAt: string;
    status: string;
  } | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  results: ActivityLog[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
};

type Statistics = {
  jobPostingsCreated: number;
  candidatesScreened: number;
  interviewsScheduled: number;
  notesAdded: number;
  feedbackAdded: number;
  total: number;
};

export default function RecruiterLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Filters
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Statistics
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  
  // Recruiters list
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);

  // Activity types
  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'job_posting_created', label: 'Job Posting Created' },
    { value: 'candidate_screened', label: 'Candidate Screened' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'note_added', label: 'Note Added' },
    { value: 'feedback_added', label: 'Feedback Added' },
  ];

  // Load recruiters list
  useEffect(() => {
    const loadRecruiters = async () => {
      try {
        const response = await fetchAllRecruiters();
        const recruiterList = Array.isArray(response) ? response : (response?.results || []);
        setRecruiters(recruiterList);
      } catch (e) {
        console.warn('Failed to load recruiters:', e);
      }
    };
    loadRecruiters();
  }, []);

  // Load activity logs
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        limit,
        sortBy: 'createdAt:desc',
      };
      
      if (recruiterFilter !== 'all') {
        params.recruiterId = recruiterFilter;
      }
      
      if (activityTypeFilter !== 'all') {
        params.activityType = activityTypeFilter;
      }
      
      if (startDate) {
        params.startDate = startDate;
      }
      
      if (endDate) {
        params.endDate = endDate;
      }
      
      const response: ApiResponse = await getRecruiterActivityLogs(params);
      
      if (response?.results) {
        setLogs(response.results);
        setTotalResults(response.totalResults || 0);
        setPage(response.page || 1);
        setTotalPages(response.totalPages || 1);
      } else {
        setError('Failed to load activity logs');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    setLoadingStats(true);
    try {
      const params: any = {};
      
      if (recruiterFilter !== 'all') {
        params.recruiterId = recruiterFilter;
      }
      
      if (startDate) {
        params.startDate = startDate;
      }
      
      if (endDate) {
        params.endDate = endDate;
      }
      
      const stats = await getRecruiterActivityStatistics(params);
      setStatistics(stats);
    } catch (e) {
      console.warn('Failed to load statistics:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, recruiterFilter, activityTypeFilter, startDate, endDate]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job_posting_created':
        return '📝';
      case 'candidate_screened':
        return '👤';
      case 'interview_scheduled':
        return '📅';
      case 'note_added':
        return '📋';
      case 'feedback_added':
        return '⭐';
      default:
        return '📌';
    }
  };

  const getActivityTypeLabel = (type: string) => {
    const activity = activityTypes.find(a => a.value === type);
    return activity ? activity.label : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const clearFilters = () => {
    setRecruiterFilter('all');
    setActivityTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <>
      <Seo title="Recruiter Activity Logs" />
      <Pageheader currentpage="Recruiter Activity Logs" activepage="Logs" mainpage="Recruiter Activity Logs" />
      <div className="space-y-6 mt-3">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Job Postings</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.jobPostingsCreated || 0}</h3>
                  </div>
                  <div className="text-3xl">📝</div>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Candidates Screened</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.candidatesScreened || 0}</h3>
                  </div>
                  <div className="text-3xl">👤</div>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interviews Scheduled</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.interviewsScheduled || 0}</h3>
                  </div>
                  <div className="text-3xl">📅</div>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes Added</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.notesAdded || 0}</h3>
                  </div>
                  <div className="text-3xl">📋</div>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Feedback Added</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.feedbackAdded || 0}</h3>
                  </div>
                  <div className="text-3xl">⭐</div>
                </div>
              </div>
            </div>
            <div className="box">
              <div className="box-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Activities</p>
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{statistics.total || 0}</h3>
                  </div>
                  <div className="text-3xl">📊</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Recruiter Activity Logs</h1>
          <button
            onClick={() => {
              loadLogs();
              loadStatistics();
            }}
            disabled={loading || loadingStats}
            className="ti-btn ti-btn-primary !py-2 !px-4"
          >
            {loading || loadingStats ? (
              <>
                <i className="ri-loader-4-line animate-spin me-1"></i>
                Refreshing...
              </>
            ) : (
              <>
                <i className="ri-refresh-line me-1"></i>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="box">
          <div className="box-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="recruiterFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recruiter
                </label>
                <select
                  id="recruiterFilter"
                  value={recruiterFilter}
                  onChange={(e) => {
                    setRecruiterFilter(e.target.value);
                    setPage(1);
                  }}
                  className="form-control w-full"
                >
                  <option value="all">All Recruiters</option>
                  {recruiters.map((recruiter) => (
                    <option key={recruiter.id || recruiter._id} value={recruiter.id || recruiter._id}>
                      {recruiter.name || recruiter.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="activityTypeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Activity Type
                </label>
                <select
                  id="activityTypeFilter"
                  value={activityTypeFilter}
                  onChange={(e) => {
                    setActivityTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="form-control w-full"
                >
                  {activityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="form-control w-full"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="form-control w-full"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="ti-btn ti-btn-light"
              >
                <i className="ri-close-line me-1"></i>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="box">
          <div className="box-header">
            <h5 className="box-title">
              Activity Logs {loading ? '(...)' : `(${totalResults})`}
            </h5>
            {!loading && totalPages > 1 && (
              <div className="text-xs text-gray-600">
                Page {page} of {totalPages}
              </div>
            )}
          </div>
          <div className="box-body !p-0">
            <div className="relative overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Activity</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Recruiter</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Description</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Job</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Candidate</th>
                    <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:bg-gray-900">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          <span className="ml-2">Loading activity logs...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center">
                          <i className="ri-file-list-line text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                          <p>No activity logs found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getActivityIcon(log.activityType)}</span>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {getActivityTypeLabel(log.activityType)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {log.recruiter?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {log.recruiter?.email || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700 dark:text-gray-300">{log.description || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {log.job ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{log.job.title}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{log.job.organisation?.name || 'N/A'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.candidate ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">{log.candidate.fullName}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{log.candidate.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {formatDate(log.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="box-footer">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1 || loading}
                    className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <i className="ri-arrow-left-s-line me-1"></i>
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages || loading}
                    className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <i className="ri-arrow-right-s-line ms-1"></i>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="limitSelect" className="text-sm text-gray-700 dark:text-gray-300">
                    Items per page:
                  </label>
                  <select
                    id="limitSelect"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    disabled={loading}
                    className="form-control !w-auto !py-1 !px-2 !text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalResults)} of {totalResults} records
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

