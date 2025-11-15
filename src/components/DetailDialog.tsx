import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, Building2, Hash, FileText, Mail, DollarSign, Users } from "lucide-react";

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Record<string, any>;
  fields: Array<{
    key: string;
    label: string;
    type?: "text" | "date" | "status" | "email" | "currency" | "array";
    render?: (value: any) => React.ReactNode;
  }>;
}

export function DetailDialog({ open, onOpenChange, title, data, fields }: DetailDialogProps) {
  const renderField = (field: typeof fields[0], value: any) => {
    if (field.render) {
      return field.render(value);
    }

    switch (field.type) {
      case "date":
        return value ? new Date(value).toLocaleString() : "N/A";
      case "status":
        return (
          <Badge
            variant={
              value === "completed"
                ? "default"
                : value === "in_progress"
                ? "secondary"
                : "outline"
            }
            className={
              value === "completed"
                ? "bg-success text-success-foreground"
                : value === "in_progress"
                ? "bg-warning text-warning-foreground"
                : value === "assigned"
                ? "bg-primary text-primary-foreground"
                : "bg-status-created text-status-created-foreground"
            }
          >
            {value?.replace(/_/g, " ").toUpperCase()}
          </Badge>
        );
      case "currency":
        return value ? `₹${parseFloat(value).toLocaleString('en-IN')}` : "₹0";
      case "array":
        if (!value || !Array.isArray(value) || value.length === 0) return "None";
        return (
          <div className="space-y-2">
            {value.map((item, idx) => (
              <div key={idx} className="p-3 bg-muted rounded-lg border border-border">
                <p className="text-sm font-medium">
                  {typeof item === 'string' ? item : item.name || JSON.stringify(item)}
                </p>
                {item.role && <p className="text-xs text-muted-foreground mt-1">Role: {item.role}</p>}
              </div>
            ))}
          </div>
        );
      default:
        return value || "N/A";
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "date":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "email":
        return <Mail className="h-4 w-4 text-primary" />;
      case "currency":
        return <DollarSign className="h-4 w-4 text-primary" />;
      case "array":
        return <Users className="h-4 w-4 text-primary" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Hash className="h-6 w-6 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <Separator />
        <ScrollArea className="max-h-[calc(90vh-140px)] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div 
                key={field.key} 
                className={`p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all ${
                  field.type === 'array' || field.key === 'description' || field.key === 'notes' || field.key === 'requirements' ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {getIcon(field.type)}
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {field.label}
                  </p>
                </div>
                <div className="text-base font-medium">
                  {renderField(field, data[field.key])}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
