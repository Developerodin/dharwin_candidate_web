"use client";

import React, { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import {
  createSubRole,
  NavigationPermissions,
} from "@/shared/lib/sub-roles";
import Swal from "sweetalert2";

const defaultNavigationStructure: NavigationPermissions = {
  Dashboard: false,
  ATS: {
    Candidates: {
      Candidates: {
        "Export Candidates": false,
        "Add Candidate": false,
        Actions: {
          "View Details": false,
          "Edit Candidate": false,
          "View Documents": false,
          "Upload Salary Slip": false,
          "Share Candidate": false,
          "View Attendance": false,
          "Add Note": false,
          "Add Feedback": false,
          "Delete Candidate": false,
        },
      },
      "Share Candidate Form": false,
      "Track Attendance": false,
    },
    Jobs: {
      "Manage Jobs": {
        "Create Job": false,
        "Export Excel": false,
        Actions: {
          "Edit Job": false,
          "View Job": false,
          "Delete Job": false,
        },
      },
    },
    Interviews: {
      "Generate Meeting Link": false,
      "Manage Meetings": false,
    },
  },
  "Project management": {
    "Manage Projects": {
      "New Project": false,
      "View Project": false,
      "Edit Project": false,
      "Delete Project": false,
    },
    "Manage Tasks": {
      "New Board": false,
      "Add Task": false,
      "View Task": false,
      "Edit Task": false,
      "Delete Task": false,
    },
  },
  "Support Tickets": {
    "Create Ticket": false,
    Actions: {
      "View Details": false,
      "Delete Ticket": false,
    },
  },
  Settings: {
    Master: {
      Jobs: {
        "Manage Jobs Templates": {
          "Create Template": false,
          Actions: {
            "View Template": false,
            "Edit Template": false,
            "Delete Template": false,
          },
        },
      },
      Attendance: {
        "Manage Week Off": false,
        "Holidays List": false,
        "Assign Holidays": false,
        "Manage Shifts": false,
        "Assign Shift": false,
        "Assign Leave": false,
        "Leave Requests": false,
        "Backdated Attendance": false,
      },
    },
    Logs: {
      "Login Logs": false,
      "Recruiter Logs": false,
    },
    RBAC: {
      Roles: false,
      "Manage Roles & Permissions": false,
    },
  },
};

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
  navigation: NavigationPermissions;
}

