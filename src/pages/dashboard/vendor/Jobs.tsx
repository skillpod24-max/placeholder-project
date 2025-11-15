import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus, ListTodo } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";

interface Job {
  id: string;
  title: string;
  description: string;
  status: "created" | "assigned" | "in_progress" | "completed";
  assigned_to_worker_id: string | null;
  created_at: string;
}

interface Worker {
  id: string;
  name: string;
}

const VendorJobs = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchVendorJobsAndWorkers();

      // Real-time subscription
      const channel = supabase
        .channel("vendor-jobs-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs",
          },
          () => {
            fetchVendorJobsAndWorkers();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole]);

  const fetchVendorJobsAndWorkers = async () => {
    if (!user || !userRole?.company_id) return;

    // Get vendor ID
    const { data: vendorData } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!vendorData) return;
    setVendorId(vendorData.id);

    // Fetch jobs assigned to this vendor
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("*")
      .eq("assigned_to_vendor_id", vendorData.id)
      .order("created_at", { ascending: false });

    if (jobsData) {
      setJobs(jobsData);
    }

    // Fetch vendor's workers
    const { data: workersData } = await supabase
      .from("workers")
      .select("id, name")
      .eq("vendor_id", vendorData.id);

    if (workersData) {
      setWorkers(workersData);
    }
  };

  const handleAssignToWorker = async () => {
    if (!selectedJob || !selectedWorker) return;

    const { error } = await supabase
      .from("jobs")
      .update({ assigned_to_worker_id: selectedWorker, status: "assigned" })
      .eq("id", selectedJob);

    if (error) {
      toast({
        title: "Error assigning job",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Create activity log
      await supabase.from("job_activities").insert({
        job_id: selectedJob,
        user_id: user?.id,
        activity_type: "assignment",
        description: "Job assigned to worker",
        new_status: "assigned",
      });

      toast({
        title: "Job assigned successfully",
      });
      setDialogOpen(false);
      setSelectedJob(null);
      setSelectedWorker("");
      fetchVendorJobsAndWorkers();
    }
  };

  const openAssignDialog = (jobId: string) => {
    setSelectedJob(jobId);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">Manage and assign jobs to your workers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No jobs assigned yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{job.description}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/dashboard/vendor/jobs/${job.id}/tasks`)}
                          title="Manage Tasks"
                        >
                          <ListTodo className="h-4 w-4" />
                        </Button>
                        {!job.assigned_to_worker_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAssignDialog(job.id)}
                            title="Assign to Worker"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Job to Worker</DialogTitle>
            <DialogDescription>Select a worker to assign this job to</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedWorker} onValueChange={setSelectedWorker}>
              <SelectTrigger>
                <SelectValue placeholder="Select a worker" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignToWorker} className="w-full" disabled={!selectedWorker}>
              Assign Job
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorJobs;
