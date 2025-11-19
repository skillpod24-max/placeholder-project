import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardLayout from "./pages/DashboardLayout";
import CompanyDashboard from "./pages/dashboard/CompanyDashboard";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import WorkerDashboard from "./pages/dashboard/WorkerDashboard";
import StatusUpdates from "./pages/StatusUpdates";
import CompanyVendors from "./pages/dashboard/company/Vendors";
import CompanyWorkers from "./pages/dashboard/company/Workers";
import CompanyJobs from "./pages/dashboard/company/Jobs";
import CompanyJobDetail from "./pages/dashboard/company/JobDetail";
import CompanyTeams from "./pages/dashboard/company/Teams";
import Billing from "./pages/dashboard/company/Billing";
import InvoiceApprovals from "./pages/dashboard/company/InvoiceApprovals";
import Sprints from "./pages/dashboard/company/Sprints";
import VendorWorkers from "./pages/dashboard/vendor/Workers";
import VendorJobs from "./pages/dashboard/vendor/Jobs";
import VendorJobTasks from "./pages/dashboard/vendor/JobTasks";
import VendorTeams from "./pages/dashboard/vendor/Teams";
import VendorBilling from "./pages/dashboard/vendor/Billing";
import WorkerJobs from "./pages/dashboard/worker/Jobs";
import WorkerJobTasks from "./pages/dashboard/worker/JobTasks";
import TeamHeadDashboard from "./pages/dashboard/vendor/TeamHead";
import CompanyResources from "./pages/dashboard/company/Resources";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="company" replace />} />
            <Route path="company" element={<CompanyDashboard />} />
            <Route path="company/vendors" element={<CompanyVendors />} />
            <Route path="company/workers" element={<CompanyWorkers />} />
            <Route path="company/jobs" element={<CompanyJobs />} />
            <Route path="company/jobs/:jobId" element={<CompanyJobDetail />} />
            <Route path="company/teams" element={<CompanyTeams />} />
            <Route path="company/resources" element={<CompanyResources />} />
            <Route path="company/billing" element={<Billing />} />
            <Route path="company/invoice-approvals" element={<InvoiceApprovals />} />
            <Route path="company/sprints" element={<Sprints />} />
            <Route path="vendor" element={<VendorDashboard />} />
            <Route path="vendor/workers" element={<VendorWorkers />} />
            <Route path="vendor/jobs" element={<VendorJobs />} />
            <Route path="vendor/jobs/:jobId/tasks" element={<VendorJobTasks />} />
            <Route path="vendor/teams" element={<VendorTeams />} />
            <Route path="vendor/billing" element={<VendorBilling />} />
            <Route path="worker" element={<WorkerDashboard />} />
            <Route path="worker/jobs" element={<WorkerJobs />} />
            <Route path="worker/tasks" element={<WorkerJobTasks />} />
            <Route path="worker/team-head" element={<TeamHeadDashboard />} />
            <Route path="status-updates" element={<StatusUpdates />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
