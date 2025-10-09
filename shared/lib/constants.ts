const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://crm-apis.dharwinbusinesssolutions.com/v1";
const AUTH_URL = `${BASE_API_URL}/auth`;
const CANDIDATES_URL = `${BASE_API_URL}/candidates`;

// Auth API
export const Login_User_API = `${AUTH_URL}/login`;
export const Logout_User_API = `${AUTH_URL}/logout`;
export const Register_User_API = `${AUTH_URL}/register`;
export const Onboard_Candidate_API = `${AUTH_URL}/send-candidate-invitation`;

// Candidate API
export const Candidates_API = `${CANDIDATES_URL}`;