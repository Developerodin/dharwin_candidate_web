"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic';
import Link from 'next/link'
import React, { Fragment, useState, useEffect } from 'react';
import { getAllProjects, deleteProject } from '@/shared/lib/projects';
import { fetchAllCandidates } from '@/shared/lib/candidates';
import { useRouter } from 'next/navigation';
import { IStaticMethods } from "preline/preline";

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

const Select = dynamic(() => import("react-select"), { ssr: false });

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
    attachments: any[];
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

const Projectlist = () => {
    const router = useRouter();
    
    // State
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [candidatesMap, setCandidatesMap] = useState<Map<string, Candidate>>(new Map());
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(12);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    
    // Filter state
    const [projectName, setProjectName] = useState('');
    const [projectManager, setProjectManager] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [priority, setPriority] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<string>('createdAt:desc');
    
    // Status options
    const statusOptions = [
        { value: 'Not Started', label: 'Not Started' },
        { value: 'Inprogress', label: 'Inprogress' },
        { value: 'On Hold', label: 'On Hold' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Cancelled', label: 'Cancelled' },
    ];
    
    // Priority options
    const priorityOptions = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' },
    ];
    
    // Sort options
    const sortOptions = [
        { value: 'createdAt:desc', label: 'Newest' },
        { value: 'createdAt:asc', label: 'Oldest' },
        { value: 'projectName:asc', label: 'A - Z' },
        { value: 'projectName:desc', label: 'Z - A' },
        { value: 'startDate:desc', label: 'Start Date (Newest)' },
        { value: 'startDate:asc', label: 'Start Date (Oldest)' },
    ];

    // Fetch candidates and create a map
    const fetchCandidates = async () => {
        try {
            const data = await fetchAllCandidates();
            const normalized = Array.isArray(data)
                ? data
                : (Array.isArray((data as any)?.results)
                    ? (data as any).results
                    : (Array.isArray((data as any)?.data) ? (data as any).data : []));
            
            // Create a map of candidate ID to candidate data
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

    // Fetch projects
    const fetchProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {
                page,
                limit,
            };
            
            if (projectName) params.projectName = projectName;
            if (projectManager) params.projectManager = projectManager;
            if (status) params.status = status;
            if (priority) params.priority = priority;
            if (sortBy) params.sortBy = sortBy;
            
            const data = await getAllProjects(params);
            
            // Handle response structure
            const projectsList = data.results || data.data || data || [];
            setProjects(projectsList);
            setTotalPages(data.totalPages || 1);
            setTotalResults(data.totalResults || projectsList.length);
        } catch (err: any) {
            console.error('Failed to fetch projects:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load projects');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch candidates on mount
    useEffect(() => {
        fetchCandidates();
    }, []);

    // Fetch on mount and when filters/pagination change
    useEffect(() => {
        fetchProjects();
    }, [page, limit, status, priority, sortBy]);

    // Re-initialize Preline dropdowns after projects are loaded
    useEffect(() => {
        if (!loading && projects.length > 0) {
            // Re-initialize Preline dropdowns after DOM updates
            const initDropdowns = () => {
                if (typeof window !== 'undefined' && window.HSStaticMethods) {
                    // Use requestAnimationFrame to ensure DOM is fully updated
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            window.HSStaticMethods.autoInit();
                        }, 50);
                    });
                }
            };
            initDropdowns();
        }
    }, [loading, projects]);

    // Handle search
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to first page on new search
        fetchProjects();
    };

    // Handle filter changes
    const handleStatusChange = (selected: any) => {
        setStatus(selected?.value || null);
        setPage(1);
    };

    const handlePriorityChange = (selected: any) => {
        setPriority(selected?.value || null);
        setPage(1);
    };

    const handleSortChange = (selected: any) => {
        setSortBy(selected?.value || 'createdAt:desc');
        setPage(1);
    };

    // Handle delete
    const handleDelete = async (projectId: string) => {
        if (!confirm('Are you sure you want to delete this project?')) return;
        
        try {
            await deleteProject(projectId);
            fetchProjects(); // Refresh list
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Failed to delete project');
        }
    };

    // Get priority badge color
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

    // Format date
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Strip HTML from description and decode HTML entities
    const stripHtml = (html: string) => {
        if (!html) return '';
        
        // First decode HTML entities (like &lt; to <, &gt; to >, etc.)
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        const decoded = textarea.value;
        
        // Then strip HTML tags
        const tmp = document.createElement('DIV');
        tmp.innerHTML = decoded;
        const text = tmp.textContent || tmp.innerText || '';
        
        // Clean up extra whitespace and newlines
        return text.replace(/\s+/g, ' ').trim();
    };

    // Pagination handlers
    const goToPage = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <Fragment>
            <Seo title={"Project List"} />
            <Pageheader currentpage="Project List" activepage="Projects" mainpage="Project List" />
            <div className="grid grid-cols-12 gap-6">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box custom-box">
                        <div className="box-body p-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex flex-wrap gap-1 newproject">
                                    <Link href="/projects/create-project/" className="ti-btn ti-btn-primary-full me-2 !mb-0">
                                        <i className="ri-add-line me-1 font-semibold align-middle"></i>New Project
                                    </Link>
                                    <Select 
                                        name="sortBy" 
                                        options={sortOptions} 
                                        className="!w-40"
                                        menuPlacement='auto' 
                                        classNamePrefix="Select2" 
                                        placeholder="Sort By"
                                        value={sortOptions.find(opt => opt.value === sortBy)}
                                        onChange={handleSortChange}
                                    />
                                </div>
                                <div className="flex" role="search">
                                    <form onSubmit={handleSearch} className="flex gap-2">
                                        <input 
                                            className="form-control me-2" 
                                            type="search" 
                                            placeholder="Search Project" 
                                            aria-label="Search"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                        />
                                        <button className="ti-btn ti-btn-light !mb-0" type="submit">Search</button>
                                    </form>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-4">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="form-label">Status</label>
                                    <Select 
                                        name="status" 
                                        options={statusOptions} 
                                        className="w-full"
                                        menuPlacement='auto' 
                                        classNamePrefix="Select2" 
                                        placeholder="All Status"
                                        isClearable
                                        value={statusOptions.find(opt => opt.value === status)}
                                        onChange={handleStatusChange}
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="form-label">Priority</label>
                                    <Select 
                                        name="priority" 
                                        options={priorityOptions} 
                                        className="w-full"
                                        menuPlacement='auto' 
                                        classNamePrefix="Select2" 
                                        placeholder="All Priority"
                                        isClearable
                                        value={priorityOptions.find(opt => opt.value === priority)}
                                        onChange={handlePriorityChange}
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="form-label">Project Manager</label>
                                    <input 
                                        className="form-control" 
                                        type="text" 
                                        placeholder="Filter by manager"
                                        value={projectManager}
                                        onChange={(e) => setProjectManager(e.target.value)}
                                        onBlur={() => { setPage(1); fetchProjects(); }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger mb-4" role="alert">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted">No projects found.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-12 gap-x-6">
                        {projects.map((project) => (
                            <div key={project.id} className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12">
                                <div className="box custom-box">
                                    <div className="box-header items-center !justify-start flex-wrap !flex">
                                        <div className="me-2">
                                            <span className="avatar avatar-rounded p-1 bg-primary/10">
                                                <i className="ri-folder-line text-primary text-xl"></i>
                                            </span>
                                        </div>
                                        <div className="flex-grow">
                                            <Link 
                                                href={`/projects/project-overview?id=${project.id}`}
                                                className="font-semibold text-[.875rem] block text-truncate project-list-title"
                                            >
                                                {project.projectName}
                                            </Link>
                                            <span className="text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
                                                Manager: <strong className="text-defaulttextcolor">{project.projectManager}</strong>
                                            </span>
                                        </div>
                                        <div className="hs-dropdown ti-dropdown">
                                            <button 
                                                type="button"
                                                id={`dropdown-${project.id}`}
                                                className="ti-btn ti-btn-sm ti-btn-light !mb-0 ti-dropdown-toggle" 
                                                aria-expanded="false"
                                            >
                                                <i className="fe fe-more-vertical"></i>
                                            </button>
                                            <ul 
                                                className="hs-dropdown-menu ti-dropdown-menu hidden"
                                                aria-labelledby={`dropdown-${project.id}`}
                                            >
                                                <li>
                                                    <Link 
                                                        className="ti-dropdown-item" 
                                                        href={`/projects/project-overview?id=${project.id}`}
                                                    >
                                                        <i className="ri-eye-line align-middle me-1 inline-flex"></i>View
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link 
                                                        className="ti-dropdown-item" 
                                                        href={`/projects/create-project?id=${project.id}`}
                                                    >
                                                        <i className="ri-edit-line align-middle me-1 inline-flex"></i>Edit
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link 
                                                        className="ti-dropdown-item" 
                                                        href="#!"
                                                        scroll={false}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDelete(project.id);
                                                        }}
                                                    >
                                                        <i className="ri-delete-bin-line me-1 align-middle inline-flex"></i>Delete
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="box-body">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <div className="font-semibold mb-1">Team :</div>
                                                <div className="avatar-list-stacked">
                                                    {(() => {
                                                        // Handle both string array (IDs) and object array formats
                                                        let assignedMembers: Array<{ id: string; name: string; email?: string }> = [];
                                                        
                                                        if (Array.isArray(project.assignedTo)) {
                                                            if (project.assignedTo.length > 0) {
                                                                // Check if first element is a string (ID) or object
                                                                if (typeof project.assignedTo[0] === 'string') {
                                                                    // It's an array of IDs, fetch names from candidatesMap
                                                                    assignedMembers = (project.assignedTo as string[])
                                                                        .map((id: string) => {
                                                                            const candidate = candidatesMap.get(id);
                                                                            return {
                                                                                id,
                                                                                name: candidate?.fullName || candidate?.name || 'Unknown',
                                                                                email: candidate?.email
                                                                            };
                                                                        })
                                                                        .filter(member => member.id); // Filter out invalid entries
                                                                } else {
                                                                    // It's already an array of objects
                                                                    assignedMembers = project.assignedTo as Array<{ id: string; name: string; email?: string }>;
                                                                }
                                                            }
                                                        }
                                                        
                                                        return (
                                                            <>
                                                                {assignedMembers.slice(0, 4).map((member, idx) => {
                                                                    const firstLetter = member.name?.charAt(0)?.toUpperCase() || '?';
                                                                    return (
                                                                        <span key={member.id || idx} className="avatar avatar-sm avatar-rounded bg-primary" title={member.name}>
                                                                            <span className="avatar-initial text-white">
                                                                                {firstLetter}
                                                                            </span>
                                                                        </span>
                                                                    );
                                                                })}
                                                                {assignedMembers.length > 4 && (
                                                                    <Link className="avatar avatar-sm bg-primary avatar-rounded text-white" href="#!" scroll={false} title={`+${assignedMembers.length - 4} more`}>
                                                                        +{assignedMembers.length - 4}
                                                                    </Link>
                                                                )}
                                                                {assignedMembers.length === 0 && (
                                                                    <span className="text-muted text-sm">No team assigned</span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <div className="font-semibold mb-1">Priority :</div>
                                                <span className={`badge ${getPriorityBadgeClass(project.priority)}`}>
                                                    {project.priority}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="font-semibold mb-1">Description :</div>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-3 text-sm line-clamp-2">
                                            {stripHtml(project.projectDescription) || 'No description available'}
                                        </p>
                                        <div className="font-semibold mb-1">Status :</div>
                                        <div>
                                            <span className={`badge ${
                                                project.status === 'Completed' ? 'bg-success' :
                                                project.status === 'Inprogress' ? 'bg-primary' :
                                                project.status === 'On Hold' ? 'bg-warning' :
                                                project.status === 'Cancelled' ? 'bg-danger' :
                                                'bg-secondary'
                                            } text-white`}>
                                                {project.status}
                                            </span>
                                        </div>
                                        {project.tags && project.tags.length > 0 && (
                                            <div className="mt-3">
                                                <div className="font-semibold mb-1">Tags :</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {project.tags.slice(0, 3).map((tag, idx) => (
                                                        <span key={idx} className="badge bg-light text-default text-xs">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {project.tags.length > 3 && (
                                                        <span className="badge bg-light text-default text-xs">
                                                            +{project.tags.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="box-footer flex items-center justify-between">
                                        <div>
                                            <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] block">Assigned Date :</span>
                                            <span className="font-semibold block">{formatDate(project.startDate)}</span>
                                        </div>
                                        <div className="text-end">
                                            <span className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] block">Due Date :</span>
                                            <span className="font-semibold block">{formatDate(project.endDate)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <nav aria-label="Page navigation" className="mt-6">
                            <ul className="ti-pagination ltr:float-right rtl:float-left mb-4">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                    <Link 
                                        className="page-link px-3 py-[0.375rem]" 
                                        href="#!" 
                                        scroll={false}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            goToPage(page - 1);
                                        }}
                                    >
                                        Previous
                                    </Link>
                                </li>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <li key={pageNum} className={`page-item ${page === pageNum ? 'active' : ''}`}>
                                            <Link 
                                                className="page-link px-3 py-[0.375rem]" 
                                                href="#!" 
                                                scroll={false}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    goToPage(pageNum);
                                                }}
                                            >
                                                {pageNum}
                                            </Link>
                                        </li>
                                    );
                                })}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <Link 
                                        className="page-link px-3 py-[0.375rem]" 
                                        href="#!" 
                                        scroll={false}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            goToPage(page + 1);
                                        }}
                                    >
                                        Next
                                    </Link>
                                </li>
                            </ul>
                            <div className="clearfix"></div>
                            <div className="text-center text-muted mt-2">
                                Showing page {page} of {totalPages} ({totalResults} total projects)
                            </div>
                        </nav>
                    )}
                </>
            )}
        </Fragment>
    )
}

export default Projectlist
