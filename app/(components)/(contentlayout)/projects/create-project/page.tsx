"use client"
import Editordata, { Data, Data1 } from '@/shared/data/apps/projects/createprojectdata';
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic';
import React, { Fragment, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createProject, updateProject, uploadProjectDocuments, getProjectById } from '@/shared/lib/projects';
import { fetchAllCandidates } from '@/shared/lib/candidates';
import Swal from 'sweetalert2';
const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });
const Select = dynamic(() => import("react-select"), { ssr: false });
import { FilePond } from 'react-filepond';
import CreatableSelect from 'react-select/creatable';
import 'react-datepicker/dist/react-datepicker.css';


const Createproject = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('id');
    const isEditMode = !!projectId;

    const components = {
        DropdownIndicator: null,
    };

    const createOption = (label: string) => ({
        label,
        value: label,
    });

    // Form state
    const [projectName, setProjectName] = useState('');
    const [projectManager, setProjectManager] = useState('');
    const [clientStakeholder, setClientStakeholder] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(new Date());
    const [endDate, setEndDate] = useState<Date | null>(new Date());
    const [status, setStatus] = useState<{ value: number; label: string } | null>({ value: 1, label: 'Inprogress' });
    const [priority, setPriority] = useState<{ value: number; label: string } | null>({ value: 1, label: 'High' });
    const [assignedTo, setAssignedTo] = useState<{ value: string; label: string }[]>([]);
    const [tags, setTags] = useState([
        createOption("Marketing"),
        createOption("Sales"),
        createOption("Development"),
        createOption("Design"),
        createOption("Research"),
    ]);
    const [files, setFiles] = useState<any>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [candidates, setCandidates] = useState<{ value: string; label: string }[]>([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [candidateError, setCandidateError] = useState<string | null>(null);
    const [loadingProject, setLoadingProject] = useState(false);
    const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
    const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<Set<string>>(new Set());

    const [inputValue, setInputValue] = useState('');
    const [techStackInputValue, setTechStackInputValue] = useState('');
    
    // Tech Stack state - array of strings
    const [techStack, setTechStack] = useState<{ value: string; label: string }[]>([]);
    
    // Goals state - can be string or {title, description} object
    const [goals, setGoals] = useState<Array<string | { title: string; description: string }>>([]);
    const [newGoalType, setNewGoalType] = useState<'simple' | 'detailed'>('simple');
    const [newSimpleGoal, setNewSimpleGoal] = useState('');
    const [newDetailedGoal, setNewDetailedGoal] = useState({ title: '', description: '' });
    
    // Objectives state - can be string or {title, description} object
    const [objectives, setObjectives] = useState<Array<string | { title: string; description: string }>>([]);
    const [newObjectiveType, setNewObjectiveType] = useState<'simple' | 'detailed'>('simple');
    const [newSimpleObjective, setNewSimpleObjective] = useState('');
    const [newDetailedObjective, setNewDetailedObjective] = useState({ title: '', description: '' });
    
    // Deliverables state - array of {title, description, dueDate, status} objects
    const [deliverables, setDeliverables] = useState<Array<{ title: string; description: string; dueDate: Date | null; status: string }>>([]);
    const [newDeliverable, setNewDeliverable] = useState({ title: '', description: '', dueDate: null as Date | null, status: 'Pending' });
    const [editingDeliverableIndex, setEditingDeliverableIndex] = useState<number | null>(null);
    
    // Resources state - array of {type, name, description, cost/quantity, unit} objects
    const [resources, setResources] = useState<Array<{ type: string; name: string; description: string; cost?: number; quantity?: number; unit: string }>>([]);
    const [newResource, setNewResource] = useState({ type: 'Budget', name: '', description: '', cost: undefined as number | undefined, quantity: undefined as number | undefined, unit: 'USD' });
    const [editingResourceIndex, setEditingResourceIndex] = useState<number | null>(null);
    
    // Stakeholders state - array of {name, role, email, phone, organization, notes} objects
    const [stakeholders, setStakeholders] = useState<Array<{ name: string; role: string; email: string; phone: string; organization: string; notes: string }>>([]);
    const [newStakeholder, setNewStakeholder] = useState({ name: '', role: '', email: '', phone: '', organization: '', notes: '' });
    const [editingStakeholderIndex, setEditingStakeholderIndex] = useState<number | null>(null);

    // Store project data temporarily to populate form after candidates load
    const [projectDataCache, setProjectDataCache] = useState<any>(null);

    // Fetch project data if in edit mode
    useEffect(() => {
        const loadProject = async () => {
            if (!projectId) return;

            setLoadingProject(true);
            try {
                const data = await getProjectById(projectId);
                const projectData = data?.project || data?.data || data;

                if (projectData) {
                    // Store project data for later use
                    setProjectDataCache(projectData);

                    // Populate form fields with project data (except assignedTo which needs candidates)
                    setProjectName(projectData.projectName || '');
                    setProjectManager(projectData.projectManager || '');
                    setClientStakeholder(projectData.clientStakeholder || '');
                    
                    // Process description: decode HTML entities and clean malformed HTML
                    // ReactQuill will display HTML as formatted text (not raw HTML tags)
                    const description = projectData.projectDescription || '';
                    let formattedDescription = '';
                    
                    if (description.trim()) {
                        // Decode HTML entities if they exist (e.g., &lt;p&gt; -> <p>)
                        const textarea = document.createElement('textarea');
                        textarea.innerHTML = description;
                        let decodedDescription = textarea.value;
                        
                        // Clean up malformed HTML (remove nested empty p tags, fix structure)
                        // Replace multiple consecutive <p> tags with single ones
                        decodedDescription = decodedDescription.replace(/<p>\s*<p>/g, '<p>');
                        decodedDescription = decodedDescription.replace(/<\/p>\s*<\/p>/g, '</p>');
                        
                        // Check if it contains HTML tags
                        if (decodedDescription.includes('<') && decodedDescription.includes('>')) {
                            // It's HTML, use it as-is (ReactQuill will render it as formatted text)
                            formattedDescription = decodedDescription;
                        } else {
                            // Plain text, wrap in paragraph
                            formattedDescription = `<p>${decodedDescription}</p>`;
                        }
                    } else {
                        formattedDescription = '<p></p>';
                    }
                    
                    setProjectDescription(formattedDescription);
                    
                    if (projectData.startDate) {
                        setStartDate(new Date(projectData.startDate));
                    }
                    if (projectData.endDate) {
                        setEndDate(new Date(projectData.endDate));
                    }

                    // Set status
                    const statusOption = Data1.find((s: any) => s.label === projectData.status);
                    if (statusOption) {
                        setStatus(statusOption);
                    }

                    // Set priority
                    const priorityOption = Data.find((p: any) => p.label === projectData.priority);
                    if (priorityOption) {
                        setPriority(priorityOption);
                    }

                    // Set tags
                    if (projectData.tags && Array.isArray(projectData.tags)) {
                        setTags(projectData.tags.map((tag: string) => createOption(tag)));
                    }

                    // Set techStack
                    if (projectData.techStack && Array.isArray(projectData.techStack)) {
                        setTechStack(projectData.techStack.map((tech: string) => createOption(tech)));
                    }

                    // Set existing attachments
                    if (projectData.attachments && Array.isArray(projectData.attachments)) {
                        setExistingAttachments(projectData.attachments);
                    }

                    // Set goals
                    if (projectData.goals && Array.isArray(projectData.goals)) {
                        setGoals(projectData.goals);
                    }

                    // Set objectives
                    if (projectData.objectives && Array.isArray(projectData.objectives)) {
                        setObjectives(projectData.objectives);
                    }

                    // Set deliverables
                    if (projectData.deliverables && Array.isArray(projectData.deliverables)) {
                        const formattedDeliverables = projectData.deliverables.map((deliverable: any) => ({
                            title: deliverable.title || '',
                            description: deliverable.description || '',
                            dueDate: deliverable.dueDate ? new Date(deliverable.dueDate) : null,
                            status: deliverable.status || 'Pending'
                        }));
                        setDeliverables(formattedDeliverables);
                    }

                    // Set resources
                    if (projectData.resources && Array.isArray(projectData.resources)) {
                        setResources(projectData.resources);
                    }

                    // Set stakeholders
                    if (projectData.stakeholders && Array.isArray(projectData.stakeholders)) {
                        setStakeholders(projectData.stakeholders);
                    }
                }
            } catch (err: any) {
                console.error('Failed to load project:', err);
                const errorMessage = err?.response?.data?.message || err?.message || 'Failed to load project details';
                setError(errorMessage);
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    confirmButtonText: 'OK'
                });
            } finally {
                setLoadingProject(false);
            }
        };

        loadProject();
    }, [projectId]);

    // Update assignedTo when both project data and candidates are available
    useEffect(() => {
        if (projectDataCache && candidates.length > 0 && projectDataCache.assignedTo) {
            if (Array.isArray(projectDataCache.assignedTo)) {
                const assignedOptions = projectDataCache.assignedTo.map((item: any) => {
                    if (typeof item === 'string') {
                        // Find candidate by ID
                        const candidate = candidates.find((c: any) => c.value === item);
                        return candidate || { value: item, label: 'Unknown' };
                    } else {
                        // Already in object format
                        return {
                            value: item.id || item._id || '',
                            label: item.name || item.fullName || 'Unknown'
                        };
                    }
                }).filter((opt: any) => opt.value);
                setAssignedTo(assignedOptions);
            }
        }
    }, [projectDataCache, candidates]);

    // Handle delete existing attachment
    const handleDeleteAttachment = async (attachmentId: string) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: 'This attachment will be removed from the project.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            // Add to deleted set (keep in array but mark as deleted)
            setDeletedAttachmentIds(prev => new Set(prev).add(attachmentId));
            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Attachment has been removed.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    };

    // Handle restore deleted attachment
    const handleRestoreAttachment = (attachmentId: string) => {
        // Remove from deleted set
        setDeletedAttachmentIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(attachmentId);
            return newSet;
        });
    };

    // Fetch candidates on component mount
    useEffect(() => {
        const loadCandidates = async () => {
            setLoadingCandidates(true);
            try {
                const data = await fetchAllCandidates();
                // Normalize the data structure (handle different response formats)
                const normalized = Array.isArray(data)
                    ? data
                    : (Array.isArray((data as any)?.results)
                        ? (data as any).results
                        : (Array.isArray((data as any)?.data) ? (data as any).data : []));
                
                // Transform candidates to react-select format
                const candidateOptions = normalized.map((candidate: any) => ({
                    value: candidate.id || candidate._id || '',
                    label: candidate.fullName || candidate.name || 'Unknown'
                })).filter((option: any) => option.value); // Filter out candidates without IDs
                
                setCandidates(candidateOptions);
            } catch (err: any) {
                console.error('Failed to fetch candidates:', err);
                const errorMessage = 'Failed to load candidates. Please refresh the page.';
                setCandidateError(errorMessage);
                await Swal.fire({
                    icon: 'warning',
                    title: 'Warning',
                    text: errorMessage,
                    confirmButtonText: 'OK'
                });
            } finally {
                setLoadingCandidates(false);
            }
        };

        loadCandidates();
    }, []);
    
    const handleKeyDown = (event:any) => {
        if (!inputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab':
                setTags((prev) => [...prev, createOption(inputValue)]);
                setInputValue('');
                event.preventDefault();
        }
    };

    const handleTechStackKeyDown = (event:any) => {
        if (!techStackInputValue) return;
        switch (event.key) {
            case 'Enter':
            case 'Tab':
                setTechStack((prev) => [...prev, createOption(techStackInputValue)]);
                setTechStackInputValue('');
                event.preventDefault();
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Process attachments from FilePond files - upload using the same method as candidates
            const attachments: any[] = [];
            
            // If editing, include existing attachments that weren't deleted
            if (isEditMode && projectDataCache?.attachments && Array.isArray(projectDataCache.attachments)) {
                projectDataCache.attachments.forEach((attachment: any) => {
                    const attachmentId = attachment.url || attachment.key || '';
                    // Only include if not marked for deletion
                    if (!deletedAttachmentIds.has(attachmentId)) {
                        attachments.push(attachment);
                    }
                });
            }
            
            if (files.length > 0) {
                // Extract File objects and labels from FilePond files
                const filesToUpload: File[] = [];
                const labels: string[] = [];
                
                files.forEach((filePondFile: any) => {
                    const file = filePondFile.file;
                    if (file instanceof File) {
                        filesToUpload.push(file);
                        // Use file name as label, or allow user to set custom labels later
                        labels.push(file.name || 'Attachment');
                    }
                });
                
                if (filesToUpload.length > 0) {
                    try {
                        const uploadResponse = await uploadProjectDocuments(filesToUpload, labels);
                        console.log('Documents upload response:', uploadResponse);
                        
                        // Handle the API response format: {success, message, data: [{key, url, originalName, size, mimeType}]}
                        if (uploadResponse.success && uploadResponse.data && Array.isArray(uploadResponse.data)) {
                            // Map the response data to our expected format with labels and projects/docs/ prefix
                            uploadResponse.data.forEach((fileData: any, index: number) => {
                                // Extract filename from key or use originalName
                                const fileName = fileData.key ? fileData.key.split('/').pop() : fileData.originalName;
                                // Use projects/docs/ prefix for the key
                                const projectKey = `projects/docs/${fileName}`;
                                
                                attachments.push({
                                    label: labels[index] || fileData.originalName,
                                    url: fileData.url,
                                    key: projectKey,
                                    originalName: fileData.originalName,
                                    size: fileData.size,
                                    mimeType: fileData.mimeType
                                });
                            });
                        } else {
                            // Fallback for unexpected response format
                            console.warn('Unexpected upload response format:', uploadResponse);
                            throw new Error('Invalid response format from upload API');
                        }
                    } catch (uploadError) {
                        console.error('Document upload failed:', uploadError);
                        throw new Error('Failed to upload documents');
                    }
                }
            }

            // Format dates to ISO string
            const startDateISO = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
            const endDateISO = endDate ? new Date(endDate).toISOString() : new Date().toISOString();

            // Extract assignedTo IDs (candidate IDs from the dropdown)
            const assignedToIds = assignedTo.map(user => user.value);

            // Prepare project data
            // Note: projectDescription is stored as HTML (ReactQuill automatically converts formatted text to HTML)
            // ReactQuill displays HTML as formatted text (not raw HTML tags) in the editor
            const projectData = {
                projectName,
                projectManager,
                clientStakeholder,
                projectDescription: projectDescription || '<p></p>',
                startDate: startDateISO,
                endDate: endDateISO,
                status: status?.label || 'Inprogress',
                priority: priority?.label || 'High',
                assignedTo: assignedToIds,
                tags: tags.map(tag => tag.value),
                techStack: techStack.map(tech => tech.value),
                attachments: attachments,
                goals: goals,
                objectives: objectives,
                deliverables: deliverables.map(d => ({
                    title: d.title,
                    description: d.description,
                    dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
                    status: d.status
                })),
                resources: resources,
                stakeholders: stakeholders
            };

            // Call the API - use updateProject if editing, createProject if creating
            if (isEditMode && projectId) {
                await updateProject(projectId, projectData);
                // Show success message
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Project updated successfully!',
                    confirmButtonText: 'OK',
                    timer: 2000,
                    timerProgressBar: true
                });
                // Redirect to project overview on success
                router.push(`/projects/project-overview?id=${projectId}`);
            } else {
                await createProject(projectData);
                // Show success message
                await Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Project created successfully!',
                    confirmButtonText: 'OK',
                    timer: 2000,
                    timerProgressBar: true
                });
                // Redirect to project list on success
                router.push('/projects/project-list');
            }
        } catch (err: any) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} project:`, err);
            const errorMessage = err?.response?.data?.message || err?.message || `Failed to ${isEditMode ? 'update' : 'create'} project. Please try again.`;
            setError(errorMessage);
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

    if (loadingProject) {
        return (
            <Fragment>
                <Seo title={isEditMode ? "Edit Project" : "Create Project"} />
                <Pageheader currentpage={isEditMode ? "Edit Project" : "Create Project"} activepage="Projects" mainpage={isEditMode ? "Edit Project" : "Create Project"} />
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </Fragment>
        );
    }

    return (
        <Fragment>
            <Seo title={isEditMode ? "Edit Project" : "Create Project"} />
            <Pageheader currentpage={isEditMode ? "Edit Project" : "Create Project"} activepage="Projects" mainpage={isEditMode ? "Edit Project" : "Create Project"} />
            <div className="grid grid-cols-12 gap-6">
                <div className="xl:col-span-12 col-span-12">
                    <div className="box custom-box">
                        <div className="box-header">
                            <div className="box-title">
                                {isEditMode ? 'Edit Project' : 'Create Project'}
                            </div>
                        </div>
                        <div className="box-body">
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="xl:col-span-4 col-span-12">
                                        <label htmlFor="input-label" className="form-label">Project Name :</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="input-label" 
                                            placeholder="Enter Project Name" 
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-4 col-span-12">
                                        <label htmlFor="input-label1" className="form-label">Project Manager :</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="input-label1" 
                                            placeholder="Project Manager Name" 
                                            value={projectManager}
                                            onChange={(e) => setProjectManager(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-4 col-span-12">
                                        <label htmlFor="input-label2" className="form-label">Client / Stakeholder :</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            id="input-label2"
                                            placeholder="Enter Client Name" 
                                            value={clientStakeholder}
                                            onChange={(e) => setClientStakeholder(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-12 col-span-12 mb-4">
                                        <label htmlFor="text-area" className="form-label">Project Description :</label>
                                        <div id="project-descriptioin-editor">
                                            {/* ReactQuill automatically displays HTML as formatted text (not raw HTML tags) 
                                                and stores the content as HTML for saving */}
                                            {/* Key prop forces editor to re-render when description changes */}
                                            <Editordata 
                                                key={projectId || 'new-project'}
                                                value={projectDescription}
                                                onChange={setProjectDescription}
                                            />
                                        </div>
                                    </div>

                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Start Date :</label>
                                        <div className="form-group">
                                            <div className="input-group">
                                                <div className="input-group-text text-muted"> <i className="ri-calendar-line"></i> </div>
                                                <DatePicker 
                                                    className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10" 
                                                    selected={startDate} 
                                                    onChange={(date) => setStartDate(Array.isArray(date) ? null : date)} 
                                                    dateFormat="yyyy-MM-dd"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">End Date :</label>
                                        <div className="form-group">
                                            <div className="input-group">
                                                <div className="input-group-text text-muted"> <i className="ri-calendar-line"></i> </div>
                                                <DatePicker 
                                                    className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10" 
                                                    selected={endDate} 
                                                    onChange={(date) => setEndDate(Array.isArray(date) ? null : date)} 
                                                    dateFormat="yyyy-MM-dd"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Status :</label>
                                        <Select  
                                            name="status" 
                                            options={Data1} 
                                            className="js-example-placeholder-multiple w-full js-states"
                                            menuPlacement='auto' 
                                            classNamePrefix="Select2" 
                                            placeholder="Inprogress"
                                            value={status}
                                            onChange={(selected) => setStatus(selected as { value: number; label: string } | null)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Priority :</label>
                                        <Select  
                                            name="priority" 
                                            options={Data} 
                                            className="js-example-placeholder-multiple w-full js-states"
                                            menuPlacement='auto' 
                                            classNamePrefix="Select2" 
                                            placeholder="High"
                                            value={priority}
                                            onChange={(selected) => setPriority(selected as { value: number; label: string } | null)}
                                            required
                                        />
                                    </div>
                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Assigned To</label>
                                        <Select 
                                            isMulti 
                                            name="assignedTo" 
                                            options={candidates} 
                                            className="js-example-placeholder-multiple w-full js-states"
                                            menuPlacement='auto' 
                                            classNamePrefix="Select2" 
                                            placeholder={loadingCandidates ? "Loading candidates..." : "Select candidates"}
                                            isLoading={loadingCandidates}
                                            value={assignedTo}
                                            onChange={(selected) => setAssignedTo(selected as { value: string; label: string }[])}
                                        />
                                    </div>

                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Tags</label>
                                        <CreatableSelect
                                            components={components}
                                            classNamePrefix='react-select'
                                            inputValue={inputValue}
                                            isClearable
                                            isMulti
                                            menuIsOpen={false}
                                            onChange={(newValue) => {
                                                // Ensure newValue is an array (or empty array) of objects
                                                if (Array.isArray(newValue)) {
                                                    setTags(newValue);
                                                } else {
                                                    // Handle the case when newValue is not an array
                                                    setTags([]);
                                                }
                                            }}
                                            onInputChange={(newValue) => setInputValue(newValue)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type something and press enter..."
                                            value={tags}
                                        />
                                    </div>
                                    <div className="xl:col-span-6 col-span-12">
                                        <label className="form-label">Tech Stack</label>
                                        <CreatableSelect
                                            components={components}
                                            classNamePrefix='react-select'
                                            inputValue={techStackInputValue}
                                            isClearable
                                            isMulti
                                            menuIsOpen={false}
                                            onChange={(newValue) => {
                                                // Ensure newValue is an array (or empty array) of objects
                                                if (Array.isArray(newValue)) {
                                                    setTechStack(newValue);
                                                } else {
                                                    // Handle the case when newValue is not an array
                                                    setTechStack([]);
                                                }
                                            }}
                                            onInputChange={(newValue) => setTechStackInputValue(newValue)}
                                            onKeyDown={handleTechStackKeyDown}
                                            placeholder="Type technology and press enter (e.g., React, Node.js)"
                                            value={techStack}
                                        />
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label className="form-label">Goals</label>
                                        <div className="box custom-box">
                                            <div className="box-body">
                                                {/* Goals List */}
                                                {goals.length > 0 && (
                                                    <div className="mb-4">
                                                        <ul className="list-group">
                                                            {goals.map((goal, index) => (
                                                                <li key={index} className="list-group-item">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-grow">
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
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const result = await Swal.fire({
                                                                                    title: 'Are you sure?',
                                                                                    text: 'This goal will be removed.',
                                                                                    icon: 'warning',
                                                                                    showCancelButton: true,
                                                                                    confirmButtonColor: '#3085d6',
                                                                                    cancelButtonColor: '#d33',
                                                                                    confirmButtonText: 'Yes, delete it!',
                                                                                    cancelButtonText: 'Cancel'
                                                                                });

                                                                                if (result.isConfirmed) {
                                                                                    const newGoals = [...goals];
                                                                                    newGoals.splice(index, 1);
                                                                                    setGoals(newGoals);
                                                                                    await Swal.fire({
                                                                                        icon: 'success',
                                                                                        title: 'Deleted!',
                                                                                        text: 'Goal has been removed.',
                                                                                        timer: 1500,
                                                                                        showConfirmButton: false
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="ti-btn ti-btn-sm ti-btn-danger ms-2"
                                                                        >
                                                                            <i className="ri-delete-bin-line"></i>
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Add Goal Form */}
                                                <div className="border-t pt-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">Goal Type</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewGoalType('simple')}
                                                                className={`ti-btn ${newGoalType === 'simple' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                                                            >
                                                                Simple Goal
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewGoalType('detailed')}
                                                                className={`ti-btn ${newGoalType === 'detailed' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                                                            >
                                                                Detailed Goal
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {newGoalType === 'simple' ? (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                className="form-control flex-grow"
                                                                placeholder="Enter goal (e.g., Improve user experience)"
                                                                value={newSimpleGoal}
                                                                onChange={(e) => setNewSimpleGoal(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && newSimpleGoal.trim()) {
                                                                        e.preventDefault();
                                                                        setGoals([...goals, newSimpleGoal.trim()]);
                                                                        setNewSimpleGoal('');
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newSimpleGoal.trim()) {
                                                                        setGoals([...goals, newSimpleGoal.trim()]);
                                                                        setNewSimpleGoal('');
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newSimpleGoal.trim()}
                                                            >
                                                                <i className="ri-add-line"></i> Add
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Goal Title (e.g., Increase conversion rate)"
                                                                value={newDetailedGoal.title}
                                                                onChange={(e) => setNewDetailedGoal({ ...newDetailedGoal, title: e.target.value })}
                                                            />
                                                            <textarea
                                                                className="form-control"
                                                                rows={3}
                                                                placeholder="Goal Description (e.g., Target 20% increase in website conversions)"
                                                                value={newDetailedGoal.description}
                                                                onChange={(e) => setNewDetailedGoal({ ...newDetailedGoal, description: e.target.value })}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newDetailedGoal.title.trim()) {
                                                                        setGoals([...goals, {
                                                                            title: newDetailedGoal.title.trim(),
                                                                            description: newDetailedGoal.description.trim()
                                                                        }]);
                                                                        setNewDetailedGoal({ title: '', description: '' });
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newDetailedGoal.title.trim()}
                                                            >
                                                                <i className="ri-add-line"></i> Add Goal
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label className="form-label">Objectives</label>
                                        <div className="box custom-box">
                                            <div className="box-body">
                                                {/* Objectives List */}
                                                {objectives.length > 0 && (
                                                    <div className="mb-4">
                                                        <ul className="list-group">
                                                            {objectives.map((objective, index) => (
                                                                <li key={index} className="list-group-item">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-grow">
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
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const result = await Swal.fire({
                                                                                    title: 'Are you sure?',
                                                                                    text: 'This objective will be removed.',
                                                                                    icon: 'warning',
                                                                                    showCancelButton: true,
                                                                                    confirmButtonColor: '#3085d6',
                                                                                    cancelButtonColor: '#d33',
                                                                                    confirmButtonText: 'Yes, delete it!',
                                                                                    cancelButtonText: 'Cancel'
                                                                                });

                                                                                if (result.isConfirmed) {
                                                                                    const newObjectives = [...objectives];
                                                                                    newObjectives.splice(index, 1);
                                                                                    setObjectives(newObjectives);
                                                                                    await Swal.fire({
                                                                                        icon: 'success',
                                                                                        title: 'Deleted!',
                                                                                        text: 'Objective has been removed.',
                                                                                        timer: 1500,
                                                                                        showConfirmButton: false
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className="ti-btn ti-btn-sm ti-btn-danger ms-2"
                                                                        >
                                                                            <i className="ri-delete-bin-line"></i>
                                                                        </button>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Add Objective Form */}
                                                <div className="border-t pt-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">Objective Type</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewObjectiveType('simple')}
                                                                className={`ti-btn ${newObjectiveType === 'simple' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                                                            >
                                                                Simple Objective
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewObjectiveType('detailed')}
                                                                className={`ti-btn ${newObjectiveType === 'detailed' ? 'ti-btn-primary' : 'ti-btn-light'}`}
                                                            >
                                                                Detailed Objective
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {newObjectiveType === 'simple' ? (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                className="form-control flex-grow"
                                                                placeholder="Enter objective (e.g., Complete UI/UX redesign)"
                                                                value={newSimpleObjective}
                                                                onChange={(e) => setNewSimpleObjective(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && newSimpleObjective.trim()) {
                                                                        e.preventDefault();
                                                                        setObjectives([...objectives, newSimpleObjective.trim()]);
                                                                        setNewSimpleObjective('');
                                                                    }
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newSimpleObjective.trim()) {
                                                                        setObjectives([...objectives, newSimpleObjective.trim()]);
                                                                        setNewSimpleObjective('');
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newSimpleObjective.trim()}
                                                            >
                                                                <i className="ri-add-line"></i> Add
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Objective Title (e.g., Optimize page load times)"
                                                                value={newDetailedObjective.title}
                                                                onChange={(e) => setNewDetailedObjective({ ...newDetailedObjective, title: e.target.value })}
                                                            />
                                                            <textarea
                                                                className="form-control"
                                                                rows={3}
                                                                placeholder="Objective Description (e.g., Achieve page load time under 2 seconds)"
                                                                value={newDetailedObjective.description}
                                                                onChange={(e) => setNewDetailedObjective({ ...newDetailedObjective, description: e.target.value })}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newDetailedObjective.title.trim()) {
                                                                        setObjectives([...objectives, {
                                                                            title: newDetailedObjective.title.trim(),
                                                                            description: newDetailedObjective.description.trim()
                                                                        }]);
                                                                        setNewDetailedObjective({ title: '', description: '' });
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newDetailedObjective.title.trim()}
                                                            >
                                                                <i className="ri-add-line"></i> Add Objective
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label className="form-label">Deliverables</label>
                                        <div className="box custom-box">
                                            <div className="box-body">
                                                {/* Deliverables List */}
                                                {deliverables.length > 0 && (
                                                    <div className="mb-4">
                                                        <ul className="list-group">
                                                            {deliverables.map((deliverable, index) => (
                                                                <li key={index} className="list-group-item">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-grow">
                                                                            <div className="font-semibold">{deliverable.title}</div>
                                                                            {deliverable.description && (
                                                                                <div className="text-[#8c9097] dark:text-white/50 text-sm mt-1">{deliverable.description}</div>
                                                                            )}
                                                                            <div className="flex items-center gap-4 mt-2">
                                                                                <div className="text-sm">
                                                                                    <span className="text-[#8c9097] dark:text-white/50">Due Date: </span>
                                                                                    <span className="font-semibold">
                                                                                        {deliverable.dueDate ? new Date(deliverable.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
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
                                                                        </div>
                                                                        <div className="flex gap-2 ms-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingDeliverableIndex(index);
                                                                                    setNewDeliverable({
                                                                                        title: deliverable.title,
                                                                                        description: deliverable.description,
                                                                                        dueDate: deliverable.dueDate,
                                                                                        status: deliverable.status
                                                                                    });
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-info"
                                                                                title="Edit"
                                                                            >
                                                                                <i className="ri-edit-line"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    const result = await Swal.fire({
                                                                                        title: 'Are you sure?',
                                                                                        text: 'This deliverable will be removed.',
                                                                                        icon: 'warning',
                                                                                        showCancelButton: true,
                                                                                        confirmButtonColor: '#3085d6',
                                                                                        cancelButtonColor: '#d33',
                                                                                        confirmButtonText: 'Yes, delete it!',
                                                                                        cancelButtonText: 'Cancel'
                                                                                    });

                                                                                    if (result.isConfirmed) {
                                                                                        const newDeliverables = [...deliverables];
                                                                                        newDeliverables.splice(index, 1);
                                                                                        setDeliverables(newDeliverables);
                                                                                        if (editingDeliverableIndex === index) {
                                                                                            setEditingDeliverableIndex(null);
                                                                                            setNewDeliverable({ title: '', description: '', dueDate: null, status: 'Pending' });
                                                                                        }
                                                                                        await Swal.fire({
                                                                                            icon: 'success',
                                                                                            title: 'Deleted!',
                                                                                            text: 'Deliverable has been removed.',
                                                                                            timer: 1500,
                                                                                            showConfirmButton: false
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-danger"
                                                                                title="Delete"
                                                                            >
                                                                                <i className="ri-delete-bin-line"></i>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Add/Edit Deliverable Form */}
                                                <div className="border-t pt-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">{editingDeliverableIndex !== null ? 'Edit Deliverable' : 'Add New Deliverable'}</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Deliverable Title (e.g., Design Mockups)"
                                                            value={newDeliverable.title}
                                                            onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
                                                        />
                                                        <textarea
                                                            className="form-control"
                                                            rows={3}
                                                            placeholder="Deliverable Description (e.g., High-fidelity mockups for all major pages)"
                                                            value={newDeliverable.description}
                                                            onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                                                        />
                                                        <div className="grid grid-cols-12 gap-4">
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Due Date</label>
                                                                <div className="form-group">
                                                                    <div className="input-group">
                                                                        <div className="input-group-text text-muted">
                                                                            <i className="ri-calendar-line"></i>
                                                                        </div>
                                                                        <DatePicker
                                                                            className="ti-form-input ltr:rounded-l-none rtl:rounded-r-none focus:z-10"
                                                                            selected={newDeliverable.dueDate}
                                                                            onChange={(date) => setNewDeliverable({ ...newDeliverable, dueDate: Array.isArray(date) ? null : date })}
                                                                            dateFormat="yyyy-MM-dd"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Status</label>
                                                                <Select
                                                                    name="deliverableStatus"
                                                                    options={[
                                                                        { value: 'Pending', label: 'Pending' },
                                                                        { value: 'In Progress', label: 'In Progress' },
                                                                        { value: 'Completed', label: 'Completed' },
                                                                        { value: 'On Hold', label: 'On Hold' }
                                                                    ]}
                                                                    className="js-example-placeholder-multiple w-full js-states"
                                                                    menuPlacement='auto'
                                                                    classNamePrefix="Select2"
                                                                    placeholder="Select Status"
                                                                    value={{ value: newDeliverable.status, label: newDeliverable.status }}
                                                                    onChange={(selected) => setNewDeliverable({ ...newDeliverable, status: (selected as { value: string; label: string } | null)?.value || 'Pending' })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newDeliverable.title.trim() && newDeliverable.dueDate) {
                                                                        if (editingDeliverableIndex !== null) {
                                                                            // Update existing deliverable
                                                                            const updatedDeliverables = [...deliverables];
                                                                            updatedDeliverables[editingDeliverableIndex] = {
                                                                                title: newDeliverable.title.trim(),
                                                                                description: newDeliverable.description.trim(),
                                                                                dueDate: newDeliverable.dueDate,
                                                                                status: newDeliverable.status
                                                                            };
                                                                            setDeliverables(updatedDeliverables);
                                                                            setEditingDeliverableIndex(null);
                                                                        } else {
                                                                            // Add new deliverable
                                                                            setDeliverables([...deliverables, {
                                                                                title: newDeliverable.title.trim(),
                                                                                description: newDeliverable.description.trim(),
                                                                                dueDate: newDeliverable.dueDate,
                                                                                status: newDeliverable.status
                                                                            }]);
                                                                        }
                                                                        setNewDeliverable({ title: '', description: '', dueDate: null, status: 'Pending' });
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newDeliverable.title.trim() || !newDeliverable.dueDate}
                                                            >
                                                                <i className="ri-add-line"></i> {editingDeliverableIndex !== null ? 'Update Deliverable' : 'Add Deliverable'}
                                                            </button>
                                                            {editingDeliverableIndex !== null && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingDeliverableIndex(null);
                                                                        setNewDeliverable({ title: '', description: '', dueDate: null, status: 'Pending' });
                                                                    }}
                                                                    className="ti-btn ti-btn-light"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label className="form-label">Resources</label>
                                        <div className="box custom-box">
                                            <div className="box-body">
                                                {/* Resources List */}
                                                {resources.length > 0 && (
                                                    <div className="mb-4">
                                                        <ul className="list-group">
                                                            {resources.map((resource, index) => (
                                                                <li key={index} className="list-group-item">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-grow">
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
                                                                        </div>
                                                                        <div className="flex gap-2 ms-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingResourceIndex(index);
                                                                                    setNewResource({
                                                                                        type: resource.type,
                                                                                        name: resource.name,
                                                                                        description: resource.description,
                                                                                        cost: resource.cost,
                                                                                        quantity: resource.quantity,
                                                                                        unit: resource.unit
                                                                                    });
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-info"
                                                                                title="Edit"
                                                                            >
                                                                                <i className="ri-edit-line"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    const result = await Swal.fire({
                                                                                        title: 'Are you sure?',
                                                                                        text: 'This resource will be removed.',
                                                                                        icon: 'warning',
                                                                                        showCancelButton: true,
                                                                                        confirmButtonColor: '#3085d6',
                                                                                        cancelButtonColor: '#d33',
                                                                                        confirmButtonText: 'Yes, delete it!',
                                                                                        cancelButtonText: 'Cancel'
                                                                                    });

                                                                                    if (result.isConfirmed) {
                                                                                        const newResources = [...resources];
                                                                                        newResources.splice(index, 1);
                                                                                        setResources(newResources);
                                                                                        if (editingResourceIndex === index) {
                                                                                            setEditingResourceIndex(null);
                                                                                            setNewResource({ type: 'Budget', name: '', description: '', cost: undefined, quantity: undefined, unit: 'USD' });
                                                                                        }
                                                                                        await Swal.fire({
                                                                                            icon: 'success',
                                                                                            title: 'Deleted!',
                                                                                            text: 'Resource has been removed.',
                                                                                            timer: 1500,
                                                                                            showConfirmButton: false
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-danger"
                                                                                title="Delete"
                                                                            >
                                                                                <i className="ri-delete-bin-line"></i>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Add/Edit Resource Form */}
                                                <div className="border-t pt-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">{editingResourceIndex !== null ? 'Edit Resource' : 'Add New Resource'}</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-12 gap-4">
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Resource Type</label>
                                                                <Select
                                                                    name="resourceType"
                                                                    options={[
                                                                        { value: 'Budget', label: 'Budget' },
                                                                        { value: 'Tool', label: 'Tool' }
                                                                    ]}
                                                                    className="js-example-placeholder-multiple w-full js-states"
                                                                    menuPlacement='auto'
                                                                    classNamePrefix="Select2"
                                                                    placeholder="Select Type"
                                                                    value={{ value: newResource.type, label: newResource.type }}
                                                                    onChange={(selected) => {
                                                                        const type = (selected as { value: string; label: string } | null)?.value || 'Budget';
                                                                        setNewResource({
                                                                            ...newResource,
                                                                            type,
                                                                            cost: type === 'Budget' ? newResource.cost : undefined,
                                                                            quantity: type === 'Tool' ? newResource.quantity : undefined,
                                                                            unit: type === 'Budget' ? 'USD' : 'licenses'
                                                                        });
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Name</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder={newResource.type === 'Budget' ? 'e.g., Development Budget' : 'e.g., Figma License'}
                                                                    value={newResource.name}
                                                                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            className="form-control"
                                                            rows={3}
                                                            placeholder="Description"
                                                            value={newResource.description}
                                                            onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                                                        />
                                                        <div className="grid grid-cols-12 gap-4">
                                                            {newResource.type === 'Budget' ? (
                                                                <>
                                                                    <div className="xl:col-span-6 col-span-12">
                                                                        <label className="form-label">Cost</label>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            placeholder="e.g., 50000"
                                                                            value={newResource.cost || ''}
                                                                            onChange={(e) => setNewResource({ ...newResource, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                                                                        />
                                                                    </div>
                                                                    <div className="xl:col-span-6 col-span-12">
                                                                        <label className="form-label">Unit</label>
                                                                        <Select
                                                                            name="budgetUnit"
                                                                            options={[
                                                                                { value: 'USD', label: 'USD' },
                                                                                { value: 'EUR', label: 'EUR' },
                                                                                { value: 'GBP', label: 'GBP' },
                                                                                { value: 'INR', label: 'INR' }
                                                                            ]}
                                                                            className="js-example-placeholder-multiple w-full js-states"
                                                                            menuPlacement='auto'
                                                                            classNamePrefix="Select2"
                                                                            placeholder="Select Unit"
                                                                            value={{ value: newResource.unit, label: newResource.unit }}
                                                                            onChange={(selected) => setNewResource({ ...newResource, unit: (selected as { value: string; label: string } | null)?.value || 'USD' })}
                                                                        />
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="xl:col-span-6 col-span-12">
                                                                        <label className="form-label">Quantity</label>
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            placeholder="e.g., 3"
                                                                            value={newResource.quantity || ''}
                                                                            onChange={(e) => setNewResource({ ...newResource, quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                                                                        />
                                                                    </div>
                                                                    <div className="xl:col-span-6 col-span-12">
                                                                        <label className="form-label">Unit</label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control"
                                                                            placeholder="e.g., licenses, seats, etc."
                                                                            value={newResource.unit}
                                                                            onChange={(e) => setNewResource({ ...newResource, unit: e.target.value })}
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newResource.name.trim()) {
                                                                        if ((newResource.type === 'Budget' && newResource.cost !== undefined) || 
                                                                            (newResource.type === 'Tool' && newResource.quantity !== undefined)) {
                                                                            if (editingResourceIndex !== null) {
                                                                                // Update existing resource
                                                                                const updatedResources = [...resources];
                                                                                updatedResources[editingResourceIndex] = {
                                                                                    type: newResource.type,
                                                                                    name: newResource.name.trim(),
                                                                                    description: newResource.description.trim(),
                                                                                    cost: newResource.cost,
                                                                                    quantity: newResource.quantity,
                                                                                    unit: newResource.unit
                                                                                };
                                                                                setResources(updatedResources);
                                                                                setEditingResourceIndex(null);
                                                                            } else {
                                                                                // Add new resource
                                                                                setResources([...resources, {
                                                                                    type: newResource.type,
                                                                                    name: newResource.name.trim(),
                                                                                    description: newResource.description.trim(),
                                                                                    cost: newResource.cost,
                                                                                    quantity: newResource.quantity,
                                                                                    unit: newResource.unit
                                                                                }]);
                                                                            }
                                                                            setNewResource({ type: 'Budget', name: '', description: '', cost: undefined, quantity: undefined, unit: 'USD' });
                                                                        }
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newResource.name.trim() || (newResource.type === 'Budget' && newResource.cost === undefined) || (newResource.type === 'Tool' && newResource.quantity === undefined)}
                                                            >
                                                                <i className="ri-add-line"></i> {editingResourceIndex !== null ? 'Update Resource' : 'Add Resource'}
                                                            </button>
                                                            {editingResourceIndex !== null && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingResourceIndex(null);
                                                                        setNewResource({ type: 'Budget', name: '', description: '', cost: undefined, quantity: undefined, unit: 'USD' });
                                                                    }}
                                                                    className="ti-btn ti-btn-light"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label className="form-label">Stakeholders</label>
                                        <div className="box custom-box">
                                            <div className="box-body">
                                                {/* Stakeholders List */}
                                                {stakeholders.length > 0 && (
                                                    <div className="mb-4">
                                                        <ul className="list-group">
                                                            {stakeholders.map((stakeholder, index) => (
                                                                <li key={index} className="list-group-item">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex-grow">
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
                                                                        </div>
                                                                        <div className="flex gap-2 ms-2">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setEditingStakeholderIndex(index);
                                                                                    setNewStakeholder({
                                                                                        name: stakeholder.name,
                                                                                        role: stakeholder.role,
                                                                                        email: stakeholder.email,
                                                                                        phone: stakeholder.phone,
                                                                                        organization: stakeholder.organization,
                                                                                        notes: stakeholder.notes
                                                                                    });
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-info"
                                                                                title="Edit"
                                                                            >
                                                                                <i className="ri-edit-line"></i>
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    const result = await Swal.fire({
                                                                                        title: 'Are you sure?',
                                                                                        text: 'This stakeholder will be removed.',
                                                                                        icon: 'warning',
                                                                                        showCancelButton: true,
                                                                                        confirmButtonColor: '#3085d6',
                                                                                        cancelButtonColor: '#d33',
                                                                                        confirmButtonText: 'Yes, delete it!',
                                                                                        cancelButtonText: 'Cancel'
                                                                                    });

                                                                                    if (result.isConfirmed) {
                                                                                        const newStakeholders = [...stakeholders];
                                                                                        newStakeholders.splice(index, 1);
                                                                                        setStakeholders(newStakeholders);
                                                                                        if (editingStakeholderIndex === index) {
                                                                                            setEditingStakeholderIndex(null);
                                                                                            setNewStakeholder({ name: '', role: '', email: '', phone: '', organization: '', notes: '' });
                                                                                        }
                                                                                        await Swal.fire({
                                                                                            icon: 'success',
                                                                                            title: 'Deleted!',
                                                                                            text: 'Stakeholder has been removed.',
                                                                                            timer: 1500,
                                                                                            showConfirmButton: false
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="ti-btn ti-btn-sm ti-btn-danger"
                                                                                title="Delete"
                                                                            >
                                                                                <i className="ri-delete-bin-line"></i>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Add/Edit Stakeholder Form */}
                                                <div className="border-t pt-4">
                                                    <div className="mb-3">
                                                        <label className="form-label">{editingStakeholderIndex !== null ? 'Edit Stakeholder' : 'Add New Stakeholder'}</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-12 gap-4">
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Name</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="e.g., John Smith"
                                                                    value={newStakeholder.name}
                                                                    onChange={(e) => setNewStakeholder({ ...newStakeholder, name: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Role</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="e.g., Client, Sponsor, Manager"
                                                                    value={newStakeholder.role}
                                                                    onChange={(e) => setNewStakeholder({ ...newStakeholder, role: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-12 gap-4">
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Email</label>
                                                                <input
                                                                    type="email"
                                                                    className="form-control"
                                                                    placeholder="e.g., john.smith@abccorp.com"
                                                                    value={newStakeholder.email}
                                                                    onChange={(e) => setNewStakeholder({ ...newStakeholder, email: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Phone</label>
                                                                <input
                                                                    type="tel"
                                                                    className="form-control"
                                                                    placeholder="e.g., +1-555-0100"
                                                                    value={newStakeholder.phone}
                                                                    onChange={(e) => setNewStakeholder({ ...newStakeholder, phone: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-12 gap-4">
                                                            <div className="xl:col-span-6 col-span-12">
                                                                <label className="form-label">Organization</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="e.g., ABC Corporation"
                                                                    value={newStakeholder.organization}
                                                                    onChange={(e) => setNewStakeholder({ ...newStakeholder, organization: e.target.value })}
                                                                />
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            className="form-control"
                                                            rows={3}
                                                            placeholder="Notes (e.g., Primary contact for project decisions)"
                                                            value={newStakeholder.notes}
                                                            onChange={(e) => setNewStakeholder({ ...newStakeholder, notes: e.target.value })}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (newStakeholder.name.trim()) {
                                                                        if (editingStakeholderIndex !== null) {
                                                                            // Update existing stakeholder
                                                                            const updatedStakeholders = [...stakeholders];
                                                                            updatedStakeholders[editingStakeholderIndex] = {
                                                                                name: newStakeholder.name.trim(),
                                                                                role: newStakeholder.role.trim(),
                                                                                email: newStakeholder.email.trim(),
                                                                                phone: newStakeholder.phone.trim(),
                                                                                organization: newStakeholder.organization.trim(),
                                                                                notes: newStakeholder.notes.trim()
                                                                            };
                                                                            setStakeholders(updatedStakeholders);
                                                                            setEditingStakeholderIndex(null);
                                                                        } else {
                                                                            // Add new stakeholder
                                                                            setStakeholders([...stakeholders, {
                                                                                name: newStakeholder.name.trim(),
                                                                                role: newStakeholder.role.trim(),
                                                                                email: newStakeholder.email.trim(),
                                                                                phone: newStakeholder.phone.trim(),
                                                                                organization: newStakeholder.organization.trim(),
                                                                                notes: newStakeholder.notes.trim()
                                                                            }]);
                                                                        }
                                                                        setNewStakeholder({ name: '', role: '', email: '', phone: '', organization: '', notes: '' });
                                                                    }
                                                                }}
                                                                className="ti-btn ti-btn-primary"
                                                                disabled={!newStakeholder.name.trim()}
                                                            >
                                                                <i className="ri-add-line"></i> {editingStakeholderIndex !== null ? 'Update Stakeholder' : 'Add Stakeholder'}
                                                            </button>
                                                            {editingStakeholderIndex !== null && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditingStakeholderIndex(null);
                                                                        setNewStakeholder({ name: '', role: '', email: '', phone: '', organization: '', notes: '' });
                                                                    }}
                                                                    className="ti-btn ti-btn-light"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="xl:col-span-12 col-span-12">
                                        <label htmlFor="text-area" className="form-label">Attachments</label>
                                        
                                        {/* Display existing attachments in edit mode */}
                                        {isEditMode && existingAttachments.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-[.875rem] font-semibold mb-2">Existing Documents:</div>
                                                <ul className="list-group">
                                                    {existingAttachments.map((attachment, idx) => {
                                                        const attachmentId = attachment.url || attachment.key || `attachment-${idx}`;
                                                        const isDeleted = deletedAttachmentIds.has(attachmentId);
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
                                                            <li key={attachmentId} className={`list-group-item ${isDeleted ? 'opacity-50' : ''}`}>
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center flex-grow">
                                                                        <div className="me-2">
                                                                            <span className="avatar !rounded-full p-2 bg-light">
                                                                                <i className={`${getFileIcon(fileExtension)} text-primary text-xl`}></i>
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex-grow">
                                                                            <a 
                                                                                href={attachment.url || '#'} 
                                                                                target="_blank" 
                                                                                rel="noopener noreferrer"
                                                                                className="block font-semibold text-primary hover:underline"
                                                                            >
                                                                                {fileName}
                                                                            </a>
                                                                            <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] font-normal">{fileSize}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="inline-flex items-center gap-2">
                                                                        {!isDeleted ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleDeleteAttachment(attachmentId)}
                                                                                className="ti-btn ti-btn-sm ti-btn-danger"
                                                                                title="Delete"
                                                                            >
                                                                                <i className="ri-delete-bin-line"></i>
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <span className="text-danger text-sm">Marked for deletion</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRestoreAttachment(attachmentId)}
                                                                                    className="ti-btn ti-btn-sm ti-btn-success"
                                                                                    title="Restore"
                                                                                >
                                                                                    <i className="ri-arrow-go-back-line"></i>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {/* FilePond for new uploads */}
                                        <div className={isEditMode && existingAttachments.length > 0 ? 'mt-4' : ''}>
                                            <div className="text-[.875rem] font-semibold mb-2">{isEditMode ? 'Add New Documents:' : 'Documents:'}</div>
                                            <FilePond
                                                files={files}
                                                onupdatefiles={setFiles}
                                                allowMultiple={true}
                                                maxFiles={3}
                                                instantUpload={false}
                                                name="file"
                                                labelIdle='Drag & Drop your file here or click '
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="box-footer mt-4">
                                    <button 
                                        type="submit" 
                                        className="ti-btn ti-btn-primary btn-wave ms-auto float-right"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting 
                                            ? (isEditMode ? 'Updating...' : 'Creating...') 
                                            : (isEditMode ? 'Update Project' : 'Create Project')
                                        }
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}

export default Createproject