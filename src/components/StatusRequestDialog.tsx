import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

interface StatusRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: "job" | "job_task" | "team_task";
  userId: string;
}

export function StatusRequestDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  userId,
}: StatusRequestDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestStatus = async () => {
    setLoading(true);
    try {
      // Fetch entity to determine recipient
      let recipientId = null;
      
      if (entityType === "job") {
        const { data: jobData } = await supabase
          .from("jobs")
          .select("assigned_to_vendor_id, assigned_to_worker_id, assigned_to_team_id")
          .eq("id", entityId)
          .single();

        if (jobData) {
          if (jobData.assigned_to_team_id) {
            // Get team head
            const { data: teamData } = await supabase
              .from("teams")
              .select("team_head_id, workers(user_id)")
              .eq("id", jobData.assigned_to_team_id)
              .single();
            
            if (teamData?.workers) {
              recipientId = (teamData.workers as any).user_id;
            }
          } else if (jobData.assigned_to_vendor_id) {
            // Get vendor user_id
            const { data: vendorData } = await supabase
              .from("vendors")
              .select("user_id")
              .eq("id", jobData.assigned_to_vendor_id)
              .single();
            
            if (vendorData) recipientId = vendorData.user_id;
          } else if (jobData.assigned_to_worker_id) {
            // Get worker user_id
            const { data: workerData } = await supabase
              .from("workers")
              .select("user_id")
              .eq("id", jobData.assigned_to_worker_id)
              .single();
            
            if (workerData) recipientId = workerData.user_id;
          }
        }
      } else if (entityType === "job_task") {
        const { data: taskData } = await supabase
          .from("job_tasks")
          .select("assigned_to_worker_id, assigned_to_team_id, vendor_id")
          .eq("id", entityId)
          .single();

        if (taskData) {
          if (taskData.assigned_to_team_id) {
            const { data: teamData } = await supabase
              .from("teams")
              .select("team_head_id, workers(user_id)")
              .eq("id", taskData.assigned_to_team_id)
              .single();
            
            if (teamData?.workers) {
              recipientId = (teamData.workers as any).user_id;
            }
          } else if (taskData.assigned_to_worker_id) {
            const { data: workerData } = await supabase
              .from("workers")
              .select("user_id")
              .eq("id", taskData.assigned_to_worker_id)
              .single();
            
            if (workerData) recipientId = workerData.user_id;
          } else if (taskData.vendor_id) {
            const { data: vendorData } = await supabase
              .from("vendors")
              .select("user_id")
              .eq("id", taskData.vendor_id)
              .single();
            
            if (vendorData) recipientId = vendorData.user_id;
          }
        }
      } else if (entityType === "team_task") {
        const { data: taskData } = await supabase
          .from("team_tasks")
          .select("assigned_to_worker_id, team_id")
          .eq("id", entityId)
          .single();

        if (taskData) {
          if (taskData.assigned_to_worker_id) {
            const { data: workerData } = await supabase
              .from("workers")
              .select("user_id")
              .eq("id", taskData.assigned_to_worker_id)
              .single();
            
            if (workerData) recipientId = workerData.user_id;
          } else if (taskData.team_id) {
            const { data: teamData } = await supabase
              .from("teams")
              .select("team_head_id, workers(user_id)")
              .eq("id", taskData.team_id)
              .single();
            
            if (teamData?.workers) {
              recipientId = (teamData.workers as any).user_id;
            }
          }
        }
      }

      const { error } = await supabase.from("activity_logs").insert({
        entity_id: entityId,
        entity_type: entityType,
        action_type: "status_request",
        user_id: userId,
        recipient_id: recipientId,
        notes: notes || "Status update requested",
        notification_type: "status_request",
      });

      if (error) throw error;

      toast({
        title: "Status request sent",
        description: "The assignee has been notified to provide an update",
      });

      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error requesting status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Request Status Update
          </DialogTitle>
          <DialogDescription>
            Send a request for a progress update on this {entityType.replace("_", " ")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Message (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific questions or requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleRequestStatus} className="w-full" disabled={loading}>
            Send Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
