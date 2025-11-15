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
      className: "bg-muted text-muted-foreground border-border",
    },
    created: {
      label: "Created",
      variant: "secondary" as const,
      className: "bg-status-created text-status-created-foreground",
    },
    pending: {
      label: "Pending",
      variant: "default" as const,
      className: "bg-status-pending text-status-pending-foreground",
    },
    assigned: {
      label: "Assigned",
      variant: "default" as const,
      className: "bg-status-assigned text-status-assigned-foreground",
    },
    in_progress: {
      label: "In Progress",
      variant: "default" as const,
      className: "bg-status-in-progress text-status-in-progress-foreground status-pulse",
    },
    completed: {
      label: "Completed",
      variant: "default" as const,
      className: "bg-status-completed text-status-completed-foreground",
    },
    on_hold: {
      label: "On Hold",
      variant: "secondary" as const,
      className: "bg-status-on-hold text-status-on-hold-foreground",
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive" as const,
      className: "bg-status-cancelled text-status-cancelled-foreground",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
