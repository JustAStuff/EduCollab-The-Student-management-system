import {BrowserRouter as Router, Routes, Route , Navigate } from "react-router-dom";
import {useState, useEffect} from "react";
import {supabase} from "./supabaseClient";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CreateWorkspace from "./CreateWorkspace";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
import JoinWorkspace from "./JoinWorkspace";
import WorkspaceTL from "./WorkspaceTL";
import WorkspaceTM from "./WorkspaceTM";
// import ProblemStatement from "./ProblemStatement";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-workspace" element={<CreateWorkspace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/join-workspace/:id" element={<JoinWorkspace />} />
      <Route path="/workspace/:id" element={<WorkspaceTL />} />
      <Route path="/workspace-member/:id" element={<WorkspaceTM />} />
      {/* <Route path="/problem-statement" element={<ProblemStatement />} /> */}

     
    </Routes>
  );
}

export default App;
