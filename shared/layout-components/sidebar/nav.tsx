"use client";
import React, { useState, useEffect } from "react";

const ProfileGroupIcon = <i className="bx bx-group side-menu__icon"></i>;
const ProfileIcon = <i className="bx bx-user side-menu__icon"></i>;
const ShareIcon = <i className="bx bx-share side-menu__icon"></i>;
const TestIcon = <i className="bx bx-right-arrow-alt side-menu__icon"></i>;

// Custom hook to get dynamic menu items based on user role
export const useMenuItems = () => {
  const [menuItems, setMenuItems] = useState<any[]>([]);

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

      const items: any[] = [
        {
          menutitle: "MAIN",
        },
      ];

      // Show only for admin
      if (userRole === "admin") {
        items.push(
          {
            path: "/candidates",
            title: "Candidates",
            icon: ProfileGroupIcon,
            type: "link",
            active: true,
            selected: true,
            dirchange: false,
          },
          {
            path: "/share-candidate-form",
            title: "Share Candidate Form",
            icon: ShareIcon,
            type: "link",
            active: true,
            selected: true,
            dirchange: false,
          },
          {
            path: "/agora",
            title: "Agora API Test",
            icon: TestIcon,
            type: "link",
            active: true,
            selected: true,
            dirchange: false,
          },
          {
            path: "/generate-meeting-link",
            title: "Generate Meeting Link",
            icon: TestIcon,
            type: "link",
            active: true,
            selected: true,
            dirchange: false,
          }
        );
      }

      // Show only for normal user
      if (userRole === "user") {
        items.push({
          path: "/profile",
          title: "Profile",
          icon: ProfileIcon,
          type: "link",
          active: true,
          selected: true,
          dirchange: false,
        });
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
  }, []);

  return menuItems;
};

// Legacy export for backward compatibility (will be empty initially)
export const MenuItems: any = [];
