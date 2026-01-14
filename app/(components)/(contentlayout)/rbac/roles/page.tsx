"use client";

import React, { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Pageheader from "@/shared/layout-components/page-header/pageheader";
import Seo from "@/shared/layout-components/seo/seo";
import {
  fetchSubRoles,
  deleteSubRole,
  SubRole,
  NavigationPermissions,
} from "@/shared/lib/sub-roles";
import Swal from "sweetalert2";

const RolesPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subRoles, setSubRoles] = useState<SubRole[]>([]);

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [selectedSubRole, setSelectedSubRole] = useState<SubRole | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const buildFilterParams = () => {
    const params: any = {
      page: currentPage,
      limit,
      sortBy,
    };

    if (searchValue.trim()) {
      params.name = searchValue.trim();
    }

    if (statusFilter) {
      params.isActive = statusFilter === "active";
    }

    return params;
  };

  const handleSort = (field: string) => {
    let newOrder: "asc" | "desc" = "asc";
    if (sortField === field && sortOrder === "asc") {
      newOrder = "desc";
    }
    setSortField(field);
    setSortOrder(newOrder);
    setSortBy(`${field}:${newOrder}`);
    setCurrentPage(1);
  };

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildFilterParams();
      const data = await fetchSubRoles(params);

      if ((data as any).results) {
        const typed = data as any;
        setSubRoles(typed.results || []);
        setTotalPages(typed.totalPages || 1);
        setTotalResults(typed.totalResults || 0);
      } else if (Array.isArray(data)) {
        const list = data as SubRole[];
        setSubRoles(list);
        setTotalPages(1);
        setTotalResults(list.length);
      } else {
        setSubRoles([]);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to fetch sub-roles"
      );
      setSubRoles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, sortBy, searchValue, statusFilter]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchRoles();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, statusFilter]);

  const handleDeleteSubRole = async (subRole: SubRole) => {
    const id = subRole.id || subRole._id;
    if (!id) return;

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete sub-role "${subRole.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await deleteSubRole(String(id));
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Sub-role has been deleted successfully.",
          confirmButtonText: "OK",
        });
        fetchRoles();
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text:
            err?.response?.data?.message ||
            err?.message ||
            "Failed to delete sub-role",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleViewSubRole = (subRole: SubRole) => {
    setSelectedSubRole(subRole);
    setShowDetailsModal(true);
  };

  const renderNavigationJSON = (
    nav: NavigationPermissions,
    indent: number = 0
  ): JSX.Element => {
    const indentStyle = { paddingLeft: `${indent * 20}px` };
    return (
      <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
        {Object.keys(nav || {}).map((key) => {
          const value = (nav as any)[key];
          if (typeof value === "object" && value !== null) {
            return (
              <div key={key} style={indentStyle}>
                <span className="text-blue-600">"{key}"</span>: {"{"}
                {renderNavigationJSON(value as NavigationPermissions, indent + 1)}
                {"}"}
              </div>
            );
          }
          return (
            <div key={key} style={indentStyle}>
              <span className="text-blue-600">"{key}"</span>:{" "}
              <span
                className={
                  value ? "text-green-600 font-semibold" : "text-red-500"
                }
              >
                {String(value)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Fragment>
      <Seo title="Roles" />
      <Pageheader
        currentpage="Roles"
        activepage="Settings"
        mainpage="Roles"
      />

      <div className="grid grid-cols-12 gap-x-6 mt-5">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header justify-between flex-wrap">
              <div className="box-title">
                Sub-Roles{" "}
                {totalResults > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({totalResults} {totalResults === 1 ? "sub-role" : "sub-roles"})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="me-1">
                  <select
                    className="ti-form-control form-control-sm w-full me-2"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="me-3">
                  <input
                    className="ti-form-control form-control-sm"
                    type="text"
                    placeholder="Search by sub-role name"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    aria-label="Search input"
                  />
                </div>
                {(searchValue || statusFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchValue("");
                      setStatusFilter("");
                      setCurrentPage(1);
                    }}
                    className="ti-btn ti-btn-light !bg-light !text-defaulttextcolor !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium me-2"
                  >
                    <i className="ri-filter-off-line"></i> Clear Filters
                  </button>
                )}
                <Link
                  href="/rbac/roles/add"
                  className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-1 !font-medium"
                >
                  <i className="ri-add-line font-semibold align-middle"></i>
                  Add Sub-Role
                </Link>
              </div>
            </div>

            <div className="box-body">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500">Loading sub-roles...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <i className="ri-error-warning-line text-4xl text-danger mb-2"></i>
                  <p className="text-danger font-medium mb-2">{error}</p>
                  <button
                    onClick={fetchRoles}
                    className="ti-btn ti-btn-primary !mt-3"
                  >
                    <i className="ri-refresh-line"></i> Retry
                  </button>
                </div>
              ) : subRoles.length === 0 ? (
                <div className="text-center py-8">
                  <i className="ri-shield-user-line text-4xl text-gray-400 mb-2"></i>
                  <p className="text-gray-500 font-medium mb-1">
                    {searchValue || statusFilter
                      ? "No sub-roles found matching your search"
                      : "No sub-roles found"}
                  </p>
                  {(searchValue || statusFilter) && (
                    <button
                      onClick={() => {
                        setSearchValue("");
                        setStatusFilter("");
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
                        <th scope="col" className="text-start">
                          S.No
                        </th>
                        <th
                          scope="col"
                          className="text-start cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors select-none"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-2">
                            <span>Name</span>
                            <div className="flex flex-col">
                              <i
                                className={`ri-arrow-up-s-line text-xs ${
                                  sortField === "name" && sortOrder === "asc"
                                    ? "text-primary"
                                    : "text-gray-400"
                                }`}
                              ></i>
                              <i
                                className={`ri-arrow-down-s-line text-xs -mt-1 ${
                                  sortField === "name" && sortOrder === "desc"
                                    ? "text-primary"
                                    : "text-gray-400"
                                }`}
                              ></i>
                            </div>
                          </div>
                        </th>
                        <th scope="col" className="text-start">
                          Description
                        </th>
                        <th scope="col" className="text-start">
                          Status
                        </th>
                        <th scope="col" className="text-start">
                          Created At
                        </th>
                        <th scope="col" className="text-start">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subRoles.map((role, index) => (
                        <tr
                          key={role.id || role._id || index}
                          className="border border-inherit border-solid hover:bg-gray-100 dark:border-defaultborder/10 dark:hover:bg-light"
                        >
                          <td>{(currentPage - 1) * limit + index + 1}</td>
                          <td>
                            <span className="block font-semibold mb-1">
                              {role.name}
                            </span>
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                              {role.description || "-"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                role.isActive
                                  ? "bg-success/10 text-success"
                                  : "bg-danger/10 text-danger"
                              }`}
                            >
                              {role.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                              {role.createdAt
                                ? new Date(role.createdAt).toLocaleDateString()
                                : "-"}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-row items-center !gap-2 text-[0.9375rem]">
                              <button
                                onClick={() => handleViewSubRole(role)}
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                                title="View Details"
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <Link
                                href={`/rbac/roles/edit?id=${encodeURIComponent(
                                  String(role.id ?? role._id)
                                )}`}
                                scroll={false}
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                                title="Edit Sub-Role"
                              >
                                <i className="ri-pencil-line"></i>
                              </Link>
                              <button
                                onClick={() => handleDeleteSubRole(role)}
                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                                title="Delete Sub-Role"
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
                    Showing {(currentPage - 1) * limit + 1} to{" "}
                    {Math.min(currentPage * limit, totalResults)} of{" "}
                    {totalResults}{" "}
                    {totalResults === 1 ? "Entry" : "Entries"}{" "}
                    <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                  </div>
                  <div className="ms-auto">
                    <nav
                      aria-label="Page navigation"
                      className="pagination-style-4"
                    >
                      <ul className="ti-pagination mb-0">
                        <li
                          className={`page-item ${
                            currentPage === 1 ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Prev
                          </button>
                        </li>
                        {Array.from(
                          { length: Math.min(totalPages, 10) },
                          (_, i) => {
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
                              <li
                                key={pageNum}
                                className={`page-item ${
                                  currentPage === pageNum ? "active" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              </li>
                            );
                          }
                        )}
                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
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

      {showDetailsModal && selectedSubRole && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetailsModal(false);
            setSelectedSubRole(null);
          }}
        >
          <div 
            className="bg-white dark:bg-bodybg rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-defaultborder dark:border-defaultborder/20 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-defaulttextcolor mb-1">
                  Sub-Role Details
                </h3>
                <p className="text-xs text-gray-500">
                  View configuration and navigation permissions for this sub-role.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSubRole(null);
                }}
                className="ti-btn ti-btn-sm ti-btn-light !m-0 !py-1 !px-2"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Name
                  </p>
                  <p className="text-sm font-semibold text-defaulttextcolor">
                    {selectedSubRole.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      selectedSubRole.isActive
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {selectedSubRole.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Description
                  </p>
                  <p className="text-sm text-defaulttextcolor/80">
                    {selectedSubRole.description || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Created At
                  </p>
                  <p className="text-sm text-defaulttextcolor/80">
                    {selectedSubRole.createdAt
                      ? new Date(
                          selectedSubRole.createdAt
                        ).toLocaleString()
                      : "-"}
                  </p>
                </div>
                {selectedSubRole.createdBy && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Created By
                    </p>
                    <p className="text-sm text-defaulttextcolor/80">
                      {selectedSubRole.createdBy.name} (
                      {selectedSubRole.createdBy.email})
                    </p>
                  </div>
                )}
              </div>

              {selectedSubRole.navigation && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Navigation Permissions
                  </p>
                  <div className="border rounded-lg p-3 bg-gray-50 dark:bg-black/20 max-h-[320px] overflow-y-auto">
                    {renderNavigationJSON(selectedSubRole.navigation)}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-defaultborder dark:border-defaultborder/20 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSubRole(null);
                }}
                className="ti-btn ti-btn-primary !mb-0"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default RolesPage;

