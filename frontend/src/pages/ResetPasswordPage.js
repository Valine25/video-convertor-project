import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import "../styles/theme.css";

import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        `http://localhost:5001/api/auth/reset-password/${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const data = await response.json();
      setSubmitting(false);

      if (response.ok) {
        setMessage(data.message || "Password saved. You may log in now.");
        setTimeout(() => {
          navigate("/login");
        }, 1800);
      } else {
        setError(data.message || "Unable to reset password.");
      }
    } catch (error) {
      console.log(error);
      setSubmitting(false);
      setError("Server Error");
    }
  };

  return (
    <div className="site-shell auth-shell">
      <SceneBackground />
      <PageTransition>
        <div className="page">
          <TopNav showHome />
          <div className="login-layout">
            <motion.section
              className="login-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="login-hero">
                <div className="brand-row"></div>
                <h2>Reset your password</h2>
                <p className="hero-text">
                  You can reset your password now for the account that owns
                  this email.
                </p>
              </div>
            </motion.section>

            <motion.section
              className="login-right glass-card"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="showcase-label">RESET PASSWORD</div>

              <h2>Create a new password</h2>

              <p className="login-desc">
                Enter your new password twice and submit to update your account.
              </p>

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>New password</label>
                  <input
                    type="password"
                    name="password"
                    className="auth-input"
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label>Confirm password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="auth-input"
                    placeholder="Repeat your new password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-accent auth-submit">
                  {submitting ? "Saving password..." : "Save new password"}
                </button>
              </form>

              {message && <div className="success-banner">{message}</div>}
              {error && <div className="error-banner">{error}</div>}

              <p className="auth-footer">
                Back to{' '}
                <Link className="auth-link" to="/login">
                  Sign in
                </Link>
              </p>
            </motion.section>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default ResetPasswordPage;
