import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { History, User, Calendar } from "lucide-react";

interface JobHistory {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

interface JobOrderHistoryProps {
  jobId: string;
}

export const JobOrderHistory = ({ jobId }: JobOrderHistoryProps) => {
  const [history, setHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    subscribeToHistory();
  }, [jobId]);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("job_order_history")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const subscribeToHistory = () => {
    const channel = supabase
      .channel(`job-history-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_order_history",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setHistory((prev) => [payload.new as JobHistory, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "company":
        return "bg-primary";
      case "vendor":
        return "bg-secondary";
      case "worker":
        return "bg-accent";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return <div>Loading history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Job Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No history records yet</p>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div key={record.id} className="border-l-2 border-primary pl-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{record.user_name}</span>
                      <Badge className={getRoleBadgeColor(record.user_role)}>
                        {record.user_role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(record.created_at), "MMM dd, yyyy HH:mm")}
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-1">{record.action}</p>
                  {record.field_changed && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium">Field:</span> {record.field_changed}
                      </p>
                      {record.old_value && (
                        <p>
                          <span className="font-medium">From:</span> {record.old_value}
                        </p>
                      )}
                      {record.new_value && (
                        <p>
                          <span className="font-medium">To:</span> {record.new_value}
                        </p>
                      )}
                    </div>
                  )}
                  {record.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Notes:</span> {record.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
