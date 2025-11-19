import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Target } from "lucide-react";
import { format } from "date-fns";
import { KanbanBoard } from "@/components/KanbanBoard";

interface Sprint {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: string;
  goal: string;
  created_at: string;
}

export default function Sprints() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    goal: "",
  });

  useEffect(() => {
    if (userRole?.company_id) {
      fetchSprints();
    }
  }, [userRole]);

  const fetchSprints = async () => {
    if (!userRole?.company_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("company_id", userRole.company_id)
      .order("start_date", { ascending: false });

    if (error) {
      toast({
        title: "Error loading sprints",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSprints(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRole?.company_id) return;

    const { error } = await supabase.from("sprints").insert({
      ...formData,
      company_id: userRole.company_id,
      created_by: user.id,
      status: "planned",
    });

    if (error) {
      toast({
        title: "Error creating sprint",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sprint created",
      description: "Sprint has been created successfully",
    });

    setIsDialogOpen(false);
    setFormData({
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      goal: "",
    });
    fetchSprints();
  };

  const updateSprintStatus = async (sprintId: string, status: string) => {
    const { error } = await supabase
      .from("sprints")
      .update({ status })
      .eq("id", sprintId);

    if (error) {
      toast({
        title: "Error updating sprint",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sprint updated",
      description: `Sprint status changed to ${status}`,
    });
    fetchSprints();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "bg-gray-500";
      case "active":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sprint Management</h1>
          <p className="text-muted-foreground">Plan and track your IT project sprints</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Sprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Sprint Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Sprint 1"
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of sprint objectives..."
                />
              </div>
              <div>
                <Label>Sprint Goal</Label>
                <Input
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="What is the main goal of this sprint?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Sprint</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">Loading sprints...</CardContent>
          </Card>
        ) : sprints.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No sprints created yet. Create your first sprint to get started.
            </CardContent>
          </Card>
        ) : (
          sprints.map((sprint) => (
            <Card key={sprint.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{sprint.name}</CardTitle>
                      <Badge className={getStatusColor(sprint.status)}>{sprint.status}</Badge>
                    </div>
                    {sprint.goal && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="h-4 w-4" />
                        {sprint.goal}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(sprint.start_date), "MMM dd")} -{" "}
                        {format(new Date(sprint.end_date), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{sprint.description}</p>
                <div className="flex gap-2">
                  {sprint.status === "planned" && (
                    <Button
                      size="sm"
                      onClick={() => updateSprintStatus(sprint.id, "active")}
                    >
                      Start Sprint
                    </Button>
                  )}
                  {sprint.status === "active" && (
                    <Button
                      size="sm"
                      onClick={() => updateSprintStatus(sprint.id, "completed")}
                    >
                      Complete Sprint
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedSprint(sprint)}
                  >
                    View Board
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedSprint && (
        <Dialog open={!!selectedSprint} onOpenChange={() => setSelectedSprint(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSprint.name} - Kanban Board</DialogTitle>
            </DialogHeader>
            <KanbanBoard sprintId={selectedSprint.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
