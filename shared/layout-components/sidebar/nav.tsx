"use client";
import React from "react";

const ProfileGroupIcon = <i className="bx bx-group side-menu__icon"></i>;
const ProfileIcon = <i className="bx bx-user side-menu__icon"></i>;
const ShareIcon = <i className="bx bx-share side-menu__icon"></i>;

// Retrieve user role from localStorage safely
let userRole: string | null = null;
if (typeof window !== "undefined") {
  const userData = localStorage.getItem("user");
  if (userData) {
    const user = JSON.parse(userData);
    userRole = user.role;
  }
}

export const MenuItems: any = [
  {
    menutitle: "MAIN",
  },

  // Show only for admin
  ...(userRole === "admin"
    ? [
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
      ]
    : []),

  // Show only for normal user
  ...(userRole === "user"
    ? [
        {
          path: "/profile",
          title: "Profile",
          icon: ProfileIcon,
          type: "link",
          active: true,
          selected: true,
          dirchange: false,
        },
      ]
    : []),
];
