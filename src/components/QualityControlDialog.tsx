import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardCheck, Plus, X } from "lucide-react";

interface QualityControlDialogProps {
  jobId: string;
  jobTaskId?: string;
  onSuccess?: () => void;
}

interface ChecklistItem {
  id: string;
  item: string;
  passed: boolean;
}

interface Defect {
  id: string;
  description: string;
  severity: string;
  location: string;
}

export const QualityControlDialog = ({ jobId, jobTaskId, onSuccess }: QualityControlDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: "1", item: "Dimensions accuracy", passed: false },
    { id: "2", item: "Surface finish quality", passed: false },
    { id: "3", item: "Material specification", passed: false },
  ]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [status, setStatus] = useState<string>("pending");
  const [reworkNotes, setReworkNotes] = useState("");
  const [inspectorName, setInspectorName] = useState("");

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), item: newChecklistItem, passed: false }]);
    setNewChecklistItem("");
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, passed: !item.passed } : item
    ));
  };

  const addDefect = () => {
    setDefects([...defects, { id: Date.now().toString(), description: "", severity: "medium", location: "" }]);
  };

  const removeDefect = (id: string) => {
    setDefects(defects.filter(defect => defect.id !== id));
  };

  const updateDefect = (id: string, field: keyof Defect, value: string) => {
    setDefects(defects.map(defect => 
      defect.id === id ? { ...defect, [field]: value } : defect
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);

    const allPassed = checklist.every(item => item.passed);
    const finalStatus = status === "failed" || !allPassed ? "failed" : "passed";
    const reworkRequired = finalStatus === "failed" || defects.length > 0;

    const { error } = await supabase.from("quality_control").insert({
      job_id: jobId,
      job_task_id: jobTaskId || null,
      inspector_id: user.id,
      inspector_name: inspectorName || user.email || "Inspector",
      status: finalStatus,
      checklist: checklist as any,
      defects: defects as any,
      rework_required: reworkRequired,
      rework_notes: reworkNotes || null,
      passed_at: finalStatus === "passed" ? new Date().toISOString() : null,
      failed_at: finalStatus === "failed" ? new Date().toISOString() : null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error creating QC record",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update job task QC status if applicable
    if (jobTaskId) {
      await supabase
        .from("job_tasks")
        .update({ qc_status: finalStatus })
        .eq("id", jobTaskId);
    }

    toast({
      title: "QC inspection recorded",
      description: `Job ${finalStatus === "passed" ? "passed" : "failed"} quality control`,
    });

    // Reset form
    setChecklist([
      { id: "1", item: "Dimensions accuracy", passed: false },
      { id: "2", item: "Surface finish quality", passed: false },
      { id: "3", item: "Material specification", passed: false },
    ]);
    setDefects([]);
    setStatus("pending");
    setReworkNotes("");
    setInspectorName("");
    
    setOpen(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="h-4 w-4 mr-2" />
          QC Inspection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quality Control Inspection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Inspector Name</Label>
            <Input
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Inspection Checklist</Label>
              <div className="flex gap-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Add checklist item"
                  className="w-64"
                />
                <Button type="button" size="sm" onClick={addChecklistItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2 border rounded-lg p-4">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Checkbox
                      checked={item.passed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <span className={item.passed ? "line-through text-muted-foreground" : ""}>
                      {item.item}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Defects</Label>
              <Button type="button" size="sm" variant="outline" onClick={addDefect}>
                <Plus className="h-4 w-4 mr-2" />
                Add Defect
              </Button>
            </div>
            <div className="space-y-3">
              {defects.map((defect) => (
                <div key={defect.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDefect(defect.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={defect.description}
                        onChange={(e) => updateDefect(defect.id, "description", e.target.value)}
                        placeholder="Describe the defect"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <Select
                        value={defect.severity}
                        onValueChange={(value) => updateDefect(defect.id, "severity", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={defect.location}
                      onChange={(e) => updateDefect(defect.id, "location", e.target.value)}
                      placeholder="Where is the defect located?"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Final Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(status === "failed" || defects.length > 0) && (
            <div className="space-y-2">
              <Label>Rework Notes</Label>
              <Textarea
                value={reworkNotes}
                onChange={(e) => setReworkNotes(e.target.value)}
                placeholder="Describe required rework or corrective actions"
                rows={4}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Inspection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};