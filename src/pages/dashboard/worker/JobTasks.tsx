import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface JobTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  job_id: string;
  vendor_id: string;
  created_at: string;
}

const WorkerJobTasks = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<JobTask[]>([]);

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchTasks();

      // Real-time subscription
      const channel = supabase
        .channel("worker-tasks-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "job_tasks",
          },
          () => {
            fetchTasks();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, userRole]);

  const fetchTasks = async () => {
    if (!user || !userRole?.company_id) return;

    try {
      // Get worker ID
      const { data: workerData, error: workerError } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", userRole.company_id)
        .single();

      if (workerError) {
        console.error("Error fetching worker:", workerError);
        return;
      }

      if (!workerData) return;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("job_tasks")
        .select("*")
        .eq("assigned_to_worker_id", workerData.id)
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error("Error fetching tasks:", tasksError);
        toast({
          title: "Error fetching tasks",
          description: tasksError.message,
          variant: "destructive",
        });
        return;
      }

      if (tasksData) {
        setTasks(tasksData);
      }
    } catch (error: any) {
      console.error("Error:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, currentProgress?: number) => {
    const newProgress = newStatus === "completed" ? 100 : newStatus === "in_progress" ? Math.max(currentProgress || 0, 25) : 0;
    
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

    // Create activity log
    await supabase.from("activity_logs").insert({
      entity_type: "job_task",
      entity_id: taskId,
      user_id: user?.id || "",
      action_type: "status_change",
      old_value: newStatus === "in_progress" ? "pending" : "in_progress",
      new_value: newStatus,
      progress_percentage: newProgress,
      notes: `Task status updated by worker`,
    });

    toast({
      title: "Task updated successfully",
    });
    
    fetchTasks();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">View and update your assigned tasks</p>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">No tasks assigned yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Select
                        value={task.status}
                        onValueChange={(value) => updateTaskStatus(task.id, value, task.progress_percentage || 0)}
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
                    </div>
                        {task.status}
                      </span>
                    </div>
                    {(task as any).progress_percentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Progress:</span>
                        <span className="px-2 py-1 rounded bg-accent/10 text-accent">
                          {(task as any).progress_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">Deadline:</span>
                      <span>{new Date(task.deadline).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {task.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => updateTaskStatus(task.id, "in_progress")}
                      >
                        Start Task
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => updateTaskStatus(task.id, "completed", (task as any).progress_percentage)}
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

export default WorkerJobTasks;
