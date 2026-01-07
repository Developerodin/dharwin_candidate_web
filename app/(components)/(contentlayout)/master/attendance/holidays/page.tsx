'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllHolidays, createHoliday, updateHoliday, deleteHoliday } from '@/shared/lib/holidays';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';

type Holiday = {
  _id?: string;
  id?: string;
  title: string;
  date: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const HolidaysPage = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    isActive: boolean;
  }>({
    title: '',
    date: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Filter state
  const [titleFilter, setTitleFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState<string>('date:asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const limit = 10;

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

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        limit: limit,
        sortBy: sortBy
      };

      if (titleFilter.trim()) {
        params.title = titleFilter.trim();
      }
      if (startDateFilter) {
        params.startDate = startDateFilter;
      }
      if (endDateFilter) {
        params.endDate = endDateFilter;
      }
      if (activeFilter !== 'all') {
        params.isActive = activeFilter === 'active';
      }

      const response = await getAllHolidays(params);
      
      if (response?.data?.results) {
        setHolidays(response.data.results);
        setTotalPages(response.data.totalPages || 1);
        setTotalResults(response.data.totalResults || 0);
      } else if (Array.isArray(response?.data)) {
        setHolidays(response.data);
        setTotalPages(1);
        setTotalResults(response.data.length);
      } else {
        setHolidays([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch holidays');
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to fetch holidays',
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, titleFilter, startDateFilter, endDateFilter, activeFilter]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      isActive: true
    });
    setEditingHoliday(null);
    setShowForm(false);
  };

  // Open create form
  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      title: holiday.title,
      date: holiday.date.split('T')[0], // Convert ISO date to YYYY-MM-DD format
      isActive: holiday.isActive
    });
    setShowForm(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Holiday title is required',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!formData.date) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Holiday date is required',
        confirmButtonText: 'OK'
      });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const holidayData = {
        title: formData.title.trim(),
        date: new Date(formData.date).toISOString(),
        isActive: formData.isActive
      };

      if (editingHoliday) {
        // Update existing holiday
        const holidayId = editingHoliday._id || editingHoliday.id;
        await updateHoliday(holidayId!, holidayData);
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Holiday updated successfully',
          confirmButtonText: 'OK'
        });
      } else {
        // Create new holiday
        await createHoliday(holidayData);
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Holiday created successfully',
          confirmButtonText: 'OK'
        });
      }

      resetForm();
      await fetchHolidays();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save holiday';
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

  // Handle delete
  const handleDelete = async (holiday: Holiday) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Holiday',
      text: `Are you sure you want to delete "${holiday.title}"?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626'
    });

    if (!result.isConfirmed) return;

    try {
      const holidayId = holiday._id || holiday.id;
      await deleteHoliday(holidayId!);
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Holiday deleted successfully',
        confirmButtonText: 'OK'
      });
      await fetchHolidays();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || err?.message || 'Failed to delete holiday',
        confirmButtonText: 'OK'
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setTitleFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setActiveFilter('all');
    setSortBy('date:asc');
    setCurrentPage(1);
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

  if (!isAdmin) {
    return (
      <>
        <Seo title="Holidays Management" />
        <Pageheader currentpage="Holidays Management" activepage="Master" mainpage="Holidays Management" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can manage holidays.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Holidays Management" />
      <Pageheader currentpage="Holidays Management" activepage="Master" mainpage="Holidays Management" />
      <div className="space-y-6 mt-3">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Manage Holidays</h2>
            <button
              onClick={openCreateForm}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Add Holiday
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Title
                </label>
                <input
                  type="text"
                  value={titleFilter}
                  onChange={(e) => {
                    setTitleFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Enter holiday title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="date:asc">Date (Oldest First)</option>
                  <option value="date:desc">Date (Newest First)</option>
                  <option value="title:asc">Title (A-Z)</option>
                  <option value="title:desc">Title (Z-A)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Create/Edit Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editingHoliday ? 'Edit Holiday' : 'Create New Holiday'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="ri-close-line text-xl"></i>
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Holiday Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., New Year's Day"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        required
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
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                          submitting
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <i className="ri-loader-4-line animate-spin inline-block mr-2"></i>
                            {editingHoliday ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line inline-block mr-2"></i>
                            {editingHoliday ? 'Update Holiday' : 'Create Holiday'}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Holidays List */}
          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600">Loading holidays...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-calendar-line text-5xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Holidays Found</h3>
              <p className="text-gray-600 mb-4">
                {titleFilter || startDateFilter || endDateFilter || activeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by creating your first holiday'}
              </p>
              {!titleFilter && !startDateFilter && !endDateFilter && activeFilter === 'all' && (
                <button
                  onClick={openCreateForm}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add Holiday
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {holidays.length} of {totalResults} holiday(s)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holidays.map((holiday) => {
                      const holidayId = holiday._id || holiday.id;
                      return (
                        <tr key={holidayId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {holiday.title}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">
                              {formatDate(holiday.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                holiday.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {holiday.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditForm(holiday)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <i className="ri-edit-line text-lg"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(holiday)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <i className="ri-delete-bin-line text-lg"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default HolidaysPage;

