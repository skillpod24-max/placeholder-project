import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface JobActivity {
  id: string;
  activity_type: string;
  description: string;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
}

interface StatusTimelineProps {
  jobId: string;
}

export const StatusTimeline = ({ jobId }: StatusTimelineProps) => {
  const [activities, setActivities] = useState<JobActivity[]>([]);

  useEffect(() => {
    fetchActivities();

    // Real-time subscription
    const channel = supabase
      .channel(`job-timeline-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_activities',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchActivities = async () => {
    const { data } = await supabase
      .from("job_activities")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (data) {
      setActivities(data);
    }
  };

  const getStatusIcon = (activityType: string) => {
    if (activityType === 'status_change') {
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
    if (activityType === 'created') {
      return <Circle className="h-4 w-4 text-primary" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Status Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No timeline data available
            </p>
          ) : (
            activities.map((activity, index) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                    {getStatusIcon(activity.activity_type)}
                  </div>
                  {index !== activities.length - 1 && (
                    <div className="h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium">{activity.description}</p>
                  {activity.old_status && activity.new_status && (
                    <p className="text-xs text-muted-foreground">
                      Changed from <span className="font-medium">{activity.old_status}</span> to{' '}
                      <span className="font-medium">{activity.new_status}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
