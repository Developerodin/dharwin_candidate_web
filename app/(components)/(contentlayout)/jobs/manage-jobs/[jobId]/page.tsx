"use client"

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import { getJobById } from '@/shared/lib/jobs'

const JobDetailsPage = () => {
    const params = useParams()
    const jobId = (params?.jobId as string) || ''

    const [job, setJob] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!jobId) return

        const fetchJobDetails = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await getJobById(jobId)
                setJob(data)
            } catch (err: any) {
                setError(err?.message || 'Failed to load job details')
                setJob(null)
            } finally {
                setLoading(false)
            }
        }

        fetchJobDetails()
    }, [jobId])

    const decodeHtml = (html: string): string => {
        if (!html) return ''
        let decoded = ''
        
        if (typeof window === 'undefined') {
            // Server-side: basic HTML entity decoding
            decoded = html
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
        } else {
            // Client-side: use DOM to decode
            const textarea = document.createElement('textarea')
            textarea.innerHTML = html
            decoded = textarea.value
        }
        
        // Clean up malformed HTML (remove nested empty p tags, fix structure)
        decoded = decoded.replace(/<p>\s*<p>/g, '<p>')
        decoded = decoded.replace(/<\/p>\s*<\/p>/g, '</p>')
        
        // If it doesn't contain HTML tags but has content, wrap in paragraph
        if (decoded.trim() && !decoded.includes('<') && !decoded.includes('>')) {
            decoded = `<p>${decoded}</p>`
        }
        
        return decoded
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const formatSalaryRange = (salaryRange: any) => {
        if (!salaryRange) return '-'
        const currency = salaryRange.currency || 'USD'
        const min = salaryRange.min ? salaryRange.min.toLocaleString() : null
        const max = salaryRange.max ? salaryRange.max.toLocaleString() : null
        if (!min && !max) return '-'
        if (min && max) return `${currency} ${min} - ${max}`
        if (min) return `${currency} ${min}+`
        return `${currency} ${max}`
    }

    const getBadgeClass = (value?: string, type: 'status' | 'jobType' = 'status') => {
        if (!value) return 'bg-gray-100 text-gray-600'
        const normalized = value.toLowerCase()
        if (type === 'jobType') {
            switch (normalized) {
                case 'full-time':
                    return 'bg-primary/10 text-primary'
                case 'part-time':
                    return 'bg-info/10 text-info'
                case 'contract':
                    return 'bg-warning/10 text-warning'
                case 'temporary':
                    return 'bg-secondary/10 text-secondary'
                case 'internship':
                    return 'bg-success/10 text-success'
                case 'freelance':
                    return 'bg-pinkmain/10 text-pinkmain'
                default:
                    return 'bg-gray-100 text-gray-600'
            }
        }

        switch (normalized) {
            case 'active':
                return 'bg-success/10 text-success'
            case 'draft':
                return 'bg-warning/10 text-warning'
            case 'closed':
                return 'bg-danger/10 text-danger'
            case 'archived':
                return 'bg-secondary/10 text-secondary'
            default:
                return 'bg-gray-100 text-gray-600'
        }
    }

    return (
        <Fragment>
            <Seo title={job ? `Job: ${job.title}` : 'Job Details'} />
            <Pageheader currentpage="Job Details" activepage="Jobs" mainpage="Manage Jobs" />
            <div className="grid grid-cols-12 gap-x-6">
                <div className="col-span-12">
                    <div className="box">
                        <div className="box-header justify-between flex-wrap gap-3">
                            <div>
                                <div className="box-title text-[1.25rem]">{job?.title || 'Job Details'}</div>
                                <div className="text-[#8c9097] dark:text-white/50 text-[0.875rem]">
                                    Job ID: <span className="font-semibold">{jobId}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/jobs/manage-jobs"
                                    className="ti-btn ti-btn-light ti-btn-wave !py-1 !px-3 !text-[0.8125rem]"
                                >
                                    <i className="ri-arrow-left-line me-1"></i>Back to Jobs
                                </Link>
                                {job && (
                                    <Link
                                        href={`/jobs/update-jobs/${job.id || job._id || jobId}`}
                                        className="ti-btn ti-btn-primary ti-btn-wave !py-1 !px-3 !text-[0.8125rem]"
                                    >
                                        <i className="ri-edit-line me-1"></i>Edit Job
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="box-body">
                            {loading && (
                                <div className="text-center py-20">
                                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                    <p className="mt-3 text-[#8c9097] dark:text-white/50">Loading job details...</p>
                                </div>
                            )}

                            {error && !loading && (
                                <div className="alert alert-danger mb-0" role="alert">
                                    {error}
                                </div>
                            )}

                            {!loading && !error && job && (
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-3 items-center">
                                        <span className={`badge ${getBadgeClass(job.status, 'status')}`}>
                                            {job.status || 'Unknown'}
                                        </span>
                                        <span className={`badge ${getBadgeClass(job.jobType, 'jobType')}`}>
                                            {job.jobType || 'Job Type'}
                                        </span>
                                        {job.location && (
                                            <span className="badge bg-info/10 text-info">
                                                <i className="ri-map-pin-line me-1"></i>
                                                {job.location}
                                            </span>
                                        )}
                                        {job.experienceLevel && (
                                            <span className="badge bg-secondary/10 text-secondary">
                                                {job.experienceLevel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="xxl:col-span-8 col-span-12">
                                            <div className="border border-dashed rounded-md p-4">
                                                <h5 className="font-semibold mb-3">Job Description</h5>
                                                {job.jobDescription ? (
                                                    <div 
                                                        className="text-[0.9375rem] text-[#8c9097] dark:text-white/70 ql-editor"
                                                        dangerouslySetInnerHTML={{ __html: decodeHtml(job.jobDescription) }}
                                                    />
                                                ) : (
                                                    <p className="text-[0.9375rem] text-[#8c9097] dark:text-white/70">
                                                        No description provided.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="xxl:col-span-4 col-span-12">
                                            <div className="border border-dashed rounded-md p-4 space-y-3">
                                                <h5 className="font-semibold mb-2">Job Overview</h5>
                                                <div className="flex justify-between text-[0.875rem]">
                                                    <span className="text-[#8c9097] dark:text-white/50">Salary Range</span>
                                                    <span className="font-semibold">{formatSalaryRange(job.salaryRange)}</span>
                                                </div>
                                                <div className="flex justify-between text-[0.875rem]">
                                                    <span className="text-[#8c9097] dark:text-white/50">Template</span>
                                                    <span className="font-semibold">
                                                        {typeof job.templateId === 'object'
                                                            ? job.templateId?.name || job.templateId?.id || '-'
                                                            : job.templateId || '-'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-[0.875rem]">
                                                    <span className="text-[#8c9097] dark:text-white/50">Created</span>
                                                    <span className="font-semibold">{formatDate(job.createdAt)}</span>
                                                </div>
                                                <div className="flex justify-between text-[0.875rem]">
                                                    <span className="text-[#8c9097] dark:text-white/50">Updated</span>
                                                    <span className="font-semibold">{formatDate(job.updatedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-dashed rounded-md p-4">
                                        <h5 className="font-semibold mb-3">Organisation Details</h5>
                                        {job.organisation ? (
                                            <div className="grid grid-cols-12 gap-4 text-[0.875rem]">
                                                <div className="md:col-span-6 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Name</p>
                                                    <p className="font-semibold">{job.organisation.name || '-'}</p>
                                                </div>
                                                <div className="md:col-span-6 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Website</p>
                                                    {job.organisation.website ? (
                                                        <Link
                                                            href={job.organisation.website}
                                                            target="_blank"
                                                            className="text-primary underline"
                                                        >
                                                            {job.organisation.website}
                                                        </Link>
                                                    ) : (
                                                        <p className="font-semibold">-</p>
                                                    )}
                                                </div>
                                                <div className="md:col-span-6 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Email</p>
                                                    <p className="font-semibold">{job.organisation.email || '-'}</p>
                                                </div>
                                                <div className="md:col-span-6 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Phone</p>
                                                    <p className="font-semibold">{job.organisation.phone || '-'}</p>
                                                </div>
                                                <div className="md:col-span-6 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Address</p>
                                                    <p className="font-semibold whitespace-pre-line">
                                                        {job.organisation.address || '-'}
                                                    </p>
                                                </div>
                                                <div className="col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Description</p>
                                                    <p className="font-semibold">{job.organisation.description || '-'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[#8c9097] dark:text-white/50">No organisation details available.</p>
                                        )}
                                    </div>

                                    <div className="border border-dashed rounded-md p-4">
                                        <h5 className="font-semibold mb-3">Skill Tags</h5>
                                        {job.skillTags && job.skillTags.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {job.skillTags.map((tag: string, idx: number) => (
                                                    <span key={idx} className="badge bg-primary/10 text-primary">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[#8c9097] dark:text-white/50">No skills provided.</p>
                                        )}
                                    </div>

                                    <div className="border border-dashed rounded-md p-4">
                                        <h5 className="font-semibold mb-3">Created By</h5>
                                        {job.createdBy ? (
                                            <div className="grid grid-cols-12 gap-4 text-[0.875rem]">
                                                <div className="md:col-span-4 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Name</p>
                                                    <p className="font-semibold">{job.createdBy.name || '-'}</p>
                                                </div>
                                                <div className="md:col-span-4 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">Email</p>
                                                    <p className="font-semibold">{job.createdBy.email || '-'}</p>
                                                </div>
                                                <div className="md:col-span-4 col-span-12">
                                                    <p className="text-[#8c9097] dark:text-white/50 mb-1">User ID</p>
                                                    <p className="font-semibold">{job.createdBy.id || job.createdBy._id || '-'}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[#8c9097] dark:text-white/50">Creator details unavailable.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}

export default JobDetailsPage

