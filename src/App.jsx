import { Routes, Route } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CreateWorkspace from "./CreateWorkspace";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-workspace" element={<CreateWorkspace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
     
    </Routes>
  );
}

export default App;
