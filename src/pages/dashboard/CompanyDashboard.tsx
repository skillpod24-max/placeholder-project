import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, Building2, CheckCircle2, UsersIcon, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

const CompanyDashboard = () => {
  const { userRole } = useAuth();
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalVendors: 0,
    totalWorkers: 0,
    totalTeams: 0,
    activeJobs: 0,
    completedJobs: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    recentActivities: [] as any[],
    upcomingDeadlines: [] as any[],
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchStats();
      
      // Real-time updates
      const channel = supabase
        .channel("dashboard-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
            filter: `company_id=eq.${userRole.company_id}`,
          },
          () => fetchStats()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activity_logs",
          },
          () => fetchStats()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRole]);

  const fetchStats = async () => {
    if (!userRole?.company_id) return;

    const now = new Date().toISOString();
    
    const [
      jobsRes,
      vendorsRes,
      workersRes,
      teamsRes,
      activeJobsRes,
      completedJobsRes,
      pendingTasksRes,
      overdueTasksRes,
      activitiesRes,
      deadlinesRes,
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact" }).eq("company_id", userRole.company_id),
      supabase.from("vendors").select("*", { count: "exact" }).eq("company_id", userRole.company_id),
      supabase.from("workers").select("*", { count: "exact" }).eq("company_id", userRole.company_id),
      supabase.from("teams").select("*", { count: "exact" }).eq("company_id", userRole.company_id).is("vendor_id", null),
      supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("company_id", userRole.company_id)
        .in("status", ["assigned", "in_progress"]),
      supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("company_id", userRole.company_id)
        .eq("status", "completed"),
      supabase
        .from("job_tasks")
        .select("*, jobs!inner(company_id)", { count: "exact" })
        .eq("jobs.company_id", userRole.company_id)
        .eq("status", "pending"),
      supabase
        .from("job_tasks")
        .select("*, jobs!inner(company_id)", { count: "exact" })
        .eq("jobs.company_id", userRole.company_id)
        .lt("deadline", now)
        .neq("status", "completed"),
      supabase
        .from("activity_logs")
        .select("*")
        .or(`entity_id.in.(${(await supabase.from("jobs").select("id").eq("company_id", userRole.company_id)).data?.map(j => j.id).join(",") || ""})`)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("jobs")
        .select("id, title, deadline")
        .eq("company_id", userRole.company_id)
        .gte("deadline", now)
        .order("deadline", { ascending: true })
        .limit(5),
    ]);

    setStats({
      totalJobs: jobsRes.count || 0,
      totalVendors: vendorsRes.count || 0,
      totalWorkers: workersRes.count || 0,
      totalTeams: teamsRes.count || 0,
      activeJobs: activeJobsRes.count || 0,
      completedJobs: completedJobsRes.count || 0,
      pendingTasks: pendingTasksRes.count || 0,
      overdueTasks: overdueTasksRes.count || 0,
      recentActivities: activitiesRes.data || [],
      upcomingDeadlines: deadlinesRes.data || [],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
        <p className="text-muted-foreground">Real-time overview of your operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">{stats.activeJobs} active</Badge>
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendors}</div>
            <p className="text-xs text-muted-foreground mt-1">External partners</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workers</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total workforce</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <UsersIcon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
            <p className="text-xs text-muted-foreground mt-1">Organized groups</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.activeJobs}</div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">In progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completedJobs}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {stats.totalJobs > 0 
                ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}% rate`
                : "0% rate"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.pendingTasks}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.overdueTasks}</div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest updates across all jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm border-l-2 border-primary pl-3 py-1">
                    <div className="flex-1">
                      <p className="font-medium">{activity.action_type}</p>
                      <p className="text-muted-foreground text-xs">{activity.notes}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Jobs with approaching deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingDeadlines.map((job) => (
                  <div key={job.id} className="flex items-center justify-between text-sm border rounded-md p-3 hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{job.title}</p>
                      <p className="text-muted-foreground text-xs flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(job.deadline).toLocaleDateString()} at{" "}
                        {new Date(job.deadline).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Math.ceil((new Date(job.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyDashboard;
