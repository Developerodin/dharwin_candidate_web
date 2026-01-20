// Navigation permissions utility functions

interface NavigationPermissions {
  [key: string]: boolean | NavigationPermissions;
}

// Route to navigation path mapping
const routeToNavigationMap: { [route: string]: string[] } = {
  "/dashboard": ["Dashboard"],
  "/candidates": ["ATS", "Candidates", "Candidates"],
  "/share-candidate-form": ["ATS", "Candidates", "Share Candidate Form"],
  "/track-attendance": ["ATS", "Candidates", "Track Attendance"],
  "/jobs/manage-jobs": ["ATS", "Jobs", "Manage Jobs"],
  "/generate-meeting-link": ["ATS", "Interviews", "Generate Meeting Link"],
  "/manage-meetings": ["ATS", "Interviews", "Manage Meetings"],
  "/projects/project-list": ["Project management", "Manage Projects"],
  "/projects/create-project": ["Project management", "Manage Projects"],
  "/projects/project-overview": ["Project management", "Manage Projects"],
  "/tasks/kanban-board": ["Project management", "Manage Tasks"],
  "/tasks/task-list": ["Project management", "Manage Tasks"],
  "/tasks/task-details": ["Project management", "Manage Tasks"],
  "/support-tickets": ["Support Tickets"],
  "/master/jobs/templates": ["Settings", "Master", "Jobs", "Manage Jobs Templates"],
  "/master/jobs/create-template": ["Settings", "Master", "Jobs", "Manage Jobs Templates"],
  "/master/attendance/week-off": ["Settings", "Master", "Attendance", "Manage Week Off"],
  "/master/attendance/holidays": ["Settings", "Master", "Attendance", "Holidays List"],
  "/master/attendance/assign-holidays": ["Settings", "Master", "Attendance", "Assign Holidays"],
  "/master/attendance/candidate-groups": ["Settings", "Master", "Attendance", "Candidate Groups"],
  "/master/attendance/manage-shift": ["Settings", "Master", "Attendance", "Manage Shifts"],
  "/master/attendance/assign-shift": ["Settings", "Master", "Attendance", "Assign Shift"],
  "/master/attendance/assign-leave": ["Settings", "Master", "Attendance", "Assign Leave"],
  "/master/attendance/leave-requests": ["Settings", "Master", "Attendance", "Leave Requests"],
  "/master/attendance/backdated-attendance-requests": ["Settings", "Master", "Attendance", "Backdated Attendance"],
  "/logs": ["Settings", "Logs", "Login Logs"],
  "/logs/recruiter-logs": ["Settings", "Logs", "Recruiter Logs"],
  "/rbac/roles": ["Settings", "RBAC", "Roles"],
  "/rbac/roles-permissions": ["Settings", "RBAC", "Manage Roles & Permissions"],
};

// Helper function to check if a navigation path is allowed (for leaf nodes - expects boolean true or object)
export const checkNavigationPermission = (
  navigation: NavigationPermissions | null | undefined,
  path: string[]
): boolean => {
  if (!navigation) return false;
  
  let current: any = navigation;
  
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    
    if (current[key] === undefined) {
      return false;
    }
    
    // If it's the last key, check if it's a boolean true or an object (object means section exists)
    if (i === path.length - 1) {
      const value = current[key];
      // If it's a boolean, return true only if it's true
      if (typeof value === 'boolean') {
        return value === true;
      }
      // If it's an object, it means the section exists (has children), so return true
      if (typeof value === 'object' && value !== null) {
        return true;
      }
      return false;
    }
    
    // If it's not the last key, it should be an object
    if (typeof current[key] !== 'object' || current[key] === null) {
      return false;
    }
    
    current = current[key];
  }
  
  return false;
};

