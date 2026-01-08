'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, assignShiftToCandidates } from '@/shared/lib/candidates';
import { getAllShifts } from '@/shared/lib/shifts';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import("react-select"), { ssr: false });

type Shift = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  timezone: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type Candidate = {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  shift?: any;
};

const AssignShiftPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);

  const SELECT_ALL_CANDIDATES_VALUE = "__all_candidates__";

  // Get GMT offset for a timezone (same as profile page)
  const getGMTOffset = (timezone: string): string => {
    try {
      const now = new Date();
      
      // Method 1: Try using Intl.DateTimeFormat with timeZoneName
      try {
        const formatter = new Intl.DateTimeFormat('en', {
          timeZone: timezone,
          timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(now);
        const offsetPart = parts.find(part => part.type === 'timeZoneName');
        
        if (offsetPart && offsetPart.value && offsetPart.value.includes('GMT')) {
          let offsetStr = offsetPart.value;
          offsetStr = offsetStr.replace(/[()]/g, '');
          if (!offsetStr.startsWith('GMT')) {
            offsetStr = 'GMT' + offsetStr;
          }
          const match = offsetStr.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
          if (match) {
            const sign = match[1];
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3] || '0', 10);
            const hoursStr = hours.toString().padStart(2, '0');
            const minutesStr = minutes.toString().padStart(2, '0');
            return `(GMT${sign}${hoursStr}:${minutesStr})`;
          }
          return `(${offsetStr})`;
        }
      } catch (e) {
        // Continue to fallback
      }
      
      // Method 2: Calculate offset
      const utcFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const tzFormatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      const utcParts = utcFormatter.formatToParts(now);
      const tzParts = tzFormatter.formatToParts(now);
      
      const utcH = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0', 10);
      const utcM = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0', 10);
      const tzH = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0', 10);
      const tzM = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0', 10);
      
      const utcDateFormatter = new Intl.DateTimeFormat('en', {
        timeZone: 'UTC',
        day: 'numeric'
      });
      const tzDateFormatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        day: 'numeric'
      });
      
      const utcDay = parseInt(utcDateFormatter.format(now), 10);
      const tzDay = parseInt(tzDateFormatter.format(now), 10);
      
      let offsetMinutes = (tzH * 60 + tzM) - (utcH * 60 + utcM);
      
      if (tzDay !== utcDay) {
        const dayDiff = tzDay - utcDay;
        if (dayDiff > 15) {
          offsetMinutes -= 1440;
        } else if (dayDiff < -15) {
          offsetMinutes += 1440;
        } else if (dayDiff > 0) {
          offsetMinutes += 1440;
        } else {
          offsetMinutes -= 1440;
        }
      }
      
      const hours = Math.floor(Math.abs(offsetMinutes) / 60);
      const minutes = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      return `(GMT${sign}${hoursStr}:${minutesStr})`;
    } catch (error) {
      console.error('Error calculating GMT offset:', error);
      return '(GMT+00:00)';
    }
  };

  // Timezone options with GMT offsets
  const timezones = [
    { value: 'UTC', label: `${getGMTOffset('UTC')} UTC` },
    { value: 'Asia/Kolkata', label: `${getGMTOffset('Asia/Kolkata')} IST (India)` },
    { value: 'America/New_York', label: `${getGMTOffset('America/New_York')} Eastern Time (US & Canada)` },
    { value: 'America/Chicago', label: `${getGMTOffset('America/Chicago')} Central Time (US & Canada)` },
    { value: 'America/Denver', label: `${getGMTOffset('America/Denver')} Mountain Time (US & Canada)` },
    { value: 'America/Los_Angeles', label: `${getGMTOffset('America/Los_Angeles')} Pacific Time (US & Canada)` },
    { value: 'Europe/London', label: `${getGMTOffset('Europe/London')} UK Time` },
    { value: 'Europe/Paris', label: `${getGMTOffset('Europe/Paris')} Central European Time` },
    { value: 'Asia/Dubai', label: `${getGMTOffset('Asia/Dubai')} Gulf Standard Time` },
    { value: 'Asia/Singapore', label: `${getGMTOffset('Asia/Singapore')} Singapore Time` },
  ];

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

  // Fetch shifts (required)
  const fetchShifts = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingShifts(true);
    try {
      const response = await getAllShifts({
        isActive: true,
        sortBy: 'name:asc',
        limit: 1000
      });

      const shiftsList = response?.data?.results || (Array.isArray(response?.data) ? response.data : []);
      setShifts(shiftsList);
    } catch (err: any) {
      console.error('Failed to fetch shifts:', err);
      setError(err?.message || 'Failed to fetch shifts');
    } finally {
      setLoadingShifts(false);
    }
  }, [isAdmin]);

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchCandidates(), fetchShifts()]).finally(() => {
        setLoading(false);
      });
    }
  }, [isAdmin, fetchCandidates, fetchShifts]);

  // Auto-select shift when candidates are selected
  useEffect(() => {
    // Only auto-select if we have candidates selected, shifts loaded, and no shift currently selected
    if (selectedCandidates.length === 0 || shifts.length === 0 || selectedShiftId) {
      return;
    }

    // Get shift IDs from selected candidates
    const candidateShiftIds = selectedCandidates
      .map((opt: any) => {
        const candidate = opt.candidate;
        if (!candidate) return null;
        
        // Handle shift as string (ID) or object
        if (typeof candidate.shift === 'string') {
          return candidate.shift;
        } else if (candidate.shift && typeof candidate.shift === 'object') {
          return candidate.shift._id || candidate.shift.id || null;
        }
        return null;
      })
      .filter((id: string | null) => id !== null);

    // If no candidates have shifts, don't auto-select
    if (candidateShiftIds.length === 0) {
      return;
    }

    // Check if all selected candidates have the same shift
    const uniqueShiftIds = Array.from(new Set(candidateShiftIds));
    
    // If all candidates have the same shift, auto-select it
    if (uniqueShiftIds.length === 1) {
      const commonShiftId = uniqueShiftIds[0];
      // Verify the shift exists in our shifts list
      const shiftExists = shifts.some(s => (s._id || s.id) === commonShiftId);
      if (shiftExists) {
        setSelectedShiftId(commonShiftId);
      }
    }
    // If candidates have different shifts, don't auto-select (user needs to choose)
  }, [selectedCandidates, shifts, selectedShiftId]);

  // Handle assign shift
  const handleAssignShift = async () => {
    if (selectedCandidates.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Candidates Selected',
        text: 'Please select at least one candidate',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!selectedShiftId) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Shift Selected',
        text: 'Please select a shift',
        confirmButtonText: 'OK'
      });
      return;
    }

    setAssigning(true);
    setError(null);
    setAssignmentResult(null);

    try {
      const candidateIds = selectedCandidates.map((c: any) => c.value);
      const response = await assignShiftToCandidates(candidateIds, selectedShiftId);

      setAssignmentResult(response.data);

      // Get updated count from response data
      const updatedCount = response?.data?.updatedCount || (response?.data?.candidates?.length || 0);
      const candidateCountText = updatedCount === 1 ? '1 candidate' : `${updatedCount} candidates`;

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p class="mb-3">Shift assigned to ${candidateCountText} successfully</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Candidates Updated:</strong> ${updatedCount}</p>
          </div>
        `,
        confirmButtonText: 'OK'
      });

      // Clear selection after success
      setSelectedShiftId('');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign shift';
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

  // Clear selections
  const clearSelections = () => {
    setSelectedCandidates([]);
    setSelectedShiftId('');
    setAssignmentResult(null);
    setError(null);
  };

  // Get selected shift details
  const selectedShift = shifts.find(s => (s._id || s.id) === selectedShiftId);

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Assign Shift" />
        <Pageheader currentpage="Assign Shift" activepage="Master" mainpage="Assign Shift" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can assign shifts to candidates.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Shift to Candidates" />
      <Pageheader currentpage="Assign Shift" activepage="Master" mainpage="Assign Shift" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Shift to Candidates</h2>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600">Loading data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Candidate Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Candidates <span className="text-red-500">*</span>
                </label>
                {loadingCandidates ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-loader-4-line animate-spin"></i>
                    <span>Loading candidates...</span>
                  </div>
                ) : (
                  <Select
                    isMulti
                    options={candidateOptionsWithSelectAll}
                    value={selectedCandidates}
                    onChange={(selected: any) => {
                      if (!selected || selected.length === 0) {
                        setSelectedCandidates([]);
                        setSelectedShiftId(''); // Clear shift when no candidates selected
                        return;
                      }

                      const hasSelectAll = selected.some(
                        (opt: any) => opt.value === SELECT_ALL_CANDIDATES_VALUE
                      );

                      if (hasSelectAll) {
                        if (selectedCandidates.length === candidates.length) {
                          setSelectedCandidates([]);
                          setSelectedShiftId(''); // Clear shift when deselecting all
                        } else {
                          setSelectedCandidates(candidates);
                        }
                      } else {
                        setSelectedCandidates(selected);
                      }
                    }}
                    placeholder="Select one or more candidates..."
                    closeMenuOnSelect={false}
                    hideSelectedOptions={false}
                    formatOptionLabel={(option: any, { context }: any) => {
                      if (context === "menu") {
                        const isAllOption = option.value === SELECT_ALL_CANDIDATES_VALUE;
                        const isAllSelected =
                          isAllOption &&
                          candidates.length > 0 &&
                          selectedCandidates.length === candidates.length;

                        const isSelected =
                          isAllOption
                            ? isAllSelected
                            : selectedCandidates.some(
                                (c: any) => c.value === option.value
                              );

                        return (
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              readOnly
                              checked={isSelected}
                              className="w-4 h-4 text-primary border-gray-300 rounded"
                            />
                            <span>{option.label}</span>
                          </div>
                        );
                      }

                      return option.label;
                    }}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isClearable
                    isSearchable
                  />
                )}
                {selectedCandidates.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedCandidates.length} candidate(s) selected
                  </p>
                )}
              </div>

              {/* Shift Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shift <span className="text-red-500">*</span>
                </label>
                {loadingShifts ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-loader-4-line animate-spin"></i>
                    <span>Loading shifts...</span>
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      No active shifts available. Please create shifts first in the{' '}
                      <a href="/master/attendance/manage-shift" className="text-primary hover:underline font-medium">
                        Manage Shifts
                      </a>{' '}
                      page.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedShiftId}
                    onChange={(e) => setSelectedShiftId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="">-- Select a shift --</option>
                    {shifts.map((shift) => (
                      <option key={shift._id || shift.id} value={shift._id || shift.id}>
                        {shift.name} ({formatTime(shift.startTime)} - {formatTime(shift.endTime)}) - {timezones.find(tz => tz.value === shift.timezone)?.label || shift.timezone}
                      </option>
                    ))}
                  </select>
                )}
                {selectedShiftId && selectedShift && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Shift Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium text-gray-900">{selectedShift.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Timezone:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {timezones.find(tz => tz.value === selectedShift.timezone)?.label || selectedShift.timezone}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time Range:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {formatTime(selectedShift.startTime)} - {formatTime(selectedShift.endTime)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({selectedShift.startTime} - {selectedShift.endTime})
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          selectedShift.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedShift.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {selectedShift.description && (
                        <div className="md:col-span-2">
                          <span className="text-gray-600">Description:</span>
                          <p className="mt-1 text-gray-900">{selectedShift.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-blue-600 text-xl mt-0.5"></i>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">How it works</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Select one or more candidates</li>
                      <li>Select a shift from the available shifts (created in Manage Shifts)</li>
                      <li>Shift reference will be stored in each candidate's profile</li>
                      <li>Any existing shift assignment will be overwritten</li>
                      <li>Shift details are managed centrally - updates to shifts will reflect for all assigned candidates</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAssignShift}
                  disabled={assigning || selectedCandidates.length === 0 || !selectedShiftId}
                  className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assigning || selectedCandidates.length === 0 || !selectedShiftId
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary/90'
                  }`}
                >
                  {assigning ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="ri-time-line"></i>
                      Assign Shift
                    </>
                  )}
                </button>
                <button
                  onClick={clearSelections}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Assignment Results */}
              {assignmentResult && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <i className="ri-checkbox-circle-line"></i>
                    Assignment Results
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Candidates Updated:</strong> {assignmentResult.updatedCount || (assignmentResult.candidates?.length || 0)}</p>
                    {assignmentResult.shift && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="font-medium text-green-800 mb-2">Assigned Shift:</p>
                        <div className="text-xs text-green-700 bg-green-50 p-3 rounded">
                          <p><strong>Name:</strong> {assignmentResult.shift.name}</p>
                          <p><strong>Time:</strong> {formatTime(assignmentResult.shift.startTime)} - {formatTime(assignmentResult.shift.endTime)} ({assignmentResult.shift.startTime} - {assignmentResult.shift.endTime})</p>
                          <p><strong>Timezone:</strong> {timezones.find(tz => tz.value === assignmentResult.shift.timezone)?.label || assignmentResult.shift.timezone}</p>
                          {assignmentResult.shift.description && (
                            <p><strong>Description:</strong> {assignmentResult.shift.description}</p>
                          )}
                          <p><strong>Status:</strong> {assignmentResult.shift.isActive !== undefined ? (assignmentResult.shift.isActive ? 'Active' : 'Inactive') : (assignmentResult.shift.status || 'active')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AssignShiftPage;

