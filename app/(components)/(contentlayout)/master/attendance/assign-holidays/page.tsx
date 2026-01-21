'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllCandidates, assignHolidaysToCandidates, removeHolidaysFromCandidates, fetchCandidateById } from '@/shared/lib/candidates';
import { getAllHolidays } from '@/shared/lib/holidays';
import { getAllCandidateGroups, assignHolidaysToGroup, removeHolidaysFromGroup, getCandidateGroupById } from '@/shared/lib/candidate-groups';
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

type CandidateGroup = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  candidates?: any[];
  isActive?: boolean;
};

const AssignHolidaysPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  
  // Individual assignment state
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  
  // Group assignment state
  const [groups, setGroups] = useState<CandidateGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  
  // Shared state
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedHolidays, setSelectedHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [removing, setRemoving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] = useState<any>(null);
  const [removalResult, setRemovalResult] = useState<any>(null);

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

  // Fetch candidate groups
  const fetchGroups = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoadingGroups(true);
    try {
      const response = await getAllCandidateGroups({
        isActive: true,
        sortBy: 'name:asc',
        limit: 1000
      });

      const groupsList = response?.data?.results || (Array.isArray(response?.data) ? response.data : []);
      const groupOptions = groupsList.map((group: CandidateGroup) => ({
        value: group._id || group.id || '',
        label: `${group.name}${group.candidates ? ` (${group.candidates.length} candidates)` : ''}`,
        group: group
      })).filter((option: any) => option.value);

      setGroups(groupOptions);
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
      setError(err?.message || 'Failed to fetch candidate groups');
    } finally {
      setLoadingGroups(false);
    }
  }, [isAdmin]);

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      Promise.all([fetchCandidates(), fetchHolidays(), fetchGroups()]).finally(() => {
        setLoading(false);
      });
    }
  }, [isAdmin, fetchCandidates, fetchHolidays, fetchGroups]);

  // Auto-select holidays already assigned to selected candidates (individual mode)
  useEffect(() => {
    if (activeTab !== 'individual') return;
    
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
  }, [selectedCandidates, holidays, activeTab]);

  // Fetch full group details when selected (to get populated candidates)
  useEffect(() => {
    if (activeTab !== 'group' || !selectedGroup?.value) return;

    const fetchGroupDetails = async () => {
      try {
        const response = await getCandidateGroupById(selectedGroup.value);
        const groupData = response?.data || response;
        
        // Check if candidates have holidays populated, if not, fetch them
        let candidatesWithHolidays = groupData?.candidates || [];
        
        // Check if we need to fetch candidate details
        const needsFetch = candidatesWithHolidays.some((candidate: any) => {
          // If candidate is just an ID string, or doesn't have holidays property
          return typeof candidate === 'string' || 
                 (candidate && !candidate.holidays && (candidate._id || candidate.id));
        });

        if (needsFetch && candidatesWithHolidays.length > 0) {
          // Fetch full candidate details to get holidays
          const candidatePromises = candidatesWithHolidays.map(async (candidate: any) => {
            const candidateId = typeof candidate === 'string' 
              ? candidate 
              : (candidate._id || candidate.id);
            
            if (!candidateId) return candidate;
            
            try {
              const candidateData = await fetchCandidateById(candidateId);
              return candidateData?.data || candidateData || candidate;
            } catch (err) {
              console.error(`Failed to fetch candidate ${candidateId}:`, err);
              return candidate;
            }
          });
          
          candidatesWithHolidays = await Promise.all(candidatePromises);
        }
        
        // Update the selected group with full details including candidates with holidays
        const updatedGroupData = {
          ...groupData,
          candidates: candidatesWithHolidays
        };
        
        const updatedGroup = {
          ...selectedGroup,
          group: updatedGroupData
        };
        
        setSelectedGroup(updatedGroup);

        // Auto-select holidays immediately after group data is loaded
        if (candidatesWithHolidays.length > 0 && holidays.length > 0) {
          // Collect all holiday IDs from all candidates in the group
          const candidateHolidayIds = new Set<string>();
          
          candidatesWithHolidays.forEach((candidate: any) => {
            if (!candidate) return;
            
            // Handle both populated candidate objects and candidate IDs
            const candidateHolidays = candidate?.holidays || [];
            
            candidateHolidays.forEach((id: any) => {
              if (id) {
                // Handle both ObjectId objects and strings
                const holidayId = typeof id === 'object' ? (id._id || id.id || String(id)) : String(id);
                if (holidayId && holidayId !== 'undefined' && holidayId !== 'null') {
                  candidateHolidayIds.add(holidayId);
                }
              }
            });
          });

          if (candidateHolidayIds.size > 0) {
            // Build options for holidays that are already assigned to group members
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

            // Replace selection with auto-selected holidays (show all assigned holidays)
            setSelectedHolidays(autoSelected);
          } else {
            setSelectedHolidays([]);
          }
        } else {
          setSelectedHolidays([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch group details:', err);
        setSelectedHolidays([]);
      }
    };

    fetchGroupDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup?.value, activeTab, holidays]);

  // Auto-select holidays when holidays list changes and group is already selected
  useEffect(() => {
    if (activeTab !== 'group' || !selectedGroup?.group?.candidates || !holidays.length) {
      return;
    }

    // Collect all holiday IDs from all candidates in the group
    const candidateHolidayIds = new Set<string>();
    selectedGroup.group.candidates.forEach((candidate: any) => {
      if (!candidate) return;
      
      const candidateHolidays = candidate?.holidays || [];
      candidateHolidays.forEach((id: any) => {
        if (id) {
          const holidayId = typeof id === 'object' ? (id._id || id.id || String(id)) : String(id);
          if (holidayId && holidayId !== 'undefined' && holidayId !== 'null') {
            candidateHolidayIds.add(holidayId);
          }
        }
      });
    });

    if (candidateHolidayIds.size === 0) {
      setSelectedHolidays([]);
      return;
    }

    // Build options for holidays that are already assigned to group members
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

    // Only update if selection has changed
    const currentIds = new Set(selectedHolidays.map((h: any) => h.value));
    const newIds = new Set(autoSelected.map((h: any) => h.value));
    
    if (currentIds.size !== newIds.size || 
        !Array.from(currentIds).every(id => newIds.has(id))) {
      setSelectedHolidays(autoSelected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holidays, activeTab]);

  // Handle assign holidays (individual)
  const handleAssignHolidaysIndividual = async () => {
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

  // Handle assign holidays (group)
  const handleAssignHolidaysGroup = async () => {
    if (!selectedGroup) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Group Selected',
        text: 'Please select a candidate group',
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
      const groupId = selectedGroup.value;
      const holidayIds = selectedHolidays.map((h: any) => h.value);
      
      const response = await assignHolidaysToGroup(groupId, holidayIds);

      setAssignmentResult(response.data);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p class="mb-3">${response?.message || 'Holidays assigned to group successfully'}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Group:</strong> ${response?.data?.groupName || selectedGroup.label}</p>
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
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to assign holidays to group';
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

  // Handle remove holidays (individual)
  const handleRemoveHolidaysIndividual = async () => {
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
        text: 'Please select at least one holiday to remove',
        confirmButtonText: 'OK'
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Remove Holidays?',
      html: `
        <p class="mb-3">Are you sure you want to remove the selected holidays from ${selectedCandidates.length} candidate(s)?</p>
        <p class="text-sm text-gray-600">This will:</p>
        <ul class="text-sm text-gray-600 text-left list-disc list-inside mt-2">
          <li>Remove holiday IDs from each candidate's holidays array</li>
          <li>Delete attendance records with status "Holiday" for those dates</li>
        </ul>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove Holidays',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!result.isConfirmed) return;

    setRemoving(true);
    setError(null);
    setRemovalResult(null);

    try {
      const candidateIds = selectedCandidates.map((c: any) => c.value);
      const holidayIds = selectedHolidays.map((h: any) => h.value);
      
      const response = await removeHolidaysFromCandidates(candidateIds, holidayIds);

      setRemovalResult(response.data);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p class="mb-3">${response?.message || 'Holidays removed successfully'}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Candidates Updated:</strong> ${response?.data?.candidatesUpdated || 0}</p>
            <p><strong>Holidays Removed:</strong> ${response?.data?.holidaysRemoved || 0}</p>
            <p><strong>Attendance Records Deleted:</strong> ${response?.data?.attendanceRecordsDeleted || 0}</p>
            ${response?.data?.skipped && response.data.skipped.length > 0 ? `
              <p class="mt-2 text-yellow-600"><strong>Skipped:</strong> ${response.data.skipped.length} record(s) (no holiday attendance found)</p>
            ` : ''}
          </div>
        `,
        confirmButtonText: 'OK'
      });

      // Refresh candidate data to reflect changes
      await fetchCandidates();
      
      // Refresh selected candidates to update their holidays
      if (selectedCandidates.length > 0) {
        const updatedCandidates = await fetchAllCandidates({
          page: 1,
          limit: 1000,
          sortBy: 'fullName:asc'
        });
        const normalized = Array.isArray(updatedCandidates)
          ? updatedCandidates
          : (Array.isArray((updatedCandidates as any)?.results)
            ? (updatedCandidates as any).results
            : (Array.isArray((updatedCandidates as any)?.data) ? (updatedCandidates as any).data : []));
        
        const candidateOptions = normalized.map((candidate: Candidate) => ({
          value: candidate.id || candidate._id || '',
          label: `${candidate.fullName || 'Unknown'} (${candidate.email || 'No email'})`,
          candidate: candidate
        })).filter((option: any) => option.value);
        
        // Update selected candidates with fresh data
        const updatedSelected = selectedCandidates.map((selected: any) => {
          const fresh = candidateOptions.find((opt: any) => opt.value === selected.value);
          return fresh || selected;
        });
        setSelectedCandidates(updatedSelected);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to remove holidays';
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setRemoving(false);
    }
  };

  // Handle remove holidays (group)
  const handleRemoveHolidaysGroup = async () => {
    if (!selectedGroup) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Group Selected',
        text: 'Please select a candidate group',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (selectedHolidays.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Holidays Selected',
        text: 'Please select at least one holiday to remove',
        confirmButtonText: 'OK'
      });
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Remove Holidays from Group?',
      html: `
        <p class="mb-3">Are you sure you want to remove the selected holidays from all candidates in "${selectedGroup.group?.name || selectedGroup.label}"?</p>
        <p class="text-sm text-gray-600">This will:</p>
        <ul class="text-sm text-gray-600 text-left list-disc list-inside mt-2">
          <li>Remove holiday IDs from each candidate's holidays array</li>
          <li>Delete attendance records with status "Holiday" for those dates</li>
        </ul>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove Holidays',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (!result.isConfirmed) return;

    setRemoving(true);
    setError(null);
    setRemovalResult(null);

    try {
      const groupId = selectedGroup.value;
      const holidayIds = selectedHolidays.map((h: any) => h.value);
      
      const response = await removeHolidaysFromGroup(groupId, holidayIds);

      setRemovalResult(response.data);

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <p class="mb-3">${response?.message || 'Holidays removed from group successfully'}</p>
          <div class="text-left text-sm space-y-1">
            <p><strong>Group:</strong> ${response?.data?.groupName || selectedGroup.label}</p>
            <p><strong>Candidates Updated:</strong> ${response?.data?.candidatesUpdated || 0}</p>
            <p><strong>Holidays Removed:</strong> ${response?.data?.holidaysRemoved || 0}</p>
            <p><strong>Attendance Records Deleted:</strong> ${response?.data?.attendanceRecordsDeleted || 0}</p>
            ${response?.data?.skipped && response.data.skipped.length > 0 ? `
              <p class="mt-2 text-yellow-600"><strong>Skipped:</strong> ${response.data.skipped.length} record(s) (no holiday attendance found)</p>
            ` : ''}
          </div>
        `,
        confirmButtonText: 'OK'
      });

      // Refresh group data to reflect changes
      if (selectedGroup?.value) {
        const response = await getCandidateGroupById(selectedGroup.value);
        const groupData = response?.data || response;
        const updatedGroup = {
          ...selectedGroup,
          group: groupData
        };
        setSelectedGroup(updatedGroup);
        
        // Clear selected holidays since they've been removed
        setSelectedHolidays([]);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to remove holidays from group';
      setError(errorMessage);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setRemoving(false);
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
    setSelectedGroup(null);
    setSelectedHolidays([]);
    setAssignmentResult(null);
    setRemovalResult(null);
    setError(null);
  };

  // Reset selections when tab changes
  useEffect(() => {
    setSelectedCandidates([]);
    setSelectedGroup(null);
    setSelectedHolidays([]);
    setAssignmentResult(null);
    setRemovalResult(null);
    setError(null);
  }, [activeTab]);

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

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('individual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'individual'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-user-line mr-2"></i>
                Individual Assignment
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'group'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-group-line mr-2"></i>
                Group Assignment
              </button>
            </nav>
          </div>

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
              {/* Individual Assignment Tab */}
              {activeTab === 'individual' && (
                <>
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
                </>
              )}

              {/* Group Assignment Tab */}
              {activeTab === 'group' && (
                <>
                  {/* Group Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Candidate Group <span className="text-red-500">*</span>
                    </label>
                    {loadingGroups ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <i className="ri-loader-4-line animate-spin"></i>
                        <span>Loading groups...</span>
                      </div>
                    ) : groups.length === 0 ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800 mb-3">
                          <i className="ri-information-line mr-2"></i>
                          No candidate groups available. Please create groups first to assign holidays to groups.
                        </p>
                        <a
                          href="/master/attendance/candidate-groups"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <i className="ri-add-line"></i>
                          Create Candidate Groups
                        </a>
                      </div>
                    ) : (
                      <Select
                        options={groups}
                        value={selectedGroup}
                        onChange={(selected: any) => {
                          setSelectedGroup(selected);
                        }}
                        placeholder="Select a candidate group..."
                        className="react-select-container"
                        classNamePrefix="react-select"
                        isClearable
                        isSearchable
                      />
                    )}
                    {selectedGroup && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Group:</strong> {selectedGroup.group?.name || selectedGroup.label}
                        </p>
                        {selectedGroup.group?.description && (
                          <p className="text-sm text-blue-700 mt-1">
                            {selectedGroup.group.description}
                          </p>
                        )}
                        {selectedGroup.group?.candidates && (
                          <p className="text-sm text-blue-700 mt-1">
                            <strong>Candidates:</strong> {selectedGroup.group.candidates.length} member(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

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
                    {activeTab === 'individual' ? (
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li><strong>Assign:</strong> Select candidates and holidays, then click "Assign Holidays" to add them</li>
                        <li><strong>Remove:</strong> Select candidates and holidays, then click "Remove Holidays" to remove them</li>
                        <li>Holidays will be added/removed from each candidate's calendar</li>
                        <li>Attendance records with status "Holiday" will be created/deleted for each holiday date</li>
                      <li>If attendance already exists for a date, it will be skipped (no duplicate records)</li>
                        <li>Holiday IDs will be added/removed from each candidate's holidays array</li>
                    </ul>
                    ) : (
                      <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                        <li><strong>Assign:</strong> Select a group and holidays, then click "Assign Holidays to Group" to add them</li>
                        <li><strong>Remove:</strong> Select a group and holidays, then click "Remove Holidays from Group" to remove them</li>
                        <li>Holidays will be assigned/removed to/from all candidates in the selected group</li>
                        <li>Attendance records with status "Holiday" will be created/deleted for each candidate × holiday date</li>
                        <li>If attendance already exists for a date, it will be skipped (no duplicate records)</li>
                        <li>Holiday IDs will be added/removed from each candidate's holidays array</li>
                        <li>This is useful for bulk assignment/removal to teams (e.g., "US Team", "India Team")</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={activeTab === 'individual' ? handleAssignHolidaysIndividual : handleAssignHolidaysGroup}
                  disabled={
                    assigning || removing ||
                    selectedHolidays.length === 0 || 
                    (activeTab === 'individual' ? selectedCandidates.length === 0 : !selectedGroup)
                  }
                  className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assigning || removing ||
                    selectedHolidays.length === 0 || 
                    (activeTab === 'individual' ? selectedCandidates.length === 0 : !selectedGroup)
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
                      {activeTab === 'individual' ? 'Assign Holidays' : 'Assign Holidays to Group'}
                    </>
                  )}
                </button>
                <button
                  onClick={activeTab === 'individual' ? handleRemoveHolidaysIndividual : handleRemoveHolidaysGroup}
                  disabled={
                    assigning || removing ||
                    selectedHolidays.length === 0 || 
                    (activeTab === 'individual' ? selectedCandidates.length === 0 : !selectedGroup)
                  }
                  className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    assigning || removing ||
                    selectedHolidays.length === 0 || 
                    (activeTab === 'individual' ? selectedCandidates.length === 0 : !selectedGroup)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {removing ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Removing...
                    </>
                  ) : (
                    <>
                      <i className="ri-calendar-close-line"></i>
                      {activeTab === 'individual' ? 'Remove Holidays' : 'Remove Holidays from Group'}
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

              {/* Removal Results */}
              {removalResult && (
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <i className="ri-delete-bin-line"></i>
                    Removal Results
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Candidates Updated:</strong> {removalResult.candidatesUpdated || 0}</p>
                    <p><strong>Holidays Removed:</strong> {removalResult.holidaysRemoved || 0}</p>
                    <p><strong>Attendance Records Deleted:</strong> {removalResult.attendanceRecordsDeleted || 0}</p>
                    
                    {removalResult.skipped && removalResult.skipped.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <p className="font-medium text-yellow-800 mb-2">
                          Skipped Records ({removalResult.skipped.length}):
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {removalResult.skipped.map((skip: any, index: number) => (
                            <div key={index} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              <strong>{skip.candidateName}</strong> - {skip.holidayTitle} ({formatDate(skip.date)}): {skip.reason}
                            </div>
                          ))}
                        </div>
            </div>
          )}

                    {removalResult.deletedRecords && removalResult.deletedRecords.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-red-200">
                        <p className="font-medium text-red-800 mb-2">
                          Deleted Attendance Records ({removalResult.deletedRecords.length}):
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {removalResult.deletedRecords.slice(0, 10).map((record: any, index: number) => (
                            <div key={index} className="text-xs text-red-700 bg-red-50 p-2 rounded">
                              <strong>{record.candidateName}</strong> - {record.holidayTitle} ({formatDate(record.date)})
                            </div>
                          ))}
                          {removalResult.deletedRecords.length > 10 && (
                            <p className="text-xs text-gray-600 italic">
                              ... and {removalResult.deletedRecords.length - 10} more records
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

