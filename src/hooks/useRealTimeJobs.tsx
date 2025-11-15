import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  status: string;
}

export const useRealTimeJobs = (
  companyId: string,
  onJobUpdate: (job: Job) => void
) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!companyId) return;

    // Set up real-time subscription for job updates
    const channel = supabase
      .channel('jobs-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const updatedJob = payload.new as Job;
          onJobUpdate(updatedJob);

          // Show toast notification for status changes
          if (payload.old && (payload.old as any).status !== updatedJob.status) {
            toast({
              title: "Job Status Updated",
              description: `${updatedJob.title} is now ${updatedJob.status}`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${companyId}`
        },
        (payload) => {
          const newJob = payload.new as Job;
          toast({
            title: "New Job Created",
            description: newJob.title,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, onJobUpdate, toast]);
};
