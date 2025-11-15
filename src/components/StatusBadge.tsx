import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type JobStatus = "created" | "assigned" | "in_progress" | "completed";

interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const statusConfig = {
    created: {
      label: "Created",
      variant: "secondary" as const,
      className: "bg-status-created text-status-created-foreground",
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
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
