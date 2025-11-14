"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic';
import Link from 'next/link';
import React, { useEffect, useRef, useState } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
const Select = dynamic(() => import("react-select"), {ssr : false});
import DatePicker from "react-datepicker";
import { addDays, setHours, setMinutes } from "date-fns";
//filepond
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
registerPlugin(FilePondPluginImagePreview, FilePondPluginImageExifOrientation);
import { createTask, uploadTaskDocuments, getKanbanBoard, deleteTask } from '@/shared/lib/tasks';
import { getAllProjects } from '@/shared/lib/projects';
import { fetchAllCandidates } from '@/shared/lib/candidates';
import Swal from 'sweetalert2';

const Kanbanboard = () => {

    const leftContainerRef = useRef(null);
    const rightContainerRef = useRef(null);
    const topContainerRef = useRef(null);
    const bottomContainerRef = useRef(null);
    const lastContainerRef = useRef(null);

    const elementsToModify = [
        leftContainerRef,
        rightContainerRef,
        topContainerRef,
        bottomContainerRef,
        lastContainerRef
      ];

      const OnDivChange = ()=>{
          elementsToModify.forEach((elementId) => {
            const element:any  = elementId.current;
            if(element?.children.length <= 0) {
              element?.classList.add("task-Null");
              element?.parentNode.parentElement.parentElement.querySelector(".view-more-button")?.classList.add("d-none");
            }else{
                element?.classList.remove("task-Null");
              element?.parentNode.parentElement.parentElement.querySelector(".view-more-button")?.classList.remove("d-none");
            }
          });
      };

      const Option1 = [
        { value: 'Sort By', label: 'Sort By' },
        { value: 'Newest', label: 'Newest' },
        { value: 'Date Added', label: 'Date Added' },
        { value: 'Type', label: 'Type' },
        { value: 'A - Z', label: 'A - Z' },
    ];
    
    // Task form state
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [selectedProject, setSelectedProject] = useState<{ value: string; label: string } | null>(null);
    const [status, setStatus] = useState<{ value: string; label: string } | null>({ value: 'New', label: 'New' });
    const [priority, setPriority] = useState<{ value: string; label: string } | null>({ value: 'High', label: 'High' });
    const [assignedDate, setAssignedDate] = useState<Date | null>(new Date());
    const [dueDate, setDueDate] = useState<Date | null>(setHours(setMinutes(new Date(), 30), 17));
    const [assignedTo, setAssignedTo] = useState<{ value: string; label: string }[]>([]);
    const [selectedTags, setSelectedTags] = useState<{ value: string; label: string }[]>([]);
    const [progress, setProgress] = useState<number>(0);
    const [efforts, setEfforts] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [subTasks, setSubTasks] = useState<Array<{ title: string; description: string; isCompleted: boolean; order: number }>>([]);
    const [newSubTask, setNewSubTask] = useState({ title: '', description: '' });
    const [taskFiles, setTaskFiles] = useState<any>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Options for dropdowns
    const [projectOptions, setProjectOptions] = useState<{ value: string; label: string }[]>([]);
    const [candidateOptions, setCandidateOptions] = useState<{ value: string; label: string }[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [kanbanData, setKanbanData] = useState<{
        New?: any[];
        Todo?: any[];
        'On Going'?: any[];
        'In Review'?: any[];
        Completed?: any[];
    }>({});
    const [loadingKanban, setLoadingKanban] = useState(false);
    
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
        // Reorder remaining subtasks
        const reordered = updated.map((task, i) => ({ ...task, order: i + 1 }));
        setSubTasks(reordered);
    };

    // Fetch projects for dropdown
    useEffect(() => {
        const fetchProjects = async () => {
            setLoadingProjects(true);
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
            } finally {
                setLoadingProjects(false);
            }
        };
        fetchProjects();
    }, []);

    // Fetch candidates for assignedTo dropdown
    useEffect(() => {
        const fetchCandidates = async () => {
            setLoadingCandidates(true);
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
            } finally {
                setLoadingCandidates(false);
            }
        };
        fetchCandidates();
    }, []);

    // Fetch kanban board data
    useEffect(() => {
        const fetchKanbanData = async () => {
            setLoadingKanban(true);
            try {
                const data = await getKanbanBoard();
                setKanbanData(data || {});
            } catch (err: any) {
                console.error('Failed to fetch kanban board data:', err);
                setKanbanData({});
            } finally {
                setLoadingKanban(false);
            }
        };
        fetchKanbanData();
    }, []);

    // Initialize dragula and Preline dropdowns after data loads
    useEffect(() => {
        if (typeof window !== "undefined" && !loadingKanban) {
          const dragula = require("dragula");
          const windowElement = window;
    
          if (leftContainerRef.current && rightContainerRef.current) {
            const containers = [
              leftContainerRef.current,
              rightContainerRef.current,
              topContainerRef.current,
              bottomContainerRef.current,
              lastContainerRef.current
            ];
            const drake = dragula(containers);
    
            // Your other dragula-related logic here...
    
            if (document.querySelector(".firstdrag")?.classList.contains("task-Null")) {
              document.querySelector(".view-more-button")?.classList.add("d-none");
            }
          }
    
          OnDivChange();

          // Re-initialize Preline dropdowns after DOM updates
          const initDropdowns = () => {
            if (typeof window !== 'undefined' && (window as any).HSStaticMethods) {
              requestAnimationFrame(() => {
                setTimeout(() => {
                  (window as any).HSStaticMethods.autoInit();
                }, 100);
              });
            }
          };
          initDropdowns();
        }
      }, [loadingKanban]);

    // Handle delete task
    const handleDeleteTask = async (task: any) => {
        const taskId = task.id || task._id;
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

                // Refresh kanban board data
                const data = await getKanbanBoard();
                setKanbanData(data || {});
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

    // Handle task form submission
    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
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
            // Get current user for assignedBy
            const currentUser = typeof window !== 'undefined' 
                ? JSON.parse(localStorage.getItem('user') || '{}')
                : null;
            
            const assignedBy = currentUser?.id || currentUser?._id || null;

            // Upload documents if any
            const attachments: any[] = [];
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
                        console.log('Documents upload response:', uploadResponse);
                        
                        if (uploadResponse.success && uploadResponse.data && Array.isArray(uploadResponse.data)) {
                            uploadResponse.data.forEach((fileData: any, index: number) => {
                                attachments.push({
                                    label: labels[index] || fileData.originalName,
                                    url: fileData.url,
                                    key: fileData.key,
                                    originalName: fileData.originalName,
                                    size: fileData.size,
                                    mimeType: fileData.mimeType
                                });
                            });
                        } else {
                            console.warn('Unexpected upload response format:', uploadResponse);
                            throw new Error('Invalid response format from upload API');
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
                attachments: attachments,
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
            } else {
                taskData.assignedDate = new Date().toISOString();
            }
            
            if (dueDate) {
                taskData.dueDate = new Date(dueDate).toISOString();
            }
            
            if (assignedBy) {
                taskData.assignedBy = assignedBy;
            }

            // Add subtasks if any
            if (subTasks.length > 0) {
                taskData.subTasks = subTasks;
            }

            // Create task
            await createTask(taskData);
            
            // Show success message
            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Task created successfully!',
                confirmButtonText: 'OK',
                timer: 2000,
                timerProgressBar: true
            });

            // Reset form
            setTaskTitle('');
            setTaskDescription('');
            setSelectedProject(null);
            setStatus({ value: 'New', label: 'New' });
            setPriority({ value: 'High', label: 'High' });
            setAssignedDate(new Date());
            setDueDate(setHours(setMinutes(new Date(), 30), 17));
            setAssignedTo([]);
            setSelectedTags([]);
            setProgress(0);
            setEfforts({ hours: 0, minutes: 0, seconds: 0 });
            setSubTasks([]);
            setNewSubTask({ title: '', description: '' });
            setTaskFiles([]);

            // Close modal
            if (typeof window !== 'undefined') {
                const modal = document.getElementById('add-task');
                if (modal) {
                    const closeButton = modal.querySelector('[data-hs-overlay="#add-task"]') as HTMLElement;
                    if (closeButton) {
                        closeButton.click();
                    }
                }
            }

            // Refresh kanban board data
            const data = await getKanbanBoard();
            setKanbanData(data || {});
        } catch (err: any) {
            console.error('Error creating task:', err);
            const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create task. Please try again.';
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

    // Helper function to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]}`;
    };

    // Helper function to calculate days left
    const getDaysLeft = (dueDateString: string) => {
        if (!dueDateString) return '';
        const dueDate = new Date(dueDateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Overdue';
        if (diffDays === 0) return 'Due today';
        if (diffDays === 1) return '1 day left';
        return `${diffDays} days left`;
    };

    // Helper function to get tag badge color class
    const getTagBadgeClass = (tag: string) => {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('ui') || tagLower.includes('ux')) return 'bg-primary/10 text-primary';
        if (tagLower.includes('marketing')) return 'bg-secondary/10 text-secondary';
        if (tagLower.includes('finance')) return 'bg-warning/10 text-warning';
        if (tagLower.includes('admin') || tagLower.includes('authentication')) return 'bg-pinkmain/10 text-pinkmain';
        if (tagLower.includes('design')) return 'bg-success/10 text-success';
        if (tagLower.includes('development')) return 'bg-danger/10 text-danger';
        if (tagLower.includes('review')) return 'bg-purplemain/10 text-purplemain';
        return 'bg-light text-default';
    };

    // Render task card component
    const renderTaskCard = (task: any, status: string) => {
        const isCompleted = status === 'Completed';
        const createdDate = formatDate(task.createdAt || task.assignedDate);
        const daysLeft = isCompleted ? '' : getDaysLeft(task.dueDate);
        
        return (
            <div key={task.id || task._id} className={`box kanban-tasks ${status.toLowerCase().replace(' ', '-')}`}>
                <div className="box-body !p-0">
                    <div className="p-4 kanban-board-head">
                        <div className="flex text-[#8c9097] dark:text-white/50 justify-between mb-1 text-[.75rem] font-semibold">
                            <div className="inline-flex">
                                <i className="ri-time-line me-1 align-middle"></i>
                                Created - {createdDate}
                            </div>
                            {isCompleted ? (
                                <div className="text-success">
                                    <i className="ri-check-fill me-1 align-middle"></i>Done
                                </div>
                            ) : (
                                <div>{daysLeft}</div>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="task-badges">
                                <span className="badge bg-light text-default">#{task.taskId || task.id?.slice(-6)}</span>
                                {task.tags && task.tags.length > 0 && task.tags.map((tag: string, idx: number) => (
                                    <span key={idx} className={`ms-1 badge ${getTagBadgeClass(tag)}`}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="hs-dropdown ti-dropdown ltr:[--placement:bottom-right] rtl:[--placement:bottom-left]">
                                <button 
                                    type="button"
                                    aria-label="anchor" 
                                    className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light ti-dropdown-toggle" 
                                    aria-expanded="false"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    <i className="fe fe-more-vertical"></i>
                                </button>
                                <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
                                    <li>
                                        <Link 
                                            className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium !inline-flex" 
                                            href={`/tasks/task-details?id=${task.id || task._id}`} 
                                            scroll={false}
                                        >
                                            <i className="ri-eye-line me-1 align-middle"></i>View
                                        </Link>
                                    </li>
                                    <li>
                                        <Link 
                                            className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium !inline-flex" 
                                            href="#!" 
                                            scroll={false}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleDeleteTask(task);
                                            }}
                                        >
                                            <i className="ri-delete-bin-line me-1 align-middle"></i>Delete
                                        </Link>
                                    </li>
                                    <li>
                                        <Link 
                                            className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium !inline-flex" 
                                            href={`/tasks/task-details?id=${task.id || task._id}`} 
                                            scroll={false}
                                        >
                                            <i className="ri-edit-line me-1 align-middle"></i>Edit
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="kanban-content !mt-1">
                            <h6 className="font-semibold mb-1 !text-[.9375rem]">{task.title}</h6>
                            <div className="kanban-task-description">
                                {task.description || 'No description provided'}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t dark:border-defaultborder/10 border-dashed">
                        <div className="flex items-center justify-between">
                            <div className="inline-flex items-center">
                                <Link href="#!" scroll={false} className="inline-flex items-center me-2 text-primary">
                                    <span className="me-1"><i className="ri-thumb-up-fill align-middle font-normal"></i></span>
                                    <span className="font-semibold text-[.75rem]">0</span>
                                </Link>
                                <Link href="#!" scroll={false} className="inline-flex items-center text-[#8c9097] dark:text-white/50">
                                    <span className="me-1"><i className="ri-message-2-line align-middle font-normal"></i></span>
                                    <span className="font-semibold text-[.75rem]">0</span>
                                </Link>
                            </div>
                            <div className="avatar-list-stacked">
                                {task.assignedTo && task.assignedTo.length > 0 ? (
                                    task.assignedTo.map((user: any, idx: number) => (
                                        <span key={user.id || user._id || idx} className="avatar avatar-sm avatar-rounded bg-primary" title={user.name || user.email}>
                                            {user.name ? (
                                                <span className="avatar-initial text-white">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </span>
                                            ) : (
                                                <img src="../../assets/images/faces/2.jpg" alt={user.name || user.email} />
                                            )}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-[#8c9097] dark:text-white/50 text-[.75rem]">Unassigned</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <Seo title={"Kanban Board"} />
            <Pageheader currentpage="Kanban Board" activepage="Task" mainpage="Kanban Board" />
            <div className="grid grid-cols-12 gap-x-6">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box">
                        <div className="box-body p-4">
                            <div className="md:flex items-center justify-between flex-wrap gap-4">
                                <div className="grid grid-cols-12 gap-2 md:w-[30%]">
                                    <div className="xl:col-span-5 col-span-12">
                                        <Link href="#!" scroll={false} className="hs-dropdown-toggle !py-1 ti-btn bg-primary text-white !font-medium " data-hs-overlay="#add-board"><i className="ri-add-line !text-[1rem]"></i>New Board
                                        </Link>
                                    </div>
                                    <div className="xl:col-span-7 col-span-12">
                                         <Select  name="colors" options={Option1} className="w-full !rounded-md"
                                                menuPlacement='auto' classNamePrefix="Select2"
                                            />
                                    </div>
                                </div>
                                <div className="avatar-list-stacked my-3 md:my-0">
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/2.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/8.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/2.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/10.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/4.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img src="../../assets/images/faces/13.jpg" alt="img" />
                                    </span>
                                    <Link className="avatar bg-primary avatar-rounded text-white" href="#!" scroll={false}>
                                        +8
                                    </Link>
                                </div>
                                <div className="flex" role="search">
                                    <input className="form-control w-full !rounded-sm me-2" type="search" placeholder="Search" aria-label="Search" />
                                    <button className="ti-btn ti-btn-light !mb-0" type="submit">Search</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="ynex-kanban-board text-defaulttextcolor dark:text-defaulttextcolor/70 text-defaultsize">
                <div className="kanban-tasks-type new">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <span className="block font-semibold text-[.9375rem]">NEW - {kanbanData.New?.length || 0}</span>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle  ti-btn !py-1 !px-2 !font-medium !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0" data-hs-overlay="#add-task"><i className="ri-add-line"></i>Add Task
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="kanban-tasks "id="new-tasks">
                    <PerfectScrollbar style={{ height: "560px" }}>
                        <div  ref={leftContainerRef} onMouseEnter={OnDivChange} className='firstdrag'
                         data-view-btn="new-tasks">
                            {loadingKanban ? (
                                <div className="text-center p-4">Loading tasks...</div>
                            ) : (
                                kanbanData.New && kanbanData.New.length > 0 ? (
                                    kanbanData.New.map((task) => renderTaskCard(task, 'New'))
                                ) : (
                                    <div className="text-center p-4 text-[#8c9097] dark:text-white/50">No tasks in this column</div>
                                )
                            )}
                        </div>
                        </PerfectScrollbar>
                    </div>
                    <div>
                    <div className="grid mt-4">
                        <button type="button" className="ti-btn ti-btn-primary">View More</button>
                    </div>
                    </div>
                </div>
                <div className="kanban-tasks-type todo">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <span className="block font-semibold text-[.9375rem]">TODO - {kanbanData.Todo?.length || 0}</span>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle  ti-btn !py-1 !px-2 !font-medium  !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0" data-hs-overlay="#add-task"><i className="ri-add-line"></i>Add Task
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="kanban-tasks" id="todo-tasks">
                    <PerfectScrollbar style={{ height: "560px" }}>
                        <div ref={rightContainerRef} 
                        id="todo-tasks-draggable"
                         data-view-btn="todo-tasks">
                            {loadingKanban ? (
                                <div className="text-center p-4">Loading tasks...</div>
                            ) : (
                                kanbanData.Todo && kanbanData.Todo.length > 0 ? (
                                    kanbanData.Todo.map((task) => renderTaskCard(task, 'Todo'))
                                ) : (
                                    <div className="text-center p-4 text-[#8c9097] dark:text-white/50">No tasks in this column</div>
                                )
                            )}
                        </div>
                        </PerfectScrollbar>
                    </div>
                    <div className="grid mt-4">
                        <button type="button" className="ti-btn ti-btn-primary">View More</button>
                    </div>
                </div>
                <div className="kanban-tasks-type in-progress">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <span className="block font-semibold text-[.9375rem]">ON GOING - {kanbanData['On Going']?.length || 0}</span>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle  ti-btn !py-1 !px-2 !font-medium !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0" data-hs-overlay="#add-task"><i className="ri-add-line"></i>Add Task
                                </Link>
                            </div>
                        </div>
                    </div>
                    <PerfectScrollbar>
                    <div className="kanban-tasks" id="inprogress-tasks">
                        <div ref={topContainerRef} onMouseEnter={OnDivChange}
                          data-view-btn="inprogress-tasks">
                            {loadingKanban ? (
                                <div className="text-center p-4">Loading tasks...</div>
                            ) : (
                                kanbanData['On Going'] && kanbanData['On Going'].length > 0 ? (
                                    kanbanData['On Going'].map((task) => renderTaskCard(task, 'On Going'))
                                ) : (
                                    <div className="text-center p-4 text-[#8c9097] dark:text-white/50">No tasks in this column</div>
                                )
                            )}
                        </div>
                    </div>
                        </PerfectScrollbar>
                    <div className="grid mt-4">
                        <button type="button" className="ti-btn ti-btn-primary">View More</button>
                    </div>
                </div>
                <div className="kanban-tasks-type inreview">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <span className="block font-semibold text-[.9375rem]">IN REVIEW - {kanbanData['In Review']?.length || 0}</span>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle  ti-btn !py-1 !px-2 !font-medium !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0" data-hs-overlay="#add-task"><i className="ri-add-line"></i>Add Task
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="kanban-tasks" id="inreview-tasks">
                    <PerfectScrollbar style={{ height: "560px" }}>
                        <div ref={bottomContainerRef} onMouseEnter={OnDivChange}
                        //  id="inreview-tasks-draggable"
                          data-view-btn="inreview-tasks">
                            {loadingKanban ? (
                                <div className="text-center p-4">Loading tasks...</div>
                            ) : (
                                kanbanData['In Review'] && kanbanData['In Review'].length > 0 ? (
                                    kanbanData['In Review'].map((task) => renderTaskCard(task, 'In Review'))
                                ) : (
                                    <div className="text-center p-4 text-[#8c9097] dark:text-white/50">No tasks in this column</div>
                                )
                            )}
                        </div>
                        </PerfectScrollbar>
                    </div>
                    <div className="grid mt-4">
                        <button type="button" className="ti-btn ti-btn-primary">View More</button>
                    </div>
                </div>
                <div className="kanban-tasks-type completed">
                    <div className="mb-4">
                        <div className="flex justify-between items-center">
                            <span className="block font-semibold text-[.9375rem]">COMPLETED - {kanbanData.Completed?.length || 0}</span>
                            <div>
                                <Link href="#!" scroll={false} className="hs-dropdown-toggle  ti-btn !py-1 !px-2 !font-medium !text-[0.75rem] bg-white dark:bg-bodybg text-default border-0" data-hs-overlay="#add-task"><i className="ri-add-line"></i>Add Task
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="kanban-tasks" id="completed-tasks">
                    <PerfectScrollbar style={{ height: "560px" }}>
                        <div  ref={lastContainerRef} onMouseEnter={OnDivChange}
                        // id="completed-tasks-draggable" 
                        data-view-btn="completed-tasks">
                            {loadingKanban ? (
                                <div className="text-center p-4">Loading tasks...</div>
                            ) : (
                                kanbanData.Completed && kanbanData.Completed.length > 0 ? (
                                    kanbanData.Completed.map((task) => renderTaskCard(task, 'Completed'))
                                ) : (
                                    <div className="text-center p-4 text-[#8c9097] dark:text-white/50">No tasks in this column</div>
                                )
                            )}
                        </div>
                        </PerfectScrollbar>
                    </div>
                    <div className="grid mt-4">
                        <button type="button" className="ti-btn ti-btn-primary">View More</button>
                    </div>
                </div>
            </div>
            <div id="add-board" className="hs-overlay hidden ti-modal">
                <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out">
                    <div className="ti-modal-content">
                        <div className="ti-modal-header">
                            <h6 className="modal-title text-[1rem] !text-default dark:text-defaulttextcolor/70 font-semibold">Add Board</h6>
                            <button type="button" className="hs-dropdown-toggle !text-[1rem] !font-semibold" data-hs-overlay="#add-board">
                                <span className="sr-only">Close</span>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <div className="ti-modal-body px-6">
                            <div className="grid grid-cols-12 gy-2">
                                <div className="xl:col-span-12 col-span-12">
                                    <label htmlFor="task-name" className="form-label">Task Name</label>
                                    <input type="text" className="form-control w-full !rounded-md" id="task-name" placeholder="Task Name" />
                                </div>
                            </div>
                        </div>
                        <div className="ti-modal-footer">
                            <button type="button"
                                className="hs-dropdown-toggle ti-btn  ti-btn-light align-middle"
                                data-hs-overlay="#add-board">
                                Cancel
                            </button>
                            <button type="button" className="ti-btn bg-primary text-white !font-medium">Add Task</button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="add-task" className="hs-overlay hidden ti-modal">
                <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out !max-w-4xl">
                    <div className="ti-modal-content">
                        <div className="ti-modal-header">
                            <h6 className="modal-title text-[1rem] font-semibold text-default dark:text-defaulttextcolor/70" id="mail-ComposeLabel">Add Task</h6>
                            <button type="button" className="hs-dropdown-toggle !text-[1rem] !font-semibold" data-hs-overlay="#add-task">
                                <span className="sr-only">Close</span>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <form onSubmit={handleTaskSubmit}>
                        <div className="ti-modal-body px-4 !overflow-visible">
                            <div className="grid grid-cols-12 gap-6">
                                    <div className="xl:col-span-12 col-span-12">
                                        <label htmlFor="task-name" className="form-label">Task Name <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control w-full !rounded-md" 
                                            id="task-name2" 
                                            placeholder="Task Name" 
                                            value={taskTitle}
                                            onChange={(e) => setTaskTitle(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label htmlFor="project-select" className="form-label">Project <span className="text-danger">*</span></label>
                                        <Select 
                                            name="project"
                                            options={projectOptions}
                                            value={selectedProject}
                                            onChange={(option) => setSelectedProject(option as { value: string; label: string } | null)}
                                            className="w-full !rounded-md"
                                            menuPlacement='auto'
                                            classNamePrefix="Select2"
                                            isLoading={loadingProjects}
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
                                    <label htmlFor="text-area" className="form-label">Task Description</label>
                                        <textarea 
                                            className="form-control w-full !rounded-md" 
                                            id="text-area" 
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
                                        <label htmlFor="text-area" className="form-label">Task Attachments</label>
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
                                            isLoading={loadingCandidates}
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
                                    className="hs-dropdown-toggle ti-btn ti-btn-light align-middle"
                                    data-hs-overlay="#add-task"
                                    disabled={isSubmitting}
                                >
                                Cancel
                            </button>
                                <button 
                                    type="submit" 
                                    className="ti-btn bg-primary text-white !font-medium"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Creating...' : 'Create'}
                                </button>
                        </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Kanbanboard