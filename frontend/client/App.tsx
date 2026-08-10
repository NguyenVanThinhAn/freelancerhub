import "./global.css";

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/auth/AuthContext";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import Index from "./pages/Index";
import CreateJob from "./pages/CreateJob";
import AIProcessing from "./pages/AIProcessing";
import GeneratedJD from "./pages/GeneratedJD";
import ContentInput from "./pages/ContentInput";
import JobsList from "./pages/JobsList";
import Matching from "./pages/Matching";
import CandidateDetail from "./pages/CandidateDetail";
import ExplainableMatching from "./pages/ExplainableMatching";
import InterviewScheduler from "./pages/InterviewScheduler";
import ContractMilestone from "./pages/ContractMilestone";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Wallet from "./pages/Wallet";
import ContentResult from "./pages/ContentResult";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import { CVUploadPage } from "./pages/CVUpload";
import { TrustPassportPage } from "./pages/TrustPassport";
import { FreelancerProfilePage } from "./pages/FreelancerProfile";
import { EvidencePage } from "./pages/Evidence";
import AdminUsers from "./pages/AdminUsers";
import AdminVerifications from "./pages/AdminVerifications";
import AdminDisputes from "./pages/AdminDisputes";
import AdminContactMonitor from "./pages/AdminContactMonitor";
import Messages from "./pages/Messages";
import ProposalDetail from "./pages/ProposalDetail";
import Disputes from "./pages/Disputes";
import BrowseJobs from "./pages/BrowseJobs";
import TaxEstimation from "./pages/TaxEstimation";
import MyProjects from "./pages/MyProjects";
import Pricing from "./pages/Pricing";
import MyInterviews from "./pages/MyInterviews";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Protected routes — require login */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise", "admin"]}>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-job"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <CreateJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-processing"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <AIProcessing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generated-jd"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <GeneratedJD />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-input"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <ContentInput />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <JobsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matching"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <Matching />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate-detail/:id"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <CandidateDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explainable-matching/:id"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <ExplainableMatching />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-scheduler/:id"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <InterviewScheduler />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-scheduler"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <InterviewScheduler />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contract-milestone"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <ContractMilestone />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:contractId"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise"]}>
                  <ProjectWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-workspace"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise"]}>
                  <ProjectWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-result"
              element={
                <ProtectedRoute allowedRoles={["business", "enterprise"]}>
                  <ContentResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/upload"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <CVUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/trust-passport"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <TrustPassportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-interviews"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <MyInterviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tax-estimation"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <TaxEstimation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/profile"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <FreelancerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/verification/evidence/:documentId"
              element={
                <ProtectedRoute allowedRoles={["freelancer"]}>
                  <EvidencePage />
                </ProtectedRoute>
              }
            />

            {/* ────── Browse Jobs (cả freelancer + business + admin) ────── */}
            <Route
              path="/jobs/browse"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise", "admin"]}>
                  <BrowseJobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-projects"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise"]}>
                  <MyProjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise"]}>
                  <Pricing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminVerifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDisputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contact-monitor"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminContactMonitor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise", "admin"]}>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disputes"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise", "admin"]}>
                  <Disputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disputes/:id"
              element={
                <ProtectedRoute allowedRoles={["freelancer", "business", "enterprise", "admin"]}>
                  <Disputes />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