// Helper function to check if a navigation object has at least one true value
const hasAnyTrueValue = (obj: any): boolean => {
  if (typeof obj === 'boolean') {
    return obj === true;
  }
  
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  // Check all values in the object
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'boolean' && value === true) {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        // Recursively check nested objects
        if (hasAnyTrueValue(value)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

// Helper function to check if a navigation section exists (for parent sections - expects object)
// Now also checks if the section has at least one true value in its nested structure
export const checkNavigationSectionExists = (
  navigation: NavigationPermissions | null | undefined,
  path: string[]
): boolean => {
  if (!navigation) return false;
  
  let current: any = navigation;
  
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    
    if (current[key] === undefined) {
      return false;
    }
    
    // If it's the last key, check if it exists and has at least one true value
    if (i === path.length - 1) {
      const value = current[key];
      
      // If it's a boolean, return true only if it's true
      if (typeof value === 'boolean') {
        return value === true;
      }
      
      // If it's an object, check if it has at least one true value in its nested structure
      if (typeof value === 'object' && value !== null) {
        return hasAnyTrueValue(value);
      }
      
      return false;
    }
    
    // If it's not the last key, it should be an object
    if (typeof current[key] !== 'object' || current[key] === null) {
      return false;
    }
    
    current = current[key];
  }
  
  return false;
};

// Check if a route is allowed based on navigation permissions
export const isRouteAllowed = (
  navigation: NavigationPermissions | null | undefined,
  route: string
): boolean => {
  if (!navigation) return false;
  
  // Normalize route (remove trailing slash)
  const normalizedRoute = route.endsWith('/') && route !== '/' ? route.slice(0, -1) : route;
  
  // Check exact match first
  if (routeToNavigationMap[normalizedRoute]) {
    return checkNavigationPermission(navigation, routeToNavigationMap[normalizedRoute]);
  }
  
  // Check for route prefixes (e.g., /candidates/edit should check /candidates)
  for (const [mappedRoute, navPath] of Object.entries(routeToNavigationMap)) {
    if (normalizedRoute.startsWith(mappedRoute + '/') || normalizedRoute === mappedRoute) {
      return checkNavigationPermission(navigation, navPath);
    }
  }
  
  // Special cases for dynamic routes
  if (normalizedRoute.startsWith('/candidates/')) {
    return checkNavigationPermission(navigation, ["ATS", "Candidates", "Candidates"]);
  }
  
  if (normalizedRoute.startsWith('/jobs/')) {
    return checkNavigationPermission(navigation, ["ATS", "Jobs", "Manage Jobs"]);
  }
  
  if (normalizedRoute.startsWith('/projects/')) {
    return checkNavigationPermission(navigation, ["Project management", "Manage Projects"]);
  }
  
  if (normalizedRoute.startsWith('/tasks/')) {
    return checkNavigationPermission(navigation, ["Project management", "Manage Tasks"]);
  }
  
  if (normalizedRoute.startsWith('/master/jobs/')) {
    return checkNavigationPermission(navigation, ["Settings", "Master", "Jobs", "Manage Jobs Templates"]);
  }
  
  if (normalizedRoute.startsWith('/master/attendance/')) {
    // Check specific attendance route
    if (normalizedRoute.includes('/week-off')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Manage Week Off"]);
    }
    if (normalizedRoute.includes('/holidays') && !normalizedRoute.includes('/assign-holidays')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Holidays List"]);
    }
    if (normalizedRoute.includes('/assign-holidays')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Holidays"]);
    }
    if (normalizedRoute.includes('/candidate-groups')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Candidate Groups"]);
    }
    if (normalizedRoute.includes('/manage-shift')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Manage Shifts"]);
    }
    if (normalizedRoute.includes('/assign-shift')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Shift"]);
    }
    if (normalizedRoute.includes('/assign-leave')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Leave"]);
    }
    if (normalizedRoute.includes('/leave-requests')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Leave Requests"]);
    }
    if (normalizedRoute.includes('/backdated-attendance')) {
      return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Backdated Attendance"]);
    }
    // Default to first attendance permission if route doesn't match
    return checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Manage Week Off"]);
  }
  
  if (normalizedRoute.startsWith('/logs/')) {
    return checkNavigationPermission(navigation, ["Settings", "Logs", "Recruiter Logs"]);
  }
  
  if (normalizedRoute.startsWith('/logs')) {
    return checkNavigationPermission(navigation, ["Settings", "Logs", "Login Logs"]);
  }
  
  if (normalizedRoute.startsWith('/rbac/roles') && normalizedRoute !== '/rbac/roles-permissions') {
    return checkNavigationPermission(navigation, ["Settings", "RBAC", "Roles"]);
  }
  
  if (normalizedRoute.startsWith('/rbac/roles-permissions')) {
    return checkNavigationPermission(navigation, ["Settings", "RBAC", "Manage Roles & Permissions"]);
  }
  
  // If route is not in the map and user is admin, allow by default (for backward compatibility)
  // But we should restrict this - only allow if navigation exists
  return false;
};

// Get navigation object from localStorage
export const getNavigationFromStorage = (): NavigationPermissions | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    
    const user = JSON.parse(userData);
    return user.navigation || null;
  } catch (error) {
    console.warn('Error parsing navigation from localStorage:', error);
    return null;
  }
};

