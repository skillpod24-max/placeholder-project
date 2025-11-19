import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  vendor_id: string;
  vendors: {
    name: string;
    email: string;
  };
  jobs: {
    title: string;
  } | null;
}

interface InvoiceApproval {
  id: string;
  invoice_id: string;
  status: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  payment_date: string | null;
  payment_reference: string | null;
  notes: string | null;
  invoices: Invoice;
}

export default function InvoiceApprovals() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<InvoiceApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<InvoiceApproval | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "pay" | null>(null);
  const [notes, setNotes] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (userRole?.company_id) {
      fetchApprovals();
    }
  }, [userRole]);

  const fetchApprovals = async () => {
    if (!userRole?.company_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("invoice_approvals")
      .select(`
        *,
        invoices (
          *,
          vendors (name, email),
          jobs (title)
        )
      `)
      .eq("company_id", userRole.company_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading approvals",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setApprovals(data || []);
    }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedApproval || !actionType || !user) return;

    let updateData: any = { updated_at: new Date().toISOString() };

    if (actionType === "approve") {
      updateData = {
        ...updateData,
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        notes,
      };
    } else if (actionType === "reject") {
      updateData = {
        ...updateData,
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      };
    } else if (actionType === "pay") {
      updateData = {
        ...updateData,
        status: "paid",
        payment_date: new Date().toISOString(),
        payment_reference: paymentReference,
        notes,
      };
    }

    const { error } = await supabase
      .from("invoice_approvals")
      .update(updateData)
      .eq("id", selectedApproval.id);

    if (error) {
      toast({
        title: "Error updating approval",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Update invoice status
    const invoiceStatus =
      actionType === "approve" ? "approved" : actionType === "pay" ? "paid" : "rejected";
    await supabase
      .from("invoices")
      .update({ status: invoiceStatus })
      .eq("id", selectedApproval.invoice_id);

    // Send email notification
    await supabase.functions.invoke("send-email-notification", {
      body: {
        to: selectedApproval.invoices.vendors.email,
        subject: `Invoice ${selectedApproval.invoices.invoice_number} ${actionType}`,
        message: `Your invoice has been ${actionType}. ${notes || rejectionReason || ""}`,
      },
    });

    toast({
      title: "Success",
      description: `Invoice ${actionType} successfully`,
    });

    setSelectedApproval(null);
    setActionType(null);
    setNotes("");
    setPaymentReference("");
    setRejectionReason("");
    fetchApprovals();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "paid":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Approvals</h1>
        <p className="text-muted-foreground">Review and approve vendor invoices</p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">Loading...</CardContent>
          </Card>
        ) : approvals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No invoices pending approval
            </CardContent>
          </Card>
        ) : (
          approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {approval.invoices.invoice_number}
                      <Badge className={getStatusColor(approval.status)}>
                        {approval.status}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vendor: {approval.invoices.vendors.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${approval.invoices.total_amount}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(approval.invoices.due_date), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {approval.invoices.jobs && (
                    <p className="text-sm">
                      <span className="font-medium">Job:</span> {approval.invoices.jobs.title}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-medium">Issue Date:</span>{" "}
                    {format(new Date(approval.invoices.issue_date), "MMM dd, yyyy")}
                  </p>
                  {approval.notes && (
                    <p className="text-sm">
                      <span className="font-medium">Notes:</span> {approval.notes}
                    </p>
                  )}
                </div>

                {approval.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setActionType("approve");
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setActionType("reject");
                      }}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}

                {approval.status === "approved" && (
                  <Button
                    onClick={() => {
                      setSelectedApproval(approval);
                      setActionType("pay");
                    }}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}

                {approval.status === "paid" && approval.payment_reference && (
                  <p className="text-sm text-muted-foreground">
                    Payment Reference: {approval.payment_reference}
                  </p>
                )}

                {approval.status === "rejected" && approval.rejection_reason && (
                  <p className="text-sm text-red-600">Reason: {approval.rejection_reason}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog
        open={!!selectedApproval && !!actionType}
        onOpenChange={() => {
          setSelectedApproval(null);
          setActionType(null);
          setNotes("");
          setPaymentReference("");
          setRejectionReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Invoice"}
              {actionType === "reject" && "Reject Invoice"}
              {actionType === "pay" && "Mark Invoice as Paid"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "reject" && (
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this invoice is being rejected..."
                  required
                />
              </div>
            )}

            {actionType === "pay" && (
              <div>
                <Label>Payment Reference</Label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, Check number, etc."
                  required
                />
              </div>
            )}

            {(actionType === "approve" || actionType === "pay") && (
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApproval(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAction}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
