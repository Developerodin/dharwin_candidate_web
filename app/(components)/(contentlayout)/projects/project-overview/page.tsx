"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getProjectById } from '@/shared/lib/projects'
import { fetchAllCandidates } from '@/shared/lib/candidates'

interface Project {
    id: string;
    projectName: string;
    projectManager: string;
    clientStakeholder: string;
    projectDescription: string;
    startDate: string;
    endDate: string;
    status: string;
    priority: string;
    assignedTo: string[] | Array<{ id: string; name: string; email: string }>;
    tags: string[];
    techStack?: string[];
    attachments: any[];
    goals?: Array<string | { title: string; description: string }>;
    objectives?: Array<string | { title: string; description: string }>;
    deliverables?: Array<{ title: string; description: string; dueDate: string; status: string }>;
    resources?: Array<{ type: string; name: string; description: string; cost?: number; quantity?: number; unit: string }>;
    stakeholders?: Array<{ name: string; role: string; email: string; phone: string; organization: string; notes: string }>;
    createdBy: string | { id: string; name: string; email: string };
    createdAt: string;
    updatedAt: string;
}

interface Candidate {
    id?: string;
    _id?: string;
    fullName?: string;
    name?: string;
    email?: string;
}

const Projectoverview = () => {
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');
    
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [candidatesMap, setCandidatesMap] = useState<Map<string, Candidate>>(new Map());

    // Fetch candidates
    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const data = await fetchAllCandidates();
                const normalized = Array.isArray(data)
                    ? data
                    : (Array.isArray((data as any)?.results)
                        ? (data as any).results
                        : (Array.isArray((data as any)?.data) ? (data as any).data : []));
                
                const map = new Map<string, Candidate>();
                normalized.forEach((candidate: Candidate) => {
                    const id = candidate.id || candidate._id;
                    if (id) {
                        map.set(id, candidate);
                    }
                });
                setCandidatesMap(map);
            } catch (err: any) {
                console.error('Failed to fetch candidates:', err);
            }
        };
        fetchCandidates();
    }, []);

    // Fetch project details
    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) {
                setError('Project ID is required');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await getProjectById(projectId);
                // Handle response structure - could be data.project, data.data, or just data
                const projectData = data?.project || data?.data || data;
                setProject(projectData);
            } catch (err: any) {
                console.error('Failed to fetch project:', err);
                setError(err?.response?.data?.message || err?.message || 'Failed to load project details');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    // Format date
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Strip HTML from description (for plain text display)
    const stripHtml = (html: string) => {
        if (!html) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        const decoded = textarea.value;
        const tmp = document.createElement('DIV');
        tmp.innerHTML = decoded;
        const text = tmp.textContent || tmp.innerText || '';
        return text.replace(/\s+/g, ' ').trim();
    };

    // Format HTML description for display (decode entities and clean malformed HTML)
    const formatDescriptionForDisplay = (html: string) => {
        if (!html) return '<p>No description available</p>';
        
        // Decode HTML entities if they exist (e.g., &lt;p&gt; -> <p>)
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        let decodedHtml = textarea.value;
        
        // Clean up malformed HTML (remove nested empty p tags, fix structure)
        decodedHtml = decodedHtml.replace(/<p>\s*<p>/g, '<p>');
        decodedHtml = decodedHtml.replace(/<\/p>\s*<\/p>/g, '</p>');
        decodedHtml = decodedHtml.replace(/<p>\s*<\/p>/g, '<p><br></p>'); // Replace empty p tags with line breaks
        
        // Fix malformed list items (remove incomplete closing tags like ../li>)
        decodedHtml = decodedHtml.replace(/\.\.\/li>/g, '</li>');
        
        // Ensure ordered lists have proper structure and styling
        // Replace <ol> with styled version that will show numbers (handle both with and without attributes)
        decodedHtml = decodedHtml.replace(/<ol(\s[^>]*)?>/gi, (match) => {
            // If it already has a style attribute, we'll add to it, otherwise add new style
            if (match.includes('style=')) {
                return match.replace(/style="([^"]*)"/, 'style="$1; list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0;"');
            } else {
                return '<ol style="list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0;">';
            }
        });
        
        // Ensure unordered lists have proper styling
        decodedHtml = decodedHtml.replace(/<ul(\s[^>]*)?>/gi, (match) => {
            if (match.includes('style=')) {
                return match.replace(/style="([^"]*)"/, 'style="$1; list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;"');
            } else {
                return '<ul style="list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0;">';
            }
        });
        
        // Style list items
        decodedHtml = decodedHtml.replace(/<li(\s[^>]*)?>/gi, (match) => {
            if (match.includes('style=')) {
                return match.replace(/style="([^"]*)"/, 'style="$1; margin: 0.25rem 0;"');
            } else {
                return '<li style="margin: 0.25rem 0;">';
            }
        });
        
        // Ensure it's valid HTML
        if (!decodedHtml.includes('<')) {
            // If no HTML tags, wrap in paragraph
            decodedHtml = `<p>${decodedHtml}</p>`;
        }
        
        return decodedHtml;
    };

    // Get assigned members
    const getAssignedMembers = () => {
        if (!project?.assignedTo) return [];
        
        if (Array.isArray(project.assignedTo)) {
            if (project.assignedTo.length > 0) {
                if (typeof project.assignedTo[0] === 'string') {
                    return (project.assignedTo as string[]).map((id: string) => {
                        const candidate = candidatesMap.get(id);
                        return {
                            id,
                            name: candidate?.fullName || candidate?.name || 'Unknown',
                            email: candidate?.email
                        };
                    });
                } else {
                    return project.assignedTo as Array<{ id: string; name: string; email?: string }>;
                }
            }
        }
        return [];
    };

    // Get priority badge class
    const getPriorityBadgeClass = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'low':
                return 'bg-success/10 text-success';
            case 'medium':
                return 'bg-info/10 text-info';
            case 'high':
                return 'bg-warning/10 text-warning';
            case 'critical':
                return 'bg-danger/10 text-danger';
            default:
                return 'bg-light text-default';
        }
    };

    // Get status badge class
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'bg-success text-white';
            case 'Inprogress':
                return 'bg-primary text-white';
            case 'On Hold':
                return 'bg-warning text-white';
            case 'Cancelled':
                return 'bg-danger text-white';
            default:
                return 'bg-secondary text-white';
        }
    };

    if (loading) {
        return (
            <Fragment>
                <Seo title={"Project Overview"} />
                <Pageheader currentpage="Project Overview" activepage="Projects" mainpage="Project Overview" />
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Fragment>
        );
    }

    if (error || !project) {
        return (
            <Fragment>
                <Seo title={"Project Overview"} />
                <Pageheader currentpage="Project Overview" activepage="Projects" mainpage="Project Overview" />
                <div className="alert alert-danger" role="alert">
                    {error || 'Project not found'}
                </div>
            </Fragment>
        );
    }

    const assignedMembers = getAssignedMembers();

    return (
        <Fragment>
            <Seo title={"Project Overview"} />
            <Pageheader currentpage="Project Overview" activepage="Projects" mainpage="Project Overview" />
            <div className="grid grid-cols-12 gap-6">
                <div className="xl:col-span-9 col-span-12">
                    <div className="box custom-box">
                        <div className="box-header justify-between flex">
                            <div className="box-title">
                                Project Details
                            </div>
                            <div>
                                <Link href={`/projects/create-project?id=${project.id}`} className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-secondary-full btn-wave">
                                    <i className="ri-edit-line align-middle me-1 font-semibold"></i>Edit Project
                                </Link>
                            </div>
                        </div>
                        <div className="box-body">
                            <h5 className="font-semibold mb-4 task-title">
                                {project.projectName}
                            </h5>
                            <div className="text-[.9375rem] font-semibold mb-2">Project Description :</div>
                            <div 
                                className="text-[#8c9097] dark:text-white/50 task-description" 
                                dangerouslySetInnerHTML={{ __html: formatDescriptionForDisplay(project.projectDescription) }}
                                style={{ lineHeight: '1.6' }}
                            />
                            {project.tags && project.tags.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Tags :</div>
                            <div>
                                        {project.tags.map((tag, idx) => (
                                            <span key={idx} className="badge me-2 bg-light text-default">{tag}</span>
                                        ))}
                            </div>
                                </>
                            )}
                            {project.techStack && project.techStack.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Tech Stack :</div>
                                    <div>
                                        {project.techStack.map((tech, idx) => (
                                            <span key={idx} className="badge me-2 bg-primary/10 text-primary">{tech}</span>
                                        ))}
                                    </div>
                                </>
                            )}
                            {project.goals && project.goals.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Goals :</div>
                                    <ul className="list-group">
                                        {project.goals.map((goal, idx) => (
                                            <li key={idx} className="list-group-item">
                                                {typeof goal === 'string' ? (
                                                    <div className="font-semibold">{goal}</div>
                                                ) : (
                                                    <div>
                                                        <div className="font-semibold">{goal.title}</div>
                                                        {goal.description && (
                                                            <div className="text-[#8c9097] dark:text-white/50 text-sm mt-1">{goal.description}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {project.objectives && project.objectives.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Objectives :</div>
                                    <ul className="list-group">
                                        {project.objectives.map((objective, idx) => (
                                            <li key={idx} className="list-group-item">
                                                {typeof objective === 'string' ? (
                                                    <div className="font-semibold">{objective}</div>
                                                ) : (
                                                    <div>
                                                        <div className="font-semibold">{objective.title}</div>
                                                        {objective.description && (
                                                            <div className="text-[#8c9097] dark:text-white/50 text-sm mt-1">{objective.description}</div>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {project.deliverables && project.deliverables.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Deliverables :</div>
                                    <ul className="list-group">
                                        {project.deliverables.map((deliverable, idx) => (
                                            <li key={idx} className="list-group-item">
                                                <div className="font-semibold">{deliverable.title}</div>
                                                {deliverable.description && (
                                                    <div className="text-[#8c9097] dark:text-white/50 text-sm mt-1">{deliverable.description}</div>
                                                )}
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="text-sm">
                                                        <span className="text-[#8c9097] dark:text-white/50">Due Date: </span>
                                                        <span className="font-semibold">
                                                            {deliverable.dueDate ? formatDate(deliverable.dueDate) : 'Not set'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-[#8c9097] dark:text-white/50">Status: </span>
                                                        <span className={`badge ${
                                                            deliverable.status === 'Completed' ? 'bg-success' :
                                                            deliverable.status === 'In Progress' ? 'bg-primary' :
                                                            deliverable.status === 'Pending' ? 'bg-warning' :
                                                            'bg-secondary'
                                                        } text-white`}>
                                                            {deliverable.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {project.resources && project.resources.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Resources :</div>
                                    <ul className="list-group">
                                        {project.resources.map((resource, idx) => (
                                            <li key={idx} className="list-group-item">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="badge bg-info/10 text-info">{resource.type}</span>
                                                    <div className="font-semibold">{resource.name}</div>
                                                </div>
                                                {resource.description && (
                                                    <div className="text-[#8c9097] dark:text-white/50 text-sm mt-1">{resource.description}</div>
                                                )}
                                                <div className="flex items-center gap-4 mt-2">
                                                    {resource.type === 'Budget' && resource.cost !== undefined && (
                                                        <div className="text-sm">
                                                            <span className="text-[#8c9097] dark:text-white/50">Cost: </span>
                                                            <span className="font-semibold">
                                                                {resource.cost.toLocaleString('en-US', { style: 'currency', currency: resource.unit || 'USD' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {resource.type === 'Tool' && resource.quantity !== undefined && (
                                                        <div className="text-sm">
                                                            <span className="text-[#8c9097] dark:text-white/50">Quantity: </span>
                                                            <span className="font-semibold">
                                                                {resource.quantity} {resource.unit}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            {project.stakeholders && project.stakeholders.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2 mt-4">Stakeholders :</div>
                                    <ul className="list-group">
                                        {project.stakeholders.map((stakeholder, idx) => (
                                            <li key={idx} className="list-group-item">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="font-semibold">{stakeholder.name}</div>
                                                    {stakeholder.role && (
                                                        <span className="badge bg-primary/10 text-primary">{stakeholder.role}</span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-12 gap-2 mt-2 text-sm">
                                                    {stakeholder.organization && (
                                                        <div className="xl:col-span-6 col-span-12">
                                                            <span className="text-[#8c9097] dark:text-white/50">Organization: </span>
                                                            <span className="font-semibold">{stakeholder.organization}</span>
                                                        </div>
                                                    )}
                                                    {stakeholder.email && (
                                                        <div className="xl:col-span-6 col-span-12">
                                                            <span className="text-[#8c9097] dark:text-white/50">Email: </span>
                                                            <a href={`mailto:${stakeholder.email}`} className="text-primary hover:underline">{stakeholder.email}</a>
                                                        </div>
                                                    )}
                                                    {stakeholder.phone && (
                                                        <div className="xl:col-span-6 col-span-12">
                                                            <span className="text-[#8c9097] dark:text-white/50">Phone: </span>
                                                            <a href={`tel:${stakeholder.phone}`} className="text-primary hover:underline">{stakeholder.phone}</a>
                                                        </div>
                                                    )}
                                                </div>
                                                {stakeholder.notes && (
                                                    <div className="text-[#8c9097] dark:text-white/50 text-sm mt-2">
                                                        <span className="font-semibold">Notes: </span>{stakeholder.notes}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                        <div className="box-footer">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Project Manager</span>
                                    <div className="flex items-center">
                                        <div className="me-2 leading-none">
                                            <span className="avatar avatar-xs !rounded-full bg-primary">
                                                <span className="avatar-initial text-white">
                                                    {project.projectManager?.charAt(0)?.toUpperCase() || '?'}
                                                </span>
                                            </span>
                                        </div>
                                        <span className="block text-[.875rem] font-semibold">{project.projectManager}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Start Date</span>
                                    <span className="block text-[.875rem] font-semibold">{formatDate(project.startDate)}</span>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">End Date</span>
                                    <span className="block text-[.875rem] font-semibold">{formatDate(project.endDate)}</span>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Assigned To</span>
                                    <div className="avatar-list-stacked">
                                        {assignedMembers.slice(0, 4).map((member, idx) => {
                                            const firstLetter = member.name?.charAt(0)?.toUpperCase() || '?';
                                            return (
                                                <span key={member.id || idx} className="avatar avatar-sm !rounded-full bg-primary" title={member.name}>
                                                    <span className="avatar-initial text-white">
                                                        {firstLetter}
                                        </span>
                                        </span>
                                            );
                                        })}
                                        {assignedMembers.length > 4 && (
                                            <span className="avatar avatar-sm bg-primary !rounded-full text-white" title={`+${assignedMembers.length - 4} more`}>
                                                +{assignedMembers.length - 4}
                                        </span>
                                        )}
                                        {assignedMembers.length === 0 && (
                                            <span className="text-muted text-sm">No team assigned</span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Status</span>
                                    <span className="block">
                                        <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Priority</span>
                                    <span className="block text-[.875rem] font-semibold">
                                        <span className={`badge ${getPriorityBadgeClass(project.priority)}`}>
                                            {project.priority}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* <div className="box custom-box">
                        <div className="box-header">
                            <div className="box-title">Project Discussions</div>
                        </div>
                        <div className="box-body">
                            <ul className="list-unstyled profile-timeline">
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm bg-primary/10 !text-primary !rounded-full profile-timeline-avatar">
                                            E
                                        </span>
                                        <p className="mb-2">
                                            <b>You</b> Commented on <b>Work Process</b> in this project <Link className="text-secondary" href="#!" scroll={false}><u>#New Project</u></Link>.<span className="float-end text-[0.6875rem] text-[#8c9097] dark:text-white/50">24,Dec 2023 - 14:34</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-0">
                                            Project is important and need to be completed on time to meet company work flow.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm  profile-timeline-avatar">
                                            <img src="../../../assets/images/faces/11.jpg" alt="" className="!rounded-full" />
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2">
                                            <span className="text-default"><b>Json Smith</b> reacted to the project 👍</span>.<span className="float-end text-[0.6875rem] text-[#8c9097] dark:text-white/50">18,Dec 2023 - 12:16</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-0">
                                            Lorem ipsum dolor sit amet consectetur adipisicing elit. Repudiandae, repellendus rem rerum excepturi aperiam ipsam temporibus inventore ullam tempora eligendi libero sequi dignissimos cumque, et a sint tenetur consequatur omnis!
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm  profile-timeline-avatar">
                                            <img src="../../../assets/images/faces/4.jpg" alt="" className="!rounded-full" />
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2">
                                            <span className="text-default"><b>Alicia Keys</b> shared a document with <b>you</b></span>.<span className="float-end text-[0.6875rem] text-[#8c9097] dark:text-white/50">21,Dec 2023 - 15:32</span>
                                        </p>
                                        <p className="profile-activity-media flex items-center mb-0">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../../assets/images/media/file-manager/3.png" alt="" />
                                            </Link>
                                            <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50">432.87KB</span>
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm bg-success/10 !text-success !rounded-full profile-timeline-avatar">
                                            P
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2 text-truncate">
                                            <span className="text-default"><b>You</b> shared a post with 4 people <b>Simon,Sasha,Anagha,Hishen</b></span>.<span className="float-end text-[0.6875rem] text-[#8c9097] dark:text-white/50">28,Dec 2023 - 18:46</span>
                                        </p>
                                        <p className="profile-activity-media mb-2">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../../assets/images/media/media-18.jpg" alt="" />
                                            </Link>
                                        </p>
                                        <div>
                                            <div className="avatar-list-stacked">
                                                <span className="avatar avatar-sm !rounded-full">
                                                    <img src="../../../assets/images/faces/2.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm !rounded-full">
                                                    <img src="../../../assets/images/faces/8.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm !rounded-full">
                                                    <img src="../../../assets/images/faces/5.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm !rounded-full">
                                                    <img src="../../../assets/images/faces/10.jpg" alt="img" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm profile-timeline-avatar">
                                            <img src="../../../assets/images/media/media-39.jpg" alt="" className="!rounded-full" />
                                        </span>
                                        <p className="mb-1">
                                            <b>Json</b> Commented on Project <Link className="text-secondary" href="#!" scroll={false}><u>#UI Technologies</u></Link>.<span className="float-end text-[0.6875rem] text-[#8c9097] dark:text-white/50">24,Dec 2023 - 14:34</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50">Technology id developing rapidly keep up your work 👌</p>
                                        <p className="profile-activity-media flex items-center mb-0">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../../assets/images/media/media-26.jpg" alt="" />
                                            </Link>
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../../assets/images/media/media-29.jpg" alt="" />
                                            </Link>
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="box-footer">
                            <div className="list-group-item">
                                <div className="sm:flex items-center leading-none">
                                    <div className="me-4">
                                        <span className="avatar avatar-md ">
                                            <img src="../../../assets/images/faces/9.jpg" alt="" className="!rounded-full" />
                                        </span>
                                    </div>
                                    <div className="flex-grow">
                                        <div className="inline-flex !w-full">
                                            <input type="text" className="form-control !w-full !rounded-e-none" placeholder="Post Anything" aria-label="Recipient's username with two button addons" />
                                            <button aria-label="button" type="button" className="!hidden sm:!flex ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-emoji-smile"></i></button>
                                            <button aria-label="button" type="button" className="!hidden sm:!flex ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-paperclip"></i></button>
                                            <button aria-label="button" type="button" className="!hidden sm:!flex ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-camera"></i></button>
                                            <button className="ti-btn bg-primary text-white !mb-0 !rounded-s-none" type="button">Post</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>
                <div className="xl:col-span-3 col-span-12">
                    <div className="box custom-box">
                        <div className="box-header justify-between">
                            <div className="box-title">
                                Project Team
                            </div>
                        </div>
                        <div className="box-body !p-0">
                            {assignedMembers.length > 0 ? (
                            <div className="table-responsive">
                                <table className="table whitespace-nowrap min-w-full">
                                    <thead>
                                        <tr>
                                            <th scope="row" className="text-start">Name</th>
                                                <th scope="row" className="text-start">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                            {assignedMembers.map((member, idx) => {
                                                const firstLetter = member.name?.charAt(0)?.toUpperCase() || '?';
                                                return (
                                                    <tr key={member.id || idx} className="border border-defaultborder">
                                            <td>
                                                <div className="flex items-center">
                                                    <div className="me-2 leading-none">
                                                                    <span className="avatar avatar-sm !rounded-full bg-primary">
                                                                        <span className="avatar-initial text-white">
                                                                            {firstLetter}
                                                        </span>
                                                        </span>
                                                    </div>
                                                                <div className="font-semibold">{member.name}</div>
                                                </div>
                                            </td>
                                            <td>
                                                            <span className="text-[#8c9097] dark:text-white/50 text-sm">{member.email || 'N/A'}</span>
                                            </td>
                                        </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                            ) : (
                                <div className="p-4 text-center text-muted">
                                    No team members assigned
                                </div>
                            )}
                        </div>
                    </div>
                    {/* <div className="box custom-box">
                        <div className="box-header justify-between">
                            <div className="box-title">Project Goals</div>
                            <div className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-light btn-wave"><i className="ri-add-line align-middle me-1 font-semibold"></i>Add Goal</div>
                        </div>
                        <div className="box-body">
                            <ul className="list-group ">
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked1" defaultChecked /></div>
                                        <div className="font-semibold">Increase Efficiency</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked2" /></div>
                                        <div className="font-semibold">Enhance Customer Satisfaction</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked3" /></div>
                                        <div className="font-semibold">Expand Market Reach</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked4" /></div>
                                        <div className="font-semibold">Improve Profitability</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked5" defaultChecked /></div>
                                        <div className="font-semibold">Enhance Product/Service Quality</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked6" defaultChecked /></div>
                                        <div className="font-semibold">Develop Innovative Solutions</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked7" defaultChecked /></div>
                                        <div className="font-semibold">Increase Employee Engagement</div>
                                    </div>
                                </li>
                                <li className="list-group-item">
                                    <div className="flex items-center">
                                        <div className="me-2"><input className="form-check-input form-checked-success" type="checkbox" defaultValue="" id="successChecked8" /></div>
                                        <div className="font-semibold">Enhance Brand Reputation</div>
                                    </div>
                                </li>
                            </ul>
                            <div className="mt-4 text-center">
                                <button type="button" className="ti-btn ti-btn-success-full btn-wave">View All</button>
                            </div>
                        </div>
                    </div> */}
                    <div className="box custom-box overflow-hidden">
                        <div className="box-header">
                            <div className="box-title">
                                Project Documents
                            </div>
                        </div>
                        <div className="box-body !p-0">
                            {project.attachments && project.attachments.length > 0 ? (
                            <ul className="list-group list-group-flush">
                                    {project.attachments.map((attachment, idx) => {
                                        const fileSize = attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'N/A';
                                        const fileName = attachment.label || attachment.originalName || attachment.url?.split('/').pop() || 'Document';
                                        const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'file';
                                        
                                        // Get file icon based on extension
                                        const getFileIcon = (ext: string) => {
                                            if (['pdf'].includes(ext)) return 'ri-file-pdf-line';
                                            if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'ri-image-line';
                                            if (['doc', 'docx'].includes(ext)) return 'ri-file-word-line';
                                            if (['xls', 'xlsx'].includes(ext)) return 'ri-file-excel-line';
                                            if (['zip', 'rar'].includes(ext)) return 'ri-file-zip-line';
                                            return 'ri-file-line';
                                        };

                                        return (
                                            <li key={idx} className={`list-group-item ${idx === 0 ? '!border-t-0' : ''}`}>
                                    <div className="flex items-center">
                                        <div className="me-2">
                                            <span className="avatar !rounded-full p-2 bg-light">
                                                            <i className={`${getFileIcon(fileExtension)} text-primary text-xl`}></i>
                                            </span>
                                        </div>
                                        <div className="flex-grow">
                                                        <Link 
                                                            href={attachment.url || '#'} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            scroll={false}
                                                        >
                                                            <span className="block font-semibold">{fileName}</span>
                                                        </Link>
                                                        <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] font-normal">{fileSize}</span>
                                        </div>
                                        <div className="inline-flex">
                                                        <a 
                                                            href={attachment.url || '#'} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="ti-btn ti-btn-sm ti-btn-info me-[0.375rem]"
                                                            title="Download"
                                                        >
                                                            <i className="ri-download-line"></i>
                                                        </a>
                                        </div>
                                    </div>
                                </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-muted">
                                    No documents attached
                                        </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}

export default Projectoverview