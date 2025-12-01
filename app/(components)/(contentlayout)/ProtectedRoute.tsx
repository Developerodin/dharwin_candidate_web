"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!userData || !token) {
      router.push("/");
      return;
    }

    const user = JSON.parse(userData);

    // Role-based access control
    if (pathname.startsWith("/candidates") && user.role !== "admin" && user.role !== "recruiter") {
      // Allow users to access edit form for their own profile
      if (pathname.startsWith("/candidates/edit")) {
        // This will be handled by the edit form component itself
        setAllowed(true);
        return;
      }
      router.push("/profile");
      return;
    }

    if (pathname.startsWith("/profile") && user.role !== "user") {
      router.push("/candidates");
      return;
    }

    // Admin-only routes
    if (pathname.startsWith("/share-candidate-form") && user.role !== "admin") {
      router.push("/profile");
      return;
    }

    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) return null; // Prevent flashing content

  return <>{children}</>;
};

export default ProtectedRoute;
