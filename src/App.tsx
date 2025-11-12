import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MasterUserProvider } from "@/hooks/useMasterUser";
import { AppLayout } from "@/components/layout/AppLayout";
import '@/i18n/config';

// Auth & Public Pages
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";

// Dashboard & Settings
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";

// Task Management
import TaskTemplates from "./pages/TaskTemplates";
import TasksList from "./pages/TasksList";
import Schedule from "./pages/Schedule";

// Modules
import InfectionControl from "./pages/InfectionControl";
import Cleaning from "./pages/Cleaning";
import MonthEndScripts from "./pages/MonthEndScripts";
import FridgeTemps from "./pages/FridgeTemps";
import Incidents from "./pages/Incidents";
import Claims from "./pages/Claims";
import FireSafety from "./pages/FireSafety";
import HR from "./pages/HR";
import StaffSelfService from "./pages/StaffSelfService";
import Complaints from "./pages/Complaints";
import MedicalRequests from "./pages/MedicalRequests";
import Policies from "./pages/Policies";
import PolicyReviewHistory from "./pages/PolicyReviewHistory";
import Reports from "./pages/Reports";
import EmailLogs from "./pages/EmailLogs";
import EmailReportsSettings from "./pages/EmailReportsSettings";

// Phase 3 Dashboards
import ComplianceOverview from "./pages/dashboards/ComplianceOverview";
import ClinicalGovernance from "./pages/dashboards/ClinicalGovernance";
import WorkforceDashboard from "./pages/dashboards/WorkforceDashboard";
import EnvironmentalDashboard from "./pages/dashboards/EnvironmentalDashboard";
import ComplaintsPatientExperience from "./pages/dashboards/ComplaintsPatientExperience";
import DashboardsHub from "./pages/DashboardsHub";

// Update Pack v2.0 Pages
import IPC from "./pages/IPC";
import IPCAuditDetail from "./pages/IPCAuditDetail";
import RoomAssessments from "./pages/RoomAssessments";
import IncidentsList from "./pages/IncidentsList";

// Existing Pages (to be migrated)
import TaskDetail from "./pages/TaskDetail";
import StepExecution from "./pages/StepExecution";
import AllProcesses from "./pages/AllProcesses";
import RiskRegister from "./pages/RiskRegister";
import TeamDashboard from "./pages/TeamDashboard";
import AdminCalendar from "./pages/AdminCalendar";
import AdminReports from "./pages/AdminReports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MasterUserProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes with AppLayout */}
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Task Management */}
                <Route path="/task-templates" element={<TaskTemplates />} />
                <Route path="/tasks" element={<TasksList />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/month-end" element={<MonthEndScripts />} />
                <Route path="/claims" element={<Claims />} />
                <Route path="/infection-control" element={<InfectionControl />} />
                <Route path="/cleaning" element={<Cleaning />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/fire-safety" element={<FireSafety />} />
                <Route path="/hr" element={<HR />} />
                <Route path="/staff-self-service" element={<StaffSelfService />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/medical-requests" element={<MedicalRequests />} />
                <Route path="/policies" element={<Policies />} />
                <Route path="/policies/review-history" element={<PolicyReviewHistory />} />
                <Route path="/fridge-temps" element={<FridgeTemps />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/email-logs" element={<EmailLogs />} />
                <Route path="/email-reports-settings" element={<EmailReportsSettings />} />
                
                {/* Phase 3 Specialized Dashboards */}
                <Route path="/dashboards" element={<DashboardsHub />} />
                <Route path="/dashboards/compliance" element={<ComplianceOverview />} />
                <Route path="/dashboards/clinical" element={<ClinicalGovernance />} />
                <Route path="/dashboards/workforce" element={<WorkforceDashboard />} />
                <Route path="/dashboards/environmental" element={<EnvironmentalDashboard />} />
                <Route path="/dashboards/patient-experience" element={<ComplaintsPatientExperience />} />
                
                {/* Update Pack v2.0 Routes */}
                <Route path="/ipc" element={<IPC />} />
                <Route path="/ipc/audit/:auditId" element={<IPCAuditDetail />} />
                <Route path="/room-assessments" element={<RoomAssessments />} />
                <Route path="/incidents-list" element={<IncidentsList />} />
                
                {/* Legacy Routes (keeping for compatibility) */}
                <Route path="/task/:taskId" element={<TaskDetail />} />
                <Route path="/task/:taskId/step/:stepIndex" element={<StepExecution />} />
                <Route path="/processes" element={<AllProcesses />} />
                <Route path="/risk-register" element={<RiskRegister />} />
                <Route path="/team" element={<TeamDashboard />} />
                <Route path="/admin/calendar" element={<AdminCalendar />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </MasterUserProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
