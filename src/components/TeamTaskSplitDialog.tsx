import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  worker_id: string;
  workers: {
    id: string;
    name: string;
    role: string;
  };
}

interface TeamTaskSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
  jobTaskId?: string;
  teamId: string;
  userId: string;
}

export function TeamTaskSplitDialog({
  open,
  onOpenChange,
  jobId,
  jobTaskId,
  teamId,
  userId,
}: TeamTaskSplitDialogProps) {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    assigned_to_worker_id: "",
    deadline: undefined as Date | undefined,
  });

  useEffect(() => {
    if (open && teamId) {
      fetchTeamMembers();
    }
  }, [open, teamId]);

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select("id, worker_id, workers(id, name, role)")
      .eq("team_id", teamId);

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    if (data) setTeamMembers(data as any);
  };

  const handleCreateTask = async () => {
    if (!taskData.title || !taskData.assigned_to_worker_id) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("team_tasks").insert({
        team_id: teamId,
        job_id: jobId || null,
        job_task_id: jobTaskId || null,
        title: taskData.title,
        description: taskData.description,
        assigned_to_worker_id: taskData.assigned_to_worker_id,
        assigned_by: userId,
        deadline: taskData.deadline?.toISOString(),
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Task created successfully" });
      setTaskData({
        title: "",
        description: "",
        assigned_to_worker_id: "",
        deadline: undefined,
      });
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Split Task to Team Member
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={taskData.title}
                onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskData.description}
                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                placeholder="Enter task description"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="worker">Assign To *</Label>
              <Select
                value={taskData.assigned_to_worker_id}
                onValueChange={(value) =>
                  setTaskData({ ...taskData, assigned_to_worker_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.worker_id} value={member.worker_id}>
                      {(member.workers as any).name} - {(member.workers as any).role || "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {taskData.deadline ? (
                      format(taskData.deadline, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={taskData.deadline}
                    onSelect={(date) => setTaskData({ ...taskData, deadline: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleCreateTask} className="w-full" disabled={loading}>
              Create Task
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
