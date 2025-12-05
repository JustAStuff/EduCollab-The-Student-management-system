import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CreateWorkspace from "./CreateWorkspace";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
import PublicChat from "./PublicChat";
import MyWorkspaces from "./MyWorkspaces";
import JoinWorkspace from "./JoinWorkspace";
import WorkspaceTL from "./WorkspaceTL";
import WorkspaceTM from "./WorkspaceTM";
import LandingPage from "./LandingPage";
import ProblemStatement from "./ProblemStatement";
import WorkspaceDashboard from "./WorkspaceDashboard";
import ToastNotification from "./components/notifications/ToastNotification";
import { SecurityProvider } from "./contexts/SecurityContext";
import EmailConfirmation from "./EmailConfirmation";
import AboutUs from "./AboutUs";


function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle auth state changes and email confirmation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session);

      if (event === 'SIGNED_IN' && session) {
        // User successfully signed in (including email confirmation)
        console.log('User signed in:', session.user);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }

      setLoading(false);
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Current session:', session);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <SecurityProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-workspace" element={<CreateWorkspace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/public-chat" element={<PublicChat />} />
        <Route path="/my-workspaces" element={<MyWorkspaces />} />
        <Route path="/join-workspace/:id" element={<JoinWorkspace />} />
        <Route path="/workspace-dashboard/:id" element={<WorkspaceDashboard />} />
        <Route path="/workspace/:id" element={<WorkspaceTL />} />
        <Route path="/workspace-member/:id" element={<WorkspaceTM />} />
        <Route path="/problem-statements" element={<ProblemStatement />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/about-us" element={<AboutUs/>}/>
      </Routes>
      <ToastNotification />
    </SecurityProvider>
  );
}

export default App;