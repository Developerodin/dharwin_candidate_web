"use client";

import React, { Fragment, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import { fetchAllAdminUsers, fetchAdminUserById, deleteAdminUser, toggleUserActiveStatus } from '@/shared/lib/admin-users';
import Swal from 'sweetalert2';

interface NavigationPermissions {
  [key: string]: boolean | NavigationPermissions;
}

interface AdminUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  subRole?: string;
  phoneNumber?: string;
  countryCode?: string;
  isActive?: boolean;
  navigation?: NavigationPermissions;
  createdAt?: string;
  updatedAt?: string;
}


const RolesPermissions = () => {
  const router = useRouter();
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  
  // Search and pagination
  const [searchFilter, setSearchFilter] = useState<string>('name');
  const [searchValue, setSearchValue] = useState<string>('');
  const [subRoleFilter, setSubRoleFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>('createdAt:desc');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Build filter parameters
  const buildFilterParams = () => {
    const params: any = {
      page: currentPage,
      limit: limit,
      sortBy: sortBy,
    };

    if (searchValue.trim()) {
      if (searchFilter === 'name') {
        params.name = searchValue.trim();
      } else if (searchFilter === 'email') {
        params.email = searchValue.trim();
      } else if (searchFilter === 'subRole') {
        params.subRole = searchValue.trim();
      }
    }

    // Sub Role filter takes precedence over search filter if both are set
    if (subRoleFilter.trim()) {
      params.subRole = subRoleFilter.trim();
    }

    return params;
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortField === field && sortOrder === 'asc') {
      newOrder = 'desc';
    }
    setSortField(field);
    setSortOrder(newOrder);
    setSortBy(`${field}:${newOrder}`);
    setCurrentPage(1);
  };

  // Get unique sub roles for filter dropdown
  const getUniqueSubRoles = (): string[] => {
    if (!adminUsers || adminUsers.length === 0) return [];
    const subRoles = adminUsers
      .map(user => user.subRole)
      .filter((role): role is string => !!role && role.trim() !== '')
      .filter((role, index, self) => self.indexOf(role) === index)
      .sort();
    return subRoles;
  };

  // Fetch admin users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const data = await fetchAllAdminUsers(params);
      
      if (data && data.results) {
        setAdminUsers(data.results);
        setTotalPages(data.totalPages || 1);
        setTotalResults(data.totalResults || 0);
      } else if (Array.isArray(data)) {
        setAdminUsers(data);
        setTotalPages(1);
        setTotalResults(data.length);
      } else {
        setAdminUsers([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to fetch admin users");
      setAdminUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [currentPage, limit, sortBy, searchValue, searchFilter, subRoleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, searchFilter, subRoleFilter]);


  // View user details
  const handleViewUser = async (user: AdminUser) => {
    try {
      const userId = user.id || user._id;
      if (!userId) return;

      const fullData = await fetchAdminUserById(String(userId));
      setSelectedUser(fullData);
      setShowUserModal(true);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.message || 'Failed to fetch user details',
        confirmButtonText: 'OK'
      });
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user: AdminUser) => {
    const userId = user.id || user._id;
    if (!userId) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete user "${user.name}" (${user.email})? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await deleteAdminUser(String(userId));
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'User has been deleted successfully.',
          confirmButtonText: 'OK'
        });
        // Refresh the user list
        fetchUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.response?.data?.message || 'Failed to delete user',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  // Handle toggle active/inactive status
  const handleToggleActiveStatus = async (user: AdminUser) => {
    const userId = user.id || user._id;
    if (!userId) return;

    const currentStatus = user.isActive !== undefined ? user.isActive : true;
    const newStatus = !currentStatus;
    const action = newStatus ? 'activate' : 'deactivate';
    const actionText = newStatus ? 'activate' : 'deactivate';

    const result = await Swal.fire({
      title: `Are you sure?`,
      text: `Do you want to ${actionText} user "${user.name}" (${user.email})? ${newStatus ? 'The user will be able to log in.' : 'The user will not be able to log in.'}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText} it!`,
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await toggleUserActiveStatus(String(userId), newStatus);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `User has been ${actionText}d successfully.`,
          confirmButtonText: 'OK'
        });
        // Refresh the user list
        fetchUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.response?.data?.message || `Failed to ${actionText} user`,
          confirmButtonText: 'OK'
        });
      }
    }
  };

  // Render navigation structure as JSON (for display)
  const renderNavigationJSON = (nav: NavigationPermissions, indent: number = 0): JSX.Element => {
    const indentStyle = { paddingLeft: `${indent * 20}px` };
    return (
      <div className="font-mono text-xs">
        {Object.keys(nav).map(key => {
          const value = nav[key];
          if (typeof value === 'object' && value !== null) {
            return (
              <div key={key} style={indentStyle}>
                <span className="text-blue-600">"{key}"</span>: {'{'}
                {renderNavigationJSON(value as NavigationPermissions, indent + 1)}
                {'}'}
              </div>
            );
          } else {
            return (
              <div key={key} style={indentStyle}>
                <span className="text-blue-600">"{key}"</span>: <span className={value ? 'text-green-600' : 'text-red-600'}>{String(value)}</span>
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Fragment>
      <Seo title="Manage Roles & Permissions" />
      <Pageheader 
        currentpage="Manage Roles & Permissions" 
        activepage="Settings" 
        mainpage="Manage Roles & Permissions" 
      />
      
      <div className="grid grid-cols-12 gap-x-6 mt-5">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header justify-between flex-wrap">
              <div className="box-title">
                Admin Users {totalResults > 0 && <span className="text-sm font-normal text-gray-500">({totalResults} users)</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="me-1">
                  <select 
                    className="ti-form-control form-control-sm w-full me-2 !bg-primary !text-white" 
                    value={searchFilter}
                    onChange={(e) => {
                      setSearchFilter(e.target.value);
                      setSearchValue('');
                      setCurrentPage(1);
                    }}
                  >
                    <option value="name">Search by Name</option>
                    <option value="email">Search by Email</option>
                    <option value="subRole">Search by Sub Role</option>
                  </select>
                </div>
                <div className="me-3">
                  <input 
                    className="ti-form-control form-control-sm" 
                    type="text" 
                    placeholder={`Search ${searchFilter === 'name' ? 'name' : searchFilter === 'email' ? 'email' : 'sub role'} here`}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    aria-label="Search input"
                  />
                </div>
                {getUniqueSubRoles().length > 0 && (
                  <div className="me-2">
                    <select
                      className="ti-form-control form-control-sm w-full me-2"
                      value={subRoleFilter}
                      onChange={(e) => {
                        setSubRoleFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="">All Sub Roles</option>
                      {getUniqueSubRoles().map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(searchValue || subRoleFilter) && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setSearchValue('');
                      setSubRoleFilter('');
                      setCurrentPage(1);
                    }}
                    className="ti-btn ti-btn-light !bg-light !text-defaulttextcolor !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium me-2"
                  >
                    <i className="ri-filter-off-line"></i> Clear Filters
                  </button>
                )}
                <button type="button" className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium">
                  <i className="ri-add-line font-semibold align-middle"></i> <Link href="/rbac/roles-permissions/add">Add Admin User</Link>
                </button>
              </div>
            </div>
              
            <div className="box-body">
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500">Loading admin users...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <i className="ri-error-warning-line text-4xl text-danger mb-2"></i>
                  <p className="text-danger font-medium mb-2">{error}</p>
                  <button
                    onClick={fetchUsers}
                    className="ti-btn ti-btn-primary !mt-3"
                  >
                    <i className="ri-refresh-line"></i> Retry
                  </button>
                </div>
              ) : adminUsers.length === 0 ? (
                <div className="text-center py-8">
                  <i className="ri-user-search-line text-4xl text-gray-400 mb-2"></i>
                  <p className="text-gray-500 font-medium mb-1">
                    {searchValue || subRoleFilter ? 'No admin users found matching your search' : 'No admin users found'}
                  </p>
                  {(searchValue || subRoleFilter) && (
                    <button
                      onClick={() => {
                        setSearchValue('');
                        setSubRoleFilter('');
                        setCurrentPage(1);
                      }}
                      className="ti-btn ti-btn-light !mt-3 !gap-2"
                    >
                      <i className="ri-close-line"></i> Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                    <thead>
                      <tr>
                        <th scope="col" className="text-start">S.No</th>
                        <th scope="col" className="text-start">Name</th>
                        <th scope="col" className="text-start">Email</th>
                        <th 
                          scope="col" 
                          className="text-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                          onClick={() => handleSort('subRole')}
                        >
                          <div className="flex items-center gap-2">
                            <span>Sub Role</span>
                            <div className="flex flex-col">
                              <i className={`ri-arrow-up-s-line text-xs ${sortField === 'subRole' && sortOrder === 'asc' ? 'text-primary' : 'text-gray-400'}`}></i>
                              <i className={`ri-arrow-down-s-line text-xs -mt-1 ${sortField === 'subRole' && sortOrder === 'desc' ? 'text-primary' : 'text-gray-400'}`}></i>
                            </div>
                          </div>
                        </th>
                        <th scope="col" className="text-start">Phone</th>
                        <th scope="col" className="text-start">Status</th>
                        <th scope="col" className="text-start">Created At</th>
                        <th scope="col" className="text-start">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((user, index) => (
                        <tr 
                          key={user.id || user._id || index} 
                          className="border border-inherit border-solid hover:bg-gray-100 dark:border-defaultborder/10 dark:hover:bg-light cursor-pointer"
                        >
                          <td>{(currentPage - 1) * limit + index + 1}</td>
                          <td>
                            <div className="flex items-center leading-none">
                              <div>
                                <span className="block font-semibold mb-1">{user.name}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">{user.email}</span>
                          </td>
                          <td>
                            {user.subRole ? (
                              <span className="badge bg-primary/10 text-primary">{user.subRole}</span>
                            ) : (
                              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">-</span>
                            )}
                          </td>
                          <td>
                            {user.countryCode && user.phoneNumber ? (
                              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                                {user.countryCode} {user.phoneNumber}
                              </span>
                            ) : user.phoneNumber ? (
                              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                                {user.phoneNumber}
                              </span>
                            ) : (
                              <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">-</span>
                            )}
                          </td>
                          <td>
                            {user.isActive !== undefined ? (
                              <span className={`badge ${user.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <span className="badge bg-success/10 text-success">Active</span>
                            )}
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-row items-center !gap-2 text-[0.9375rem]">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewUser(user);
                                }}
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <Link 
                                aria-label="anchor" 
                                href={`/rbac/roles-permissions/edit?id=${encodeURIComponent(String(user?.id ?? user?._id))}`} 
                                scroll={false} 
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                                title="Edit User"
                              >
                                <i className="ri-pencil-line"></i>
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleActiveStatus(user);
                                }}
                                className="relative inline-flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 rounded !h-[1.75rem] !w-[2.75rem] !m-0 !p-0 hover:opacity-90 transition-all"
                                title={user.isActive !== false ? 'Deactivate User' : 'Activate User'}
                              >
                                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ease-in-out ${
                                  user.isActive !== false 
                                    ? 'bg-success shadow-sm' 
                                    : 'bg-gray-300 dark:bg-gray-600 shadow-sm'
                                }`}>
                                  <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-4 w-4 transition-all duration-300 ease-in-out shadow-md flex items-center justify-center ${
                                    user.isActive !== false ? 'translate-x-5' : 'translate-x-0'
                                  }`}>
                                    {user.isActive !== false ? (
                                      <i className="ri-check-line text-[0.6rem] text-success"></i>
                                    ) : (
                                      <i className="ri-close-line text-[0.6rem] text-gray-400"></i>
                                    )}
                                  </div>
                                </div>
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(user);
                                }}
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                                title="Delete User"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {totalPages > 1 && totalResults > 0 && (
              <div className="box-footer">
                <div className="sm:flex items-center">
                  <div className="text-defaulttextcolor/70">
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalResults)} of {totalResults} {totalResults === 1 ? "Entry" : "Entries"}  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                  </div>
                  <div className="ms-auto">
                    <nav aria-label="Page navigation" className="pagination-style-4">
                      <ul className="ti-pagination mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link" 
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Prev
                          </button>
                        </li>
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 10) {
                            pageNum = i + 1;
                          } else if (currentPage <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 4) {
                            pageNum = totalPages - 9 + i;
                          } else {
                            pageNum = currentPage - 5 + i;
                          }
                          return (
                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        })}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link !text-primary" 
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">User Details</h3>
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Role</label>
                    <p className="text-gray-900">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sub Role</label>
                    <p className="text-gray-900">{selectedUser.subRole || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">
                      {selectedUser.countryCode && selectedUser.phoneNumber 
                        ? `${selectedUser.countryCode} ${selectedUser.phoneNumber}` 
                        : selectedUser.phoneNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Verified</label>
                    <p className="text-gray-900">
                      {(selectedUser as any).isEmailVerified ? 'Yes' : 'No'}
                    </p>
                  </div>
                  {selectedUser.createdAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Created At</label>
                      <p className="text-gray-900">
                        {new Date(selectedUser.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedUser.updatedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Updated At</label>
                      <p className="text-gray-900">
                        {new Date(selectedUser.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedUser.navigation && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Navigation Permissions
                    </label>
                    <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                      {renderNavigationJSON(selectedUser.navigation)}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                  }}
                  className="ti-btn ti-btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default RolesPermissions;
