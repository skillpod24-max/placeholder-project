import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Plus, ArrowLeft, Eye, MessageSquare } from "lucide-react";
import { JobChat } from "@/components/JobChat";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { DetailDialog } from "@/components/DetailDialog";
import { StatusRequestDialog } from "@/components/StatusRequestDialog";
import { Progress } from "@/components/ui/progress";

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  deadline: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: string;
  assigned_to_worker_id: string | null;
}

interface Worker {
  id: string;
  name: string;
}

const VendorJobTasks = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [job, setJob] = useState<Job | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statusRequestOpen, setStatusRequestOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    deadline: "",
    assigned_to_worker_id: "",
  });

  useEffect(() => {
    if (user && userRole?.company_id && jobId) {
      fetchJobAndTasks();
    }
  }, [user, userRole, jobId]);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string, currentProgress: number) => {
    const newProgress = newStatus === "completed" ? 100 : newStatus === "in_progress" ? Math.max(currentProgress, 25) : 0;
    
    const { error } = await supabase
      .from("job_tasks")
      .update({ 
        status: newStatus,
        progress_percentage: newProgress
      })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await supabase.from("activity_logs").insert({
      entity_type: "job_task",
      entity_id: taskId,
      user_id: user?.id || "",
      action_type: "status_change",
      old_value: "pending",
      new_value: newStatus,
      progress_percentage: newProgress,
      notes: `Task status updated by vendor`,
    });

    toast({ title: "Task updated successfully" });
    fetchJobAndTasks();
  };

  const fetchJobAndTasks = async () => {
    if (!user || !userRole?.company_id || !jobId) return;

    // Get vendor ID
    const { data: vendorData } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!vendorData) return;
    setVendorId(vendorData.id);

    // Fetch job details
    const { data: jobData } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobData) {
      setJob(jobData);
    }

    // Fetch tasks for this job
    const { data: tasksData } = await supabase
      .from("job_tasks")
      .select("*")
      .eq("job_id", jobId)
      .eq("vendor_id", vendorData.id)
      .order("created_at", { ascending: false });

    if (tasksData) {
      setTasks(tasksData);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !jobId) return;

    setLoading(true);

    try {
      const { error } = await supabase.from("job_tasks").insert({
        job_id: jobId,
        vendor_id: vendorId,
        title: newTask.title,
        description: newTask.description,
        deadline: newTask.deadline || null,
        assigned_to_worker_id: newTask.assigned_to_worker_id || null,
        assigned_by: user?.id,
        assigned_at: newTask.assigned_to_worker_id ? new Date().toISOString() : null,
        status: newTask.assigned_to_worker_id ? "assigned" : "pending",
      });

      if (error) throw error;

      toast({
        title: "Task created successfully",
      });

      setDialogOpen(false);
      setNewTask({ title: "", description: "", deadline: "", assigned_to_worker_id: "" });
      fetchJobAndTasks();
    } catch (error: any) {
      toast({
        title: "Error creating task",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (taskId: string, workerId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("job_tasks")
      .update({ 
        assigned_to_worker_id: workerId, 
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        status: "assigned" 
      })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error assigning task",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Task assigned successfully" });
      fetchJobAndTasks();
    }
  };

  if (!job) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{job.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Description</h3>
            <p className="text-muted-foreground">{job.description}</p>
          </div>
          {job.requirements && (
            <div>
              <h3 className="font-semibold">Requirements</h3>
              <p className="text-muted-foreground">{job.requirements}</p>
            </div>
          )}
          {job.deadline && (
            <div>
              <h3 className="font-semibold">Deadline</h3>
              <p className="text-muted-foreground">
                {new Date(job.deadline).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Task Breakdown</h2>
          <p className="text-muted-foreground">Break down the job into tasks for your workers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Break down the job into manageable tasks</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="worker">Assign to Worker (Optional)</Label>
                <Select
                  value={newTask.assigned_to_worker_id}
                  onValueChange={(value) => setNewTask({ ...newTask, assigned_to_worker_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks created yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {tasks.map((task) => (
                  <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{task.title}</TableCell>
                    <TableCell>
                      <Select
                        value={task.status}
                        onValueChange={(value) => handleUpdateTaskStatus(task.id, value, (task as any).progress_percentage || 0)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={(task as any).progress_percentage || 0} className="w-20" />
                        <span className="text-sm text-muted-foreground">{(task as any).progress_percentage || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.assigned_to_worker_id ? (
                        workers.find(w => w.id === task.assigned_to_worker_id)?.name || 'Assigned'
                      ) : (
                        "Unassigned"
                      )}
                    </TableCell>
                    <TableCell>
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
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
                            setSelectedTask(task);
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

      {selectedTask && (
        <>
          <DetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            title="Task Details"
            data={selectedTask}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "text" },
              { key: "status", label: "Status", type: "status" },
              { key: "progress_percentage", label: "Progress", type: "text", render: (value) => `${value || 0}%` },
              { key: "deadline", label: "Deadline", type: "date" },
              { key: "assigned_at", label: "Assigned At", type: "date" },
            ]}
          />
          <StatusRequestDialog
            open={statusRequestOpen}
            onOpenChange={setStatusRequestOpen}
            entityId={selectedTask.id}
            entityType="job_task"
            userId={user?.id || ""}
          />
        </>
      )}

      {/* Job Chat Section */}
      {job && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Job Discussion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <JobChat jobId={job.id} jobTitle={job.title} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VendorJobTasks;
