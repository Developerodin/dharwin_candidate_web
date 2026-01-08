'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAttendanceByCandidate, fetchCandidateById } from '@/shared/lib/candidates';
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

type Shift = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
};

type Candidate = {
  id?: string;
  _id?: string;
  fullName?: string;
  email?: string;
  shift?: string | Shift;
  weekOff?: string[];
  holidays?: string[];
  joiningDate?: string;
  resignDate?: string;
  leaves?: Array<{
    _id: string;
    date: string;
    leaveType: 'casual' | 'sick';
    notes: string | null;
    assignedAt: string;
  }>;
};

export default function CandidateAttendancePage() {
  const params = useParams();
  const candidateId = params?.candidateId as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
  
  // Calendar state
  const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
  const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth());
  const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [candidateHolidaysByDate, setCandidateHolidaysByDate] = useState<Record<string, { title: string; date: string }>>({});

  // Load candidate data
  useEffect(() => {
    const loadCandidate = async () => {
      if (!candidateId) return;
      
      try {
        const candidateData = await fetchCandidateById(candidateId);
        setCandidate(candidateData);
        
        // Load shift if candidate has one
        if (candidateData?.shift) {
          // Check if shift is already a populated object with name property
          if (typeof candidateData.shift === 'object' && candidateData.shift.name) {
            // Shift is already populated, use it directly
            setShift(candidateData.shift);
          } else {
            // Shift is an ID (string or object with _id/id), fetch it
            const shiftId = typeof candidateData.shift === 'string' 
              ? candidateData.shift 
              : (candidateData.shift?._id || candidateData.shift?.id);
            
            if (shiftId) {
              try {
                const shiftResponse = await getShiftById(shiftId);
                // Handle response that might be wrapped in data property (some APIs wrap it)
                const shiftData = shiftResponse?.data || shiftResponse;
                if (shiftData && (shiftData.name || shiftData._id || shiftData.id)) {
                  setShift(shiftData);
                } else {
                  console.warn('Shift data structure unexpected:', shiftData);
                  setShift(null);
                }
              } catch (e) {
                console.error('Failed to load shift:', e);
                setShift(null);
              }
            } else {
              console.warn('No valid shift ID found in candidate data. Shift value:', candidateData.shift);
              setShift(null);
            }
          }
        } else {
          console.log('No shift found for candidate');
          setShift(null);
        }
        
        // Load holidays
        const holidayIds: string[] = candidateData.holidays || [];
        if (holidayIds.length > 0) {
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
            console.error('Failed to load holidays:', e);
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load candidate');
      }
    };

    loadCandidate();
  }, [candidateId]);

  // Load attendance data
  useEffect(() => {
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

        const response = await getAttendanceByCandidate(candidateId, params);

        const records =
          (response?.data?.results as AttendanceRecord[] | undefined) ??
          response?.results ??
          [];

        setAttendance(records);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load attendance');
        setAttendance([]);
      } finally {
        setLoading(false);
      }
    };

    if (candidateId) {
      loadAttendance();
    }
  }, [candidateId, attendanceYear, attendanceMonth, showAdvancedFilter, startDate, endDate]);

  // Helper functions
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
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

  const formatDurationHours = (milliseconds: number) => {
    if (!milliseconds || milliseconds === 0) return 0;
    return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
  };

  const formatDuration = (milliseconds: number) => {
    if (!milliseconds || milliseconds === 0) return 'N/A';
    
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

  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekOffDays = (): string[] => {
    if (!candidate) return [];
    return candidate.weekOff || [];
  };

  const isWeekOffDay = (date: Date): boolean => {
    const weekOffDays = getWeekOffDays();
    if (weekOffDays.length === 0) return false;
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return weekOffDays.includes(dayName);
  };

  // Get effective joining date: from candidate data or first punchIn date
  const getEffectiveJoiningDate = (): Date | null => {
    if (!candidate) return null;
    
    // First priority: Use joiningDate from candidate data if available and valid
    const joiningDate = candidate?.joiningDate;
    if (joiningDate) {
      try {
        const date = new Date(joiningDate);
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
    
    return null;
  };

  // Get resign date from candidate data
  const getResignDate = (): Date | null => {
    if (!candidate) return null;
    
    const resignDate = candidate?.resignDate;
    if (resignDate) {
      try {
        const date = new Date(resignDate);
        if (!isNaN(date.getTime())) {
          date.setHours(0, 0, 0, 0);
          return date;
        }
      } catch (e) {
        // Invalid date
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
    const attendanceMap = new Map<string, AttendanceRecord>();
    attendance.forEach((record) => {
      if (record.punchIn) {
        const punchInDate = new Date(record.punchIn);
        const year = punchInDate.getUTCFullYear();
        const month = String(punchInDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(punchInDate.getUTCDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const existing = attendanceMap.get(dateKey);
        if (!existing || (record.punchOut && !existing.punchOut)) {
          attendanceMap.set(dateKey, record);
        }
      }
    });

    // Map leaves
    const leavesMap = new Map<string, { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string }>();
    const candidateLeaves = candidate?.leaves || [];
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

    const calendarDays: Array<{ 
      day: number; 
      date: Date; 
      attendance: AttendanceRecord | null; 
      holiday?: { title: string; date: string } | null;
      leave?: { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string } | null;
    }> = [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push({ day: 0, date: new Date(year, month, -i), attendance: null, holiday: null, leave: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
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

      const holidayKey = getLocalDateKey(date);
      const holiday = candidateHolidaysByDate[holidayKey] || null;
      const leave = leavesMap.get(holidayKey) || null;

      calendarDays.push({ day, date, attendance: record, holiday, leave });
    }

    return calendarDays;
  };

  // Calculate statistics for selected period using calendar data
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
    const absentDays = Math.max(0, workingDays - presentDays - leaveDays);

    return { totalHours, presentDays, absentDays, leaveDays };
  };

  const handleApplyAdvancedFilter = () => {
    if (startDate && endDate) {
      // Trigger attendance reload by updating state
      setShowAdvancedFilter(true);
    }
  };

  if (!candidateId) {
    return (
      <>
        <Seo title="Candidate Attendance" />
        <Pageheader currentpage="Candidate Attendance" activepage="Track Attendance" mainpage="Candidate Attendance" />
        <div className="space-y-6 mt-3">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid candidate ID
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Candidate Attendance" />
      <Pageheader currentpage="Candidate Attendance" activepage="Track Attendance" mainpage="Candidate Attendance" />
      <div className="space-y-6 mt-3">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Attendance Details - {candidate?.fullName || 'N/A'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {candidate?.email || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600 dark:text-gray-400">Loading attendance data...</p>
            </div>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              {/* Summary Cards */}
              {(() => {
                const monthStats = getMonthStatistics();
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Working Hours</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                            {monthStats.totalHours.toFixed(2)}h
                          </p>
                        </div>
                        <i className="ri-time-line text-3xl text-blue-600 dark:text-blue-400"></i>
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                            {monthStats.presentDays}
                          </p>
                        </div>
                        <i className="ri-checkbox-circle-line text-3xl text-green-600 dark:text-green-400"></i>
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Absent Days</p>
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                            {monthStats.absentDays}
                          </p>
                        </div>
                        <i className="ri-close-circle-line text-3xl text-red-600 dark:text-red-400"></i>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Leave Days</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                            {monthStats.leaveDays || 0}
                          </p>
                        </div>
                        <i className="ri-calendar-check-line text-3xl text-orange-600 dark:text-orange-400"></i>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Shift Details Section */}
              {(candidate?.shift || shift) && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <i className="ri-time-zone-line text-primary"></i>
                    Shift Details
                  </h4>
                  {shift ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shift Name</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {shift.name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {shift.startTime || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {shift.endTime || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timezone</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {shift.timezone || 'N/A'}
                        </p>
                      </div>
                      {shift.description && (
                        <div className="md:col-span-2 lg:col-span-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {shift.description}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Shift details not available
                    </p>
                  )}
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Calendar View
                </button>
              </div>

              {/* List View */}
              {viewMode === 'list' && (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Attendance Records</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Name</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Email</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Date</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Day</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Punch In</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Punch Out</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Hours Worked</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Arrival Status</th>
                          <th className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                              No attendance records found
                            </td>
                          </tr>
                        ) : (
                          attendance.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {record.candidate?.fullName || candidate?.fullName || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {record.candidateEmail || candidate?.email || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {record.day || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {formatTime(record.punchIn)}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {formatTime(record.punchOut)}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {formatDuration(record.duration)}
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  getArrivalStatus(record) === 'On time'
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                    : getArrivalStatus(record) === 'Late'
                                      ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}>
                                  {getArrivalStatus(record)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
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
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                    Calendar View - {new Date(attendanceYear, attendanceMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>
                  
                  {/* Year/Month Selectors and Advanced Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Year Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600 dark:text-gray-400">Year:</label>
                      <select
                        value={attendanceYear}
                        onChange={(e) => {
                          setAttendanceYear(parseInt(e.target.value));
                          setShowAdvancedFilter(false);
                        }}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
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
                      <label className="text-sm text-gray-600 dark:text-gray-400">Month:</label>
                      <select
                        value={attendanceMonth}
                        onChange={(e) => {
                          setAttendanceMonth(parseInt(e.target.value));
                          setShowAdvancedFilter(false);
                        }}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
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
                      className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {showAdvancedFilter ? 'Hide' : 'Advanced'} Filter
                    </button>
                  </div>
                </div>
                
                {/* Advanced Filter Section */}
                {showAdvancedFilter && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleApplyAdvancedFilter}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
                      >
                        Apply Filter
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => {
                        let newMonth = attendanceMonth - 1;
                        let newYear = attendanceYear;
                        
                        if (newMonth < 0) {
                          newMonth = 11;
                          newYear = attendanceYear - 1;
                        }
                        
                        const joiningDate = getEffectiveJoiningDate();
                        if (joiningDate) {
                          const joiningYear = joiningDate.getUTCFullYear();
                          const joiningMonth = joiningDate.getUTCMonth();
                          if (newYear < joiningYear || (newYear === joiningYear && newMonth < joiningMonth)) {
                            return;
                          }
                        }
                        
                        setAttendanceMonth(newMonth);
                        setAttendanceYear(newYear);
                        setShowAdvancedFilter(false);
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    
                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
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
                        
                        const resignDate = getResignDate();
                        if (resignDate) {
                          const resignYear = resignDate.getUTCFullYear();
                          const resignMonth = resignDate.getUTCMonth();
                          if (newYear > resignYear || (newYear === resignYear && newMonth > resignMonth)) {
                            return;
                          }
                        }
                        
                        setAttendanceMonth(newMonth);
                        setAttendanceYear(newYear);
                        setShowAdvancedFilter(false);
                      }}
                      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 bg-white dark:bg-gray-800">
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
                          className={`min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 ${
                            item.day === 0 
                              ? 'bg-gray-50 dark:bg-gray-900' 
                              : isLeave
                                  ? leaveType === 'sick' 
                                      ? 'bg-purple-50 dark:bg-purple-900/20'
                                      : 'bg-orange-50 dark:bg-orange-900/20'
                                  : isPresent 
                                      ? 'bg-green-50 dark:bg-green-900/20' 
                                      : hasAttendance && !isPresent
                                          ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                          : isHoliday
                                              ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                              : isWeekOff
                                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                                  : isPastDate
                                                      ? 'bg-red-50 dark:bg-red-900/20'
                                                      : 'bg-white dark:bg-gray-800'
                          }`}
                        >
                          {item.day > 0 && (
                            <div className="flex flex-col h-full">
                              <span className={`text-sm font-medium ${
                                item.day === 0 
                                  ? 'text-gray-400' 
                                  : isLeave
                                      ? leaveType === 'sick'
                                          ? 'text-purple-700 dark:text-purple-400'
                                          : 'text-orange-700 dark:text-orange-400'
                                      : isPresent 
                                          ? 'text-green-700 dark:text-green-400' 
                                          : hasAttendance && !isPresent
                                              ? 'text-yellow-700 dark:text-yellow-400'
                                              : isWeekOff
                                                  ? 'text-blue-700 dark:text-blue-400'
                                                  : isHoliday
                                                      ? 'text-emerald-700 dark:text-emerald-400'
                                                      : isPastDate
                                                          ? 'text-red-700 dark:text-red-400'
                                                          : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {item.day}
                              </span>
                              {isLeave && (
                                <span className={`text-xs font-semibold mt-1 ${
                                  leaveType === 'sick'
                                      ? 'text-purple-600 dark:text-purple-400'
                                      : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                  {leaveType === 'sick' ? 'Sick Leave' : 'Casual Leave'}
                                </span>
                              )}
                              {isPresent && !isLeave && (
                                <>
                                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                                    Present
                                  </span>
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    {hours.toFixed(1)}h
                                  </span>
                                </>
                              )}
                              {hasAttendance && !isPresent && !isLeave && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                  Incomplete
                                </span>
                              )}
                              {isHoliday && !isLeave && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                  {item.holiday?.title ? `${item.holiday.title} (Holiday)` : 'Holiday'}
                                </span>
                              )}
                              {isWeekOff && !hasAttendance && !isHoliday && !isLeave && (
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                  Week-Off
                                </span>
                              )}
                              {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && isPastDate && (
                                <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                                  Absent
                                </span>
                              )}
                              {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && !isPastDate && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
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
