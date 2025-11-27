"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useState, useEffect } from 'react'
import { getDashboardData } from '@/shared/lib/dashboard'
import { getAllTasks } from '@/shared/lib/tasks'
import { registerSupervisor, registerRecruiter } from '@/shared/lib/auth'

// TypeScript interfaces
interface DashboardSummary {
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    tasksDueSoon: number;
    averageTaskProgress: number;
    completedProjects: number;
    totalCandidates: number;
    completedProfiles: number;
    activeMeetings: number;
    upcomingMeetings: number;
    todayAttendance: number;
    activePunches: number;
}

interface ProjectStatistics {
    total: number;
    byStatus: {
        "Not Started": number;
        "Inprogress": number;
        "On Hold": number;
    };
    byPriority: {
        "Low": number;
        "Medium": number;
        "High": number;
        "Critical": number;
    };
}

interface TaskStatistics {
    total: number;
    byStatus: {
        "New": number;
        "Todo": number;
        "On Going": number;
        "In Review": number;
        "Completed": number;
    };
    byPriority: {
        "Low": number;
        "Medium": number;
        "High": number;
        "Critical": number;
    };
    overdue: number;
    dueSoon: number;
    averageProgress: number;
}

interface Project {
    id: string;
    projectName: string;
    status: string;
    priority: string;
    progress: number;
    taskCounts: {
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
    };
    daysRemaining: number | null;
    startDate: string | null;
    endDate: string | null;
    projectManager: string | null;
    assignedTo: Array<{ id: string; name: string; email: string }>;
    createdBy: { id: string; name: string; email: string };
}

interface BottleneckTask {
    id: string;
    taskId: string;
    title: string;
    project: string;
    dueDate?: string;
    status: string;
    priority: string;
    progress?: number;
    assignedTo: Array<{ id: string; name: string; email: string }>;
    daysOverdue?: number;
}

interface ProjectAtRisk {
    id: string;
    projectName: string;
    status: string;
    priority: string;
    progress: number;
    daysRemaining: number;
    overdueTasks: number;
    totalTasks: number;
}

interface TeamWorkload {
    userId: string;
    userName: string;
    userEmail: string;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    inProgressTasks: number;
}

interface Supervisor {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    countryCode?: string;
    isEmailVerified: boolean;
    role: string;
    createdAt: string;
    updatedAt: string;
}

interface Recruiter {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    countryCode?: string;
    isEmailVerified: boolean;
    role: string;
    createdAt: string;
    updatedAt: string;
}

interface RecruitersAndSupervisorsCounts {
    totalRecruiters: number;
    totalSupervisors: number;
    verifiedRecruiters: number;
    verifiedSupervisors: number;
}

interface DashboardData {
    summary: DashboardSummary;
    projectStatistics: ProjectStatistics;
    taskStatistics: TaskStatistics;
    projects: Project[];
    bottlenecks: {
        overdueTasks: BottleneckTask[];
        projectsAtRisk: ProjectAtRisk[];
        blockedTasks: BottleneckTask[];
        highPriorityIncomplete: BottleneckTask[];
    };
    teamWorkload: TeamWorkload[];
    recruiters?: Recruiter[];
    supervisors?: Supervisor[];
    recruitersAndSupervisorsCounts?: RecruitersAndSupervisorsCounts;
}

