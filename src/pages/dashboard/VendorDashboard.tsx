import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CompanySwitcher } from "@/components/CompanySwitcher";

interface VendorInfo {
  name: string;
  email: string;
  company_name: string;
}

const VendorDashboard = () => {
  const { user, userRole } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string>("");
  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null);
  const [stats, setStats] = useState({
    assignedJobs: 0,
    myWorkers: 0,
    myTeams: 0,
    activeJobs: 0,
    completedJobs: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    recentActivities: 0,
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      setCurrentCompanyId(userRole.company_id);
      fetchVendorId(userRole.company_id);
    }
  }, [user, userRole]);

  useEffect(() => {
    if (vendorId && currentCompanyId) {
      fetchStats();
      
      // Real-time subscription
      const channel = supabase
        .channel("vendor-dashboard-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
          },
          () => {
            fetchStats();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "job_tasks",
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [vendorId, currentCompanyId]);

  const fetchVendorId = async (companyId: string) => {
    if (!user) return;

    const { data } = await supabase
      .from("vendors")
      .select("id, name, email")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (data) {
      setVendorId(data.id);
      
      // Get company name
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      setVendorInfo({
        name: data.name,
        email: data.email,
        company_name: companyData?.name || "",
      });
    }
  };

  const fetchStats = async () => {
    if (!vendorId || !currentCompanyId) return;

    const now = new Date().toISOString();

    const [
      jobsRes,
      workersRes,
      teamsRes,
      activeJobsRes,
      completedJobsRes,
      pendingTasksRes,
      completedTasksRes,
      overdueTasksRes,
      recentActivitiesRes,
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("assigned_to_vendor_id", vendorId)
        .eq("company_id", currentCompanyId),
      supabase
        .from("workers")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendorId)
        .eq("company_id", currentCompanyId),
      supabase
        .from("teams")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendorId)
        .eq("company_id", currentCompanyId),
      supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("assigned_to_vendor_id", vendorId)
        .eq("company_id", currentCompanyId)
        .in("status", ["assigned", "in_progress"]),
      supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("assigned_to_vendor_id", vendorId)
        .eq("company_id", currentCompanyId)
        .eq("status", "completed"),
      supabase
        .from("job_tasks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendorId)
        .in("status", ["pending", "in_progress"]),
      supabase
        .from("job_tasks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendorId)
        .eq("status", "completed"),
      supabase
        .from("job_tasks")
        .select("*", { count: "exact" })
        .eq("vendor_id", vendorId)
        .lt("deadline", now)
        .neq("status", "completed"),
      supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    setStats({
      assignedJobs: jobsRes.count || 0,
      myWorkers: workersRes.count || 0,
      myTeams: teamsRes.count || 0,
      activeJobs: activeJobsRes.count || 0,
      completedJobs: completedJobsRes.count || 0,
      pendingTasks: pendingTasksRes.count || 0,
      completedTasks: completedTasksRes.count || 0,
      overdueTasks: overdueTasksRes.count || 0,
      recentActivities: recentActivitiesRes.count || 0,
    });
  };

  const handleCompanyChange = async (newCompanyId: string) => {
    setCurrentCompanyId(newCompanyId);
    fetchVendorId(newCompanyId);
  };

  return (
    <div className="space-y-6">
      {vendorId && currentCompanyId && (
        <CompanySwitcher
          vendorId={vendorId}
          currentCompanyId={currentCompanyId}
          onCompanyChange={handleCompanyChange}
        />
      )}
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendor Dashboard</h1>
        <p className="text-muted-foreground">Manage your jobs and workers</p>
      </div>

      {vendorInfo && (
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Name</p>
                <p className="text-sm font-semibold">{vendorInfo.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Email</p>
                <p className="text-sm font-semibold">{vendorInfo.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Working with</p>
                <p className="text-sm font-semibold">{vendorInfo.company_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.assignedJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeJobs} active, {stats.completedJobs} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Workers</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.myWorkers}</div>
            <p className="text-xs text-muted-foreground mt-1">Active workforce</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Teams</CardTitle>
            <Users className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.myTeams}</div>
            <p className="text-xs text-muted-foreground mt-1">Active teams</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.overdueTasks > 0 && `${stats.overdueTasks} overdue`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Clock className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueTasks}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivities}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate to Workers or Jobs sections to manage your operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorDashboard;
