'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, createLeaveRequest, getLeaveRequestsByCandidate, cancelLeaveRequest, fetchCandidateById } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';

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

const LeavesPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Form state
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'casual' | 'sick' | 'unpaid'>('casual');
  const [notes, setNotes] = useState<string>('');

  // Leave requests state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');

  // Leave history state
  const [leaveHistory, setLeaveHistory] = useState<Array<{
    _id: string;
    date: string;
    leaveType: 'casual' | 'sick' | 'unpaid';
    notes: string | null;
    assignedAt: string;
  }>>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  
  // Leave balance
  const [leaveBalance, setLeaveBalance] = useState({
    casual: { used: 0, available: 21, total: 21 },
    sick: { used: 0, available: 5, total: 5 },
    unpaid: { used: 0, available: -1, total: -1 } // -1 means unlimited
  });

  // Load current user and profile
  useEffect(() => {
    try {
      const data = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      setCurrentUser(data ? JSON.parse(data) : null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Fetch candidate profile
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await fetchAllCandidates();
        const list = Array.isArray(data) ? data : (Array.isArray((data as any)?.results) ? (data as any).results : []);
        let chosen = list?.[0] || null;
        if (currentUser?.id) {
          const match = list.find((c: any) => String(c.owner) === String(currentUser.id));
          if (match) chosen = match;
        }
        setProfileData(chosen);
        if (chosen?._id || chosen?.id) {
          setCandidateId(chosen._id || chosen.id);
        }
      } catch (e: any) {
        console.error('Failed to load profile:', e);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    if (!candidateId) return;

    setLoadingRequests(true);
    try {
      // Use minimal params to avoid backend pagination plugin issues
      const params: any = {
        limit: 100,
        page: 1
      };
      
      // Only add sortBy if needed (some backends have issues with certain sort formats)
      // params.sortBy = 'createdAt:desc';
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await getLeaveRequestsByCandidate(candidateId, params);
      const results = response?.data?.results || response?.results || [];
      setLeaveRequests(results);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err);
      
      // Check if it's the populate.split error
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load leave requests';
      
      if (errorMessage.includes('populate.split')) {
        // This is a backend bug - try without sortBy as a workaround
        try {
          const params: any = {
            limit: 100,
            page: 1
          };
          if (filterStatus !== 'all') {
            params.status = filterStatus;
          }
          const response = await getLeaveRequestsByCandidate(candidateId, params);
          const results = response?.data?.results || response?.results || [];
          setLeaveRequests(results);
          return; // Success with workaround
        } catch (retryErr: any) {
          // If retry also fails, show error
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
    }
  }, [candidateId, filterStatus]);

  // Fetch leave history and calculate balance
  const fetchLeaveHistory = useCallback(async () => {
    if (!candidateId) return;

    setLoadingHistory(true);
    try {
      const candidateData = await fetchCandidateById(candidateId);
      const leaves = candidateData?.leaves || candidateData?.data?.leaves || [];
      
      // Sort leaves by date (newest first)
      const sortedLeaves = [...leaves].sort((a: any, b: any) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Descending order
      });
      
      setLeaveHistory(sortedLeaves);

      // Calculate leave balance
      const currentYear = new Date().getFullYear();
      const casualLeaves = leaves.filter((leave: any) => {
        const leaveDate = new Date(leave.date);
        return leave.leaveType === 'casual' && leaveDate.getFullYear() === currentYear;
      });
      const sickLeaves = leaves.filter((leave: any) => {
        const leaveDate = new Date(leave.date);
        return leave.leaveType === 'sick' && leaveDate.getFullYear() === currentYear;
      });
      const unpaidLeaves = leaves.filter((leave: any) => {
        const leaveDate = new Date(leave.date);
        return leave.leaveType === 'unpaid' && leaveDate.getFullYear() === currentYear;
      });

      setLeaveBalance({
        casual: {
          used: casualLeaves.length,
          available: Math.max(0, 21 - casualLeaves.length),
          total: 21
        },
        sick: {
          used: sickLeaves.length,
          available: Math.max(0, 5 - sickLeaves.length),
          total: 5
        },
        unpaid: {
          used: unpaidLeaves.length,
          available: -1, // Unlimited
          total: -1
        }
      });
    } catch (err: any) {
      console.error('Failed to fetch leave history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [candidateId]);

  // Fetch requests when candidate ID or filter changes
  useEffect(() => {
    if (candidateId) {
      fetchLeaveRequests();
      fetchLeaveHistory();
    }
  }, [candidateId, filterStatus, fetchLeaveRequests, fetchLeaveHistory]);

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

  // Add date to selected dates
  const handleAddDate = () => {
    if (!dateInput) {
      Swal.fire({
        icon: 'warning',
        title: 'No Date Selected',
        text: 'Please select a date first',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Parse date string (YYYY-MM-DD) and create ISO string at UTC midnight
    const [year, month, day] = dateInput.split('-').map(Number);
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`;

    // Check if date already exists
    if (selectedDates.includes(isoDate)) {
      Swal.fire({
        icon: 'info',
        title: 'Date Already Added',
        text: 'This date is already in the list',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Add date and sort
    const updatedDates = [...selectedDates, isoDate].sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
    setSelectedDates(updatedDates);
    setDateInput('');
  };

  // Remove date from selected dates
  const handleRemoveDate = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
  };

  // Handle create leave request
  const handleCreateLeaveRequest = async () => {
    if (!candidateId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Profile Not Found',
        text: 'Please ensure your profile is set up correctly',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (selectedDates.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Dates Selected',
        text: 'Please select at least one date for the leave',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!leaveType) {
      await Swal.fire({
        icon: 'warning',
        title: 'Leave Type Required',
        text: 'Please select a leave type (Casual, Sick, or Unpaid)',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Confirm request
    const result = await Swal.fire({
      icon: 'question',
      title: 'Submit Leave Request',
      html: `
        <div class="text-left">
          <p><strong>Leave Type:</strong> ${leaveType === 'casual' ? 'Casual Leave' : leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave'}</p>
          <p><strong>Dates:</strong> ${selectedDates.length} date(s)</p>
          <p><strong>Total Days:</strong> ${selectedDates.length}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Submit Request',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);
    try {
      await createLeaveRequest(candidateId, {
        dates: selectedDates,
        leaveType,
        notes: notes || undefined
      });

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Leave request submitted successfully. It will be reviewed by an administrator.',
        confirmButtonText: 'OK'
      });

      // Reset form
      setSelectedDates([]);
      setDateInput('');
      setNotes('');
      setLeaveType('casual');

      // Refresh requests
      await fetchLeaveRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to submit leave request';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel leave request
  const handleCancelRequest = async (requestId: string, dates: string[]) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancel Leave Request',
      html: `
        <div class="text-left">
          <p>Are you sure you want to cancel this leave request?</p>
          <p class="mt-2"><strong>Dates:</strong> ${formatDates(dates)}</p>
          <p class="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    setCancellingId(requestId);
    try {
      await cancelLeaveRequest(requestId);

      await Swal.fire({
        icon: 'success',
        title: 'Cancelled',
        text: 'Leave request cancelled successfully',
        confirmButtonText: 'OK'
      });

      // Refresh requests and history
      await fetchLeaveRequests();
      await fetchLeaveHistory();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to cancel leave request';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Get status badge color
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

  if (loading) {
    return (
      <>
        <Seo title="Leave Requests" />
        <Pageheader currentpage="Leave Requests" activepage="Leaves" mainpage="Leave Requests" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-4"></i>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!candidateId) {
    return (
      <>
        <Seo title="Leave Requests" />
        <Pageheader currentpage="Leave Requests" activepage="Leaves" mainpage="Leave Requests" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h3>
              <p className="text-gray-600">
                Please ensure your profile is set up correctly to request leaves.
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
      <Pageheader currentpage="Leave Requests" activepage="Leaves" mainpage="Leave Requests" />
      <div className="space-y-6 mt-3">
        {/* Leave Balance Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave Balance</h2>
          {loadingHistory ? (
            <div className="text-center py-8">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary mb-2"></i>
              <p className="text-gray-600 text-sm">Loading leave balance...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Casual Leave */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-900">Casual Leave</h3>
                  <i className="ri-calendar-line text-blue-600 text-xl"></i>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.casual.used} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available:</span>
                    <span className={`font-semibold ${leaveBalance.casual.available > 5 ? 'text-green-600' : leaveBalance.casual.available > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {leaveBalance.casual.available} days
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.casual.total} days</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${leaveBalance.casual.available > 5 ? 'bg-green-500' : leaveBalance.casual.available > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${(leaveBalance.casual.available / leaveBalance.casual.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Sick Leave */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-orange-900">Sick Leave</h3>
                  <i className="ri-medicine-bottle-line text-orange-600 text-xl"></i>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.sick.used} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available:</span>
                    <span className={`font-semibold ${leaveBalance.sick.available > 2 ? 'text-green-600' : leaveBalance.sick.available > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {leaveBalance.sick.available} days
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.sick.total} days</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${leaveBalance.sick.available > 2 ? 'bg-green-500' : leaveBalance.sick.available > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${(leaveBalance.sick.available / leaveBalance.sick.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Unpaid Leave */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-900">Unpaid Leave</h3>
                  <i className="ri-money-dollar-circle-line text-purple-600 text-xl"></i>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Used:</span>
                    <span className="font-medium text-gray-900">{leaveBalance.unpaid.used} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available:</span>
                    <span className="font-semibold text-purple-600">Unlimited</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-gray-900">Unlimited</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 italic">
                    No limit on unpaid leave
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Leave Request Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Request Leave</h2>

          <div className="space-y-6">
            {/* Leave Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Leave Type <span className="text-red-500">*</span>
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as 'casual' | 'sick' | 'unpaid')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Dates <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3 mb-3">
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <i className="ri-add-line me-1"></i>
                  Add Date
                </button>
              </div>
              
              {selectedDates.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Selected Dates ({selectedDates.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-md text-sm font-medium"
                      >
                        {formatDate(date)}
                        <button
                          type="button"
                          onClick={() => handleRemoveDate(date)}
                          className="text-blue-600 hover:text-blue-800 focus:outline-none"
                          title="Remove date"
                        >
                          <i className="ri-close-line text-base"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedDates.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  No dates selected. Click "Add Date" to add leave dates.
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter leave notes (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">
                {notes.length}/1000 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreateLeaveRequest}
                disabled={submitting || selectedDates.length === 0}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-1"></i>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="ri-calendar-check-line me-1"></i>
                    Submit Leave Request
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedDates([]);
                  setDateInput('');
                  setNotes('');
                  setLeaveType('casual');
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>

        {/* Leave Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Leave Requests</h2>
            
            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
              {filterStatus !== 'all' && (
                <button
                  onClick={() => setFilterStatus('all')}
                  className="mt-2 text-primary hover:underline"
                >
                  Show all requests
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => {
                const statusBadge = getStatusBadge(request.status);
                const typeBadge = getLeaveTypeBadge(request.leaveType);
                
                return (
                  <div
                    key={request._id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${statusBadge.color}`}>
                            <i className={`${statusBadge.icon} me-1`}></i>
                            {statusBadge.label}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Dates:</strong> {formatDates(request.dates)}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Total Days:</strong> {request.dates.length}
                        </p>
                        {request.notes && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Notes:</strong> {request.notes}
                          </p>
                        )}
                        {request.adminComment && (
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Admin Comment:</strong> {request.adminComment}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Requested on {formatDate(request.createdAt)}
                          {request.reviewedAt && (
                            <> • Reviewed on {formatDate(request.reviewedAt)}</>
                          )}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request._id, request.dates)}
                            disabled={cancellingId === request._id}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Cancel request"
                          >
                            {cancellingId === request._id ? (
                              <i className="ri-loader-4-line animate-spin"></i>
                            ) : (
                              <>
                                <i className="ri-close-line me-1"></i>
                                Cancel
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leave History Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leave History</h2>
          {loadingHistory ? (
            <div className="text-center py-8">
              <i className="ri-loader-4-line animate-spin text-2xl text-primary mb-2"></i>
              <p className="text-gray-600 text-sm">Loading leave history...</p>
            </div>
          ) : leaveHistory.length === 0 ? (
            <div className="text-center py-8">
              <i className="ri-inbox-line text-4xl text-gray-400 mb-2"></i>
              <p className="text-gray-600">No leave history found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveHistory.map((leave) => {
                    const typeBadge = leave.leaveType === 'casual' 
                      ? { color: 'bg-blue-100 text-blue-800', label: 'Casual Leave' }
                      : leave.leaveType === 'sick'
                      ? { color: 'bg-orange-100 text-orange-800', label: 'Sick Leave' }
                      : { color: 'bg-purple-100 text-purple-800', label: 'Unpaid Leave' };
                    
                    return (
                      <tr key={leave._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(leave.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.color}`}>
                            {typeBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {leave.notes || <span className="text-gray-400 italic">No notes</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(leave.assignedAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              <span>Submit leave requests for review by administrators. Requests will be approved or rejected based on leave balance and company policies.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Casual Leave:</strong> Paid leave (limit: 21 days per year)</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Sick Leave:</strong> Paid leave (limit: 5 days per year)</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span><strong>Unpaid Leave:</strong> No limit, but requires approval</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>You can cancel pending requests. Once approved or rejected, requests cannot be cancelled.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>When approved, leaves are automatically assigned to your attendance calendar.</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default LeavesPage;
