import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";

interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  notes: string | null;
  created_at: string;
  old_value: string | null;
  new_value: string | null;
}

interface ActivityFeedProps {
  companyId: string;
  limit?: number;
}

export const ActivityFeed = ({ companyId, limit = 10 }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    if (companyId) {
      fetchActivities();
      
      // Real-time subscription
      const channel = supabase
        .channel('activity-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs'
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [companyId]);

  const fetchActivities = async () => {
    const { data: jobIds } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyId);

    if (!jobIds || jobIds.length === 0) return;

    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .in("entity_id", jobIds.map(j => j.id))
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) {
      setActivities(data);
    }
  };

  const getActivityIcon = (actionType: string) => {
    const firstLetter = actionType.charAt(0).toUpperCase();
    return firstLetter;
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-blue-500';
      case 'updated':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-green-500';
      case 'status_request':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={`${getActivityColor(activity.action_type)} text-white text-xs`}>
                      {getActivityIcon(activity.action_type)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.action_type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activity.entity_type} {activity.old_value && activity.new_value
                        ? `changed from ${activity.old_value} to ${activity.new_value}`
                        : activity.notes || ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
