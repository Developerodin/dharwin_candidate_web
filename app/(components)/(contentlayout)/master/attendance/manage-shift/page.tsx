'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllShifts, createShift, updateShift, deleteShift } from '@/shared/lib/shifts';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';

type Shift = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  timezone: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const ManageShiftsPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timezone: 'UTC',
    startTime: '',
    endTime: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Filter state
  const [searchName, setSearchName] = useState<string>('');
  const [filterTimezone, setFilterTimezone] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name:asc');

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
          // Normalize to (GMT±HH:MM) format
          let offsetStr = offsetPart.value;
          // Remove existing parentheses if any
          offsetStr = offsetStr.replace(/[()]/g, '');
          // Ensure it starts with GMT
          if (!offsetStr.startsWith('GMT')) {
            offsetStr = 'GMT' + offsetStr;
          }
          // Parse and reformat to ensure (GMT±HH:MM) format
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
      
      // Method 2: Calculate offset by getting the difference between UTC and timezone
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
      
      // Also get the date to handle day boundaries
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
      
      // Calculate offset in minutes
      let offsetMinutes = (tzH * 60 + tzM) - (utcH * 60 + utcM);
      
      // Adjust for date difference if timezone is on a different day
      if (tzDay !== utcDay) {
        const dayDiff = tzDay - utcDay;
        // Normalize day difference to -1, 0, or 1 (accounting for month boundaries)
        if (dayDiff > 15) {
          // Likely previous month
          offsetMinutes -= 1440;
        } else if (dayDiff < -15) {
          // Likely next month
          offsetMinutes += 1440;
        } else if (dayDiff > 0) {
          // Next day
          offsetMinutes += 1440;
        } else {
          // Previous day
          offsetMinutes -= 1440;
        }
      }
      
      // Format the offset in (GMT±HH:MM) format matching the reference
      const hours = Math.floor(Math.abs(offsetMinutes) / 60);
      const minutes = Math.abs(offsetMinutes) % 60;
      const sign = offsetMinutes >= 0 ? '+' : '-';
      
      // Always format as (GMT±HH:MM) with leading zeros
      const hoursStr = hours.toString().padStart(2, '0');
      const minutesStr = minutes.toString().padStart(2, '0');
      return `(GMT${sign}${hoursStr}:${minutesStr})`;
    } catch (error) {
      console.error('Error calculating GMT offset:', error);
      return '(GMT+00:00)';
    }
  };

  // Timezone options with GMT offsets (same format as profile page)
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

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        sortBy: sortBy,
        limit: 1000,
      };
      
      if (searchName) params.name = searchName;
      if (filterTimezone) params.timezone = filterTimezone;
      if (filterStatus !== 'all') params.isActive = filterStatus === 'active';

      const response = await getAllShifts(params);
      const shiftsList = response?.data?.results || (Array.isArray(response?.data) ? response.data : []);
      setShifts(shiftsList);
    } catch (err: any) {
      console.error('Failed to fetch shifts:', err);
      setError(err?.message || 'Failed to fetch shifts');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, searchName, filterTimezone, filterStatus, sortBy]);

  // Load shifts on mount and when filters change
  useEffect(() => {
    if (isAdmin) {
      fetchShifts();
    }
  }, [isAdmin, fetchShifts]);

  // Validate time format (HH:mm)
  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Shift name is required',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!formData.startTime || !validateTimeFormat(formData.startTime)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Start time must be in HH:mm format (24-hour, e.g., "10:00", "18:00")',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!formData.endTime || !validateTimeFormat(formData.endTime)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'End time must be in HH:mm format (24-hour, e.g., "10:00", "18:00")',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (formData.startTime === formData.endTime) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'End time cannot be the same as start time',
        confirmButtonText: 'OK'
      });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingShift) {
        // Update existing shift
        const shiftId = editingShift._id || editingShift.id || '';
        await updateShift(shiftId, formData);
        
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Shift updated successfully',
          confirmButtonText: 'OK'
        });
      } else {
        // Create new shift
        await createShift(formData);
        
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Shift created successfully',
          confirmButtonText: 'OK'
        });
      }

      // Reset form and refresh list
      resetForm();
      await fetchShifts();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save shift';
      setError(errorMessage);
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

  // Handle edit
  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name || '',
      description: shift.description || '',
      timezone: shift.timezone || 'UTC',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      isActive: shift.isActive !== undefined ? shift.isActive : true,
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (shift: Shift) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Shift',
      text: `Are you sure you want to delete "${shift.name}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      const shiftId = shift._id || shift.id || '';
      await deleteShift(shiftId);
      
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Shift deleted successfully',
        confirmButtonText: 'OK'
      });

      await fetchShifts();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete shift';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  // Handle toggle active status
  const handleToggleActive = async (shift: Shift) => {
    try {
      const shiftId = shift._id || shift.id || '';
      await updateShift(shiftId, { isActive: !shift.isActive });
      
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Shift ${!shift.isActive ? 'activated' : 'deactivated'} successfully`,
        timer: 1500,
        showConfirmButton: false
      });

      await fetchShifts();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update shift';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      timezone: 'UTC',
      startTime: '',
      endTime: '',
      isActive: true,
    });
    setEditingShift(null);
    setShowForm(false);
  };

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

  // Check if shift is overnight
  const isOvernightShift = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes < startMinutes;
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Manage Shifts" />
        <Pageheader currentpage="Manage Shifts" activepage="Master" mainpage="Manage Shifts" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can manage shifts.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Manage Shifts" />
      <Pageheader currentpage="Manage Shifts" activepage="Master" mainpage="Manage Shifts" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Manage Shifts</h2>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <i className="ri-add-line me-1.5"></i>
              Add New Shift
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Create/Edit Form */}
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingShift ? 'Edit Shift' : 'Create New Shift'}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-xl"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shift Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Morning Shift, Day Shift"
                      required
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="HH:mm (e.g., 10:00, 22:00)"
                      pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">24-hour format (HH:mm)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="HH:mm (e.g., 18:00, 06:00)"
                      pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">24-hour format (HH:mm). Can be next day for overnight shifts</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Shift description..."
                      rows={3}
                      maxLength={1000}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin me-1"></i>
                        {editingShift ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <i className={editingShift ? 'ri-save-line me-1' : 'ri-add-line me-1'}></i>
                        {editingShift ? 'Update Shift' : 'Create Shift'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Name
                </label>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter shift name..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Timezone
                </label>
                <select
                  value={filterTimezone}
                  onChange={(e) => setFilterTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Timezones</option>
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="name:asc">Name (A-Z)</option>
                  <option value="name:desc">Name (Z-A)</option>
                  <option value="createdAt:desc">Newest First</option>
                  <option value="createdAt:asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shifts List */}
          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600">Loading shifts...</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <i className="ri-time-line text-4xl text-gray-400 mb-3"></i>
              <p className="text-gray-600">No shifts found. Create your first shift to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timezone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shifts.map((shift) => {
                    const shiftId = shift._id || shift.id || '';
                    const overnight = isOvernightShift(shift.startTime, shift.endTime);
                    
                    return (
                      <tr key={shiftId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{shift.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {shift.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {timezones.find(tz => tz.value === shift.timezone)?.label || `${getGMTOffset(shift.timezone)} ${shift.timezone}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{formatTime(shift.startTime)}</span>
                              <i className="ri-arrow-right-line text-gray-400"></i>
                              <span>{formatTime(shift.endTime)}</span>
                              {overnight && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                  Overnight
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ({shift.startTime} - {shift.endTime})
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shift.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {shift.isActive ? (
                              <>
                                <i className="ri-checkbox-circle-line me-1"></i>
                                Active
                              </>
                            ) : (
                              <>
                                <i className="ri-close-circle-line me-1"></i>
                                Inactive
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={shift.isActive}
                                onChange={() => handleToggleActive(shift)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                            <button
                              onClick={() => handleEdit(shift)}
                              className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                              title="Edit"
                            >
                              <i className="ri-pencil-line"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(shift)}
                              className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {shifts.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {shifts.length} shift(s)
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ManageShiftsPage;

