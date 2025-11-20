import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TimeEntry {
  id: string;
  worker_id: string;
  job_id: string;
  job_task_id: string | null;
  start_time: string;
  end_time: string | null;
  hours: number;
  billable: boolean;
  description: string;
  created_at: string;
  jobs?: { title: string };
  job_tasks?: { title: string };
}

interface Job {
  id: string;
  title: string;
}

interface Task {
  id: string;
  title: string;
}

export default function TimeTracking() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  
  // Form state
  const [selectedJobId, setSelectedJobId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);

  useEffect(() => {
    if (user && userRole) {
      fetchTimeEntries();
      fetchJobs();
      checkActiveTimer();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (selectedJobId) {
      fetchTasks(selectedJobId);
    }
  }, [selectedJobId]);

  const fetchTimeEntries = async () => {
    if (!user) return;

    let query = supabase
      .from("time_entries")
      .select(`
        *,
        jobs(title),
        job_tasks(title)
      `)
      .order("created_at", { ascending: false });

    // Filter based on role
    if (userRole?.role === "worker") {
      const { data: worker } = await supabase
        .from("workers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      
      if (worker) {
        query = query.eq("worker_id", worker.id);
      }
    } else if (userRole?.role === "vendor") {
      const { data: workers } = await supabase
        .from("workers")
        .select("id")
        .eq("vendor_id", (await supabase.from("vendors").select("id").eq("user_id", user.id).single()).data?.id);
      
      if (workers) {
        query = query.in("worker_id", workers.map(w => w.id));
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error fetching time entries",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTimeEntries(data || []);
  };

  const fetchJobs = async () => {
    if (!userRole?.company_id) return;

    const { data } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("company_id", userRole.company_id)
      .in("status", ["assigned", "in_progress"]);

    setJobs(data || []);
  };

  const fetchTasks = async (jobId: string) => {
    const { data } = await supabase
      .from("job_tasks")
      .select("id, title")
      .eq("job_id", jobId)
      .in("status", ["pending", "in_progress"]);

    setTasks(data || []);
  };

  const checkActiveTimer = async () => {
    if (!user) return;

    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!worker) return;

    const { data } = await supabase
      .from("time_entries")
      .select("id")
      .eq("worker_id", worker.id)
      .is("end_time", null)
      .single();

    if (data) {
      setActiveTimer(data.id);
    }
  };

  const startTimer = async () => {
    if (!user || !selectedJobId) {
      toast({
        title: "Missing information",
        description: "Please select a job before starting timer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: worker } = await supabase
      .from("workers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!worker) {
      toast({
        title: "Error",
        description: "Worker profile not found",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        worker_id: worker.id,
        job_id: selectedJobId,
        job_task_id: selectedTaskId || null,
        start_time: new Date().toISOString(),
        description: description,
        billable: billable,
        hours: 0,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: "Error starting timer",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setActiveTimer(data.id);
    toast({
      title: "Timer started",
      description: "Time tracking has begun",
    });
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    setLoading(true);

    const endTime = new Date();
    const { data: entry } = await supabase
      .from("time_entries")
      .select("start_time")
      .eq("id", activeTimer)
      .single();

    if (entry) {
      const startTime = new Date(entry.start_time);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          hours: Math.round(hours * 100) / 100,
        })
        .eq("id", activeTimer);

      if (error) {
        toast({
          title: "Error stopping timer",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setActiveTimer(null);
      setDescription("");
      setSelectedJobId("");
      setSelectedTaskId("");
      fetchTimeEntries();
      toast({
        title: "Timer stopped",
        description: `Logged ${hours.toFixed(2)} hours`,
      });
    }

    setLoading(false);
  };

  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const billableHours = timeEntries
    .filter((e) => e.billable)
    .reduce((sum, entry) => sum + (entry.hours || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Time Tracking</h1>
        <p className="text-muted-foreground">
          Track work hours, billable time, and productivity
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">All time entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billableHours.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">Billable time logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Non-Billable Hours
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalHours - billableHours).toFixed(2)}h
            </div>
            <p className="text-xs text-muted-foreground">Non-billable time</p>
          </CardContent>
        </Card>
      </div>

      {/* Timer Control */}
      {userRole?.role === "worker" && (
        <Card>
          <CardHeader>
            <CardTitle>Time Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Job</Label>
                <Select
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  disabled={!!activeTimer}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Task (Optional)</Label>
                <Select
                  value={selectedTaskId}
                  onValueChange={setSelectedTaskId}
                  disabled={!!activeTimer || !selectedJobId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="What are you working on?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!!activeTimer}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                disabled={!!activeTimer}
                className="rounded"
              />
              <Label>Billable</Label>
            </div>

            <div className="flex gap-2">
              {!activeTimer ? (
                <Button onClick={startTimer} disabled={loading || !selectedJobId}>
                  <Play className="mr-2 h-4 w-4" />
                  Start Timer
                </Button>
              ) : (
                <Button onClick={stopTimer} disabled={loading} variant="destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Timer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {format(new Date(entry.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{entry.jobs?.title || "N/A"}</TableCell>
                  <TableCell>{entry.job_tasks?.title || "-"}</TableCell>
                  <TableCell>{entry.description || "-"}</TableCell>
                  <TableCell>{entry.hours?.toFixed(2)}h</TableCell>
                  <TableCell>
                    <Badge variant={entry.billable ? "default" : "secondary"}>
                      {entry.billable ? "Billable" : "Non-billable"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
