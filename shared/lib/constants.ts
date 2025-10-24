const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crm-apis.dharwinbusinesssolutions.com/v1";
const AUTH_URL = `${BASE_API_URL}/auth`;
const CANDIDATES_URL = `${BASE_API_URL}/candidates`;
const DOCUMENTS_URL = `${BASE_API_URL}/upload/multiple`;
const AGORA_URL = `${BASE_API_URL}/agora`;

// Auth API
export const Login_User_API = `${AUTH_URL}/login`;
export const Logout_User_API = `${AUTH_URL}/logout`;
export const Register_User_API = `${AUTH_URL}/register`;
export const Onboard_Candidate_API = `${AUTH_URL}/send-candidate-invitation`;
export const Forgot_Password_API = `${AUTH_URL}/forgot-password`;

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

// Agora Token API
export const Agora_Token_API = `${AGORA_URL}/token`;

// Agora Token API
export const Agora_Tokens_API = `${AGORA_URL}/tokens`;

// Agora Config API
export const Agora_Config_API = `${AGORA_URL}/config`;