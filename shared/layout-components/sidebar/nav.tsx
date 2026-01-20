"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getNavigationFromStorage, isRouteAllowed, checkNavigationPermission, checkNavigationSectionExists } from "@/shared/lib/navigation-permissions";

const ProfileGroupIcon = <i className="bx bx-group side-menu__icon"></i>;
const ProfileIcon = <i className="bx bx-user side-menu__icon"></i>;
const ShareIcon = <i className="bx bx-share side-menu__icon"></i>;
const TestIcon = <i className="bx bx-right-arrow-alt side-menu__icon"></i>;
const CalendarIcon = <i className="bx bx-calendar side-menu__icon"></i>;
const LogIcon = <i className="bx bx-log-in side-menu__icon"></i>;
const AttendanceIcon = <i className="bx bx-calendar-check side-menu__icon"></i>;
const ProjectIcon = <i className="bx bx-folder-open side-menu__icon"></i>;
const TaskIcon = <i className="bx bx-task side-menu__icon"></i>;
const DashboardIcon = <i className="bx bx-home side-menu__icon"></i>;
const JobIcon = <i className="bx bx-briefcase side-menu__icon"></i>;
const ATSIcon = <i className="bx bx-group side-menu__icon"></i>;
const MasterIcon = <i className="bx bx-cog side-menu__icon"></i>;
const SupportTicketsIcon = <i className="bx bx-support side-menu__icon"></i>;
const LeaveIcon = <i className="bx bx-calendar-check side-menu__icon"></i>;

// Helper function to normalize paths (remove trailing slashes)
const normalizePath = (path: string): string => {
  if (!path) return '';
  return path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
};

// Helper function to check if a path matches the current route
const isRouteMatch = (menuPath: string, currentPath: string): boolean => {
  if (!menuPath || !currentPath) return false;
  
  // Normalize both paths (remove trailing slashes)
  const normalizedMenuPath = normalizePath(menuPath);
  const normalizedCurrentPath = normalizePath(currentPath);
  
  // Exact match
  if (normalizedMenuPath === normalizedCurrentPath) return true;
  
  // For project routes: /projects/project-list should match:
  // - /projects/project-list (exact)
  // - /projects/create-project
  // - /projects/project-overview
  // - /projects/project-overview/[id]
  // But NOT /projects alone
  if (normalizedMenuPath === '/projects/project-list' && normalizedCurrentPath.startsWith('/projects/')) {
    return true;
  }
  
  // For task routes: /tasks/task-list should match:
  // - /tasks/task-list (exact)
  // - /tasks/task-details
  // - /tasks/task-details/[id]
  // But NOT /tasks alone
  if (normalizedMenuPath === '/tasks/task-list' && normalizedCurrentPath.startsWith('/tasks/')) {
    return true;
  }
  
  // For other routes, check if current path starts with menu path followed by / or is exact match
  // This handles dynamic routes like /candidates/[id] matching /candidates
  if (normalizedCurrentPath.startsWith(normalizedMenuPath + '/')) {
    return true;
  }
  
  return false;
};

