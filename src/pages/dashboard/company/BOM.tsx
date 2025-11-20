import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package, DollarSign } from "lucide-react";

interface BOMItem {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface BOM {
  id: string;
  job_id: string;
  items: any;
  total_cost: number;
  actual_cost: number;
  variance: number;
  created_at: string;
  jobs?: { title: string };
}

export default function BOMManagement() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Form state
  const [selectedJobId, setSelectedJobId] = useState("");
  const [items, setItems] = useState<Omit<BOMItem, "id">[]>([
    { material_name: "", quantity: 0, unit: "pcs", unit_cost: 0, total_cost: 0 },
  ]);

  useEffect(() => {
    if (userRole?.company_id) {
      fetchBOMs();
      fetchJobs();
    }
  }, [userRole]);

  const fetchBOMs = async () => {
    if (!userRole?.company_id) return;

    const { data, error } = await supabase
      .from("bom")
      .select(`
        *,
        jobs(title)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching BOMs",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setBOMs(data || []);
  };

  const fetchJobs = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("company_id", userRole.company_id)
      .in("status", ["created", "assigned", "in_progress"]);

    setJobs(data || []);
  };

  const addItem = () => {
    setItems([
      ...items,
      { material_name: "", quantity: 0, unit: "pcs", unit_cost: 0, total_cost: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof Omit<BOMItem, "id">, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total cost for this item
    if (field === "quantity" || field === "unit_cost") {
      newItems[index].total_cost =
        newItems[index].quantity * newItems[index].unit_cost;
    }
    
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!selectedJobId || items.length === 0) {
      toast({
        title: "Missing information",
        description: "Please select a job and add at least one item",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const totalCost = items.reduce((sum, item) => sum + item.total_cost, 0);

    const { error } = await supabase.from("bom").insert({
      job_id: selectedJobId,
      items: items,
      total_cost: totalCost,
      actual_cost: 0,
      variance: 0,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error creating BOM",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Bill of Materials created successfully",
    });

    setOpen(false);
    setSelectedJobId("");
    setItems([
      { material_name: "", quantity: 0, unit: "pcs", unit_cost: 0, total_cost: 0 },
    ]);
    fetchBOMs();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bill of Materials (BOM)</h1>
          <p className="text-muted-foreground">
            Manage material requirements and track costs
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create BOM
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Bill of Materials</DialogTitle>
              <DialogDescription>
                Add materials and quantities required for a job
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Job</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Materials</Label>
                  <Button onClick={addItem} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg"
                    >
                      <div className="col-span-4">
                        <Label className="text-xs">Material Name</Label>
                        <Input
                          placeholder="Material name"
                          value={item.material_name}
                          onChange={(e) =>
                            updateItem(index, "material_name", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit</Label>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(index, "unit", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pcs">pcs</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit Cost</Label>
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={item.unit_cost || ""}
                          onChange={(e) =>
                            updateItem(index, "unit_cost", parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Total</Label>
                        <div className="text-sm font-medium p-2">
                          ${item.total_cost.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-2 pt-4 border-t">
                  <span className="font-semibold">Total Estimated Cost:</span>
                  <span className="text-2xl font-bold">
                    ${items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  Create BOM
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* BOM List */}
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estimated Cost</TableHead>
                <TableHead>Actual Cost</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boms.map((bom) => {
                const items = Array.isArray(bom.items) ? bom.items : [];
                return (
                  <TableRow key={bom.id}>
                    <TableCell className="font-medium">
                      {bom.jobs?.title || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{items.length} items</Badge>
                    </TableCell>
                    <TableCell>${bom.total_cost.toFixed(2)}</TableCell>
                    <TableCell>
                      {bom.actual_cost > 0 ? `$${bom.actual_cost.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {bom.variance !== 0 && (
                        <Badge
                          variant={bom.variance > 0 ? "destructive" : "default"}
                        >
                          {bom.variance > 0 ? "+" : ""}${bom.variance.toFixed(2)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge>{bom.actual_cost > 0 ? "Completed" : "Active"}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
