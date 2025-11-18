"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTaskById, updateTask, uploadTaskDocuments, deleteTask } from '@/shared/lib/tasks'
import { getProjectById, getAllProjects } from '@/shared/lib/projects'
import { fetchAllCandidates } from '@/shared/lib/candidates'
import Swal from 'sweetalert2'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic';
const Select = dynamic(() => import("react-select"), {ssr : false});
import DatePicker from "react-datepicker";
import { setHours, setMinutes } from "date-fns";
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
registerPlugin(FilePondPluginImagePreview, FilePondPluginImageExifOrientation);

const Taskdetails = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const taskId = searchParams.get('id');
    
    const [task, setTask] = useState<any>(null);
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Edit form state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedProject, setSelectedProject] = useState<{ value: string; label: string } | null>(null);
    const [status, setStatus] = useState<{ value: string; label: string } | null>({ value: 'New', label: 'New' });
    const [priority, setPriority] = useState<{ value: string; label: string } | null>({ value: 'High', label: 'High' });
    const [assignedDate, setAssignedDate] = useState<Date | null>(new Date());
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [assignedTo, setAssignedTo] = useState<{ value: string; label: string }[]>([]);
    const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [efforts, setEfforts] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [subTasks, setSubTasks] = useState<Array<{ title: string; description: string; isCompleted: boolean; order: number }>>([]);
    const [newSubTask, setNewSubTask] = useState({ title: '', description: '' });
    const [taskFiles, setTaskFiles] = useState<any>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
    const [candidateOptions, setCandidateOptions] = useState<{ value: string; label: string }[]>([]);
    
    const statusOptions = [
        { value: 'New', label: 'New' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'On Hold', label: 'On Hold' },
        { value: 'In Review', label: 'In Review' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Cancelled', label: 'Cancelled' }
    ];

    const priorityOptions = [
        { value: 'Low', label: 'Low' },
        { value: 'Medium', label: 'Medium' },
        { value: 'High', label: 'High' },
        { value: 'Critical', label: 'Critical' }
    ];

    const tagOptions = [
        { value: 'UI/UX', label: 'UI/UX' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Finance', label: 'Finance' },
        { value: 'Designing', label: 'Designing' },
        { value: 'Admin', label: 'Admin' },
        { value: 'Authentication', label: 'Authentication' },
        { value: 'Product', label: 'Product' },
        { value: 'Development', label: 'Development' }
    ];

    // Fetch task data
    useEffect(() => {
        const fetchTask = async () => {
            if (!taskId) {
                setError('Task ID is required');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const data = await getTaskById(taskId);
                // Handle response structure - could be data.task, data.data, or just data
                const taskData = data?.task || data?.data || data;
                setTask(taskData);
            } catch (err: any) {
                console.error('Failed to fetch task:', err);
                const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load task details';
                setError(errorMessage);
                
                // Show error alert
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonText: 'OK'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchTask();
    }, [taskId]);

    // Fetch project details if project is just an ID
    useEffect(() => {
        const fetchProject = async () => {
            if (!task) return;

            // Check if project is just an ID string
            const projectId = typeof task.project === 'string' 
                ? task.project 
                : (task.project?.id || task.project?._id);

            // If project is already an object with projectName, use it
            if (task.project && typeof task.project === 'object' && task.project.projectName) {
                setProject(task.project);
                return;
            }

            // If we have an ID, fetch the project
            if (projectId) {
                try {
                    const projectData = await getProjectById(projectId);
                    // Handle response structure
                    const projectInfo = projectData?.project || projectData?.data || projectData;
                    setProject(projectInfo);
                } catch (err: any) {
                    console.error('Failed to fetch project:', err);
                    // Don't show error to user, just log it
                }
            }
        };

        fetchProject();
    }, [task]);

    // Fetch projects for dropdown
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await getAllProjects({ limit: 100 });
                const projectsList = data.results || data.data || data || [];
                const options = projectsList.map((project: any) => ({
                    value: project.id || project._id || '',
                    label: project.projectName || 'Unnamed Project'
                }));
                setProjectOptions(options);
            } catch (err: any) {
                console.error('Failed to fetch projects:', err);
            }
        };
        fetchProjects();
    }, []);

    // Fetch candidates for assignedTo dropdown
    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const data = await fetchAllCandidates();
                const normalized = Array.isArray(data)
                    ? data
                    : (Array.isArray((data as any)?.results)
                        ? (data as any).results
                        : (Array.isArray((data as any)?.data) ? (data as any).data : []));
                
                const options = normalized.map((candidate: any) => ({
                    value: candidate.id || candidate._id || '',
                    label: candidate.fullName || candidate.name || candidate.email || 'Unnamed'
                }));
                setCandidateOptions(options);
            } catch (err: any) {
                console.error('Failed to fetch candidates:', err);
            }
        };
        fetchCandidates();
    }, []);

    // Populate edit form when task data is loaded and modal is opened
    useEffect(() => {
        if (task && isEditModalOpen) {
            setTaskTitle(task.title || '');
            setTaskDescription(task.description || '');
            
            // Set project
            const projectId = typeof task.project === 'string' 
                ? task.project 
                : (task.project?.id || task.project?._id);
            const projectName = task.project?.projectName || project?.projectName || 'Unknown Project';
            if (projectId) {
                setSelectedProject({ value: projectId, label: projectName });
            }
            
            // Set status
            if (task.status) {
                const statusOption = statusOptions.find(opt => opt.value === task.status);
                setStatus(statusOption || { value: task.status, label: task.status });
            }
            
            // Set priority
            if (task.priority) {
                const priorityOption = priorityOptions.find(opt => opt.value === task.priority);
                setPriority(priorityOption || { value: task.priority, label: task.priority });
            }
            
            // Set dates
            if (task.assignedDate) {
                setAssignedDate(new Date(task.assignedDate));
            }
            if (task.dueDate) {
                setDueDate(new Date(task.dueDate));
            }
            
            // Set assignedTo
            if (task.assignedTo && Array.isArray(task.assignedTo)) {
                const assignedOptions = task.assignedTo.map((user: any) => ({
                    value: user.id || user._id || '',
                    label: user.name || user.email || 'Unknown'
                }));
                setAssignedTo(assignedOptions);
            }
            
            // Set tags
            if (task.tags && Array.isArray(task.tags)) {
                const tagOptions_selected = task.tags.map((tag: string) => ({
                    value: tag,
                    label: tag
                }));
                setSelectedTags(tagOptions_selected);
            }
            
            // Set progress
            setProgress(task.progress || 0);
            
            // Set efforts
            if (task.efforts) {
                setEfforts({
                    hours: task.efforts.hours || 0,
                    minutes: task.efforts.minutes || 0,
                    seconds: task.efforts.seconds || 0
                });
            }
            
            // Set subtasks
            if (task.subTasks && Array.isArray(task.subTasks)) {
                setSubTasks(task.subTasks);
            }
        }
    }, [task, isEditModalOpen]);

    // Handle edit form submission
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!taskId) return;
        
        // Validation
        if (!taskTitle.trim()) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Task title is required',
                confirmButtonText: 'OK'
            });
            return;
        }

        if (!selectedProject) {
            await Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please select a project',
                confirmButtonText: 'OK'
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload new documents if any
            const newAttachments: any[] = [];
            if (taskFiles.length > 0) {
                const filesToUpload: File[] = [];
                const labels: string[] = [];
                
                taskFiles.forEach((filePondFile: any) => {
                    const file = filePondFile.file;
                    if (file instanceof File) {
                        filesToUpload.push(file);
                        labels.push(file.name || 'Attachment');
                    }
                });
                
                if (filesToUpload.length > 0) {
                    try {
                        const uploadResponse = await uploadTaskDocuments(filesToUpload, labels);
                        
                        if (uploadResponse.success && uploadResponse.data && Array.isArray(uploadResponse.data)) {
                            uploadResponse.data.forEach((fileData: any, index: number) => {
                                newAttachments.push({
                                    label: labels[index] || fileData.originalName,
                                    url: fileData.url,
                                    key: fileData.key,
                                    originalName: fileData.originalName,
                                    size: fileData.size,
                                    mimeType: fileData.mimeType
                                });
                            });
                        }
                    } catch (uploadError) {
                        console.error('Document upload failed:', uploadError);
                        throw new Error('Failed to upload documents');
                    }
                }
            }

            // Prepare task data
            const taskData: any = {
                title: taskTitle,
                project: selectedProject.value,
                description: taskDescription || undefined,
                status: status?.value || 'New',
                priority: priority?.value || 'High',
                assignedTo: assignedTo.map(user => user.value),
                tags: selectedTags.map(tag => tag.value),
                progress: progress,
                efforts: {
                    hours: efforts.hours || 0,
                    minutes: efforts.minutes || 0,
                    seconds: efforts.seconds || 0
                }
            };

            // Set assignedDate
            if (assignedDate) {
                taskData.assignedDate = new Date(assignedDate).toISOString();
            }
            
            if (dueDate) {
                taskData.dueDate = new Date(dueDate).toISOString();
            }

            // Add new attachments to existing ones
            if (newAttachments.length > 0) {
                const existingAttachments = task.attachments || [];
                // Clean existing attachments to remove createdAt and updatedAt
                const cleanedExistingAttachments = existingAttachments.map((att: any) => {
                    const { createdAt, updatedAt, ...cleanedAtt } = att;
                    return cleanedAtt;
                });
                taskData.attachments = [...cleanedExistingAttachments, ...newAttachments];
            }

            // Add subtasks if any
            if (subTasks.length > 0) {
                // Clean subtasks to remove createdAt and updatedAt
                const cleanedSubTasks = subTasks.map((subTask: any) => {
                    const { createdAt, updatedAt, ...cleanedSubTask } = subTask;
                    return cleanedSubTask;
                });
                taskData.subTasks = cleanedSubTasks;
            }

            // Explicitly remove createdAt and updatedAt from taskData if they exist
            const { createdAt, updatedAt, ...cleanedTaskData } = taskData;

            // Update task
            await updateTask(taskId, cleanedTaskData);
            
            // Show success message
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Task updated successfully!',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true
            });

            // Close modal
            setIsEditModalOpen(false);
            setTaskFiles([]);

            // Refresh task data
            const data = await getTaskById(taskId);
            const taskData_updated = data?.task || data?.data || data;
            setTask(taskData_updated);
        } catch (err: any) {
            console.error('Error updating task:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to update task. Please try again.';
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonText: 'OK'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add subtask handler
    const handleAddSubTask = () => {
        if (!newSubTask.title.trim()) {
            return;
        }
        const newTask = {
            title: newSubTask.title,
            description: newSubTask.description || '',
            isCompleted: false,
            order: subTasks.length + 1
        };
        setSubTasks([...subTasks, newTask]);
        setNewSubTask({ title: '', description: '' });
    };

    // Remove subtask handler
    const handleRemoveSubTask = (index: number) => {
        const updated = subTasks.filter((_, i) => i !== index);
        const reordered = updated.map((task, i) => ({ ...task, order: i + 1 }));
        setSubTasks(reordered);
    };

    // Handle delete task
    const handleDeleteTask = async () => {
        if (!taskId || !task) return;
        
        const taskTitle = task.title || 'this task';
        
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete "${taskTitle}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await deleteTask(taskId);
                
                // Show success message
                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Task has been deleted successfully.',
                    confirmButtonText: 'OK',
                    timer: 2000,
                    timerProgressBar: true
                });

                // Redirect to kanban board
                router.push('/tasks/kanban-board');
            } catch (err: any) {
                console.error('Error deleting task:', err);
                const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete task. Please try again.';
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonText: 'OK'
                });
            }
        }
    };

    // Helper function to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${date.getDate()}, ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    // Helper function to format file size
    const formatFileSize = (bytes: number) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Helper function to format efforts
    const formatEfforts = (efforts: any) => {
        if (!efforts) return '0H : 0M : 0S';
        const hours = efforts.hours || 0;
        const minutes = efforts.minutes || 0;
        const seconds = efforts.seconds || 0;
        return `${hours}H : ${minutes}M : ${seconds}S`;
    };

    // Helper function to get file icon based on mime type
    const getFileIcon = (mimeType: string) => {
        if (mimeType?.startsWith('image/')) {
            return '../../assets/images/media/file-manager/1.png';
        } else if (mimeType?.includes('zip') || mimeType?.includes('archive')) {
            return '../../assets/images/media/file-manager/3.png';
        } else if (mimeType?.includes('pdf')) {
            return '../../assets/images/media/file-manager/2.png';
        }
        return '../../assets/images/media/file-manager/3.png';
    };

    // Helper function to get tag badge class
    const getTagBadgeClass = (tag: string) => {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('ui') || tagLower.includes('ux')) return 'bg-primary/10 text-primary';
        if (tagLower.includes('marketing')) return 'bg-secondary/10 text-secondary';
        if (tagLower.includes('finance')) return 'bg-warning/10 text-warning';
        if (tagLower.includes('design')) return 'bg-success/10 text-success';
        if (tagLower.includes('development')) return 'bg-danger/10 text-danger';
        return 'bg-primary/10 text-primary';
    };

    if (loading) {
        return (
            <div>
                <Seo title={"Task Details"} />
                <Pageheader currentpage="Task Details" activepage="Task" mainpage="Task Details" />
                <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>
                        <p className="mt-4 text-[#8c9097] dark:text-white/50">Loading task details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div>
                <Seo title={"Task Details"} />
                <Pageheader currentpage="Task Details" activepage="Task" mainpage="Task Details" />
                <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                        <p className="text-danger">{error || 'Task not found'}</p>
                        <Link href="/tasks/kanban-board" className="ti-btn ti-btn-primary mt-4">
                            Back to Kanban Board
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div>
            <Seo title={"Task Details"} />
            <Pageheader currentpage="Task Details" activepage="Task" mainpage="Task Details" />
            <div className="grid grid-cols-12 gap-6">
                <div className="xl:col-span-9 col-span-12">
                    <div className="box">
                        <div className="box-header justify-between">
                            <div className="box-title">Task Summary</div>
                            <div className="btn-list">
                                <button 
                                    aria-label="button" 
                                    type="button" 
                                    className="ti-btn bg-success !py-1 !px-2 !font-medium text-white !text-[0.75rem] me-2"
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    <i className="ri-edit-line me-1 align-middle"></i>Edit Task
                                </button>
                                <button 
                                    aria-label="button" 
                                    type="button" 
                                    className="ti-btn bg-danger !py-1 !px-2 !font-medium text-white !text-[0.75rem] me-0"
                                    onClick={() => handleDeleteTask()}
                                >
                                    <i className="ri-delete-bin-line me-1 align-middle"></i>Delete Task
                                </button>
                            </div>
                        </div>
                        <div className="box-body">
                            <h5 className="font-semibold mb-4 task-title text-[1.25rem]">
                                {task.title || 'Untitled Task'}
                            </h5>
                            <div className="text-[.9375rem] font-semibold mb-2">Task Description :</div>
                            <p className="text-[#8c9097] dark:text-white/50 task-description">
                                {task.description || 'No description provided'}
                            </p>
                            {task.subTasks && task.subTasks.length > 0 && (
                                <>
                                    <div className="text-[.9375rem] font-semibold mb-2">Key tasks :</div>
                                    <div>
                                        <ul className="task-details-key-tasks mb-0 !ps-8">
                                            {task.subTasks.map((subTask: any, index: number) => (
                                                <li key={subTask.id || subTask._id || index}>
                                                    {subTask.title}
                                                    {subTask.description && ` - ${subTask.description}`}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="box-footer">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Assigned By</span>
                                    <div className="flex items-center flex-wrap">
                                        {task.assignedBy && (
                                            <>
                                                <div className="me-2 leading-none">
                                                    <span className="avatar avatar-xs avatar-rounded bg-primary">
                                                        {task.assignedBy.name ? (
                                                            <span className="avatar-initial text-white">
                                                                {task.assignedBy.name.charAt(0).toUpperCase()}
                                                            </span>
                                                        ) : (
                                                            <img src="../../assets/images/faces/15.jpg" alt={task.assignedBy.name || task.assignedBy.email} />
                                                        )}
                                                    </span>
                                                </div>
                                                <span className="block text-[.875rem] dark:text-defaulttextcolor/70 font-semibold">
                                                    {task.assignedBy.name || task.assignedBy.email || 'Unknown'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Assigned Date</span>
                                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                                        {formatDate(task.assignedDate)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Due Date</span>
                                    <span className="block text-[.875rem] font-semibold dark:text-defaulttextcolor/70">
                                        {formatDate(task.dueDate)}
                                    </span>
                                </div>
                                <div className="task-details-progress">
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-1">Progress</span>
                                    <div className="flex items-center flex-wrap">
                                        <div className="progress progress-xs progress-animate flex-grow me-2" role="progressbar" aria-valuenow={task.progress || 0} aria-valuemin={0} aria-valuemax={100}>
                                            <div className="progress-bar bg-primary" style={{ width: `${task.progress || 0}%` }}></div>
                                        </div>
                                        <div className="text-[#8c9097] dark:text-white/50 text-[.6875rem]">{task.progress || 0}%</div>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Efforts</span>
                                    <span className="block text-[.875rem]  dark:text-defaulttextcolor/70 font-semibold">
                                        {formatEfforts(task.efforts)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* <div className="box">
                        <div className="box-header">
                            <div className="box-title">Task Discussions</div>
                        </div>
                        <div className="box-body text-defaulttextcolor text-defaultsize">
                            <ul className="list-none profile-timeline">
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm bg-primary/10 !text-primary avatar-rounded profile-timeline-avatar">
                                            E
                                        </span>
                                        <p className="mb-2">
                                            <b>You</b> Commented on <b>Work Process</b> in this task <Link className="text-secondary" href="#!" scroll={false}><u>#New Task</u></Link>.<span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">24,Dec 2023 - 14:34</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-0">
                                            Task is important and need to be completed on time to meet company work flow.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm avatar-rounded profile-timeline-avatar">
                                            <img src="../../assets/images/faces/11.jpg" alt="" />
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2">
                                            <span className="text-default"><b>Json Smith</b> reacted to the task 👍</span>.<span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">18,Dec 2023 - 12:16</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-0">
                                            Lorem ipsum dolor sit amet consectetur adipisicing elit. Repudiandae, repellendus rem rerum excepturi aperiam ipsam temporibus inventore ullam tempora eligendi libero sequi dignissimos cumque, et a sint tenetur consequatur omnis!
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm avatar-rounded profile-timeline-avatar">
                                            <img src="../../assets/images/faces/4.jpg" alt="" />
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2">
                                            <span className="text-default"><b>Alicia Keys</b> shared a document with <b>you</b></span>.<span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">21,Dec 2023 - 15:32</span>
                                        </p>
                                        <p className="profile-activity-media mb-0 flex items-center">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../assets/images/media/file-manager/3.png" alt="" />
                                            </Link>
                                            <span className="text-[.6875rem] text-[#8c9097] dark:text-white/50">432.87KB</span>
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm bg-success/10 !text-success avatar-rounded profile-timeline-avatar">
                                            P
                                        </span>
                                        <p className="text-[#8c9097] dark:text-white/50 mb-2">
                                            <span className="text-default"><b>You</b> shared a post with 4 people <b className="sm:text-sm text-[0.7rem]">Simon,Sasha,Anagha,Hishen</b></span>.<span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">28,Dec 2023 - 18:46</span>
                                        </p>
                                        <p className="profile-activity-media mb-2">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../assets/images/media/media-18.jpg" alt="" />
                                            </Link>
                                        </p>
                                        <div>
                                            <div className="avatar-list-stacked">
                                                <span className="avatar avatar-sm avatar-rounded">
                                                    <img src="../../assets/images/faces/2.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm avatar-rounded">
                                                    <img src="../../assets/images/faces/8.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm avatar-rounded">
                                                    <img src="../../assets/images/faces/2.jpg" alt="img" />
                                                </span>
                                                <span className="avatar avatar-sm avatar-rounded">
                                                    <img src="../../assets/images/faces/10.jpg" alt="img" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                                <li>
                                    <div>
                                        <span className="avatar avatar-sm avatar-rounded profile-timeline-avatar">
                                            <img src="../../assets/images/media/media-39.jpg" alt="" />
                                        </span>
                                        <p className="mb-1">
                                            <b>Json</b> Commented on Task post <Link className="text-secondary" href="#!" scroll={false}><u>#UI Technologies</u></Link>.<span className="ltr:float-right rtl:float-left text-[.6875rem] text-[#8c9097] dark:text-white/50">24,Dec 2023 - 14:34</span>
                                        </p>
                                        <p className="text-[#8c9097] dark:text-white/50">Technology id developing rapidly keep up your work 👌</p>
                                        <p className="profile-activity-media mb-0 flex">
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../assets/images/media/media-26.jpg" alt="" />
                                            </Link>
                                            <Link aria-label="anchor" href="#!" scroll={false}>
                                                <img src="../../assets/images/media/media-29.jpg" alt="" />
                                            </Link>
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="box-footer">
                            <div className=" !p-0 !border-0">
                                <div className="sm:flex items-center leading-none ">
                                    <div className="me-4">
                                        <span className="avatar avatar-md avatar-rounded">
                                            <img src="../../assets/images/faces/9.jpg" alt="" />
                                        </span>
                                    </div>
                                    <div className="flex-grow me-2">
                                        <div className="inline-flex !w-full">
                                            <input type="text" className="form-control w-full !rounded-e-none" placeholder="Post Anything" aria-label="Recipient's username with two button addons" />
                                            <button aria-label="button" type="button" className="ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-emoji-smile"></i></button>
                                            <button aria-label="button" type="button" className="ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-paperclip"></i></button>
                                            <button aria-label="button" type="button" className="ti-btn ti-btn-light !rounded-none !mb-0"><i className="bi bi-camera"></i></button>
                                            <button className="ti-btn bg-primary text-white !rounded-s-none !mb-0" type="button">Post</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>
                <div className="xl:col-span-3 col-span-12">
                    <div className="box">
                        <div className="box-header">
                            <div className="box-title">
                                Additional Details
                            </div>
                        </div>
                        <div className="box-body !p-0">
                            <div className="table-responsive">
                                <table className="table whitespace-nowrap min-w-full">
                                    <tbody>
                                        <tr className="border-b border-defaultborder">
                                            <td><span className="font-semibold">Task ID :</span></td>
                                            <td>{task.taskId || task.id?.slice(-6) || 'N/A'}</td>
                                        </tr>
                                        <tr className="border-b border-defaultborder">
                                            <td><span className="font-semibold">Task Tags :</span></td>
                                            <td>
                                                {task.tags && task.tags.length > 0 ? (
                                                    task.tags.map((tag: string, idx: number) => (
                                                        <span key={idx} className={`badge ${getTagBadgeClass(tag)} me-2`}>
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[#8c9097] dark:text-white/50">No tags</span>
                                                )}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-defaultborder">
                                            <td><span className="font-semibold">Project Name :</span></td>
                                            <td>
                                                {(project?.projectName || task.project?.projectName) || 'N/A'}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-defaultborder">
                                            <td><span className="font-semibold">Project Status :</span></td>
                                            <td>
                                                <span className="font-semibold text-secondary">
                                                    {(project?.status || task.project?.status) || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr className="border-b border-defaultborder">
                                            <td><span className="font-semibold">Project Priority :</span></td>
                                            <td>
                                                <span className={`badge ${
                                                    (project?.priority || task.project?.priority) === 'High' ? 'bg-danger/10 text-danger' :
                                                    (project?.priority || task.project?.priority) === 'Medium' ? 'bg-warning/10 text-warning' :
                                                    (project?.priority || task.project?.priority) === 'Low' ? 'bg-success/10 text-success' :
                                                    'bg-light text-default'
                                                }`}>
                                                    {(project?.priority || task.project?.priority) || 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><span className="font-semibold">Assigned To :</span></td>
                                            <td>
                                                {task.assignedTo && task.assignedTo.length > 0 ? (
                                                    <div className="avatar-list-stacked">
                                                        {task.assignedTo.map((user: any, idx: number) => (
                                                            <span key={user.id || user._id || idx} className="bg-primary avatar avatar-sm avatar-rounded" title={user.name || user.email}>
                                                                {user.name ? (
                                                                    <span className="avatar-initial text-white">
                                                                        {user.name.charAt(0).toUpperCase()}
                                                                    </span>
                                                                ) : (
                                                                    <img src="../../assets/images/faces/2.jpg" alt={user.name || user.email} />
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-[#8c9097] dark:text-white/50">Unassigned</span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="box overflow-hidden">
                        <div className="box-header justify-between">
                            <div className="box-title">Sub Tasks</div>
                            <div>
                                <button type="button" className="ti-btn ti-btn-secondary !py-1 !px-2 !font-medium !text-[0.75rem]"><i className="ri-add-line  align-middle"></i>Sub Task</button>
                            </div>
                        </div>
                        <div className="box-body">
                            {task.subTasks && task.subTasks.length > 0 ? (
                                <ul className="list-group">
                                    {task.subTasks
                                        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                                        .map((subTask: any, index: number) => (
                                            <li key={subTask.id || subTask._id || index} className="list-group-item">
                                                <div className="flex items-center flex-wrap">
                                                    <div className="me-2">
                                                        <input 
                                                            className="form-check-input form-checked-success" 
                                                            type="checkbox" 
                                                            defaultChecked={subTask.isCompleted || false}
                                                            readOnly
                                                        />
                                                    </div>
                                                    <div className="font-semibold flex-grow">
                                                        {subTask.title}
                                                        {subTask.description && (
                                                            <div className="text-[#8c9097] dark:text-white/50 text-[0.75rem] font-normal mt-1">
                                                                {subTask.description}
                                                            </div>
                                                        )}
                                                        {subTask.completedBy && subTask.isCompleted && (
                                                            <div className="text-[#8c9097] dark:text-white/50 text-[0.6875rem] font-normal mt-1">
                                                                Completed by {subTask.completedBy.name || subTask.completedBy.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="text-[#8c9097] dark:text-white/50 text-center py-4">No subtasks</p>
                            )}
                        </div>
                    </div>
                    <div className="box overflow-hidden">
                        <div className="box-header !border-b-0">
                            <div className="box-title">
                                Attachments
                            </div>
                        </div>
                        <div className="box-body !p-0">
                            {task.attachments && task.attachments.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {task.attachments.map((attachment: any, index: number) => (
                                        <li key={attachment.id || attachment._id || index} className="list-group-item">
                                            <div className="flex items-center flex-wrap">
                                                <div className="me-2 leading-none">
                                                    <span className="avatar avatar-rounded p-2 bg-light">
                                                        <img src={getFileIcon(attachment.mimeType)} alt={attachment.originalName || attachment.label} />
                                                    </span>
                                                </div>
                                                <div className="flex-grow me-1">
                                                    <Link href={attachment.url || "#!"} target="_blank" rel="noopener noreferrer" scroll={false}>
                                                        <span className="block font-semibold">{attachment.label || attachment.originalName || 'Attachment'}</span>
                                                    </Link>
                                                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] font-normal">
                                                        {formatFileSize(attachment.size)}
                                                        {attachment.uploadedBy && (
                                                            <span className="ms-2">by {attachment.uploadedBy.name || attachment.uploadedBy.email}</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="btn-list">
                                                    <a 
                                                        href={attachment.url || "#!"} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        aria-label="button" 
                                                        className="ti-btn ti-btn-sm ti-btn-info me-[0.365rem]"
                                                    >
                                                        <i className="ri-download-line"></i>
                                                    </a>
                                                    <button aria-label="button" type="button" className="ti-btn ti-btn-sm ti-btn-danger">
                                                        <i className="ri-delete-bin-line"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[#8c9097] dark:text-white/50 text-center py-4">No attachments</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Edit Task Modal */}
            {isEditModalOpen && (
                <div id="edit-task" className="hs-overlay open ti-modal">
                    <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out !max-w-4xl">
                        <div className="ti-modal-content">
                            <div className="ti-modal-header">
                                <h6 className="modal-title text-[1rem] font-semibold text-default dark:text-defaulttextcolor/70">Edit Task</h6>
                                <button 
                                    type="button" 
                                    className="hs-dropdown-toggle !text-[1rem] !font-semibold" 
                                    onClick={() => setIsEditModalOpen(false)}
                                >
                                    <span className="sr-only">Close</span>
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                            <form onSubmit={handleEditSubmit}>
                                <div className="ti-modal-body px-4 !overflow-visible">
                                    <div className="grid grid-cols-12 gap-6">
                                        <div className="xl:col-span-12 col-span-12">
                                            <label htmlFor="edit-task-name" className="form-label">Task Name <span className="text-danger">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-control w-full !rounded-md" 
                                                id="edit-task-name" 
                                                placeholder="Task Name" 
                                                value={taskTitle}
                                                onChange={(e) => setTaskTitle(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label htmlFor="edit-project-select" className="form-label">Project <span className="text-danger">*</span></label>
                                            <Select 
                                                name="project"
                                                options={projectOptions}
                                                value={selectedProject}
                                                onChange={(option) => setSelectedProject(option as { value: string; label: string } | null)}
                                                className="w-full !rounded-md"
                                                menuPlacement='auto'
                                                classNamePrefix="Select2"
                                                placeholder="Select a project"
                                                isClearable
                                                required
                                            />
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Status</label>
                                            <Select 
                                                name="status"
                                                options={statusOptions}
                                                value={status}
                                                onChange={(option) => setStatus(option as { value: string; label: string } | null)}
                                                className="w-full !rounded-md"
                                                menuPlacement='auto'
                                                classNamePrefix="Select2"
                                                placeholder="Select status"
                                            />
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Priority</label>
                                            <Select 
                                                name="priority"
                                                options={priorityOptions}
                                                value={priority}
                                                onChange={(option) => setPriority(option as { value: string; label: string } | null)}
                                                className="w-full !rounded-md"
                                                menuPlacement='auto'
                                                classNamePrefix="Select2"
                                                placeholder="Select priority"
                                            />
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label htmlFor="edit-text-area" className="form-label">Task Description</label>
                                            <textarea 
                                                className="form-control w-full !rounded-md" 
                                                id="edit-text-area" 
                                                rows={3} 
                                                placeholder="Write Description"
                                                value={taskDescription}
                                                onChange={(e) => setTaskDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Assigned Date</label>
                                            <div className="form-group">
                                                <div className="input-group !flex-nowrap">
                                                    <div className="input-group-text text-muted !rounded-e-none"> <i className="ri-calendar-line"></i> </div>
                                                    <DatePicker 
                                                        className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10" 
                                                        selected={assignedDate} 
                                                        onChange={(date) => setAssignedDate(date as Date)} 
                                                        showTimeSelect 
                                                        minTime={setHours(setMinutes(new Date(), 0), 0)} 
                                                        maxTime={setHours(setMinutes(new Date(), 59), 23)} 
                                                        dateFormat="MMMM d, yyyy h:mm aa" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Due Date</label>
                                            <div className="form-group">
                                                <div className="input-group !flex-nowrap">
                                                    <div className="input-group-text text-muted !rounded-e-none"> <i className="ri-calendar-line"></i> </div>
                                                    <DatePicker 
                                                        className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10" 
                                                        selected={dueDate} 
                                                        onChange={(date) => setDueDate(date as Date)} 
                                                        showTimeSelect 
                                                        minTime={setHours(setMinutes(new Date(), 0), 0)} 
                                                        maxTime={setHours(setMinutes(new Date(), 59), 23)} 
                                                        dateFormat="MMMM d, yyyy h:mm aa" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label htmlFor="edit-text-area" className="form-label">Task Attachments (Add New)</label>
                                            <FilePond
                                                files={taskFiles}
                                                onupdatefiles={setTaskFiles}
                                                allowMultiple={true}
                                                maxFiles={10}
                                                name="files"
                                                labelIdle='Drag & Drop your file here or click '
                                            />
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label className="form-label">Assigned To</label>
                                            <Select 
                                                isMulti 
                                                name="assignedTo" 
                                                options={candidateOptions} 
                                                value={assignedTo}
                                                onChange={(options) => setAssignedTo(options as { value: string; label: string }[])}
                                                className="w-full !rounded-md"
                                                menuPlacement='auto' 
                                                classNamePrefix="Select2"
                                                placeholder="Select team members"
                                            />
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Progress (%)</label>
                                            <input 
                                                type="number" 
                                                className="form-control w-full !rounded-md" 
                                                min="0" 
                                                max="100" 
                                                value={progress}
                                                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="xl:col-span-6 col-span-12">
                                            <label className="form-label">Tags</label>
                                            <Select 
                                                isMulti 
                                                name="tags" 
                                                options={tagOptions} 
                                                value={selectedTags}
                                                onChange={(options) => setSelectedTags(options as { value: string; label: string }[])}
                                                className="w-full !rounded-md"
                                                menuPlacement='top' 
                                                classNamePrefix="Select2"
                                                placeholder="Select tags"
                                            />
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label className="form-label">Efforts</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="form-label text-[0.75rem]">Hours</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control w-full !rounded-md" 
                                                        min="0" 
                                                        value={efforts.hours}
                                                        onChange={(e) => setEfforts({ ...efforts, hours: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label text-[0.75rem]">Minutes</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control w-full !rounded-md" 
                                                        min="0" 
                                                        max="59"
                                                        value={efforts.minutes}
                                                        onChange={(e) => setEfforts({ ...efforts, minutes: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="form-label text-[0.75rem]">Seconds</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control w-full !rounded-md" 
                                                        min="0" 
                                                        max="59"
                                                        value={efforts.seconds}
                                                        onChange={(e) => setEfforts({ ...efforts, seconds: parseInt(e.target.value) || 0 })}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="xl:col-span-12 col-span-12">
                                            <label className="form-label">Sub Tasks</label>
                                            <div className="border dark:border-defaultborder/10 rounded-md p-4">
                                                {subTasks.length > 0 && (
                                                    <div className="mb-4 space-y-2">
                                                        {subTasks.map((subTask, index) => (
                                                            <div key={index} className="flex items-start gap-2 p-3 bg-light dark:bg-bodybg rounded-md">
                                                                <div className="flex-1">
                                                                    <div className="font-semibold text-[0.875rem] mb-1">{subTask.title}</div>
                                                                    {subTask.description && (
                                                                        <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">{subTask.description}</div>
                                                                    )}
                                                                    <div className="text-[0.7rem] text-[#8c9097] dark:text-white/50 mt-1">Order: {subTask.order}</div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSubTask(index)}
                                                                    className="ti-btn ti-btn-sm ti-btn-danger"
                                                                >
                                                                    <i className="ri-delete-bin-line"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="form-label text-[0.875rem]">Sub Task Title</label>
                                                        <input 
                                                            type="text" 
                                                            className="form-control w-full !rounded-md" 
                                                            value={newSubTask.title}
                                                            onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                                                            placeholder="Enter subtask title"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="form-label text-[0.875rem]">Sub Task Description</label>
                                                        <textarea 
                                                            className="form-control w-full !rounded-md" 
                                                            rows={2}
                                                            value={newSubTask.description}
                                                            onChange={(e) => setNewSubTask({ ...newSubTask, description: e.target.value })}
                                                            placeholder="Enter subtask description (optional)"
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSubTask}
                                                        className="ti-btn ti-btn-md ti-btn-primary cursor-pointer"
                                                        disabled={!newSubTask.title.trim()}
                                                    >
                                                        <i className="ri-add-line me-1"></i>Add Sub Task
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ti-modal-footer">
                                    <button 
                                        type="button"
                                        className="ti-btn ti-btn-light align-middle"
                                        onClick={() => setIsEditModalOpen(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="ti-btn bg-primary text-white !font-medium"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Updating...' : 'Update Task'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Taskdetails