// Custom hook to get dynamic menu items based on user role
export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const updateMenuItems = () => {
      let userRole: string | null = null;
      let navigation: any = null;
      
      if (typeof window !== "undefined") {
        const userData = localStorage.getItem("user");
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userRole = user.role;
            navigation = user.navigation || null;
          } catch (error) {
            console.warn('Error parsing user data from localStorage:', error);
            userRole = null;
            navigation = null;
          }
        }
      }

      // Debug: log pathname for troubleshooting
      if (process.env.NODE_ENV === 'development') {
        console.log('Current pathname:', pathname);
      }

      const items: any[] = [
        {
          menutitle: "MAIN",
        },
      ];

      // show admin and user - check navigation permission
      if (userRole === "admin" || userRole === "user") {
        // For admin, check navigation permission; for user, always show dashboard
        if (userRole === "admin" && navigation) {
          if (checkNavigationPermission(navigation, ["Dashboard"])) {
            items.push(
              {
                path: "/dashboard",
                title: "Dashboard",
                icon: DashboardIcon,
                type: "link",
                active: true,
                selected: isRouteMatch("/dashboard", pathname ?? ""),
                dirchange: false,
              },
            );
          }
        } else if (userRole === "user") {
          // Regular users always see dashboard
          items.push(
            {
              path: "/dashboard",
              title: "Dashboard",
              icon: DashboardIcon,
              type: "link",
              active: true,
              selected: isRouteMatch("/dashboard", pathname ?? ""),
              dirchange: false,
            },
          );
        } else if (userRole === "admin" && !navigation) {
          // Admin without navigation config - show all (backward compatibility)
          items.push(
            {
              path: "/dashboard",
              title: "Dashboard",
              icon: DashboardIcon,
              type: "link",
              active: true,
              selected: isRouteMatch("/dashboard", pathname ?? ""),
              dirchange: false,
            },
          );
        }
      }

      // Show only for admin
      if (userRole === "admin") {
        const jobRoutes = [
          "/jobs/manage-jobs",
          "/jobs/create-jobs",
          "/jobs/update-jobs",
          "/jobs/update-jobs/",
        ];
        const isJobsSectionActive = jobRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        const candidateRoutes = [
          "/candidates",
          "/share-candidate-form",
          "/track-attendance",
          "/candidates/file-manager",
        ];
        const isCandidatesSectionActive = candidateRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        const interviewRoutes = [
          "/generate-meeting-link",
          "/manage-meetings",
        ];
        const isInterviewsSectionActive = interviewRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        const atsRoutes = [
          "/candidates",
          "/share-candidate-form",
          "/track-attendance",
          "/candidates/file-manager",
          "/jobs/manage-jobs",
          "/jobs/create-jobs",
          "/jobs/update-jobs",
          "/jobs/update-jobs/",
          "/generate-meeting-link",
          "/manage-meetings",
          "/recruiters",
          "/supervisors",
        ];
        const isATSSectionActive = atsRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        const projectManagementRoutes = [
          "/projects/project-list",
          "/projects/create-project",
          "/projects/project-overview",
          "/tasks/kanban-board",
          "/tasks/task-list",
          "/tasks/task-details",
        ];
        const isProjectManagementSectionActive = projectManagementRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        // Master -> Jobs routes
        const masterJobsRoutes = [
          "/master/jobs/templates",
          "/master/jobs/create-template",
        ];
        const isMasterJobsSectionActive = masterJobsRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        // Master -> Attendance routes
        const masterAttendanceRoutes = [
          "/master/attendance/week-off",
          "/master/attendance/holidays",
          "/master/attendance/assign-holidays",
          "/master/attendance/candidate-groups",
          "/master/attendance/manage-shift",
          "/master/attendance/assign-shift",
          "/master/attendance/assign-leave",
          "/master/attendance/leave-requests",
          "/master/attendance/backdated-attendance-requests",
        ];
        const isMasterAttendanceSectionActive = masterAttendanceRoutes.some(
          (route) => isRouteMatch(route, pathname ?? "")
        );

        // Logs routes (under Settings but outside Master)
        const logsRoutes = ["/logs", "/logs/recruiter-logs"];
        const isLogsSectionActive = logsRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        // RBAC routes (under Settings but outside Master)
        const rbacRoutes = ["/rbac/roles", "/rbac/roles-permissions"];
        const isRBACSectionActive = rbacRoutes.some((route) =>
          isRouteMatch(route, pathname ?? "")
        );

        // Master section is active if either Jobs or Attendance is active
        const isMasterSectionActive =
          isMasterJobsSectionActive || isMasterAttendanceSectionActive;

        // Settings section is active if any of Master (Jobs/Attendance), Logs, or RBAC is active
        const isSettingsSectionActive =
          isMasterSectionActive || isLogsSectionActive || isRBACSectionActive;

        // Build ATS children based on navigation permissions
        const atsChildren: any[] = [];
        
        // Candidates section
        if (!navigation || checkNavigationSectionExists(navigation, ["ATS", "Candidates"])) {
          const candidatesChildren: any[] = [];
          
          if (!navigation || checkNavigationPermission(navigation, ["ATS", "Candidates", "Candidates"])) {
            candidatesChildren.push({
              path: "/candidates",
              title: "Candidates",
              type: "link",
              active: true,
              selected: isRouteMatch("/candidates", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (!navigation || checkNavigationPermission(navigation, ["ATS", "Candidates", "Share Candidate Form"])) {
            candidatesChildren.push({
              path: "/share-candidate-form",
              title: "Share Candidate Form",
              type: "link",
              active: true,
              selected: isRouteMatch("/share-candidate-form", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (!navigation || checkNavigationPermission(navigation, ["ATS", "Candidates", "Track Attendance"])) {
            candidatesChildren.push({
              path: "/track-attendance",
              title: "Track Attendance",
              type: "link",
              active: true,
              selected: isRouteMatch("/track-attendance", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (candidatesChildren.length > 0) {
            atsChildren.push({
              title: "Candidates",
              type: "sub",
              active: isCandidatesSectionActive,
              selected: isCandidatesSectionActive,
              children: candidatesChildren,
            });
          }
        }
        
        // Jobs section
        if (!navigation || checkNavigationSectionExists(navigation, ["ATS", "Jobs"])) {
          // Check if "Manage Jobs" exists (it's now an object, not a boolean)
          if (!navigation || checkNavigationSectionExists(navigation, ["ATS", "Jobs", "Manage Jobs"])) {
            atsChildren.push({
              title: "Jobs",
              type: "sub",
              active: isJobsSectionActive,
              selected: isJobsSectionActive,
              children: [
                {
                  path: "/jobs/manage-jobs",
                  title: "Manage Jobs",
                  type: "link",
                  active: true,
                  selected: isRouteMatch("/jobs/manage-jobs", pathname ?? ""),
                  dirchange: false,
                },
              ],
            });
          }
        }
        
        // Interviews section
        if (!navigation || checkNavigationSectionExists(navigation, ["ATS", "Interviews"])) {
          const interviewChildren: any[] = [];
          
          if (!navigation || checkNavigationPermission(navigation, ["ATS", "Interviews", "Generate Meeting Link"])) {
            interviewChildren.push({
              path: "/generate-meeting-link",
              title: "Generate Meeting Link",
              type: "link",
              active: true,
              selected: isRouteMatch("/generate-meeting-link", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (!navigation || checkNavigationPermission(navigation, ["ATS", "Interviews", "Manage Meetings"])) {
            interviewChildren.push({
              path: "/manage-meetings",
              title: "Manage Meetings",
              type: "link",
              active: true,
              selected: isRouteMatch("/manage-meetings", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (interviewChildren.length > 0) {
            atsChildren.push({
              title: "Interviews",
              type: "sub",
              active: isInterviewsSectionActive,
              selected: isInterviewsSectionActive,
              children: interviewChildren,
            });
          }
        }
        
        // Only add ATS menu if it has children
        if (atsChildren.length > 0) {
          items.push({
            icon: JobIcon,
            title: "ATS",
            type: "sub",
            active: isATSSectionActive,
            selected: isATSSectionActive,
            children: atsChildren,
          });
        }
        
        // Project management section
        if (!navigation || checkNavigationSectionExists(navigation, ["Project management"])) {
          const projectChildren: any[] = [];
          
          // Check if "Manage Projects" exists (it's now an object, not a boolean)
          if (!navigation || checkNavigationSectionExists(navigation, ["Project management", "Manage Projects"])) {
            projectChildren.push({
              path: "/projects/project-list",
              title: "Manage Projects",
              type: "link",
              active: true,
              selected: isRouteMatch("/projects/project-list", pathname ?? ""),
              dirchange: false,
            });
          }
          
          // Check if "Manage Tasks" exists (it's now an object, not a boolean)
          if (!navigation || checkNavigationSectionExists(navigation, ["Project management", "Manage Tasks"])) {
            projectChildren.push({
              path: "/tasks/kanban-board",
              title: "Manage Tasks",
              type: "link",
              active: true,
              selected: isRouteMatch("/tasks/kanban-board", pathname ?? ""),
              dirchange: false,
            });
          }

          if (projectChildren.length > 0) {
            items.push({
              icon: ProjectIcon,
              title: "Project management",
              type: "sub",
              active: isProjectManagementSectionActive,
              selected: isProjectManagementSectionActive,
              children: projectChildren,
            });
          }
        }

        // Support Tickets
        // Check if "Support Tickets" exists (it's now an object, not a boolean)
        if (!navigation || checkNavigationSectionExists(navigation, ["Support Tickets"])) {
          items.push({
            path: "/support-tickets",
            title: "Support Tickets",
            icon: SupportTicketsIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/support-tickets", pathname ?? ""),
            dirchange: false,
          });
        }

        // Settings section - build based on navigation permissions
        const settingsChildren: any[] = [];

        // Master section
        if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "Master"])) {
          const masterChildren: any[] = [];
          
          // Master -> Jobs
          if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "Master", "Jobs"])) {
            // Check if "Manage Jobs Templates" exists (it's now an object, not a boolean)
            if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "Master", "Jobs", "Manage Jobs Templates"])) {
              masterChildren.push({
                title: "Jobs",
                type: "sub",
                active: isMasterJobsSectionActive,
                selected: isMasterJobsSectionActive,
                children: [
                  {
                    path: "/master/jobs/templates",
                    title: "Manage Jobs Templates",
                    type: "link",
                    active: true,
                    selected: isRouteMatch("/master/jobs/templates", pathname ?? ""),
                    dirchange: false,
                  },
                ],
              });
            }
          }
          
          // Master -> Attendance
          if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "Master", "Attendance"])) {
            const attendanceChildren: any[] = [];
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Manage Week Off"])) {
              attendanceChildren.push({
                path: "/master/attendance/week-off",
                title: "Manage Week Off",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/week-off", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Holidays List"])) {
              attendanceChildren.push({
                path: "/master/attendance/holidays",
                title: "Holidays List",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/holidays", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Holidays"])) {
              attendanceChildren.push({
                path: "/master/attendance/assign-holidays",
                title: "Assign Holidays",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/assign-holidays", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Candidate Groups"])) {
              attendanceChildren.push({
                path: "/master/attendance/candidate-groups",
                title: "Candidate Groups",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/candidate-groups", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Manage Shifts"])) {
              attendanceChildren.push({
                path: "/master/attendance/manage-shift",
                title: "Manage Shifts",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/manage-shift", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Shift"])) {
              attendanceChildren.push({
                path: "/master/attendance/assign-shift",
                title: "Assign Shift",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/assign-shift", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Assign Leave"])) {
              attendanceChildren.push({
                path: "/master/attendance/assign-leave",
                title: "Assign Leave",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/assign-leave", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Leave Requests"])) {
              attendanceChildren.push({
                path: "/master/attendance/leave-requests",
                title: "Leave Requests",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/leave-requests", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (!navigation || checkNavigationPermission(navigation, ["Settings", "Master", "Attendance", "Backdated Attendance"])) {
              attendanceChildren.push({
                path: "/master/attendance/backdated-attendance-requests",
                title: "Backdated Attendance",
                type: "link",
                active: true,
                selected: isRouteMatch("/master/attendance/backdated-attendance-requests", pathname ?? ""),
                dirchange: false,
              });
            }
            
            if (attendanceChildren.length > 0) {
              masterChildren.push({
                title: "Attendance",
                type: "sub",
                active: isMasterAttendanceSectionActive,
                selected: isMasterAttendanceSectionActive,
                children: attendanceChildren,
              });
            }
          }
          
          if (masterChildren.length > 0) {
            settingsChildren.push({
              title: "Master",
              type: "sub",
              active: isMasterSectionActive,
              selected: isMasterSectionActive,
              children: masterChildren,
            });
          }
        }
        
        // Logs section
        if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "Logs"])) {
          const logsChildren: any[] = [];
          
          if (!navigation || checkNavigationPermission(navigation, ["Settings", "Logs", "Login Logs"])) {
            logsChildren.push({
              path: "/logs",
              title: "Login Logs",
              type: "link",
              active: true,
              selected: isRouteMatch("/logs", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (!navigation || checkNavigationPermission(navigation, ["Settings", "Logs", "Recruiter Logs"])) {
            logsChildren.push({
              path: "/logs/recruiter-logs",
              title: "Recruiter Logs",
              type: "link",
              active: true,
              selected: isRouteMatch("/logs/recruiter-logs", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (logsChildren.length > 0) {
            settingsChildren.push({
              title: "Logs",
              type: "sub",
              active: isLogsSectionActive,
              selected: isLogsSectionActive,
              children: logsChildren,
            });
          }
        }
        
        // RBAC section
        if (!navigation || checkNavigationSectionExists(navigation, ["Settings", "RBAC"])) {
          const rbacChildren: any[] = [];
          
          if (!navigation || checkNavigationPermission(navigation, ["Settings", "RBAC", "Roles"])) {
            rbacChildren.push({
              path: "/rbac/roles",
              title: "Roles",
              type: "link",
              active: true,
              selected: isRouteMatch("/rbac/roles", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (!navigation || checkNavigationPermission(navigation, ["Settings", "RBAC", "Manage Roles & Permissions"])) {
            rbacChildren.push({
              path: "/rbac/roles-permissions",
              title: "Manage Roles & Permissions",
              type: "link",
              active: true,
              selected: isRouteMatch("/rbac/roles-permissions", pathname ?? ""),
              dirchange: false,
            });
          }
          
          if (rbacChildren.length > 0) {
            settingsChildren.push({
              title: "RBAC",
              type: "sub",
              active: isRBACSectionActive,
              selected: isRBACSectionActive,
              children: rbacChildren,
            });
          }
        }
        
        // Only add Settings menu if it has children
        if (settingsChildren.length > 0) {
          items.push({
            icon: MasterIcon,
            title: "Settings",
            type: "sub",
            active: isSettingsSectionActive,
            selected: isSettingsSectionActive,
            children: settingsChildren,
          });
        }
      }

      // Show only for normal user
      if (userRole === "user") {
        items.push(
          {
          path: "/profile",
          title: "Profile",
          icon: ProfileIcon,
          type: "link",
          active: true,
          selected: isRouteMatch("/profile", pathname ?? ""),
          dirchange: false,
        },
        {
          path: "/attendance",
          title: "Attendance",
          icon: AttendanceIcon,
          type: "link",
          active: true,
          selected: isRouteMatch("/attendance", pathname ?? ""),
          dirchange: false,
        },
        {
          path: "/backdated-attendance",
          title: "Backdated Attendance",
          icon: AttendanceIcon,
          type: "link",
          active: true,
          selected: isRouteMatch("/backdated-attendance", pathname ?? ""),
          dirchange: false,
        },
        {
          path: "/leaves",
          title: "Leaves",
          icon: LeaveIcon,
          type: "link",
          active: true,
          selected: isRouteMatch("/leaves", pathname ?? ""),
          dirchange: false,
        },
        {
          path: "/support-tickets",
          title: "Support Tickets",
          icon: SupportTicketsIcon,
          type: "link",
          active: true,
          selected: isRouteMatch("/support-tickets", pathname ?? ""),
          dirchange: false,
        },
        );
      }

      setMenuItems(items);
    };

    // Initial load
    updateMenuItems();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        updateMenuItems();
      }
    };

    // Listen for custom events (when user logs in/out in same tab)
    const handleUserChange = () => {
      updateMenuItems();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userChanged', handleUserChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userChanged', handleUserChange);
    };
  }, [pathname]); // Re-run when pathname changes

  return menuItems;
};

// Legacy export for backward compatibility (will be empty initially)
export const MenuItems: any = [];
