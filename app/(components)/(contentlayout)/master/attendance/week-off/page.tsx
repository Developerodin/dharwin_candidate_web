'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, updateWeekOffCalendar, getCandidateWeekOff } from '@/shared/lib/candidates';
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
  weekOff?: string[];
};

type WeekOffData = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  weekOff: string[];
};

const WeekOffPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [loadingWeekOff, setLoadingWeekOff] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [candidateWeekOffs, setCandidateWeekOffs] = useState<Record<string, WeekOffData>>({});
  const [hasUserSelectedDays, setHasUserSelectedDays] = useState(false);

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
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

  // Fetch all candidates
  const fetchCandidates = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
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

      // Transform to react-select format
      const candidateOptions = normalized.map((candidate: Candidate) => ({
        value: candidate.id || candidate._id || '',
        label: `${candidate.fullName || 'Unknown'} (${candidate.email || 'No email'})`,
        candidate: candidate
      })).filter((option: any) => option.value);

      setCandidates(candidateOptions);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch candidates');
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.message || 'Failed to fetch candidates',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchCandidates();
    }
  }, [isAdmin, fetchCandidates]);

  // Fetch week-off for selected candidates
  const fetchCandidateWeekOffs = useCallback(async () => {
    if (selectedCandidates.length === 0) {
      setCandidateWeekOffs({});
      return;
    }

    setLoadingWeekOff(true);
    const weekOffMap: Record<string, WeekOffData> = {};

    try {
      await Promise.all(
        selectedCandidates.map(async (selected) => {
          const candidateId = selected.value;
          try {
            const response = await getCandidateWeekOff(candidateId);
            if (response?.data) {
              weekOffMap[candidateId] = {
                candidateId: response.data.candidateId,
                candidateName: response.data.candidateName,
                candidateEmail: response.data.candidateEmail,
                weekOff: response.data.weekOff || []
              };
            }
          } catch (err) {
            console.error(`Failed to fetch week-off for candidate ${candidateId}:`, err);
            // Set empty week-off if fetch fails
            const candidate = selected.candidate;
            weekOffMap[candidateId] = {
              candidateId,
              candidateName: candidate?.fullName || 'Unknown',
              candidateEmail: candidate?.email || 'No email',
              weekOff: []
            };
          }
        })
      );

      setCandidateWeekOffs(weekOffMap);
    } catch (err) {
      console.error('Error fetching week-off data:', err);
    } finally {
      setLoadingWeekOff(false);
    }
  }, [selectedCandidates]);

  useEffect(() => {
    fetchCandidateWeekOffs();
  }, [fetchCandidateWeekOffs]);

  // Handle candidate selection change
  const handleCandidateChange = (selected: any) => {
    setSelectedCandidates(selected || []);
    // Clear selected days when candidates change
    setSelectedDays([]);
    setHasUserSelectedDays(false);
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    setHasUserSelectedDays(true);
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Select all days
  const selectAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([...daysOfWeek]);
  };

  // Clear all days
  const clearAllDays = () => {
    setHasUserSelectedDays(true);
    setSelectedDays([]);
  };

  // Update week-off for selected candidates
  const handleUpdateWeekOff = async () => {
    if (selectedCandidates.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Candidates Selected',
        text: 'Please select at least one candidate',
        confirmButtonText: 'OK'
      });
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      const candidateIds = selectedCandidates.map(c => c.value);
      const response = await updateWeekOffCalendar(candidateIds, selectedDays);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response?.message || `Week-off calendar updated for ${candidateIds.length} candidate(s)`,
        confirmButtonText: 'OK'
      });

      // Refresh week-off data
      await fetchCandidateWeekOffs();
      
      // Optionally clear selected days after successful update
      // setSelectedDays([]);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update week-off calendar';
      setError(errorMessage);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setUpdating(false);
    }
  };

  // Check if all selected candidates have the same week-off days
  const getCommonWeekOffDays = useCallback((): string[] => {
    if (selectedCandidates.length === 0) return [];

    const candidateIds = selectedCandidates.map(c => c.value);
    const allWeekOffs = candidateIds
      .map(id => candidateWeekOffs[id]?.weekOff || [])
      .filter(wo => wo.length > 0);

    if (allWeekOffs.length === 0) return [];

    // Find common days across all candidates
    return allWeekOffs.reduce((common, weekOff) => {
      return common.filter(day => weekOff.includes(day));
    }, allWeekOffs[0] || []);
  }, [selectedCandidates, candidateWeekOffs]);

  // Load common week-off days when candidates are selected and data is loaded
  // Only auto-populate if user hasn't made a selection yet
  useEffect(() => {
    if (selectedCandidates.length > 0 && Object.keys(candidateWeekOffs).length > 0 && !hasUserSelectedDays) {
      const commonDays = getCommonWeekOffDays();
      // Only set if there are common days
      if (commonDays.length > 0) {
        setSelectedDays(commonDays);
      }
    }
  }, [candidateWeekOffs, selectedCandidates, getCommonWeekOffDays, hasUserSelectedDays]);

  if (!isAdmin) {
    return (
      <>
        <Seo title="Week-Off Calendar" />
        <Pageheader currentpage="Week-Off Calendar" activepage="Master" mainpage="Week-Off Calendar" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can manage week-off calendars.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Week-Off Calendar" />
      <Pageheader currentpage="Week-Off Calendar" activepage="Master" mainpage="Week-Off Calendar" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Week-Off Calendar</h2>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Candidate Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Candidates <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <i className="ri-loader-4-line animate-spin"></i>
                <span>Loading candidates...</span>
              </div>
            ) : (
              <Select
                isMulti
                options={candidates}
                value={selectedCandidates}
                onChange={handleCandidateChange}
                placeholder="Select one or more candidates..."
                className="react-select-container"
                classNamePrefix="react-select"
                isClearable
                isSearchable
                isLoading={loading}
              />
            )}
            {selectedCandidates.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {selectedCandidates.length} candidate(s) selected
              </p>
            )}
          </div>

          {/* Day Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Week-Off Days
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllDays}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAllDays}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {daysOfWeek.map(day => (
                <label
                  key={day}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDays.includes(day)
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className={`text-sm font-medium ${
                    selectedDays.includes(day) ? 'text-primary' : 'text-gray-700'
                  }`}>
                    {day}
                  </span>
                </label>
              ))}
            </div>
            {selectedDays.length > 0 && (
              <p className="mt-3 text-sm text-gray-600">
                <strong>Selected:</strong> {selectedDays.join(', ')}
              </p>
            )}
          </div>

          {/* Update Button */}
          <div className="mb-6">
            <button
              onClick={handleUpdateWeekOff}
              disabled={updating || selectedCandidates.length === 0}
              className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                updating || selectedCandidates.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {updating ? (
                <>
                  <i className="ri-loader-4-line animate-spin inline-block mr-2"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="ri-save-line inline-block mr-2"></i>
                  Update Week-Off for {selectedCandidates.length} Candidate(s)
                </>
              )}
            </button>
          </div>

          {/* Current Week-Off Status */}
          {selectedCandidates.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Current Week-Off Status
                {loadingWeekOff && (
                  <i className="ri-loader-4-line animate-spin ml-2 text-primary"></i>
                )}
              </h3>
              {loadingWeekOff ? (
                <div className="text-center py-8 text-gray-600">
                  <i className="ri-loader-4-line animate-spin text-2xl mb-2"></i>
                  <p>Loading week-off data...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCandidates.map((selected) => {
                    const candidateId = selected.value;
                    const weekOffData = candidateWeekOffs[candidateId];
                    const weekOff = weekOffData?.weekOff || [];

                    return (
                      <div
                        key={candidateId}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">
                              {weekOffData?.candidateName || selected.label}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              {weekOffData?.candidateEmail || ''}
                            </p>
                            {weekOff.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {weekOff.map(day => (
                                  <span
                                    key={day}
                                    className="px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
                                  >
                                    {day}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500 italic">
                                No week-off days set
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <i className="ri-information-line text-blue-600 text-xl mt-0.5"></i>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">How it works</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Select one or more candidates from the dropdown</li>
                  <li>Choose the days that should be week-off (e.g., Saturday and Sunday)</li>
                  <li>Click "Update Week-Off" to apply the changes</li>
                  <li>You can set multiple days or clear all week-off days by leaving none selected</li>
                  <li>Week-off days are used to determine attendance expectations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WeekOffPage;

