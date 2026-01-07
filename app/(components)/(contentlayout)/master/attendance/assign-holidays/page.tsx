'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, assignHolidaysToCandidates } from '@/shared/lib/candidates';
import { getAllHolidays } from '@/shared/lib/holidays';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import("react-select"), { ssr: false });

type Holiday = {
  _id?: string;
  id?: string;
  title: string;
  date: string;
  isActive: boolean;
};

type Candidate = {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  holidays?: string[];
};

const AssignHolidaysPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [selectedHolidays, setSelectedHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);

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

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingHolidays(true);
    try {
      const response = await getAllHolidays({
        isActive: true,
        sortBy: 'date:asc',
        limit: 1000
      });

      const holidaysList = response?.data?.results || (Array.isArray(response?.data) ? response.data : []);
      setHolidays(holidaysList);
    } catch (err: any) {
      console.error('Failed to fetch holidays:', err);
      setError(err?.message || 'Failed to fetch holidays');
    } finally {
      setLoadingHolidays(false);
    }
  }, [isAdmin]);

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchCandidates(), fetchHolidays()]).finally(() => {
        setLoading(false);
      });
    }
  }, [isAdmin, fetchCandidates, fetchHolidays]);

  // Auto-select holidays already assigned to selected candidates
  useEffect(() => {
    // If no candidates or no holidays, reset selection
    if (!selectedCandidates.length || !holidays.length) {
      setSelectedHolidays([]);
      return;
    }

    // Collect all holiday IDs from selected candidates
    const candidateHolidayIds = new Set<string>();
    selectedCandidates.forEach((opt: any) => {
      const candidate: Candidate | undefined = opt.candidate;
      const ids = candidate?.holidays || [];
      ids.forEach((id) => {
        if (id) {
          candidateHolidayIds.add(String(id));
        }
      });
    });

    if (!candidateHolidayIds.size) {
      // No assigned holidays among selected candidates
      setSelectedHolidays([]);
      return;
    }

    // Build options for holidays that are already assigned
    const autoSelected = holidays
      .filter((holiday) => {
        const hid = String(holiday._id || holiday.id || '');
        return hid && candidateHolidayIds.has(hid);
      })
      .map((holiday) => ({
        value: String(holiday._id || holiday.id || ''),
        label: `${holiday.title} (${formatDate(holiday.date)})`,
        holiday,
      }))
      .filter((opt) => opt.value);

    // Merge with any existing manual selections to avoid losing user changes
    const existingIds = new Set(selectedHolidays.map((h: any) => h.value));
    const merged = [
      ...selectedHolidays,
      ...autoSelected.filter((opt) => !existingIds.has(opt.value)),
    ];

    setSelectedHolidays(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCandidates, holidays]);

  // Handle assign holidays
  const handleAssignHolidays = async () => {
    if (selectedCandidates.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Candidates Selected',
        text: 'Please select at least one candidate',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (selectedHolidays.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Holidays Selected',
        text: 'Please select at least one holiday',
        confirmButtonText: 'OK'
      });
      return;
    }

    setAssigning(true);
    setError(null);
    setAssignmentResult(null);

    try {
      const candidateIds = selectedCandidates.map((c: any) => c.value);
      const holidayIds = selectedHolidays.map((h: any) => h.value);
      
      const response = await assignHolidaysToCandidates(candidateIds, holidayIds);

      setAssignmentResult(response.data);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p class="mb-3">${response?.message || 'Holidays assigned successfully'}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Candidates Updated:</strong> ${response?.data?.candidatesUpdated || 0}</p>
            <p><strong>Holidays Added:</strong> ${response?.data?.holidaysAdded || 0}</p>
            <p><strong>Attendance Records Created:</strong> ${response?.data?.attendanceRecordsCreated || 0}</p>
            ${response?.data?.skipped && response.data.skipped.length > 0 ? `
              <p class="mt-2 text-yellow-600"><strong>Skipped:</strong> ${response.data.skipped.length} record(s) (already exists)</p>
            ` : ''}
          </div>
        `,
        confirmButtonText: 'OK'
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign holidays';
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

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Clear selections
  const clearSelections = () => {
    setSelectedCandidates([]);
    setSelectedHolidays([]);
    setAssignmentResult(null);
    setError(null);
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Assign Holidays" />
        <Pageheader currentpage="Assign Holidays" activepage="Master" mainpage="Assign Holidays" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can assign holidays to candidates.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Assign Holidays to Candidates" />
      <Pageheader currentpage="Assign Holidays" activepage="Master" mainpage="Assign Holidays" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Assign Holidays to Candidates</h2>

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
                        return;
                      }

                      const hasSelectAll = selected.some(
                        (opt: any) => opt.value === SELECT_ALL_CANDIDATES_VALUE
                      );

                      if (hasSelectAll) {
                        // Toggle all candidates selection
                        if (selectedCandidates.length === candidates.length) {
                          setSelectedCandidates([]);
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

              {/* Holiday Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Holidays <span className="text-red-500">*</span>
                  </label>
                  {holidays.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedHolidays.length === holidays.length) {
                          setSelectedHolidays([]);
                        } else {
                          setSelectedHolidays(holidays.map(holiday => ({
                            value: holiday._id || holiday.id || '',
                            label: `${holiday.title} (${formatDate(holiday.date)})`,
                            holiday: holiday
                          })));
                        }
                      }}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      {selectedHolidays.length === holidays.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                {loadingHolidays ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <i className="ri-loader-4-line animate-spin"></i>
                    <span>Loading holidays...</span>
                  </div>
                ) : holidays.length === 0 ? (
                  <p className="text-sm text-yellow-600 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    No active holidays available. Please create holidays first.
                  </p>
                ) : (
                  <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {holidays.map((holiday) => {
                        const holidayId = holiday._id || holiday.id || '';
                        const isSelected = selectedHolidays.some((h: any) => h.value === holidayId);
                        
                        return (
                          <label
                            key={holidayId}
                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-all ${
                              isSelected 
                                ? 'border-primary bg-blue-50' 
                                : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedHolidays([
                                    ...selectedHolidays,
                                    {
                                      value: holidayId,
                                      label: `${holiday.title} (${formatDate(holiday.date)})`,
                                      holiday: holiday
                                    }
                                  ]);
                                } else {
                                  setSelectedHolidays(selectedHolidays.filter((h: any) => h.value !== holidayId));
                                }
                              }}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">{holiday.title}</div>
                              <div className="text-sm text-gray-600">{formatDate(holiday.date)}</div>
                            </div>
                            {isSelected && (
                              <i className="ri-checkbox-circle-fill text-primary text-lg flex-shrink-0"></i>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedHolidays.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedHolidays.length} of {holidays.length} holiday(s) selected
                  </p>
                )}
              </div>

              {/* Info Section */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <i className="ri-information-line text-blue-600 text-xl mt-0.5"></i>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">How it works</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Select one or more candidates and holidays</li>
                      <li>Holidays will be added to each candidate's calendar</li>
                      <li>Attendance records with status "Holiday" will be created for each holiday date</li>
                      <li>If attendance already exists for a date, it will be skipped (no duplicate records)</li>
                      <li>Holiday IDs will be added to each candidate's holidays array</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAssignHolidays}
                  disabled={assigning || selectedCandidates.length === 0 || selectedHolidays.length === 0}
                  className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assigning || selectedCandidates.length === 0 || selectedHolidays.length === 0
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
                      <i className="ri-calendar-check-line"></i>
                      Assign Holidays
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
                    <p><strong>Candidates Updated:</strong> {assignmentResult.candidatesUpdated || 0}</p>
                    <p><strong>Holidays Added:</strong> {assignmentResult.holidaysAdded || 0}</p>
                    <p><strong>Attendance Records Created:</strong> {assignmentResult.attendanceRecordsCreated || 0}</p>
                    
                    {assignmentResult.skipped && assignmentResult.skipped.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="font-medium text-yellow-800 mb-2">
                          Skipped Records ({assignmentResult.skipped.length}):
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {assignmentResult.skipped.map((skip: any, index: number) => (
                            <div key={index} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              <strong>{skip.candidateName}</strong> - {skip.holidayTitle} ({formatDate(skip.date)}): {skip.reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignmentResult.createdRecords && assignmentResult.createdRecords.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-green-200">
                        <p className="font-medium text-green-800 mb-2">
                          Created Attendance Records ({assignmentResult.createdRecords.length}):
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {assignmentResult.createdRecords.slice(0, 10).map((record: any, index: number) => (
                            <div key={index} className="text-xs text-green-700 bg-green-50 p-2 rounded">
                              <strong>{record.candidate?.fullName || record.candidateEmail}</strong> - {record.notes} ({formatDate(record.date)})
                            </div>
                          ))}
                          {assignmentResult.createdRecords.length > 10 && (
                            <p className="text-xs text-gray-600 italic">
                              ... and {assignmentResult.createdRecords.length - 10} more records
                            </p>
                          )}
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

export default AssignHolidaysPage;

