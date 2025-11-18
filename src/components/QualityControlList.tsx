import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";

type QualityControl = Tables<"quality_control">;

interface QualityControlListProps {
  jobId?: string;
  jobTaskId?: string;
}

export const QualityControlList = ({ jobId, jobTaskId }: QualityControlListProps) => {
  const [qcRecords, setQcRecords] = useState<QualityControl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQCRecords();
    subscribeToQC();
  }, [jobId, jobTaskId]);

  const fetchQCRecords = async () => {
    let query = supabase.from("quality_control").select("*").order("created_at", { ascending: false });

    if (jobTaskId) {
      query = query.eq("job_task_id", jobTaskId);
    } else if (jobId) {
      query = query.eq("job_id", jobId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setQcRecords(data);
    }
    setLoading(false);
  };

  const subscribeToQC = () => {
    const channel = supabase
      .channel("qc-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quality_control",
        },
        () => {
          fetchQCRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      passed: "default",
      failed: "destructive",
      pending: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading QC records...</div>;
  }

  if (qcRecords.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No QC inspections yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {qcRecords.map((qc) => (
        <Card key={qc.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(qc.status)}
                  <CardTitle className="text-base">
                    Inspection by {qc.inspector_name}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(qc.created_at), "PPpp")}
                </p>
              </div>
              {getStatusBadge(qc.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Checklist ({Array.isArray(qc.checklist) ? (qc.checklist as any[]).length : 0} items)</p>
                <div className="space-y-1">
                  {Array.isArray(qc.checklist) && (qc.checklist as any[]).slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={item.passed} disabled />
                      <span className={item.passed ? "line-through text-muted-foreground" : ""}>
                        {item.item}
                      </span>
                    </div>
                  ))}
                  {Array.isArray(qc.checklist) && (qc.checklist as any[]).length > 3 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm" className="p-0 h-auto">
                          View all {(qc.checklist as any[]).length} items
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Complete Checklist</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-96">
                          <div className="space-y-2">
                            {(qc.checklist as any[]).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <Checkbox checked={item.passed} disabled />
                                <span className={item.passed ? "line-through text-muted-foreground" : ""}>
                                  {item.item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {Array.isArray(qc.defects) && (qc.defects as any[]).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium">Defects Found ({(qc.defects as any[]).length})</p>
                  </div>
                  <div className="space-y-2">
                    {(qc.defects as any[]).map((defect: any) => (
                      <div key={defect.id} className="text-sm border-l-2 border-yellow-500 pl-3">
                        <p className="font-medium">{defect.description}</p>
                        <p className="text-muted-foreground text-xs">
                          Severity: {defect.severity} | Location: {defect.location}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {qc.rework_required && qc.rework_notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Rework Required</p>
                  <p className="text-sm text-muted-foreground">{qc.rework_notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};