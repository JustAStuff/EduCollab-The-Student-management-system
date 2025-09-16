import { Routes, Route } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import CreateWorkspace from "./CreateWorkspace";
import ResetPassword from "./ResetPassword";
import ForgotPassword from "./ForgotPassword";
import PublicChat from "./PublicChat";
function App() {
  return (
    <div className="w-full flex h-screen justify-center items-center p-4">
      <div className="border-[1px] border-gray-700 max-w-6xl w-full min-h-[600px] rounded-lg">
        {/* Header */}
        <div className="flex justify-between h-20 border-b-[1px] border-gray-700"> 
          <div className="p-4" >
            <p className="text-gray-300">Sign in as name</p>
            <p className="text-gray-300 italic text-sm">3 users online</p>
          </div>
          <button className="m-2 sm:mr-4">Sing out</button>
        </div>
        {/* main chat */ }
        <div></div>
        {/*message input */}
        <form className="flex flex-col sm:flex-row p-4 border-t-[1px] border-gray-700">
          <input type ="text" placeholder="Type a message..." className="p-2 w-full bg-[#00000040] rounded-lg"/> 
          <button className="mt-4 sm:mt-0 sm:ml-8  text-white max-h-12"> Send</button>
        </form>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/create-workspace" element={<CreateWorkspace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword/>}/>
      <Route path="/public-chat" element={<PublicChat />}/>
    </Routes>
  );
}

export default App;