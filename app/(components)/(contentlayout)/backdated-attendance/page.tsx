'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchAllCandidates, createBackdatedAttendanceRequest, getBackdatedAttendanceRequestsByCandidate, cancelBackdatedAttendanceRequest } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
  attendanceEntries: AttendanceEntry[];
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

const BackdatedAttendancePage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [candidateId, setCandidateId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState<boolean>(false);
  const [showExcelUpload, setShowExcelUpload] = useState<boolean>(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Form state - support multiple entries
  const [attendanceEntries, setAttendanceEntries] = useState<Array<{
    date: string;
    punchInTime: string;
    punchOutTime: string;
    timezone: string;
  }>>([{
    date: '',
    punchInTime: '',
    punchOutTime: '',
    timezone: 'Asia/Kolkata'
  }]);
  const [notes, setNotes] = useState<string>('');

  // Requests state
  const [requests, setRequests] = useState<BackdatedAttendanceRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');

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

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!candidateId) return;

    setLoadingRequests(true);
    try {
      const params: any = {
        limit: 100,
        page: 1
      };
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await getBackdatedAttendanceRequestsByCandidate(candidateId, params);
      const results = response?.data?.results || response?.results || [];
      
      // Ensure each result has a valid _id
      const validatedResults = results.map((req: any) => ({
        ...req,
        _id: req._id || req.id || ''
      })).filter((req: any) => req._id); // Filter out any without valid ID
      
      setRequests(validatedResults);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load requests';
      
      if (errorMessage.includes('populate.split')) {
        // Backend bug workaround
        try {
          const params: any = {
            limit: 100,
            page: 1
          };
          if (filterStatus !== 'all') {
            params.status = filterStatus;
          }
          const response = await getBackdatedAttendanceRequestsByCandidate(candidateId, params);
          const results = response?.data?.results || response?.results || [];
          
          // Ensure each result has a valid _id
          const validatedResults = results.map((req: any) => ({
            ...req,
            _id: req._id || req.id || ''
          })).filter((req: any) => req._id); // Filter out any without valid ID
          
          setRequests(validatedResults);
          return;
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
    }
  }, [candidateId, filterStatus]);

  useEffect(() => {
    if (candidateId) {
      fetchRequests();
    }
  }, [candidateId, filterStatus, fetchRequests]);

  // Format date/time for display
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

  // Add new entry
  const addEntry = () => {
    setAttendanceEntries([...attendanceEntries, {
      date: '',
      punchInTime: '',
      punchOutTime: '',
      timezone: 'Asia/Kolkata'
    }]);
  };

  // Remove entry
  const removeEntry = (index: number) => {
    if (attendanceEntries.length > 1) {
      setAttendanceEntries(attendanceEntries.filter((_, i) => i !== index));
    }
  };

  // Update entry
  const updateEntry = (index: number, field: string, value: string) => {
    const updated = [...attendanceEntries];
    updated[index] = { ...updated[index], [field]: value };
    setAttendanceEntries(updated);
  };

  // Handle create request
  const handleCreateRequest = async () => {
    if (!candidateId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Profile Not Found',
        text: 'Please ensure your profile is set up correctly',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate all entries
    const validEntries = attendanceEntries.filter(entry => entry.date && entry.punchInTime);
    
    if (validEntries.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Entries Required',
        text: 'Please add at least one attendance entry with date and punch in time',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Validate each entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const errors: string[] = [];

    validEntries.forEach((entry, index) => {
      const selectedDate = new Date(entry.date);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate >= today) {
        errors.push(`Entry ${index + 1}: Date must be in the past`);
      }

      if (entry.punchOutTime) {
        const punchInDateTime = new Date(`${entry.date}T${entry.punchInTime}`);
        let punchOutDateTime = new Date(`${entry.date}T${entry.punchOutTime}`);
        
        // If punch-out time is earlier than punch-in time, it's likely a night shift (next day)
        if (punchOutDateTime <= punchInDateTime) {
          // Add one day to punch-out for night shift scenario
          punchOutDateTime = new Date(punchOutDateTime);
          punchOutDateTime.setDate(punchOutDateTime.getDate() + 1);
        }
        
        // Final validation: punch-out must be after punch-in
        if (punchOutDateTime <= punchInDateTime) {
          errors.push(`Entry ${index + 1}: Punch out time must be after punch in time`);
        }
      }
    });

    if (errors.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Errors',
        html: errors.join('<br>'),
        confirmButtonText: 'OK'
      });
      return;
    }

    // Check for duplicate dates
    const dates = validEntries.map(e => e.date);
    const duplicateDates = dates.filter((date, index) => dates.indexOf(date) !== index);
    if (duplicateDates.length > 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Duplicate Dates',
        text: `You have duplicate dates in your entries. Please remove duplicates.`,
        confirmButtonText: 'OK'
      });
      return;
    }

    // Confirm request
    const entriesHtml = validEntries.map((entry, index) => `
      <div class="mb-2 pb-2 border-b">
        <p><strong>Entry ${index + 1}:</strong></p>
        <p><strong>Date:</strong> ${formatDate(entry.date)}</p>
        <p><strong>Punch In:</strong> ${entry.punchInTime}</p>
        <p><strong>Punch Out:</strong> ${entry.punchOutTime || 'Not provided'}</p>
        <p><strong>Timezone:</strong> ${entry.timezone}</p>
      </div>
    `).join('');

    const result = await Swal.fire({
      icon: 'question',
      title: 'Submit Backdated Attendance Request',
      html: `
        <div class="text-left">
          ${entriesHtml}
          ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
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
      // Convert entries to API format
      const attendanceEntriesAPI = validEntries.map(entry => {
        const dateISO = new Date(entry.date).toISOString();
        const punchInISO = new Date(`${entry.date}T${entry.punchInTime}`).toISOString();
        
        // Handle night shifts where punch-out is on the next day
        let punchOutISO = null;
        if (entry.punchOutTime) {
          let punchOutDateTime = new Date(`${entry.date}T${entry.punchOutTime}`);
          const punchInDateTime = new Date(`${entry.date}T${entry.punchInTime}`);
          
          // If punch-out time is earlier than punch-in time, it's a night shift (next day)
          if (punchOutDateTime <= punchInDateTime) {
            punchOutDateTime = new Date(punchOutDateTime);
            punchOutDateTime.setDate(punchOutDateTime.getDate() + 1);
          }
          
          punchOutISO = punchOutDateTime.toISOString();
        }
        
        return {
          date: dateISO,
          punchIn: punchInISO,
          punchOut: punchOutISO,
          timezone: entry.timezone || 'Asia/Kolkata'
        };
      });

      await createBackdatedAttendanceRequest(candidateId, {
        attendanceEntries: attendanceEntriesAPI,
        notes: notes || undefined
      });

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Backdated attendance request submitted successfully for ${validEntries.length} date(s). It will be reviewed by an administrator.`,
        confirmButtonText: 'OK'
      });

      // Reset form
      setAttendanceEntries([{
        date: '',
        punchInTime: '',
        punchOutTime: '',
        timezone: 'Asia/Kolkata'
      }]);
      setNotes('');

      // Refresh requests
      await fetchRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to submit request';
      
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

  // Handle cancel request
  const handleCancelRequest = async (request: BackdatedAttendanceRequest) => {
    // Validate request ID
    const requestId = request._id || (request as any).id;
    if (!requestId) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Invalid request ID. Please refresh the page and try again.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Get entries for display (support both new and legacy format)
    const entries = request.attendanceEntries || (request.date ? [{
      date: request.date,
      punchIn: request.punchIn || '',
      punchOut: request.punchOut,
      timezone: request.timezone
    }] : []);

    const entriesHtml = entries.map((entry: any, index: number) => `
      <p class="mt-2"><strong>Date ${entries.length > 1 ? index + 1 : ''}:</strong> ${formatDate(entry.date)}</p>
    `).join('');

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancel Request',
      html: `
        <div class="text-left">
          <p>Are you sure you want to cancel this backdated attendance request?</p>
          ${entriesHtml}
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
      await cancelBackdatedAttendanceRequest(requestId);

      await Swal.fire({
        icon: 'success',
        title: 'Cancelled',
        text: 'Request cancelled successfully',
        confirmButtonText: 'OK'
      });

      await fetchRequests();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to cancel request';
      
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

  // Download Excel template
  const downloadExcelTemplate = () => {
    const templateData = [
      ['Date (YYYY-MM-DD)', 'Punch In Time (HH:MM)', 'Punch Out Time (HH:MM)', 'Timezone', 'Notes (Optional)'],
      ['2026-01-15', '09:00', '18:00', 'Asia/Kolkata', 'Forgot to punch in'],
      ['2026-01-16', '09:30', '', 'Asia/Kolkata', 'Only punch in']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Backdated Attendance');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Date
      { wch: 18 }, // Punch In Time
      { wch: 19 }, // Punch Out Time
      { wch: 20 }, // Timezone
      { wch: 30 }  // Notes
    ];

    XLSX.writeFile(wb, 'backdated_attendance_template.xlsx');
  };

  // Parse Excel file and convert to attendance entries
  const handleExcelImport = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Please upload an Excel file (.xlsx, .xls).',
        confirmButtonText: 'OK'
      });
      return;
    }

    setUploadingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid File',
          text: 'The Excel file is empty or invalid.',
          confirmButtonText: 'OK'
        });
        return;
      }

      const entries: Array<{
        date: string;
        punchInTime: string;
        punchOutTime: string;
        notes: string;
        timezone: string;
      }> = [];

      const errors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        const rowNum = index + 2; // +2 because Excel rows start at 1 and we have header

        // Get values from various possible column names
        const date = row['Date (YYYY-MM-DD)'] || row['Date'] || row['date'] || row['DATE'];
        const punchInTime = row['Punch In Time (HH:MM)'] || row['Punch In Time'] || row['Punch In'] || row['punchInTime'] || row['PunchInTime'] || row['PUNCH_IN_TIME'];
        const punchOutTime = row['Punch Out Time (HH:MM)'] || row['Punch Out Time'] || row['Punch Out'] || row['punchOutTime'] || row['PunchOutTime'] || row['PUNCH_OUT_TIME'] || '';
        const timezone = row['Timezone'] || row['timezone'] || row['TIMEZONE'] || 'Asia/Kolkata';
        const notes = row['Notes (Optional)'] || row['Notes'] || row['notes'] || row['NOTES'] || '';

        // Validate required fields
        if (!date) {
          errors.push(`Row ${rowNum}: Date is required`);
          return;
        }

        if (!punchInTime) {
          errors.push(`Row ${rowNum}: Punch In Time is required`);
          return;
        }

        // Format date (handle various formats)
        let formattedDate = '';
        try {
          // If date is a number, it's likely an Excel serial date
          if (typeof date === 'number') {
            // Excel date serial number (days since 1900-01-01)
            const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
            const excelDate = new Date(excelEpoch.getTime() + date * 86400000);
            formattedDate = excelDate.toISOString().split('T')[0];
          } else if (typeof date === 'string') {
            // Try to parse string date
            // Handle YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              formattedDate = date;
            } else {
              // Try parsing as date string
              const dateObj = new Date(date);
              if (isNaN(dateObj.getTime())) {
                errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
                return;
              }
              formattedDate = dateObj.toISOString().split('T')[0];
            }
          } else {
            errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
            return;
          }

          // Check if date is in the past
          const selectedDate = new Date(formattedDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          selectedDate.setHours(0, 0, 0, 0);
          
          if (selectedDate >= today) {
            errors.push(`Row ${rowNum}: Date must be in the past - ${formattedDate}`);
            return;
          }
        } catch (e) {
          errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
          return;
        }

        // Format time (handle various formats)
        let formattedPunchIn = '';
        let formattedPunchOut = '';

        try {
          // Handle time as string (HH:MM or HH:MM:SS)
          if (typeof punchInTime === 'string') {
            const timeParts = punchInTime.split(':');
            if (timeParts.length >= 2) {
              formattedPunchIn = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
            } else {
              errors.push(`Row ${rowNum}: Invalid punch-in time format - ${punchInTime}`);
              return;
            }
          } else if (typeof punchInTime === 'number') {
            // Excel time format (decimal fraction of a day)
            const hours = Math.floor(punchInTime * 24);
            const minutes = Math.floor((punchInTime * 24 - hours) * 60);
            formattedPunchIn = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } else {
            errors.push(`Row ${rowNum}: Invalid punch-in time format - ${punchInTime}`);
            return;
          }

          // Format punch out time if provided
          if (punchOutTime) {
            if (typeof punchOutTime === 'string') {
              const timeParts = punchOutTime.split(':');
              if (timeParts.length >= 2) {
                formattedPunchOut = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
              } else {
                errors.push(`Row ${rowNum}: Invalid punch-out time format - ${punchOutTime}`);
                return;
              }
            } else if (typeof punchOutTime === 'number') {
              // Excel time format
              const hours = Math.floor(punchOutTime * 24);
              const minutes = Math.floor((punchOutTime * 24 - hours) * 60);
              formattedPunchOut = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
              errors.push(`Row ${rowNum}: Invalid punch-out time format - ${punchOutTime}`);
              return;
            }

            // Validate punch out is after punch in (handle night shifts)
            const punchInDate = new Date(`${formattedDate}T${formattedPunchIn}`);
            let punchOutDate = new Date(`${formattedDate}T${formattedPunchOut}`);
            
            // If punch-out time is earlier than punch-in time, it's likely a night shift (next day)
            if (punchOutDate <= punchInDate) {
              // Add one day to punch-out for night shift scenario
              punchOutDate = new Date(punchOutDate);
              punchOutDate.setDate(punchOutDate.getDate() + 1);
            }
            
            // Final validation: punch-out must be after punch-in
            if (punchOutDate <= punchInDate) {
              errors.push(`Row ${rowNum}: Punch out time must be after punch in time`);
              return;
            }
          }
        } catch (e) {
          errors.push(`Row ${rowNum}: Error processing time - ${e}`);
          return;
        }

        entries.push({
          date: formattedDate,
          punchInTime: formattedPunchIn,
          punchOutTime: formattedPunchOut,
          notes: notes || '',
          timezone: timezone || 'Asia/Kolkata'
        });
      });

      if (errors.length > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Errors Found',
          html: `Found ${errors.length} validation error(s):<br><br>${errors.slice(0, 10).join('<br>')}${errors.length > 10 ? '<br>... and more' : ''}`,
          confirmButtonText: 'OK'
        });
      }

      if (entries.length === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'No Valid Entries',
          text: 'No valid entries found in the Excel file.',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Confirm before submitting
      const result = await Swal.fire({
        icon: 'question',
        title: 'Confirm Import',
        html: `Found ${entries.length} valid entry/entries. Do you want to submit all requests?`,
        showCancelButton: true,
        confirmButtonText: 'Yes, submit all',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) return;

      // Submit all entries as a single request
      try {
        // Convert entries to API format
        const attendanceEntriesAPI = entries.map(entry => {
          const dateISO = new Date(entry.date).toISOString();
          const punchInISO = new Date(`${entry.date}T${entry.punchInTime}`).toISOString();
          const punchOutISO = entry.punchOutTime ? new Date(`${entry.date}T${entry.punchOutTime}`).toISOString() : null;
          
          return {
            date: dateISO,
            punchIn: punchInISO,
            punchOut: punchOutISO,
            timezone: entry.timezone || 'Asia/Kolkata'
          };
        });

        await createBackdatedAttendanceRequest(candidateId, {
          attendanceEntries: attendanceEntriesAPI,
          notes: `Imported from Excel - ${entries.length} date(s)`
        });

        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Successfully submitted backdated attendance request with ${entries.length} date(s).`,
          confirmButtonText: 'OK'
        });
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Unknown error';
        await Swal.fire({
          icon: 'error',
          title: 'Import Failed',
          text: errorMsg,
          confirmButtonText: 'OK'
        });
      }

      // Refresh requests list
      await fetchRequests();

      // Clear file input
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
      setShowExcelUpload(false);
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Import Error',
        text: error?.message || 'Failed to import Excel file. Please check the file format.',
        confirmButtonText: 'OK'
      });
    } finally {
      setUploadingExcel(false);
    }
  };

  if (loading) {
    return (
      <>
        <Seo title="Backdated Attendance" />
        <Pageheader currentpage="Backdated Attendance" activepage="Attendance" mainpage="Backdated Attendance" />
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
        <Seo title="Backdated Attendance" />
        <Pageheader currentpage="Backdated Attendance" activepage="Attendance" mainpage="Backdated Attendance" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h3>
              <p className="text-gray-600">
                Please ensure your profile is set up correctly to request backdated attendance.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Backdated Attendance" />
      <Pageheader currentpage="Backdated Attendance" activepage="Attendance" mainpage="Backdated Attendance" />
      <div className="space-y-6 mt-3">
        {/* Request Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Request Backdated Attendance</h2>
            <button
              onClick={() => setShowExcelUpload(!showExcelUpload)}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              title="Toggle Excel upload"
            >
              <i className="ri-file-excel-2-line me-1"></i>
              {showExcelUpload ? 'Hide Excel Upload' : 'Upload via Excel'}
            </button>
          </div>

          {showExcelUpload && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-gray-900">
                  <i className="ri-file-excel-2-line text-green-600 me-2"></i>
                  Import from Excel
                </h3>
                <button
                  onClick={downloadExcelTemplate}
                  className="px-3 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                >
                  <i className="ri-download-line me-1"></i>
                  Download Template
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="file"
                  ref={excelFileInputRef}
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleExcelImport(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  onClick={() => excelFileInputRef.current?.click()}
                  disabled={uploadingExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingExcel ? (
                    <>
                      <i className="ri-loader-4-line animate-spin me-1"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ri-upload-line me-1"></i>
                      Choose Excel File
                    </>
                  )}
                </button>
                <p className="text-sm text-gray-600">
                  Upload an Excel file with multiple attendance entries
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Multiple Entries */}
            {attendanceEntries.map((entry, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Entry {index + 1}
                  </h3>
                  {attendanceEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Remove entry"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  )}
                </div>

                {/* Date and Timezone Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(index, 'date', e.target.value)}
                      max={new Date().toISOString().split('T')[0]} // Only allow past dates
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Only past dates are allowed</p>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={entry.timezone}
                      onChange={(e) => updateEntry(index, 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>

                {/* Punch In and Punch Out Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Punch In Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Punch In Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={entry.punchInTime}
                      onChange={(e) => updateEntry(index, 'punchInTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Punch Out Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Punch Out Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={entry.punchOutTime}
                      onChange={(e) => updateEntry(index, 'punchOutTime', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty if you only want to record punch in</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Entry Button */}
            <button
              type="button"
              onClick={addEntry}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary transition-colors"
            >
              <i className="ri-add-line me-1"></i>
              Add Another Date
            </button>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter reason for backdated attendance (e.g., forgot to punch in)"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={1000}
              />
              <p className="mt-1 text-xs text-gray-500">
                {notes.length}/1000 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreateRequest}
                disabled={submitting || attendanceEntries.every(e => !e.date || !e.punchInTime)}
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
                    Submit Request
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setAttendanceEntries([{
                    date: '',
                    punchInTime: '',
                    punchOutTime: '',
                    timezone: 'Asia/Kolkata'
                  }]);
                  setNotes('');
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Requests</h2>
            
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
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-inbox-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No requests found</p>
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
              {requests.map((request) => {
                const statusBadge = getStatusBadge(request.status);
                // Support both new format (attendanceEntries) and legacy format (single date)
                const entries = request.attendanceEntries || (request.date ? [{
                  date: request.date,
                  punchIn: request.punchIn || '',
                  punchOut: request.punchOut,
                  timezone: request.timezone
                }] : []);
                
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
                          {entries.length > 1 && (
                            <span className="text-xs text-gray-500">
                              ({entries.length} dates)
                            </span>
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
                                  {entry.punchOut && (
                                    <p className="text-sm text-gray-600 mb-1">
                                      <strong>Punch Out:</strong> {formatDateTime(entry.punchOut)}
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

                        {/* Notes and Admin Comment */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
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
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          Requested on {formatDateTime(request.createdAt)}
                          {request.reviewedAt && (
                            <> • Reviewed on {formatDateTime(request.reviewedAt)}</>
                          )}
                        </p>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request)}
                            disabled={cancellingId === (request._id || (request as any).id)}
                            className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                            title="Cancel request"
                          >
                            {cancellingId === (request._id || (request as any).id) ? (
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

        {/* Help Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            <i className="ri-information-line me-2 text-primary"></i>
            About Backdated Attendance Requests
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Request backdated attendance for past dates when you forgot to punch in/out.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Requests require admin approval before attendance is recorded.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>You can only request attendance for dates in the past.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>Punch out time is optional - you can request only punch in if needed.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>You can cancel pending requests. Once approved or rejected, requests cannot be cancelled.</span>
            </li>
            <li className="flex items-start">
              <i className="ri-checkbox-circle-line text-primary me-2 mt-0.5"></i>
              <span>When approved, attendance is automatically recorded in your attendance calendar.</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default BackdatedAttendancePage;
