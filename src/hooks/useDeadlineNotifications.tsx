import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useDeadlineNotifications = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !userRole?.company_id) return;

    const checkDeadlines = async () => {
      const now = new Date();
      const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Check job deadlines
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, deadline, assigned_to_vendor_id, assigned_to_worker_id")
        .eq("company_id", userRole.company_id)
        .not("status", "eq", "completed")
        .not("status", "eq", "cancelled")
        .gte("deadline", now.toISOString())
        .lte("deadline", twentyFourHoursFromNow.toISOString());

      if (jobs) {
        for (const job of jobs) {
          // Check if notification already sent
          const { data: existingLog } = await supabase
            .from("activity_logs")
            .select("id")
            .eq("entity_type", "job")
            .eq("entity_id", job.id)
            .eq("action_type", "deadline_approaching")
            .eq("deadline_notified", true)
            .single();

          if (!existingLog) {
            const recipientId = job.assigned_to_vendor_id 
              ? (await supabase.from("vendors").select("user_id").eq("id", job.assigned_to_vendor_id).single())?.data?.user_id
              : job.assigned_to_worker_id
              ? (await supabase.from("workers").select("user_id").eq("id", job.assigned_to_worker_id).single())?.data?.user_id
              : null;

            if (recipientId) {
              await supabase.from("activity_logs").insert({
                entity_type: "job",
                entity_id: job.id,
                user_id: user.id,
                recipient_id: recipientId,
                action_type: "deadline_approaching",
                notification_type: "deadline",
                notes: `Job "${job.title}" deadline is approaching in less than 24 hours`,
                deadline_notified: true,
              });

              toast({
                title: "Deadline Approaching",
                description: `Job "${job.title}" is due soon`,
              });
            }
          }
        }
      }

      // Check task deadlines
      const { data: tasks } = await supabase
        .from("job_tasks")
        .select("id, title, deadline, assigned_to_worker_id, vendor_id")
        .not("status", "eq", "completed")
        .gte("deadline", now.toISOString())
        .lte("deadline", twentyFourHoursFromNow.toISOString());

      if (tasks) {
        for (const task of tasks) {
          const { data: existingLog } = await supabase
            .from("activity_logs")
            .select("id")
            .eq("entity_type", "job_task")
            .eq("entity_id", task.id)
            .eq("action_type", "deadline_approaching")
            .eq("deadline_notified", true)
            .single();

          if (!existingLog && task.assigned_to_worker_id) {
            const { data: worker } = await supabase
              .from("workers")
              .select("user_id")
              .eq("id", task.assigned_to_worker_id)
              .single();

            if (worker) {
              await supabase.from("activity_logs").insert({
                entity_type: "job_task",
                entity_id: task.id,
                user_id: user.id,
                recipient_id: worker.user_id,
                action_type: "deadline_approaching",
                notification_type: "deadline",
                notes: `Task "${task.title}" deadline is approaching in less than 24 hours`,
                deadline_notified: true,
              });
            }
          }
        }
      }
    };

    // Check immediately
    checkDeadlines();

    // Check every hour
    const interval = setInterval(checkDeadlines, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, userRole, toast]);
};
