import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface JobTask {
  id: string;
  title: string;
  status: string;
  progress_percentage: number | null;
}

export const useRealTimeJobTasks = (
  vendorId: string | null,
  onTaskUpdate: (task: JobTask) => void
) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!vendorId) return;

    const channel = supabase
      .channel('job-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_tasks',
          filter: `vendor_id=eq.${vendorId}`
        },
        (payload) => {
          const updatedTask = payload.new as JobTask;
          onTaskUpdate(updatedTask);

          if (payload.old && (payload.old as any).status !== updatedTask.status) {
            toast({
              title: "Task Status Updated",
              description: `${updatedTask.title} is now ${updatedTask.status}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_tasks',
          filter: `vendor_id=eq.${vendorId}`
        },
        (payload) => {
          const newTask = payload.new as JobTask;
          toast({
            title: "New Task Assigned",
            description: newTask.title,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vendorId, onTaskUpdate, toast]);
};
