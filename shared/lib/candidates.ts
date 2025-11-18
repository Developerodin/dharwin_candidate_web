import api from './api';
import { Attendance_API, Candidate_SalarySlips_API, Candidates_API, Documents_API, Export_Candidates_API, Fetch_Candidate_Documents_API, Forgot_Password_API, Join_Meeting_API, Logs_API, Meeting_API, Onboard_Candidate_API, Register_User_API, Share_Candidate_API, Transcription_API, Transcription_Download_API, Transcription_Start_API, Transcription_Status_API, Verify_Document_API } from './constants';

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

// Export candidates
export const exportCandidates = async () => {
  const response = await api.post(Export_Candidates_API);
  return response.data;
};

// Get candidate salary slips
export const getCandidateSalarySlips = async (candidateId: string) => {
  const response = await api.get(`${Candidate_SalarySlips_API}/${candidateId}`);
  return response.data;
};

// Post candidate salary slips
export const addCandidateSalarySlips = async (candidateId: string, salarySlipData: {
  month: string;
  year: number;
  documentUrl: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
}) => {
  const response = await api.post(`${Candidate_SalarySlips_API}/${candidateId}`, salarySlipData);
  return response.data;
};

// Forgot password
export const forgotPassword = async (email: string) => {
  const response = await api.post(Forgot_Password_API, { email });
  return response.data;
};

// Verify document
export const verifyDocument = async (candidateId: string, documentIndex: number, status: number) => {
  const response = await api.patch(`${Verify_Document_API}/${candidateId}/${documentIndex}`, { status });
  return response.data;
};

// Fetch candidate documents
export const fetchCandidateDocuments = async (candidateId: string) => {
  const response = await api.get(`${Fetch_Candidate_Documents_API}/${candidateId}`);
  return response.data;
};

// Share candidate
export const shareCandidate = async (candidateId: string, shareData: {
  email: string;
  withDoc: boolean;
}) => {
  const response = await api.post(`${Share_Candidate_API}/${candidateId}`, shareData);
  return response.data;
};

// Create meeting
export const createMeeting = async (meetingData: {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
  hosts?: { name: string; email: string }[];
}) => {
  const response = await api.post(Meeting_API, meetingData);
  return response.data;
};

// Get meetings list
export const getMeetingsList = async () => {
  const response = await api.get(Meeting_API);
  return response.data;
};

// get meeting by id
export const getMeetingById = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}`);
  return response.data;
};

// update meeting by id
export const updateMeetingById = async (meetingId: string, meetingData: {
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  maxParticipants: number;
  allowGuestJoin: boolean;
  requireApproval: boolean;
}) => {
  const response = await api.patch(`${Meeting_API}/${meetingId}`, meetingData);
  return response.data;
};

// delete meeting by id
export const deleteMeetingById = async (meetingId: string) => {
  const response = await api.delete(`${Meeting_API}/${meetingId}`);
  return response.data;
};

// Join meeting
export const joinMeeting = async (meetingId: string, data: {
  joinToken: string;
  name: string;
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/join`, data);
  return response.data;
};

// Leave meeting
export const leaveMeeting = async (meetingId: string, data: {
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/leave`, data);
  return response.data;
};

// List participants in a meeting
export const listParticipantsInMeeting = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/participants`);
  return response.data;
};

// end meeting
export const endMeeting = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/end`);
  return response.data;
};

// Get meeting info
export const getMeetingInfo = async (meetingId: string, token: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/info?token=${token}`);
  return response.data;
};

// Get screen share token for a meeting
export const getScreenShareToken = async (meetingId: string, data: {
  joinToken: string;
  screenShareUid: string | number;
  email: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/screen-share-token`, data);
  return response.data;
};


// Get logs
export const getLogs = async () => {
  const response = await api.get(Logs_API);
  return response.data;
};


// Punch in attendance
export const punchInAttendance = async (candidateId: string, attendanceData: {
  punchInTime: string;
  notes: "Starting shift";
}) => {
  const response = await api.post(`${Attendance_API}/punch-in/${candidateId}`, attendanceData);
  return response.data;
};

// Punch out attendance
export const punchOutAttendance = async (candidateId: string, attendanceData: {
  punchOutTime: string;
  notes: "Ending shift";
}) => {
  const response = await api.post(`${Attendance_API}/punch-out/${candidateId}`, attendanceData);
  return response.data;
};

// Get Punch In/Out Status by candidate id
export const getPunchInOutStatus = async (candidateId: string) => {
  const response = await api.get(`${Attendance_API}/status/${candidateId}`);
  return response.data;
};

// Get Attendance by Candidate
export const getAttendanceByCandidate = async (candidateId: string) => {
  const response = await api.get(`${Attendance_API}/candidate/${candidateId}`);
  return response.data;
};

// Get Attendance
export const getAttendance = async (page?: number, limit?: number) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page.toString());
  if (limit) params.append('limit', limit.toString());
  const queryString = params.toString();
  const url = `${Attendance_API}${queryString ? `?${queryString}` : ''}`;
  const response = await api.get(url);
  return response.data;
};

// Recording API functions
// Get recording status
export const getRecordingStatus = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/recording/status`);
  return response.data;
};

// Start recording
export const startRecording = async (meetingId: string, options?: {
  format?: 'mp4' | 'webm' | 'm3u8';
  resolution?: string;
  fps?: number;
  bitrate?: number;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/start`, options || {});
  return response.data;
};

// Stop recording
export const stopRecording = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/stop`);
  return response.data;
};

// Get recording download URL
export const getRecordingDownloadUrl = async (meetingId: string) => {
  const response = await api.get(`${Meeting_API}/${meetingId}/recording/download`);
  return response.data;
};

// Retry S3 upload
export const retryRecordingUpload = async (meetingId: string) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/recording/retry-upload`);
  return response.data;
};

// Upload recording file
export const uploadRecordingFile = async (meetingId: string, file: File, onProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`${Meeting_API}/${meetingId}/recording/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return response.data;
};

// Transcription API functions
// Start transcription
export const startTranscription = async (meetingId: string, language: string = 'en') => {
  const response = await api.post(Transcription_Start_API(meetingId), { language });
  return response.data;
};

// Get transcription status
export const getTranscriptionStatus = async (meetingId: string) => {
  const response = await api.get(Transcription_Status_API(meetingId));
  return response.data;
};

// Get transcript content
export const getTranscript = async (meetingId: string) => {
  const response = await api.get(Transcription_API(meetingId));
  return response.data;
};

// Update transcript (edit)
export const updateTranscript = async (meetingId: string, transcript: string) => {
  const response = await api.patch(Transcription_API(meetingId), { transcript });
  return response.data;
};

// Download transcript
export const downloadTranscript = async (meetingId: string, format: string = 'txt') => {
  const response = await api.get(Transcription_Download_API(meetingId, format));
  return response.data;
};

// Share meeting invite via email
export const shareMeeting = async (meetingId: string, shareData: {
  emails: string[];
  message?: string;
}) => {
  const response = await api.post(`${Meeting_API}/${meetingId}/share`, shareData);
  return response.data;
};