interface UserTask {
    id: string;
    taskId?: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignedDate?: string;
    progress?: number;
    project?: string | { id: string; projectName: string };
    assignedTo?: Array<{ id: string; name?: string; email?: string }>;
}

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [userTasks, setUserTasks] = useState<UserTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Registration modal states
    const [showSupervisorModal, setShowSupervisorModal] = useState(false);
    const [showRecruiterModal, setShowRecruiterModal] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    
    // Form data states
    const [supervisorForm, setSupervisorForm] = useState({
        email: '',
        password: '',
        name: '',
        phoneNumber: '',
        countryCode: '+1'
    });
    
    const [recruiterForm, setRecruiterForm] = useState({
        email: '',
        password: '',
        name: '',
        phoneNumber: '',
        countryCode: '+1'
    });

    // Get user role and ID from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const userData = localStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setUserRole(user.role || null);
                    setUserId(user.id || user._id || null);
                }
            } catch (err) {
                console.error('Error parsing user data:', err);
            }
        }
    }, []);

    // Fetch admin dashboard
    useEffect(() => {
        const fetchAdminDashboard = async () => {
            if (userRole !== 'admin') return;

            try {
                setLoading(true);
                setError(null);
                const data = await getDashboardData();
                setDashboardData(data);
            } catch (err: any) {
                console.error('Failed to fetch dashboard data:', err);
                setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        if (userRole === 'admin') {
            fetchAdminDashboard();
        }
    }, [userRole]);

    // Fetch user tasks for candidates
    useEffect(() => {
        const fetchUserTasks = async () => {
            if (userRole !== 'user' || !userId) return;

            try {
                setLoading(true);
                setError(null);
                const tasksData = await getAllTasks();
                const tasksList = Array.isArray(tasksData)
                    ? tasksData
                    : (tasksData?.results || tasksData?.data || []);

                // Filter tasks assigned to current user
                const assignedTasks = tasksList.filter((task: any) => {
                    if (!task.assignedTo || !Array.isArray(task.assignedTo)) return false;

                    return task.assignedTo.some((assignee: any) => {
                        const assigneeId = assignee.id || assignee._id || assignee;
                        return String(assigneeId) === String(userId);
                    });
                });

                setUserTasks(assignedTasks);
            } catch (err: any) {
                console.error('Failed to fetch user tasks:', err);
                setError(err?.response?.data?.message || err?.message || 'Failed to load tasks');
            } finally {
                setLoading(false);
            }
        };

        if (userRole === 'user' && userId) {
            fetchUserTasks();
        }
    }, [userRole, userId]);

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return 'N/A';
        }
    };

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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'bg-success text-white';
            case 'Inprogress':
            case 'On Going':
                return 'bg-primary text-white';
            case 'On Hold':
                return 'bg-warning text-white';
            case 'Cancelled':
                return 'bg-danger text-white';
            case 'New':
                return 'bg-secondary text-white';
            case 'Todo':
                return 'bg-info text-white';
            case 'In Review':
                return 'bg-warning text-white';
            default:
                return 'bg-secondary text-white';
        }
    };

    // Handle supervisor registration
    const handleSupervisorSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        setRegisterError(null);
        setRegisterSuccess(null);

        try {
            const payload: any = {
                email: supervisorForm.email,
                password: supervisorForm.password,
                name: supervisorForm.name
            };
            
            if (supervisorForm.phoneNumber) {
                payload.phoneNumber = supervisorForm.phoneNumber;
            }
            if (supervisorForm.countryCode) {
                payload.countryCode = supervisorForm.countryCode;
            }

            await registerSupervisor(payload);
            setRegisterSuccess('Supervisor registered successfully!');
            setSupervisorForm({
                email: '',
                password: '',
                name: '',
                phoneNumber: '',
                countryCode: '+1'
            });
            
            // Refresh dashboard data to show the new supervisor
            if (userRole === 'admin') {
                try {
                    const data = await getDashboardData();
                    setDashboardData(data);
                } catch (err) {
                    console.error('Failed to refresh dashboard data:', err);
                }
            }
            
            setTimeout(() => {
                setShowSupervisorModal(false);
                setRegisterSuccess(null);
            }, 2000);
        } catch (err: any) {
            setRegisterError(err?.response?.data?.message || err?.message || 'Failed to register supervisor');
        } finally {
            setRegistering(false);
        }
    };

    // Handle recruiter registration
    const handleRecruiterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistering(true);
        setRegisterError(null);
        setRegisterSuccess(null);

        try {
            const payload: any = {
                email: recruiterForm.email,
                password: recruiterForm.password,
                name: recruiterForm.name
            };
            
            if (recruiterForm.phoneNumber) {
                payload.phoneNumber = recruiterForm.phoneNumber;
            }
            if (recruiterForm.countryCode) {
                payload.countryCode = recruiterForm.countryCode;
            }

            await registerRecruiter(payload);
            setRegisterSuccess('Recruiter registered successfully!');
            setRecruiterForm({
                email: '',
                password: '',
                name: '',
                phoneNumber: '',
                countryCode: '+1'
            });
            
            // Refresh dashboard data to show the new recruiter
            if (userRole === 'admin') {
                try {
                    const data = await getDashboardData();
                    setDashboardData(data);
                } catch (err) {
                    console.error('Failed to refresh dashboard data:', err);
                }
            }
            
            setTimeout(() => {
                setShowRecruiterModal(false);
                setRegisterSuccess(null);
            }, 2000);
        } catch (err: any) {
            setRegisterError(err?.response?.data?.message || err?.message || 'Failed to register recruiter');
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <Fragment>
                <Seo title={"Dashboard"} />
                <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Fragment>
        );
    }

    if (error) {
        return (
            <Fragment>
                <Seo title={"Dashboard"} />
                <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </Fragment>
        );
    }

    // Show candidate/user dashboard
    if (userRole === 'user') {
        const completedTasks = userTasks.filter(t => t.status === 'Completed').length;
        const overdueTasks = userTasks.filter(t => {
            if (!t.dueDate || t.status === 'Completed') return false;
            return new Date(t.dueDate) < new Date();
        }).length;
        const dueSoonTasks = userTasks.filter(t => {
            if (!t.dueDate || t.status === 'Completed') return false;
            const dueDate = new Date(t.dueDate);
            const today = new Date();
            const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysDiff <= 7 && daysDiff >= 0;
        }).length;

        return (
            <Fragment>
                <Seo title={"Dashboard"} />
                <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />

                {loading ? (
                    <div className="text-center py-8">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                ) : (
                    <>
                        {/* Summary Cards for Candidate */}
                        <div className="grid grid-cols-12 gap-x-6 mb-6">
                            <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
                                <div className="box">
                                    <div className="box-body">
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-4 flex items-center px-0">
                                                <span className="rounded-lg p-3 bg-primary/20 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="text-primary" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                                                    </svg>
                                                </span>
                                            </div>
                                            <div className="col-span-8 ps-0">
                                                <div className="mb-2">Total Tasks</div>
                                                <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                                    <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                                        {userTasks.length}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
                                <div className="box">
                                    <div className="box-body">
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-4 flex items-center px-0">
                                                <span className="rounded-lg p-3 bg-success/20 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="text-success" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                    </svg>
                                                </span>
                                            </div>
                                            <div className="col-span-8 ps-0">
                                                <div className="mb-2">Completed</div>
                                                <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                                    <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                                        {completedTasks}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="xl:col-span-4 lg:col-span-6 md:col-span-6 col-span-12">
                                <div className="box">
                                    <div className="box-body">
                                        <div className="grid grid-cols-12">
                                            <div className="col-span-4 flex items-center px-0">
                                                <span className="rounded-lg p-3 bg-danger/20 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="text-danger" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                                    </svg>
                                                </span>
                                            </div>
                                            <div className="col-span-8 ps-0">
                                                <div className="mb-2">Overdue</div>
                                                <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                                    <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                                        {overdueTasks}
                                                    </span>
                                                </div>
                                                <div className="text-[0.75rem]">
                                                    <span>Due Soon: <span className="badge bg-warning/10 text-warning">{dueSoonTasks}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Tasks Table */}
                        <div className="grid grid-cols-12 gap-x-6 mb-6">
                            <div className="col-span-12">
                                <div className="box">
                                    <div className="box-header justify-between">
                                        <div className="box-title">My Assigned Tasks</div>
                                        <Link href="/tasks/task-list" className="text-primary text-[0.875rem]">View All</Link>
                                    </div>
                                    <div className="box-body">
                                        {userTasks.length === 0 ? (
                                            <div className="text-center py-8">
                                                <p className="text-muted">No tasks assigned to you.</p>
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table min-w-full whitespace-nowrap table-hover border">
                                                    <thead>
                                                        <tr className="border border-inherit border-solid dark:border-defaultborder/10">
                                                            <th scope="col" className="!text-start">Task</th>
                                                            <th scope="col" className="!text-start">Project</th>
                                                            <th scope="col" className="!text-start">Status</th>
                                                            <th scope="col" className="!text-start">Priority</th>
                                                            <th scope="col" className="!text-start">Due Date</th>
                                                            <th scope="col" className="!text-start">Progress</th>
                                                            <th scope="col" className="!text-start">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {userTasks.map((task) => {
                                                            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
                                                            const projectName = typeof task.project === 'string'
                                                                ? task.project
                                                                : (task.project?.projectName || 'N/A');

                                                            return (
                                                                <tr key={task.id} className="border-y border-inherit border-solid dark:border-defaultborder/10">
                                                                    <td>
                                                                        <div>
                                                                            <div className="font-semibold">{task.taskId || task.id}: {task.title}</div>
                                                                            {task.description && (
                                                                                <div className="text-sm text-[#8c9097] dark:text-white/50 line-clamp-1">
                                                                                    {task.description}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td>{projectName}</td>
                                                                    <td>
                                                                        <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                                                                            {task.status}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                                                                            {task.priority}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        {task.dueDate ? (
                                                                            <div>
                                                                                <div className={isOverdue ? 'text-danger font-semibold' : ''}>
                                                                                    {formatDate(task.dueDate)}
                                                                                </div>
                                                                                {isOverdue && (
                                                                                    <div className="text-xs text-danger">Overdue</div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            'N/A'
                                                                        )}
                                                                    </td>
                                                                    <td>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-16 bg-light rounded-full h-2">
                                                                                <div
                                                                                    className="bg-primary h-2 rounded-full"
                                                                                    style={{ width: `${task.progress || 0}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-sm">{task.progress || 0}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <Link
                                                                            href={`/tasks/task-details?id=${task.id}`}
                                                                            className="ti-btn ti-btn-sm ti-btn-primary"
                                                                        >
                                                                            View
                                                                        </Link>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Fragment>
        );
    }

    // Show admin dashboard
    if (userRole !== 'admin') {
        return (
            <Fragment>
                <Seo title={"Dashboard"} />
                <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Fragment>
        );
    }

    if (!dashboardData) {
        return (
            <Fragment>
                <Seo title={"Dashboard"} />
                <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />
                <div className="text-center py-8">
                    <p className="text-muted">No dashboard data available.</p>
                </div>
            </Fragment>
        );
    }

    const { summary, projectStatistics, taskStatistics, projects, bottlenecks, teamWorkload, recruiters, supervisors, recruitersAndSupervisorsCounts } = dashboardData;

    return (
        <Fragment>
            <Seo title={"Dashboard"} />
            <Pageheader currentpage="Dashboard" activepage="Dashboards" mainpage="Dashboard" />

            {/* Summary Cards */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-primary/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-primary" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Active Projects</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.activeProjects}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Completed: <span className="badge bg-success/10 text-success">{summary.completedProjects}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-success/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-success" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Completed Tasks</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.completedTasks}/{summary.totalTasks}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Progress: <span className="badge bg-success/10 text-success">{summary.averageTaskProgress}%</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-danger/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-danger" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Overdue Tasks</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.overdueTasks}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Due Soon: <span className="badge bg-warning/10 text-warning">{summary.tasksDueSoon}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-info/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-info" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Total Candidates</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.totalCandidates}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Completed: <span className="badge bg-success/10 text-success">{summary.completedProfiles}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-primary/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-primary" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Active Meetings</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.activeMeetings}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Upcoming: <span className="badge bg-info/10 text-info">{summary.upcomingMeetings}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-3 lg:col-span-6 md:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-body">
                            <div className="grid grid-cols-12">
                                <div className="col-span-4 flex items-center px-0">
                                    <span className="rounded-lg p-3 bg-warning/20 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="text-warning" height="32px" viewBox="0 0 24 24" width="32px" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="col-span-8 ps-0">
                                    <div className="mb-2">Today Attendance</div>
                                    <div className="text-[#8c9097] dark:text-white/50 mb-1 text-[0.75rem]">
                                        <span className="text-defaulttextcolor font-semibold text-[1.25rem] leading-none">
                                            {summary.todayAttendance}
                                        </span>
                                    </div>
                                    <div className="text-[0.75rem]">
                                        <span>Active Punches: <span className="badge bg-warning/10 text-warning">{summary.activePunches}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Row */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
                {/* Project Statistics */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Project Statistics</div>
                        </div>
                        <div className="box-body">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1">Total Projects</div>
                                    <div className="font-semibold text-[1.5rem]">{projectStatistics.total}</div>
                                </div>
                                <div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">By Status</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>Inprogress:</span>
                                            <span className="font-semibold">{projectStatistics.byStatus.Inprogress}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Not Started:</span>
                                            <span className="font-semibold">{projectStatistics.byStatus["Not Started"]}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>On Hold:</span>
                                            <span className="font-semibold">{projectStatistics.byStatus["On Hold"]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">By Priority</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>Critical:</span>
                                            <span className="font-semibold">{projectStatistics.byPriority.Critical}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>High:</span>
                                            <span className="font-semibold">{projectStatistics.byPriority.High}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Medium:</span>
                                            <span className="font-semibold">{projectStatistics.byPriority.Medium}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Low:</span>
                                            <span className="font-semibold">{projectStatistics.byPriority.Low}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Task Statistics */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Task Statistics</div>
                        </div>
                        <div className="box-body">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-1">Total Tasks</div>
                                    <div className="font-semibold text-[1.5rem]">{taskStatistics.total}</div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-2">
                                        Avg Progress: <span className="font-semibold">{taskStatistics.averageProgress}%</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">By Status</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span>Completed:</span>
                                            <span className="font-semibold">{taskStatistics.byStatus.Completed}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>On Going:</span>
                                            <span className="font-semibold">{taskStatistics.byStatus["On Going"]}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Todo:</span>
                                            <span className="font-semibold">{taskStatistics.byStatus.Todo}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>New:</span>
                                            <span className="font-semibold">{taskStatistics.byStatus.New}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>In Review:</span>
                                            <span className="font-semibold">{taskStatistics.byStatus["In Review"]}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects List */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
                <div className="col-span-12">
                    <div className="box">
                        <div className="box-header justify-between">
                            <div className="box-title">Active Projects</div>
                            <Link href="/projects/project-list" className="text-primary text-[0.875rem]">View All</Link>
                        </div>
                        <div className="box-body">
                            <div className="table-responsive">
                                <table className="table min-w-full whitespace-nowrap table-hover border">
                                    <thead>
                                        <tr className="border border-inherit border-solid dark:border-defaultborder/10">
                                            <th scope="col" className="!text-start">Project Name</th>
                                            <th scope="col" className="!text-start">Manager</th>
                                            <th scope="col" className="!text-start">Status</th>
                                            <th scope="col" className="!text-start">Priority</th>
                                            <th scope="col" className="!text-start">Progress</th>
                                            <th scope="col" className="!text-start">Tasks</th>
                                            <th scope="col" className="!text-start">Days Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {projects.slice(0, 10).map((project) => (
                                            <tr key={project.id} className="border-y border-inherit border-solid dark:border-defaultborder/10">
                                                <td>
                                                    <Link href={`/projects/project-overview?id=${project.id}`} className="font-semibold text-primary">
                                                        {project.projectName}
                                                    </Link>
                                                </td>
                                                <td>{project.projectManager || 'N/A'}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${getPriorityBadgeClass(project.priority)}`}>
                                                        {project.priority}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 bg-light rounded-full h-2">
                                                            <div
                                                                className="bg-primary h-2 rounded-full"
                                                                style={{ width: `${project.progress}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm">{project.progress}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {project.taskCounts.completed}/{project.taskCounts.total}
                                                    {project.taskCounts.overdue > 0 && (
                                                        <span className="badge bg-danger/10 text-danger ms-1">
                                                            {project.taskCounts.overdue} overdue
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{project.daysRemaining !== null ? `${project.daysRemaining} days` : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottlenecks */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
                {/* Overdue Tasks */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Overdue Tasks</div>
                        </div>
                        <div className="box-body">
                            {bottlenecks.overdueTasks.length === 0 ? (
                                <p className="text-muted text-sm">No overdue tasks</p>
                            ) : (
                                <div className="space-y-3">
                                    {bottlenecks.overdueTasks.map((task) => (
                                        <div key={task.id} className="border-b border-inherit border-solid dark:border-defaultborder/10 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <Link href={`/tasks/task-details?id=${task.id}`} className="font-semibold text-primary">
                                                    {task.taskId}: {task.title}
                                                </Link>
                                                <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[#8c9097] dark:text-white/50">
                                                <div>Project: {task.project}</div>
                                                {task.daysOverdue !== undefined && (
                                                    <div className="text-danger">Overdue by {task.daysOverdue} days</div>
                                                )}
                                                {task.assignedTo.length > 0 && (
                                                    <div>Assigned to: {task.assignedTo.map(u => u.name).join(', ')}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Projects at Risk */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Projects at Risk</div>
                        </div>
                        <div className="box-body">
                            {bottlenecks.projectsAtRisk.length === 0 ? (
                                <p className="text-muted text-sm">No projects at risk</p>
                            ) : (
                                <div className="space-y-3">
                                    {bottlenecks.projectsAtRisk.map((project) => (
                                        <div key={project.id} className="border-b border-inherit border-solid dark:border-defaultborder/10 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <Link href={`/projects/project-overview?id=${project.id}`} className="font-semibold text-primary">
                                                    {project.projectName}
                                                </Link>
                                                <span className={`badge ${getPriorityBadgeClass(project.priority)}`}>
                                                    {project.priority}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[#8c9097] dark:text-white/50">
                                                <div>Progress: {project.progress}%</div>
                                                <div>Days Remaining: {project.daysRemaining}</div>
                                                <div className="text-danger">
                                                    {project.overdueTasks} overdue tasks out of {project.totalTasks}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Blocked Tasks */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Blocked Tasks (Critical in Review)</div>
                        </div>
                        <div className="box-body">
                            {bottlenecks.blockedTasks.length === 0 ? (
                                <p className="text-muted text-sm">No blocked tasks</p>
                            ) : (
                                <div className="space-y-3">
                                    {bottlenecks.blockedTasks.map((task) => (
                                        <div key={task.id} className="border-b border-inherit border-solid dark:border-defaultborder/10 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <Link href={`/tasks/task-details?id=${task.id}`} className="font-semibold text-primary">
                                                    {task.taskId}: {task.title}
                                                </Link>
                                                <span className="badge bg-danger/10 text-danger">Critical</span>
                                            </div>
                                            <div className="text-sm text-[#8c9097] dark:text-white/50">
                                                <div>Project: {task.project}</div>
                                                <div>Status: {task.status}</div>
                                                {task.assignedTo.length > 0 && (
                                                    <div>Assigned to: {task.assignedTo.map(u => u.name).join(', ')}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* High Priority Incomplete */}
                <div className="xl:col-span-6 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">High Priority Incomplete Tasks</div>
                        </div>
                        <div className="box-body">
                            {bottlenecks.highPriorityIncomplete.length === 0 ? (
                                <p className="text-muted text-sm">No high priority incomplete tasks</p>
                            ) : (
                                <div className="space-y-3">
                                    {bottlenecks.highPriorityIncomplete.map((task) => (
                                        <div key={task.id} className="border-b border-inherit border-solid dark:border-defaultborder/10 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <Link href={`/tasks/task-details?id=${task.id}`} className="font-semibold text-primary">
                                                    {task.taskId}: {task.title}
                                                </Link>
                                                <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                            <div className="text-sm text-[#8c9097] dark:text-white/50">
                                                <div>Project: {task.project}</div>
                                                {task.progress !== undefined && (
                                                    <div>Progress: {task.progress}%</div>
                                                )}
                                                {task.dueDate && (
                                                    <div>Due: {formatDate(task.dueDate)}</div>
                                                )}
                                                {task.assignedTo.length > 0 && (
                                                    <div>Assigned to: {task.assignedTo.map(u => u.name).join(', ')}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Workload */}
            <div className="grid grid-cols-12 gap-x-6 mb-6">
                <div className="col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">Team Workload</div>
                        </div>
                        <div className="box-body">
                            <div className="table-responsive">
                                <table className="table min-w-full whitespace-nowrap table-hover border">
                                    <thead>
                                        <tr className="border border-inherit border-solid dark:border-defaultborder/10">
                                            <th scope="col" className="!text-start">Team Member</th>
                                            <th scope="col" className="!text-start">Total Tasks</th>
                                            <th scope="col" className="!text-start">Completed</th>
                                            <th scope="col" className="!text-start">In Progress</th>
                                            <th scope="col" className="!text-start">Overdue</th>
                                            <th scope="col" className="!text-start">Completion Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamWorkload.map((member) => {
                                            const completionRate = member.totalTasks > 0
                                                ? Math.round((member.completedTasks / member.totalTasks) * 100)
                                                : 0;
                                            return (
                                                <tr key={member.userId} className="border-y border-inherit border-solid dark:border-defaultborder/10">
                                                    <td>
                                                        <div>
                                                            <div className="font-semibold">{member.userName}</div>
                                                            <div className="text-sm text-[#8c9097] dark:text-white/50">{member.userEmail}</div>
                                                        </div>
                                                    </td>
                                                    <td>{member.totalTasks}</td>
                                                    <td>
                                                        <span className="badge bg-success/10 text-success">{member.completedTasks}</span>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-primary/10 text-primary">{member.inProgressTasks}</span>
                                                    </td>
                                                    <td>
                                                        {member.overdueTasks > 0 ? (
                                                            <span className="badge bg-danger/10 text-danger">{member.overdueTasks}</span>
                                                        ) : (
                                                            <span className="text-muted">0</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 bg-light rounded-full h-2">
                                                                <div
                                                                    className="bg-success h-2 rounded-full"
                                                                    style={{ width: `${completionRate}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm">{completionRate}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Register Supervisor Modal */}
            {showSupervisorModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSupervisorModal(false)}></div>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md sm:my-8 sm:align-middle">
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register Supervisor</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowSupervisorModal(false)}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleSupervisorSubmit}>
                                <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                    {registerError && (
                                        <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
                                            {registerError}
                                        </div>
                                    )}
                                    {registerSuccess && (
                                        <div className="mb-4 p-3 bg-success/10 text-success rounded-md text-sm">
                                            {registerSuccess}
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="supervisor-name" className="form-label">Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                id="supervisor-name"
                                                className="form-control"
                                                placeholder="Supervisor Name"
                                                required
                                                value={supervisorForm.name}
                                                onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="supervisor-email" className="form-label">Email <span className="text-danger">*</span></label>
                                            <input
                                                type="email"
                                                id="supervisor-email"
                                                className="form-control"
                                                placeholder="supervisor@example.com"
                                                required
                                                value={supervisorForm.email}
                                                onChange={(e) => setSupervisorForm({ ...supervisorForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="supervisor-password" className="form-label">Password <span className="text-danger">*</span></label>
                                            <input
                                                type="password"
                                                id="supervisor-password"
                                                className="form-control"
                                                placeholder="password123"
                                                required
                                                value={supervisorForm.password}
                                                onChange={(e) => setSupervisorForm({ ...supervisorForm, password: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="supervisor-country-code" className="form-label">Country Code</label>
                                            <input
                                                type="text"
                                                id="supervisor-country-code"
                                                className="form-control"
                                                placeholder="+1"
                                                value={supervisorForm.countryCode}
                                                onChange={(e) => setSupervisorForm({ ...supervisorForm, countryCode: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="supervisor-phone" className="form-label">Phone Number</label>
                                            <input
                                                type="tel"
                                                id="supervisor-phone"
                                                className="form-control"
                                                placeholder="1234567890"
                                                value={supervisorForm.phoneNumber}
                                                onChange={(e) => setSupervisorForm({ ...supervisorForm, phoneNumber: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSupervisorModal(false)}
                                        className="ti-btn ti-btn-light"
                                        disabled={registering}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="ti-btn ti-btn-primary-full"
                                        disabled={registering}
                                    >
                                        {registering ? 'Registering...' : 'Register'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Register Recruiter Modal */}
            {showRecruiterModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowRecruiterModal(false)}></div>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-md sm:my-8 sm:align-middle">
                            <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Register Recruiter</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowRecruiterModal(false)}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                    >
                                        <i className="ri-close-line text-xl"></i>
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleRecruiterSubmit}>
                                <div className="bg-white dark:bg-gray-800 px-4 sm:px-6 py-4">
                                    {registerError && (
                                        <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
                                            {registerError}
                                        </div>
                                    )}
                                    {registerSuccess && (
                                        <div className="mb-4 p-3 bg-success/10 text-success rounded-md text-sm">
                                            {registerSuccess}
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="recruiter-name" className="form-label">Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                id="recruiter-name"
                                                className="form-control"
                                                placeholder="Recruiter Name"
                                                required
                                                value={recruiterForm.name}
                                                onChange={(e) => setRecruiterForm({ ...recruiterForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="recruiter-email" className="form-label">Email <span className="text-danger">*</span></label>
                                            <input
                                                type="email"
                                                id="recruiter-email"
                                                className="form-control"
                                                placeholder="recruiter@example.com"
                                                required
                                                value={recruiterForm.email}
                                                onChange={(e) => setRecruiterForm({ ...recruiterForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="recruiter-password" className="form-label">Password <span className="text-danger">*</span></label>
                                            <input
                                                type="password"
                                                id="recruiter-password"
                                                className="form-control"
                                                placeholder="password123"
                                                required
                                                value={recruiterForm.password}
                                                onChange={(e) => setRecruiterForm({ ...recruiterForm, password: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="recruiter-country-code" className="form-label">Country Code</label>
                                            <input
                                                type="text"
                                                id="recruiter-country-code"
                                                className="form-control"
                                                placeholder="+91"
                                                value={recruiterForm.countryCode}
                                                onChange={(e) => setRecruiterForm({ ...recruiterForm, countryCode: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="recruiter-phone" className="form-label">Phone Number</label>
                                            <input
                                                type="tel"
                                                id="recruiter-phone"
                                                className="form-control"
                                                placeholder="1234567890"
                                                value={recruiterForm.phoneNumber}
                                                onChange={(e) => setRecruiterForm({ ...recruiterForm, phoneNumber: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-3 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRecruiterModal(false)}
                                        className="ti-btn ti-btn-light"
                                        disabled={registering}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="ti-btn ti-btn-success-full"
                                        disabled={registering}
                                    >
                                        {registering ? 'Registering...' : 'Register'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Fragment>
    )
}

export default Dashboard
