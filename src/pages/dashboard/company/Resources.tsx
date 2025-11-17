import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Package, Wrench, HardDrive, FileCode } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Resource {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  status: string;
  created_at: string;
}

interface ResourceAllocation {
  id: string;
  resource_id: string;
  entity_type: string;
  entity_id: string;
  quantity: number;
  notes: string;
  allocated_at: string;
  resources: Resource;
}

const Resources = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    name: "",
    type: "equipment",
    quantity: 1,
    unit: "units",
    status: "available"
  });
  const [newAllocation, setNewAllocation] = useState({
    resource_id: "",
    entity_type: "job",
    entity_id: "",
    quantity: 1,
    notes: ""
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchResources();
      fetchAllocations();
    }
  }, [userRole]);

  const fetchResources = async () => {
    if (!userRole?.company_id) return;

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("company_id", userRole.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching resources",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) setResources(data);
  };

  const fetchAllocations = async () => {
    if (!userRole?.company_id) return;

    const { data, error } = await supabase
      .from("resource_allocations")
      .select("*, resources(*)")
      .order("allocated_at", { ascending: false });

    if (error) {
      console.error("Error fetching allocations:", error);
      return;
    }

    if (data) setAllocations(data as any);
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRole?.company_id) return;

    setLoading(true);

    const { error } = await supabase.from("resources").insert({
      ...newResource,
      company_id: userRole.company_id,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error creating resource",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Resource created successfully" });
    setDialogOpen(false);
    setNewResource({
      name: "",
      type: "equipment",
      quantity: 1,
      unit: "units",
      status: "available"
    });
    fetchResources();
  };

  const handleAllocateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from("resource_allocations").insert({
      ...newAllocation,
      allocated_by: user.id,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error allocating resource",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Resource allocated successfully" });
    setAllocDialogOpen(false);
    setNewAllocation({
      resource_id: "",
      entity_type: "job",
      entity_id: "",
      quantity: 1,
      notes: ""
    });
    fetchAllocations();
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "equipment": return <Wrench className="h-4 w-4" />;
      case "tool": return <Package className="h-4 w-4" />;
      case "material": return <HardDrive className="h-4 w-4" />;
      case "software": return <FileCode className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "success";
      case "in_use": return "warning";
      case "maintenance": return "secondary";
      case "retired": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
          <p className="text-muted-foreground">Track equipment, tools, materials, and software licenses</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Allocate Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Allocate Resource</DialogTitle>
                <DialogDescription>Assign a resource to a job or task</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAllocateResource} className="space-y-4">
                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <Select
                    value={newAllocation.resource_id}
                    onValueChange={(value) => setNewAllocation({ ...newAllocation, resource_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name} ({resource.quantity} {resource.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entity_type">Allocate To</Label>
                  <Select
                    value={newAllocation.entity_type}
                    onValueChange={(value) => setNewAllocation({ ...newAllocation, entity_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job">Job</SelectItem>
                      <SelectItem value="job_task">Job Task</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entity_id">Entity ID</Label>
                  <Input
                    id="entity_id"
                    value={newAllocation.entity_id}
                    onChange={(e) => setNewAllocation({ ...newAllocation, entity_id: e.target.value })}
                    placeholder="Enter job/task ID"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newAllocation.quantity}
                    onChange={(e) => setNewAllocation({ ...newAllocation, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={newAllocation.notes}
                    onChange={(e) => setNewAllocation({ ...newAllocation, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Allocating..." : "Allocate Resource"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>Create a new resource to track</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateResource} className="space-y-4">
                <div>
                  <Label htmlFor="name">Resource Name</Label>
                  <Input
                    id="name"
                    value={newResource.name}
                    onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                    placeholder="e.g., Excavator, Laptop, Steel Beams"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newResource.type}
                    onValueChange={(value) => setNewResource({ ...newResource, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="software">Software License</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newResource.quantity}
                      onChange={(e) => setNewResource({ ...newResource, quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={newResource.unit}
                      onChange={(e) => setNewResource({ ...newResource, unit: e.target.value })}
                      placeholder="units, kg, licenses"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newResource.status}
                    onValueChange={(value) => setNewResource({ ...newResource, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Resource"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resources Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No resources found. Add your first resource to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="flex items-center gap-2">
                        {getResourceIcon(resource.type)}
                        {resource.name}
                      </TableCell>
                      <TableCell className="capitalize">{resource.type}</TableCell>
                      <TableCell>{resource.quantity} {resource.unit}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(resource.status) as any}>
                          {resource.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Allocated To</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No allocations yet
                    </TableCell>
                  </TableRow>
                ) : (
                  allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>{allocation.resources.name}</TableCell>
                      <TableCell className="capitalize">{allocation.entity_type}</TableCell>
                      <TableCell>{allocation.quantity} {allocation.resources.unit}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Resources;
