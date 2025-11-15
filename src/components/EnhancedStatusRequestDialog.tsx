import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Send, Calendar, User, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EnhancedStatusRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityType: "job" | "job_task" | "team_task";
  userId: string;
}

export function EnhancedStatusRequestDialog({
  open,
  onOpenChange,
  entityId,
  entityType,
  userId,
}: EnhancedStatusRequestDialogProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [entityDetails, setEntityDetails] = useState<any>(null);

  // Fetch entity details when dialog opens
  useState(() => {
    if (open) {
      fetchEntityDetails();
    }
  });

  const fetchEntityDetails = async () => {
    let data = null;
    
    if (entityType === "job") {
      const res = await supabase
        .from("jobs")
        .select("title, deadline, assigned_to_vendor_id, assigned_to_worker_id, assigned_to_team_id, vendors(name), workers(name)")
        .eq("id", entityId)
        .single();
      data = res.data;
    } else if (entityType === "job_task") {
      const res = await supabase
        .from("job_tasks")
        .select("title, deadline, assigned_to_worker_id, workers(name), jobs(title)")
        .eq("id", entityId)
        .single();
      data = res.data;
    } else if (entityType === "team_task") {
      const res = await supabase
        .from("team_tasks")
        .select("title, deadline, assigned_to_worker_id, workers(name), teams(name)")
        .eq("id", entityId)
        .single();
      data = res.data;
    }
    
    setEntityDetails(data);
  };

  const handleRequestStatus = async () => {
    setLoading(true);

    try {
      // Determine recipient based on entity type and assignment
      let recipientId = null;

      if (entityType === "job") {
        const { data: jobData } = await supabase
          .from("jobs")
          .select("assigned_to_vendor_id, assigned_to_worker_id, assigned_to_team_id")
          .eq("id", entityId)
          .single();

        if (jobData?.assigned_to_vendor_id) {
          const { data: vendorData } = await supabase
            .from("vendors")
            .select("user_id")
            .eq("id", jobData.assigned_to_vendor_id)
            .single();
          recipientId = vendorData?.user_id;
        } else if (jobData?.assigned_to_worker_id) {
          const { data: workerData } = await supabase
            .from("workers")
            .select("user_id")
            .eq("id", jobData.assigned_to_worker_id)
            .single();
          recipientId = workerData?.user_id;
        } else if (jobData?.assigned_to_team_id) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("team_head_id, workers(user_id)")
            .eq("id", jobData.assigned_to_team_id)
            .single();
          
          if (teamData?.team_head_id) {
            const { data: teamHeadData } = await supabase
              .from("workers")
              .select("user_id")
              .eq("id", teamData.team_head_id)
              .single();
            recipientId = teamHeadData?.user_id;
          }
        }
      } else if (entityType === "job_task") {
        const { data: taskData } = await supabase
          .from("job_tasks")
          .select("assigned_to_worker_id")
          .eq("id", entityId)
          .single();

        if (taskData?.assigned_to_worker_id) {
          const { data: workerData } = await supabase
            .from("workers")
            .select("user_id")
            .eq("id", taskData.assigned_to_worker_id)
            .single();
          recipientId = workerData?.user_id;
        }
      } else if (entityType === "team_task") {
        const { data: taskData } = await supabase
          .from("team_tasks")
          .select("assigned_to_worker_id")
          .eq("id", entityId)
          .single();

        if (taskData?.assigned_to_worker_id) {
          const { data: workerData } = await supabase
            .from("workers")
            .select("user_id")
            .eq("id", taskData.assigned_to_worker_id)
            .single();
          recipientId = workerData?.user_id;
        }
      }

      if (!recipientId) {
        toast({
          title: "Cannot send request",
          description: "No assigned user found for this entity",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("activity_logs").insert({
        entity_id: entityId,
        entity_type: entityType,
        action_type: "status_request",
        user_id: userId,
        recipient_id: recipientId,
        notes: notes || `Status update requested for ${entityType} ${entityDetails?.title || ""}`,
        notification_type: "status_request",
      });

      if (error) throw error;

      toast({
        title: "Status request sent",
        description: "The assigned user will be notified",
      });

      setNotes("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error sending request",
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
            <Send className="h-5 w-5 text-primary" />
            Request Status Update
          </DialogTitle>
          <DialogDescription>
            Send a status update request to the assigned user
          </DialogDescription>
        </DialogHeader>
        
        {entityDetails && (
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Entity</p>
              <Badge variant="secondary" className="capitalize">{entityType.replace("_", " ")}</Badge>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Title</p>
              <p className="text-sm font-semibold">{entityDetails.title}</p>
            </div>
            
            {entityDetails.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="text-sm">
                    {new Date(entityDetails.deadline).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )}
            
            {(entityDetails.vendors?.name || entityDetails.workers?.name) && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="text-sm font-medium">
                    {entityDetails.vendors?.name || entityDetails.workers?.name}
                  </p>
                </div>
              </div>
            )}
            
            {entityDetails.jobs?.title && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Related Job</p>
                  <p className="text-sm">{entityDetails.jobs.title}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Message (Optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any specific questions or notes..."
            rows={4}
            className="resize-none"
          />
        </div>
        
        <Button 
          onClick={handleRequestStatus} 
          className="w-full" 
          disabled={loading}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Request
        </Button>
      </DialogContent>
    </Dialog>
  );
}
