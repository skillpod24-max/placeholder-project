import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type JobStatus = "draft" | "created" | "pending" | "assigned" | "in_progress" | "completed" | "on_hold" | "cancelled";

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    draft: {
      label: "Draft",
      variant: "outline" as const,
      className: "bg-muted text-muted-foreground",
    },
    created: {
      label: "Created",
      variant: "secondary" as const,
      className: "bg-status-created text-status-created-foreground",
    },
    pending: {
      label: "Pending",
      variant: "secondary" as const,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    },
    assigned: {
      label: "Assigned",
      variant: "default" as const,
      className: "bg-status-assigned text-status-assigned-foreground",
    },
    in_progress: {
      label: "In Progress",
      variant: "default" as const,
      className: "bg-status-in-progress text-status-in-progress-foreground",
    },
    completed: {
      label: "Completed",
      variant: "default" as const,
      className: "bg-status-completed text-status-completed-foreground",
    },
    on_hold: {
      label: "On Hold",
      variant: "secondary" as const,
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive" as const,
      className: "bg-destructive text-destructive-foreground",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
