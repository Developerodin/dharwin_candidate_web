'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, assignLeavesToCandidates, fetchCandidateById, getAttendanceByCandidate, updateLeave, deleteLeave, cancelLeave } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import("react-select"), { ssr: false });

type Candidate = {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
};

const AssignLeavePage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [leaveType, setLeaveType] = useState<'casual' | 'sick' | 'unpaid'>('casual');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateLeaves, setCandidateLeaves] = useState<Record<string, Array<{
    _id: string;
    date: string;
    leaveType: 'casual' | 'sick' | 'unpaid';
    notes: string | null;
    assignedAt: string;
  }>>>({});
  const [loadingLeaves, setLoadingLeaves] = useState<boolean>(false);
  const [editingLeave, setEditingLeave] = useState<{
    candidateId: string;
    leaveId: string;
    date: string;
    leaveType: 'casual' | 'sick' | 'unpaid';
    notes: string;
  } | null>(null);
  const [updatingLeave, setUpdatingLeave] = useState<boolean>(false);
  const [deletingLeaveId, setDeletingLeaveId] = useState<string | null>(null);

  const SELECT_ALL_CANDIDATES_VALUE = "__all_candidates__";

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

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingCandidates(true);
    try {
      const data = await fetchAllCandidates({
        page: 1,
        limit: 1000,
        sortBy: 'fullName:asc'
      });

      const normalized = Array.isArray(data)
        ? data
        : (Array.isArray((data as any)?.results)
          ? (data as any).results
          : (Array.isArray((data as any)?.data) ? (data as any).data : []));

      const candidateOptions = normalized.map((candidate: Candidate) => ({
        value: candidate.id || candidate._id || '',
        label: `${candidate.fullName || 'Unknown'} (${candidate.email || 'No email'})`,
        candidate: candidate
      })).filter((option: any) => option.value);

      setCandidates(candidateOptions);
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
      setError(err?.message || 'Failed to fetch candidates');
    } finally {
      setLoadingCandidates(false);
    }
  }, [isAdmin]);

  const candidateOptionsWithSelectAll = candidates.length
    ? [
        {
          value: SELECT_ALL_CANDIDATES_VALUE,
          label: "Select All Candidates",
        },
        ...candidates,
      ]
    : candidates;

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      fetchCandidates().finally(() => {
        setLoading(false);
      });
    }
  }, [isAdmin, fetchCandidates]);

  // Fetch leaves for selected candidates
  const fetchCandidateLeaves = useCallback(async (candidateIds: string[]) => {
    if (candidateIds.length === 0) {
      setCandidateLeaves({});
      return;
    }

    setLoadingLeaves(true);
    const leavesMap: Record<string, Array<{
      _id: string;
      date: string;
      leaveType: 'casual' | 'sick' | 'unpaid';
      notes: string | null;
      assignedAt: string;
    }>> = {};

    try {
      await Promise.all(
        candidateIds.map(async (candidateId) => {
          try {
            const candidateData = await fetchCandidateById(candidateId);
            const leaves = candidateData?.leaves || candidateData?.data?.leaves || [];
            leavesMap[candidateId] = leaves;
          } catch (err) {
            console.error(`Failed to fetch leaves for candidate ${candidateId}:`, err);
            leavesMap[candidateId] = [];
          }
        })
      );

      setCandidateLeaves(leavesMap);
    } catch (err) {
      console.error('Error fetching candidate leaves:', err);
    } finally {
      setLoadingLeaves(false);
    }
  }, []);

  // Handle candidate selection change
  const handleCandidateChange = (selectedOptions: any) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedCandidates([]);
      setCandidateLeaves({});
      return;
    }

    // Check if "Select All" was selected
    const hasSelectAll = selectedOptions.some(
      (opt: any) => opt.value === SELECT_ALL_CANDIDATES_VALUE
    );

    let finalSelected: any[];
    if (hasSelectAll) {
      // If "Select All" is selected, select all candidates
      finalSelected = candidates;
    } else {
      finalSelected = selectedOptions;
    }

    setSelectedCandidates(finalSelected);

    // Fetch leaves for selected candidates
    const candidateIds = finalSelected.map((opt: any) => opt.value).filter(Boolean);
    fetchCandidateLeaves(candidateIds);
  };

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
    // This ensures the API receives the exact date selected (e.g., Jan 8 = 2026-01-08T00:00:00.000Z)
    const [year, month, day] = dateInput.split('-').map(Number);
    // Create date string directly as UTC midnight for the selected date
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

  // Handle assign leaves
  const handleAssignLeaves = async () => {
    if (selectedCandidates.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Candidates Selected',
        text: 'Please select at least one candidate',
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

    // Confirm assignment
    const result = await Swal.fire({
      icon: 'question',
      title: 'Assign Leave',
      html: `
        <div class="text-left">
          <p><strong>Candidates:</strong> ${selectedCandidates.length}</p>
          <p><strong>Leave Type:</strong> ${leaveType === 'casual' ? 'Casual Leave' : leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave'}</p>
          <p><strong>Dates:</strong> ${selectedDates.length} date(s)</p>
          <p><strong>Total Records:</strong> ${selectedCandidates.length * selectedDates.length}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Assign Leave',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
    });

    if (!result.isConfirmed) return;

    setAssigning(true);
    setError(null);

    try {
      const candidateIds = selectedCandidates.map((opt: any) => opt.value).filter(Boolean);
      
      const response = await assignLeavesToCandidates(
        candidateIds,
        selectedDates,
        leaveType,
        notes || undefined
      );

      const data = response?.data || response;
      const candidatesUpdated = data?.candidatesUpdated || selectedCandidates.length;
      const attendanceRecordsCreated = data?.attendanceRecordsCreated || 0;
      const skipped = data?.skipped || [];

      let message = `Leaves assigned to ${candidatesUpdated} candidate(s). Created ${attendanceRecordsCreated} attendance record(s).`;
      
      if (skipped.length > 0) {
        message += `\n\n${skipped.length} date(s) were skipped because attendance already exists.`;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: message.replace(/\n/g, '<br>'),
        confirmButtonText: 'OK'
      });

      // Refresh leaves data before resetting
      const currentCandidateIds = selectedCandidates.map((opt: any) => opt.value).filter(Boolean);
      
      // Reset form
      setSelectedCandidates([]);
      setSelectedDates([]);
      setDateInput('');
      setNotes('');
      setLeaveType('casual');
      setCandidateLeaves({});
      
      // Refresh leaves data if candidates were selected
      if (currentCandidateIds.length > 0) {
        // Note: This won't work since we just cleared selectedCandidates
        // The leaves will be refreshed when user selects candidates again
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign leaves';
      setError(errorMessage);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setAssigning(false);
    }
  };

  // Handle update leave
  const handleUpdateLeave = async (candidateId: string, leaveId: string, updates: {
    date?: string;
    leaveType?: 'casual' | 'sick' | 'unpaid';
    notes?: string;
  }) => {
    setUpdatingLeave(true);
    setError(null);

    try {
      await updateLeave(candidateId, leaveId, updates);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Leave updated successfully',
        confirmButtonText: 'OK'
      });

      // Refresh leaves data
      const candidateIds = selectedCandidates.map((opt: any) => opt.value).filter(Boolean);
      await fetchCandidateLeaves(candidateIds);
      
      setEditingLeave(null);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update leave';
      setError(errorMessage);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setUpdatingLeave(false);
    }
  };

  // Handle delete leave
  const handleDeleteLeave = async (candidateId: string, leaveId: string, candidateName: string, leaveDate: string) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Leave',
      html: `
        <div class="text-left">
          <p>Are you sure you want to delete this leave?</p>
          <p class="mt-2"><strong>Candidate:</strong> ${candidateName}</p>
          <p><strong>Date:</strong> ${formatDate(leaveDate)}</p>
        </div>
      `,
      text: 'This action cannot be undone.',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    setDeletingLeaveId(leaveId);
    setError(null);

    try {
      await deleteLeave(candidateId, leaveId);

      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Leave deleted successfully',
        confirmButtonText: 'OK'
      });

      // Refresh leaves data
      const candidateIds = selectedCandidates.map((opt: any) => opt.value).filter(Boolean);
      await fetchCandidateLeaves(candidateIds);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete leave';
      setError(errorMessage);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setDeletingLeaveId(null);
    }
  };

  // Handle cancel leave
  const handleCancelLeave = async (candidateId: string, leaveId: string, candidateName: string, leaveDate: string) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Cancel Leave',
      html: `
        <div class="text-left">
          <p>Are you sure you want to cancel this leave?</p>
          <p class="mt-2"><strong>Candidate:</strong> ${candidateName}</p>
          <p><strong>Date:</strong> ${formatDate(leaveDate)}</p>
          <p class="mt-2 text-sm text-gray-600">This will remove the leave and its attendance record.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#3085d6',
    });

    if (!result.isConfirmed) return;

    setDeletingLeaveId(leaveId);
    setError(null);

    try {
      await cancelLeave(candidateId, leaveId);

      await Swal.fire({
        icon: 'success',
        title: 'Cancelled',
        text: 'Leave cancelled successfully',
        confirmButtonText: 'OK'
      });

      // Refresh leaves data
      const candidateIds = selectedCandidates.map((opt: any) => opt.value).filter(Boolean);
      await fetchCandidateLeaves(candidateIds);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to cancel leave';
      
      // Check if it's a backend implementation error
      if (errorMessage.includes('cancelLeaveForCandidate is not defined') || errorMessage.includes('not defined')) {
        await Swal.fire({
          icon: 'warning',
          title: 'Feature Not Available',
          html: `
            <div class="text-left">
              <p>The cancel leave feature is not yet implemented on the backend.</p>
              <p class="mt-2 text-sm">Please use the "Delete" option instead, or contact the development team to implement the cancel endpoint.</p>
            </div>
          `,
          confirmButtonText: 'OK'
        });
      } else {
        setError(errorMessage);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    } finally {
      setDeletingLeaveId(null);
    }
  };

  // Handle edit leave click
  const handleEditLeaveClick = (candidateId: string, leave: {
    _id: string;
    date: string;
    leaveType: 'casual' | 'sick' | 'unpaid';
    notes: string | null;
    assignedAt: string;
  }) => {
    // Convert ISO date to YYYY-MM-DD format for date input
    const dateObj = new Date(leave.date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    setEditingLeave({
      candidateId,
      leaveId: leave._id,
      date: dateString,
      leaveType: leave.leaveType,
      notes: leave.notes || ''
    });
  };

  // Handle save edited leave
  const handleSaveEditedLeave = async () => {
    if (!editingLeave) return;

    // Validate
    if (!editingLeave.date) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Date is required',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Convert date to ISO format
    const dateObj = new Date(editingLeave.date);
    const isoDate = dateObj.toISOString();

    const updates: {
      date?: string;
      leaveType?: 'casual' | 'sick' | 'unpaid';
      notes?: string;
    } = {};

    // Only include changed fields
    const originalLeave = candidateLeaves[editingLeave.candidateId]?.find(l => l._id === editingLeave.leaveId);
    if (originalLeave) {
      const originalDate = new Date(originalLeave.date).toISOString().split('T')[0];
      const newDate = new Date(editingLeave.date).toISOString().split('T')[0];
      
      if (originalDate !== newDate) {
        updates.date = isoDate;
      }
      if (originalLeave.leaveType !== editingLeave.leaveType) {
        updates.leaveType = editingLeave.leaveType;
      }
      if (originalLeave.notes !== editingLeave.notes) {
        updates.notes = editingLeave.notes || undefined;
      }
    } else {
      // If we can't find original, send all fields
      updates.date = isoDate;
      updates.leaveType = editingLeave.leaveType;
      updates.notes = editingLeave.notes || undefined;
    }

    if (Object.keys(updates).length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made',
        confirmButtonText: 'OK'
      });
      setEditingLeave(null);
      return;
    }

    await handleUpdateLeave(editingLeave.candidateId, editingLeave.leaveId, updates);
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Assign Leave" />
        <Pageheader currentpage="Assign Leave" activepage="Master" mainpage="Assign Leave" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can assign leaves to candidates.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Leave" />
      <Pageheader currentpage="Assign Leave" activepage="Master" mainpage="Assign Leave" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Leave to Candidates</h2>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Candidate Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Candidates <span className="text-red-500">*</span>
              </label>
              <Select
                isMulti
                options={candidateOptionsWithSelectAll}
                value={selectedCandidates}
                onChange={handleCandidateChange}
                isLoading={loadingCandidates}
                placeholder="Select candidates..."
                className="react-select-container"
                classNamePrefix="react-select"
                isClearable
                isSearchable
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '42px',
                    borderColor: '#d1d5db',
                  }),
                }}
              />
              {selectedCandidates.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedCandidates.length} candidate(s) selected
                </p>
              )}
            </div>

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
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {notes.length}/500 characters
              </p>
            </div>

            {/* Summary */}
            {selectedCandidates.length > 0 && selectedDates.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Assignment Summary</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Candidates:</strong> {selectedCandidates.length}</p>
                  <p><strong>Leave Type:</strong> {leaveType === 'casual' ? 'Casual Leave' : leaveType === 'sick' ? 'Sick Leave' : 'Unpaid Leave'}</p>
                  <p><strong>Dates:</strong> {selectedDates.length}</p>
                  <p><strong>Total Leave Records:</strong> {selectedCandidates.length * selectedDates.length}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAssignLeaves}
                disabled={assigning || selectedCandidates.length === 0 || selectedDates.length === 0}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-1"></i>
                    Assigning...
                  </>
                ) : (
                  <>
                    <i className="ri-calendar-check-line me-1"></i>
                    Assign Leave
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedCandidates([]);
                  setSelectedDates([]);
                  setDateInput('');
                  setNotes('');
                  setLeaveType('casual');
                  setError(null);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={assigning}
              >
                Clear Form
              </button>
            </div>
          </div>

          {/* Candidate Leaves Details Section */}
          {selectedCandidates.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Leave Details for Selected Candidates
                {loadingLeaves && (
                  <i className="ri-loader-4-line animate-spin ml-2 text-primary"></i>
                )}
              </h3>
              
              {loadingLeaves ? (
                <div className="text-center py-8 text-gray-600">
                  <i className="ri-loader-4-line animate-spin text-2xl mb-2"></i>
                  <p>Loading leave details...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCandidates.map((selected: any) => {
                    const candidateId = selected.value;
                    const leaves = candidateLeaves[candidateId] || [];
                    const candidateName = selected.label || selected.candidate?.fullName || 'Unknown';
                    
                    // Group leaves by type
                    const casualLeaves = leaves.filter(l => l.leaveType === 'casual');
                    const sickLeaves = leaves.filter(l => l.leaveType === 'sick');
                    const unpaidLeaves = leaves.filter(l => l.leaveType === 'unpaid');
                    
                    return (
                      <div
                        key={candidateId}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">
                              {candidateName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Total Leaves: {leaves.length}
                            </p>
                          </div>
                        </div>
                        
                        {leaves.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            No leaves assigned
                          </p>
                        ) : (
                          <div className="space-y-3 mt-3">
                            {/* Casual Leaves */}
                            {casualLeaves.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-orange-700 mb-1">
                                  Casual Leave ({casualLeaves.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {casualLeaves.map((leave) => (
                                    <span
                                      key={leave._id}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-800 rounded-md text-xs"
                                      title={leave.notes || ''}
                                    >
                                      {formatDate(leave.date)}
                                      {leave.notes && (
                                        <i className="ri-file-text-line text-xs"></i>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleEditLeaveClick(candidateId, leave)}
                                        className="ml-1.5 px-1 py-0.5 text-orange-600 hover:text-orange-800 hover:bg-orange-100 rounded focus:outline-none transition-colors"
                                        title="Edit leave"
                                      >
                                        <i className="ri-pencil-line text-sm"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded focus:outline-none transition-colors"
                                        title="Cancel leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-close-circle-line text-sm"></i>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded focus:outline-none transition-colors"
                                        title="Delete leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-delete-bin-line text-sm"></i>
                                        )}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Sick Leaves */}
                            {sickLeaves.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-purple-700 mb-1">
                                  Sick Leave ({sickLeaves.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {sickLeaves.map((leave) => (
                                    <span
                                      key={leave._id}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-800 rounded-md text-xs"
                                      title={leave.notes || ''}
                                    >
                                      {formatDate(leave.date)}
                                      {leave.notes && (
                                        <i className="ri-file-text-line text-xs"></i>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleEditLeaveClick(candidateId, leave)}
                                        className="ml-1.5 px-1 py-0.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded focus:outline-none transition-colors"
                                        title="Edit leave"
                                      >
                                        <i className="ri-pencil-line text-sm"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded focus:outline-none transition-colors"
                                        title="Cancel leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-close-circle-line text-sm"></i>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded focus:outline-none transition-colors"
                                        title="Delete leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-delete-bin-line text-sm"></i>
                                        )}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Unpaid Leaves */}
                            {unpaidLeaves.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-700 mb-1">
                                  Unpaid Leave ({unpaidLeaves.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {unpaidLeaves.map((leave) => (
                                    <span
                                      key={leave._id}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-800 rounded-md text-xs"
                                      title={leave.notes || ''}
                                    >
                                      {formatDate(leave.date)}
                                      {leave.notes && (
                                        <i className="ri-file-text-line text-xs"></i>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleEditLeaveClick(candidateId, leave)}
                                        className="ml-1.5 px-1 py-0.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded focus:outline-none transition-colors"
                                        title="Edit leave"
                                      >
                                        <i className="ri-pencil-line text-sm"></i>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded focus:outline-none transition-colors"
                                        title="Cancel leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-close-circle-line text-sm"></i>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLeave(candidateId, leave._id, candidateName, leave.date)}
                                        className="ml-1 px-1 py-0.5 text-red-600 hover:text-red-900 hover:bg-red-100 rounded focus:outline-none transition-colors"
                                        title="Delete leave"
                                        disabled={deletingLeaveId === leave._id}
                                      >
                                        {deletingLeaveId === leave._id ? (
                                          <i className="ri-loader-4-line animate-spin text-sm"></i>
                                        ) : (
                                          <i className="ri-delete-bin-line text-sm"></i>
                                        )}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Edit Leave Modal */}
          {editingLeave && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Leave</h3>
                  <button
                    type="button"
                    onClick={() => setEditingLeave(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-xl"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingLeave.date}
                      onChange={(e) => setEditingLeave({ ...editingLeave, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Leave Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingLeave.leaveType}
                      onChange={(e) => setEditingLeave({ ...editingLeave, leaveType: e.target.value as 'casual' | 'sick' | 'unpaid' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="casual">Casual Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="unpaid">Unpaid Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={editingLeave.notes}
                      onChange={(e) => setEditingLeave({ ...editingLeave, notes: e.target.value })}
                      placeholder="Enter leave notes (optional)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {editingLeave.notes.length}/500 characters
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleSaveEditedLeave}
                    disabled={updatingLeave}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatingLeave ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-1"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-1"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingLeave(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={updatingLeave}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            <i className="ri-information-line me-2 text-primary"></i>
            How to Assign Leaves
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Select one or more candidates from the dropdown. You can use "Select All Candidates" to select everyone.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Choose the leave type: <strong>Casual Leave</strong>, <strong>Sick Leave</strong>, or <strong>Unpaid Leave</strong>.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Select dates using the date picker and click "Add Date" to add multiple dates.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Optionally add notes to provide additional context for the leave.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>The system will create attendance records with "Leave" status for each candidate and date combination.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>If an attendance record already exists for a date, it will be skipped automatically.</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default AssignLeavePage;

