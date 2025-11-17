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
import { Plus, Trash2, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailDialog } from "@/components/DetailDialog";

interface Worker {
  id: string;
  name: string;
  email: string;
  vendor_id: string | null;
  created_at: string;
}

interface Vendor {
  id: string;
  name: string;
}

const CompanyWorkers = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [newWorker, setNewWorker] = useState({
    name: "",
    email: "",
    password: "worker123",
    vendor_id: "",
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchWorkers();
      fetchVendors();
    }
  }, [userRole]);

  const fetchWorkers = async () => {
    if (!userRole?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("company_id", userRole.company_id)
        .is("vendor_id", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching workers:", error);
        toast({
          title: "Error fetching workers",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setWorkers(data);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchVendors = async () => {
    if (!userRole?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("company_id", userRole.company_id);

      if (error) {
        console.error("Error fetching vendors:", error);
        return;
      }

      if (data) {
        setVendors(data);
      }
    } catch (error: any) {
      console.error("Error:", error);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://yroueuznkqlltozpqpru.supabase.co/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: newWorker.email,
          password: newWorker.password,
          name: newWorker.name,
          role: 'worker',
          company_id: userRole?.company_id,
          vendor_id: newWorker.vendor_id || null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create worker');
      }

      toast({
        title: "Worker created successfully",
      });

      setDialogOpen(false);
      setNewWorker({ name: "", email: "", password: "worker123", vendor_id: "" });
      fetchWorkers();
    } catch (error: any) {
      toast({
        title: "Error creating worker",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    const { error } = await supabase.from("workers").delete().eq("id", workerId);

    if (error) {
      toast({
        title: "Error deleting worker",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Worker deleted successfully" });
      fetchWorkers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
          <p className="text-muted-foreground">Manage your workforce</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Worker</DialogTitle>
              <DialogDescription>Add a new worker to your company</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorker} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newWorker.email}
                  onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor (Optional)</Label>
                <Select value={newWorker.vendor_id || "none"} onValueChange={(value) => setNewWorker({ ...newWorker, vendor_id: value === "none" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Default Password</Label>
                <Input
                  id="password"
                  type="text"
                  value={newWorker.password}
                  onChange={(e) => setNewWorker({ ...newWorker, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Create Worker
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Workers</CardTitle>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No workers yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>{worker.vendor_id ? "Vendor Worker" : "Direct Worker"}</TableCell>
                    <TableCell>{new Date(worker.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWorker(worker);
                            setDetailDialogOpen(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorker(worker.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedWorker && (
        <DetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          title="Worker Details"
          data={selectedWorker}
          fields={[
            { key: "name", label: "Name", type: "text" },
            { key: "email", label: "Email", type: "text" },
            { key: "vendor_id", label: "Assignment", type: "text", render: (value) => value ? "Vendor Worker" : "Direct Worker" },
            { key: "created_at", label: "Created At", type: "date" },
            { key: "updated_at", label: "Last Updated", type: "date" },
          ]}
        />
      )}
    </div>
  );
};

export default CompanyWorkers;
