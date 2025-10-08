"use client"

import Link from 'next/link'
import { candidateData } from '@/shared/data/pages/candidates/candidatedata'
const Select = dynamic(() => import("react-select"), {ssr : false});
import dynamic from 'next/dynamic';
import Swal from "sweetalert2";
import { useEffect, useState } from 'react';
import { fetchAllCandidates, deleteCandidate } from '@/shared/lib/candidates';

const Candidates = () => {
    const [canData, setCanData] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState<string>('name');
    const [searchValue, setSearchValue] = useState<string>('');
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('personal');

    const getCandidates = async () => {
        try {
            const data = await fetchAllCandidates();
            const normalized = Array.isArray(data)
                ? data
                : (Array.isArray((data as any)?.results)
                    ? (data as any).results
                    : (Array.isArray((data as any)?.data) ? (data as any).data : []));
            setCanData(normalized);
            setFilteredData(normalized);
            console.log(data);
        } catch (err: any) {
            setError("Failed to fetch leads");
        } finally {
            setLoading(false);
        }
    };

    // Filter function
    const applyFilter = () => {
        if (!searchValue.trim()) {
            setFilteredData(canData);
            return;
        }

        const filtered = canData.filter((candidate: any) => {
            const searchTerm = searchValue.toLowerCase().trim();
            
            switch (searchFilter) {
                case 'name':
                    return candidate?.fullName?.toLowerCase().includes(searchTerm);
                case 'email':
                    return candidate?.email?.toLowerCase().includes(searchTerm);
                case 'mobile':
                    return candidate?.phoneNumber?.toLowerCase().includes(searchTerm);
                default:
                    return true;
            }
        });
        
        setFilteredData(filtered);
    };

    // Apply filter when search value or filter type changes
    useEffect(() => {
        applyFilter();
    }, [searchValue, searchFilter, canData]);

    // Function to open candidate details modal
    const openCandidateModal = (candidate: any) => {
        setSelectedCandidate(candidate);
        setShowModal(true);
        setActiveTab('personal');
    };

    // Function to close modal
    const closeModal = () => {
        setShowModal(false);
        setSelectedCandidate(null);
        setActiveTab('personal');
    };

    useEffect(() => {
        getCandidates();
    }, []);

    return (
        <>
            <div className="grid grid-cols-12 gap-x-6 mt-5">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box">
                        <div className="box-header justify-between flex-wrap">
                            <div className="box-title">
                                Candidate List
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <div className="me-1">
                                    <select 
                                        className="ti-form-control form-control-sm w-full me-2 !bg-primary !text-white" 
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                    >
                                        <option value="name">Search by Name</option>
                                        <option value="email">Search by Email</option>
                                        <option value="mobile">Search by Mobile</option>
                                    </select>
                                </div>
                                <div className="me-3">
                                    <input 
                                        className="ti-form-control form-control-sm" 
                                        type="text" 
                                        placeholder={`Search ${searchFilter === 'name' ? 'name' : searchFilter === 'email' ? 'email' : 'mobile'} here`}
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        aria-label="Search input"
                                    />
                                </div>
                                <button type="button" className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium" data-hs-overlay="#create-task">
                                    <i className="ri-add-line font-semibold align-middle"></i> <Link href="/candidates/add">Add Candidate</Link>
                                </button>
                            </div>
                        </div>
                        <div className="box-body">
                            {loading ? (
                                <div>Loading leads...</div>
                            ) : error ? (
                                <div className="text-red-500">{error}</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="text-start">S.No</th>
                                                <th scope="col" className="text-start">Name</th>
                                                <th scope="col" className="text-start">Email</th>
                                                <th scope="col" className="text-start">Mobile</th>
                                                <th scope="col" className="text-start">Bio</th>
                                                <th scope="col" className="text-start">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(Array.isArray(filteredData) ? filteredData : []).map((can, i) => (
                                                <tr 
                                                    className="border border-inherit border-solid hover:bg-gray-100 dark:border-defaultborder/10 dark:hover:bg-light cursor-pointer" 
                                                    key={Math.random()}
                                                    onClick={() => openCandidateModal(can)}
                                                >
                                                    <td>{i+1}</td>
                                                    <td>{can?.fullName}</td>
                                                    <td>
                                                        <div className="flex items-center leading-none">
                                                            <div className="me-2">
                                                                <span className="avatar avatar-md avatar-rounded">
                                                                    <img src={can?.src || "/assets/images/faces/1.jpg"} alt="img" />
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="block font-semibold mb-1">{can?.fullName}</span>
                                                                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">{can?.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className='text-black font-semibold text-[0.75rem]'>{can?.phoneNumber}</span>
                                                    </td>
                                                    <td>
                                                        <span className='text-[#8c9097] dark:text-white/50 text-[0.75rem]'>{can?.shortBio}</span>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-row items-center !gap-2 text-[0.9375rem]" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openCandidateModal(can);
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-success/10 text-success hover:bg-success hover:text-white hover:border-success"
                                                                title="View Details"
                                                            >
                                                                <i className="ri-eye-line"></i>
                                                            </button>
                                                            <Link aria-label="anchor" href={`/candidates/edit?id=${encodeURIComponent(String(can?.id ?? can?._id))}`} scroll={false} className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info">
                                                                <i className="ri-pencil-line"></i>
                                                            </Link>

                                                            <button type="button"
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
                                                                                await deleteCandidate(String(can?.id ?? can?._id));
                                                                                setCanData((prev) => (Array.isArray(prev) ? prev.filter((c: any) => (c?.id ?? c?._id) !== (can?.id ?? can?._id)) : prev));
                                                                                setFilteredData((prev) => (Array.isArray(prev) ? prev.filter((c: any) => (c?.id ?? c?._id) !== (can?.id ?? can?._id)) : prev));
                                                                                await Swal.fire(
                                                                                    "Deleted!",
                                                                                    "The candidate has been deleted.",
                                                                                    "success"
                                                                                );
                                                                            } catch (e: any) {
                                                                                await Swal.fire(
                                                                                    "Delete failed",
                                                                                    e?.message || "Unable to delete candidate.",
                                                                                    "error"
                                                                                );
                                                                            }
                                                                        }
                                                                    });
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger"
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
                        <div className="box-footer">
                            <div className="sm:flex items-center">
                                <div className="text-defaulttextcolor/70">
                                    Showing {canData.length} {canData.length === 1 ? "Entry" : "Entries"}  <i className="bi bi-arrow-right ms-2 font-semibold"></i>
                                </div>
                                <div className="ms-auto">
                                    <nav aria-label="Page navigation" className="pagination-style-4">
                                        <ul className="ti-pagination mb-0">
                                            <li className="page-item disabled">
                                                <Link className="page-link" href="#!" scroll={false}>
                                                    Prev
                                                </Link>
                                            </li>
                                            <li className="page-item"><Link className="page-link active" href="#!" scroll={false}>1</Link></li>
                                            {/* <li className="page-item"><Link className="page-link" href="#!" scroll={false}>2</Link></li> */}
                                            <li className="page-item">
                                                <Link className="page-link !text-primary" href="#!" scroll={false}>
                                                    next
                                                </Link>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Candidate Details Modal */}
            {showModal && selectedCandidate && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-sm mx-auto sm:max-w-2xl md:max-w-4xl lg:max-w-6xl sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="avatar avatar-lg avatar-rounded me-3 flex-shrink-0">
                                            <img src={selectedCandidate?.src || "/assets/images/faces/1.jpg"} alt="Candidate" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {selectedCandidate?.fullName}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidate?.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                                {/* Category tabs */}
                                <div className="border-b border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
                                    <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
                                        {[
                                            { id: 'personal', label: 'Personal Info', icon: 'ri-user-line' },
                                            { id: 'qualification', label: 'Qualification', icon: 'ri-book-line' },
                                            { id: 'experience', label: 'Experience', icon: 'ri-briefcase-line' },
                                            { id: 'skills', label: 'Skills', icon: 'ri-tools-line' },
                                            { id: 'documents', label: 'Documents', icon: 'ri-file-line' },
                                            { id: 'salary', label: 'Salary Slips', icon: 'ri-money-dollar-box-line' },
                                            { id: 'social', label: 'Social Links', icon: 'ri-links-line' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`py-2 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center whitespace-nowrap flex-shrink-0 ${
                                                    activeTab === tab.id
                                                        ? 'border-primary text-primary'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                                }`}
                                            >
                                                <i className={`${tab.icon} me-1 sm:me-2`}></i>
                                                <span className="hidden sm:inline">{tab.label}</span>
                                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </nav>
                                </div>

                                {/* Tab content */}
                                <div className="min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
                                    {activeTab === 'personal' && (
                                        <div className="space-y-4">
                                            <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Personal Information</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.fullName || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.email || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.phoneNumber || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SEVIS ID</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.sevisId || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">EAD</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.ead || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Degree</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.degree || '-'}</p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short Bio</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.shortBio || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'qualification' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Education & Qualifications</h4>
                                            {Array.isArray(selectedCandidate?.qualifications) && selectedCandidate.qualifications.length > 0 ? (
                                                selectedCandidate.qualifications.map((qual: any, index: number) => (
                                                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Education #{index + 1}</h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Degree</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.degree || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Institute</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.institute || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.location || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.startYear || '-'} - {qual?.endYear || '-'}</p>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.description || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No qualifications available</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'experience' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Work Experience</h4>
                                            {Array.isArray(selectedCandidate?.experiences) && selectedCandidate.experiences.length > 0 ? (
                                                selectedCandidate.experiences.map((exp: any, index: number) => (
                                                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Experience #{index + 1}</h5>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.company || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.role || '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.startDate ? String(exp.startDate).slice(0,10) : '-'}</p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.endDate ? String(exp.endDate).slice(0,10) : 'Present'}</p>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.description || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No work experience available</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'skills' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills</h4>
                                            {Array.isArray(selectedCandidate?.skills) && selectedCandidate.skills.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedCandidate.skills.map((skill: any, index: number) => (
                                                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                            {skill?.name}
                                                            {skill?.level && (
                                                                <span className="ml-1 text-xs opacity-75">({skill.level})</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No skills available</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'documents' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Documents</h4>
                                            {Array.isArray(selectedCandidate?.documents) && selectedCandidate.documents.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCandidate.documents.map((doc: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <div className="flex items-center">
                                                                <i className="ri-file-line text-xl text-gray-500 dark:text-gray-400 me-3"></i>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{doc?.label || 'Document'}</p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to view</p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={doc?.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ti-btn ti-btn-sm ti-btn-primary"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                View
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No documents available</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'salary' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Salary Slips</h4>
                                            {Array.isArray(selectedCandidate?.salarySlips) && selectedCandidate.salarySlips.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCandidate.salarySlips.map((slip: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <div className="flex items-center">
                                                                <i className="ri-money-dollar-box-line text-xl text-gray-500 dark:text-gray-400 me-3"></i>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{slip?.month} {slip?.year}</p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Salary Slip</p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={slip?.documentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ti-btn ti-btn-sm ti-btn-primary"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                View
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No salary slips available</p>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'social' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Links</h4>
                                            {Array.isArray(selectedCandidate?.socialLinks) && selectedCandidate.socialLinks.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCandidate.socialLinks.map((link: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <div className="flex items-center">
                                                                <i className="ri-links-line text-xl text-gray-500 dark:text-gray-400 me-3"></i>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{link?.platform}</p>
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{link?.url}</p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={link?.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ti-btn ti-btn-sm ti-btn-primary"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                Visit
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No social links available</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                >
                                    Close
                                </button>
                                <Link
                                    href={`/candidates/edit?id=${encodeURIComponent(String(selectedCandidate?.id ?? selectedCandidate?._id))}`}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto"
                                >
                                    <i className="ri-edit-line me-1"></i>
                                    Edit Profile
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Candidates