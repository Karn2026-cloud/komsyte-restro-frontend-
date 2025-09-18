import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import "./style.css";

export default function SignUp() {
  const [formData, setFormData] = useState({ shopName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/api/signup", formData);
      alert("Signup successful! Please log in.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        <h2>Create Your Account</h2>
        <form onSubmit={handleSignup}>
          <input
            type="text"
            name="shopName"
            placeholder="Restaurant Name"
            value={formData.shopName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 chars)"
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
