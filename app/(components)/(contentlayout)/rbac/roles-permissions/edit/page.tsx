"use client";

import React, { Fragment, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import { updateAdminUser } from '@/shared/lib/admin-users';
import { fetchAdminUserById } from '@/shared/lib/admin-users';
import { fetchSubRoles, fetchSubRoleById, SubRole } from '@/shared/lib/sub-roles';
import Swal from 'sweetalert2';

interface NavigationPermissions {
  [key: string]: boolean | NavigationPermissions;
}

interface FormData {
  name: string;
  phoneNumber: string;
  countryCode: string;
  subRoleId: string;
  isActive: boolean;
  navigation: NavigationPermissions;
}

// Default navigation structure based on the API documentation
const defaultNavigationStructure: NavigationPermissions = {
  Dashboard: false,
  ATS: {
    Candidates: {
      Candidates: {
        "Export Candidates": false,
        "Add Candidate": false,
        "Actions": {
          "View Details": false,
          "Edit Candidate": false,
          "View Documents": false,
          "Upload Salary Slip": false,
          "Share Candidate": false,
          "View Attendance": false,
          "Add Note": false,
          "Add Feedback": false,
          "Delete Candidate": false
        }
      },
      "Share Candidate Form": false,
      "Track Attendance": false
    },
    Jobs: {
      "Manage Jobs": {
        "Create Job": false,
        "Export Excel": false,
        "Actions": {
          "Edit Job": false,
          "View Job": false,
          "Delete Job": false
        }
      }
    },
    Interviews: {
      "Generate Meeting Link": false,
      "Manage Meetings": false
    }
  },
  "Project management": {
    "Manage Projects": {
      "New Project": false,
      "View Project": false,
      "Edit Project": false,
      "Delete Project": false
    },
    "Manage Tasks": {
      "New Board": false,
      "Add Task": false,
      "View Task": false,
      "Edit Task": false,
      "Delete Task": false
    }
  },
  "Support Tickets": {
    "Create Ticket": false,
    "Actions": {
      "View Details": false,
      "Delete Ticket": false
    }
  },
  Settings: {
    Master: {
      Jobs: {
        "Manage Jobs Templates": {
          "Create Template": false,
          "Actions": {
            "View Template": false,
            "Edit Template": false,
            "Delete Template": false
          }
        }
      },
      Attendance: {
        "Manage Week Off": false,
        "Holidays List": false,
        "Assign Holidays": false,
        "Manage Shifts": false,
        "Assign Shift": false,
        "Assign Leave": false,
        "Leave Requests": false,
        "Backdated Attendance": false
      }
    },
    Logs: {
      "Login Logs": false,
      "Recruiter Logs": false
    },
    RBAC: {
      "Roles": false,
      "Manage Roles & Permissions": false
    }
  }
};

// Deep merge function to merge existing navigation with default structure
// This ensures we always have the complete structure, even if existing data is incomplete
const mergeNavigationStructures = (
  existing: NavigationPermissions | null | undefined,
  defaultStructure: NavigationPermissions
): NavigationPermissions => {
  // Start with a deep copy of the default structure (complete structure)
  const merged: NavigationPermissions = JSON.parse(JSON.stringify(defaultStructure));

  // If no existing data, return the default structure
  if (!existing || typeof existing !== 'object') {
    return merged;
  }

  // Recursively merge existing values into the default structure
  const mergeRecursive = (target: any, source: any) => {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (typeof sourceValue === 'boolean') {
          // If source has a boolean value, use it (preserve existing permission)
          target[key] = sourceValue;
        } else if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
          // If source value is an object, recursively merge
          if (targetValue && typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
            // Both are objects, merge recursively to preserve nested structure
            mergeRecursive(target[key], sourceValue);
          }
          // If target doesn't have this key as an object, keep target's structure (from default)
        }
      }
    }
  };

  // Merge existing values into the complete default structure
  mergeRecursive(merged, existing);
  return merged;
};

