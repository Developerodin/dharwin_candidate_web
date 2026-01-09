'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllLeaveRequests, approveLeaveRequest, rejectLeaveRequest, fetchAllCandidates } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import("react-select"), { ssr: false });

type LeaveRequest = {
  _id: string;
  candidate: {
    _id: string;
    fullName: string;
    email: string;
  };
  dates: string[];
  leaveType: 'casual' | 'sick' | 'unpaid';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminComment?: string;
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const LeaveRequestsPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [filterLeaveType, setFilterLeaveType] = useState<'all' | 'casual' | 'sick' | 'unpaid'>('all');
  const [filterCandidate, setFilterCandidate] = useState<string>('all');
  const [candidates, setCandidates] = useState<any[]>([]);

  // Leave requests
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalResults: 0
  });

  // Load current user and check admin status
  useEffect(() => {
    try {
      const data = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (data) {
        const user = JSON.parse(data);
        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
      }
    } catch {
      setCurrentUser(null);
      setIsAdmin(false);
    }
  }, []);

  // Fetch candidates for filter
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!isAdmin) return;
      try {
        const data = await fetchAllCandidates({
          page: 1,
          limit: 1000,
          sortBy: 'fullName:asc'
        });
        const list = Array.isArray(data) ? data : (Array.isArray((data as any)?.results) ? (data as any).results : []);
        setCandidates(list);
      } catch (err) {
        console.error('Failed to fetch candidates:', err);
      }
    };
    if (isAdmin) {
      fetchCandidates();
    }
  }, [isAdmin]);

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingRequests(true);
    try {
      const params: any = {
        limit: pagination.limit,
        page: pagination.page,
        sortBy: 'createdAt:desc'
      };
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      if (filterLeaveType !== 'all') {
        params.leaveType = filterLeaveType;
      }
      
      if (filterCandidate !== 'all') {
        params.candidate = filterCandidate;
      }

      const response = await getAllLeaveRequests(params);
      const data = response?.data || response;
      const results = data?.results || [];
      
      // Ensure each result has a valid _id
      const validatedResults = results.map((req: any) => ({
        ...req,
        _id: req._id || req.id || ''
      })).filter((req: any) => req._id); // Filter out any without valid ID
      
      setLeaveRequests(validatedResults);
      setPagination({
        page: data?.page || pagination.page,
        limit: data?.limit || pagination.limit,
        totalPages: data?.totalPages || 1,
        totalResults: data?.totalResults || 0
      });
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load leave requests';
      
      if (errorMessage.includes('populate.split')) {
        // Backend bug workaround - try without sortBy
        try {
          const params: any = {
            limit: pagination.limit,
            page: pagination.page
          };
          if (filterStatus !== 'all') params.status = filterStatus;
          if (filterLeaveType !== 'all') params.leaveType = filterLeaveType;
          if (filterCandidate !== 'all') params.candidate = filterCandidate;
          
          const response = await getAllLeaveRequests(params);
          const data = response?.data || response;
          const results = data?.results || [];
          
          // Ensure each result has a valid _id
          const validatedResults = results.map((req: any) => ({
            ...req,
            _id: req._id || req.id || ''
          })).filter((req: any) => req._id); // Filter out any without valid ID
          
          setLeaveRequests(validatedResults);
          setPagination({
            page: data?.page || pagination.page,
            limit: data?.limit || pagination.limit,
            totalPages: data?.totalPages || 1,
            totalResults: data?.totalResults || 0
          });
        } catch (retryErr: any) {
          Swal.fire({
            icon: 'error',
            title: 'Backend Error',
            html: `
              <div class="text-left">
                <p>There's an issue with the server when loading leave requests.</p>
                <p class="mt-2 text-sm text-gray-600">Error: ${errorMessage}</p>
                <p class="mt-2 text-sm">Please contact support or try again later.</p>
              </div>
            `,
            confirmButtonText: 'OK'
          });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    } finally {
      setLoadingRequests(false);
      setLoading(false);
    }
  }, [isAdmin, filterStatus, filterLeaveType, filterCandidate, pagination.limit, pagination.page]);

  // Fetch requests when filters or pagination changes
  useEffect(() => {
    if (isAdmin) {
      fetchLeaveRequests();
    }
  }, [isAdmin, filterStatus, filterLeaveType, filterCandidate, pagination.page]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format dates array for display
  const formatDates = (dates: string[]): string => {
    return dates.map(date => formatDate(date)).join(', ');
  };

  // Handle approve request
  const handleApproveRequest = async (request: LeaveRequest) => {
    // Validate request ID
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid leave request ID. Please refresh the page and try again.',
        confirmButtonText: 'OK'
      });
      return;
    }

    const { value: adminComment } = await Swal.fire({
      title: 'Approve Leave Request',
      html: `
        <div class="text-left mb-4">
          <p><strong>Candidate:</strong> ${request.candidate.fullName}</p>
          <p><strong>Leave Type:</strong> ${request.leaveType === 'casual' ? 'Casual Leave' : request.leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave'}</p>
          <p><strong>Dates:</strong> ${formatDates(request.dates)}</p>
          <p><strong>Total Days:</strong> ${request.dates.length}</p>
        </div>
        <textarea 
          id="adminComment" 
          class="swal2-textarea" 
          placeholder="Add a comment (optional)"
          maxlength="1000"
        ></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#28a745',
      preConfirm: () => {
        const comment = (document.getElementById('adminComment') as HTMLTextAreaElement)?.value || '';
        return comment;
      }
    });

    if (adminComment === undefined) return; // User cancelled

    setProcessingId(requestId);
    try {
      const response = await approveLeaveRequest(requestId, adminComment || undefined);
      
      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        html: `
          <div class="text-left">
            <p>Leave request has been approved successfully.</p>
            <p class="mt-2 text-sm">The leave has been automatically assigned to the candidate's attendance calendar.</p>
          </div>
        `,
        confirmButtonText: 'OK'
      });

      // Refresh requests
      await fetchLeaveRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to approve leave request';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        html: `
          <div class="text-left">
            <p>${errorMessage}</p>
            ${errorMessage.includes('leave balance') || errorMessage.includes('limit') ? 
              '<p class="mt-2 text-sm text-gray-600">The candidate may have exceeded their leave balance.</p>' : ''}
          </div>
        `,
        confirmButtonText: 'OK'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject request
  const handleRejectRequest = async (request: LeaveRequest) => {
    // Validate request ID
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid leave request ID. Please refresh the page and try again.',
        confirmButtonText: 'OK'
      });
      return;
    }

    const { value: adminComment } = await Swal.fire({
      title: 'Reject Leave Request',
      html: `
        <div class="text-left mb-4">
          <p><strong>Candidate:</strong> ${request.candidate.fullName}</p>
          <p><strong>Leave Type:</strong> ${request.leaveType === 'casual' ? 'Casual Leave' : request.leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave'}</p>
          <p><strong>Dates:</strong> ${formatDates(request.dates)}</p>
        </div>
        <textarea 
          id="adminComment" 
          class="swal2-textarea" 
          placeholder="Reason for rejection (optional but recommended)"
          maxlength="1000"
        ></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      preConfirm: () => {
        const comment = (document.getElementById('adminComment') as HTMLTextAreaElement)?.value || '';
        return comment;
      }
    });

    if (adminComment === undefined) return; // User cancelled

    setProcessingId(requestId);
    try {
      await rejectLeaveRequest(requestId, adminComment || undefined);
      
      await Swal.fire({
        icon: 'success',
        title: 'Rejected',
        text: 'Leave request has been rejected successfully.',
        confirmButtonText: 'OK'
      });

      // Refresh requests
      await fetchLeaveRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to reject leave request';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: 'ri-time-line', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800 border-green-200', icon: 'ri-checkbox-circle-line', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-200', icon: 'ri-close-circle-line', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: 'ri-close-line', label: 'Cancelled' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  // Get leave type badge
  const getLeaveTypeBadge = (type: string) => {
    const typeConfig = {
      casual: { color: 'bg-blue-100 text-blue-800', label: 'Casual Leave' },
      sick: { color: 'bg-orange-100 text-orange-800', label: 'Sick Leave' },
      unpaid: { color: 'bg-purple-100 text-purple-800', label: 'Unpaid Leave' }
    };
    return typeConfig[type as keyof typeof typeConfig] || { color: 'bg-gray-100 text-gray-800', label: type };
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Leave Requests" />
        <Pageheader currentpage="Leave Requests" activepage="Master" mainpage="Leave Requests" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can view and manage leave requests.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Leave Requests" />
      <Pageheader currentpage="Leave Requests" activepage="Master" mainpage="Leave Requests" />
      <div className="space-y-6 mt-3">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as any);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Leave Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type
              </label>
              <select
                value={filterLeaveType}
                onChange={(e) => {
                  setFilterLeaveType(e.target.value as any);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            {/* Candidate Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate
              </label>
              <select
                value={filterCandidate}
                onChange={(e) => {
                  setFilterCandidate(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Candidates</option>
                {candidates.map((candidate) => (
                  <option key={candidate._id || candidate.id} value={candidate._id || candidate.id}>
                    {candidate.fullName || 'Unknown'} ({candidate.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Leave Requests
              {pagination.totalResults > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({pagination.totalResults} total)
                </span>
              )}
            </h2>
          </div>

          {loadingRequests ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></i>
              <p className="text-gray-600">Loading leave requests...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No leave requests found</p>
              {(filterStatus !== 'all' || filterLeaveType !== 'all' || filterCandidate !== 'all') && (
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterLeaveType('all');
                    setFilterCandidate('all');
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="mt-2 text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {leaveRequests.map((request) => {
                  const statusBadge = getStatusBadge(request.status);
                  const typeBadge = getLeaveTypeBadge(request.leaveType);
                  
                  return (
                    <div
                      key={request._id}
                      className={`p-4 border rounded-lg transition-shadow ${
                        request.status === 'pending' 
                          ? 'border-yellow-300 bg-yellow-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBadge.color}`}>
                              <i className={`${statusBadge.icon} me-1`}></i>
                              {statusBadge.label}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.color}`}>
                              {typeBadge.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Candidate:</strong> {request.candidate.fullName}
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Email:</strong> {request.candidate.email}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Dates:</strong> {formatDates(request.dates)}
                              </p>
                              <p className="text-sm text-gray-600 mb-1">
                                <strong>Total Days:</strong> {request.dates.length}
                              </p>
                            </div>
                          </div>
                          
                          {request.notes && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Notes:</strong> {request.notes}
                            </p>
                          )}
                          
                          {request.adminComment && (
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Admin Comment:</strong> {request.adminComment}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                            <span>
                              <i className="ri-calendar-line me-1"></i>
                              Requested: {formatDate(request.createdAt)}
                            </span>
                            {request.reviewedAt && (
                              <span>
                                <i className="ri-time-line me-1"></i>
                                Reviewed: {formatDate(request.reviewedAt)}
                              </span>
                            )}
                            {request.reviewedBy && (
                              <span>
                                <i className="ri-user-line me-1"></i>
                                By: {request.reviewedBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApproveRequest(request)}
                                disabled={processingId === (request._id || (request as any).id)}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Approve request"
                              >
                                {processingId === (request._id || (request as any).id) ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  <>
                                    <i className="ri-checkbox-circle-line me-1"></i>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request)}
                                disabled={processingId === (request._id || (request as any).id)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject request"
                              >
                                {processingId === (request._id || (request as any).id) ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  <>
                                    <i className="ri-close-circle-line me-1"></i>
                                    Reject
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1 || loadingRequests}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.totalPages || loadingRequests}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            <i className="ri-information-line me-2 text-primary"></i>
            About Leave Requests
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Candidates submit leave requests which appear here for review.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Approve:</strong> When approved, the leave is automatically assigned to the candidate's attendance calendar.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Reject:</strong> Rejected requests do not assign any leave. You can add a comment explaining the rejection.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Use filters to find specific requests by status, leave type, or candidate.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Pending requests are highlighted in yellow for easy identification.</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default LeaveRequestsPage;
