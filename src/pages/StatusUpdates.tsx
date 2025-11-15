import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Bell, Clock, CheckCircle, MessageSquare, Send, User, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface StatusRequest {
  id: string;
  entity_id: string;
  entity_type: string;
  action_type: string;
  notes: string;
  created_at: string;
  user_id: string;
  recipient_id: string;
  is_read: boolean;
}

interface StatusUpdate {
  id: string;
  entity_id: string;
  entity_type: string;
  notes: string;
  created_at: string;
  user_id: string;
  recipient_id: string;
  request_id?: string;
  responder_name?: string;
  responder_role?: string;
}

export default function StatusUpdates() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<StatusRequest[]>([]);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<StatusRequest | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStatusRequests();
      fetchStatusUpdates();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchStatusRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("action_type", "status_request")
      .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      return;
    }

    if (data) setRequests(data);
  };

  const fetchStatusUpdates = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("action_type", "status_response")
      .or(`recipient_id.eq.${user.id},user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching updates:", error);
      return;
    }

    if (data) {
      // Fetch responder details for each update
      const updatesWithDetails = await Promise.all(
        data.map(async (update) => {
          let responderName = "Unknown";
          let responderRole = "Unknown";

          if (userRole?.role === "company") {
            const { data: vendorData } = await supabase
              .from("vendors")
              .select("name")
              .eq("user_id", update.user_id)
              .single();

            if (vendorData) {
              responderName = vendorData.name;
              responderRole = "Vendor";
            } else {
              const { data: workerData } = await supabase
                .from("workers")
                .select("name, role")
                .eq("user_id", update.user_id)
                .single();

              if (workerData) {
                responderName = workerData.name;
                responderRole = workerData.role || "Worker";
              }
            }
          }

          return {
            ...update,
            responder_name: responderName,
            responder_role: responderRole,
          };
        })
      );

      setUpdates(updatesWithDetails);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("status-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        () => {
          fetchStatusRequests();
          fetchStatusUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRespond = async () => {
    if (!selectedRequest || !user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("activity_logs").insert({
        entity_id: selectedRequest.entity_id,
        entity_type: selectedRequest.entity_type,
        action_type: "status_response",
        user_id: user.id,
        recipient_id: selectedRequest.user_id,
        notes: responseNote,
        notification_type: "status_response",
      });

      if (error) throw error;

      await supabase
        .from("activity_logs")
        .update({ is_read: true })
        .eq("id", selectedRequest.id);

      toast({ title: "Response sent successfully" });
      setSelectedRequest(null);
      setResponseNote("");
      fetchStatusRequests();
      fetchStatusUpdates();
    } catch (error: any) {
      toast({
        title: "Error sending response",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sentRequests = requests.filter((r) => r.user_id === user?.id);
  const receivedRequests = requests.filter((r) => r.recipient_id === user?.id && !r.is_read);
  const receivedUpdates = updates.filter((u) => u.recipient_id === user?.id);

  if (userRole?.role === "company") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Status Updates</h1>
            <p className="text-muted-foreground">Track status requests and responses</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Bell className="h-4 w-4 mr-2" />
            {receivedUpdates.length} New Updates
          </Badge>
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">
              My Requests ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="updates">
              Updates Received ({receivedUpdates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {sentRequests.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Send className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No requests sent yet</p>
                </CardContent>
              </Card>
            ) : (
              sentRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        Request ID: {request.id.slice(0, 8)}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge variant={request.is_read ? "default" : "secondary"}>
                          {request.is_read ? "Responded" : "Sent"}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(request.created_at).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Entity: {request.entity_type.toUpperCase()}</p>
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="updates" className="space-y-4">
            <ScrollArea className="h-[600px] pr-4">
              {receivedUpdates.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No updates received yet</p>
                  </CardContent>
                </Card>
              ) : (
                receivedUpdates.map((update) => (
                  <Card key={update.id} className="mb-4 hover:shadow-md transition-shadow border-l-4 border-l-accent">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5 text-accent" />
                          {update.responder_name}
                        </CardTitle>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(update.created_at).toLocaleString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary">{update.responder_role}</Badge>
                        <Badge variant="outline">{update.entity_type.toUpperCase()}</Badge>
                      </div>
                      <Separator />
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">Response:</p>
                        <p className="text-sm">{update.notes}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // For vendor and worker roles
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Status Updates</h1>
          <p className="text-muted-foreground">Respond to status requests</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Bell className="h-4 w-4 mr-2" />
          {receivedRequests.length} Pending
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending Requests ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {receivedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            receivedRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Request ID: {request.id.slice(0, 8)}
                    </CardTitle>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(request.created_at).toLocaleString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Request Message:</p>
                    <p className="text-sm text-muted-foreground">{request.notes}</p>
                  </div>
                  <Button
                    onClick={() => setSelectedRequest(request)}
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Response
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            {requests.map((request) => (
              <Card
                key={request.id}
                className={`mb-4 ${request.is_read ? "opacity-60" : ""}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Request ID: {request.id.slice(0, 8)}
                    </CardTitle>
                    <div className="flex gap-2">
                      {request.is_read && (
                        <Badge variant="secondary">Responded</Badge>
                      )}
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(request.created_at).toLocaleString()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{request.notes}</p>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Respond to Status Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Original Request:</p>
                <p className="text-sm text-muted-foreground">{selectedRequest.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Response</label>
              <Textarea
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder="Provide status update..."
                rows={4}
              />
            </div>
            <Button onClick={handleRespond} className="w-full" disabled={loading || !responseNote}>
              <Send className="h-4 w-4 mr-2" />
              Send Response
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
