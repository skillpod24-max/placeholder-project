import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  description: string;
  status: "created" | "assigned" | "in_progress" | "completed";
  created_at: string;
}

const WorkerJobs = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchJobs();

      // Real-time subscription
      const channel = supabase
        .channel("worker-jobs-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
          },
          () => {
            fetchJobs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole]);

  const fetchJobs = async () => {
    if (!user || !userRole?.company_id) return;

    // Get worker ID
    const { data: workerData } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!workerData) return;

    // Fetch jobs
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .eq("assigned_to_worker_id", workerData.id)
      .order("created_at", { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
    }
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
    await supabase.from("job_activities").insert({
      job_id: jobId,
      user_id: user?.id,
      activity_type: "status_change",
      description: `Status changed to ${newStatus}`,
      new_status: newStatus,
    });

    toast({
      title: "Job updated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
        <p className="text-muted-foreground">View and update your assigned jobs</p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">No jobs assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                    <div className="pt-2 flex items-center gap-3">
                      <StatusBadge status={job.status} />
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(job.created_at).toLocaleDateString()}
                      </span>
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
    </div>
  );
};

export default WorkerJobs;
