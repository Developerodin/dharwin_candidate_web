import api from './api';
import { Candidates_API, Documents_API, Onboard_Candidate_API, Register_User_API } from './constants';

// Fetch all leads
export const fetchAllCandidates = async () => {
  const response = await api.get(Candidates_API);
  return response.data;
};

export const fetchCandidateById = async (id: string) => {
  const response = await api.get(`${Candidates_API}/${id}`);
  return response.data;
};

// Create a new lead
export const addCandidate = async (candidateData: any) => {
  const response = await api.post(Candidates_API, candidateData);
  return response.data;
};

// Update a lead (send id as URL param)
export const updateCandidate = async (candidateData: any) => {
  const { id, ...rest } = candidateData;
  const response = await api.patch(`${Candidates_API}/${id}`, rest);
  return response.data;
};

// Delete a lead (send id as URL param)
export const deleteCandidate = async (leadId: string) => {
  const response = await api.delete(`${Candidates_API}/${leadId}`);
  return response.data;
};

// Register a new candidate using the auth register API
export const registerCandidate = async (candidateData: {
  name: string;
  email: string;
  password: string;
  role: string;
  phoneNumber: string;
  adminId: string;
}) => {
  const response = await api.post(Register_User_API, candidateData);
  return response.data;
};

// Onboard a candidate using the auth onboard-candidate API
export const onboardCandidate = async (candidateData: {
  email: string;
  onboardUrl: string;
}) => {
  const response = await api.post(Onboard_Candidate_API, candidateData);
  return response.data;
};

// Upload documents with files and labels
export const uploadDocuments = async (files: File[], labels: string[]) => {
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