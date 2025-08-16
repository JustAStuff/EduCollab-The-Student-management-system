import { useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Auth.css";

function Register() {
  const [formData, setFormData] = useState({
    registerNumber: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);

    // Step 1: Register in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: "http://localhost:5173/login",
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // Step 2: Store in Users table
    const { error: insertError } = await supabase.from("Users").insert([
      {
        register_number: parseInt(formData.registerNumber, 10),
        full_name: formData.fullName,
        email: formData.email,
      },
    ]);

    if (insertError) {
      console.error(insertError.message);
      alert("Error saving user profile: " + insertError.message);
      setLoading(false);
      return;
    }

    alert("Registration successful! Check your email to confirm.");
    setLoading(false);
    navigate("/login");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>REGISTRATION</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            name="registerNumber"
            placeholder="Register number"
            value={formData.registerNumber}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="fullName"
            placeholder="Full name"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="College email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "REGISTER"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
