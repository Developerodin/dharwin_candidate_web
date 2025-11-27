"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link';
import React, { Fragment, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { fetchRecruiterById, updateRecruiter } from '@/shared/lib/recruiters';

const EditRecruiter = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phoneNumber: '',
        countryCode: '+1'
    });

    useEffect(() => {
        const loadRecruiter = async () => {
            if (!id) {
                setFetching(false);
                return;
            }

            try {
                const data = await fetchRecruiterById(id);
                setFormData({
                    name: data?.name || '',
                    email: data?.email || '',
                    password: '', // Don't pre-fill password
                    confirmPassword: '', // Don't pre-fill confirm password
                    phoneNumber: data?.phoneNumber || '',
                    countryCode: data?.countryCode || '+1'
                });
            } catch (error: any) {
                console.error('Error fetching recruiter:', error);
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error?.response?.data?.message || error?.message || 'Failed to fetch recruiter details.',
                    confirmButtonText: 'OK'
                });
                router.push('/recruiters');
            } finally {
                setFetching(false);
            }
        };

        loadRecruiter();
    }, [id, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!id) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Recruiter ID is missing.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Validation
        if (!formData.name.trim()) {
            await Swal.fire({
                icon: 'warning',
                title: 'Name Required',
                text: 'Please enter the recruiter name.',
                confirmButtonText: 'OK'
            });
            return;
        }

        if (!formData.email.trim()) {
            await Swal.fire({
                icon: 'warning',
                title: 'Email Required',
                text: 'Please enter the recruiter email.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            await Swal.fire({
                icon: 'warning',
                title: 'Invalid Email',
                text: 'Please enter a valid email address.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Password validation (only if provided)
        if (formData.password && formData.password.length < 6) {
            await Swal.fire({
                icon: 'warning',
                title: 'Invalid Password',
                text: 'Password must be at least 6 characters long.',
                confirmButtonText: 'OK'
            });
            return;
        }

        // Check if passwords match (only if password is being changed)
        if (formData.password && formData.password !== formData.confirmPassword) {
            await Swal.fire({
                icon: 'warning',
                title: 'Password Mismatch',
                text: 'Password and confirm password do not match.',
                confirmButtonText: 'OK'
            });
            return;
        }

        setLoading(true);
        try {
            const payload: any = {
                id: id,
                name: formData.name.trim(),
                email: formData.email.trim()
            };

            // Only include password if it's provided
            if (formData.password.trim()) {
                payload.password = formData.password;
            }

            if (formData.phoneNumber.trim()) {
                payload.phoneNumber = formData.phoneNumber.trim();
            }
            if (formData.countryCode) {
                payload.countryCode = formData.countryCode;
            }

            await updateRecruiter(payload);
            
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Recruiter has been updated successfully.',
                confirmButtonText: 'OK'
            });

            // Redirect to recruiters list
            router.push('/recruiters');
        } catch (error: any) {
            console.error('Error updating recruiter:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.message || error?.message || 'Failed to update recruiter. Please try again.',
                confirmButtonText: 'OK'
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <Fragment>
                <Seo title="Edit Recruiter" />
                <Pageheader currentpage="Edit Recruiter" activepage="Recruiters" mainpage="Edit Recruiter" />
                <div className="container">
                    <div className="grid grid-cols-12">
                        <div className="xl:col-span-8 lg:col-span-8 md:col-span-12 col-span-12 mx-auto">
                            <div className="box">
                                <div className="box-body text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="mt-2 text-gray-500">Loading recruiter details...</p>
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
            <Seo title="Edit Recruiter" />
            <Pageheader currentpage="Edit Recruiter" activepage="Recruiters" mainpage="Edit Recruiter" />
            <div className="container">
                <div className="grid grid-cols-12">
                    <div className="xl:col-span-10 lg:col-span-10 md:col-span-12 col-span-12 mx-auto">
                        <div className="box">
                            <div className="box-header border-b border-defaultborder dark:border-defaultborder/10 pb-4">
                                <div className="box-title flex items-center m-auto gap-2">
                                    <i className="ri-user-settings-line text-xl text-primary"></i>
                                    <span>Edit Recruiter</span>
                                </div>
                            </div>
                            <div className="box-body">
                                <form onSubmit={handleSubmit}>
                                    <div className="space-y-6">
                                        {/* Basic Information Section */}
                                        <div>
                                            <h6 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                <i className="ri-information-line text-primary"></i>
                                                Basic Information
                                            </h6>
                                            <div className="grid grid-cols-12 gap-4">
                                                {/* Name */}
                                                <div className="xl:col-span-12 col-span-12">
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
                                                            className="ti-form-control border-s-0 w-full"
                                                            name="name"
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                            placeholder="Enter recruiter full name"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* Email */}
                                                <div className="xl:col-span-12 col-span-12">
                                                    <label className="form-label mb-2 flex items-center gap-1">
                                                        <i className="ri-mail-line text-[0.875rem] text-gray-500"></i>
                                                        Email Address <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                                                            <i className="ri-mail-line text-gray-500"></i>
                                                        </span>
                                                        <input
                                                            type="email"
                                                            className="ti-form-control border-s-0 w-full"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            placeholder="Enter recruiter email address"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password */}
                                                <div className="xl:col-span-12 col-span-12">
                                                    <label className="form-label mb-2 flex items-center gap-1">
                                                        <i className="ri-lock-password-line text-[0.875rem] text-gray-500"></i>
                                                        New Password
                                                    </label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                                                            <i className="ri-lock-password-line text-gray-500"></i>
                                                        </span>
                                                        <input
                                                            type={showPassword ? "text" : "password"}
                                                            className="ti-form-control border-s-0 w-full"
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            placeholder="Enter new password (leave blank to keep current)"
                                                            minLength={6}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="input-group-text bg-light border-s-0 dark:bg-bodybg dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-bodybg2 transition-colors"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                        >
                                                            <i className={showPassword ? "ri-eye-off-line text-gray-500" : "ri-eye-line text-gray-500"}></i>
                                                        </button>
                                                    </div>
                                                    <small className="text-muted text-[0.75rem] mt-1 block">
                                                        <i className="ri-information-line me-1"></i>
                                                        Leave blank to keep the current password. Minimum 6 characters if changing.
                                                    </small>
                                                </div>

                                                {/* Confirm Password - Only show if password is being changed */}
                                                {formData.password && (
                                                    <div className="xl:col-span-12 col-span-12">
                                                        <label className="form-label mb-2 flex items-center gap-1">
                                                            <i className="ri-lock-password-line text-[0.875rem] text-gray-500"></i>
                                                            Confirm New Password <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-light border-e-0 dark:bg-bodybg dark:border-white/10">
                                                                <i className="ri-lock-password-line text-gray-500"></i>
                                                            </span>
                                                            <input
                                                                type={showConfirmPassword ? "text" : "password"}
                                                                className="ti-form-control border-s-0 w-full"
                                                                name="confirmPassword"
                                                                value={formData.confirmPassword}
                                                                onChange={handleChange}
                                                                placeholder="Confirm your new password"
                                                                required={!!formData.password}
                                                                minLength={6}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="input-group-text bg-light border-s-0 dark:bg-bodybg dark:border-white/10 cursor-pointer hover:bg-gray-100 dark:hover:bg-bodybg2 transition-colors"
                                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            >
                                                                <i className={showConfirmPassword ? "ri-eye-off-line text-gray-500" : "ri-eye-line text-gray-500"}></i>
                                                            </button>
                                                        </div>
                                                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                            <small className="text-danger text-[0.75rem] mt-1 block">
                                                                <i className="ri-error-warning-line me-1"></i>
                                                                Passwords do not match
                                                            </small>
                                                        )}
                                                        {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                                            <small className="text-success text-[0.75rem] mt-1 block">
                                                                <i className="ri-checkbox-circle-line me-1"></i>
                                                                Passwords match
                                                            </small>
                                                        )}
                                                        {formData.password && !formData.confirmPassword && (
                                                            <small className="text-muted text-[0.75rem] mt-1 block">
                                                                <i className="ri-information-line me-1"></i>
                                                                Please confirm your new password
                                                            </small>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Information Section */}
                                        <div className="border-t border-defaultborder dark:border-defaultborder/10 pt-6">
                                            <h6 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                                <i className="ri-phone-line text-primary"></i>
                                                Contact Information <span className="text-[0.75rem] font-normal text-gray-500">(Optional)</span>
                                            </h6>
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
                                                            onChange={handleChange}
                                                        >
                                                            <option value="+1">+1 (US/CA)</option>
                                                            <option value="+91">+91 (IN)</option>
                                                            <option value="+44">+44 (UK)</option>
                                                            <option value="+61">+61 (AU)</option>
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
                                                            className="ti-form-control border-s-0 w-full"
                                                            name="phoneNumber"
                                                            value={formData.phoneNumber}
                                                            onChange={handleChange}
                                                            placeholder="Enter phone number"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
                                                    Update Recruiter
                                                </>
                                            )}
                                        </button>
                                        <Link
                                            href="/recruiters"
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
    )
}

export default EditRecruiter;

