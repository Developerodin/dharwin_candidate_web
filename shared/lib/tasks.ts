import api from './api';
import { Tasks_API, Documents_API } from './constants';

// Upload documents with files and labels (same as candidates but with Tasks path prefix)
export const uploadTaskDocuments = async (files: File[], labels: string[]) => {
    const formData = new FormData();
    
    // Append files to FormData
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    // Append labels as a JSON string array
    formData.append('labels', JSON.stringify(labels));
    
    const response = await api.post(Documents_API, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  };

// create a new task
export const createTask = async (taskData: any) => {
  const response = await api.post(Tasks_API, taskData);
  return response.data;
};

// get all tasks
export const getAllTasks = async () => {
  const response = await api.get(Tasks_API);
  return response.data;
};

// Get Kanban Board
export const getKanbanBoard = async () => {
  const response = await api.get(`${Tasks_API}/kanban-board`);
  return response.data;
};

// get a task by id
export const getTaskById = async (taskId: string) => {
  const response = await api.get(`${Tasks_API}/${taskId}`);
  return response.data;
};

// update a task
export const updateTask = async (taskId: string, taskData: any) => {
  const response = await api.patch(`${Tasks_API}/${taskId}`, taskData);
  return response.data;
};

// delete a task
export const deleteTask = async (taskId: string) => {
  const response = await api.delete(`${Tasks_API}/${taskId}`);
  return response.data;
};

// Get Task Statistics
export const getTaskStatistics = async () => {
  const response = await api.get(`${Tasks_API}/statistics`);
  return response.data;
};

// Update Task Status
export const updateTaskStatus = async (taskId: string, taskStatus: string) => {
  const response = await api.patch(`${Tasks_API}/${taskId}/status`, { status: taskStatus });
  return response.data;
};