const AddRolePage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isActive: true,
    navigation: JSON.parse(JSON.stringify(defaultNavigationStructure)),
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Sub-role name is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleActiveToggle = () => {
    setFormData((prev) => ({
      ...prev,
      isActive: !prev.isActive,
    }));
  };

  const handleNavigationToggle = (path: string[]) => {
    setFormData((prev) => {
      const newNavigation = JSON.parse(JSON.stringify(prev.navigation));
      let current: any = newNavigation;

      for (let i = 0; i < path.length - 1; i++) {
        if (typeof current[path[i]] !== "object" || current[path[i]] === null) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      const lastKey = path[path.length - 1];
      if (typeof current[lastKey] === "boolean") {
        current[lastKey] = !current[lastKey];
      } else {
        current[lastKey] = false;
      }

      return {
        ...prev,
        navigation: newNavigation,
      };
    });
  };

  const getNavigationValue = (
    path: string[]
  ): boolean | NavigationPermissions | undefined => {
    let current: any = formData.navigation;
    for (const key of path) {
      if (typeof current === "object" && current !== null && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  const renderNavigationPermissions = (
    obj: NavigationPermissions,
    path: string[] = []
  ): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    Object.keys(obj).forEach((key) => {
      const currentPath = [...path, key];
      const value = getNavigationValue(currentPath);

      if (typeof value === "object" && value !== null) {
        elements.push(
          <div
            key={currentPath.join(".")}
            className="ml-3 mb-2 mt-2"
          >
            <div className="font-semibold text-gray-800 dark:text-white text-sm mb-1.5 flex items-center gap-1.5">
              <i className="ri-folder-line text-primary text-xs"></i>
              {key}
            </div>
            <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
              {renderNavigationPermissions(
                value as NavigationPermissions,
                currentPath
              )}
            </div>
          </div>
        );
      } else {
        const isEnabled = value === true;
        elements.push(
          <div
            key={currentPath.join(".")}
            className={`flex items-center justify-between mb-1.5 p-2 rounded-md border transition-all ${
              isEnabled
                ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                : "bg-white dark:bg-bodydark border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-bodydark"
            }`}
          >
            <label className="text-xs font-medium text-gray-800 dark:text-white/90 cursor-pointer flex-1 flex items-center gap-1.5">
              <i
                className={`ri-${
                  isEnabled ? "check-line" : "close-line"
                } ${isEnabled ? "text-primary" : "text-gray-400"} text-xs`}
              ></i>
              {key}
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold min-w-[45px] text-center ${
                  isEnabled
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-danger/10 text-danger border border-danger/20"
                }`}
              >
                {isEnabled ? "True" : "False"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={() => handleNavigationToggle(currentPath)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-sm"></div>
              </label>
            </div>
          </div>
        );
      }
    });

    return elements;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Please fix all errors before submitting",
        confirmButtonText: "OK",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createSubRole({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        navigation: formData.navigation,
        isActive: formData.isActive,
      });

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Sub-role created successfully",
        confirmButtonText: "OK",
      }).then(() => {
        router.push("/rbac/roles");
      });
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create sub-role";
      setError(errorMessage);
      Swal.fire({
        icon: "error",
        title: "Creation Failed",
        text: errorMessage,
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <Seo title="Add Sub-Role" />
      <Pageheader
        currentpage="Add Sub-Role"
        activepage="Settings"
        mainpage="Roles"
      />

      <div className="container">
        <div className="grid grid-cols-12">
          <div className="xl:col-span-10 lg:col-span-10 md:col-span-12 col-span-12 mx-auto">
            <div className="box">
              <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 pb-4">
                <div className="box-title flex items-center m-auto gap-2">
                  <i className="ri-shield-user-line text-xl text-primary"></i>
                  <span>Create New Sub-Role</span>
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
                    <div>
                      <div className="grid grid-cols-12 gap-4">
                        <div className="md:col-span-6 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-shield-user-line text-[0.875rem] text-gray-500"></i>
                            Sub-Role Name <span className="text-red-500">*</span>
                          </label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                              <i className="ri-shield-user-line text-gray-500"></i>
                            </span>
                            <input
                              type="text"
                              className={`ti-form-control border-s-0 w-full ${
                                formErrors.name ? "border-danger" : ""
                              }`}
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              placeholder='e.g., "Senior Admin", "HR Admin"'
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

                        <div className="md:col-span-6 col-span-12">
                          <label className="form-label mb-2 flex items-center gap-1">
                            <i className="ri-toggle-line text-[0.875rem] text-gray-500"></i>
                            Status
                          </label>
                          <div className="flex items-center gap-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={handleActiveToggle}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                            </label>
                            <span
                              className={`text-sm font-medium ${
                                formData.isActive
                                  ? "text-success"
                                  : "text-danger"
                              }`}
                            >
                              {formData.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="form-label mb-2 flex items-center gap-1">
                        <i className="ri-file-text-line text-[0.875rem] text-gray-500"></i>
                        Description
                      </label>
                      <textarea
                        className="ti-form-control"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="Optional description for this sub-role (e.g., who should use it, what access it grants)"
                      />
                    </div>

                    <div className="border-t border-defaultborder dark:border-defaultborder/10 pt-6">
                      <h6 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i className="ri-menu-line text-primary"></i>
                        Navigation Permissions
                      </h6>
                      <p className="text-xs text-gray-500 mb-3">
                        Configure which sections and actions this sub-role can
                        access. These permissions will be applied to admin
                        users who are assigned this sub-role.
                      </p>
                      <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-[500px] overflow-y-auto bg-white dark:bg-bodydark shadow-sm">
                        {renderNavigationPermissions(formData.navigation)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-defaultborder dark:border-defaultborder/10">
                    <button
                      type="submit"
                      className="ti-btn ti-btn-primary !bg-primary !text-white !gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line"></i>
                          Create Sub-Role
                        </>
                      )}
                    </button>
                    <Link
                      href="/rbac/roles"
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

export default AddRolePage;
