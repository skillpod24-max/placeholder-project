import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  progress_percentage: number;
  assigned_to_worker_id: string | null;
  workers: {
    name: string;
  } | null;
}

interface KanbanBoardProps {
  sprintId: string;
}

const columns = [
  { id: "pending", title: "To Do", color: "bg-gray-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "review", title: "Review", color: "bg-yellow-500" },
  { id: "completed", title: "Done", color: "bg-green-500" },
];

export const KanbanBoard = ({ sprintId }: KanbanBoardProps) => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [sprintId]);

  const fetchTasks = async () => {
    if (!userRole?.company_id) {
      setLoading(false);
      toast({
        title: "Error",
        description: "Unable to load company information",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("job_tasks")
      .select(`
        *,
        workers (name)
      `)
      .eq("sprint_id", sprintId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tasks:", error);
      toast({
        title: "Error loading tasks",
        description: error.message,
        variant: "destructive",
      });
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");

    const { error } = await supabase
      .from("job_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Task updated",
      description: "Task status has been updated",
    });
    fetchTasks();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return <div className="p-6">Loading board...</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex flex-col min-h-[500px]"
          onDrop={(e) => handleDrop(e, column.id)}
          onDragOver={handleDragOver}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold">{column.title}</h3>
              <Badge variant="secondary">{getTasksByStatus(column.id).length}</Badge>
            </div>
          </div>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-move hover:shadow-md transition-shadow"
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    {task.workers && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          {task.workers.name[0]}
                        </div>
                        <span>{task.workers.name}</span>
                      </div>
                    )}
                    {task.progress_percentage > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progress</span>
                          <span>{task.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${task.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
