"use client"
import { Followersdata, Friendsdata, LightboxGallery, Personalinfodata, RecentPostsdata, Suggestionsdata } from '@/shared/data/pages/profiledata'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useEffect, useState, useCallback } from 'react'
import { fetchAllCandidates, shareCandidate, punchInAttendance, punchOutAttendance, getPunchInOutStatus } from '@/shared/lib/candidates'
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

const profile = () => {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState<boolean>(false);
    const [shareEmail, setShareEmail] = useState<string>('');
    const [shareWithDoc, setShareWithDoc] = useState<boolean>(false);
    const [sharingProfile, setSharingProfile] = useState<boolean>(false);
    const [isPunching, setIsPunching] = useState<boolean>(false);
    const [punchedIn, setPunchedIn] = useState<boolean>(false);
    const [punchStatusData, setPunchStatusData] = useState<any>(null);

    // Function to check if profile is completed
    const isProfileCompleted = useCallback((profile: any): boolean => {
        if (!profile) return false;
        
        // Check required fields for profile completion
        const hasBasicInfo = profile.fullName && profile.email && profile.phoneNumber && profile.shortBio;
        const hasQualifications = Array.isArray(profile.qualifications) && profile.qualifications.length > 0;
        const hasExperiences = Array.isArray(profile.experiences) && profile.experiences.length > 0;
        const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
        const hasDocuments = Array.isArray(profile.documents) && profile.documents.length > 0;
        const hasSalarySlips = Array.isArray(profile.salarySlips) && profile.salarySlips.length > 0;
        
        // Profile is considered complete if it has basic info, qualifications, experiences, skills, documents, and salary slips
        return hasBasicInfo && hasQualifications && hasExperiences && hasSkills && hasDocuments && hasSalarySlips;
    }, []);

    // Function to show profile completion alert
    const showProfileCompletionAlert = useCallback(async (profileData: any) => {
        const result = await Swal.fire({
            title: 'Complete Your Profile',
            text: 'Your profile is incomplete. Would you like to complete it now?',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: "Let's Complete It",
            cancelButtonText: 'I will do it later',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            customClass: {
                popup: 'swal2-popup-custom',
                title: 'swal2-title-custom',
                confirmButton: 'swal2-confirm-custom'
            }
        });

        if (result.isConfirmed) {
            // Navigate to candidate edit form
            if (profileData?.id || profileData?._id) {
                const candidateId = profileData.id || profileData._id;
                router.push(`/candidates/edit?id=${candidateId}`);
            } else {
                // If no profile exists, navigate to create new profile
                router.push('/candidates/edit');
            }
        }
    }, [router]);

    useEffect(() => {
        try {
            const data = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            setCurrentUser(data ? JSON.parse(data) : null);
        } catch {
            setCurrentUser(null);
        }
    }, []);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchAllCandidates();
                const list = Array.isArray(data) ? data : (Array.isArray((data as any)?.results) ? (data as any).results : []);
                let chosen = list?.[0] || null;
                if (currentUser?.id) {
                    const match = list.find((c: any) => String(c.owner) === String(currentUser.id));
                    if (match) chosen = match;
                }
                setProfileData(chosen);
                
                // Check profile completion after data is loaded
                if (chosen && !isProfileCompleted(chosen)) {
                    // Show profile completion alert after a short delay to ensure UI is ready
                    setTimeout(() => {
                        showProfileCompletionAlert(chosen);
                    }, 1000);
                }
            } catch (e: any) {
                setError('Failed to load profile');
                setProfileData(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [currentUser?.id, isProfileCompleted, showProfileCompletionAlert]);

    console.log(profileData);

    // Download function for documents
    const handleDownload = async (url: string, filename: string) => {
        try {
            // Show loading indicator
            const loadingToast = Swal.fire({
                title: 'Downloading...',
                text: 'Please wait while we prepare your file.',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename || 'document';
            link.style.display = 'none';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            window.URL.revokeObjectURL(downloadUrl);
            
            // Close loading and show success
            await Swal.fire({
                icon: 'success',
                title: 'Download Complete!',
                text: 'Your file has been downloaded successfully.',
                timer: 2000,
                showConfirmButton: false
            });
            
        } catch (error) {
            console.error('Download failed:', error);
            
            // Close loading if still open
            Swal.close();
            
            // Show error message
            await Swal.fire({
                icon: 'error',
                title: 'Download Failed',
                text: 'Unable to download the file. Please try again or contact support if the problem persists.',
                confirmButtonText: 'OK'
            });
        }
    };

    // Function to get social media icon based on platform
    const getSocialIcon = (platform: string) => {
        const platformLower = platform.toLowerCase();
        switch (platformLower) {
            case 'linkedin':
                return 'ri-linkedin-line';
            case 'github':
                return 'ri-github-line';
            case 'twitter':
                return 'ri-twitter-x-line';
            case 'facebook':
                return 'ri-facebook-line';
            case 'instagram':
                return 'ri-instagram-line';
            case 'portfolio':
                return 'ri-briefcase-line';
            case 'website':
                return 'ri-global-line';
            default:
                return 'ri-link';
        }
    };

    // Function to get social media button color based on platform
    const getSocialButtonColor = (platform: string) => {
        const platformLower = platform.toLowerCase();
        switch (platformLower) {
            case 'linkedin':
                return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'github':
                return 'bg-gray-800 hover:bg-gray-900 text-white';
            case 'twitter':
                return 'bg-black hover:bg-gray-800 text-white';
            case 'facebook':
                return 'bg-blue-500 hover:bg-blue-600 text-white';
            case 'instagram':
                return 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white';
            case 'portfolio':
                return 'bg-indigo-600 hover:bg-indigo-700 text-white';
            case 'website':
                return 'bg-gray-600 hover:bg-gray-700 text-white';
            default:
                return 'bg-gray-500 hover:bg-gray-600 text-white';
        }
    };

    // Function to get document thumbnail for profile documents (JPG, JPEG, PNG, PDF only)
    const getDocumentThumbnail = (url: string, label: string) => {
        const fileName = url.toLowerCase();
        const docLabel = (label || '').toLowerCase();
        
        // PDF files - show PDF preview
        if (fileName.includes('.pdf') || docLabel.includes('pdf')) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
                    title="Click to view PDF"
                >
                    <iframe
                        src={url + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH'}
                        className="w-full h-full border-0 pointer-events-none"
                        title="PDF Preview"
                        onError={(e) => {
                            // Fallback to PDF icon if iframe fails
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                        }}
                    />
                    <div className="w-full h-full bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
                        <div className="text-center">
                            <i className="ri-file-pdf-line text-2xl text-red-600 dark:text-red-400 mb-1"></i>
                            <div className="text-xs text-red-600 dark:text-red-400">PDF</div>
                        </div>
                    </div>
                </a>
            );
        }
        
        // Image files (JPG, JPEG, PNG) - show actual image
        if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png')) {
            return (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm block hover:shadow-md transition-shadow cursor-pointer relative"
                    title="Click to view image"
                >
                    <img 
                        src={url} 
                        alt="Document Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback to image icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                                nextElement.style.display = 'flex';
                            }
                        }}
                    />
                    <div className="w-full h-full bg-gray-50 dark:bg-gray-700 rounded flex items-center justify-center absolute inset-0" style={{display: 'none'}}>
                        <div className="text-center">
                            <i className="ri-image-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
                            <div className="text-xs text-gray-600 dark:text-gray-400">IMG</div>
                        </div>
                    </div>
                </a>
            );
        }
        
        // Unsupported file type - show generic file icon
        return (
            <div className="w-12 h-16 rounded overflow-hidden border bg-white shadow-sm">
                <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                    <div className="text-center">
                        <i className="ri-file-line text-2xl text-gray-600 dark:text-gray-400 mb-1"></i>
                        <div className="text-xs text-gray-600 dark:text-gray-400">FILE</div>
                    </div>
                </div>
            </div>
        );
    };

    // Check if user can edit this profile
    const canEditProfile = () => {
        if (!currentUser || !profileData) return false;
        
        // Admin can edit any profile
        if (currentUser.role === 'admin') return true;
        
        // Regular users can only edit their own profile
        if (currentUser.role === 'user') {
            return String(currentUser.id) === String(profileData.owner);
        }
        
        return false;
    };

    // Handle edit profile
    const handleEditProfile = () => {
        if (profileData?.id || profileData?._id) {
            const candidateId = profileData.id || profileData._id;
            router.push(`/candidates/edit?id=${candidateId}`);
        }
    };

    // Function to open share modal
    const openShareModal = () => {
        setShowShareModal(true);
        setShareEmail('');
        setShareWithDoc(false);
    };

    // Function to close share modal
    const closeShareModal = () => {
        setShowShareModal(false);
        setShareEmail('');
        setShareWithDoc(false);
        setSharingProfile(false);
    };

    // Function to handle share profile
    const handleShareProfile = async () => {
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
            setSharingProfile(true);

            const candidateId = profileData?.id || profileData?._id;
            await shareCandidate(candidateId, {
                email: shareEmail.trim(),
                withDoc: shareWithDoc
            });

            await Swal.fire({
                icon: 'success',
                title: 'Profile Shared!',
                text: `Your profile has been shared with ${shareEmail}.`,
                confirmButtonText: 'OK'
            });

            closeShareModal();
        } catch (error: any) {
            console.error('Share profile error:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Share Failed',
                text: error?.message || 'Failed to share profile. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setSharingProfile(false);
        }
    };

    // Punch In/Out Handlers (candidate only on own profile)
    const candidateId = profileData?.id || profileData?._id;
    const profileOwner = profileData?.owner;
    const userId = currentUser?.id;
    const userEmail = currentUser?.email;
    const profileEmail = profileData?.email;
    
    // Check if user owns the profile by owner ID or email match (fallback)
    const ownsProfile = profileOwner && String(profileOwner) === String(userId);
    const emailMatches = userEmail && profileEmail && userEmail.toLowerCase() === profileEmail.toLowerCase();
    const canPunch = currentUser?.role === 'user' && candidateId && (ownsProfile || emailMatches);
    
    // Debug logging (remove in production if needed)
    if (process.env.NODE_ENV === 'development') {
        console.log('Punch In/Out Debug:', {
            userRole: currentUser?.role,
            candidateId,
            profileOwner,
            userId,
            ownsProfile,
            emailMatches,
            canPunch,
            hasProfileData: !!profileData
        });
    }

    // Fetch current punch status from API when profile loads or changes
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                if (!canPunch || !candidateId) return;
                const res = await getPunchInOutStatus(candidateId);
                const activeValue = (res?.isPunchedIn !== undefined) ? res.isPunchedIn : (res?.data?.isActive ?? res?.isActive);
                const active = activeValue === true;
                setPunchedIn(active);
                setPunchStatusData(res?.data || res);
            } catch (e) {
                // if status fetch fails, keep existing state
                console.warn('Failed to fetch punch status', e);
            }
        };
        fetchStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canPunch, candidateId]);

    const handlePunchIn = async () => {
        if (!canPunch || !candidateId) return;
        try {
            setIsPunching(true);
            const nowIso = new Date().toISOString();
            const res = await punchInAttendance(candidateId, { punchInTime: nowIso, notes: "Starting shift" as any });
            setPunchedIn(true);
            setPunchStatusData(res?.data || res);
            await Swal.fire({
                icon: 'success',
                title: 'Punched In',
                text: (res && (res.message || res?.data?.message)) || 'Punched in successfully',
                timer: 1800,
                showConfirmButton: false
            });
            // Refresh status to get updated data
            const statusRes = await getPunchInOutStatus(candidateId);
            setPunchStatusData(statusRes?.data || statusRes);
        } catch (e) {
            console.error('Punch-in failed', e);
            await Swal.fire({
                icon: 'error',
                title: 'Punch In Failed',
                text: (e as any)?.response?.data?.message || (e as any)?.message || 'Failed to punch in. Please try again.'
            });
        } finally {
            setIsPunching(false);
        }
    };

    const handlePunchOut = async () => {
        if (!canPunch || !candidateId) return;
        try {
            setIsPunching(true);
            const nowIso = new Date().toISOString();
            const res = await punchOutAttendance(candidateId, { punchOutTime: nowIso, notes: "Ending shift" as any });
            setPunchedIn(false);
            setPunchStatusData(res?.data || res);
            await Swal.fire({
                icon: 'success',
                title: 'Punched Out',
                text: (res && (res.message || res?.data?.message)) || 'Punched out successfully',
                timer: 1800,
                showConfirmButton: false
            });
            // Refresh status to get updated data
            const statusRes = await getPunchInOutStatus(candidateId);
            setPunchStatusData(statusRes?.data || statusRes);
        } catch (e) {
            console.error('Punch-out failed', e);
            await Swal.fire({
                icon: 'error',
                title: 'Punch Out Failed',
                text: (e as any)?.response?.data?.message || (e as any)?.message || 'Failed to punch out. Please try again.'
            });
        } finally {
            setIsPunching(false);
        }
    };

    return (
        <Fragment>
            <Seo title={"Profile"} />
            {canPunch && (
                <div className="px-4 sm:px-6 mt-2 mb-4">
                    <div className="box">
                        <div className="box-body">
                            <div className="flex flex-wrap items-center gap-3 justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className={`inline-flex items-center rounded-sm px-3 py-1 text-xs font-medium ${punchedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {punchedIn ? 'Status: Active (Punched In)' : 'Status: Inactive (Punched Out)'}
                                    </span>
                                    {punchStatusData && (
                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-2 items-center">
                                            {punchStatusData.day && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="ri-calendar-line"></i>
                                                    {punchStatusData.day}
                                                </span>
                                            )}
                                            {punchStatusData.date && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="ri-calendar-2-line"></i>
                                                    {new Date(punchStatusData.date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {punchedIn && punchStatusData.punchIn && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="ri-time-line"></i>
                                                    Punched In: {new Date(punchStatusData.punchIn).toLocaleTimeString()}
                                                </span>
                                            )}
                                            {!punchedIn && punchStatusData.punchOut && (
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="ri-time-line"></i>
                                                    Punched Out: {new Date(punchStatusData.punchOut).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    {!punchedIn ? (
                                        <button
                                            type="button"
                                            onClick={handlePunchIn}
                                            disabled={isPunching}
                                            className="ti-btn bg-green-600 hover:bg-green-700 text-white !font-medium !gap-1 disabled:opacity-60 shadow-lg shadow-green-500/50 border-2 border-green-400 animate-pulse px-4 py-2"
                                        >
                                            {isPunching ? <i className="ri-loader-4-line animate-spin me-1"></i> : <i className="ri-login-circle-line me-1"></i>}
                                            Punch In
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handlePunchOut}
                                            disabled={isPunching}
                                            className="ti-btn bg-rose-600 text-white !font-medium !gap-1 disabled:opacity-60"
                                        >
                                            {isPunching ? <i className="ri-loader-4-line animate-spin me-1"></i> : <i className="ri-logout-circle-line me-1"></i>}
                                            Punch Out
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Pageheader currentpage="Profile" activepage="Pages" mainpage="Profile" />
            <div className="grid grid-cols-12 gap-x-6">
                <div className="xxl:col-span-4 xl:col-span-12 col-span-12">
                    <div className="box overflow-hidden">
                        <div className="box-body !p-0">
                            <div className="sm:flex items-start p-6 !bg-primary">
                                <div>
                                    <span className="avatar avatar-xxl avatar-rounded online me-4">
                                        <img 
                                            src={
                                                profileData?.profilePicture?.url || 
                                                profileData?.src || 
                                                "/assets/images/faces/1.jpg"
                                            } 
                                            alt={profileData?.fullName || "Profile Picture"} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "/assets/images/faces/1.jpg";
                                            }}
                                        />
                                    </span>
                                </div>
                                <div className="flex-grow main-profile-info">
                                    <div className="flex items-center !justify-between">
                                        <h6 className="font-semibold mb-1 text-white text-[1rem]">{profileData?.fullName}</h6>
                                        <div className="flex gap-2">
                                            {canEditProfile() && (
                                                <button 
                                                    type="button" 
                                                    onClick={handleEditProfile}
                                                    className="ti-btn ti-btn-light !font-medium !gap-0"
                                                >
                                                    <i className="ri-edit-line me-1 align-middle inline-block"></i>
                                                    {/* Edit Profile */}
                                                </button>
                                            )}
                                            <button 
                                                type="button" 
                                                onClick={openShareModal}
                                                className="ti-btn ti-btn-light !font-medium !gap-0"
                                            >
                                                <i className="ri-share-line me-1 align-middle inline-block"></i>
                                                Share Profile
                                            </button>
                                            {/* <button type="button" className="ti-btn ti-btn-light !font-medium !gap-0"><i className="ri-add-line me-1 align-middle inline-block"></i>Follow</button> */}
                                        </div>
                                    </div>
                                    <p className="mb-1 !text-white  opacity-[0.7]">{profileData?.shortBio}</p>
                                    <p className="text-[0.75rem] text-white mb-6 opacity-[0.5]">
                                        <span className="me-4 inline-flex"><i className="ri-building-line me-1 align-middle"></i>{profileData?.address?.country || 'Country'}</span>
                                        <span className="inline-flex"><i className="ri-map-pin-line me-1 align-middle"></i>{profileData?.address?.city || 'Location'}</span>
                                    </p>
                                    {/* <div className="flex mb-0">
                                        <div className="me-6">
                                            <p className="font-bold text-[1.25rem] text-white text-shadow mb-0">113</p>
                                            <p className="mb-0 text-[.6875rem] opacity-[0.5] text-white">Projects</p>
                                        </div>
                                        <div className="me-6">
                                            <p className="font-bold text-[1.25rem] text-white text-shadow mb-0">12.2k</p>
                                            <p className="mb-0 text-[.6875rem] opacity-[0.5] text-white">Followers</p>
                                        </div>
                                        <div className="me-6">
                                            <p className="font-bold text-[1.25rem] text-white text-shadow mb-0">128</p>
                                            <p className="mb-0 text-[.6875rem] opacity-[0.5] text-white">Following</p>
                                        </div>
                                    </div> */}
                                </div>
                            </div>
                            <div className="p-6 border-b border-dashed dark:border-defaultborder/10">
                                <div className="mb-0">
                                    <p className="text-[.9375rem] mb-2 font-semibold">Professional Bio :</p>
                                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 opacity-[0.7] mb-0">{profileData?.shortBio || ''}</p>
                                </div>
                            </div>
                            <div className="p-6 border-b dark:border-defaultborder/10 border-dashed sm:flex items-center">
                                <p className="text-[.9375rem] mb-2 me-6 font-semibold">Social Networks :</p>
                                <div className="btn-list mb-0">
                                    {Array.isArray(profileData?.socialLinks) && profileData.socialLinks.length > 0 ? (
                                        profileData.socialLinks.map((link: any, index: number) => (
                                            <a
                                                key={index}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`${link.platform} profile`}
                                                className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200 me-[.375rem] mb-1 ${getSocialButtonColor(link.platform)}`}
                                            >
                                                <i className={`${getSocialIcon(link.platform)} text-sm`}></i>
                                            </a>
                                        ))
                                    ) : (
                                        <span className="text-[#8c9097] dark:text-white/50 text-sm">No social networks available</span>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 border-b border-dashed dark:border-defaultborder/10">
                                <p className="text-[.9375rem] mb-2 me-6 font-semibold">Contact Information :</p>
                                <div className="text-[#8c9097] dark:text-white/50">
                                    <p className="mb-2">
                                        <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                                            <i className="ri-mail-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"></i>
                                        </span>
                                        {profileData?.email}
                                    </p>
                                    <p className="mb-2">
                                        <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                                            <i className="ri-phone-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"></i>
                                        </span>
                                        {profileData?.phoneNumber}
                                    </p>
                                    <p className="mb-0">
                                        <span className="avatar avatar-sm avatar-rounded me-2 bg-light text-[#8c9097] dark:text-white/50">
                                            <i className="ri-map-pin-line align-middle text-[.875rem] text-[#8c9097] dark:text-white/50"></i>
                                        </span>
                                        {profileData?.address ? (
                                            `${profileData.address.streetAddress || ''} ${profileData.address.city || ''} ${profileData.address.state || ''} ${profileData.address.country || ''} ${profileData.address.zipCode || ''}`.trim() || 'Address not provided'
                                        ) : (
                                            'Address not provided'
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-b dark:border-defaultborder/10 border-dashed">
                                <p className="text-[.9375rem] mb-2 me-6 font-semibold">Skills :</p>
                                <div>
                                    {Array.isArray(profileData?.skills) && profileData.skills.length > 0 ? (
                                        profileData.skills.map((skill: any, index: number) => (
                                            <span 
                                                key={index}
                                                className="badge bg-light text-[#8c9097] dark:text-white/50 m-1"
                                                title={skill.level ? `Level: ${skill.level}` : ''}
                                            >
                                                {skill.name}
                                                {skill.level && (
                                                    <span className="ml-1 text-xs opacity-75">({skill.level})</span>
                                                )}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[#8c9097] dark:text-white/50 text-sm">No skills available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="xxl:col-span-8 xl:col-span-12 col-span-12">
                    <div className="grid grid-cols-12 gap-x-6">
                        <div className="xl:col-span-12 col-span-12">
                            <div className="box">
                                <div className="box-body !p-0">
                                    <div className="!p-4 border-b dark:border-defaultborder/10 border-dashed md:flex items-center justify-between">
                                        <nav className="-mb-0.5 sm:flex md:space-x-4 rtl:space-x-reverse pb-2" role='tablist'>
                                            <Link className="w-full sm:w-auto flex active hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md py-2 px-4 text-primary text-sm" href="#!" scroll={false} id="activity-tab" data-hs-tab="#activity-tab-pane" aria-controls="activity-tab-pane">
                                                <i className="ri-gift-line  align-middle inline-block me-1"></i>Personal Info:
                                            </Link>
                                            <Link className="w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm" href="#!" scroll={false} id="posts-tab" data-hs-tab="#posts-tab-pane" aria-controls="posts-tab-pane">
                                                <i className="ri-bill-line me-1 align-middle inline-block"></i>Qualification
                                            </Link>
                                            <Link className="w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm" href="#!" scroll={false} id="followers-tab" data-hs-tab="#followers-tab-pane" aria-controls="followers-tab-pane">
                                                <i className="ri-money-dollar-box-line me-1 align-middle inline-block"></i>Work Experience 
                                            </Link>
                                            <Link className="w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm" href="#!" scroll={false} id="gallery-tab" data-hs-tab="#gallery-tab-pane" aria-controls="gallery-tab-pane">
                                                <i className="ri-exchange-box-line me-1 align-middle inline-block"></i>Document
                                            </Link>
                                            <Link className="w-full sm:w-auto flex hs-tab-active:font-semibold  hs-tab-active:text-white hs-tab-active:bg-primary rounded-md  py-2 px-4 text-primary text-sm" href="#!" scroll={false} id="salary-tab" data-hs-tab="#salary-tab-pane" aria-controls="salary-tab-pane">
                                                <i className="ri-money-dollar-box-line me-1 align-middle inline-block"></i>Salary Slips
                                            </Link>
                                        </nav>
                                        {canEditProfile() && (
                                            <button 
                                                type="button" 
                                                onClick={handleEditProfile}
                                                className="ti-btn ti-btn-sm ti-btn-primary !font-medium"
                                            >
                                                <i className="ri-edit-line me-1 align-middle inline-block"></i>
                                                {/* Edit Profile */}
                                            </button>
                                        )}
                                    </div>
                                    <div className="!p-4">
                                        <div className="tab-content" id="myTabContent">
                                            <div className="tab-pane show active fade !p-0 !border-0" id="activity-tab-pane" role="tabpanel" aria-labelledby="activity-tab">
                                                <div className="mb-4">
                                                    <p className="text-[.9375rem] font-semibold mb-2">Personal Info :</p>
                                                    <div className="table-responsive min-w-full">
                                                        <table className="table table-bordered whitespace-nowrap w-full">
                                                            <tbody>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Full Name
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.fullName || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Email
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.email || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Phone Number
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.countryCode === "IN" ? "+91 " : "+1 "}{profileData?.phoneNumber || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        SEVIS ID
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.sevisId || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        EAD
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.ead || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Degree
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.degree || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Visa Type
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.visaType || '-'}</td>
                                                                </tr>
                                                                {profileData?.customVisaType && (
                                                                    <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                        <th scope="row" className="!font-semibold text-start">
                                                                            Custom Visa Type
                                                                        </th>
                                                                        <td className="text-gray-600">{profileData.customVisaType}</td>
                                                                    </tr>
                                                                )}
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Salary Range
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.salaryRange || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Supervisor Name
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.supervisorName || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Supervisor Contact
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.supervisorCountryCode === "IN" ? "+91 " : "+1 "}{profileData?.supervisorContact || '-'}</td>
                                                                </tr>
                                                                <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                    <th scope="row" className="!font-semibold text-start">
                                                                        Short Bio
                                                                    </th>
                                                                    <td className="text-gray-600">{profileData?.shortBio || '-'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    
                                                    {/* Address Information */}
                                                    {profileData?.address && (
                                                        <div className="mt-6">
                                                            <p className="text-[.9375rem] font-semibold mb-2">Address Information :</p>
                                                            <div className="table-responsive min-w-full">
                                                                <table className="table table-bordered whitespace-nowrap w-full">
                                                                    <tbody>
                                                                        <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                Street Address
                                                                            </th>
                                                                            <td className="text-gray-600">{profileData?.address?.streetAddress || '-'}</td>
                                                                        </tr>
                                                                        {profileData?.address?.streetAddress2 && (
                                                                            <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                                <th scope="row" className="!font-semibold text-start">
                                                                                    Street Address 2
                                                                                </th>
                                                                                <td className="text-gray-600">{profileData.address.streetAddress2}</td>
                                                                            </tr>
                                                                        )}
                                                                        <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                City
                                                                            </th>
                                                                            <td className="text-gray-600">{profileData?.address?.city || '-'}</td>
                                                                        </tr>
                                                                        <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                State
                                                                            </th>
                                                                            <td className="text-gray-600">{profileData?.address?.state || '-'}</td>
                                                                        </tr>
                                                                        <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                Zip Code
                                                                            </th>
                                                                            <td className="text-gray-600">{profileData?.address?.zipCode || '-'}</td>
                                                                        </tr>
                                                                        <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                Country
                                                                            </th>
                                                                            <td className="text-gray-600">{profileData?.address?.country || '-'}</td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="tab-pane fade !p-0 !border-0 hidden !rounded-md" id="posts-tab-pane"
                                                role="tabpanel" aria-labelledby="posts-tab">
                                                <div className="xl:col-span-12 col-span-12">
                                                    <div className="tab-content task-tabs-container">
                                                        <div className="tab-pane show active !p-0" id="all-tasks" aria-labelledby="alltasks-item"
                                                            role="tabpanel">
                                                            <div className="grid grid-cols-12 gap-x-6" id="tasks-container">
                                                                {Array.isArray(profileData?.qualifications) && profileData.qualifications.length ? (
                                                                    profileData.qualifications.map((q: any, idx: number) => (
                                                                        <div className="col-span-12 task-card" key={idx}>
                                                                            <div className="box task-pending-card">
                                                                                <div className="box-body">
                                                                                    <div className="flex justify-between flex-wrap gap-2">
                                                                                        <div>
                                                                                            <p className="font-semibold mb-4 flex items-center"><Link aria-label="anchor" href="#!" scroll={false}><i className="ri-star-s-fill text-[1rem] opacity-[0.5] me-1 text-[#8c9097] dark:text-white/50"></i></Link>Education</p>
                                                                                            <p className="mb-4">Degree : <span className="text-[0.75rem] mb-1 text-[#8c9097] dark:text-white/50">{q?.degree || '-'}</span></p>
                                                                                            <p className="mb-4">University/Institute : <span className="text-[0.75rem] mb-1 text-[#8c9097] dark:text-white/50">{q?.institute || '-'}</span></p>
                                                                                            <p className="mb-4">Location : <span className="text-[0.75rem] mb-1 text-[#8c9097] dark:text-white/50">{q?.location || '-'}</span></p>
                                                                                            <p className="mb-4">Start & End Year : <span className="text-[0.75rem] mb-1 text-[#8c9097] dark:text-white/50">{q?.startYear ? String(q.startYear) : '-'} - {q?.endYear ? String(q.endYear) : 'Present'}</span></p>
                                                                                            <p className="mb-4">Description : <span className="text-[0.75rem] mb-1 text-[#8c9097] dark:text-white/50">{q?.description || '-'}</span></p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="col-span-12">
                                                                        <div className="box"><div className="box-body"><div className="text-[#8c9097] dark:text-white/50">No qualifications found.</div></div></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="tab-pane fade !p-0 !border-0 hidden" id="followers-tab-pane"
                                                role="tabpanel" aria-labelledby="followers-tab">
                                                <div className="col-span-12 xl:col-span-4">
                                                    <div className="box">
                                                        <div className="box-header">
                                                        <h5 className="box-title">Experience</h5>
                                                        </div>
                                                        <div className="box-body">
                                                        <div>
                                                            {Array.isArray(profileData?.experiences) && profileData.experiences.length ? (
                                                                profileData.experiences.map((e: any, idx: number) => (
                                                                    <div key={idx} className="flex gap-x-3 relative group rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                                                                        <a className="absolute inset-0 z-[1]" href="#!"></a>
                                                                        <div className="relative last:after:hidden after:absolute after:top-0 after:bottom-0 after:start-3.5 after:w-px after:-translate-x-[0.5px] after:bg-gray-200 dark:after:dark:bg-bodybg2 dark:group-hover:after:bg-bodybg/70">
                                                                            <div className="relative z-10 size-7 flex justify-center items-center">
                                                                                <div className="size-2 rounded-full bg-white border-2 border-gray-300 group-hover:border-gray-600 dark:group-hover:border-white dark:bg-bgdark dark:border-white/10"></div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="grow pt-2 pb-8">
                                                                            <p className="flex gap-x-1.5 font-semibold text-gray-800 dark:text-white">
                                                                                {e?.company || '-'}
                                                                            </p>
                                                                            <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
                                                                                {e?.role || '-'}
                                                                            </p>
                                                                            <p className="mt-1 text-sm text-gray-600 dark:text-white/70">
                                                                                {e?.startDate ? new Date(e.startDate).toLocaleDateString() : '-'}
                                                                                {' '}-{' '}
                                                                                {e?.endDate ? new Date(e.endDate).toLocaleDateString() : 'Present'}
                                                                            </p>
                                                                            {e?.description && (
                                                                                <button type="button" className="mt-1 -ms-1 p-1 relative z-10 inline-flex items-center gap-x-2 text-xs rounded-lg border border-transparent text-gray-500 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none dark:text-white/70 dark:hover:bg-bodybg dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-white/10">
                                                                                    <img className="flex-shrink-0 size-4 rounded-full" src="/assets/images/faces/1.jpg" alt="Image Description"/>
                                                                                    {e.description}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-[#8c9097] dark:text-white/50">No experiences found.</div>
                                                            )}
                                                        </div>
                                                        </div>
                                                    </div>
                                                    </div>
                                            </div>
                                            <div className="tab-pane fade !p-0 !border-0 hidden" id="gallery-tab-pane" role="tabpanel" aria-labelledby="gallery-tab">
                                                <div className="mb-4">
                                                    <p className="text-[.9375rem] font-semibold mb-2">Personal Info :</p>
                                                    <div className="table-responsive min-w-full">
                                                        <table className="table table-bordered whitespace-nowrap w-full">
                                                            <thead>
                                                                <tr>
                                                                    <th>Thumbnail</th>
                                                                    <th>Document</th>
                                                                    <th>Status</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Array.isArray(profileData?.documents) && profileData.documents.length ? (
                                                                    profileData.documents.map((d: any, idx: number) => (
                                                                        <tr key={idx} className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <td className="text-gray-600">
                                                                                {d?.url || d?.documentUrl ? getDocumentThumbnail(d.url || d.documentUrl, d.label) : '-'}
                                                                            </td>
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                {d?.label || 'Document'}
                                                                            </th>
                                                                            <td className="text-gray-600">
                                                                                {d?.status !== undefined ? (
                                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                                        d.status === 0 ? 'bg-yellow-100 text-yellow-800' : 
                                                                                        d.status === 1 ? 'bg-green-100 text-green-800' : 
                                                                                        'bg-red-100 text-red-800'
                                                                                    }`}>
                                                                                        {d.status === 0 ? 'Pending' : d.status === 1 ? 'Approved' : 'Rejected'}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-gray-400">-</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="text-gray-600">
                                                                                {d?.url || d?.documentUrl ? (
                                                                                    <div className="flex gap-2">
                                                                                        <button 
                                                                                            onClick={() => handleDownload(d.url || d.documentUrl, d.label || 'document')}
                                                                                            className="text-green-600 inline-flex items-center hover:underline"
                                                                                        >
                                                                                            <i className="ri-download-line me-1 align-middle inline-block"></i>
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    '-'
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                        <td colSpan={4} className="text-[#8c9097] dark:text-white/50 text-center">No documents found.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="tab-pane fade !p-0 !border-0 hidden" id="salary-tab-pane" role="tabpanel" aria-labelledby="salary-tab">
                                                <div className="mb-4">
                                                    <p className="text-[.9375rem] font-semibold mb-2">Salary Slips :</p>
                                                    <div className="table-responsive min-w-full">
                                                        <table className="table table-bordered whitespace-nowrap w-full">
                                                            <thead>
                                                                <tr>
                                                                    <th>Thumbnail</th>
                                                                    <th>Month</th>
                                                                    <th>Year</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Array.isArray(profileData?.salarySlips) && profileData.salarySlips.length ? (
                                                                    profileData.salarySlips.map((slip: any, idx: number) => (
                                                                        <tr key={idx} className="border border-defaultborder dark:border-defaultborder/10">
                                                                            <td className="text-gray-600">
                                                                                {slip?.documentUrl || slip?.url ? getDocumentThumbnail(slip.documentUrl || slip.url, `${slip.month} ${slip.year}`) : '-'}
                                                                            </td>
                                                                            <th scope="row" className="!font-semibold text-start">
                                                                                {slip?.month || '-'}
                                                                            </th>
                                                                            <td className="text-gray-600">
                                                                                {slip?.year || '-'}
                                                                            </td>
                                                                            <td className="text-gray-600">
                                                                                {slip?.documentUrl || slip?.url ? (
                                                                                    <div className="flex gap-2">
                                                                                        <button 
                                                                                            onClick={() => handleDownload(slip.documentUrl || slip.url, `${slip.month}_${slip.year}_salary_slip`)}
                                                                                            className="text-green-600 inline-flex items-center hover:underline"
                                                                                        >
                                                                                            <i className="ri-download-line me-1 align-middle inline-block"></i>
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    '-'
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                ) : (
                                                                    <tr className="border border-defaultborder dark:border-defaultborder/10">
                                                                        <td colSpan={4} className="text-[#8c9097] dark:text-white/50 text-center">No salary slips found.</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Profile Modal */}
            {showShareModal && (
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
                                            <img src={profileData?.src || "/assets/images/faces/1.jpg"} alt="Profile" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                                                Share Profile
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {profileData?.fullName}
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
                                            <strong>Share Preview:</strong> {profileData?.fullName}'s profile 
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
                                    disabled={sharingProfile}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleShareProfile}
                                    disabled={sharingProfile || !shareEmail.trim()}
                                    className="ti-btn ti-btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sharingProfile ? (
                                        <>
                                            <i className="ri-loader-4-line animate-spin me-1"></i>
                                            Sharing...
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-share-line me-1"></i>
                                            Share Profile
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    )
}

export default profile