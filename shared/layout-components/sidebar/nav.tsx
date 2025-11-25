"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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
      
      if (typeof window !== "undefined") {
        const userData = localStorage.getItem("user");
        if (userData) {
          try {
            const user = JSON.parse(userData);
            userRole = user.role;
          } catch (error) {
            console.warn('Error parsing user data from localStorage:', error);
            userRole = null;
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

      // show admin and user
      if (userRole === "admin" || userRole === "user") {
        items.push(
          {
            path: "/dashboard",
            title: "Dashboard",
            icon: DashboardIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/dashboard", pathname ?? ""),
            dirchange: false,
          }
        );
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

        items.push(
          {
            icon: JobIcon,
            title: "ATS",
            type: "sub",
            active: isJobsSectionActive,
            selected: isJobsSectionActive,
            children: [
              {
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
                  {
                    path: "/jobs/create-jobs",
                    title: "Create Jobs",
                    type: "link",
                    active: true,
                    selected: isRouteMatch("/jobs/create-jobs", pathname ?? ""),
                    dirchange: false,
                  },
                ],
              },
            ],
          },
          {
            path: "/candidates",
            title: "Candidates",
            icon: ProfileGroupIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/candidates", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/share-candidate-form",
            title: "Share Candidate Form",
            icon: ShareIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/share-candidate-form", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/track-attendance",
            title: "Track Attendance",
            icon: AttendanceIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/track-attendance", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/generate-meeting-link",
            title: "Generate Meeting Link",
            icon: TestIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/generate-meeting-link", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/manage-meetings",
            title: "Manage Meetings",
            icon: CalendarIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/manage-meetings", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/projects/project-list",
            title: "Manage Projects",
            icon: ProjectIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/projects/project-list", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/tasks/kanban-board",
            title: "Manage Tasks",
            icon: TaskIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/tasks/kanban-board", pathname ?? ""),
            dirchange: false,
          },
          {
            path: "/logs",
            title: "Logs",
            icon: LogIcon,
            type: "link",
            active: true,
            selected: isRouteMatch("/logs", pathname ?? ""),
            dirchange: false,
          },
        );
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
        }
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
