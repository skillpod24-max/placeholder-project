import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface Job {
  id: string;
  title: string;
  description: string;
  status: "created" | "assigned" | "in_progress" | "completed";
  created_at: string;
}

interface WorkerInfo {
  name: string;
  role: string;
  team_role: string;
  company_name: string;
  vendor_name?: string;
  team_name?: string;
  team_head_name?: string;
}

const WorkerDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    recentActivities: 0,
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchWorkerInfo();
      fetchWorkerJobs();
      
      // Real-time subscription
      const channel = supabase
        .channel("worker-dashboard-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
          },
          () => {
            fetchWorkerJobs();
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
            fetchWorkerJobs();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_tasks",
          },
          () => {
            fetchWorkerJobs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole]);

  const fetchWorkerInfo = async () => {
    if (!user || !userRole?.company_id) return;

    const { data: workerData } = await supabase
      .from("workers")
      .select("id, name, role, team_role, vendor_id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!workerData) return;

    // Get company name
    const { data: companyData } = await supabase
      .from("companies")
      .select("name")
      .eq("id", userRole.company_id)
      .single();

    let vendorName = "";
    let teamName = "";
    let teamHeadName = "";

    // Get vendor info if exists
    if (workerData.vendor_id) {
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("name")
        .eq("id", workerData.vendor_id)
        .single();
      if (vendorData) vendorName = vendorData.name;
    }

    // Get team info
    const { data: teamMemberData } = await supabase
      .from("team_members")
      .select("teams(id, name, team_head_id, workers(name))")
      .eq("worker_id", workerData.id)
      .single();

    if (teamMemberData?.teams) {
      const team = teamMemberData.teams as any;
      teamName = team.name;
      if (team.workers) {
        teamHeadName = team.workers.name;
      }
    }

    setWorkerInfo({
      name: workerData.name,
      role: workerData.role || "Worker",
      team_role: workerData.team_role || "Member",
      company_name: companyData?.name || "",
      vendor_name: vendorName,
      team_name: teamName,
      team_head_name: teamHeadName,
    });
  };

  const fetchWorkerJobs = async () => {
    if (!user || !userRole?.company_id) return;

    // Get worker ID
    const { data: workerData } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!workerData) return;
    setWorkerId(workerData.id);

    // Fetch jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .eq("assigned_to_worker_id", workerData.id)
      .order("created_at", { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
    }

    // Fetch tasks
    const now = new Date().toISOString();
    
    const { data: tasksData } = await supabase
      .from("job_tasks")
      .select("status, deadline")
      .eq("assigned_to_worker_id", workerData.id);

    const teamTasksData = await supabase
      .from("team_tasks")
      .select("status, deadline")
      .eq("assigned_to_worker_id", workerData.id);

    const allTasks = [...(tasksData || []), ...(teamTasksData.data || [])];

    const recentActivitiesRes = await supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    setStats({
      totalJobs: jobsData?.length || 0,
      activeJobs: jobsData?.filter((j) => j.status === "in_progress" || j.status === "assigned").length || 0,
      completedJobs: jobsData?.filter((j) => j.status === "completed").length || 0,
      totalTasks: allTasks.length,
      activeTasks: allTasks.filter((t) => t.status === "in_progress" || t.status === "pending").length,
      completedTasks: allTasks.filter((t) => t.status === "completed").length,
      overdueTasks: allTasks.filter((t) => t.deadline && new Date(t.deadline) < new Date(now) && t.status !== "completed").length,
      recentActivities: recentActivitiesRes.count || 0,
    });
  };

  const updateJobStatus = async (jobId: string, newStatus: "in_progress" | "completed") => {
    const { error } = await supabase
      .from("jobs")
      .update({ status: newStatus })
      .eq("id", jobId);

    if (error) {
      toast({
        title: "Error updating job",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Create activity log
    await supabase.from("activity_logs").insert({
      entity_type: "job",
      entity_id: jobId,
      user_id: user?.id || "",
      action_type: "status_change",
      old_value: newStatus === "in_progress" ? "assigned" : "in_progress",
      new_value: newStatus,
      notes: `Status updated by worker`,
    });

    toast({
      title: "Job updated successfully",
    });

    fetchWorkerJobs();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Worker Dashboard</h1>
        <p className="text-muted-foreground">View and manage your assigned jobs</p>
      </div>

      {workerInfo && (
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Name</p>
                <p className="text-sm font-semibold">{workerInfo.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Role</p>
                <p className="text-sm font-semibold">{workerInfo.role}</p>
              </div>
              {workerInfo.team_role && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Team Role</p>
                  <p className="text-sm font-semibold">{workerInfo.team_role}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Company</p>
                <p className="text-sm font-semibold">{workerInfo.company_name}</p>
              </div>
              {workerInfo.vendor_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Vendor</p>
                  <p className="text-sm font-semibold">{workerInfo.vendor_name}</p>
                </div>
              )}
              {workerInfo.team_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Team</p>
                  <p className="text-sm font-semibold">{workerInfo.team_name}</p>
                </div>
              )}
              {workerInfo.team_head_name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Team Head</p>
                  <p className="text-sm font-semibold">{workerInfo.team_head_name}</p>
                </div>
              )}
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
            <div className="text-3xl font-bold text-primary">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeJobs} active, {stats.completedJobs} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Clock className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeTasks} active, {stats.completedTasks} completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Clock className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{stats.recentActivities}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No jobs assigned yet</p>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-semibold">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.description}</p>
                        <div className="pt-2">
                          <StatusBadge status={job.status} />
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {job.status === "assigned" && (
                          <Button
                            size="sm"
                            onClick={() => updateJobStatus(job.id, "in_progress")}
                          >
                            Start Job
                          </Button>
                        )}
                        {job.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => updateJobStatus(job.id, "completed")}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerDashboard;
