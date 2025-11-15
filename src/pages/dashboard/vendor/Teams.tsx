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
import { Plus, Users, Trash2, UserPlus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Team {
  id: string;
  name: string;
  team_head_id: string | null;
  created_at: string;
}

interface Worker {
  id: string;
  name: string;
  email: string;
}

const VendorTeams = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    team_head_id: "",
    member_ids: [] as string[],
  });

  useEffect(() => {
    if (user && userRole?.company_id) {
      fetchVendorId();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (vendorId && userRole?.company_id) {
      fetchTeams();
      fetchWorkers();
    }
  }, [vendorId, userRole]);

  const fetchVendorId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      if (data) setVendorId(data.id);
    } catch (error: any) {
      console.error("Error fetching vendor:", error);
    }
  };

  const fetchTeams = async () => {
    if (!vendorId) return;

    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setTeams(data);
    } catch (error: any) {
      toast({
        title: "Error fetching teams",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchWorkers = async () => {
    if (!vendorId) return;

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, email")
        .eq("vendor_id", vendorId);

      if (error) throw error;
      if (data) setWorkers(data);
    } catch (error: any) {
      console.error("Error fetching workers:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRole?.company_id || !vendorId) return;
    setLoading(true);

    try {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: newTeam.name,
          company_id: userRole.company_id,
          vendor_id: vendorId,
          team_head_id: newTeam.team_head_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team members
      if (newTeam.member_ids.length > 0 && teamData) {
        const teamMembers = newTeam.member_ids.map((worker_id) => ({
          team_id: teamData.id,
          worker_id,
          added_by: user.id,
        }));

        const { error: membersError } = await supabase
          .from("team_members")
          .insert(teamMembers);

        if (membersError) throw membersError;
      }

      toast({ title: "Team created successfully" });
      setDialogOpen(false);
      setNewTeam({ name: "", team_head_id: "", member_ids: [] });
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error creating team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
      toast({ title: "Team deleted successfully" });
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">Organize workers into teams</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Add a new team to organize your workers</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name</Label>
                  <Input
                    id="name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team_head">Team Head (Optional)</Label>
                  <Select value={newTeam.team_head_id || "none"} onValueChange={(value) => setNewTeam({ ...newTeam, team_head_id: value === "none" ? "" : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team head" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Team Members
                  </Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {workers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No workers available</p>
                    ) : (
                      workers.map((worker) => (
                        <div key={worker.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={worker.id}
                            checked={newTeam.member_ids.includes(worker.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewTeam({
                                  ...newTeam,
                                  member_ids: [...newTeam.member_ids, worker.id],
                                });
                              } else {
                                setNewTeam({
                                  ...newTeam,
                                  member_ids: newTeam.member_ids.filter((id) => id !== worker.id),
                                });
                              }
                            }}
                          />
                          <Label
                            htmlFor={worker.id}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {worker.name} - {worker.email}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {newTeam.member_ids.length} member(s) selected
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Create Team
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No teams yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{new Date(team.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTeam(team.id)}
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

export default VendorTeams;
