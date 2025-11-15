import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Worker {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

const VendorWorkers = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: "",
    email: "",
    password: "worker123",
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchVendorAndWorkers();
    }
  }, [user, userRole]);

  const fetchVendorAndWorkers = async () => {
    if (!user || !userRole?.company_id) return;

    // Get vendor ID
    const { data: vendorData } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (!vendorData) return;
    setVendorId(vendorData.id);

    // Fetch workers
    const { data } = await supabase
      .from("workers")
      .select("*")
      .eq("vendor_id", vendorData.id)
      .order("created_at", { ascending: false });

    if (data) {
      setWorkers(data);
    }
  };

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://vnbnboiwqcghsephthsl.supabase.co/functions/v1/create-user`, {
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
          vendor_id: vendorId
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
      setNewWorker({ name: "", email: "", password: "worker123" });
      fetchVendorAndWorkers();
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
      fetchVendorAndWorkers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Workers</h1>
          <p className="text-muted-foreground">Manage your team</p>
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
              <DialogDescription>Add a new worker to your team</DialogDescription>
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
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>{new Date(worker.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorker(worker.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorWorkers;
