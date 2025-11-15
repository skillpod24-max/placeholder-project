import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Clock,
  User,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: string;
  deadline: string;
  created_at: string;
  assigned_to_vendor_id: string;
  assigned_to_worker_id: string;
  assigned_to_team_id: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  notes: string;
  old_value: string;
  new_value: string;
  created_at: string;
  user_id: string;
  user_name?: string;
  user_role?: string;
  progress_percentage?: number;
}

interface AssignedEntity {
  id: string;
  name: string;
  email?: string;
  type: "vendor" | "worker" | "team";
  role?: string;
}

const CompanyJobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [assignedEntity, setAssignedEntity] = useState<AssignedEntity | null>(null);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (user && userRole?.company_id && jobId) {
      fetchJobDetails();
      fetchActivityLogs();
      subscribeToUpdates();
    }
  }, [user, userRole, jobId]);

  useEffect(() => {
    if (job?.deadline) {
      const deadline = new Date(job.deadline);
      const now = new Date();
      setIsOverdue(deadline < now && job.status !== "completed");
      
      // Update status if overdue
      if (deadline < now && job.status !== "completed" && job.status !== "overdue") {
        updateJobStatusToOverdue();
      }
    }
  }, [job]);

  const updateJobStatusToOverdue = async () => {
    if (!jobId) return;
    
    // Note: Overdue is tracked via the isOverdue state, not as a status value
    // The status remains as is, but UI shows overdue badge
  };

  const fetchJobDetails = async () => {
    if (!jobId || !userRole?.company_id) return;

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("company_id", userRole.company_id)
      .single();

    if (error) {
      toast({
        title: "Error fetching job details",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setJob(data);
      fetchAssignedEntity(data);
    }
  };

  const fetchAssignedEntity = async (jobData: Job) => {
    if (jobData.assigned_to_vendor_id) {
      const { data } = await supabase
        .from("vendors")
        .select("id, name, email")
        .eq("id", jobData.assigned_to_vendor_id)
        .single();

      if (data) {
        setAssignedEntity({
          id: data.id,
          name: data.name,
          email: data.email,
          type: "vendor",
        });
      }
    } else if (jobData.assigned_to_worker_id) {
      const { data } = await supabase
        .from("workers")
        .select("id, name, email, role")
        .eq("id", jobData.assigned_to_worker_id)
        .single();

      if (data) {
        setAssignedEntity({
          id: data.id,
          name: data.name,
          email: data.email,
          type: "worker",
          role: data.role,
        });
      }
    } else if (jobData.assigned_to_team_id) {
      const { data } = await supabase
        .from("teams")
        .select("id, name, team_head_id, workers(name, email)")
        .eq("id", jobData.assigned_to_team_id)
        .single();

      if (data) {
        const teamHeadData = data.workers as any;
        setAssignedEntity({
          id: data.id,
          name: data.name,
          email: teamHeadData?.email,
          type: "team",
          role: "Team Head: " + (teamHeadData?.name || "N/A"),
        });
      }
    }
  };

  const fetchActivityLogs = async () => {
    if (!jobId) return;

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("entity_type", "job")
      .eq("entity_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching activity logs:", error);
      return;
    }

    if (data) {
      // Fetch user names for each activity
      const logsWithUserInfo = await Promise.all(
        data.map(async (log) => {
          let userName = "System";
          let userRole = "";

          // Check if it's a vendor
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("name")
            .eq("user_id", log.user_id)
            .single();

          if (vendorData) {
            userName = vendorData.name;
            userRole = "Vendor";
          } else {
            // Check if it's a worker
            const { data: workerData } = await supabase
              .from("workers")
              .select("name, role")
              .eq("user_id", log.user_id)
              .single();

            if (workerData) {
              userName = workerData.name;
              userRole = workerData.role || "Worker";
            }
          }

          return {
            ...log,
            user_name: userName,
            user_role: userRole,
          };
        })
      );

      setActivityLogs(logsWithUserInfo);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("job-detail-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_logs",
          filter: `entity_id=eq.${jobId}`,
        },
        () => {
          fetchActivityLogs();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${jobId}`,
        },
        () => {
          fetchJobDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "status_change":
        return <Activity className="h-4 w-4 text-primary" />;
      case "status_request":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "status_response":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true }),
      absolute: date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Button>
        {isOverdue && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{job.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={job.status as any} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">Description</h3>
                <p className="text-sm">{job.description}</p>
              </div>

              {job.requirements && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground">Requirements</h3>
                  <p className="text-sm whitespace-pre-wrap">{job.requirements}</p>
                </div>
              )}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="text-sm font-medium">
                      {job.deadline
                        ? formatTime(job.deadline).absolute
                        : "No deadline set"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">
                      {formatTime(job.created_at).relative}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Activity Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Real-time Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {activityLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mb-4 opacity-50" />
                    <p>No activity logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLogs.map((log) => {
                      const time = formatTime(log.created_at);
                      return (
                        <div
                          key={log.id}
                          className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="mt-1">{getActivityIcon(log.action_type)}</div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">
                                    {log.user_name}
                                  </span>
                                  {log.user_role && (
                                    <Badge variant="outline" className="text-xs">
                                      {log.user_role}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{time.relative}</p>
                                <p className="text-xs text-muted-foreground">{time.absolute}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {log.action_type.replace("_", " ")}
                              </Badge>
                            </div>

                            {log.notes && (
                              <p className="text-sm bg-muted/50 p-3 rounded">{log.notes}</p>
                            )}

                            {log.progress_percentage !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Progress:</span>
                                <Badge variant="outline">{log.progress_percentage}%</Badge>
                              </div>
                            )}

                            {(log.old_value || log.new_value) && (
                              <div className="flex items-center gap-2 text-xs">
                                {log.old_value && (
                                  <Badge variant="outline" className="line-through opacity-60">
                                    {log.old_value}
                                  </Badge>
                                )}
                                <span className="text-muted-foreground">→</span>
                                {log.new_value && (
                                  <Badge variant="default">{log.new_value}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Entity Info */}
        <div className="space-y-6">
          {assignedEntity && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {assignedEntity.type === "vendor" && (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                  {assignedEntity.type === "worker" && (
                    <User className="h-5 w-5 text-primary" />
                  )}
                  {assignedEntity.type === "team" && (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                  Assigned To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Type</p>
                    <Badge variant="secondary" className="capitalize">
                      {assignedEntity.type}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Name</p>
                    <p className="text-sm font-semibold">{assignedEntity.name}</p>
                  </div>

                  {assignedEntity.email && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Email</p>
                      <p className="text-sm">{assignedEntity.email}</p>
                    </div>
                  )}

                  {assignedEntity.role && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Role</p>
                      <p className="text-sm">{assignedEntity.role}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Job Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Total Activities</span>
                <Badge variant="secondary">{activityLogs.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Status Requests</span>
                <Badge variant="secondary">
                  {activityLogs.filter((log) => log.action_type === "status_request").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Status Updates</span>
                <Badge variant="secondary">
                  {activityLogs.filter((log) => log.action_type === "status_change").length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyJobDetail;
