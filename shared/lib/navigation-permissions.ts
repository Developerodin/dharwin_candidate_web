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
  "/master/attendance/manage-shift": ["Settings", "Master", "Attendance", "Manage Shifts"],
  "/master/attendance/assign-shift": ["Settings", "Master", "Attendance", "Assign Shift"],
  "/master/attendance/assign-leave": ["Settings", "Master", "Attendance", "Assign Leave"],
  "/master/attendance/leave-requests": ["Settings", "Master", "Attendance", "Leave Requests"],
  "/master/attendance/backdated-attendance-requests": ["Settings", "Master", "Attendance", "Backdated Attendance"],
  "/logs": ["Settings", "Logs", "Login Logs"],
  "/logs/recruiter-logs": ["Settings", "Logs", "Recruiter Logs"],
  "/rbac/roles-permissions": ["Settings", "RBAC", "Manage Roles & Permissions"],
};

// Helper function to check if a navigation path is allowed (for leaf nodes - expects boolean true)
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
    
    // If it's the last key and it's a boolean, return its value
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

// Helper function to check if a navigation section exists (for parent sections - expects object)
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
    
    // If it's the last key, check if it exists (can be object or boolean true)
    if (i === path.length - 1) {
      // For parent sections, we check if it exists and is an object (has children)
      // or if it's boolean true (direct permission)
      return typeof current[key] === 'object' && current[key] !== null || current[key] === true;
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
