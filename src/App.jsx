import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";      
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CreateWorkspace from "./CreateWorkspace";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
import ProblemStatementPage from "./ProblemStatement";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-workspace" element={<CreateWorkspace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/problem-statement" element={<ProblemStatementPage />} />
    </Routes>
  );
}

export default App;