const EditAdminUser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');
  
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [subRoles, setSubRoles] = useState<SubRole[]>([]);
  const [loadingSubRoles, setLoadingSubRoles] = useState(true);
  const [loadingNavigation, setLoadingNavigation] = useState(false);
  const [initialSubRoleId, setInitialSubRoleId] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phoneNumber: '',
    countryCode: '+1',
    subRoleId: '',
    isActive: true,
    navigation: JSON.parse(JSON.stringify(defaultNavigationStructure))
  });
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Fetch available sub-roles
  useEffect(() => {
    const loadSubRoles = async () => {
      try {
        setLoadingSubRoles(true);
        const data = await fetchSubRoles({ isActive: true, limit: 1000 });
        const roles = Array.isArray(data) ? data : (data as any).results || [];
        setSubRoles(roles);
      } catch (err: any) {
        console.error('Failed to load sub-roles:', err);
        setSubRoles([]);
      } finally {
        setLoadingSubRoles(false);
      }
    };

    loadSubRoles();
  }, []);

  // Fetch navigation structure when sub-role is selected/changed (after user data is loaded)
  useEffect(() => {
    // Don't run until user data is loaded
    if (loadingUser) {
      return;
    }

    const loadSubRoleNavigation = async () => {
      // If sub-role is cleared, reset to default navigation
      if (!formData.subRoleId) {
        // Only reset if there was a previous sub-role that was cleared
        if (initialSubRoleId && formData.subRoleId === '') {
          setFormData(prev => ({
            ...prev,
            navigation: JSON.parse(JSON.stringify(defaultNavigationStructure))
          }));
        }
        return;
      }

      // Skip if this is the same sub-role as initially loaded (already loaded in loadUser)
      if (formData.subRoleId === initialSubRoleId && initialSubRoleId !== '') {
        return;
      }

      try {
        setLoadingNavigation(true);
        const subRoleData = await fetchSubRoleById(formData.subRoleId);
        
        // Merge sub-role navigation with default structure
        const mergedNavigation = mergeNavigationStructures(
          subRoleData.navigation,
          defaultNavigationStructure
        );

        setFormData(prev => ({
          ...prev,
          navigation: mergedNavigation
        }));
      } catch (err: any) {
        console.error('Failed to load sub-role navigation:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load navigation permissions from selected sub-role',
          confirmButtonText: 'OK'
        });
      } finally {
        setLoadingNavigation(false);
      }
    };

    loadSubRoleNavigation();
  }, [formData.subRoleId, initialSubRoleId, loadingUser]);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'User ID is required',
          confirmButtonText: 'OK'
        }).then(() => {
          router.push('/rbac/roles-permissions');
        });
        return;
      }

      setLoadingUser(true);
      setError(null);
      
      try {
        const userData = await fetchAdminUserById(userId);
        
        // Set email (read-only display)
        setUserEmail(userData.email || '');
        
        // Populate form with existing data
        // Merge existing navigation with default structure to ensure all fields are present
        const mergedNavigation = mergeNavigationStructures(
          userData.navigation,
          defaultNavigationStructure
        );

        // Check if user has subRoleId (from API response)
        const hasSubRoleId = (userData as any).subRoleId || '';
        
        setInitialSubRoleId(hasSubRoleId);
        
        // If user has a subRoleId, fetch the navigation from that sub-role
        if (hasSubRoleId) {
          try {
            const subRoleData = await fetchSubRoleById(hasSubRoleId);
            const mergedNavigation = mergeNavigationStructures(
              subRoleData.navigation,
              defaultNavigationStructure
            );
            setFormData({
              name: userData.name || '',
              phoneNumber: userData.phoneNumber || '',
              countryCode: userData.countryCode || '+1',
              subRoleId: hasSubRoleId,
              isActive: userData.isActive !== undefined ? userData.isActive : true,
              navigation: mergedNavigation
            });
          } catch (err: any) {
            console.error('Failed to load sub-role navigation:', err);
            // Fallback to user's existing navigation
            setFormData({
              name: userData.name || '',
              phoneNumber: userData.phoneNumber || '',
              countryCode: userData.countryCode || '+1',
              subRoleId: hasSubRoleId,
              isActive: userData.isActive !== undefined ? userData.isActive : true,
              navigation: mergedNavigation
            });
          }
        } else {
          setFormData({
            name: userData.name || '',
            phoneNumber: userData.phoneNumber || '',
            countryCode: userData.countryCode || '+1',
            subRoleId: hasSubRoleId,
            isActive: userData.isActive !== undefined ? userData.isActive : true,
            navigation: mergedNavigation
          });
        }
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load user data';
        setError(errorMessage);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'OK'
        }).then(() => {
          router.push('/rbac/roles-permissions');
        });
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [userId, router]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneDigits = formData.phoneNumber.trim().replace(/\D/g, ''); // Remove all non-digits
      if (phoneDigits.length !== 10) {
        errors.phoneNumber = 'Phone number must be exactly 10 digits';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For phone number, only allow digits and limit to 10 digits
    let processedValue = value;
    if (name === 'phoneNumber') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    // Handle checkbox for isActive
    if (name === 'isActive') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        isActive: checked,
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle navigation permission toggle
  const handleNavigationToggle = (path: string[]) => {
    setFormData(prev => {
      const newNavigation = JSON.parse(JSON.stringify(prev.navigation));
      let current: any = newNavigation;
      
      // Navigate to the nested object
      for (let i = 0; i < path.length - 1; i++) {
        if (typeof current[path[i]] !== 'object' || current[path[i]] === null) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      
      // Toggle the final value
      const lastKey = path[path.length - 1];
      if (typeof current[lastKey] === 'boolean') {
        current[lastKey] = !current[lastKey];
      } else {
        current[lastKey] = false;
      }
      
      return {
        ...prev,
        navigation: newNavigation
      };
    });
  };

  // Get navigation value at path
  const getNavigationValue = (path: string[]): boolean | NavigationPermissions | undefined => {
    let current: any = formData.navigation;
    for (const key of path) {
      if (typeof current === 'object' && current !== null && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // Render navigation permissions recursively
  const renderNavigationPermissions = (obj: NavigationPermissions, path: string[] = [], disabled: boolean = false): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return elements;
    }
    
    Object.keys(obj).forEach(key => {
      const currentPath = [...path, key];
      // Get value directly from the obj parameter (which is already at the current level)
      const value = obj[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // It's a nested object - render it recursively
        elements.push(
          <div key={currentPath.join('.')} className="ml-3 mb-2 mt-2">
            <div className="font-semibold text-gray-800 dark:text-white text-sm mb-1.5 flex items-center gap-1.5">
              <i className="ri-folder-line text-primary text-xs"></i>
              {key}
            </div>
            <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
              {renderNavigationPermissions(value as NavigationPermissions, currentPath, disabled)}
            </div>
          </div>
        );
      } else if (typeof value === 'boolean') {
        // It's a boolean value - render toggle
        const isEnabled = value === true;
        elements.push(
          <div 
            key={currentPath.join('.')} 
            className={`flex items-center justify-between mb-1.5 p-2 rounded-md border transition-all ${
              isEnabled 
                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                : 'bg-white dark:bg-bodydark border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-bodydark'
            } ${disabled ? 'opacity-75' : ''}`}
          >
            <label className={`text-xs font-medium text-gray-800 dark:text-white/90 flex-1 flex items-center gap-1.5 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <i className={`ri-${isEnabled ? 'check-line' : 'close-line'} ${isEnabled ? 'text-primary' : 'text-gray-400'} text-xs`}></i>
              {key}
            </label>
            <div className="flex items-center gap-2">
              {/* True/False Badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold min-w-[45px] text-center ${
                isEnabled 
                  ? 'bg-success/10 text-success border border-success/20' 
                  : 'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {isEnabled ? 'True' : 'False'}
              </span>
              
              {/* Toggle Switch */}
              <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => !disabled && handleNavigationToggle(currentPath)}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className={`w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-sm ${disabled ? 'opacity-50' : ''}`}></div>
              </label>
            </div>
          </div>
        );
      }
    });
    
    return elements;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'User ID is required',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    if (!validateForm()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fix all errors before submitting',
        confirmButtonText: 'OK'
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {};

      // Only include fields that have values
      if (formData.name.trim()) {
        payload.name = formData.name.trim();
      }
      if (formData.phoneNumber.trim()) {
        // Only send digits for phone number
        payload.phoneNumber = formData.phoneNumber.trim().replace(/\D/g, '');
      }
      if (formData.countryCode.trim()) {
        payload.countryCode = formData.countryCode.trim();
      }

      // Handle isActive
      if (typeof formData.isActive === 'boolean') {
        payload.isActive = formData.isActive;
      }

      // If a sub-role is selected, send subRoleId only
      // Otherwise, send navigation for manual configuration
      if (formData.subRoleId) {
        payload.subRoleId = formData.subRoleId;
      } else if (Object.keys(formData.navigation).length > 0) {
        payload.navigation = formData.navigation;
      }

      // Check if at least one field is provided
      if (Object.keys(payload).length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'At least one field must be provided for update',
          confirmButtonText: 'OK'
        });
        setLoading(false);
        return;
      }

      await updateAdminUser(userId, payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Admin user updated successfully',
        confirmButtonText: 'OK'
      }).then(() => {
        // Redirect back to the main page
        router.push('/rbac/roles-permissions');
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update admin user';
      setError(errorMessage);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <Fragment>
        <Seo title="Edit Admin User" />
        <Pageheader 
          currentpage="Edit Admin User" 
          activepage="Settings" 
          mainpage="Manage Roles & Permissions" 
        />
        <div className="container">
          <div className="grid grid-cols-12">
            <div className="xl:col-span-10 lg:col-span-10 md:col-span-12 col-span-12 mx-auto">
              <div className="box">
                <div className="box-body text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading user data...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Edit Admin User" />
      <Pageheader 
        currentpage="Edit Admin User" 
        activepage="Settings" 
        mainpage="Manage Roles & Permissions" 
      />
      
      <div className="container">
        <div className="grid grid-cols-12">
          <div className="xl:col-span-10 lg:col-span-10 md:col-span-12 col-span-12">
            <div className="box">
              <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 pb-4">
                <div className="box-title flex items-center m-auto gap-2">
                  <i className="ri-user-settings-line text-xl text-primary"></i>
                  <span>Update Admin User</span>
                </div>
              </div>
              
              <div className="box-body">
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-danger/10 text-danger p-3 rounded border border-danger/20 mb-4">
                      <div className="flex items-center gap-2">
                        <i className="ri-error-warning-line"></i>
                        <span>{error}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-6">
                    {/* Basic Information Section */}
                    <div>
                      <div className="grid grid-cols-12 gap-4">
                        {/* Email */}
                        <div className="md:col-span-12 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-mail-line text-[0.875rem] text-gray-500"></i>
                            Email Address
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-mail-line text-gray-500"></i>
                            </span>
                            <input
                              type="email"
                              value={userEmail}
                              disabled
                              className="ti-form-control border-s-0 w-full !bg-white dark:!bg-bodydark !cursor-not-allowed"
                            />
                          </div>
                        </div>

                        {/* Name */}
                        <div className="md:col-span-6 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-user-line text-[0.875rem] text-gray-500"></i>
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-user-line text-gray-500"></i>
                            </span>
                            <input
                              type="text"
                              className={`ti-form-control border-s-0 w-full ${formErrors.name ? 'border-danger' : ''}`}
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder="Enter admin user full name"
                              required
                            />
                          </div>
                          {formErrors.name && (
                            <small className="text-danger text-[0.75rem] mt-1 block">
                              <i className="ri-error-warning-line me-1"></i>
                              {formErrors.name}
                            </small>
                          )}
                        </div>

                        {/* Sub Role (from existing Sub-Roles) */}
                        <div className="md:col-span-6 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-user-settings-line text-[0.875rem] text-gray-500"></i>
                            Assign Sub-Role
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-shield-user-line text-gray-500"></i>
                            </span>
                            <select
                              className="ti-form-control border-s-0 w-full"
                              name="subRoleId"
                              value={formData.subRoleId}
                              onChange={handleInputChange}
                              disabled={loadingSubRoles}
                            >
                              <option value="">Select</option>
                              {subRoles.map((role) => (
                                <option key={role.id || role._id} value={role.id || role._id}>
                                  {role.name} {role.description ? `- ${role.description}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <small className="text-muted text-[0.75rem] mt-1 block">
                            <i className="ri-information-line me-1"></i>
                            If you select a sub-role, this admin's permissions will be derived from that sub-role template.
                          </small>
                        </div>

                        {/* Active Status */}
                        <div className="md:col-span-6 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-toggle-line text-[0.875rem] text-gray-500"></i>
                            Account Status
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                            </label>
                            <span className={`text-sm font-medium ${formData.isActive ? 'text-success' : 'text-danger'}`}>
                              {formData.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <small className="text-muted text-[0.75rem] mt-1 block">
                            <i className="ri-information-line me-1"></i>
                            Inactive users cannot log in to the system.
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="">
                      <div className="grid grid-cols-12 gap-4">
                        {/* Country Code */}
                        <div className="xl:col-span-4 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-global-line text-[0.875rem] text-gray-500"></i>
                            Country Code
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-global-line text-gray-500"></i>
                            </span>
                            <select
                              className="ti-form-control border-s-0 w-full"
                              name="countryCode"
                              value={formData.countryCode}
                              onChange={handleInputChange}
                            >
                              <option value="+1">US (+1)</option>
                              <option value="+91">India (+91)</option>
                            </select>
                          </div>
                        </div>

                        {/* Phone Number */}
                        <div className="xl:col-span-8 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-phone-line text-[0.875rem] text-gray-500"></i>
                            Phone Number
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-phone-line text-gray-500"></i>
                            </span>
                            <input
                              type="tel"
                              className={`ti-form-control border-s-0 w-full ${formErrors.phoneNumber ? 'border-danger' : ''}`}
                              name="phoneNumber"
                              value={formData.phoneNumber}
                              onChange={handleInputChange}
                              placeholder="Enter 10 digit phone number"
                              maxLength={10}
                            />
                          </div>
                          {!formErrors.phoneNumber && formData.phoneNumber && (
                            <small className="text-muted text-[0.75rem] mt-1 block">
                              <i className="ri-information-line me-1"></i>
                              Phone number must be exactly 10 digits
                            </small>
                          )}
                          {formErrors.phoneNumber && (
                            <small className="text-danger text-[0.75rem] mt-1 block">
                              <i className="ri-error-warning-line me-1"></i>
                              {formErrors.phoneNumber}
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Navigation Permissions Section - Only show when sub-role is selected */}
                    {formData.subRoleId && (
                      <div className="border-t border-defaultborder dark:border-defaultborder/10 pt-6">
                        <h6 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                          <i className="ri-menu-line text-primary"></i>
                          Navigation Permissions
                          <span className="ml-2 px-2 py-0.5 bg-info/10 text-info text-[10px] font-semibold rounded">
                            From Sub-Role Template (Read-Only)
                          </span>
                        </h6>
                        <p className="text-xs text-gray-500 mb-3">
                          Navigation permissions are automatically loaded from the selected sub-role. These permissions are read-only.
                        </p>
                        {loadingNavigation ? (
                          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                            <p className="text-xs text-gray-500">Loading navigation permissions...</p>
                          </div>
                        ) : (
                          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-black/20 shadow-sm">
                            {renderNavigationPermissions(formData.navigation, [], true)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-defaultborder dark:border-defaultborder/10">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary !bg-primary !text-white !gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line"></i>
                          Update Admin User
                        </>
                      )}
                    </button>
                    <Link
                      href="/rbac/roles-permissions"
                      className="ti-btn ti-btn-secondary !gap-2"
                    >
                      <i className="ri-close-line"></i>
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default EditAdminUser;
