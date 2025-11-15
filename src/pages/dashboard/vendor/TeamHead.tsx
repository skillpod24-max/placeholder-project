import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamTaskSplitDialog } from "@/components/TeamTaskSplitDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Eye, Split } from "lucide-react";
import { DetailDialog } from "@/components/DetailDialog";

interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: string | null;
  assigned_at: string | null;
}

const TeamHeadDashboard = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [teamId, setTeamId] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchTeamHeadJobs();
    }
  }, [user]);

  const fetchTeamHeadJobs = async () => {
    if (!user) return;

    // Get worker record for current user
    const { data: workerData } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!workerData) return;

    // Get teams where this worker is team head
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id")
      .eq("team_head_id", workerData.id);

    if (!teamsData || teamsData.length === 0) return;

    const teamIds = teamsData.map((t) => t.id);
    setTeamId(teamIds[0]); // Use first team for now

    // Get jobs assigned to these teams
    const { data: jobsData, error } = await supabase
      .from("jobs")
      .select("*")
      .in("assigned_to_team_id", teamIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching jobs",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (jobsData) {
      setJobs(jobsData);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Head Dashboard</h1>
        <p className="text-muted-foreground">Manage team assignments and split tasks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs Assigned to Your Team</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No jobs assigned yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status as any} />
                    </TableCell>
                    <TableCell>
                      {job.deadline ? new Date(job.deadline).toLocaleDateString() : "No deadline"}
                    </TableCell>
                    <TableCell>
                      {job.assigned_at ? new Date(job.assigned_at).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setDetailDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setSplitDialogOpen(true);
                          }}
                          title="Split Task"
                        >
                          <Split className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedJob && (
        <>
          <DetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            title="Job Details"
            data={selectedJob}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "text" },
              { key: "status", label: "Status", type: "status" },
              { key: "deadline", label: "Deadline", type: "date" },
              { key: "assigned_at", label: "Assigned At", type: "date" },
            ]}
          />
          <TeamTaskSplitDialog
            open={splitDialogOpen}
            onOpenChange={setSplitDialogOpen}
            jobId={selectedJob.id}
            teamId={teamId}
            userId={user?.id || ""}
          />
        </>
      )}
    </div>
  );
};

export default TeamHeadDashboard;
