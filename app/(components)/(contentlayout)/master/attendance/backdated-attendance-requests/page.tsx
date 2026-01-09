'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllBackdatedAttendanceRequests, approveBackdatedAttendanceRequest, rejectBackdatedAttendanceRequest, updateBackdatedAttendanceRequest, fetchAllCandidates } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';

type AttendanceEntry = {
  date: string;
  punchIn: string;
  punchOut?: string | null;
  timezone?: string;
};

type BackdatedAttendanceRequest = {
  _id: string;
  candidate: {
    _id: string;
    fullName: string;
    email: string;
  };
  attendanceEntries?: AttendanceEntry[];
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
  // Legacy fields for backward compatibility
  date?: string;
  punchIn?: string;
  punchOut?: string | null;
  timezone?: string;
};

const BackdatedAttendanceRequestsPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingRequest, setEditingRequest] = useState<BackdatedAttendanceRequest | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [filterCandidate, setFilterCandidate] = useState<string>('all');
  const [candidates, setCandidates] = useState<any[]>([]);

  // Requests
  const [requests, setRequests] = useState<BackdatedAttendanceRequest[]>([]);
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

  // Fetch requests
  const fetchRequests = useCallback(async () => {
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
      
      if (filterCandidate !== 'all') {
        params.candidate = filterCandidate;
      }

      const response = await getAllBackdatedAttendanceRequests(params);
      const data = response?.data || response;
      const results = data?.results || [];
      
      // Ensure each result has a valid _id
      const validatedResults = results.map((req: any) => ({
        ...req,
        _id: req._id || req.id || ''
      })).filter((req: any) => req._id);
      
      setRequests(validatedResults);
      setPagination({
        page: data?.page || pagination.page,
        limit: data?.limit || pagination.limit,
        totalPages: data?.totalPages || 1,
        totalResults: data?.totalResults || 0
      });
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load requests';
      
      if (errorMessage.includes('populate.split')) {
        // Backend bug workaround
        try {
          const params: any = {
            limit: pagination.limit,
            page: pagination.page
          };
          if (filterStatus !== 'all') params.status = filterStatus;
          if (filterCandidate !== 'all') params.candidate = filterCandidate;
          
          const response = await getAllBackdatedAttendanceRequests(params);
          const data = response?.data || response;
          const results = data?.results || [];
          
          const validatedResults = results.map((req: any) => ({
            ...req,
            _id: req._id || req.id || ''
          })).filter((req: any) => req._id);
          
          setRequests(validatedResults);
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
                <p>There's an issue with the server when loading requests.</p>
                <p class="mt-2 text-sm text-gray-600">Error: ${errorMessage}</p>
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
  }, [isAdmin, filterStatus, filterCandidate, pagination.limit, pagination.page]);

  useEffect(() => {
    if (isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, filterStatus, filterCandidate, pagination.page]);

  // Format date/time
  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

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

  // Handle approve
  const handleApprove = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid request ID',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Get entries (support both new and legacy format)
    const entries = request.attendanceEntries || (request.date ? [{
      date: request.date,
      punchIn: request.punchIn || '',
      punchOut: request.punchOut,
      timezone: request.timezone
    }] : []);

    const entriesHtml = entries.map((entry: any, index: number) => `
      <div class="mb-3 p-2 bg-gray-50 rounded">
        <p><strong>Date ${entries.length > 1 ? `${index + 1}:` : ':'}</strong> ${formatDate(entry.date)}</p>
        <p><strong>Punch In:</strong> ${formatDateTime(entry.punchIn)}</p>
        ${entry.punchOut ? `<p><strong>Punch Out:</strong> ${formatDateTime(entry.punchOut)}</p>` : '<p><strong>Punch Out:</strong> Not provided</p>'}
        ${entry.timezone ? `<p><strong>Timezone:</strong> ${entry.timezone}</p>` : ''}
      </div>
    `).join('');

    const { value: adminComment } = await Swal.fire({
      title: 'Approve Backdated Attendance Request',
      html: `
        <div class="text-left mb-4">
          <p><strong>Candidate:</strong> ${request.candidate.fullName}</p>
          ${entriesHtml}
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

    if (adminComment === undefined) return;

    setProcessingId(requestId);
    try {
      await approveBackdatedAttendanceRequest(requestId, adminComment || undefined);
      
      await Swal.fire({
        icon: 'success',
        title: 'Approved',
        html: `
          <div class="text-left">
            <p>Backdated attendance request has been approved successfully.</p>
            <p class="mt-2 text-sm">The attendance record has been created/updated in the candidate's attendance calendar.</p>
          </div>
        `,
        confirmButtonText: 'OK'
      });

      await fetchRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to approve request';
      
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

  // Handle reject
  const handleReject = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid request ID',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Get entries (support both new and legacy format)
    const entries = request.attendanceEntries || (request.date ? [{
      date: request.date,
      punchIn: request.punchIn || '',
      punchOut: request.punchOut,
      timezone: request.timezone
    }] : []);

    const datesHtml = entries.map((entry: any, index: number) => 
      `<p><strong>Date ${entries.length > 1 ? `${index + 1}:` : ':'}</strong> ${formatDate(entry.date)}</p>`
    ).join('');

    const { value: adminComment } = await Swal.fire({
      title: 'Reject Backdated Attendance Request',
      html: `
        <div class="text-left mb-4">
          <p><strong>Candidate:</strong> ${request.candidate.fullName}</p>
          ${datesHtml}
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

    if (adminComment === undefined) return;

    setProcessingId(requestId);
    try {
      await rejectBackdatedAttendanceRequest(requestId, adminComment || undefined);
      
      await Swal.fire({
        icon: 'success',
        title: 'Rejected',
        text: 'Backdated attendance request has been rejected successfully.',
        confirmButtonText: 'OK'
      });

      await fetchRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to reject request';
      
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

  // Handle update
  const handleUpdate = async (request: BackdatedAttendanceRequest) => {
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid request ID',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Get entries (support both new and legacy format)
    const entries = request.attendanceEntries || (request.date ? [{
      date: request.date,
      punchIn: request.punchIn || '',
      punchOut: request.punchOut,
      timezone: request.timezone
    }] : []);

    if (entries.length === 0) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No attendance entries found in this request',
        confirmButtonText: 'OK'
      });
      return;
    }

    // For multiple entries, show a simplified update form (update first entry or notes)
    // In a production system, you might want a more comprehensive update interface
    const firstEntry = entries[0];
    const dateObj = new Date(firstEntry.date);
    const punchInObj = new Date(firstEntry.punchIn);
    const punchOutObj = firstEntry.punchOut ? new Date(firstEntry.punchOut) : null;

    const dateStr = dateObj.toISOString().split('T')[0];
    const punchInTimeStr = punchInObj.toTimeString().slice(0, 5);
    const punchOutTimeStr = punchOutObj ? punchOutObj.toTimeString().slice(0, 5) : '';

    const updateMessage = entries.length > 1 
      ? `<p class="text-sm text-yellow-600 mb-2">Note: This request has ${entries.length} dates. Updating will modify the first entry. For full control, consider rejecting and asking the candidate to resubmit.</p>`
      : '';

    const { value: formData } = await Swal.fire({
      title: 'Update Backdated Attendance Request',
      html: `
        <div class="text-left mb-4">
          <p><strong>Candidate:</strong> ${request.candidate.fullName}</p>
          ${updateMessage}
        </div>
        <input id="date" type="date" value="${dateStr}" class="swal2-input" placeholder="Date" max="${new Date().toISOString().split('T')[0]}">
        <input id="punchIn" type="time" value="${punchInTimeStr}" class="swal2-input" placeholder="Punch In Time">
        <input id="punchOut" type="time" value="${punchOutTimeStr}" class="swal2-input" placeholder="Punch Out Time (optional)">
        <input id="timezone" type="text" value="${firstEntry.timezone || 'Asia/Kolkata'}" class="swal2-input" placeholder="Timezone">
        <textarea id="notes" class="swal2-textarea" placeholder="Notes (optional)">${request.notes || ''}</textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Update',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      preConfirm: () => {
        const date = (document.getElementById('date') as HTMLInputElement)?.value;
        const punchIn = (document.getElementById('punchIn') as HTMLInputElement)?.value;
        const punchOut = (document.getElementById('punchOut') as HTMLInputElement)?.value;
        const timezone = (document.getElementById('timezone') as HTMLInputElement)?.value;
        const notes = (document.getElementById('notes') as HTMLTextAreaElement)?.value;

        if (!date || !punchIn) {
          Swal.showValidationMessage('Date and punch in time are required');
          return false;
        }

        return { date, punchIn, punchOut, timezone, notes };
      }
    });

    if (!formData) return;

    setProcessingId(requestId);
    try {
      const punchInISO = new Date(`${formData.date}T${formData.punchIn}`).toISOString();
      const punchOutISO = formData.punchOut ? new Date(`${formData.date}T${formData.punchOut}`).toISOString() : null;
      const dateISO = new Date(formData.date).toISOString();

      // If request has multiple entries, update only the first one
      // Otherwise, create a single entry array
      const attendanceEntries = entries.length > 1 
        ? entries.map((entry: any, index: number) => {
            if (index === 0) {
              // Update first entry
              return {
                date: dateISO,
                punchIn: punchInISO,
                punchOut: punchOutISO,
                timezone: formData.timezone || entry.timezone || 'Asia/Kolkata'
              };
            }
            // Keep other entries as is
            return {
              date: entry.date,
              punchIn: entry.punchIn,
              punchOut: entry.punchOut || null,
              timezone: entry.timezone || 'Asia/Kolkata'
            };
          })
        : [{
            date: dateISO,
            punchIn: punchInISO,
            punchOut: punchOutISO,
            timezone: formData.timezone || 'Asia/Kolkata'
          }];

      await updateBackdatedAttendanceRequest(requestId, {
        attendanceEntries,
        notes: formData.notes || undefined
      });
      
      await Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: 'Backdated attendance request has been updated successfully.',
        confirmButtonText: 'OK'
      });

      await fetchRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update request';
      
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

  if (!isAdmin) {
    return (
      <>
        <Seo title="Backdated Attendance Requests" />
        <Pageheader currentpage="Backdated Attendance Requests" activepage="Master" mainpage="Backdated Attendance Requests" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can view and manage backdated attendance requests.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Backdated Attendance Requests" />
      <Pageheader currentpage="Backdated Attendance Requests" activepage="Master" mainpage="Backdated Attendance Requests" />
      <div className="space-y-6 mt-3">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Backdated Attendance Requests
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
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No requests found</p>
              {(filterStatus !== 'all' || filterCandidate !== 'all') && (
                <button
                  onClick={() => {
                    setFilterStatus('all');
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
                {requests.map((request) => {
                  const statusBadge = getStatusBadge(request.status);
                  const requestId = request._id || (request as any).id;
                  
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
                          </div>
                          
                          {/* Get entries (support both new and legacy format) */}
                          {(() => {
                            const entries = request.attendanceEntries || (request.date ? [{
                              date: request.date,
                              punchIn: request.punchIn || '',
                              punchOut: request.punchOut,
                              timezone: request.timezone
                            }] : []);

                            return (
                              <>
                                <div className="mb-3">
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Candidate:</strong> {request.candidate.fullName}
                                  </p>
                                  <p className="text-sm text-gray-600 mb-1">
                                    <strong>Email:</strong> {request.candidate.email}
                                  </p>
                                  {entries.length > 1 && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <strong>Total Dates:</strong> {entries.length}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Display all entries */}
                                <div className="space-y-3 mb-3">
                                  {entries.map((entry: any, index: number) => (
                                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-sm text-gray-600 mb-1">
                                            <strong>Date {entries.length > 1 ? `${index + 1}:` : ':'}</strong> {formatDate(entry.date)}
                                          </p>
                                          <p className="text-sm text-gray-600 mb-1">
                                            <strong>Punch In:</strong> {formatDateTime(entry.punchIn)}
                                          </p>
                                          {entry.punchOut ? (
                                            <p className="text-sm text-gray-600 mb-1">
                                              <strong>Punch Out:</strong> {formatDateTime(entry.punchOut)}
                                            </p>
                                          ) : (
                                            <p className="text-sm text-gray-600 mb-1">
                                              <strong>Punch Out:</strong> Not provided
                                            </p>
                                          )}
                                        </div>
                                        <div>
                                          {entry.timezone && (
                                            <p className="text-sm text-gray-600 mb-1">
                                              <strong>Timezone:</strong> {entry.timezone}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                          
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
                              Requested: {formatDateTime(request.createdAt)}
                            </span>
                            {request.reviewedAt && (
                              <span>
                                <i className="ri-time-line me-1"></i>
                                Reviewed: {formatDateTime(request.reviewedAt)}
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
                                onClick={() => handleUpdate(request)}
                                disabled={processingId === requestId}
                                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Update request"
                              >
                                {processingId === requestId ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  <>
                                    <i className="ri-edit-line me-1"></i>
                                    Update
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleApprove(request)}
                                disabled={processingId === requestId}
                                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Approve request"
                              >
                                {processingId === requestId ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  <>
                                    <i className="ri-checkbox-circle-line me-1"></i>
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(request)}
                                disabled={processingId === requestId}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reject request"
                              >
                                {processingId === requestId ? (
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
            About Backdated Attendance Requests
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Candidates submit backdated attendance requests which appear here for review.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Update:</strong> You can modify request details (date, times, timezone, notes) before approval.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Approve:</strong> When approved, the attendance record is automatically created/updated in the candidate's attendance calendar.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Reject:</strong> Rejected requests do not create any attendance records. You can add a comment explaining the rejection.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>If attendance already exists for the date, it gets updated with the new punch-in/punch-out times.</span>
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

export default BackdatedAttendanceRequestsPage;
