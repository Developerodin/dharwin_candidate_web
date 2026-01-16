'use client';

import React, { useEffect, useState } from 'react';
import { getAttendanceByCandidate, fetchAllCandidates, fetchCandidateById } from '@/shared/lib/candidates';
import { getAllHolidays } from '@/shared/lib/holidays';
import { getShiftById } from '@/shared/lib/shifts';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';

type AttendanceRecord = {
  id: string;
  candidate: {
    id: string;
    fullName: string;
    email: string;
  };
  candidateEmail: string;
  date: string;
  day: string;
  punchIn: string | null;
  punchOut: string | null;
  duration: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  success?: boolean;
  data?: {
    results: AttendanceRecord[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
  results?: AttendanceRecord[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
};

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<string>('');
  const [candidateData, setCandidateData] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');

  // Calendar & statistics state (to match admin candidate calendar view)
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [candidateHolidaysByDate, setCandidateHolidaysByDate] = useState<Record<string, { title: string; date: string }>>({});

  // Load current user and find candidate ID
  useEffect(() => {
    try {
      const data = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      setCurrentUser(data ? JSON.parse(data) : null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Resolve candidate ID from user data
  useEffect(() => {
    const resolveCandidateId = async () => {
      if (!currentUser) return;
      
      try {
        // If user role is 'user', try to find their candidate record
        if (currentUser.role === 'user') {
          const allCandidates = await fetchAllCandidates();
          const list = Array.isArray(allCandidates) ? allCandidates : (Array.isArray((allCandidates as any)?.results) ? (allCandidates as any).results : []);
          
          // Find candidate by owner ID or email
          const match = list.find((c: any) => {
            const byOwner = String(c?.owner) === String(currentUser.id || currentUser._id);
            const byEmail = (c?.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase();
            return byOwner || byEmail;
          });
          
          // Handle both id and _id fields
          const matchedCandidateId = match?.id || match?._id;
          if (matchedCandidateId) {
            setCandidateId(matchedCandidateId);
            setCandidateData(match); // Store candidate data to access joiningDate
            
            // Load full candidate data to get leaves and shift
            try {
              const fullCandidateData = await fetchCandidateById(matchedCandidateId);
              setCandidateData(fullCandidateData);
              
              // Load shift if candidate has one
              if (fullCandidateData?.shift) {
                // Check if shift is already a populated object
                if (typeof fullCandidateData.shift === 'object' && fullCandidateData.shift.name) {
                  setShift(fullCandidateData.shift);
                } else {
                  // Shift is an ID, fetch it
                  const shiftId = typeof fullCandidateData.shift === 'string' 
                    ? fullCandidateData.shift 
                    : (fullCandidateData.shift?._id || fullCandidateData.shift?.id);
                  
                  if (shiftId) {
                    try {
                      const shiftResponse = await getShiftById(shiftId);
                      const shiftData = shiftResponse?.data || shiftResponse;
                      if (shiftData && (shiftData.name || shiftData._id || shiftData.id)) {
                        setShift(shiftData);
                      }
                    } catch (e) {
                      console.warn('Failed to load shift:', e);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to load full candidate data:', e);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to resolve candidate ID', e);
      }
    };
    
    resolveCandidateId();
  }, [currentUser]);

  const loadAttendance = async () => {
    if (!candidateId) return;
    
    setLoading(true);
    setError(null);
    try {
      const params: any = {};

      // Match candidate modal logic: use either advanced filter range or current month range
      if (showAdvancedFilter && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        const firstDay = new Date(attendanceYear, attendanceMonth, 1);
        const lastDay = new Date(attendanceYear, attendanceMonth + 1, 0);
        params.startDate = firstDay.toISOString().split('T')[0];
        params.endDate = lastDay.toISOString().split('T')[0];
      }

      params.limit = 1000;

      const response: ApiResponse = await getAttendanceByCandidate(candidateId, params);

      const records =
        (response?.data?.results as AttendanceRecord[] | undefined) ??
        response?.results ??
        [];

      setAttendance(records);
      const total = response?.data?.totalResults ?? response?.totalResults ?? records.length;
      const totalPages = response?.data?.totalPages ?? response?.totalPages ?? 1;

      setTotalResults(total || 0);
      setPage(response?.data?.page ?? response?.page ?? 1);
      setTotalPages(totalPages || 1);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load attendance');
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      loadAttendance();
    }
  }, [candidateId, attendanceYear, attendanceMonth, showAdvancedFilter, startDate, endDate]);

  // Load holidays for this candidate (to show in calendar & stats)
  useEffect(() => {
    const loadCandidateHolidays = async () => {
      if (!candidateData) {
        setCandidateHolidaysByDate({});
        return;
      }

      const holidayIds: string[] = candidateData.holidays || [];
      if (!holidayIds.length) {
        setCandidateHolidaysByDate({});
        return;
      }

      try {
        const response = await getAllHolidays({
          isActive: true,
          sortBy: 'date:asc',
          limit: 1000,
        });

        const holidaysList =
          response?.data?.results ||
          (Array.isArray(response?.data) ? response.data : []);

        const idSet = new Set(holidayIds.map((id: any) => String(id)));
        const map: Record<string, { title: string; date: string }> = {};

        holidaysList.forEach((holiday: any) => {
          const id = String(holiday._id || holiday.id || '');
          if (!id || !idSet.has(id)) return;

          try {
            const dateObj = new Date(holiday.date);
            if (isNaN(dateObj.getTime())) return;

            const key = getLocalDateKey(dateObj);
            map[key] = {
              title: holiday.title || 'Holiday',
              date: holiday.date,
            };
          } catch {
            // Ignore invalid dates
          }
        });

        setCandidateHolidaysByDate(map);
      } catch (e) {
        console.error('Failed to load holidays for attendance calendar:', e);
        setCandidateHolidaysByDate({});
      }
    };

    loadCandidateHolidays();
  }, [candidateData]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getDayName = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Use the same date parsing as formatDate to ensure consistency
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString();
    } catch {
      return timeString;
    }
  };

  const formatDuration = (duration: number | null | undefined) => {
    if (duration === null || duration === undefined || duration === 0) return 'N/A';
    
    // Assume duration is in milliseconds
    const milliseconds = duration;
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '< 1m';
    }
  };

  // Calculate arrival status (On time / Late)
  const getArrivalStatus = (record: AttendanceRecord): string => {
    if (!record.punchIn || !shift) return 'N/A';
    
    try {
      const punchInDate = new Date(record.punchIn);
      
      // Get the date part of punch-in (local date)
      const punchInYear = punchInDate.getFullYear();
      const punchInMonth = punchInDate.getMonth();
      const punchInDay = punchInDate.getDate();
      
      // Parse shift start time (HH:mm format)
      const [shiftHours, shiftMinutes] = shift.startTime.split(':').map(Number);
      
      // Create expected punch-in time for that date in local timezone
      const expectedPunchIn = new Date(punchInYear, punchInMonth, punchInDay, shiftHours, shiftMinutes, 0, 0);
      
      // Compare punch-in time with expected time
      // Allow a small buffer (1 minute) for "on time" to account for clock differences
      const bufferMs = 60 * 1000; // 1 minute
      if (punchInDate.getTime() <= expectedPunchIn.getTime() + bufferMs) {
        return 'On time';
      } else {
        return 'Late';
      }
    } catch (e) {
      console.error('Error calculating arrival status:', e);
      return 'N/A';
    }
  };

  // ===== Calendar Helpers (similar to admin candidate calendar) =====

  // Convert duration (ms) to hours with 2 decimal precision
  const formatDurationHours = (milliseconds: number) => {
    if (!milliseconds || milliseconds === 0) return 0;
    return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
  };

  // Get week-off days from candidate data
  const getWeekOffDays = (): string[] => {
    if (!candidateData) return [];
    return candidateData.weekOff || [];
  };

  // Build a local (non-UTC) date key in YYYY-MM-DD format
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if a date is a week-off day
  const isWeekOffDay = (date: Date): boolean => {
    const weekOffDays = getWeekOffDays();
    if (weekOffDays.length === 0) return false;
    
    // Get day name (e.g., "Sunday", "Monday")
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return weekOffDays.includes(dayName);
  };

  // Get effective joining date: from candidate data or first punchIn date
  const getEffectiveJoiningDate = (): Date | null => {
    if (!candidateData) return null;
    
    // First priority: Use joiningDate from candidate data if available and valid
    const joiningDate = candidateData?.joiningDate;
    if (joiningDate) {
      try {
        const date = new Date(joiningDate);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          date.setHours(0, 0, 0, 0);
          return date;
        }
      } catch (e) {
        // Invalid date, continue to next option
      }
    }
    
    // Second priority: If no joiningDate, find the earliest punchIn date
    if (attendance.length > 0) {
      let earliestPunchIn: Date | null = null;
      attendance.forEach(record => {
        if (record.punchIn) {
          try {
            const punchInDate = new Date(record.punchIn);
            if (!isNaN(punchInDate.getTime())) {
              punchInDate.setHours(0, 0, 0, 0);
              if (!earliestPunchIn || punchInDate < earliestPunchIn) {
                earliestPunchIn = punchInDate;
              }
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
      });
      return earliestPunchIn;
    }
    
    // If neither available, return null
    return null;
  };

  // Get resign date from candidate data
  const getResignDate = (): Date | null => {
    if (!candidateData) return null;
    
    const resignDate = candidateData?.resignDate;
    if (resignDate) {
      try {
        const date = new Date(resignDate);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          date.setHours(0, 0, 0, 0);
          return date;
        }
      } catch (e) {
        // Invalid date, return null
      }
    }
    
    return null;
  };

  // Build calendar grid for selected month/year
  const getCalendarData = () => {
    const year = attendanceYear;
    const month = attendanceMonth;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get effective joining date and resign date
    const joiningDate = getEffectiveJoiningDate();
    const joiningDateUTC = joiningDate ? new Date(Date.UTC(
      joiningDate.getUTCFullYear(),
      joiningDate.getUTCMonth(),
      joiningDate.getUTCDate()
    )) : null;
    
    const resignDate = getResignDate();
    const resignDateUTC = resignDate ? new Date(Date.UTC(
      resignDate.getUTCFullYear(),
      resignDate.getUTCMonth(),
      resignDate.getUTCDate()
    )) : null;

    // Map attendance records by punchIn date (not date field)
    // Extract date using UTC to avoid timezone shifts
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendance.forEach((record) => {
      if (record.punchIn) {
        // Use UTC methods to get the exact date from punchIn timestamp
        const punchInDate = new Date(record.punchIn);
        const year = punchInDate.getUTCFullYear();
        const month = String(punchInDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(punchInDate.getUTCDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        // If multiple records for same date, keep the one with punchOut (complete attendance)
        const existing = attendanceMap.get(dateKey);
        if (!existing || (record.punchOut && !existing.punchOut)) {
          attendanceMap.set(dateKey, record);
        }
      }
    });

    // Map leaves
    const leavesMap = new Map<string, { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string }>();
    const candidateLeaves = candidateData?.leaves || [];
    candidateLeaves.forEach((leave: any) => {
      if (leave.date) {
        try {
          const dateObj = new Date(leave.date);
          if (!isNaN(dateObj.getTime())) {
            const key = getLocalDateKey(dateObj);
            leavesMap.set(key, leave);
          }
        } catch {
          // Ignore invalid dates
        }
      }
    });

    const calendarDays: Array<{ day: number; date: Date; attendance: AttendanceRecord | null; holiday?: { title: string; date: string } | null; leave?: { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string } | null }> = [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push({ day: 0, date: new Date(year, month, -i), attendance: null, holiday: null, leave: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Create date key using UTC to match punchIn date extraction
      // Use Date.UTC to create date at midnight UTC, then extract date parts
      const utcDate = new Date(Date.UTC(year, month, day));
      
      // Skip dates before joining date
      if (joiningDateUTC && utcDate < joiningDateUTC) {
        calendarDays.push({ day: 0, date, attendance: null, holiday: null, leave: null });
        continue;
      }
      
      // Skip dates after resign date
      if (resignDateUTC && utcDate > resignDateUTC) {
        calendarDays.push({ day: 0, date, attendance: null, holiday: null, leave: null });
        continue;
      }
      
      const yearUTC = utcDate.getUTCFullYear();
      const monthUTC = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
      const dayUTC = String(utcDate.getUTCDate()).padStart(2, '0');
      const dateKey = `${yearUTC}-${monthUTC}-${dayUTC}`;
      const record = attendanceMap.get(dateKey) || null;

      // Holiday matching is done with local date key so it aligns with the visual calendar
      const holidayKey = getLocalDateKey(date);
      const holiday = candidateHolidaysByDate[holidayKey] || null;
      const leave = leavesMap.get(holidayKey) || null;

      calendarDays.push({ day, date, attendance: record, holiday, leave });
    }

    return calendarDays;
  };

  // Calculate statistics for selected period using calendar data,
  // treating week-offs and holidays as non-working days.
  const getMonthStatistics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calendarDays = getCalendarData();

    let isInRange: (d: Date) => boolean;

    if (showAdvancedFilter && startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const rawEnd = new Date(endDate);
      rawEnd.setHours(0, 0, 0, 0);

      const resignDate = getResignDate();
      let effectiveEnd = rawEnd;
      if (resignDate && resignDate < effectiveEnd) {
        effectiveEnd = resignDate;
      }
      if (effectiveEnd > today) {
        effectiveEnd = today;
      }

      isInRange = (d: Date) => d >= start && d <= effectiveEnd;
    } else {
      const year = attendanceYear;
      const month = attendanceMonth;

      isInRange = (d: Date) =>
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d < today;
    }

    let totalDuration = 0;
    let presentDays = 0;
    let workingDays = 0;
    let leaveDays = 0;

    calendarDays.forEach((item) => {
      if (item.day === 0) return;

      const itemDate = new Date(item.date);
      itemDate.setHours(0, 0, 0, 0);
      if (!isInRange(itemDate)) return;

      const hasAttendance =
        item.attendance && (item.attendance.punchIn || item.attendance.punchOut);
      const isPresent =
        !!(item.attendance && item.attendance.punchIn && item.attendance.punchOut);
      const isWeekOff = isWeekOffDay(itemDate);
      const isHoliday = !!item.holiday;
      const isLeave = !!item.leave;

      // Week-offs and holidays are non-working: do not count them as working, present, or absent
      if (!isWeekOff && !isHoliday) {
        workingDays += 1;
        if (isLeave) {
          // Leave days are counted separately and not as absent
          leaveDays += 1;
        } else if (isPresent) {
          presentDays += 1;
        }
      }

      if (item.attendance && item.attendance.duration) {
        totalDuration += item.attendance.duration;
      }
    });

    const totalHours = formatDurationHours(totalDuration);
    // Absent days = working days - present days - leave days
    const absentDays = Math.max(0, workingDays - presentDays - leaveDays);

    return { totalHours, presentDays, absentDays, leaveDays };
  };

  return (
    <>
      <Seo title="Attendance" />
      <Pageheader currentpage="Attendance" activepage="Pages" mainpage="Attendance" />
      <div className="space-y-6 mt-3">
          <h1 className="text-2xl font-semibold">Attendance Records</h1>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!candidateId && !loading && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
            Please log in as a candidate to view attendance records.
          </div>
        )}

        {/* Calendar & statistics layout (similar to admin candidate view) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600">Loading attendance data...</p>
            </div>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              {/* Summary Cards */}
              {(() => {
                const monthStats = getMonthStatistics();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Working Hours</p>
                          <p className="text-2xl font-bold text-blue-600 mt-1">
                            {monthStats.totalHours.toFixed(2)}h
                          </p>
                        </div>
                        <i className="ri-time-line text-3xl text-blue-600"></i>
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Present Days</p>
                          <p className="text-2xl font-bold text-green-600 mt-1">
                            {monthStats.presentDays}
                          </p>
                        </div>
                        <i className="ri-checkbox-circle-line text-3xl text-green-600"></i>
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Absent Days</p>
                          <p className="text-2xl font-bold text-red-600 mt-1">
                            {monthStats.absentDays}
                          </p>
                        </div>
                        <i className="ri-close-circle-line text-3xl text-red-600"></i>
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Leave Days</p>
                          <p className="text-2xl font-bold text-orange-600 mt-1">
                            {monthStats.leaveDays || 0}
                          </p>
                        </div>
                        <i className="ri-calendar-check-line text-3xl text-orange-600"></i>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Shift Details Section */}
              {(candidateData?.shift || shift) && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <i className="ri-time-zone-line text-primary"></i>
                    Shift Details
                  </h4>
                  {shift ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Shift Name</p>
                        <p className="text-sm font-medium text-gray-900">
                          {shift.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Start Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {shift.startTime || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">End Time</p>
                        <p className="text-sm font-medium text-gray-900">
                          {shift.endTime || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Timezone</p>
                        <p className="text-sm font-medium text-gray-900">
                          {shift.timezone || 'N/A'}
                        </p>
                      </div>
                      {shift.description && (
                        <div className="md:col-span-2 lg:col-span-4">
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-sm text-gray-700">
                            {shift.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Shift details not available
                    </p>
                  )}
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Calendar View
                </button>
              </div>

              {/* List View */}
              {viewMode === 'list' && (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Attendance Records</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 font-medium text-gray-700">Name</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Email</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Date</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Day</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Punch In</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Punch Out</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Hours Worked</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Arrival Status</th>
                          <th className="px-4 py-2 font-medium text-gray-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">
                              No attendance records found
                            </td>
                          </tr>
                        ) : (
                          attendance.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-700">
                                {record.candidate?.fullName || candidateData?.fullName || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {record.candidateEmail || candidateData?.email || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {getDayName(record.date)}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {formatTime(record.punchIn)}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {formatTime(record.punchOut)}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                {formatDuration(record.duration)}
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  getArrivalStatus(record) === 'On time'
                                    ? 'bg-green-100 text-green-800'
                                    : getArrivalStatus(record) === 'Late'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {getArrivalStatus(record)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-700">
                                <span className="block max-w-md truncate" title={record.notes || 'N/A'}>
                                  {record.notes || 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Calendar Layout */}
              {viewMode === 'calendar' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Calendar View - {new Date(attendanceYear, attendanceMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>

                  {/* Year/Month Selectors and Advanced Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Year Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Year:</label>
                      <select
                        value={attendanceYear}
                        onChange={(e) => {
                          setAttendanceYear(parseInt(e.target.value));
                          setShowAdvancedFilter(false);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {(() => {
                          const joiningDate = getEffectiveJoiningDate();
                          const resignDate = getResignDate();
                          const joiningYear = joiningDate ? joiningDate.getUTCFullYear() : new Date().getFullYear() - 2;
                          const maxYear = resignDate ? resignDate.getUTCFullYear() : new Date().getFullYear();
                          const yearsToShow = maxYear - joiningYear + 1;
                          return Array.from({ length: Math.max(yearsToShow, 10) }, (_, i) => {
                            const year = joiningYear + i;
                            if (year > maxYear) return null;
                            return (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            );
                          }).filter(Boolean);
                        })()}
                      </select>
                    </div>

                    {/* Month Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Month:</label>
                      <select
                        value={attendanceMonth}
                        onChange={(e) => {
                          setAttendanceMonth(parseInt(e.target.value));
                          setShowAdvancedFilter(false);
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map((month, index) => (
                          <option key={index} value={index}>
                            {month}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Advanced Filter Toggle */}
                    <button
                      onClick={() => {
                        setShowAdvancedFilter(!showAdvancedFilter);
                        if (showAdvancedFilter) {
                          setStartDate('');
                          setEndDate('');
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {showAdvancedFilter ? 'Hide' : 'Advanced'} Filter
                    </button>
                  </div>
                </div>

                {/* Advanced Filter Section */}
                {showAdvancedFilter && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
              </div>
          </div>
                )}

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <button
                      onClick={() => {
                        let newMonth = attendanceMonth - 1;
                        let newYear = attendanceYear;

                        if (newMonth < 0) {
                          newMonth = 11;
                          newYear = attendanceYear - 1;
                        }

                        // Check if new date is before joining date
                        const joiningDate = getEffectiveJoiningDate();
                        if (joiningDate) {
                          const joiningYear = joiningDate.getUTCFullYear();
                          const joiningMonth = joiningDate.getUTCMonth();
                          if (newYear < joiningYear || (newYear === joiningYear && newMonth < joiningMonth)) {
                            return; // Don't navigate before joining date
                          }
                        }

                        setAttendanceMonth(newMonth);
                        setAttendanceYear(newYear);
                        setShowAdvancedFilter(false);
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Previous Month"
                      disabled={(() => {
                        const joiningDate = getEffectiveJoiningDate();
                        if (!joiningDate) return false;
                        const joiningYear = joiningDate.getUTCFullYear();
                        const joiningMonth = joiningDate.getUTCMonth();
                        let prevMonth = attendanceMonth - 1;
                        let prevYear = attendanceYear;
                        if (prevMonth < 0) {
                          prevMonth = 11;
                          prevYear = attendanceYear - 1;
                        }
                        return prevYear < joiningYear || (prevYear === joiningYear && prevMonth < joiningMonth);
                      })()}
                    >
                      <i className="ri-arrow-left-s-line text-xl"></i>
                    </button>

                    <h5 className="text-lg font-semibold text-gray-900">
                      {new Date(attendanceYear, attendanceMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h5>

                    <button
                      onClick={() => {
                        let newMonth = attendanceMonth + 1;
                        let newYear = attendanceYear;

                        if (newMonth > 11) {
                          newMonth = 0;
                          newYear = attendanceYear + 1;
                        }

                        // Check if new date is after resign date
                        const resignDate = getResignDate();
                        if (resignDate) {
                          const resignYear = resignDate.getUTCFullYear();
                          const resignMonth = resignDate.getUTCMonth();
                          if (newYear > resignYear || (newYear === resignYear && newMonth > resignMonth)) {
                            return; // Don't navigate after resign date
                          }
                        }

                        setAttendanceMonth(newMonth);
                        setAttendanceYear(newYear);
                        setShowAdvancedFilter(false);
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Next Month"
                      disabled={(() => {
                        const resignDate = getResignDate();
                        if (!resignDate) return false;
                        const resignYear = resignDate.getUTCFullYear();
                        const resignMonth = resignDate.getUTCMonth();
                        let nextMonth = attendanceMonth + 1;
                        let nextYear = attendanceYear;
                        if (nextMonth > 11) {
                          nextMonth = 0;
                          nextYear = attendanceYear + 1;
                        }
                        return nextYear > resignYear || (nextYear === resignYear && nextMonth > resignMonth);
                      })()}
                    >
                      <i className="ri-arrow-right-s-line text-xl"></i>
                    </button>
                  </div>

                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 bg-gray-50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 bg-white">
                    {getCalendarData().map((item, index) => {
                      const hasAttendance = item.attendance && (item.attendance.punchIn || item.attendance.punchOut);
                      const isPresent = item.attendance && item.attendance.punchIn && item.attendance.punchOut;
                      const hours = item.attendance ? formatDurationHours(item.attendance.duration) : 0;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const itemDate = new Date(item.date);
                      itemDate.setHours(0, 0, 0, 0);
                      const isPastDate = itemDate < today;
                      const isWeekOff = item.day > 0 && isWeekOffDay(itemDate);
                      const isHoliday = !!item.holiday;
                      const isLeave = !!item.leave;
                      const leaveType = item.leave?.leaveType || null;

                      return (
                        <div
                          key={index}
                          className={`min-h-[80px] p-2 border border-gray-200 ${
                            item.day === 0 
                              ? 'bg-gray-50' 
                              : isLeave
                                  ? leaveType === 'sick' 
                                      ? 'bg-purple-50'
                                      : 'bg-orange-50'
                                  : isPresent 
                                      ? 'bg-green-50' 
                                      : hasAttendance && !isPresent
                                          ? 'bg-yellow-50'
                                          : isHoliday
                                              ? 'bg-emerald-50'
                                              : isWeekOff
                                                  ? 'bg-blue-50'
                                                  : isPastDate
                                                      ? 'bg-red-50'
                                                      : 'bg-white'
                          }`}
                        >
                          {item.day > 0 && (
                            <div className="flex flex-col h-full">
                              <span className={`text-sm font-medium ${
                                item.day === 0 
                                  ? 'text-gray-400' 
                                  : isLeave
                                      ? leaveType === 'sick'
                                          ? 'text-purple-700'
                                          : 'text-orange-700'
                                      : isPresent 
                                          ? 'text-green-700' 
                                          : hasAttendance && !isPresent
                                              ? 'text-yellow-700'
                                              : isWeekOff
                                                  ? 'text-blue-700'
                                                  : isHoliday
                                                      ? 'text-emerald-700'
                                                      : isPastDate
                                                          ? 'text-red-700'
                                                          : 'text-gray-600'
                              }`}>
                                {item.day}
                              </span>
                              {isLeave && (
                                <span className={`text-xs font-semibold mt-1 ${
                                  leaveType === 'sick'
                                      ? 'text-purple-600'
                                      : 'text-orange-600'
                                }`}>
                                  {leaveType === 'sick' ? 'Sick Leave' : 'Casual Leave'}
                                </span>
                              )}
                              {isPresent && !isLeave && (
                                <>
                                  <span className="text-xs font-semibold text-green-600 mt-1">
                                    Present
                                  </span>
                                  <span className="text-xs text-green-600">
                                    {hours.toFixed(1)}h
                                  </span>
                                </>
                              )}
                              {hasAttendance && !isPresent && !isLeave && (
                                <span className="text-xs text-yellow-600 mt-1">
                                  Incomplete
                                </span>
                              )}
                              {isHoliday && !isLeave && (
                                <span className="text-xs font-semibold text-emerald-600 mt-1">
                                  {item.holiday?.title ? `${item.holiday.title} (Holiday)` : 'Holiday'}
                                </span>
                              )}
                              {isWeekOff && !hasAttendance && !isHoliday && !isLeave && (
                                <span className="text-xs font-semibold text-blue-600 mt-1">
                                  Week-Off
                                </span>
                              )}
                              {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && isPastDate && (
                                <span className="text-xs text-red-500 mt-1">
                                  Absent
                                </span>
                              )}
                              {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && !isPastDate && (
                                <span className="text-xs text-gray-400 mt-1">
                                  -
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

