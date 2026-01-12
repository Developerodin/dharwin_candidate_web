"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isRouteAllowed } from "@/shared/lib/navigation-permissions";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = () => {
      const userData = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
      if (!userData || !token) {
        router.push("/");
        setChecking(false);
        return;
      }

      try {
        const user = JSON.parse(userData);

        // Role-based access control (for non-admin roles)
        if (user.role !== "admin") {
          if (pathname.startsWith("/candidates") && user.role !== "recruiter") {
            // Allow users to access edit form for their own profile
            if (pathname.startsWith("/candidates/edit")) {
              setAllowed(true);
              setChecking(false);
              return;
            }
            router.push("/profile");
            setChecking(false);
            return;
          }

          if (pathname.startsWith("/profile") && user.role !== "user") {
            router.push("/candidates");
            setChecking(false);
            return;
          }

          // Admin-only routes
          if (pathname.startsWith("/share-candidate-form") && user.role !== "admin") {
            router.push("/profile");
            setChecking(false);
            return;
          }
        }

        // For admin users, check navigation permissions
        if (user.role === "admin" && user.navigation) {
          const isAllowed = isRouteAllowed(user.navigation, pathname);
          
          if (!isAllowed) {
            // Show error page or redirect
            setAllowed(false);
            setChecking(false);
            return;
          }
        }

        // If no navigation config for admin, allow access (backward compatibility)
        // For non-admin roles, allow if they passed role checks above
        setAllowed(true);
        setChecking(false);
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/");
        setChecking(false);
      }
    };

    checkAccess();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
          <p className="text-gray-500 text-sm">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <i className="ri-error-warning-line text-6xl text-danger mb-4"></i>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-white/70 mb-4">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
