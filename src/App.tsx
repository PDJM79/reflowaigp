import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MasterUserProvider } from "@/hooks/useMasterUser";
import Index from "./pages/Index";
import ResetPassword from "./pages/ResetPassword";
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
              <Route path="/" element={<Index />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/task/:taskId" element={<TaskDetail />} />
              <Route path="/task/:taskId/step/:stepIndex" element={<StepExecution />} />
              <Route path="/processes" element={<AllProcesses />} />
              <Route path="/risk-register" element={<RiskRegister />} />
              <Route path="/team" element={<TeamDashboard />} />
              <Route path="/admin/calendar" element={<AdminCalendar />} />
              <Route path="/admin/reports" element={<AdminReports />} />
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
