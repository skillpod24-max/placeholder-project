import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Package,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

interface JobStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  on_hold: number;
}

interface WorkerPerformance {
  worker_name: string;
  tasks_completed: number;
  avg_completion_time: number;
  efficiency: number;
}

interface VendorPerformance {
  vendor_name: string;
  jobs_completed: number;
  avg_delivery_time: number;
  quality_score: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export default function Reports() {
  const { userRole } = useAuth();
  const [jobStats, setJobStats] = useState<JobStats>({
    total: 0,
    completed: 0,
    in_progress: 0,
    pending: 0,
    on_hold: 0,
  });
  const [workerPerformance, setWorkerPerformance] = useState<WorkerPerformance[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole?.company_id) {
      fetchDashboardData();
    }
  }, [userRole]);

  const fetchDashboardData = async () => {
    if (!userRole?.company_id) return;

    setLoading(true);

    // Fetch job statistics
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("company_id", userRole.company_id);

    if (jobs) {
      setJobStats({
        total: jobs.length,
        completed: jobs.filter((j) => j.status === "completed").length,
        in_progress: jobs.filter((j) => j.status === "in_progress").length,
        pending: jobs.filter((j) => j.status === "pending").length,
        on_hold: jobs.filter((j) => j.status === "on_hold").length,
      });
    }

    // Fetch worker performance
    const { data: tasks } = await supabase
      .from("job_tasks")
      .select("*, workers(name)")
      .eq("status", "completed")
      .not("assigned_to_worker_id", "is", null);

    if (tasks) {
      const workerMap = new Map<string, { completed: number; name: string }>();
      tasks.forEach((task: any) => {
        if (task.workers) {
          const existing = workerMap.get(task.assigned_to_worker_id) || {
            completed: 0,
            name: task.workers.name,
          };
          workerMap.set(task.assigned_to_worker_id, {
            completed: existing.completed + 1,
            name: existing.name,
          });
        }
      });

      const performance: WorkerPerformance[] = Array.from(workerMap.values()).map((w) => ({
        worker_name: w.name,
        tasks_completed: w.completed,
        avg_completion_time: 0,
        efficiency: (w.completed / tasks.length) * 100,
      }));
      setWorkerPerformance(performance);
    }

    // Fetch vendor performance
    const { data: vendors } = await supabase
      .from("vendors")
      .select("id, name")
      .eq("company_id", userRole.company_id);

    if (vendors) {
      const vendorStats = await Promise.all(
        vendors.map(async (vendor) => {
          const { data: vendorJobs } = await supabase
            .from("jobs")
            .select("*")
            .eq("assigned_to_vendor_id", vendor.id)
            .eq("status", "completed");

          const { data: qc } = await supabase
            .from("quality_control")
            .select("status")
            .in(
              "job_id",
              vendorJobs?.map((j) => j.id) || []
            );

          const passedQC = qc?.filter((q) => q.status === "passed").length || 0;
          const totalQC = qc?.length || 1;

          return {
            vendor_name: vendor.name,
            jobs_completed: vendorJobs?.length || 0,
            avg_delivery_time: 0,
            quality_score: (passedQC / totalQC) * 100,
          };
        })
      );
      setVendorPerformance(vendorStats);
    }

    setLoading(false);
  };

  const statusData = [
    { name: "Completed", value: jobStats.completed, color: COLORS[0] },
    { name: "In Progress", value: jobStats.in_progress, color: COLORS[1] },
    { name: "Pending", value: jobStats.pending, color: COLORS[2] },
    { name: "On Hold", value: jobStats.on_hold, color: COLORS[3] },
  ];

  if (loading) {
    return <div className="p-6">Loading reports...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Comprehensive Reports</h1>
        <p className="text-muted-foreground">
          Production analytics, WIP tracking, and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.total}</div>
            <p className="text-xs text-muted-foreground">All job orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.completed}</div>
            <Progress
              value={(jobStats.completed / jobStats.total) * 100}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobStats.in_progress}</div>
            <p className="text-xs text-muted-foreground">Active WIP</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobStats.total > 0
                ? Math.round((jobStats.completed / jobStats.total) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workers">Worker Performance</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="wip">WIP Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Job Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Worker Efficiency Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workerPerformance.map((worker, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{worker.worker_name}</span>
                      </div>
                      <Badge variant="secondary">
                        {worker.tasks_completed} tasks
                      </Badge>
                    </div>
                    <Progress value={worker.efficiency} />
                    <p className="text-xs text-muted-foreground">
                      Efficiency: {worker.efficiency.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorPerformance.map((vendor, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{vendor.vendor_name}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {vendor.jobs_completed} jobs
                        </Badge>
                        <Badge
                          variant={
                            vendor.quality_score >= 80 ? "default" : "destructive"
                          }
                        >
                          QC: {vendor.quality_score.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={vendor.quality_score} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wip" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work-in-Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Active Jobs</p>
                    <p className="text-2xl font-bold">{jobStats.in_progress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Pending Jobs</p>
                    <p className="text-2xl font-bold">{jobStats.pending}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">On Hold</p>
                    <p className="text-2xl font-bold">{jobStats.on_hold}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
