import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./Auth.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(error.message);
    else setMessage("Login successful!");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>LOGIN</h2>
        <input type="email" placeholder="College email address" />
        <input type="password" placeholder="Password" />
        <a href="#" className="forgot">Forgot password?</a>
        <button>LOGIN</button>
        <p className="message">Upon success, redirect to main dashboard.</p>
      </div>
    </div>
  );
}

export default Login;
