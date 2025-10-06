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

// Modules
import InfectionControl from "./pages/InfectionControl";
import Cleaning from "./pages/Cleaning";
import MonthEndScripts from "./pages/MonthEndScripts";
import FridgeTemps from "./pages/FridgeTemps";
import Incidents from "./pages/Incidents";

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
                <Route path="/schedule" element={<div className="p-6">Schedule coming soon...</div>} />
                <Route path="/month-end" element={<MonthEndScripts />} />
                <Route path="/claims" element={<div className="p-6">Enhanced Service Claims coming soon...</div>} />
                <Route path="/infection-control" element={<InfectionControl />} />
                <Route path="/cleaning" element={<Cleaning />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/fire-safety" element={<div className="p-6">Fire & H&S coming soon...</div>} />
                <Route path="/hr" element={<div className="p-6">HR coming soon...</div>} />
                <Route path="/complaints" element={<div className="p-6">Complaints coming soon...</div>} />
                <Route path="/medical-requests" element={<div className="p-6">Insurance/Medicals coming soon...</div>} />
                <Route path="/policies" element={<div className="p-6">Policies Library coming soon...</div>} />
                <Route path="/fridge-temps" element={<FridgeTemps />} />
                <Route path="/reports" element={<div className="p-6">Reports coming soon...</div>} />
                
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
