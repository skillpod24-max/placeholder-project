import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useDeadlineNotifications } from "@/hooks/useDeadlineNotifications";

const DashboardLayout = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  // Enable deadline notifications
  useDeadlineNotifications();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (userRole) {
        // Redirect to correct dashboard based on role
        const currentPath = window.location.pathname;
        if (currentPath === "/dashboard" || currentPath === "/") {
          navigate(`/dashboard/${userRole.role}`);
        }
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userRole) {
    return null;
  }

  return (
    <SidebarProvider>
      <Toaster />
      <div className="min-h-screen flex w-full">
        <AppSidebar role={userRole.role} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