// Helper function to check button/action permissions
// This checks if a specific button/action is enabled in the navigation structure
export const checkButtonPermission = (
  navigation: NavigationPermissions | null | undefined,
  path: string[]
): boolean => {
  if (!navigation) return false;
  
  let current: any = navigation;
  
  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    
    if (current[key] === undefined) {
      return false;
    }
    
    // If it's the last key, check if it's true
    if (i === path.length - 1) {
      return current[key] === true;
    }
    
    // If it's not the last key, it should be an object
    if (typeof current[key] !== 'object' || current[key] === null) {
      return false;
    }
    
    current = current[key];
  }
  
  return false;
};

// Button/Action permission paths based on the navigation structure
export const ButtonPermissions = {
  // Candidates page buttons
  CANDIDATES_EXPORT: ["ATS", "Candidates", "Candidates", "Export Candidates"],
  CANDIDATES_ADD: ["ATS", "Candidates", "Candidates", "Add Candidate"],
  CANDIDATES_VIEW_DETAILS: ["ATS", "Candidates", "Candidates", "Actions", "View Details"],
  CANDIDATES_EDIT: ["ATS", "Candidates", "Candidates", "Actions", "Edit Candidate"],
  CANDIDATES_VIEW_DOCUMENTS: ["ATS", "Candidates", "Candidates", "Actions", "View Documents"],
  CANDIDATES_UPLOAD_SALARY_SLIP: ["ATS", "Candidates", "Candidates", "Actions", "Upload Salary Slip"],
  CANDIDATES_SHARE: ["ATS", "Candidates", "Candidates", "Actions", "Share Candidate"],
  CANDIDATES_VIEW_ATTENDANCE: ["ATS", "Candidates", "Candidates", "Actions", "View Attendance"],
  CANDIDATES_ADD_NOTE: ["ATS", "Candidates", "Candidates", "Actions", "Add Note"],
  CANDIDATES_ADD_FEEDBACK: ["ATS", "Candidates", "Candidates", "Actions", "Add Feedback"],
  CANDIDATES_DELETE: ["ATS", "Candidates", "Candidates", "Actions", "Delete Candidate"],
  
  // Jobs page buttons
  JOBS_CREATE: ["ATS", "Jobs", "Manage Jobs", "Create Job"],
  JOBS_EXPORT_EXCEL: ["ATS", "Jobs", "Manage Jobs", "Export Excel"],
  JOBS_EDIT: ["ATS", "Jobs", "Manage Jobs", "Actions", "Edit Job"],
  JOBS_VIEW: ["ATS", "Jobs", "Manage Jobs", "Actions", "View Job"],
  JOBS_DELETE: ["ATS", "Jobs", "Manage Jobs", "Actions", "Delete Job"],
  
  // Projects page buttons
  PROJECTS_NEW: ["Project management", "Manage Projects", "New Project"],
  PROJECTS_VIEW: ["Project management", "Manage Projects", "View Project"],
  PROJECTS_EDIT: ["Project management", "Manage Projects", "Edit Project"],
  PROJECTS_DELETE: ["Project management", "Manage Projects", "Delete Project"],
  
  // Tasks page buttons
  TASKS_NEW_BOARD: ["Project management", "Manage Tasks", "New Board"],
  TASKS_ADD: ["Project management", "Manage Tasks", "Add Task"],
  TASKS_VIEW: ["Project management", "Manage Tasks", "View Task"],
  TASKS_EDIT: ["Project management", "Manage Tasks", "Edit Task"],
  TASKS_DELETE: ["Project management", "Manage Tasks", "Delete Task"],
  
  // Support Tickets page buttons
  TICKETS_CREATE: ["Support Tickets", "Create Ticket"],
  TICKETS_VIEW_DETAILS: ["Support Tickets", "Actions", "View Details"],
  TICKETS_DELETE: ["Support Tickets", "Actions", "Delete Ticket"],
  
  // Jobs Templates page buttons
  TEMPLATES_CREATE: ["Settings", "Master", "Jobs", "Manage Jobs Templates", "Create Template"],
  TEMPLATES_VIEW: ["Settings", "Master", "Jobs", "Manage Jobs Templates", "Actions", "View Template"],
  TEMPLATES_EDIT: ["Settings", "Master", "Jobs", "Manage Jobs Templates", "Actions", "Edit Template"],
  TEMPLATES_DELETE: ["Settings", "Master", "Jobs", "Manage Jobs Templates", "Actions", "Delete Template"],
};

// Convenience function to check button permission
export const canAccessButton = (
  buttonPath: string[],
  navigation?: NavigationPermissions | null
): boolean => {
  const nav = navigation !== undefined ? navigation : getNavigationFromStorage();
  return checkButtonPermission(nav, buttonPath);
};
