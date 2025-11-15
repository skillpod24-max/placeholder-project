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
import { Plus, Users, Trash2, UserPlus, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DetailDialog } from "@/components/DetailDialog";
import { TeamTaskSplitDialog } from "@/components/TeamTaskSplitDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Team {
  id: string;
  name: string;
  team_head_id: string | null;
  created_at: string;
  team_members?: Array<{
    worker_id: string;
    workers: {
      name: string;
      role: string;
    };
  }>;
  team_head?: {
    name: string;
  };
}

interface Worker {
  id: string;
  name: string;
  email: string;
}

const CompanyTeams = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: "",
    team_head_id: "",
    member_ids: [] as string[],
  });
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [splitTaskDialogOpen, setSplitTaskDialogOpen] = useState(false);

  useEffect(() => {
    if (userRole?.company_id) {
      fetchTeams();
      fetchWorkers();
    }
  }, [userRole]);

  const fetchTeams = async () => {
    if (!userRole?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_head:workers!teams_team_head_id_fkey(name),
          team_members(
            worker_id,
            workers(name, role)
          )
        `)
        .eq("company_id", userRole.company_id)
        .is("vendor_id", null)
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
    if (!userRole?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("workers")
        .select("id, name, email")
        .eq("company_id", userRole.company_id)
        .is("vendor_id", null);

      if (error) throw error;
      if (data) setWorkers(data);
    } catch (error: any) {
      console.error("Error fetching workers:", error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRole?.company_id) return;
    setLoading(true);

    try {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: newTeam.name,
          company_id: userRole.company_id,
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
                  <TableHead>Team Head</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{(team.team_head as any)?.name || "Not assigned"}</TableCell>
                    <TableCell>{team.team_members?.length || 0}</TableCell>
                    <TableCell>{new Date(team.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTeam(team);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
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

      {selectedTeam && (
        <DetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          title={`Team: ${selectedTeam.name}`}
          data={{
            name: selectedTeam.name,
            team_head: (selectedTeam.team_head as any)?.name || "Not assigned",
            created_at: selectedTeam.created_at,
            member_count: selectedTeam.team_members?.length || 0,
            members: selectedTeam.team_members?.map(m => ({
              name: (m.workers as any).name,
              role: (m.workers as any).role || "Member"
            })) || []
          }}
          fields={[
            { key: "name", label: "Team Name", type: "text" },
            { key: "team_head", label: "Team Head", type: "text" },
            { key: "member_count", label: "Total Members", type: "text" },
            { key: "created_at", label: "Created At", type: "date" },
            { key: "members", label: "Team Members", type: "array" },
          ]}
        />
      )}

      {selectedTeam && user && (
        <TeamTaskSplitDialog
          open={splitTaskDialogOpen}
          onOpenChange={setSplitTaskDialogOpen}
          teamId={selectedTeam.id}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default CompanyTeams;
