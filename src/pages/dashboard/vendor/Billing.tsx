import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  job_id: string | null;
  amount: number;
  tax: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
}

interface Job {
  id: string;
  title: string;
}

export default function VendorBilling() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    job_id: "",
    amount: "",
    tax: "0",
    notes: "",
  });

  useEffect(() => {
    if (userRole?.company_id && user) {
      fetchVendorAndData();
    }
  }, [userRole, user]);

  const fetchVendorAndData = async () => {
    if (!user || !userRole?.company_id) return;

    const { data: vendor } = await supabase
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", userRole.company_id)
      .single();

    if (vendor) {
      setVendorId(vendor.id);
      fetchInvoices(vendor.id);
      fetchJobs(vendor.id);
    }
  };

  const fetchInvoices = async (vId: string) => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("vendor_id", vId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching invoices",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) setInvoices(data);
  };

  const fetchJobs = async (vId: string) => {
    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("assigned_to_vendor_id", vId)
      .not("status", "eq", "cancelled");

    if (data) setJobs(data);
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRole?.company_id || !vendorId) return;
    setLoading(true);

    try {
      const amount = parseFloat(newInvoice.amount);
      const tax = parseFloat(newInvoice.tax || "0");
      const total = amount + tax;

      const { error } = await supabase.from("invoices").insert({
        invoice_number: generateInvoiceNumber(),
        company_id: userRole.company_id,
        vendor_id: vendorId,
        job_id: newInvoice.job_id || null,
        amount,
        tax,
        total_amount: total,
        status: "pending",
        notes: newInvoice.notes,
        created_by: user.id,
        items: [],
      });

      if (error) throw error;

      // Create notification for company
      await supabase.from("activity_logs").insert({
        entity_type: "invoice",
        entity_id: vendorId,
        user_id: user.id,
        action_type: "invoice_created",
        notification_type: "billing",
        notes: `New invoice submitted for ₹${total.toFixed(2)}`,
      });

      toast({
        title: "Invoice created successfully",
        description: "The company will be notified",
      });

      setDialogOpen(false);
      setNewInvoice({ job_id: "", amount: "", tax: "0", notes: "" });
      if (vendorId) fetchInvoices(vendorId);
    } catch (error: any) {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "overdue":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Create and manage invoices for your work</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <Label htmlFor="job_id">Related Job (Optional)</Label>
                <Select
                  value={newInvoice.job_id}
                  onValueChange={(value) => setNewInvoice({ ...newInvoice, job_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  placeholder="10000.00"
                />
              </div>

              <div>
                <Label htmlFor="tax">Tax (₹)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  value={newInvoice.tax}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax: e.target.value })}
                  placeholder="1800.00"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Amount:</span>
                  <span>₹{parseFloat(newInvoice.amount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>₹{parseFloat(newInvoice.tax || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{(parseFloat(newInvoice.amount || "0") + parseFloat(newInvoice.tax || "0")).toFixed(2)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Submitting..." : "Submit Invoice"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {invoice.job_id ? jobs.find(j => j.id === invoice.job_id)?.title || "N/A" : "General"}
                    </TableCell>
                    <TableCell>₹{invoice.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
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
}
