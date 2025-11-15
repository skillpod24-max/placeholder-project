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
import { Plus, FileText, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_id: string;
  job_id: string | null;
  amount: number;
  tax: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  items: any;
}

interface Vendor {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
}

export default function CompanyBilling() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    vendor_id: "",
    job_id: "",
    amount: "",
    tax: "",
    notes: "",
    items: [{ description: "", quantity: 1, rate: 0 }],
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchInvoices();
      fetchVendors();
      fetchJobs();
    }
  }, [userRole]);

  const fetchInvoices = async () => {
    if (!userRole?.company_id) return;

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("company_id", userRole.company_id)
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

  const fetchVendors = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", userRole.company_id);

    if (data) setVendors(data);
  };

  const fetchJobs = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("company_id", userRole.company_id);

    if (data) setJobs(data);
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRole?.company_id) return;
    setLoading(true);

    try {
      const amount = parseFloat(newInvoice.amount);
      const tax = parseFloat(newInvoice.tax || "0");
      const total = amount + tax;

      const { error } = await supabase.from("invoices").insert({
        invoice_number: generateInvoiceNumber(),
        company_id: userRole.company_id,
        vendor_id: newInvoice.vendor_id,
        job_id: newInvoice.job_id || null,
        amount,
        tax,
        total_amount: total,
        status: "draft",
        notes: newInvoice.notes,
        items: newInvoice.items,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Invoice created successfully" });
      setDialogOpen(false);
      setNewInvoice({
        vendor_id: "",
        job_id: "",
        amount: "",
        tax: "",
        notes: "",
        items: [{ description: "", quantity: 1, rate: 0 }],
      });
      fetchInvoices();
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "outline",
      sent: "secondary",
      paid: "default",
      overdue: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground">Manage vendor invoices and payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor *</Label>
                    <Select
                      value={newInvoice.vendor_id}
                      onValueChange={(value) =>
                        setNewInvoice({ ...newInvoice, vendor_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job">Related Job (Optional)</Label>
                    <Select
                      value={newInvoice.job_id || "none"}
                      onValueChange={(value) =>
                        setNewInvoice({ ...newInvoice, job_id: value === "none" ? "" : value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newInvoice.amount}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax</Label>
                    <Input
                      id="tax"
                      type="number"
                      step="0.01"
                      value={newInvoice.tax}
                      onChange={(e) =>
                        setNewInvoice({ ...newInvoice, tax: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newInvoice.notes}
                    onChange={(e) =>
                      setNewInvoice({ ...newInvoice, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No invoices yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>₹{parseFloat(invoice.total_amount as any).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          const invoiceData = `
Invoice: ${invoice.invoice_number}
Amount: ₹${parseFloat(invoice.total_amount as any).toLocaleString('en-IN')}
Status: ${invoice.status}
Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}
Notes: ${invoice.notes || 'N/A'}
                          `.trim();
                          const blob = new Blob([invoiceData], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `invoice-${invoice.invoice_number}.txt`;
                          a.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
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
}
