"use client"

import Link from 'next/link'
import { candidateData } from '@/shared/data/pages/candidates/candidatedata'
const Select = dynamic(() => import("react-select"), {ssr : false});
import dynamic from 'next/dynamic';
import Swal from "sweetalert2";
import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchAllCandidates, deleteCandidate, addCandidateSalarySlips, uploadDocuments, fetchCandidateDocuments, verifyDocument, shareCandidate, getAttendanceByCandidate, resendEmailVerification, addNoteToCandidate, addFeedbackToCandidate, fetchCandidateById, fetchUserById, punchInAttendance, punchOutAttendance, updateCandidateJoiningDate, updateCandidateResignDate } from '@/shared/lib/candidates';
import { getAllHolidays } from '@/shared/lib/holidays';
import { getShiftById } from '@/shared/lib/shifts';
import * as XLSX from 'xlsx';
import { canAccessButton, ButtonPermissions, getNavigationFromStorage } from '@/shared/lib/navigation-permissions';

const Candidates = () => {
    const [canData, setCanData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Basic search filters
    const [searchFilter, setSearchFilter] = useState<string>('name');
    const [searchValue, setSearchValue] = useState<string>('');
    
    // Advanced filters
    const [skills, setSkills] = useState<string>('');
    const [skillLevel, setSkillLevel] = useState<string>('');
    const [skillMatchMode, setSkillMatchMode] = useState<'all' | 'any'>('any');
    const [experienceLevel, setExperienceLevel] = useState<string>('');
    const [minYearsOfExperience, setMinYearsOfExperience] = useState<string>('');
    const [maxYearsOfExperience, setMaxYearsOfExperience] = useState<string>('');
    const [location, setLocation] = useState<string>('');
    const [city, setCity] = useState<string>('');
    const [state, setState] = useState<string>('');
    const [country, setCountry] = useState<string>('');
    const [degree, setDegree] = useState<string>('');
    const [visaType, setVisaType] = useState<string>('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [sortBy, setSortBy] = useState<string>('createdAt:desc');
    
    // UI state
    const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
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
    const [navigation, setNavigation] = useState<any>(null);
    const [showDocumentsModal, setShowDocumentsModal] = useState<boolean>(false);
    const [selectedCandidateForDocuments, setSelectedCandidateForDocuments] = useState<any>(null);
    const [candidateDocuments, setCandidateDocuments] = useState<any[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState<boolean>(false);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const [selectedCandidateForShare, setSelectedCandidateForShare] = useState<any>(null);
    const [shareEmail, setShareEmail] = useState<string>('');
    const [shareWithDoc, setShareWithDoc] = useState<boolean>(false);
    const [sharingCandidate, setSharingCandidate] = useState<boolean>(false);
    const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
    const [selectedCandidateForAttendance, setSelectedCandidateForAttendance] = useState<any>(null);
    const [candidateAttendance, setCandidateAttendance] = useState<any[]>([]);
    const [loadingAttendanceData, setLoadingAttendanceData] = useState<boolean>(false);
    const [candidateHolidaysByDate, setCandidateHolidaysByDate] = useState<Record<string, { title: string; date: string }>>({});
    const [shiftData, setShiftData] = useState<any>(null);
    const [loadingShiftData, setLoadingShiftData] = useState<boolean>(false);
    
    // Attendance calendar filters
    const [attendanceYear, setAttendanceYear] = useState<number>(new Date().getFullYear());
    const [attendanceMonth, setAttendanceMonth] = useState<number>(new Date().getMonth());
    const [showAdvancedFilter, setShowAdvancedFilter] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
    const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState<any>(null);
    const [noteText, setNoteText] = useState<string>('');
    const [feedbackText, setFeedbackText] = useState<string>('');
    const [feedbackRating, setFeedbackRating] = useState<number>(5);
    const [addingNote, setAddingNote] = useState<boolean>(false);
    const [addingFeedback, setAddingFeedback] = useState<boolean>(false);
    const [recruiterDetails, setRecruiterDetails] = useState<Record<string, { name: string; email: string }>>({});
    
    // Back-date attendance state
    const [showBackDateAttendanceModal, setShowBackDateAttendanceModal] = useState<boolean>(false);
    const [backDateEntries, setBackDateEntries] = useState<Array<{
        date: string;
        punchInTime: string;
        punchOutTime: string;
        notes: string;
        timezone: string;
    }>>([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: 'UTC' }]);
    const [addingBackDateAttendance, setAddingBackDateAttendance] = useState<boolean>(false);
    const excelFileInputRef = useRef<HTMLInputElement>(null);
    
    // Joining date and resign date state
    const [showJoiningDateModal, setShowJoiningDateModal] = useState<boolean>(false);
    const [showResignDateModal, setShowResignDateModal] = useState<boolean>(false);
    const [joiningDateInput, setJoiningDateInput] = useState<string>('');
    const [resignDateInput, setResignDateInput] = useState<string>('');
    const [updatingJoiningDate, setUpdatingJoiningDate] = useState<boolean>(false);
    const [updatingResignDate, setUpdatingResignDate] = useState<boolean>(false);

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
                params.fullName = searchValue.trim();
            } else if (searchFilter === 'email') {
                params.email = searchValue.trim();
            } else if (searchFilter === 'employeeId') {
                params.employeeId = searchValue.trim();
            }
        }

        // Advanced filters
        if (skills.trim()) {
            // Split comma-separated skills
            const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
            if (skillsArray.length > 0) {
                params.skills = skillsArray;
            }
        }
        if (skillLevel) params.skillLevel = skillLevel;
        if (skillMatchMode) params.skillMatchMode = skillMatchMode;
        if (experienceLevel) params.experienceLevel = experienceLevel;
        if (minYearsOfExperience) params.minYearsOfExperience = parseInt(minYearsOfExperience);
        if (maxYearsOfExperience) params.maxYearsOfExperience = parseInt(maxYearsOfExperience);
        if (location.trim()) params.location = location.trim();
        if (city.trim()) params.city = city.trim();
        if (state.trim()) params.state = state.trim();
        if (country.trim()) params.country = country.trim();
        if (degree.trim()) params.degree = degree.trim();
        if (visaType.trim()) params.visaType = visaType.trim();

        return params;
    };

    const getCandidates = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = buildFilterParams();
            const data = await fetchAllCandidates(params);
            
            // Handle API response structure
            if (data && data.results) {
                setCanData(data.results);
                setTotalPages(data.totalPages || 1);
                setTotalResults(data.totalResults || 0);
            } else if (Array.isArray(data)) {
                setCanData(data);
                setTotalPages(1);
                setTotalResults(data.length);
            } else {
                setCanData([]);
                setTotalPages(1);
                setTotalResults(0);
            }
        } catch (err: any) {
            setError(err?.message || "Failed to fetch candidates");
            setCanData([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, sortBy, searchValue, searchFilter, skills, skillLevel, skillMatchMode, experienceLevel, minYearsOfExperience, maxYearsOfExperience, location, city, state, country, degree, visaType]);

    // Fetch candidates when filters change
    useEffect(() => {
        getCandidates();
    }, [getCandidates]);

    // Fetch recruiter details for notes
    useEffect(() => {
        const fetchRecruiterDetails = async () => {
            const recruiterIds = new Set<string>();
            
            // Collect all unique recruiter IDs from notes
            canData.forEach((candidate: any) => {
                if (Array.isArray(candidate.recruiterNotes)) {
                    candidate.recruiterNotes.forEach((note: any) => {
                        const recruiterId = typeof note.addedBy === 'string' ? note.addedBy : note.addedBy?.id || note.addedBy?._id;
                        if (recruiterId) {
                            recruiterIds.add(recruiterId);
                        }
                    });
                }
            });

            // Filter out IDs we already have
            const idsToFetch = Array.from(recruiterIds).filter(id => !recruiterDetails[id]);

            if (idsToFetch.length === 0) return;

            // Fetch details for all unique recruiter IDs
            const fetchPromises = idsToFetch.map(async (recruiterId) => {
                try {
                    const userData = await fetchUserById(recruiterId);
                    return {
                        id: recruiterId,
                        name: userData?.name || userData?.fullName || 'Unknown',
                        email: userData?.email || 'N/A'
                    };
                } catch (error) {
                    console.warn(`Failed to fetch recruiter ${recruiterId}:`, error);
                    return {
                        id: recruiterId,
                        name: 'Unknown',
                        email: 'N/A'
                    };
                }
            });

            const results = await Promise.all(fetchPromises);
            const newRecruiterDetails: Record<string, { name: string; email: string }> = {};
            results.forEach((result) => {
                newRecruiterDetails[result.id] = { name: result.name, email: result.email };
            });

            if (Object.keys(newRecruiterDetails).length > 0) {
                setRecruiterDetails((prev) => ({ ...prev, ...newRecruiterDetails }));
            }
        };

        if (canData.length > 0) {
            fetchRecruiterDetails();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canData]);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                getCandidates();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchValue, searchFilter]);

    // Helper function to truncate text to 200 words
    const truncateToWords = (text: string | null | undefined, maxWords: number = 50): string => {
        if (!text) return '';
        const words = text.trim().split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }
        return words.slice(0, maxWords).join(' ') + '...';
    };

    // Function to open candidate details modal
    const openCandidateModal = async (candidate: any) => {
        setSelectedCandidate(candidate);
        setShowModal(true);
        setActiveTab('personal');
        
        // Fetch recruiter details for this candidate's notes
        if (Array.isArray(candidate.recruiterNotes) && candidate.recruiterNotes.length > 0) {
            const recruiterIds = candidate.recruiterNotes
                .map((note: any) => {
                    const recruiterId = typeof note.addedBy === 'string' ? note.addedBy : note.addedBy?.id || note.addedBy?._id;
                    return recruiterId;
                })
                .filter((id: string | undefined) => id && !recruiterDetails[id]);
            
            if (recruiterIds.length > 0) {
                const fetchPromises = recruiterIds.map(async (recruiterId: string) => {
                    try {
                        const userData = await fetchUserById(recruiterId);
                        return {
                            id: recruiterId,
                            name: userData?.name || userData?.fullName || 'Unknown',
                            email: userData?.email || 'N/A'
                        };
                    } catch (error) {
                        console.warn(`Failed to fetch recruiter ${recruiterId}:`, error);
                        return {
                            id: recruiterId,
                            name: 'Unknown',
                            email: 'N/A'
                        };
                    }
                });

                const results = await Promise.all(fetchPromises);
                const newRecruiterDetails: Record<string, { name: string; email: string }> = {};
                results.forEach((result) => {
                    newRecruiterDetails[result.id] = { name: result.name, email: result.email };
                });

                if (Object.keys(newRecruiterDetails).length > 0) {
                    setRecruiterDetails((prev) => ({ ...prev, ...newRecruiterDetails }));
                }
            }
        }
    };

    // Function to close modal
    const closeModal = () => {
        setShowModal(false);
        setSelectedCandidate(null);
        setActiveTab('personal');
    };

    // Get user role and navigation from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    setUserRole(parsedUser.role || 'user');
                    setNavigation(parsedUser.navigation || null);
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    setUserRole('user');
                    setNavigation(null);
                }
            }
        }
    }, []);

    // Clear all filters
    const clearFilters = () => {
        setSearchValue('');
        setSkills('');
        setSkillLevel('');
        setSkillMatchMode('any');
        setExperienceLevel('');
        setMinYearsOfExperience('');
        setMaxYearsOfExperience('');
        setLocation('');
        setCity('');
        setState('');
        setCountry('');
        setDegree('');
        setVisaType('');
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

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

    // Function to open joining date modal
    const openJoiningDateModal = () => {
        if (selectedCandidate?.joiningDate) {
            const date = new Date(selectedCandidate.joiningDate);
            setJoiningDateInput(date.toISOString().split('T')[0]);
        } else {
            setJoiningDateInput('');
        }
        setShowJoiningDateModal(true);
    };

    // Function to close joining date modal
    const closeJoiningDateModal = () => {
        setShowJoiningDateModal(false);
        setJoiningDateInput('');
    };

    // Function to handle update joining date
    const handleUpdateJoiningDate = async () => {
        if (!joiningDateInput) {
            await Swal.fire({
                icon: 'warning',
                title: 'Date Required',
                text: 'Please select a joining date.',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setUpdatingJoiningDate(true);
            const candidateId = selectedCandidate?.id || selectedCandidate?._id;
            await updateCandidateJoiningDate(candidateId, joiningDateInput);

            // Refresh candidate data
            const updatedCandidate = await fetchCandidateById(candidateId);
            setSelectedCandidate(updatedCandidate.data || updatedCandidate);

            // Refresh candidates list
            await getCandidates();

            await Swal.fire({
                icon: 'success',
                title: 'Joining Date Updated!',
                text: 'The joining date has been updated successfully.',
                confirmButtonText: 'OK'
            });

            closeJoiningDateModal();
        } catch (error: any) {
            console.error('Update joining date error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error?.response?.data?.message || error?.message || 'Failed to update joining date. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setUpdatingJoiningDate(false);
        }
    };

    // Function to open resign date modal
    const openResignDateModal = () => {
        if (selectedCandidate?.resignDate) {
            const date = new Date(selectedCandidate.resignDate);
            setResignDateInput(date.toISOString().split('T')[0]);
        } else {
            setResignDateInput('');
        }
        setShowResignDateModal(true);
    };

    // Function to close resign date modal
    const closeResignDateModal = () => {
        setShowResignDateModal(false);
        setResignDateInput('');
    };

    // Function to handle update resign date
    const handleUpdateResignDate = async () => {
        if (!resignDateInput) {
            await Swal.fire({
                icon: 'warning',
                title: 'Date Required',
                text: 'Please select a resign date.',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setUpdatingResignDate(true);
            const candidateId = selectedCandidate?.id || selectedCandidate?._id;
            await updateCandidateResignDate(candidateId, resignDateInput);

            // Refresh candidate data
            const updatedCandidate = await fetchCandidateById(candidateId);
            setSelectedCandidate(updatedCandidate.data || updatedCandidate);

            // Refresh candidates list
            await getCandidates();

            const resignDate = new Date(resignDateInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            resignDate.setHours(0, 0, 0, 0);

            const message = resignDate > today
                ? `Resign date set. Candidate will be deactivated on ${resignDateInput}.`
                : 'Resign date updated. Candidate is now inactive.';

            await Swal.fire({
                icon: 'success',
                title: 'Resign Date Updated!',
                text: message,
                confirmButtonText: 'OK'
            });

            closeResignDateModal();
        } catch (error: any) {
            console.error('Update resign date error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error?.response?.data?.message || error?.message || 'Failed to update resign date. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setUpdatingResignDate(false);
        }
    };

    // Function to handle clear resign date
    const handleClearResignDate = async () => {
        try {
            setUpdatingResignDate(true);
            const candidateId = selectedCandidate?.id || selectedCandidate?._id;
            await updateCandidateResignDate(candidateId, null);

            // Refresh candidate data
            const updatedCandidate = await fetchCandidateById(candidateId);
            setSelectedCandidate(updatedCandidate.data || updatedCandidate);

            // Refresh candidates list
            await getCandidates();

            await Swal.fire({
                icon: 'success',
                title: 'Resign Date Cleared!',
                text: 'Resign date cleared. Candidate is now active.',
                confirmButtonText: 'OK'
            });

            closeResignDateModal();
        } catch (error: any) {
            console.error('Clear resign date error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Clear Failed',
                text: error?.response?.data?.message || error?.message || 'Failed to clear resign date. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setUpdatingResignDate(false);
        }
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

    // Function to fetch attendance data
    const fetchAttendanceData = async (candidateId: string) => {
        setLoadingAttendanceData(true);
        try {
            const params: any = {};
            
            // If advanced filter is enabled, use date range
            if (showAdvancedFilter && startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            } else {
                // Otherwise, use year/month to calculate date range
                const firstDay = new Date(attendanceYear, attendanceMonth, 1);
                const lastDay = new Date(attendanceYear, attendanceMonth + 1, 0);
                params.startDate = firstDay.toISOString().split('T')[0];
                params.endDate = lastDay.toISOString().split('T')[0];
            }
            
            params.limit = 1000; // Get all records for the period
            
            const response: any = await getAttendanceByCandidate(candidateId, params);
            const records = response?.data?.results || response?.results || [];
            setCandidateAttendance(records);
        } catch (e: any) {
            console.error('Failed to load candidate attendance:', e);
            setCandidateAttendance([]);
        } finally {
            setLoadingAttendanceData(false);
        }
    };

    // Function to open attendance modal
    const openAttendanceModal = async (candidate: any) => {
        setSelectedCandidateForAttendance(candidate);
        setShowAttendanceModal(true);
        
        // Reset to current month/year
        const now = new Date();
        setAttendanceYear(now.getFullYear());
        setAttendanceMonth(now.getMonth());
        setShowAdvancedFilter(false);
        setStartDate('');
        setEndDate('');
        
        const candidateId = candidate?.id || candidate?._id;
        if (candidateId) {
            await fetchAttendanceData(candidateId);
        }
    };

    // Function to close attendance modal
    const closeAttendanceModal = () => {
        setShowAttendanceModal(false);
        setSelectedCandidateForAttendance(null);
        setCandidateAttendance([]);
        setShiftData(null);
        // Reset filters
        const now = new Date();
        setAttendanceYear(now.getFullYear());
        setAttendanceMonth(now.getMonth());
        setShowAdvancedFilter(false);
        setStartDate('');
        setEndDate('');
    };

    // Function to open notes modal
    const openNotesModal = (candidate: any) => {
        setSelectedCandidateForNotes(candidate);
        setNoteText('');
        setShowNotesModal(true);
    };

    // Function to close notes modal
    const closeNotesModal = () => {
        setShowNotesModal(false);
        setSelectedCandidateForNotes(null);
        setNoteText('');
    };

    // Function to add note to candidate
    const handleAddNote = async () => {
        if (!noteText.trim() || !selectedCandidateForNotes) return;

        try {
            setAddingNote(true);
            const candidateId = selectedCandidateForNotes?.id || selectedCandidateForNotes?._id;
            await addNoteToCandidate(candidateId, noteText.trim());
            
            await Swal.fire({
                icon: 'success',
                title: 'Note Added!',
                text: 'Note has been added successfully.',
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh candidate data
            const updatedCandidate = await fetchCandidateById(candidateId);
            if (updatedCandidate) {
                // Update the candidate in the list
                setCanData((prev) => 
                    prev.map((c: any) => {
                        const cId = c?.id || c?._id;
                        return cId === candidateId ? updatedCandidate : c;
                    })
                );
                // Update selected candidate if modal is open
                if (selectedCandidate && (selectedCandidate?.id || selectedCandidate?._id) === candidateId) {
                    setSelectedCandidate(updatedCandidate);
                }
            }

            closeNotesModal();
        } catch (error: any) {
            console.error('Add note error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Failed to Add Note',
                text: error?.response?.data?.message || error?.message || 'Failed to add note. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setAddingNote(false);
        }
    };

    // Function to open feedback modal
    const openFeedbackModal = (candidate: any) => {
        setSelectedCandidateForNotes(candidate);
        setFeedbackText(candidate?.recruiterFeedback || '');
        setFeedbackRating(candidate?.recruiterRating || 5);
        setShowFeedbackModal(true);
    };

    // Function to close feedback modal
    const closeFeedbackModal = () => {
        setShowFeedbackModal(false);
        setSelectedCandidateForNotes(null);
        setFeedbackText('');
        setFeedbackRating(5);
    };

    // Function to add feedback to candidate
    const handleAddFeedback = async () => {
        if (!feedbackText.trim() || !selectedCandidateForNotes) return;

        try {
            setAddingFeedback(true);
            const candidateId = selectedCandidateForNotes?.id || selectedCandidateForNotes?._id;
            await addFeedbackToCandidate(candidateId, feedbackText.trim(), feedbackRating);
            
            await Swal.fire({
                icon: 'success',
                title: 'Feedback Added!',
                text: 'Feedback has been added successfully.',
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh candidate data
            const updatedCandidate = await fetchCandidateById(candidateId);
            if (updatedCandidate) {
                // Update the candidate in the list
                setCanData((prev) => 
                    prev.map((c: any) => {
                        const cId = c?.id || c?._id;
                        return cId === candidateId ? updatedCandidate : c;
                    })
                );
                // Update selected candidate if modal is open
                if (selectedCandidate && (selectedCandidate?.id || selectedCandidate?._id) === candidateId) {
                    setSelectedCandidate(updatedCandidate);
                }
            }

            closeFeedbackModal();
        } catch (error: any) {
            console.error('Add feedback error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Failed to Add Feedback',
                text: error?.response?.data?.message || error?.message || 'Failed to add feedback. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setAddingFeedback(false);
        }
    };

    // Format duration to hours
    const formatDurationHours = (milliseconds: number) => {
        if (!milliseconds || milliseconds === 0) return 0;
        return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
    };

    // Get calendar data for the selected month/year
    // Get effective joining date: from candidate data or first punchIn date
    const getEffectiveJoiningDate = (): Date | null => {
        if (!selectedCandidateForAttendance) return null;
        
        // First priority: Use joiningDate from candidate data if available and valid
        const joiningDate = selectedCandidateForAttendance?.joiningDate;
        if (joiningDate) {
            try {
                const date = new Date(joiningDate);
                // Check if date is valid
                if (!isNaN(date.getTime())) {
                    date.setHours(0, 0, 0, 0);
                    return date;
                }
            } catch (e) {
                // Invalid date, continue to next option
            }
        }
        
        // Second priority: If no joiningDate, find the earliest punchIn date
        if (candidateAttendance.length > 0) {
            let earliestPunchIn: Date | null = null;
            candidateAttendance.forEach(record => {
                if (record.punchIn) {
                    try {
                        const punchInDate = new Date(record.punchIn);
                        if (!isNaN(punchInDate.getTime())) {
                            punchInDate.setHours(0, 0, 0, 0);
                            if (!earliestPunchIn || punchInDate < earliestPunchIn) {
                                earliestPunchIn = punchInDate;
                            }
                        }
                    } catch (e) {
                        // Skip invalid dates
                    }
                }
            });
            return earliestPunchIn;
        }
        
        // If neither available, return null
        return null;
    };

    // Get resign date from candidate data
    const getResignDate = (): Date | null => {
        if (!selectedCandidateForAttendance) return null;
        
        const resignDate = selectedCandidateForAttendance?.resignDate;
        if (resignDate) {
            try {
                const date = new Date(resignDate);
                // Check if date is valid
                if (!isNaN(date.getTime())) {
                    date.setHours(0, 0, 0, 0);
                    return date;
                }
            } catch (e) {
                // Invalid date, return null
            }
        }
        
        return null;
    };

    // Get week-off days from candidate data
    const getWeekOffDays = (): string[] => {
        if (!selectedCandidateForAttendance) return [];
        return selectedCandidateForAttendance.weekOff || [];
    };

    // Build a local (non-UTC) date key in YYYY-MM-DD format
    const getLocalDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Check if a date is a week-off day
    const isWeekOffDay = (date: Date): boolean => {
        const weekOffDays = getWeekOffDays();
        if (weekOffDays.length === 0) return false;
        
        // Get day name (e.g., "Sunday", "Monday")
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return weekOffDays.includes(dayName);
    };

    const getCalendarData = () => {
        const year = attendanceYear;
        const month = attendanceMonth;
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        
        // Get effective joining date and resign date
        const joiningDate = getEffectiveJoiningDate();
        // Create UTC date at midnight for proper comparison
        // Parse the date string directly to avoid timezone issues
        const joiningDateUTC = joiningDate ? (() => {
            // If joiningDate is from an ISO string, parse it directly
            const dateStr = selectedCandidateForAttendance?.joiningDate;
            if (dateStr && typeof dateStr === 'string') {
                // Parse ISO string and extract date components
                const isoDate = new Date(dateStr);
                return new Date(Date.UTC(
                    isoDate.getUTCFullYear(),
                    isoDate.getUTCMonth(),
                    isoDate.getUTCDate()
                ));
            }
            // Fallback to using the date object
            return new Date(Date.UTC(
                joiningDate.getUTCFullYear(),
                joiningDate.getUTCMonth(),
                joiningDate.getUTCDate()
            ));
        })() : null;
        
        const resignDate = getResignDate();
        const resignDateUTC = resignDate ? (() => {
            // If resignDate is from an ISO string, parse it directly
            const dateStr = selectedCandidateForAttendance?.resignDate;
            if (dateStr && typeof dateStr === 'string') {
                // Parse ISO string and extract date components
                const isoDate = new Date(dateStr);
                return new Date(Date.UTC(
                    isoDate.getUTCFullYear(),
                    isoDate.getUTCMonth(),
                    isoDate.getUTCDate()
                ));
            }
            // Fallback to using the date object
            return new Date(Date.UTC(
                resignDate.getUTCFullYear(),
                resignDate.getUTCMonth(),
                resignDate.getUTCDate()
            ));
        })() : null;
        
        // Map attendance records by punchIn date (not date field)
        // Extract date using UTC to avoid timezone shifts
        const attendanceMap = new Map<string, any>();
        candidateAttendance.forEach(record => {
            if (record.punchIn) {
                const punchInDate = new Date(record.punchIn);
                // Use UTC methods to get the exact date from punchIn timestamp
                const year = punchInDate.getUTCFullYear();
                const month = String(punchInDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(punchInDate.getUTCDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                // If multiple records for same date, keep the one with punchOut (complete attendance)
                if (!attendanceMap.has(dateKey) || (record.punchOut && !attendanceMap.get(dateKey).punchOut)) {
                    attendanceMap.set(dateKey, record);
                }
            }
        });
        
        // Map leaves by date (leaves are stored with date field in ISO format)
        const leavesMap = new Map<string, { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string }>();
        const candidateLeaves = selectedCandidateForAttendance?.leaves || [];
        candidateLeaves.forEach((leave: any) => {
            if (leave.date) {
                const leaveDate = new Date(leave.date);
                // Extract date in UTC to match the format used for attendance
                const year = leaveDate.getUTCFullYear();
                const month = String(leaveDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(leaveDate.getUTCDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;
                leavesMap.set(dateKey, leave);
            }
        });

        const calendarDays: Array<{ day: number; date: Date; attendance: any | null; holiday?: { title: string; date: string } | null; leave?: { _id: string; date: string; leaveType: 'casual' | 'sick'; notes: string | null; assignedAt: string } | null }> = [];
        
        const startDayOfWeek = firstDay.getDay();
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarDays.push({ day: 0, date: new Date(year, month, -i), attendance: null, holiday: null, leave: null });
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            // Create date key using UTC to match punchIn date extraction
            // Use Date.UTC to create date at midnight UTC, then extract date parts
            const utcDate = new Date(Date.UTC(year, month, day));
            
            // Skip dates before joining date - compare date components directly
            if (joiningDateUTC) {
                const currentYear = year;
                const currentMonth = month;
                const currentDay = day;
                
                const joiningYear = joiningDateUTC.getUTCFullYear();
                const joiningMonth = joiningDateUTC.getUTCMonth();
                const joiningDay = joiningDateUTC.getUTCDate();
                
                // Compare dates: if current date is before joining date, skip it
                const currentDateValue = currentYear * 10000 + currentMonth * 100 + currentDay;
                const joiningDateValue = joiningYear * 10000 + joiningMonth * 100 + joiningDay;
                
                if (currentDateValue < joiningDateValue) {
                    calendarDays.push({ day: 0, date, attendance: null, holiday: null, leave: null });
                    continue;
                }
            }
            
            // Skip dates after resign date
            if (resignDateUTC && utcDate > resignDateUTC) {
                calendarDays.push({ day: 0, date, attendance: null, holiday: null, leave: null });
                continue;
            }
            
            const yearUTC = utcDate.getUTCFullYear();
            const monthUTC = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
            const dayUTC = String(utcDate.getUTCDate()).padStart(2, '0');
            const dateKey = `${yearUTC}-${monthUTC}-${dayUTC}`;
            const attendance = attendanceMap.get(dateKey) || null;
            const leave = leavesMap.get(dateKey) || null;

            // Holiday matching is done with local date key so it aligns with the visual calendar
            const holidayKey = getLocalDateKey(date);
            const holiday = candidateHolidaysByDate[holidayKey] || null;

            calendarDays.push({ day, date, attendance, holiday, leave });
        }
        
        return calendarDays;
    };

    // Calculate statistics for selected month/year using calendar data,
    // treating week-offs and holidays as non-working days (not present/absent).
    const getMonthStatistics = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const calendarDays = getCalendarData();

        let isInRange: (d: Date) => boolean;

        if (showAdvancedFilter && startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const rawEnd = new Date(endDate);
            rawEnd.setHours(0, 0, 0, 0);

            const resignDate = getResignDate();
            let effectiveEnd = rawEnd;
            if (resignDate && resignDate < effectiveEnd) {
                effectiveEnd = resignDate;
            }
            if (effectiveEnd > today) {
                effectiveEnd = today;
            }

            isInRange = (d: Date) => d >= start && d <= effectiveEnd;
        } else {
            const year = attendanceYear;
            const month = attendanceMonth;

            isInRange = (d: Date) =>
                d.getFullYear() === year &&
                d.getMonth() === month &&
                d < today;
        }

        let totalDuration = 0;
        let presentDays = 0;
        let workingDays = 0;
        let leaveDays = 0;

        calendarDays.forEach((item) => {
            if (item.day === 0) return;

            const itemDate = new Date(item.date);
            itemDate.setHours(0, 0, 0, 0);
            if (!isInRange(itemDate)) return;

            const hasAttendance =
                item.attendance && (item.attendance.punchIn || item.attendance.punchOut);
            const isPresent =
                !!(item.attendance && item.attendance.punchIn && item.attendance.punchOut);
            const isWeekOff = isWeekOffDay(itemDate);
            const isHoliday = !!item.holiday;
            // Check for leave from candidate.leaves array (primary source of truth)
            // Only count leaves that are explicitly in the candidate.leaves array
            const isLeave = !!item.leave;

            // Week-offs and holidays are non-working: do not count them as working, present, or absent
            if (!isWeekOff && !isHoliday) {
                workingDays += 1;
                if (isLeave) {
                    // Leave days are counted separately and not as absent
                    leaveDays += 1;
                } else if (isPresent) {
                    presentDays += 1;
                }
            }

            if (item.attendance && item.attendance.duration) {
                totalDuration += item.attendance.duration;
            }
        });

        const totalHours = formatDurationHours(totalDuration);
        // Absent days = working days - present days - leave days
        const absentDays = Math.max(0, workingDays - presentDays - leaveDays);

        return { totalHours, presentDays, absentDays, leaveDays };
    };
    
    // Handle year/month change
    const handleAttendanceDateChange = async () => {
        if (!selectedCandidateForAttendance) return;
        const candidateId = selectedCandidateForAttendance?.id || selectedCandidateForAttendance?._id;
        if (candidateId) {
            await fetchAttendanceData(candidateId);
        }
    };

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

    // Timezone options - UTC, IST, and US timezones with GMT offsets (same as profile page)
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

    // Get formatted timezone label
    const getTimezoneLabel = (timezone: string): string => {
        const timezoneOption = timezones.find(tz => tz.value === timezone);
        return timezoneOption?.label || timezone;
    };

    // Generate and download Excel template
    const downloadExcelTemplate = () => {
        const templateData = [
            {
                'Date (YYYY-MM-DD)': '2024-01-15',
                'Punch In Time (HH:MM)': '09:00',
                'Punch Out Time (HH:MM)': '17:00',
                'Timezone': 'UTC',
                'Notes (Optional)': 'Sample entry'
            },
            {
                'Date (YYYY-MM-DD)': '2024-01-16',
                'Punch In Time (HH:MM)': '09:30',
                'Punch Out Time (HH:MM)': '18:00',
                'Timezone': 'Asia/Kolkata',
                'Notes (Optional)': 'Another sample entry'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

        // Set column widths
        const colWidths = [
            { wch: 20 }, // Date
            { wch: 20 }, // Punch In Time
            { wch: 20 }, // Punch Out Time
            { wch: 20 }, // Timezone
            { wch: 30 }  // Notes
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, 'attendance_template.xlsx');
    };

    // Parse Excel file and convert to attendance entries
    const handleExcelImport = async (file: File) => {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonData || jsonData.length === 0) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Invalid File',
                    text: 'The Excel file is empty or invalid.',
                    confirmButtonText: 'OK'
                });
                return;
            }

            const entries: Array<{
                date: string;
                punchInTime: string;
                punchOutTime: string;
                notes: string;
                timezone: string;
            }> = [];

            const errors: string[] = [];

            jsonData.forEach((row: any, index: number) => {
                const rowNum = index + 2; // +2 because Excel rows start at 1 and we have header

                // Get values from various possible column names
                const date = row['Date (YYYY-MM-DD)'] || row['Date'] || row['date'] || row['DATE'];
                const punchInTime = row['Punch In Time (HH:MM)'] || row['Punch In Time'] || row['Punch In'] || row['punchInTime'] || row['PunchInTime'] || row['PUNCH_IN_TIME'];
                const punchOutTime = row['Punch Out Time (HH:MM)'] || row['Punch Out Time'] || row['Punch Out'] || row['punchOutTime'] || row['PunchOutTime'] || row['PUNCH_OUT_TIME'];
                const timezone = row['Timezone'] || row['timezone'] || row['TIMEZONE'] || getShiftTimezone();
                const notes = row['Notes (Optional)'] || row['Notes'] || row['notes'] || row['NOTES'] || '';

                // Validate required fields
                if (!date) {
                    errors.push(`Row ${rowNum}: Date is required`);
                    return;
                }

                if (!punchInTime) {
                    errors.push(`Row ${rowNum}: Punch In Time is required`);
                    return;
                }

                if (!punchOutTime) {
                    errors.push(`Row ${rowNum}: Punch Out Time is required`);
                    return;
                }

                // Format date (handle various formats)
                let formattedDate = '';
                try {
                    // If date is a number, it's likely an Excel serial date
                    if (typeof date === 'number') {
                        // Excel date serial number (days since 1900-01-01)
                        const excelEpoch = new Date(1899, 11, 30); // Excel epoch is Dec 30, 1899
                        const excelDate = new Date(excelEpoch.getTime() + date * 86400000);
                        formattedDate = excelDate.toISOString().split('T')[0];
                    } else if (typeof date === 'string') {
                        // Try to parse string date
                        // Handle YYYY-MM-DD format
                        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                            formattedDate = date;
                        } else {
                            // Try parsing as date string
                            const dateObj = new Date(date);
                            if (isNaN(dateObj.getTime())) {
                                errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
                                return;
                            }
                            formattedDate = dateObj.toISOString().split('T')[0];
                        }
                    } else {
                        errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
                        return;
                    }
                } catch (e) {
                    errors.push(`Row ${rowNum}: Invalid date format - ${date}`);
                    return;
                }

                // Format time (handle various formats)
                let formattedPunchIn = '';
                let formattedPunchOut = '';

                try {
                    // Handle time as string (HH:MM or HH:MM:SS)
                    if (typeof punchInTime === 'string') {
                        const timeParts = punchInTime.split(':');
                        if (timeParts.length >= 2) {
                            formattedPunchIn = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                        } else {
                            errors.push(`Row ${rowNum}: Invalid punch-in time format - ${punchInTime}`);
                            return;
                        }
                    } else if (typeof punchInTime === 'number') {
                        // Excel time format (decimal fraction of a day)
                        const totalSeconds = Math.floor(punchInTime * 86400);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        formattedPunchIn = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }

                    if (typeof punchOutTime === 'string') {
                        const timeParts = punchOutTime.split(':');
                        if (timeParts.length >= 2) {
                            formattedPunchOut = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
                        } else {
                            errors.push(`Row ${rowNum}: Invalid punch-out time format - ${punchOutTime}`);
                            return;
                        }
                    } else if (typeof punchOutTime === 'number') {
                        // Excel time format
                        const totalSeconds = Math.floor(punchOutTime * 86400);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        formattedPunchOut = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                    }
                } catch (e) {
                    errors.push(`Row ${rowNum}: Error parsing time values`);
                    return;
                }

                // Validate punch-out is after punch-in (handle night shifts)
                const punchInDateTime = new Date(`${formattedDate}T${formattedPunchIn}`);
                let punchOutDateTime = new Date(`${formattedDate}T${formattedPunchOut}`);
                
                // If punch-out time is earlier than punch-in time, it's likely a night shift (next day)
                if (punchOutDateTime <= punchInDateTime) {
                    // Add one day to punch-out for night shift scenario
                    punchOutDateTime = new Date(punchOutDateTime);
                    punchOutDateTime.setDate(punchOutDateTime.getDate() + 1);
                }
                
                // Final validation: punch-out must be after punch-in
                if (punchOutDateTime <= punchInDateTime) {
                    errors.push(`Row ${rowNum}: Punch-out time must be after punch-in time`);
                    return;
                }

                entries.push({
                    date: formattedDate,
                    punchInTime: formattedPunchIn,
                    punchOutTime: formattedPunchOut,
                    notes: notes || '',
                    timezone: timezone || getShiftTimezone()
                });
            });

            if (errors.length > 0) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Import Errors',
                    html: `Found ${errors.length} error(s):<br><br>${errors.slice(0, 10).join('<br>')}${errors.length > 10 ? '<br>... and more' : ''}`,
                    confirmButtonText: 'OK'
                });
            }

            if (entries.length > 0) {
                setBackDateEntries(entries);
                await Swal.fire({
                    icon: 'success',
                    title: 'Import Successful',
                    text: `Successfully imported ${entries.length} attendance ${entries.length === 1 ? 'entry' : 'entries'}.${errors.length > 0 ? ' Some entries had errors and were skipped.' : ''}`,
                    confirmButtonText: 'OK'
                });
            } else {
                await Swal.fire({
                    icon: 'error',
                    title: 'No Valid Entries',
                    text: 'No valid attendance entries could be imported from the file.',
                    confirmButtonText: 'OK'
                });
            }

            // Reset file input
            if (excelFileInputRef.current) {
                excelFileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Excel import error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Import Failed',
                text: error?.message || 'Failed to import Excel file. Please check the file format.',
                confirmButtonText: 'OK'
            });
        }
    };

    // Get shift timezone or fallback to UTC
    const getShiftTimezone = (): string => {
        return shiftData?.timezone || 'UTC';
    };

    // Update all entries timezone when shift timezone changes
    useEffect(() => {
        if (shiftData?.timezone && backDateEntries.length > 0) {
            setBackDateEntries(prev => prev.map(entry => ({
                ...entry,
                timezone: shiftData.timezone
            })));
        }
    }, [shiftData?.timezone]);

    // Back-date attendance handlers
    const addBackDateEntry = () => {
        setBackDateEntries([...backDateEntries, { date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: getShiftTimezone() }]);
    };

    const removeBackDateEntry = (index: number) => {
        if (backDateEntries.length > 1) {
            setBackDateEntries(backDateEntries.filter((_, i) => i !== index));
        }
    };

    const updateBackDateEntry = (index: number, field: string, value: string) => {
        const updated = [...backDateEntries];
        updated[index] = { ...updated[index], [field]: value };
        setBackDateEntries(updated);
    };

    const handleSubmitBackDateAttendance = async () => {
        if (!selectedCandidateForAttendance) return;
        
        const candidateId = selectedCandidateForAttendance?.id || selectedCandidateForAttendance?._id;
        if (!candidateId) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Candidate ID not found',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validate entries
        const validEntries = backDateEntries.filter(entry => entry.date && entry.punchInTime && entry.punchOutTime);
        if (validEntries.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'Please add at least one entry with date, punch-in time, and punch-out time.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Check for invalid entries (date without both times)
        const invalidEntries = backDateEntries.filter(entry => entry.date && (!entry.punchInTime || !entry.punchOutTime));
        if (invalidEntries.length > 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Validation Error',
                text: 'All entries with a date must have both punch-in and punch-out times.',
                confirmButtonText: 'OK'
            });
            return;
        }

        try {
            setAddingBackDateAttendance(true);
            
            // Process each entry
            const results = [];
            for (const entry of validEntries) {
                try {
                    // Combine date and punch-in time (ensure proper format)
                    const punchInTimeStr = entry.punchInTime.includes(':') ? entry.punchInTime : `${entry.punchInTime}:00`;
                    const punchInDateTime = new Date(`${entry.date}T${punchInTimeStr}`);
                    
                    // Validate date
                    if (isNaN(punchInDateTime.getTime())) {
                        results.push({ date: entry.date, success: false, error: 'Invalid punch-in date/time' });
                        continue;
                    }
                    
                    const punchInISO = punchInDateTime.toISOString();
                    
                    // Combine date and punch-out time (ensure proper format)
                    const punchOutTimeStr = entry.punchOutTime.includes(':') ? entry.punchOutTime : `${entry.punchOutTime}:00`;
                    let punchOutDateTime = new Date(`${entry.date}T${punchOutTimeStr}`);
                    
                    // Validate date
                    if (isNaN(punchOutDateTime.getTime())) {
                        results.push({ date: entry.date, success: false, error: 'Invalid punch-out date/time' });
                        continue;
                    }
                    
                    // If punch-out time is earlier than punch-in time, it's likely a night shift (next day)
                    if (punchOutDateTime <= punchInDateTime) {
                        // Add one day to punch-out for night shift scenario
                        punchOutDateTime = new Date(punchOutDateTime);
                        punchOutDateTime.setDate(punchOutDateTime.getDate() + 1);
                    }
                    
                    // Final validation: punch-out must be after punch-in
                    if (punchOutDateTime <= punchInDateTime) {
                        results.push({ date: entry.date, success: false, error: 'Punch-out time must be after punch-in time' });
                        continue;
                    }
                    
                    const punchOutISO = punchOutDateTime.toISOString();
                    
                    // Punch in
                    await punchInAttendance(candidateId, {
                        punchInTime: punchInISO,
                        notes: entry.notes || `Back-dated attendance - ${entry.date}`,
                        timezone: entry.timezone || 'UTC'
                    });
                    
                    // Punch out
                    await punchOutAttendance(candidateId, {
                        punchOutTime: punchOutISO,
                        notes: entry.notes || `Back-dated attendance - ${entry.date}`
                    });
                    
                    results.push({ date: entry.date, success: true });
                } catch (error: any) {
                    results.push({ 
                        date: entry.date, 
                        success: false, 
                        error: error?.response?.data?.message || error?.message || 'Failed to add attendance' 
                    });
                }
            }
            
            // Show results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            if (failCount === 0) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: `Successfully added ${successCount} back-dated attendance ${successCount === 1 ? 'entry' : 'entries'}.`,
                    confirmButtonText: 'OK'
                });
            } else {
                const failedDates = results.filter(r => !r.success).map(r => `${r.date} (${r.error})`).join(', ');
                await Swal.fire({
                    icon: 'warning',
                    title: 'Partial Success',
                    html: `Successfully added ${successCount} ${successCount === 1 ? 'entry' : 'entries'}.<br><br>Failed: ${failCount} ${failCount === 1 ? 'entry' : 'entries'}<br>${failedDates}`,
                    confirmButtonText: 'OK'
                });
            }
            
            // Refresh attendance data
            await fetchAttendanceData(candidateId);
            
            // Close modal and reset form
            setShowBackDateAttendanceModal(false);
            const shiftTimezone = getShiftTimezone();
            setBackDateEntries([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: shiftTimezone }]);
        } catch (error: any) {
            console.error('Error adding back-dated attendance:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.message || error?.message || 'Failed to add back-dated attendance. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setAddingBackDateAttendance(false);
        }
    };
    
    // Auto-fetch attendance data when year/month changes (only if modal is open and not using advanced filter)
    useEffect(() => {
        if (showAttendanceModal && selectedCandidateForAttendance && !showAdvancedFilter) {
            const candidateId = selectedCandidateForAttendance?.id || selectedCandidateForAttendance?._id;
            if (candidateId) {
                const timer = setTimeout(() => {
                    fetchAttendanceData(candidateId);
                }, 300); // Debounce for 300ms
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendanceYear, attendanceMonth, showAttendanceModal]);
    
    // Handle advanced filter apply
    const handleApplyAdvancedFilter = async () => {
        if (!selectedCandidateForAttendance) return;
        if (!startDate || !endDate) {
            await Swal.fire({
                icon: 'warning',
                title: 'Missing Dates',
                text: 'Please select both start date and end date.',
                confirmButtonText: 'OK'
            });
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            await Swal.fire({
                icon: 'warning',
                title: 'Invalid Date Range',
                text: 'Start date must be before or equal to end date.',
                confirmButtonText: 'OK'
            });
            return;
        }
        const candidateId = selectedCandidateForAttendance?.id || selectedCandidateForAttendance?._id;
        if (candidateId) {
            await fetchAttendanceData(candidateId);
        }
    };

    // Load holidays for selected candidate (to show in attendance calendar)
    useEffect(() => {
        const loadCandidateHolidays = async () => {
            if (!showAttendanceModal || !selectedCandidateForAttendance) {
                setCandidateHolidaysByDate({});
                return;
            }

            const holidayIds: string[] = selectedCandidateForAttendance.holidays || [];
            if (!holidayIds.length) {
                setCandidateHolidaysByDate({});
                return;
            }

            try {
                const response = await getAllHolidays({
                    isActive: true,
                    sortBy: 'date:asc',
                    limit: 1000,
                });

                const holidaysList =
                    response?.data?.results ||
                    (Array.isArray(response?.data) ? response.data : []);

                const idSet = new Set(holidayIds.map((id: any) => String(id)));
                const map: Record<string, { title: string; date: string }> = {};

                holidaysList.forEach((holiday: any) => {
                    const id = String(holiday._id || holiday.id || '');
                    if (!id || !idSet.has(id)) return;

                    try {
                        const dateObj = new Date(holiday.date);
                        if (isNaN(dateObj.getTime())) return;

                        // Use local date parts so holidays align with the visible calendar
                        const key = getLocalDateKey(dateObj);
                        map[key] = {
                            title: holiday.title || 'Holiday',
                            date: holiday.date,
                        };
                    } catch {
                        // Ignore invalid dates
                    }
                });

                setCandidateHolidaysByDate(map);
            } catch (error) {
                console.error('Failed to load holidays for candidate:', error);
                setCandidateHolidaysByDate({});
            }
        };

        loadCandidateHolidays();
    }, [showAttendanceModal, selectedCandidateForAttendance]);

    // Fetch shift data when attendance modal opens
    useEffect(() => {
        const fetchShiftData = async () => {
            if (!showAttendanceModal || !selectedCandidateForAttendance?.shift) {
                setShiftData(null);
                return;
            }

            setLoadingShiftData(true);
            try {
                const shiftResponse = await getShiftById(selectedCandidateForAttendance.shift);
                const shift = shiftResponse?.data || shiftResponse;
                setShiftData(shift);
            } catch (error) {
                console.error('Failed to fetch shift data:', error);
                setShiftData(null);
            } finally {
                setLoadingShiftData(false);
            }
        };

        fetchShiftData();
    }, [showAttendanceModal, selectedCandidateForAttendance?.shift]);

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
                                Candidate List {totalResults > 0 && <span className="text-sm font-normal text-gray-500">({totalResults} candidates)</span>}
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
                                        <option value="employeeId">Search by Employee ID</option>
                                    </select>
                                </div>
                                <div className="me-3">
                                    <input 
                                        className="ti-form-control form-control-sm" 
                                        type="text" 
                                        placeholder={
                                            searchFilter === 'name'
                                                ? 'Search name here'
                                                : searchFilter === 'email'
                                                    ? 'Search email here'
                                                    : 'Search employee ID here'
                                        }
                                        value={searchValue}
                                        onChange={(e) => setSearchValue(e.target.value)}
                                        aria-label="Search input"
                                    />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className="ti-btn ti-btn-secondary !bg-secondary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium me-2"
                                >
                                    <i className={`ri-filter-${showAdvancedFilters ? 'off' : 'line'} font-semibold align-middle`}></i> {showAdvancedFilters ? 'Hide' : 'Advanced'} Filters
                                </button>
                                {canAccessButton(ButtonPermissions.CANDIDATES_EXPORT, navigation) && (
                                    <button 
                                        type="button" 
                                        onClick={exportCandidates}
                                        className="ti-btn ti-btn-success !bg-success !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium me-2"
                                    >
                                        <i className="ri-download-line font-semibold align-middle"></i> Export Candidates
                                    </button>
                                )}
                                {canAccessButton(ButtonPermissions.CANDIDATES_ADD, navigation) && (
                                    <button type="button" className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium" data-hs-overlay="#create-task">
                                        <i className="ri-add-line font-semibold align-middle"></i> <Link href="/candidates/add">Add Candidate</Link>
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Advanced Filters Section */}
                        {showAdvancedFilters && (
                            <div className="box-body border-b border-defaultborder">
                                <div className="grid grid-cols-12 gap-4 mb-4">
                                    <div className="lg:col-span-12 col-span-12">
                                        <h6 className="text-sm font-semibold mb-3">Advanced Filters</h6>
                                    </div>
                                    
                                    {/* Skills Filter */}
                                    <div className="lg:col-span-4 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Skills (comma-separated)</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="e.g., JavaScript, React, Node.js"
                                            value={skills}
                                            onChange={(e) => {
                                                setSkills(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Skill Level */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Skill Level</label>
                                        <select
                                            className="ti-form-control form-control-sm w-full"
                                            value={skillLevel}
                                            onChange={(e) => {
                                                setSkillLevel(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value="">All Levels</option>
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                            <option value="Expert">Expert</option>
                                        </select>
                                    </div>
                                    
                                    {/* Skill Match Mode */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Match Mode</label>
                                        <select
                                            className="ti-form-control form-control-sm w-full"
                                            value={skillMatchMode}
                                            onChange={(e) => {
                                                setSkillMatchMode(e.target.value as 'all' | 'any');
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value="any">Any Skill</option>
                                            <option value="all">All Skills</option>
                                        </select>
                                    </div>
                                    
                                    {/* Experience Level */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Experience Level</label>
                                        <select
                                            className="ti-form-control form-control-sm w-full"
                                            value={experienceLevel}
                                            onChange={(e) => {
                                                setExperienceLevel(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value="">All Levels</option>
                                            <option value="Entry Level">Entry Level</option>
                                            <option value="Mid Level">Mid Level</option>
                                            <option value="Senior Level">Senior Level</option>
                                            <option value="Executive">Executive</option>
                                        </select>
                                    </div>
                                    
                                    {/* Years of Experience Range */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Min Years</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="number"
                                            placeholder="Min years"
                                            value={minYearsOfExperience}
                                            onChange={(e) => {
                                                setMinYearsOfExperience(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            min="0"
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Max Years</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="number"
                                            placeholder="Max years"
                                            value={maxYearsOfExperience}
                                            onChange={(e) => {
                                                setMaxYearsOfExperience(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            min="0"
                                        />
                                    </div>
                                    
                                    {/* Location Filters */}
                                    <div className="lg:col-span-3 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Location</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="City, State, or Country"
                                            value={location}
                                            onChange={(e) => {
                                                setLocation(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-3 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">City</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="City"
                                            value={city}
                                            onChange={(e) => {
                                                setCity(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-3 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">State</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="State"
                                            value={state}
                                            onChange={(e) => {
                                                setState(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-3 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Country</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="Country"
                                            value={country}
                                            onChange={(e) => {
                                                setCountry(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Education & Visa */}
                                    <div className="lg:col-span-4 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Degree</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="e.g., Computer Science"
                                            value={degree}
                                            onChange={(e) => {
                                                setDegree(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="lg:col-span-4 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Visa Type</label>
                                        <input
                                            className="ti-form-control form-control-sm w-full"
                                            type="text"
                                            placeholder="e.g., H1B, Green Card"
                                            value={visaType}
                                            onChange={(e) => {
                                                setVisaType(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                    
                                    {/* Sort By */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12">
                                        <label className="form-label text-sm block mb-1">Sort By</label>
                                        <select
                                            className="ti-form-control form-control-sm w-full"
                                            value={sortBy}
                                            onChange={(e) => {
                                                setSortBy(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <option value="createdAt:desc">Newest First</option>
                                            <option value="createdAt:asc">Oldest First</option>
                                            <option value="fullName:asc">Name A-Z</option>
                                            <option value="fullName:desc">Name Z-A</option>
                                        </select>
                                    </div>
                                    
                                    {/* Clear Filters Button */}
                                    <div className="lg:col-span-2 md:col-span-6 col-span-12 flex items-end">
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="ti-btn ti-btn-light !bg-light !text-defaulttextcolor !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium w-full"
                                        >
                                            <i className="ri-close-line"></i> Clear Filters
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="box-body">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="mt-2 text-gray-500">Loading candidates...</p>
                                </div>
                            ) : error ? (
                                <div className="text-center py-8">
                                    <div className="text-red-500 mb-2">
                                        <i className="ri-error-warning-line text-4xl"></i>
                                    </div>
                                    <p className="text-red-500">{error}</p>
                                </div>
                            ) : canData.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="text-gray-400 mb-2">
                                        <i className="ri-user-search-line text-4xl"></i>
                                    </div>
                                    <p className="text-gray-500">No candidates found matching your criteria.</p>
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="ti-btn ti-btn-light !bg-light !text-defaulttextcolor !py-1 !px-3 !text-[0.75rem] !m-0 !gap-1 !font-medium mt-3"
                                    >
                                        <i className="ri-close-line"></i> Clear Filters
                                    </button>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover whitespace-nowrap table-bordered min-w-full">
                                        <thead>
                                            <tr>
                                                <th scope="col" className="text-start">S.No</th>
                                                <th scope="col" className="text-start">Employee ID</th>
                                                <th scope="col" className="text-start">Name</th>
                                                <th scope="col" className="text-start">Email</th>
                                                <th scope="col" className="text-start">Mobile</th>
                                                <th scope="col" className="text-start">Bio</th>
                                                <th scope="col" className="text-start">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(Array.isArray(canData) ? canData : []).map((can, i) => (
                                                <tr 
                                                    className="border border-inherit border-solid hover:bg-gray-100 dark:border-defaultborder/10 dark:hover:bg-light cursor-pointer" 
                                                    key={can?.id || can?._id || Math.random()}
                                                    onClick={() => openCandidateModal(can)}
                                                >
                                                    <td>{(currentPage - 1) * limit + i + 1}</td>
                                                    <td>{can?.employeeId || '-'}</td>
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
                                                        <span className='text-[#8c9097] dark:text-white/50 text-[0.75rem]'>{truncateToWords(can?.shortBio, 10)}</span>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-row items-center !gap-2 text-[0.9375rem]" onClick={(e) => e.stopPropagation()}>
                                                            {canAccessButton(ButtonPermissions.CANDIDATES_VIEW_DETAILS, navigation) && (
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
                                                            )}
                                                            {/* <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Add your user action handler here
                                                                }}
                                                                className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500"
                                                                title="Login as user"
                                                            >
                                                                <i className="ri-user-line"></i>
                                                            </button> */}
                                                            {userRole === 'admin' && canAccessButton(ButtonPermissions.CANDIDATES_EDIT, navigation) && (
                                                                <Link aria-label="anchor" href={`/candidates/edit?id=${encodeURIComponent(String(can?.id ?? can?._id))}`} scroll={false} className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-info/10 text-info hover:bg-info hover:text-white hover:border-info" title="Edit Candidate">
                                                                    <i className="ri-pencil-line"></i>
                                                                </Link>
                                                            )}
                                                            {canAccessButton(ButtonPermissions.CANDIDATES_VIEW_DOCUMENTS, navigation) && (
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
                                                            )}
                                                            {userRole === 'admin' && canAccessButton(ButtonPermissions.CANDIDATES_UPLOAD_SALARY_SLIP, navigation) && (
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
                                                            {userRole === 'admin' && canAccessButton(ButtonPermissions.CANDIDATES_SHARE, navigation) && (
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
                                                            )}
                                                            {canAccessButton(ButtonPermissions.CANDIDATES_VIEW_ATTENDANCE, navigation) && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openAttendanceModal(can);
                                                                    }}
                                                                    className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white hover:border-purple-500"
                                                                    title="View Attendance"
                                                                >
                                                                    <i className="ri-calendar-line"></i>
                                                                </button>
                                                            )}
                                                            {!can?.isEmailVerified && (
                                                                <button 
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        try {
                                                                            await resendEmailVerification(String(can?.id ?? can?._id));
                                                                            await Swal.fire({
                                                                                icon: 'success',
                                                                                title: 'Email Sent',
                                                                                text: 'Verification email has been sent successfully.',
                                                                                confirmButtonText: 'OK'
                                                                            });
                                                                        } catch (error: any) {
                                                                            await Swal.fire({
                                                                                icon: 'error',
                                                                                title: 'Failed to Send Email',
                                                                                text: error?.response?.data?.message || error?.message || 'Unable to send verification email.',
                                                                                confirmButtonText: 'OK'
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-teal-500/10 text-teal-500 hover:bg-teal-500 hover:text-white hover:border-teal-500"
                                                                    title="Resend Email Verification"
                                                                >
                                                                    <i className="ri-mail-send-line"></i>
                                                                </button>
                                                            )}

                                                            {(userRole === 'admin' || userRole === 'recruiter') && (
                                                                <>
                                                                    {canAccessButton(ButtonPermissions.CANDIDATES_ADD_NOTE, navigation) && (
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openNotesModal(can);
                                                                            }}
                                                                            className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500"
                                                                            title="Add Note"
                                                                        >
                                                                            <i className="ri-file-text-line"></i>
                                                                        </button>
                                                                    )}
                                                                    {canAccessButton(ButtonPermissions.CANDIDATES_ADD_FEEDBACK, navigation) && (
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openFeedbackModal(can);
                                                                            }}
                                                                            className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white hover:border-amber-500"
                                                                            title="Add Feedback"
                                                                        >
                                                                            <i className="ri-feedback-line"></i>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}

                                                            {userRole === 'admin' && canAccessButton(ButtonPermissions.CANDIDATES_DELETE, navigation) && (
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
                                                                                    // Refresh candidates list after deletion
                                                                                    getCandidates();
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
                                                                    className="ti-btn ti-btn-icon ti-btn-wave !gap-0 !m-0 !h-[1.75rem] !w-[1.75rem] text-[0.8rem] bg-danger/10 text-danger hover:bg-danger hover:text-white hover:border-danger" title="Delete Candidate"
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
                                            {selectedCandidate?.employeeId && (
                                                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    Employee ID: {selectedCandidate.employeeId}
                                                </p>
                                            )}
                                            {selectedCandidate?.shortBio && (
                                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-1">
                                                    {selectedCandidate.shortBio}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
                                        {/* Joining Date */}
                                        {(userRole === 'admin' || userRole === 'recruiter') && (
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                {selectedCandidate?.joiningDate ? (
                                                    <button
                                                        onClick={openJoiningDateModal}
                                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                        title="Edit Joining Date"
                                                    >
                                                        <i className="ri-calendar-check-line"></i>
                                                        <span className="hidden sm:inline">
                                                            {new Date(selectedCandidate.joiningDate).toLocaleDateString()}
                                                        </span>
                                                        <span className="sm:hidden">
                                                            {new Date(selectedCandidate.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <i className="ri-pencil-line text-xs"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={openJoiningDateModal}
                                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                                        title="Add Joining Date"
                                                    >
                                                        <i className="ri-calendar-add-line"></i>
                                                        <span className="hidden sm:inline">Add Joining Date</span>
                                                        <span className="sm:hidden">Joining</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Resign Date */}
                                        {(userRole === 'admin' || userRole === 'recruiter') && (
                                            <div className="flex items-center gap-1 sm:gap-2">
                                                {selectedCandidate?.resignDate ? (
                                                    <button
                                                        onClick={openResignDateModal}
                                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                        title="Edit Resign Date"
                                                    >
                                                        <i className="ri-calendar-close-line"></i>
                                                        <span className="hidden sm:inline">
                                                            {new Date(selectedCandidate.resignDate).toLocaleDateString()}
                                                        </span>
                                                        <span className="sm:hidden">
                                                            {new Date(selectedCandidate.resignDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <i className="ri-pencil-line text-xs"></i>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={openResignDateModal}
                                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                        title="Add Resign Date"
                                                    >
                                                        <i className="ri-calendar-close-line"></i>
                                                        <span className="hidden sm:inline">Add Resign Date</span>
                                                        <span className="sm:hidden">Resign</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        
                                        <button
                                            onClick={closeModal}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
                                        >
                                            <i className="ri-close-line text-xl"></i>
                                        </button>
                                    </div>
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
                                            { id: 'social', label: 'Social Links', icon: 'ri-links-line' },
                                            ...((userRole === 'admin' || userRole === 'recruiter') ? [{ id: 'notes', label: 'Notes & Feedback', icon: 'ri-file-text-line' }] : []),
                                            { id: 'leaves', label: 'Leave History', icon: 'ri-calendar-check-line' }
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

                                    {activeTab === 'notes' && (userRole === 'admin' || userRole === 'recruiter') && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Notes & Feedback</h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openNotesModal(selectedCandidate)}
                                                        className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium"
                                                    >
                                                        <i className="ri-file-text-line me-1"></i>
                                                        Add Note
                                                    </button>
                                                    <button
                                                        onClick={() => openFeedbackModal(selectedCandidate)}
                                                        className="ti-btn ti-btn-primary !bg-primary !text-white !py-1 !px-2 !text-[0.75rem] !m-0 !gap-0 !font-medium"
                                                    >
                                                        <i className="ri-feedback-line me-1"></i>
                                                        Add Feedback
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Recruiter Notes */}
                                            <div className="mb-6">
                                                <h5 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Recruiter Notes</h5>
                                                {Array.isArray(selectedCandidate?.recruiterNotes) && selectedCandidate.recruiterNotes.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {selectedCandidate.recruiterNotes.map((note: any, index: number) => {
                                                            // Get recruiter details - handle both string ID and object
                                                            const recruiterId = typeof note.addedBy === 'string' ? note.addedBy : note.addedBy?.id || note.addedBy?._id;
                                                            const recruiterInfo = recruiterId && recruiterDetails[recruiterId] 
                                                                ? recruiterDetails[recruiterId]
                                                                : (typeof note.addedBy === 'object' && note.addedBy?.name 
                                                                    ? { name: note.addedBy.name, email: note.addedBy.email || 'N/A' }
                                                                    : { name: 'Unknown', email: 'N/A' });
                                                            
                                                            return (
                                                                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                                    <p className="text-sm text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">{note.note}</p>
                                                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                            <span className="flex items-center">
                                                                                <i className="ri-user-line me-1"></i>
                                                                                <span className="font-medium">{recruiterInfo.name}</span>
                                                                            </span>
                                                                            <span className="flex items-center">
                                                                                <i className="ri-mail-line me-1"></i>
                                                                                {recruiterInfo.email}
                                                                            </span>
                                                                        </div>
                                                                        <span className="flex items-center">
                                                                            <i className="ri-time-line me-1"></i>
                                                                            {note.addedAt ? new Date(note.addedAt).toLocaleString() : 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                        <i className="ri-file-text-line text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                                                        <p className="text-gray-500 dark:text-gray-400">No notes added yet</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Recruiter Feedback */}
                                            <div>
                                                <h5 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Recruiter Feedback</h5>
                                                {selectedCandidate?.recruiterFeedback ? (
                                                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex-1">
                                                                {selectedCandidate.recruiterRating && (
                                                                    <div className="flex items-center mb-2">
                                                                        {[1, 2, 3, 4, 5].map((rating) => (
                                                                            <i
                                                                                key={rating}
                                                                                className={`ri-star-${rating <= selectedCandidate.recruiterRating ? 'fill' : 'line'} text-amber-500`}
                                                                            ></i>
                                                                        ))}
                                                                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                                            ({selectedCandidate.recruiterRating}/5)
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{selectedCandidate.recruiterFeedback}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                        <i className="ri-feedback-line text-4xl text-gray-400 dark:text-gray-500 mb-2"></i>
                                                        <p className="text-gray-500 dark:text-gray-400">No feedback added yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'leaves' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Leave History</h4>
                                            </div>

                                            {Array.isArray(selectedCandidate?.leaves) && selectedCandidate.leaves.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                    Date
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                    Leave Type
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                    Notes
                                                                </th>
                                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                    Assigned At
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                                            {selectedCandidate.leaves
                                                                .sort((a: any, b: any) => {
                                                                    const dateA = new Date(a.date).getTime();
                                                                    const dateB = new Date(b.date).getTime();
                                                                    return dateB - dateA; // Sort descending (newest first)
                                                                })
                                                                .map((leave: any, index: number) => {
                                                                    const leaveDate = new Date(leave.date);
                                                                    const assignedDate = leave.assignedAt ? new Date(leave.assignedAt) : null;
                                                                    
                                                                    const getLeaveTypeColor = (type: string) => {
                                                                        switch (type) {
                                                                            case 'casual':
                                                                                return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
                                                                            case 'sick':
                                                                                return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
                                                                            case 'unpaid':
                                                                                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
                                                                            default:
                                                                                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
                                                                        }
                                                                    };

                                                                    const getLeaveTypeLabel = (type: string) => {
                                                                        switch (type) {
                                                                            case 'casual':
                                                                                return 'Casual Leave';
                                                                            case 'sick':
                                                                                return 'Sick Leave';
                                                                            case 'unpaid':
                                                                                return 'Unpaid Leave';
                                                                            default:
                                                                                return type;
                                                                        }
                                                                    };

                                                                    return (
                                                                        <tr key={leave._id || index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                                                <div className="flex items-center">
                                                                                    <i className="ri-calendar-line me-2 text-gray-400"></i>
                                                                                    {leaveDate.toLocaleDateString('en-US', {
                                                                                        year: 'numeric',
                                                                                        month: 'short',
                                                                                        day: 'numeric'
                                                                                    })}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                                    {leaveDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                                                                                    <i className={`ri-${leave.leaveType === 'casual' ? 'sun' : leave.leaveType === 'sick' ? 'heart-pulse' : 'money-dollar-circle'}-line me-1`}></i>
                                                                                    {getLeaveTypeLabel(leave.leaveType)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                                                                {leave.notes ? (
                                                                                    <div className="flex items-start">
                                                                                        <i className="ri-file-text-line me-2 mt-0.5 text-gray-400"></i>
                                                                                        <span className="max-w-xs truncate" title={leave.notes}>
                                                                                            {leave.notes}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-gray-400 dark:text-gray-500 italic">No notes</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                                {assignedDate ? (
                                                                                    <div className="flex items-center">
                                                                                        <i className="ri-time-line me-1"></i>
                                                                                        {assignedDate.toLocaleDateString('en-US', {
                                                                                            year: 'numeric',
                                                                                            month: 'short',
                                                                                            day: 'numeric'
                                                                                        })}
                                                                                        <span className="mx-1">•</span>
                                                                                        {assignedDate.toLocaleTimeString('en-US', {
                                                                                            hour: '2-digit',
                                                                                            minute: '2-digit'
                                                                                        })}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-gray-400 dark:text-gray-500">N/A</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                                                    <i className="ri-calendar-check-line text-5xl text-gray-400 dark:text-gray-500 mb-4"></i>
                                                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Leave History</h4>
                                                    <p className="text-gray-500 dark:text-gray-400">
                                                        This candidate doesn't have any leave records yet.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Leave Statistics */}
                                            {Array.isArray(selectedCandidate?.leaves) && selectedCandidate.leaves.length > 0 && (
                                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Casual Leaves</p>
                                                                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                                                                    {selectedCandidate.leaves.filter((l: any) => l.leaveType === 'casual').length}
                                                                </p>
                                                            </div>
                                                            <i className="ri-sun-line text-3xl text-orange-600 dark:text-orange-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Sick Leaves</p>
                                                                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                                                                    {selectedCandidate.leaves.filter((l: any) => l.leaveType === 'sick').length}
                                                                </p>
                                                            </div>
                                                            <i className="ri-heart-pulse-line text-3xl text-purple-600 dark:text-purple-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Unpaid Leaves</p>
                                                                <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                                                                    {selectedCandidate.leaves.filter((l: any) => l.leaveType === 'unpaid').length}
                                                                </p>
                                                            </div>
                                                            <i className="ri-money-dollar-circle-line text-3xl text-red-600 dark:text-red-400"></i>
                                                        </div>
                                                    </div>
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
                                {userRole === 'admin' && canAccessButton(ButtonPermissions.CANDIDATES_EDIT, navigation) && (
                                    <Link
                                        href={`/candidates/edit?id=${encodeURIComponent(String(selectedCandidate?.id ?? selectedCandidate?._id))}`}
                                        className="ti-btn ti-btn-primary w-full sm:w-auto"
                                    >
                                        <i className="ri-edit-line me-1"></i>
                                        Edit Profile
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Joining Date Modal */}
            {showJoiningDateModal && selectedCandidate && (userRole === 'admin' || userRole === 'recruiter') && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeJoiningDateModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCandidate?.joiningDate ? 'Edit Joining Date' : 'Add Joining Date'}
                                    </h3>
                                    <button
                                        onClick={closeJoiningDateModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Joining Date
                                        </label>
                                        <input
                                            type="date"
                                            value={joiningDateInput}
                                            onChange={(e) => setJoiningDateInput(e.target.value)}
                                            max={selectedCandidate?.resignDate ? new Date(selectedCandidate.resignDate).toISOString().split('T')[0] : undefined}
                                            className="ti-form-input w-full"
                                        />
                                        {selectedCandidate?.resignDate && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Must be before resign date: {new Date(selectedCandidate.resignDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeJoiningDateModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={updatingJoiningDate}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateJoiningDate}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto"
                                    disabled={updatingJoiningDate || !joiningDateInput}
                                >
                                    {updatingJoiningDate ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line me-1"></i>
                                            {selectedCandidate?.joiningDate ? 'Update' : 'Add'} Joining Date
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Resign Date Modal */}
            {showResignDateModal && selectedCandidate && (userRole === 'admin' || userRole === 'recruiter') && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeResignDateModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {selectedCandidate?.resignDate ? 'Edit Resign Date' : 'Add Resign Date'}
                                    </h3>
                                    <button
                                        onClick={closeResignDateModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Resign Date
                                        </label>
                                        <input
                                            type="date"
                                            value={resignDateInput}
                                            onChange={(e) => setResignDateInput(e.target.value)}
                                            min={selectedCandidate?.joiningDate ? new Date(selectedCandidate.joiningDate).toISOString().split('T')[0] : undefined}
                                            className="ti-form-input w-full"
                                        />
                                        {selectedCandidate?.joiningDate && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                Must be after joining date: {new Date(selectedCandidate.joiningDate).toLocaleDateString()}
                                            </p>
                                        )}
                                        {resignDateInput && new Date(resignDateInput) <= new Date() && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                <i className="ri-information-line me-1"></i>
                                                Candidate will be deactivated immediately.
                                            </p>
                                        )}
                                        {resignDateInput && new Date(resignDateInput) > new Date() && (
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                <i className="ri-information-line me-1"></i>
                                                Candidate will remain active until this date.
                                            </p>
                                        )}
                                    </div>
                                    {selectedCandidate?.resignDate && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                <i className="ri-information-line me-1"></i>
                                                <strong>Note:</strong> Clearing the resign date will reactivate the candidate.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                {selectedCandidate?.resignDate && (
                                    <button
                                        onClick={handleClearResignDate}
                                        className="ti-btn ti-btn-warning w-full sm:w-auto"
                                        disabled={updatingResignDate}
                                    >
                                        {updatingResignDate ? (
                                            <>
                                                <i className="ri-loader-4-line animate-spin me-1"></i>
                                                Clearing...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-delete-bin-line me-1"></i>
                                                Clear Resign Date
                                            </>
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={closeResignDateModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={updatingResignDate}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateResignDate}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto"
                                    disabled={updatingResignDate || !resignDateInput}
                                >
                                    {updatingResignDate ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line me-1"></i>
                                            {selectedCandidate?.resignDate ? 'Update' : 'Add'} Resign Date
                                        </>
                                    )}
                                </button>
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

            {/* Attendance Details Modal */}
            {showAttendanceModal && selectedCandidateForAttendance && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeAttendanceModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-7xl mx-auto sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Attendance Details - {selectedCandidateForAttendance?.fullName || 'N/A'}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {selectedCandidateForAttendance?.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {userRole === 'admin' && (
                                            <button
                                                onClick={() => {
                                                    const shiftTimezone = shiftData?.timezone || 'UTC';
                                                    setBackDateEntries([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: shiftTimezone }]);
                                                    setShowBackDateAttendanceModal(true);
                                                }}
                                                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium flex items-center gap-2"
                                                title="Add Back-Dated Attendance"
                                            >
                                                <i className="ri-calendar-line"></i>
                                                Regularization
                                            </button>
                                        )}
                                        <button
                                            onClick={closeAttendanceModal}
                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <i className="ri-close-line text-2xl"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto">
                                {loadingAttendanceData ? (
                                    <div className="text-center py-8">
                                        <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
                                        <p className="text-gray-600 dark:text-gray-400">Loading attendance data...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Summary Cards */}
                                        {(() => {
                                            const monthStats = getMonthStatistics();
                                            return (
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Working Hours</p>
                                                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                                                    {monthStats.totalHours.toFixed(2)}h
                                                                </p>
                                                            </div>
                                                            <i className="ri-time-line text-3xl text-blue-600 dark:text-blue-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                                                    {monthStats.presentDays}
                                                                </p>
                                                            </div>
                                                            <i className="ri-checkbox-circle-line text-3xl text-green-600 dark:text-green-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Absent Days</p>
                                                                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                                                                    {monthStats.absentDays}
                                                                </p>
                                                            </div>
                                                            <i className="ri-close-circle-line text-3xl text-red-600 dark:text-red-400"></i>
                                                        </div>
                                                    </div>
                                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">Leave Days</p>
                                                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                                                                    {monthStats.leaveDays || 0}
                                                                </p>
                                                            </div>
                                                            <i className="ri-calendar-check-line text-3xl text-orange-600 dark:text-orange-400"></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Shift Details Section */}
                                        {selectedCandidateForAttendance?.shift && (
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                                    <i className="ri-time-zone-line text-primary"></i>
                                                    Shift Details
                                                </h4>
                                                {loadingShiftData ? (
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <i className="ri-loader-4-line animate-spin"></i>
                                                        <span className="text-sm">Loading shift details...</span>
                                                    </div>
                                                ) : shiftData ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shift Name</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {shiftData.name || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Time</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {shiftData.startTime || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Time</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {shiftData.endTime || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timezone</p>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {shiftData.timezone || 'N/A'}
                                                            </p>
                                                        </div>
                                                        {shiftData.description && (
                                                            <div className="md:col-span-2 lg:col-span-4">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                                                    {shiftData.description}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        Shift details not available
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Calendar Layout */}
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                                                <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                                                    Calendar View - {new Date(attendanceYear, attendanceMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </h4>
                                                
                                                {/* Year/Month Selectors and Advanced Filter */}
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {/* Year Dropdown */}
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm text-gray-600 dark:text-gray-400">Year:</label>
                                                        <select
                                                            value={attendanceYear}
                                                            onChange={(e) => {
                                                                setAttendanceYear(parseInt(e.target.value));
                                                                setShowAdvancedFilter(false);
                                                            }}
                                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                        >
                                                            {(() => {
                                                                const joiningDate = getEffectiveJoiningDate();
                                                                const resignDate = getResignDate();
                                                                const joiningYear = joiningDate ? joiningDate.getUTCFullYear() : new Date().getFullYear() - 2;
                                                                const maxYear = resignDate ? resignDate.getUTCFullYear() : new Date().getFullYear();
                                                                const yearsToShow = maxYear - joiningYear + 1;
                                                                return Array.from({ length: Math.max(yearsToShow, 10) }, (_, i) => {
                                                                    const year = joiningYear + i;
                                                                    if (year > maxYear) return null;
                                                                    return (
                                                                        <option key={year} value={year}>
                                                                            {year}
                                                                        </option>
                                                                    );
                                                                }).filter(Boolean);
                                                            })()}
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Month Dropdown */}
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-sm text-gray-600 dark:text-gray-400">Month:</label>
                                                        <select
                                                            value={attendanceMonth}
                                                            onChange={(e) => {
                                                                setAttendanceMonth(parseInt(e.target.value));
                                                                setShowAdvancedFilter(false);
                                                            }}
                                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                        >
                                                            {[
                                                                'January', 'February', 'March', 'April', 'May', 'June',
                                                                'July', 'August', 'September', 'October', 'November', 'December'
                                                            ].map((month, index) => (
                                                                <option key={index} value={index}>
                                                                    {month}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    {/* Advanced Filter Toggle */}
                                                    <button
                                                        onClick={() => {
                                                            setShowAdvancedFilter(!showAdvancedFilter);
                                                            if (showAdvancedFilter) {
                                                                setStartDate('');
                                                                setEndDate('');
                                                                handleAttendanceDateChange();
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    >
                                                        {showAdvancedFilter ? 'Hide' : 'Advanced'} Filter
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Advanced Filter Section */}
                                            {showAdvancedFilter && (
                                                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                                                        <div className="flex-1">
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                Start Date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={startDate}
                                                                onChange={(e) => setStartDate(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                                End Date
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={endDate}
                                                                onChange={(e) => setEndDate(e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleApplyAdvancedFilter}
                                                            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
                                                        >
                                                            Apply Filter
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                {/* Month Navigation */}
                                                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                                                    <button
                                                        onClick={() => {
                                                            let newMonth = attendanceMonth - 1;
                                                            let newYear = attendanceYear;
                                                            
                                                            if (newMonth < 0) {
                                                                newMonth = 11;
                                                                newYear = attendanceYear - 1;
                                                            }
                                                            
                                                            // Check if new date is before joining date
                                                            const joiningDate = getEffectiveJoiningDate();
                                                            if (joiningDate) {
                                                                const joiningYear = joiningDate.getUTCFullYear();
                                                                const joiningMonth = joiningDate.getUTCMonth();
                                                                if (newYear < joiningYear || (newYear === joiningYear && newMonth < joiningMonth)) {
                                                                    return; // Don't navigate before joining date
                                                                }
                                                            }
                                                            
                                                            setAttendanceMonth(newMonth);
                                                            setAttendanceYear(newYear);
                                                            setShowAdvancedFilter(false);
                                                        }}
                                                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Previous Month"
                                                        disabled={(() => {
                                                            const joiningDate = getEffectiveJoiningDate();
                                                            if (!joiningDate) return false;
                                                            const joiningYear = joiningDate.getUTCFullYear();
                                                            const joiningMonth = joiningDate.getUTCMonth();
                                                            let prevMonth = attendanceMonth - 1;
                                                            let prevYear = attendanceYear;
                                                            if (prevMonth < 0) {
                                                                prevMonth = 11;
                                                                prevYear = attendanceYear - 1;
                                                            }
                                                            return prevYear < joiningYear || (prevYear === joiningYear && prevMonth < joiningMonth);
                                                        })()}
                                                    >
                                                        <i className="ri-arrow-left-s-line text-xl"></i>
                                                    </button>
                                                    
                                                    <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                        {new Date(attendanceYear, attendanceMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                    </h5>
                                                    
                                                    <button
                                                        onClick={() => {
                                                            let newMonth = attendanceMonth + 1;
                                                            let newYear = attendanceYear;
                                                            
                                                            if (newMonth > 11) {
                                                                newMonth = 0;
                                                                newYear = attendanceYear + 1;
                                                            }
                                                            
                                                            // Check if new date is after resign date
                                                            const resignDate = getResignDate();
                                                            if (resignDate) {
                                                                const resignYear = resignDate.getUTCFullYear();
                                                                const resignMonth = resignDate.getUTCMonth();
                                                                if (newYear > resignYear || (newYear === resignYear && newMonth > resignMonth)) {
                                                                    return; // Don't navigate after resign date
                                                                }
                                                            }
                                                            
                                                            setAttendanceMonth(newMonth);
                                                            setAttendanceYear(newYear);
                                                            setShowAdvancedFilter(false);
                                                        }}
                                                        className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Next Month"
                                                        disabled={(() => {
                                                            const resignDate = getResignDate();
                                                            if (!resignDate) return false;
                                                            const resignYear = resignDate.getUTCFullYear();
                                                            const resignMonth = resignDate.getUTCMonth();
                                                            let nextMonth = attendanceMonth + 1;
                                                            let nextYear = attendanceYear;
                                                            if (nextMonth > 11) {
                                                                nextMonth = 0;
                                                                nextYear = attendanceYear + 1;
                                                            }
                                                            return nextYear > resignYear || (nextYear === resignYear && nextMonth > resignMonth);
                                                        })()}
                                                    >
                                                        <i className="ri-arrow-right-s-line text-xl"></i>
                                                    </button>
                                                </div>
                                                
                                                {/* Calendar Header */}
                                                <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
                                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            {day}
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Calendar Grid */}
                                                <div className="grid grid-cols-7 bg-white dark:bg-gray-800">
                                                    {getCalendarData().map((item, index) => {
                                                        const hasAttendance = item.attendance && (item.attendance.punchIn || item.attendance.punchOut);
                                                        const isPresent = item.attendance && item.attendance.punchIn && item.attendance.punchOut;
                                                        const hours = item.attendance ? formatDurationHours(item.attendance.duration) : 0;
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const itemDate = new Date(item.date);
                                                        itemDate.setHours(0, 0, 0, 0);
                                                        const isPastDate = itemDate < today;
                                                        const isWeekOff = item.day > 0 && isWeekOffDay(itemDate);
                                                        const isHoliday = !!item.holiday;
                                                        // Check for leave from candidate.leaves array first, then check attendance record with status "Leave" only if it matches a leave date
                                                        // Only show as leave if it's in the candidate.leaves array (primary source of truth)
                                                        const isLeave = !!item.leave;
                                                        const leaveType = item.leave?.leaveType || null;
                                                        
                                                        return (
                                                            <div
                                                                key={index}
                                                                className={`min-h-[80px] p-2 border border-gray-200 dark:border-gray-700 ${
                                                                    item.day === 0 
                                                                        ? 'bg-gray-50 dark:bg-gray-900' 
                                                                        : isLeave
                                                                            ? leaveType === 'sick' 
                                                                                ? 'bg-purple-50 dark:bg-purple-900/20'
                                                                                : 'bg-orange-50 dark:bg-orange-900/20'
                                                                            : isPresent 
                                                                                ? 'bg-green-50 dark:bg-green-900/20' 
                                                                                : hasAttendance && !isPresent
                                                                                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                                                                    : isHoliday
                                                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                                                        : isWeekOff
                                                                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                                                                            : isPastDate
                                                                                                ? 'bg-red-50 dark:bg-red-900/20'
                                                                                                : 'bg-white dark:bg-gray-800'
                                                                }`}
                                                            >
                                                                {item.day > 0 && (
                                                                    <div className="flex flex-col h-full">
                                                                        <span className={`text-sm font-medium ${
                                                                            item.day === 0 
                                                                                ? 'text-gray-400' 
                                                                                : isLeave
                                                                                    ? leaveType === 'sick'
                                                                                        ? 'text-purple-700 dark:text-purple-400'
                                                                                        : 'text-orange-700 dark:text-orange-400'
                                                                                    : isPresent 
                                                                                        ? 'text-green-700 dark:text-green-400' 
                                                                                        : hasAttendance && !isPresent
                                                                                            ? 'text-yellow-700 dark:text-yellow-400'
                                                                                            : isWeekOff
                                                                                                ? 'text-blue-700 dark:text-blue-400'
                                                                                                : isHoliday
                                                                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                                                                    : isPastDate
                                                                                                        ? 'text-red-700 dark:text-red-400'
                                                                                                        : 'text-gray-600 dark:text-gray-400'
                                                                        }`}>
                                                                            {item.day}
                                                                        </span>
                                                                        {isLeave && (
                                                                            <span className={`text-xs font-semibold mt-1 ${
                                                                                leaveType === 'sick'
                                                                                    ? 'text-purple-600 dark:text-purple-400'
                                                                                    : 'text-orange-600 dark:text-orange-400'
                                                                            }`}>
                                                                                {leaveType === 'sick' ? 'Sick Leave' : 'Casual Leave'}
                                                                            </span>
                                                                        )}
                                                                        {isPresent && !isLeave && (
                                                                            <>
                                                                                <span className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                                                                                    Present
                                                                                </span>
                                                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                                                    {hours.toFixed(1)}h
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                        {hasAttendance && !isPresent && !isLeave && (
                                                                            <span className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                                                                Incomplete
                                                                            </span>
                                                                        )}
                                                                        {isHoliday && !isLeave && (
                                                                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                                                                {item.holiday?.title ? `${item.holiday.title} (Holiday)` : 'Holiday'}
                                                                            </span>
                                                                        )}
                                                                        {isWeekOff && !hasAttendance && !isHoliday && !isLeave && (
                                                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                                                Week-Off
                                                                            </span>
                                                                        )}
                                                                        {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && isPastDate && (
                                                                            <span className="text-xs text-red-500 dark:text-red-400 mt-1">
                                                                                Absent
                                                                            </span>
                                                                        )}
                                                                        {!hasAttendance && !isWeekOff && !isHoliday && !isLeave && !isPastDate && (
                                                                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                                                -
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex justify-end">
                                <button
                                    onClick={closeAttendanceModal}
                                    className="ti-btn ti-btn-primary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Back-Date Attendance Modal */}
            {showBackDateAttendanceModal && selectedCandidateForAttendance && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div 
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
                            onClick={() => {
                                setShowBackDateAttendanceModal(false);
                                setBackDateEntries([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: 'UTC' }]);
                                if (excelFileInputRef.current) {
                                    excelFileInputRef.current.value = '';
                                }
                            }}
                        ></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl mx-auto sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Add Back-Dated Attendance
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {selectedCandidateForAttendance?.fullName} - {selectedCandidateForAttendance?.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowBackDateAttendanceModal(false);
                                            setBackDateEntries([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: 'UTC' }]);
                                            if (excelFileInputRef.current) {
                                                excelFileInputRef.current.value = '';
                                            }
                                        }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-2xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto">
                                <div className="space-y-4">
                                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            <i className="ri-information-line me-2"></i>
                                            You can add multiple back-dated attendance entries. Each entry requires a date, punch-in time, and punch-out time.
                                        </p>
                                    </div>

                                    {/* Excel Import Section */}
                                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <i className="ri-file-excel-2-line text-lg text-green-600"></i>
                                                Import from Excel
                                            </h4>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button
                                                onClick={downloadExcelTemplate}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                            >
                                                <i className="ri-download-line"></i>
                                                Download Template
                                            </button>
                                            <label className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer">
                                                <i className="ri-upload-line"></i>
                                                Import Excel File
                                                <input
                                                    ref={excelFileInputRef}
                                                    type="file"
                                                    accept=".xlsx,.xls"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleExcelImport(file);
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            Download the template, fill in your attendance data, and import it here. The template includes sample entries for reference.
                                        </p>
                                    </div>

                                    {backDateEntries.map((entry, index) => (
                                        <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    Entry {index + 1}
                                                </h4>
                                                {backDateEntries.length > 1 && (
                                                    <button
                                                        onClick={() => removeBackDateEntry(index)}
                                                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                                        title="Remove entry"
                                                    >
                                                        <i className="ri-delete-bin-line text-lg"></i>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Date */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Date <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={entry.date}
                                                        onChange={(e) => updateBackDateEntry(index, 'date', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                        required
                                                    />
                                                </div>

                                                {/* Timezone */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Timezone
                                                    </label>
                                                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                        {getTimezoneLabel(entry.timezone)}
                                                    </div>
                                                    {shiftData?.timezone && (
                                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            Timezone from shift: {getTimezoneLabel(shiftData.timezone)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Punch In Time */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Punch In Time <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={entry.punchInTime}
                                                        onChange={(e) => updateBackDateEntry(index, 'punchInTime', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                        required
                                                    />
                                                </div>

                                                {/* Punch Out Time */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Punch Out Time <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="time"
                                                        value={entry.punchOutTime}
                                                        onChange={(e) => updateBackDateEntry(index, 'punchOutTime', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                        required
                                                    />
                                                </div>

                                                {/* Notes */}
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Notes (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={entry.notes}
                                                        onChange={(e) => updateBackDateEntry(index, 'notes', e.target.value)}
                                                        placeholder="Add any notes for this attendance entry"
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-bodydark dark:text-white"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Another Entry Button */}
                                    <button
                                        onClick={addBackDateEntry}
                                        className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-2"
                                    >
                                        <i className="ri-add-line"></i>
                                        Add Another Entry
                                    </button>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={() => {
                                        setShowBackDateAttendanceModal(false);
                                        const shiftTimezone = shiftData?.timezone || 'UTC';
                                        setBackDateEntries([{ date: '', punchInTime: '', punchOutTime: '', notes: '', timezone: shiftTimezone }]);
                                        if (excelFileInputRef.current) {
                                            excelFileInputRef.current.value = '';
                                        }
                                    }}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={addingBackDateAttendance}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitBackDateAttendance}
                                    disabled={addingBackDateAttendance}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addingBackDateAttendance ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-calendar-check-line me-1"></i>
                                            Add Attendance
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Note Modal */}
            {showNotesModal && selectedCandidateForNotes && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeNotesModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:max-w-lg sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="avatar avatar-md avatar-rounded me-3 flex-shrink-0">
                                            <img src={selectedCandidateForNotes?.src || selectedCandidateForNotes?.profilePicture?.url || "/assets/images/faces/1.jpg"} alt="Candidate" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                Add Note
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidateForNotes?.fullName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeNotesModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Note <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="form-control w-full min-h-[120px]"
                                            placeholder="Enter your note about this candidate..."
                                            required
                                            rows={5}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeNotesModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={addingNote}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddNote}
                                    disabled={addingNote || !noteText.trim()}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addingNote ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-file-text-line me-1"></i>
                                            Add Note
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Feedback Modal */}
            {showFeedbackModal && selectedCandidateForNotes && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        {/* Background overlay */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeFeedbackModal}></div>

                        {/* Modal panel */}
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md mx-auto sm:max-w-lg sm:my-8 sm:align-middle">
                            {/* Modal header */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center min-w-0 flex-1">
                                        <div className="avatar avatar-md avatar-rounded me-3 flex-shrink-0">
                                            <img src={selectedCandidateForNotes?.src || selectedCandidateForNotes?.profilePicture?.url || "/assets/images/faces/1.jpg"} alt="Candidate" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                Add Feedback
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {selectedCandidateForNotes?.fullName}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeFeedbackModal}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-2"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Modal body */}
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Feedback <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            className="form-control w-full min-h-[120px]"
                                            placeholder="Enter your feedback about this candidate..."
                                            required
                                            rows={5}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Rating (Optional)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((rating) => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    onClick={() => setFeedbackRating(rating)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
                                                        feedbackRating >= rating
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
                                                    }`}
                                                >
                                                    <i className="ri-star-fill"></i>
                                                </button>
                                            ))}
                                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                                                {feedbackRating === 1 && 'Poor'}
                                                {feedbackRating === 2 && 'Fair'}
                                                {feedbackRating === 3 && 'Good'}
                                                {feedbackRating === 4 && 'Very Good'}
                                                {feedbackRating === 5 && 'Excellent'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    onClick={closeFeedbackModal}
                                    className="ti-btn ti-btn-light w-full sm:w-auto"
                                    disabled={addingFeedback}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddFeedback}
                                    disabled={addingFeedback || !feedbackText.trim()}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {addingFeedback ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-feedback-line me-1"></i>
                                            Add Feedback
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