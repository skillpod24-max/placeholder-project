import { Building2, Users, Briefcase, Settings, LogOut, FileText, Bell, UserCog, Home, Activity, CreditCard, Package } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";

interface AppSidebarProps {
  role: "company" | "vendor" | "worker";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Logged out successfully",
    });
  };

  const companyItems = [
    { title: "Dashboard", url: "/dashboard/company", icon: Home },
    { title: "Vendors", url: "/dashboard/company/vendors", icon: Users },
    { title: "Workers", url: "/dashboard/company/workers", icon: Users },
    { title: "Jobs", url: "/dashboard/company/jobs", icon: Briefcase },
    { title: "Teams", url: "/dashboard/company/teams", icon: Users },
    { title: "Resources", url: "/dashboard/company/resources", icon: Package },
    { title: "Billing", url: "/dashboard/company/billing", icon: CreditCard },
    { title: "Status Updates", url: "/dashboard/status-updates", icon: Activity },
    { title: "Settings", url: "/dashboard/settings", icon: Settings },
  ];

  const vendorItems = [
    { title: "Dashboard", url: "/dashboard/vendor", icon: Building2 },
    { title: "My Workers", url: "/dashboard/vendor/workers", icon: Users },
    { title: "Jobs", url: "/dashboard/vendor/jobs", icon: Briefcase },
    { title: "Teams", url: "/dashboard/vendor/teams", icon: Users },
    { title: "Status Updates", url: "/dashboard/status-updates", icon: Bell },
  ];

  const workerItems = [
    { title: "Dashboard", url: "/dashboard/worker", icon: Building2 },
    { title: "My Jobs", url: "/dashboard/worker/jobs", icon: Briefcase },
    { title: "My Tasks", url: "/dashboard/worker/tasks", icon: Briefcase },
    { title: "Team Head", url: "/dashboard/worker/team-head", icon: UserCog },
    { title: "Status Updates", url: "/dashboard/status-updates", icon: Bell },
  ];

  const items = role === "company" ? companyItems : role === "vendor" ? vendorItems : workerItems;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sidebar-foreground font-bold text-lg">JobSync</span>
          <NotificationBell />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/dashboard/settings"
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
