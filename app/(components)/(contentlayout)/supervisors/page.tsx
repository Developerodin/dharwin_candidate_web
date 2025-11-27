"use client"

import Link from 'next/link'
import Swal from "sweetalert2";
import { useEffect, useState, useCallback } from 'react';
import { fetchAllSupervisors, deleteSupervisor, fetchSupervisorById } from '@/shared/lib/supervisors';

const Supervisors = () => {
    const [supervisorData, setSupervisorData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Search filters
    const [searchFilter, setSearchFilter] = useState<string>('name');
    const [searchValue, setSearchValue] = useState<string>('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [sortBy, setSortBy] = useState<string>('createdAt:desc');
    
    // UI state
    const [selectedSupervisor, setSelectedSupervisor] = useState<any>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>('user');

    // Build filter parameters
    const buildFilterParams = () => {
        const params: any = {
            page: currentPage,
            limit: limit,
            sortBy: sortBy,
        };

        // Basic search filters
        if (searchValue.trim()) {
            if (searchFilter === 'name') {
                params.name = searchValue.trim();
            } else if (searchFilter === 'email') {
                params.email = searchValue.trim();
            }
        }

        return params;
    };

    const getSupervisors = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = buildFilterParams();
            const data = await fetchAllSupervisors(params);
            
            // Handle API response structure
            if (data && data.results) {
                setSupervisorData(data.results);
                setTotalPages(data.totalPages || 1);
                setTotalResults(data.totalResults || 0);
            } else if (Array.isArray(data)) {
                setSupervisorData(data);
                setTotalPages(1);
                setTotalResults(data.length);
            } else {
                setSupervisorData([]);
                setTotalPages(1);
                setTotalResults(0);
            }
        } catch (err: any) {
            setError(err?.message || "Failed to fetch supervisors");
            setSupervisorData([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, sortBy, searchValue, searchFilter]);

    // Fetch supervisors when filters change
    useEffect(() => {
        getSupervisors();
    }, [getSupervisors]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                getSupervisors();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchValue, searchFilter]);

    // Function to open supervisor details modal
    const openSupervisorModal = async (supervisor: any) => {
        try {
            const fullData = await fetchSupervisorById(String(supervisor?.id ?? supervisor?._id));
            setSelectedSupervisor(fullData);
            setShowModal(true);
        } catch (err: any) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err?.message || 'Failed to fetch supervisor details',
                confirmButtonText: 'OK'
            });
        }
    };

    // Function to close modal
    const closeModal = () => {
        setShowModal(false);
        setSelectedSupervisor(null);
    };

    // Get user role from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setUserRole(parsedUser.role || 'user');
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    setUserRole('user');
                }
            }
        }
    }, []);

    // Clear all filters
    const clearFilters = () => {
        setSearchValue('');
        setCurrentPage(1);
    };

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <>
            <div className="grid grid-cols-12 gap-x-6 mt-5">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box">
                        <div className="box-header justify-between flex-wrap">
                            <div className="box-title">
                                Supervisor List {totalResults > 0 && <span className="text-sm font-normal text-gray-500">({totalResults} supervisors)</span>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="me-1">
                                    <select 
                                        className="ti-form-control form-control-sm w-full me-2 !bg-primary !text-white" 
                                        value={searchFilter}
                                        onChange={(e) => {
                                            setSearchFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option value="name">Search by Name</option>
                                        <option value="email">Search by Email</option>
                                    </select>
                                </div>
                                <div className="me-3">
                                    <input 
                                        className="ti-form-control form-control-sm" 
                                        type="text" 
                                        placeholder={`Search ${searchFilter === 'name' ? 'name' : 'email'} here`}
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        aria-label="Search input"
                                    />
                                </div>
                                <button type="button" className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium">
                                    <i className="ri-add-line font-semibold align-middle"></i> <Link href="/supervisors/add">Add Supervisor</Link>
                                </button>
                            </div>
                        </div>
                        <div className="box-body">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="mt-2 text-gray-500">Loading supervisors...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <i className="ri-error-warning-line text-4xl text-danger mb-2"></i>
                                    <p className="text-danger">{error}</p>
                                    <button 
                                        onClick={getSupervisors}
                                        className="ti-btn ti-btn-primary mt-3"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : supervisorData.length === 0 ? (
                                <div className="text-center py-8">
                                    <i className="ri-user-search-line text-4xl text-gray-400 mb-2"></i>
                                    <p className="text-gray-500">No supervisors found</p>
                                    {searchValue && (
                                        <button 
                                            onClick={clearFilters}
                                            className="ti-btn ti-btn-light !bg-light !text-defaulttextcolor !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium mt-3"
                                        >
                                            <i className="ri-close-line"></i> Clear Filters
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
                                                <th scope="col" className="text-start">Status</th>
                                                <th scope="col" className="text-start">Created At</th>
                                                <th scope="col" className="text-start">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {supervisorData.map((supervisor, i) => (
                                                <tr 
                                                    className="border border-inherit border-solid hover:bg-gray-100 dark:border-defaultborder/10 dark:hover:bg-light cursor-pointer" 
                                                    key={supervisor?.id || supervisor?._id || Math.random()}
                                                    onClick={() => openSupervisorModal(supervisor)}
                                                >
                                                    <td>{(currentPage - 1) * limit + i + 1}</td>
                                                    <td>
                                                        <div className="flex items-center leading-none">
                                                            <div className="me-2">
                                                                <span className="avatar avatar-md avatar-rounded">
                                                                    <img src={supervisor?.avatar || "/assets/images/faces/1.jpg"} alt="img" />
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="block font-semibold mb-1">{supervisor?.name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">{supervisor?.email}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${supervisor?.isEmailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                            {supervisor?.isEmailVerified ? 'Verified' : 'Unverified'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                                                            {supervisor?.createdAt ? new Date(supervisor.createdAt).toLocaleDateString() : '-'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-row items-center !gap-2 text-[0.9375rem]" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openSupervisorModal(supervisor);
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                                                                title="View Details"
                                                            >
                                                                <i className="ri-eye-line"></i>
                                                            </button>
                                                            <Link 
                                                                aria-label="anchor" 
                                                                href={`/supervisors/edit?id=${encodeURIComponent(String(supervisor?.id ?? supervisor?._id))}`} 
                                                                scroll={false} 
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info"
                                                                title="Edit Supervisor"
                                                            >
                                                                <i className="ri-pencil-line"></i>
                                                            </Link>
                                                            {userRole === 'admin' && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        Swal.fire({
                                                                            title: "Are you sure?",
                                                                            text: "You won't be able to revert this!",
                                                                            icon: "warning",
                                                                            showCancelButton: true,
                                                                            confirmButtonColor: "#3085d6",
                                                                            cancelButtonColor: "#d33",
                                                                            confirmButtonText: "Yes, delete it!",
                                                                        }).then(async (result) => {
                                                                            if (result.isConfirmed) {
                                                                                try {
                                                                                    await deleteSupervisor(String(supervisor?.id ?? supervisor?._id));
                                                                                    // Refresh supervisors list after deletion
                                                                                    getSupervisors();
                                                                                    await Swal.fire(
                                                                                        "Deleted!",
                                                                                        "The supervisor has been deleted.",
                                                                                        "success"
                                                                                    );
                                                                                } catch (e: any) {
                                                                                    await Swal.fire(
                                                                                        "Delete failed",
                                                                                        e?.response?.data?.message || e?.message || "Unable to delete supervisor.",
                                                                                        "error"
                                                                                    );
                                                                                }
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
                                                                    title="Delete Supervisor"
                                                                >
                                                                    <i className="ri-delete-bin-line"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}      
                        </div>
                        {totalPages > 1 && (
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
                                                        onClick={() => handlePageChange(currentPage - 1)}
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
                                                                onClick={() => handlePageChange(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                    <button 
                                                        className="page-link !text-primary" 
                                                        onClick={() => handlePageChange(currentPage + 1)}
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

            {/* Supervisor Details Modal */}
            {showModal && selectedSupervisor && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-bodybg rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                            <div className="bg-white dark:bg-bodybg px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Supervisor Details</h3>
                                    <button
                                        onClick={closeModal}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedSupervisor?.name || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedSupervisor?.email || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedSupervisor?.role || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Verified</label>
                                        <p className="mt-1">
                                            <span className={`badge ${selectedSupervisor?.isEmailVerified ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                {selectedSupervisor?.isEmailVerified ? 'Verified' : 'Unverified'}
                                            </span>
                                        </p>
                                    </div>
                                    {selectedSupervisor?.createdAt && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Created At</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {new Date(selectedSupervisor.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                    {selectedSupervisor?.updatedAt && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Updated At</label>
                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                {new Date(selectedSupervisor.updatedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-bodybg px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="ti-btn ti-btn-primary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Supervisors;

