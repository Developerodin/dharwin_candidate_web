'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  getAllCandidateGroups, 
  createCandidateGroup, 
  updateCandidateGroup, 
  deleteCandidateGroup,
  addCandidatesToGroup,
  removeCandidatesFromGroup,
  getCandidateGroupById
} from '@/shared/lib/candidate-groups';
import { fetchAllCandidates } from '@/shared/lib/candidates';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const Select = dynamic(() => import("react-select"), { ssr: false });

type CandidateGroup = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  candidates?: any[];
  isActive?: boolean;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
};

type Candidate = {
  _id?: string;
  id?: string;
  fullName?: string;
  email?: string;
  employeeId?: string;
};

const CandidateGroupsPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [groups, setGroups] = useState<CandidateGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<CandidateGroup | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    candidateIds: string[];
  }>({
    name: '',
    description: '',
    candidateIds: []
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // Candidates for selection
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(false);
  const [selectedCandidates, setSelectedCandidates] = useState<any[]>([]);
  
  const SELECT_ALL_CANDIDATES_VALUE = "__all_candidates__";
  
  // Filter state
  const [nameFilter, setNameFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState<string>('name:asc');
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

  // Fetch all candidates for selection
  const fetchAllCandidatesList = useCallback(async () => {
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
        value: candidate._id || candidate.id || '',
        label: `${candidate.fullName || 'Unknown'} (${candidate.email || 'No email'})`,
        candidate: candidate
      })).filter((option: any) => option.value);

      setAllCandidates(candidateOptions);
    } catch (err: any) {
      console.error('Failed to fetch candidates:', err);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  const candidateOptionsWithSelectAll = allCandidates.length
    ? [
        {
          value: SELECT_ALL_CANDIDATES_VALUE,
          label: "Select All Candidates",
        },
        ...allCandidates,
      ]
    : allCandidates;

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage,
        limit: limit,
        sortBy: sortBy
      };

      if (nameFilter.trim()) {
        params.name = nameFilter.trim();
      }
      if (activeFilter !== 'all') {
        params.isActive = activeFilter === 'active';
      }

      const response = await getAllCandidateGroups(params);
      
      if (response?.data?.results) {
        setGroups(response.data.results);
        setTotalPages(response.data.totalPages || 1);
        setTotalResults(response.data.totalResults || 0);
      } else if (Array.isArray(response?.data)) {
        setGroups(response.data);
        setTotalPages(1);
        setTotalResults(response.data.length);
      } else {
        setGroups([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch candidate groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, nameFilter, activeFilter]);

  // Load data on mount
  useEffect(() => {
    if (isAdmin) {
      fetchGroups();
      fetchAllCandidatesList();
    }
  }, [isAdmin, fetchGroups, fetchAllCandidatesList]);

  // Reload when filters change
  useEffect(() => {
    if (isAdmin) {
      setCurrentPage(1);
      fetchGroups();
    }
  }, [nameFilter, activeFilter, sortBy, isAdmin]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      await Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Group name is required',
        confirmButtonText: 'OK'
      });
      return;
    }

    setSubmitting(true);
    try {
      const candidateIds = selectedCandidates.map((c: any) => c.value);
      
      if (editingGroup) {
        // Update existing group
        await updateCandidateGroup(editingGroup._id || editingGroup.id || '', {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          candidateIds: candidateIds
        });
        
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Candidate group updated successfully',
          confirmButtonText: 'OK',
          timer: 2000,
          timerProgressBar: true
        });
      } else {
        // Create new group
        await createCandidateGroup({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          candidateIds: candidateIds
        });
        
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Candidate group created successfully',
          confirmButtonText: 'OK',
          timer: 2000,
          timerProgressBar: true
        });
      }
      
      // Reset form and reload
      setShowForm(false);
      setEditingGroup(null);
      setFormData({ name: '', description: '', candidateIds: [] });
      setSelectedCandidates([]);
      fetchGroups();
    } catch (err: any) {
      console.error('Error saving group:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save candidate group';
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
  const handleEdit = async (group: CandidateGroup) => {
    try {
      // Fetch full group details
      const response = await getCandidateGroupById(group._id || group.id || '');
      const fullGroup = response?.data || response;
      
      setEditingGroup(fullGroup);
      setFormData({
        name: fullGroup.name || '',
        description: fullGroup.description || '',
        candidateIds: []
      });
      
      // Set selected candidates
      if (fullGroup.candidates && Array.isArray(fullGroup.candidates)) {
        const candidateOptions = fullGroup.candidates
          .map((candidate: any) => {
            const id = candidate._id || candidate.id || '';
            if (!id) return null;
            return {
              value: id,
              label: `${candidate.fullName || 'Unknown'} (${candidate.email || 'No email'})`,
              candidate: candidate
            };
          })
          .filter((opt: any) => opt !== null);
        setSelectedCandidates(candidateOptions);
      } else {
        setSelectedCandidates([]);
      }
      
      setShowForm(true);
    } catch (err: any) {
      console.error('Error fetching group details:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load group details',
        confirmButtonText: 'OK'
      });
    }
  };

  // Handle delete
  const handleDelete = async (group: CandidateGroup) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: `Do you want to delete the group "${group.name}"? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6'
    });

    if (result.isConfirmed) {
      try {
        await deleteCandidateGroup(group._id || group.id || '');
        await Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Candidate group deleted successfully',
          confirmButtonText: 'OK',
          timer: 2000,
          timerProgressBar: true
        });
        fetchGroups();
      } catch (err: any) {
        console.error('Error deleting group:', err);
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete candidate group';
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
      }
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Seo title="Candidate Groups" />
        <Pageheader currentpage="Candidate Groups" activepage="Master" mainpage="Candidate Groups" />
        <div className="space-y-6 mt-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center py-12">
              <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">
                Only administrators can manage candidate groups.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Candidate Groups" />
      <Pageheader currentpage="Candidate Groups" activepage="Master" mainpage="Candidate Groups" />
      <div className="space-y-6 mt-3">
        {/* Header with Create Button */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Candidate Groups</h2>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingGroup(null);
                setFormData({ name: '', description: '', candidateIds: [] });
                setSelectedCandidates([]);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <i className="ri-add-line"></i>
              Create Group
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search by Name</label>
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                placeholder="Search groups..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="name:asc">Name (A-Z)</option>
                <option value="name:desc">Name (Z-A)</option>
                <option value="createdAt:desc">Newest First</option>
                <option value="createdAt:asc">Oldest First</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Groups Table */}
          {loading ? (
            <div className="text-center py-12">
              <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
              <p className="text-gray-600">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <i className="ri-group-line text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-600">No candidate groups found</p>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingGroup(null);
                  setFormData({ name: '', description: '', candidateIds: [] });
                  setSelectedCandidates([]);
                }}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Your First Group
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups.map((group) => (
                    <tr key={group._id || group.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {group.description || '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {group.candidates?.length || 0} member(s)
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          group.isActive !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {group.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(group.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(group)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <i className="ri-pencil-line text-lg"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(group)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} ({totalResults} total groups)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingGroup ? 'Edit Candidate Group' : 'Create Candidate Group'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingGroup(null);
                      setFormData({ name: '', description: '', candidateIds: [] });
                      setSelectedCandidates([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="ri-close-line text-2xl"></i>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., US Team, India Team"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of the group"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Candidates
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
                          if (selectedCandidates.length === allCandidates.length) {
                            setSelectedCandidates([]);
                          } else {
                            setSelectedCandidates(allCandidates);
                          }
                        } else {
                          setSelectedCandidates(selected);
                        }
                      }}
                      placeholder="Select candidates for this group..."
                      closeMenuOnSelect={false}
                      hideSelectedOptions={false}
                      formatOptionLabel={(option: any, { context }: any) => {
                        if (context === "menu") {
                          const isAllOption = option.value === SELECT_ALL_CANDIDATES_VALUE;
                          const isAllSelected =
                            isAllOption &&
                            allCandidates.length > 0 &&
                            selectedCandidates.length === allCandidates.length;

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

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`flex-1 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      submitting
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        {editingGroup ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <i className={editingGroup ? 'ri-save-line' : 'ri-add-line'}></i>
                        {editingGroup ? 'Update Group' : 'Create Group'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingGroup(null);
                      setFormData({ name: '', description: '', candidateIds: [] });
                      setSelectedCandidates([]);
                    }}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CandidateGroupsPage;
