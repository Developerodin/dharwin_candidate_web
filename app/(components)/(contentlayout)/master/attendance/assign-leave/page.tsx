'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, assignLeavesToCandidates } from '@/shared/lib/candidates';
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
  const [leaveType, setLeaveType] = useState<'casual' | 'sick'>('casual');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  // Handle candidate selection change
  const handleCandidateChange = (selectedOptions: any) => {
    if (!selectedOptions || selectedOptions.length === 0) {
      setSelectedCandidates([]);
      return;
    }

    // Check if "Select All" was selected
    const hasSelectAll = selectedOptions.some(
      (opt: any) => opt.value === SELECT_ALL_CANDIDATES_VALUE
    );

    if (hasSelectAll) {
      // If "Select All" is selected, select all candidates
      setSelectedCandidates(candidates);
    } else {
      setSelectedCandidates(selectedOptions);
    }
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
        text: 'Please select a leave type (Casual or Sick)',
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
          <p><strong>Leave Type:</strong> ${leaveType === 'casual' ? 'Casual Leave' : 'Sick Leave'}</p>
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

      // Reset form
      setSelectedCandidates([]);
      setSelectedDates([]);
      setDateInput('');
      setNotes('');
      setLeaveType('casual');
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
                onChange={(e) => setLeaveType(e.target.value as 'casual' | 'sick')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
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
                  <p><strong>Leave Type:</strong> {leaveType === 'casual' ? 'Casual Leave' : 'Sick Leave'}</p>
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
              <span>Choose the leave type: <strong>Casual Leave</strong> or <strong>Sick Leave</strong>.</span>
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

