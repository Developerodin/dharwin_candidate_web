"use client"

import Link from 'next/link'
import { candidateData } from '@/shared/data/pages/candidates/candidatedata'
const Select = dynamic(() => import("react-select"), {ssr : false});
import dynamic from 'next/dynamic';
import Swal from "sweetalert2";
import { useEffect, useState } from 'react';
import { fetchAllCandidates, deleteCandidate, addCandidateSalarySlips, uploadDocuments, fetchCandidateDocuments, verifyDocument, shareCandidate } from '@/shared/lib/candidates';

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
    const [showSalarySlipModal, setShowSalarySlipModal] = useState<boolean>(false);
    const [selectedCandidateForSalarySlip, setSelectedCandidateForSalarySlip] = useState<any>(null);
    const [salarySlipFile, setSalarySlipFile] = useState<File | null>(null);
    const [salarySlipMonth, setSalarySlipMonth] = useState<string>('');
    const [salarySlipYear, setSalarySlipYear] = useState<string>('');
    const [uploadingSalarySlip, setUploadingSalarySlip] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<string>('user');
    const [showDocumentsModal, setShowDocumentsModal] = useState<boolean>(false);
    const [selectedCandidateForDocuments, setSelectedCandidateForDocuments] = useState<any>(null);
    const [candidateDocuments, setCandidateDocuments] = useState<any[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const [selectedCandidateForShare, setSelectedCandidateForShare] = useState<any>(null);
    const [shareEmail, setShareEmail] = useState<string>('');
    const [shareWithDoc, setShareWithDoc] = useState<boolean>(false);
    const [sharingCandidate, setSharingCandidate] = useState<boolean>(false);

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
        
        // Get user role from localStorage
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

    // Function to open salary slip upload modal
    const openSalarySlipModal = (candidate: any) => {
        setSelectedCandidateForSalarySlip(candidate);
        setShowSalarySlipModal(true);
        setSalarySlipFile(null);
        setSalarySlipMonth('');
        setSalarySlipYear('');
    };

    // Function to close salary slip modal
    const closeSalarySlipModal = () => {
        setShowSalarySlipModal(false);
        setSelectedCandidateForSalarySlip(null);
        setSalarySlipFile(null);
        setSalarySlipMonth('');
        setSalarySlipYear('');
    };

    // Function to open documents modal
    const openDocumentsModal = async (candidate: any) => {
        setSelectedCandidateForDocuments(candidate);
        setShowDocumentsModal(true);
        setLoadingDocuments(true);
        setCandidateDocuments([]);
        
        try {
            const response = await fetchCandidateDocuments(candidate.id || candidate._id);
            
            // Handle the API response structure
            if (response && response.success && response.data && response.data.documents) {
                setCandidateDocuments(Array.isArray(response.data.documents) ? response.data.documents : []);
            } else if (Array.isArray(response)) {
                setCandidateDocuments(response);
            } else {
                setCandidateDocuments([]);
            }
        } catch (error: any) {
            console.error('Error fetching documents:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to fetch candidate documents. Please try again.',
                confirmButtonText: 'OK'
            });
            setCandidateDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    };

    // Function to close documents modal
    const closeDocumentsModal = () => {
        setShowDocumentsModal(false);
        setSelectedCandidateForDocuments(null);
        setCandidateDocuments([]);
        setLoadingDocuments(false);
    };

    // Function to open share modal
    const openShareModal = (candidate: any) => {
        setSelectedCandidateForShare(candidate);
        setShowShareModal(true);
        setShareEmail('');
        setShareWithDoc(false);
    };

    // Function to close share modal
    const closeShareModal = () => {
        setShowShareModal(false);
        setSelectedCandidateForShare(null);
        setShareEmail('');
        setShareWithDoc(false);
        setSharingCandidate(false);
    };

    // Function to handle share candidate
    const handleShareCandidate = async () => {
        if (!shareEmail.trim()) {
            await Swal.fire({
                icon: 'warning',
                title: 'Email Required',
                text: 'Please enter an email address.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(shareEmail.trim())) {
            await Swal.fire({
                icon: 'warning',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setSharingCandidate(true);

            const candidateId = selectedCandidateForShare?.id || selectedCandidateForShare?._id;
            await shareCandidate(candidateId, {
                email: shareEmail.trim(),
                withDoc: shareWithDoc
            });

            await Swal.fire({
                icon: 'success',
                title: 'Candidate Shared!',
                text: `Candidate profile has been shared with ${shareEmail}.`,
                confirmButtonText: 'OK'
            });

            closeShareModal();
        } catch (error: any) {
            console.error('Share candidate error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Share Failed',
                text: error?.message || 'Failed to share candidate. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setSharingCandidate(false);
        }
    };

    // Function to handle document verification
    const handleDocumentVerification = async (doc: any, index: number, status: number) => {
        try {
            const candidateId = selectedCandidateForDocuments?.id || selectedCandidateForDocuments?._id;
            
            // Call the verify document API
            await verifyDocument(candidateId, index, status);
            
            // Update the local state
            setCandidateDocuments(prevDocs => 
                prevDocs.map((document, docIndex) => 
                    docIndex === index 
                        ? { ...document, status: status }
                        : document
                )
            );
            
            const statusText = status === 1 ? 'verified' : 'rejected';
            await Swal.fire({
                icon: 'success',
                title: 'Document Status Updated!',
                text: `Document has been ${statusText}.`,
                confirmButtonText: 'OK'
            });
        } catch (error: any) {
            console.error('Verification error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Verification Failed',
                text: error?.message || 'Failed to update document status. Please try again.',
                confirmButtonText: 'OK'
            });
        }
    };


    // Function to handle salary slip upload
    const handleSalarySlipUpload = async () => {
        if (!salarySlipFile || !salarySlipMonth || !salarySlipYear) {
            await Swal.fire({
                icon: 'warning',
                title: 'Missing Information',
                text: 'Please select a file, month, and year.',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setUploadingSalarySlip(true);

            // Upload the file first
            const uploadResponse = await uploadDocuments([salarySlipFile], ['Salary Slip']);
            
            if (uploadResponse.success && uploadResponse.data && uploadResponse.data.length > 0) {
                const fileData = uploadResponse.data[0];
                
                // Prepare salary slip data
                const salarySlipData = {
                    month: salarySlipMonth,
                    year: parseInt(salarySlipYear),
                    documentUrl: fileData.url,
                    key: fileData.key,
                    originalName: fileData.originalName,
                    size: fileData.size,
                    mimeType: fileData.mimeType
                };

                // Add salary slip to candidate
                await addCandidateSalarySlips(selectedCandidateForSalarySlip.id || selectedCandidateForSalarySlip._id, salarySlipData);

                await Swal.fire({
                    icon: 'success',
                    title: 'Salary Slip Uploaded!',
                    text: 'Salary slip has been successfully uploaded.',
                    confirmButtonText: 'OK'
                });

                closeSalarySlipModal();
                getCandidates(); // Refresh the candidates list
            } else {
                throw new Error('File upload failed');
            }
        } catch (error: any) {
            console.error('Salary slip upload error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Upload Failed',
                text: error?.message || 'Failed to upload salary slip. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setUploadingSalarySlip(false);
        }
    };

    // Export candidates function
    const exportCandidates = async () => {
        try {
            // Dynamic import of xlsx library
            const XLSX = await import('xlsx');
            
            // Create workbook
            const workbook = XLSX.utils.book_new();
            
            // 1. Personal Info Sheet
            const personalInfoData = [
                ['FullName', 'Email', 'PhoneNumber', 'CountryCode', 'ShortBio', 'SevisId', 'Ead', 'Degree', 'VisaType', 'CustomVisaType', 'SalaryRange', 'SupervisorName', 'SupervisorContact', 'SupervisorCountryCode', 'StreetAddress', 'StreetAddress2', 'City', 'State', 'ZipCode', 'Country']
            ];
            
            canData.forEach((candidate: any) => {
                personalInfoData.push([
                    candidate?.fullName || '',
                    candidate?.email || '',
                    candidate?.phoneNumber || '',
                    candidate?.countryCode || '',
                    candidate?.shortBio || '',
                    candidate?.sevisId || '',
                    candidate?.ead || '',
                    candidate?.degree || '',
                    candidate?.visaType || '',
                    candidate?.customVisaType || '',
                    candidate?.salaryRange || '',
                    candidate?.supervisorName || '',
                    candidate?.supervisorContact || '',
                    candidate?.supervisorCountryCode || '',
                    candidate?.address?.streetAddress || '',
                    candidate?.address?.streetAddress2 || '',
                    candidate?.address?.city || '',
                    candidate?.address?.state || '',
                    candidate?.address?.zipCode || '',
                    candidate?.address?.country || ''
                ]);
            });
            
            const personalInfoSheet = XLSX.utils.aoa_to_sheet(personalInfoData);
            XLSX.utils.book_append_sheet(workbook, personalInfoSheet, 'Personal Info');
            
            // 2. Social Links Sheet
            const socialLinksData = [
                ['FullName', 'Platform', 'URL']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.socialLinks) && candidate.socialLinks.length > 0) {
                    candidate.socialLinks.forEach((link: any) => {
                        socialLinksData.push([
                            candidate?.fullName || '',
                            link?.platform || '',
                            link?.url || ''
                        ]);
                    });
                }
            });
            
            const socialLinksSheet = XLSX.utils.aoa_to_sheet(socialLinksData);
            XLSX.utils.book_append_sheet(workbook, socialLinksSheet, 'Social Links');
            
            // 3. Skills Sheet
            const skillsData = [
                ['FullName', 'SkillName', 'Level', 'Category']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.skills) && candidate.skills.length > 0) {
                    candidate.skills.forEach((skill: any) => {
                        skillsData.push([
                            candidate?.fullName || '',
                            skill?.name || '',
                            skill?.level || '',
                            skill?.category || ''
                        ]);
                    });
                }
            });
            
            const skillsSheet = XLSX.utils.aoa_to_sheet(skillsData);
            XLSX.utils.book_append_sheet(workbook, skillsSheet, 'Skills');
            
            // 4. Qualification Sheet
            const qualificationData = [
                ['FullName', 'Degree', 'Institute', 'Location', 'StartYear', 'EndYear', 'Description']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.qualifications) && candidate.qualifications.length > 0) {
                    candidate.qualifications.forEach((qual: any) => {
                        qualificationData.push([
                            candidate?.fullName || '',
                            qual?.degree || '',
                            qual?.institute || '',
                            qual?.location || '',
                            qual?.startYear || '',
                            qual?.endYear || '',
                            qual?.description || ''
                        ]);
                    });
                }
            });
            
            const qualificationSheet = XLSX.utils.aoa_to_sheet(qualificationData);
            XLSX.utils.book_append_sheet(workbook, qualificationSheet, 'Qualification');
            
            // 5. Work Experience Sheet
            const workExperienceData = [
                ['FullName', 'Company', 'Role', 'StartDate', 'EndDate', 'CurrentlyWorking', 'Description']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.experiences) && candidate.experiences.length > 0) {
                    candidate.experiences.forEach((exp: any) => {
                        workExperienceData.push([
                            candidate?.fullName || '',
                            exp?.company || '',
                            exp?.role || '',
                            exp?.startDate ? String(exp.startDate).slice(0,10) : '',
                            exp?.endDate ? String(exp.endDate).slice(0,10) : (exp?.currentlyWorking ? 'Present' : ''),
                            exp?.currentlyWorking ? 'Yes' : 'No',
                            exp?.description || ''
                        ]);
                    });
                }
            });
            
            const workExperienceSheet = XLSX.utils.aoa_to_sheet(workExperienceData);
            XLSX.utils.book_append_sheet(workbook, workExperienceSheet, 'Work Experience');
            
            // 6. Documents Sheet
            const documentsData = [
                ['FullName', 'DocumentLabel', 'DocumentURL', 'DocumentType']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.documents) && candidate.documents.length > 0) {
                    candidate.documents.forEach((doc: any) => {
                        documentsData.push([
                            candidate?.fullName || '',
                            doc?.label || 'Document',
                            doc?.url || doc?.documentUrl || '',
                            doc?.type || 'Document'
                        ]);
                    });
                }
            });
            
            const documentsSheet = XLSX.utils.aoa_to_sheet(documentsData);
            XLSX.utils.book_append_sheet(workbook, documentsSheet, 'Documents');
            
            // 7. Salary Slips Sheet
            const salarySlipsData = [
                ['FullName', 'Month', 'Year', 'DocumentURL', 'DocumentType']
            ];
            
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate?.salarySlips) && candidate.salarySlips.length > 0) {
                    candidate.salarySlips.forEach((slip: any) => {
                        salarySlipsData.push([
                            candidate?.fullName || '',
                            slip?.month || '',
                            slip?.year || '',
                            slip?.documentUrl || slip?.url || '',
                            slip?.type || 'Salary Slip'
                        ]);
                    });
                }
            });
            
            const salarySlipsSheet = XLSX.utils.aoa_to_sheet(salarySlipsData);
            XLSX.utils.book_append_sheet(workbook, salarySlipsSheet, 'Salary Slips');
            
            // Generate and download file
            const fileName = `Candidates_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            await Swal.fire({
                icon: 'success',
                title: 'Export Successful!',
                text: `Successfully exported ${canData.length} candidates to Excel file.`,
                confirmButtonText: 'OK'
            });
        } catch (error) {
            console.error('Export error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Export Failed',
                text: 'Failed to export candidates. Please try again.',
                confirmButtonText: 'OK'
            });
        }
    };

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
                                <button 
                                    type="button" 
                                    onClick={exportCandidates}
                                    className="ti-btn ti-btn-success !bg-success !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium me-2"
                                >
                                    <i className="ri-download-line font-semibold align-middle"></i> Export Candidates
                                </button>
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
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDocumentsModal(can);
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-secondary/10 text-secondary hover:bg-secondary hover:text-white hover:border-secondary"
                                                                title="View Documents"
                                                            >
                                                                <i className="ri-file-list-line"></i>
                                                            </button>
                                                            {userRole === 'admin' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openSalarySlipModal(can);
                                                                    }}
                                                                    className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-warning/10 text-warning hover:bg-warning hover:text-white hover:border-warning"
                                                                    title="Upload Salary Slip"
                                                                >
                                                                    <i className="ri-file-add-line"></i>
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openShareModal(can);
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-primary/10 text-primary hover:bg-primary hover:text-white hover:border-primary"
                                                                title="Share Candidate"
                                                            >
                                                                <i className="ri-share-line"></i>
                                                            </button>

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
                                            <img 
                                                src={
                                                    selectedCandidate?.profilePicture?.url || 
                                                    selectedCandidate?.src || 
                                                    "/assets/images/faces/1.jpg"
                                                } 
                                                alt={selectedCandidate?.fullName || "Candidate"} 
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = "/assets/images/faces/1.jpg";
                                                }}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {selectedCandidate?.fullName}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidate?.email}
                                            </p>
                                            {selectedCandidate?.shortBio && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">
                                                    {selectedCandidate.shortBio}
                                                </p>
                                            )}
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
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country Code</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.countryCode || '-'}</p>
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
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Visa Type</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.visaType || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Visa Type</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.customVisaType || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Salary Range</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.salaryRange || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor Name</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.supervisorName || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor Contact</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.supervisorContact || '-'}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supervisor Country Code</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.supervisorCountryCode || '-'}</p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Short Bio</label>
                                                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.shortBio || '-'}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Address Information */}
                                            {selectedCandidate?.address && (
                                                <div className="mt-6">
                                                    <h5 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Address Information</h5>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.streetAddress || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Street Address 2</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.streetAddress2 || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.city || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.state || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zip Code</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.zipCode || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                                                            <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedCandidate?.address?.country || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
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
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                                    {qual?.startYear ? String(qual.startYear) : '-'} - {qual?.endYear ? String(qual.endYear) : 'Present'}
                                                                </p>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{qual?.description || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-book-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Qualifications Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any educational qualifications listed yet.
                                                    </p>
                                                </div>
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
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                                    {exp?.startDate ? new Date(exp.startDate).toLocaleDateString() : '-'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                                                    {exp?.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
                                                                </p>
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                                                                <p className="mt-1 text-sm text-gray-900 dark:text-white">{exp?.description || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-briefcase-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Work Experience Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any work experience listed yet.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'skills' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skills</h4>
                                            {Array.isArray(selectedCandidate?.skills) && selectedCandidate.skills.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCandidate.skills.map((skill: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <div className="flex items-center">
                                                                <i className="ri-tools-line text-xl text-gray-500 dark:text-gray-400 me-3"></i>
                                                                <div>
                                                                    <p className="font-medium text-gray-900 dark:text-white">{skill?.name || `Skill ${index + 1}`}</p>
                                                                    {skill?.category && (
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Category: {skill.category}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {skill?.level && (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                    {skill.level}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-tools-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Skills Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any skills listed yet.
                                                    </p>
                                                </div>
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
                                                            <div className="flex items-center flex-1 min-w-0">
                                                                <div className="flex-shrink-0 me-3">
                                                                    {doc?.mimeType?.includes('image') ? (
                                                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                                                            <img 
                                                                                src={doc?.url || doc?.documentUrl} 
                                                                                alt={doc?.label || doc?.originalName}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => {
                                                                                    const target = e.target as HTMLImageElement;
                                                                                    target.style.display = 'none';
                                                                                    target.nextElementSibling?.classList.remove('hidden');
                                                                                }}
                                                                            />
                                                                            <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hidden">
                                                                                <i className="ri-image-line text-xl text-gray-500"></i>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                                            {doc?.mimeType?.includes('pdf') ? (
                                                                                <i className="ri-file-pdf-line text-xl text-red-500"></i>
                                                                            ) : doc?.mimeType?.includes('word') || doc?.mimeType?.includes('document') ? (
                                                                                <i className="ri-file-word-line text-xl text-blue-600"></i>
                                                                            ) : doc?.mimeType?.includes('excel') || doc?.mimeType?.includes('spreadsheet') ? (
                                                                                <i className="ri-file-excel-line text-xl text-green-600"></i>
                                                                            ) : (
                                                                                <i className="ri-file-line text-xl text-gray-500 dark:text-gray-400"></i>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 dark:text-white truncate">
                                                                        {doc?.label || doc?.originalName || `Document ${index + 1}`}
                                                                    </p>
                                                                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        {doc?.size && (
                                                                            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                        )}
                                                                        {doc?.mimeType && (
                                                                            <span>• {doc.mimeType.split('/')[1]?.toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={doc?.url || doc?.documentUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ti-btn ti-btn-sm ti-btn-primary flex-shrink-0"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                View
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-file-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any documents uploaded yet.
                                                    </p>
                                                </div>
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
                                                            <div className="flex items-center flex-1 min-w-0">
                                                                <div className="flex-shrink-0 me-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center border border-green-200 dark:border-green-600">
                                                                        <i className="ri-money-dollar-box-line text-xl text-green-600 dark:text-green-400"></i>
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                                        {slip?.month} {slip?.year}
                                                                    </p>
                                                                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                        <span>Salary Slip</span>
                                                                        {slip?.size && (
                                                                            <span>• {(slip.size / 1024 / 1024).toFixed(2)} MB</span>
                                                                        )}
                                                                        {slip?.mimeType && (
                                                                            <span>• {slip.mimeType.split('/')[1]?.toUpperCase()}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={slip?.documentUrl || slip?.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="ti-btn ti-btn-sm ti-btn-primary flex-shrink-0"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                View
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-money-dollar-box-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Salary Slips Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any salary slips uploaded yet.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'social' && (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Links</h4>
                                            {Array.isArray(selectedCandidate?.socialLinks) && selectedCandidate.socialLinks.length > 0 ? (
                                                <div className="space-y-3">
                                                    {selectedCandidate.socialLinks.map((link: any, index: number) => {
                                                        const getPlatformIcon = (platform: string) => {
                                                            const platformLower = platform?.toLowerCase() || '';
                                                            if (platformLower.includes('linkedin')) return 'ri-linkedin-line';
                                                            if (platformLower.includes('github')) return 'ri-github-line';
                                                            if (platformLower.includes('twitter')) return 'ri-twitter-line';
                                                            if (platformLower.includes('facebook')) return 'ri-facebook-line';
                                                            if (platformLower.includes('instagram')) return 'ri-instagram-line';
                                                            if (platformLower.includes('youtube')) return 'ri-youtube-line';
                                                            return 'ri-links-line';
                                                        };

                                                        const getPlatformColor = (platform: string) => {
                                                            const platformLower = platform?.toLowerCase() || '';
                                                            if (platformLower.includes('linkedin')) return 'text-blue-600';
                                                            if (platformLower.includes('github')) return 'text-gray-800 dark:text-gray-200';
                                                            if (platformLower.includes('twitter')) return 'text-blue-400';
                                                            if (platformLower.includes('facebook')) return 'text-blue-600';
                                                            if (platformLower.includes('instagram')) return 'text-pink-500';
                                                            if (platformLower.includes('youtube')) return 'text-red-500';
                                                            return 'text-gray-500 dark:text-gray-400';
                                                        };

                                                        return (
                                                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                                <div className="flex items-center flex-1 min-w-0">
                                                                    <div className="flex-shrink-0 me-3">
                                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                                            <i className={`${getPlatformIcon(link?.platform)} text-xl ${getPlatformColor(link?.platform)}`}></i>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                                            {link?.platform || `Social Link ${index + 1}`}
                                                                        </p>
                                                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                                            {link?.url}
                                                                        </p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={link?.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                    className="ti-btn ti-btn-sm ti-btn-primary flex-shrink-0"
                                                            >
                                                                <i className="ri-external-link-line me-1"></i>
                                                                Visit
                                                            </a>
                                                        </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <i className="ri-links-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Social Links Found</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any social media links listed yet.
                                                    </p>
                                                </div>
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

            {/* Salary Slip Upload Modal - Admin Only */}
            {showSalarySlipModal && selectedCandidateForSalarySlip && userRole === 'admin' && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeSalarySlipModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:max-w-lg sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Upload Salary Slip
                                    </h3>
                                    <button
                                        onClick={closeSalarySlipModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Upload salary slip for {selectedCandidateForSalarySlip?.fullName}
                                </p>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    {/* Month Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Month <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={salarySlipMonth}
                                            onChange={(e) => setSalarySlipMonth(e.target.value)}
                                            className="form-control w-full"
                                            required
                                        >
                                            <option value="">Select Month</option>
                                            <option value="January">January</option>
                                            <option value="February">February</option>
                                            <option value="March">March</option>
                                            <option value="April">April</option>
                                            <option value="May">May</option>
                                            <option value="June">June</option>
                                            <option value="July">July</option>
                                            <option value="August">August</option>
                                            <option value="September">September</option>
                                            <option value="October">October</option>
                                            <option value="November">November</option>
                                            <option value="December">December</option>
                                        </select>
                                    </div>

                                    {/* Year Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Year <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={salarySlipYear}
                                            onChange={(e) => setSalarySlipYear(e.target.value)}
                                            className="form-control w-full"
                                            required
                                        >
                                            <option value="">Select Year</option>
                                            {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => {
                                                const year = new Date().getFullYear() - i;
                                                return (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    {/* File Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Salary Slip File <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                            onChange={(e) => setSalarySlipFile(e.target.files?.[0] || null)}
                                            className="form-control w-full"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Supported formats: PDF, JPG, PNG, DOC, DOCX
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeSalarySlipModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={uploadingSalarySlip}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSalarySlipUpload}
                                    disabled={uploadingSalarySlip || !salarySlipFile || !salarySlipMonth || !salarySlipYear}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploadingSalarySlip ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-upload-line me-1"></i>
                                            Upload Salary Slip
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Documents Modal */}
            {showDocumentsModal && selectedCandidateForDocuments && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDocumentsModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-xs mx-auto sm:max-w-2xl md:max-w-4xl lg:max-w-5xl sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="avatar avatar-md sm:avatar-lg avatar-rounded me-2 sm:me-3 flex-shrink-0">
                                            <img src={selectedCandidateForDocuments?.src || "/assets/images/faces/1.jpg"} alt="Candidate" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                {selectedCandidateForDocuments?.fullName} - Documents
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidateForDocuments?.email}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeDocumentsModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                                    >
                                        <i className="ri-close-line text-lg sm:text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-3 sm:px-6 py-3 sm:py-6">
                                {loadingDocuments ? (
                                    <div className="flex items-center justify-center py-8">
                                        <div className="flex items-center">
                                            <i className="ri-loader-4-line animate-spin text-2xl text-primary me-2"></i>
                                            <span className="text-gray-600 dark:text-gray-300">Loading documents...</span>
                                        </div>
                                    </div>
                                ) : candidateDocuments.length > 0 ? (
                                    <div className="space-y-3 sm:space-y-4">
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Candidate Documents ({candidateDocuments.length})</h4>
                                        <div className="space-y-2 sm:space-y-3">
                                            {candidateDocuments.map((doc: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                    <div className="flex items-center flex-1 min-w-0">
                                                        <div className="flex-shrink-0 me-2 sm:me-3">
                                                            {doc?.mimeType?.includes('image') ? (
                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                                                                    <img 
                                                                        src={doc?.url || doc?.documentUrl} 
                                                                        alt={doc?.label || doc?.originalName}
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = 'none';
                                                                            target.nextElementSibling?.classList.remove('hidden');
                                                                        }}
                                                                    />
                                                                    <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center hidden">
                                                                        <i className="ri-image-line text-xl text-gray-500"></i>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                                    {doc?.mimeType?.includes('pdf') ? (
                                                                        <i className="ri-file-pdf-line text-xl sm:text-2xl text-red-500"></i>
                                                                    ) : doc?.mimeType?.includes('word') || doc?.mimeType?.includes('document') ? (
                                                                        <i className="ri-file-word-line text-xl sm:text-2xl text-blue-600"></i>
                                                                    ) : doc?.mimeType?.includes('excel') || doc?.mimeType?.includes('spreadsheet') ? (
                                                                        <i className="ri-file-excel-line text-xl sm:text-2xl text-green-600"></i>
                                                                    ) : (
                                                                        <i className="ri-file-line text-xl sm:text-2xl text-gray-500 dark:text-gray-400"></i>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 dark:text-white truncate text-xs sm:text-sm">
                                                                {doc?.label || doc?.originalName || `Document ${index + 1}`}
                                                            </p>
                                                            <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                {doc?.status !== undefined && (
                                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                                                                        doc.status === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                                                        doc.status === 1 ? 'bg-green-100 text-green-800' : 
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {doc.status === 0 ? 'Pending' : doc.status === 1 ? 'Verified' : 'Rejected'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleDocumentVerification(doc, index, 1)}
                                                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-success !w-7 !h-7 sm:!w-8 sm:!h-8 !p-0"
                                                            title="Verify document"
                                                        >
                                                            <i className="ri-check-line text-sm sm:text-base"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDocumentVerification(doc, index, 2)}
                                                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-danger !w-7 !h-7 sm:!w-8 sm:!h-8 !p-0"
                                                            title="Reject document"
                                                        >
                                                            <i className="ri-close-line text-sm sm:text-base"></i>
                                                        </button>
                                                        <a
                                                            href={doc?.url || doc?.documentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ti-btn ti-btn-icon ti-btn-sm ti-btn-primary !w-7 !h-7 sm:!w-8 sm:!h-8 !p-0"
                                                            title="View document"
                                                        >
                                                            <i className="ri-external-link-line text-sm sm:text-base"></i>
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <i className="ri-file-list-line text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Documents Found</h4>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            This candidate doesn't have any documents uploaded yet.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-3 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeDocumentsModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto text-sm sm:text-base"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Candidate Modal */}
            {showShareModal && selectedCandidateForShare && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeShareModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:max-w-lg sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="avatar avatar-md avatar-rounded me-3 flex-shrink-0">
                                            <img src={selectedCandidateForShare?.src || "/assets/images/faces/1.jpg"} alt="Candidate" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                Share Candidate Profile
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidateForShare?.fullName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeShareModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    {/* Email Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={shareEmail}
                                            onChange={(e) => setShareEmail(e.target.value)}
                                            className="form-control w-full"
                                            placeholder="Enter email address to share with"
                                            required
                                        />
                                    </div>

                                    {/* Toggle for with/without documents */}
                                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div className="flex items-center">
                                            <i className="ri-file-list-line text-xl text-gray-500 dark:text-gray-400 me-3"></i>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Include Documents</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {shareWithDoc ? 'Documents will be included' : 'Only profile information will be shared'}
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={shareWithDoc}
                                                onChange={(e) => setShareWithDoc(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {/* Share preview */}
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            <strong>Share Preview:</strong> {selectedCandidateForShare?.fullName}'s profile 
                                            {shareWithDoc ? ' with documents' : ' without documents'} will be shared with {shareEmail || 'the specified email'}.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeShareModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={sharingCandidate}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleShareCandidate}
                                    disabled={sharingCandidate || !shareEmail.trim()}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sharingCandidate ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Sharing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-share-line me-1"></i>
                                            Share Candidate
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Candidates