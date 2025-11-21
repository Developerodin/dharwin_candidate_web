const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crm-apis.dharwinbusinesssolutions.com/v1";
const AUTH_URL = `${BASE_API_URL}/auth`;
const CANDIDATES_URL = `${BASE_API_URL}/candidates`;
const DOCUMENTS_URL = `${BASE_API_URL}/upload/multiple`;
const MEETINGS_URL = `${BASE_API_URL}/meetings`;
const LOGS_URL = `${BASE_API_URL}/login-logs`;
const ATTENDANCE_URL = `${BASE_API_URL}/attendance`;
const PROJECTS_URL = `${BASE_API_URL}/projects`;
const TASKS_URL = `${BASE_API_URL}/tasks`;
const DASHBOARD_URL = `${BASE_API_URL}/dashboard`;

// Auth API
export const Login_User_API = `${AUTH_URL}/login`;
export const Logout_User_API = `${AUTH_URL}/logout`;
export const Register_User_API = `${AUTH_URL}/register`;
export const Onboard_Candidate_API = `${AUTH_URL}/send-candidate-invitation`;
export const Forgot_Password_API = `${AUTH_URL}/forgot-password`;
export const REGISTER_SUPERVISOR_API = `${AUTH_URL}/register-supervisor`;
export const REGISTER_RECRUITER_API = `${AUTH_URL}/register-recruiter`;

// Candidate API
export const Candidates_API = `${CANDIDATES_URL}`;

// Ducuments API
export const Documents_API = `${DOCUMENTS_URL}`;

// Export Candidates API
export const Export_Candidates_API = `${CANDIDATES_URL}/export`;

// Candidate SalarySlips API
export const Candidate_SalarySlips_API = `${CANDIDATES_URL}/salary-slips`;

// Verify Document API
export const Verify_Document_API = `${CANDIDATES_URL}/documents/verify`;

// fetch candidate documents
export const Fetch_Candidate_Documents_API = `${CANDIDATES_URL}/documents`;

// share candidate API
export const Share_Candidate_API = `${CANDIDATES_URL}/share`;

// meeting API
export const Meeting_API = `${MEETINGS_URL}`;

// join meeting API
export const Join_Meeting_API = `${MEETINGS_URL}`;

// logs API
export const Logs_API = `${LOGS_URL}`;

// attendance API
export const Attendance_API = `${ATTENDANCE_URL}`;

// Transcription API
export const Transcription_Start_API = (meetingId: string) => `${MEETINGS_URL}/${meetingId}/transcription/start`;
export const Transcription_Status_API = (meetingId: string) => `${MEETINGS_URL}/${meetingId}/transcription/status`;
export const Transcription_API = (meetingId: string) => `${MEETINGS_URL}/${meetingId}/transcription`;
export const Transcription_Download_API = (meetingId: string, format: string = 'txt') => `${MEETINGS_URL}/${meetingId}/transcription/download?format=${format}`;

// Chat API
export const Chat_History_API = (meetingId: string, limit?: number, before?: string) => {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  if (before) params.append('before', before);
  const query = params.toString();
  return `${MEETINGS_URL}/${meetingId}/chat/history${query ? `?${query}` : ''}`;
};
export const Chat_Message_API = (meetingId: string, messageId: string) => `${MEETINGS_URL}/${meetingId}/chat/messages/${messageId}`;



// Projects API
export const Projects_API = `${PROJECTS_URL}`;

// Tasks API
export const Tasks_API = `${TASKS_URL}`;

// Dashboard API
export const Dashboard_API = `${DASHBOARD_URL}`;