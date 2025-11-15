import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Eye, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DetailDialog } from "@/components/DetailDialog";
import { StatusRequestDialog } from "@/components/StatusRequestDialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Job {
  id: string;
  title: string;
  description: string;
  status: "draft" | "created" | "pending" | "assigned" | "in_progress" | "completed" | "on_hold" | "cancelled";
  assigned_to_vendor_id: string | null;
  assigned_to_worker_id: string | null;
  assigned_to_team_id?: string | null;
  deadline?: string | null;
  assigned_at?: string | null;
  created_at: string;
  updated_at?: string;
}

interface Vendor {
  id: string;
  name: string;
}

interface Worker {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

const CompanyJobs = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statusRequestOpen, setStatusRequestOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [newJob, setNewJob] = useState({
    title: "",
    description: "",
    requirements: "",
    deadline: "",
    assignToType: "team" as "vendor" | "worker" | "team",
    assigned_to_vendor_id: "",
    assigned_to_worker_id: "",
    assigned_to_team_id: "",
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchJobs();
      fetchVendors();
      fetchWorkers();
      fetchTeams();
      
      // Real-time subscription
      const channel = supabase
        .channel("jobs-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
            filter: `company_id=eq.${userRole.company_id}`,
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
  }, [userRole]);

  const fetchJobs = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", userRole.company_id)
      .order("created_at", { ascending: false });

    if (data) {
      setJobs(data);
    }
  };

  const fetchVendors = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", userRole.company_id);

    if (data) {
      setVendors(data);
    }
  };

  const fetchWorkers = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("workers")
      .select("id, name")
      .eq("company_id", userRole.company_id);

    if (data) {
      setWorkers(data);
    }
  };

  const fetchTeams = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("teams")
      .select("id, name")
      .eq("company_id", userRole.company_id)
      .is("vendor_id", null);

    if (data) {
      setTeams(data);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const assignedId = newJob.assigned_to_vendor_id || newJob.assigned_to_worker_id || newJob.assigned_to_team_id;
      
      const jobData: any = {
        company_id: userRole?.company_id,
        title: newJob.title,
        description: newJob.description,
        requirements: newJob.requirements,
        deadline: newJob.deadline || null,
        created_by: user?.id,
        assigned_by: user?.id,
        assigned_at: assignedId ? new Date().toISOString() : null,
        status: assignedId ? "assigned" : "created",
        assigned_to_vendor_id: newJob.assigned_to_vendor_id || null,
        assigned_to_worker_id: newJob.assigned_to_worker_id || null,
        assigned_to_team_id: newJob.assigned_to_team_id || null,
      };

      const { data: createdJob, error } = await supabase.from("jobs").insert(jobData).select().single();

      if (error) throw error;

      // If assigned to team, notify team head
      if (newJob.assigned_to_team_id) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("team_head_id, team_head:workers!teams_team_head_id_fkey(user_id)")
          .eq("id", newJob.assigned_to_team_id)
          .single();

        if (teamData?.team_head_id && (teamData.team_head as any)?.user_id) {
          await supabase.from("activity_logs").insert({
            entity_type: "job",
            entity_id: createdJob.id,
            user_id: user?.id || "",
            recipient_id: (teamData.team_head as any).user_id,
            action_type: "assignment",
            notification_type: "job_assigned_to_team",
            notes: `New job "${newJob.title}" assigned to your team`,
          });
        }
      }

      // If assigned to vendor or worker, notify them
      if (newJob.assigned_to_vendor_id) {
        const { data: vendorData } = await supabase
          .from("vendors")
          .select("user_id")
          .eq("id", newJob.assigned_to_vendor_id)
          .single();

        if (vendorData?.user_id) {
          await supabase.from("activity_logs").insert({
            entity_type: "job",
            entity_id: createdJob.id,
            user_id: user?.id || "",
            recipient_id: vendorData.user_id,
            action_type: "assignment",
            notification_type: "job_assigned",
            notes: `New job "${newJob.title}" assigned to you`,
          });
        }
      }

      if (newJob.assigned_to_worker_id) {
        const { data: workerData } = await supabase
          .from("workers")
          .select("user_id")
          .eq("id", newJob.assigned_to_worker_id)
          .single();

        if (workerData?.user_id) {
          await supabase.from("activity_logs").insert({
            entity_type: "job",
            entity_id: createdJob.id,
            user_id: user?.id || "",
            recipient_id: workerData.user_id,
            action_type: "assignment",
            notification_type: "job_assigned",
            notes: `New job "${newJob.title}" assigned to you`,
          });
        }
      }

      toast({
        title: "Job created successfully",
        description: assignedId ? "Notification sent to assignee" : "",
      });

      setDialogOpen(false);
      setNewJob({ title: "", description: "", requirements: "", deadline: "", assignToType: "team", assigned_to_vendor_id: "", assigned_to_worker_id: "", assigned_to_team_id: "" });
      fetchJobs();
    } catch (error: any) {
      toast({
        title: "Error creating job",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);

    if (error) {
      toast({
        title: "Error deleting job",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Job deleted successfully" });
      fetchJobs();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Create and manage job assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>Create and assign a new job</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newJob.description}
                    onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={newJob.requirements}
                    onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={newJob.deadline}
                    onChange={(e) => setNewJob({ ...newJob, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignToType">Assign To</Label>
                  <Select
                    value={newJob.assignToType}
                    onValueChange={(value: "vendor" | "worker" | "team") =>
                      setNewJob({ ...newJob, assignToType: value, assigned_to_vendor_id: "", assigned_to_worker_id: "", assigned_to_team_id: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignToId">
                    {newJob.assignToType === "vendor" ? "Select Vendor" : newJob.assignToType === "worker" ? "Select Worker" : "Select Team"}
                  </Label>
                  <Select
                    value={
                      newJob.assignToType === "vendor" ? newJob.assigned_to_vendor_id :
                      newJob.assignToType === "worker" ? newJob.assigned_to_worker_id :
                      newJob.assigned_to_team_id
                    }
                    onValueChange={(value) => {
                      if (newJob.assignToType === "vendor") {
                        setNewJob({ ...newJob, assigned_to_vendor_id: value, assigned_to_worker_id: "", assigned_to_team_id: "" });
                      } else if (newJob.assignToType === "worker") {
                        setNewJob({ ...newJob, assigned_to_worker_id: value, assigned_to_vendor_id: "", assigned_to_team_id: "" });
                      } else {
                        setNewJob({ ...newJob, assigned_to_team_id: value, assigned_to_vendor_id: "", assigned_to_worker_id: "" });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {newJob.assignToType === "vendor"
                        ? vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))
                        : newJob.assignToType === "worker"
                        ? workers.map((worker) => (
                            <SelectItem key={worker.id} value={worker.id}>
                              {worker.name}
                            </SelectItem>
                          ))
                        : teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Create Job
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No jobs yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/company/jobs/${job.id}`)}
                  >
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      {job.assigned_to_team_id ? "Team" : job.assigned_to_vendor_id ? "Vendor" : job.assigned_to_worker_id ? "Worker" : "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {job.deadline ? new Date(job.deadline).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }) : "No deadline"}
                    </TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJob(job);
                            setStatusRequestOpen(true);
                          }}
                          title="Request Status"
                        >
                          <MessageSquare className="h-4 w-4" />
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
        <StatusRequestDialog
          open={statusRequestOpen}
          onOpenChange={setStatusRequestOpen}
          entityId={selectedJob.id}
          entityType="job"
          userId={user?.id || ""}
        />
      )}
    </div>
  );
};

export default CompanyJobs;
