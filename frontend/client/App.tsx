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
import { EvidencePage } from "./pages/Evidence";
import AdminUsers from "./pages/AdminUsers";
import AdminVerifications from "./pages/AdminVerifications";
import Messages from "./pages/Messages";
import ProposalDetail from "./pages/ProposalDetail";
import Disputes from "./pages/Disputes";

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
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-job"
              element={
                <ProtectedRoute>
                  <CreateJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-processing"
              element={
                <ProtectedRoute>
                  <AIProcessing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generated-jd"
              element={
                <ProtectedRoute>
                  <GeneratedJD />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-input"
              element={
                <ProtectedRoute>
                  <ContentInput />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <JobsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/matching"
              element={
                <ProtectedRoute>
                  <Matching />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidate-detail"
              element={
                <ProtectedRoute>
                  <CandidateDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/explainable-matching"
              element={
                <ProtectedRoute>
                  <ExplainableMatching />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview-scheduler"
              element={
                <ProtectedRoute>
                  <InterviewScheduler />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contract-milestone"
              element={
                <ProtectedRoute>
                  <ContractMilestone />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project-workspace"
              element={
                <ProtectedRoute>
                  <ProjectWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <Wallet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/content-result"
              element={
                <ProtectedRoute>
                  <ContentResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/upload"
              element={
                <ProtectedRoute>
                  <CVUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/trust-passport"
              element={
                <ProtectedRoute>
                  <TrustPassportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/freelancer/verification/evidence/:documentId"
              element={
                <ProtectedRoute>
                  <EvidencePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals/:id"
              element={
                <ProtectedRoute>
                  <ProposalDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute>
                  <AdminVerifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disputes"
              element={
                <ProtectedRoute>
                  <Disputes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/disputes/:id"
              element={
                <ProtectedRoute>
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
