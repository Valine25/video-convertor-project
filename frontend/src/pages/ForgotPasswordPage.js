import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import "../styles/theme.css";

import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch(
        "http://localhost:5001/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      setSubmitting(false);

      if (response.ok) {
        if (data.resetToken) {
          navigate(`/reset-password/${data.resetToken}`);
          return;
        }

        setMessage(data.message || "Continue to reset your password.");
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
                <h2>Forgot your password?</h2>
                <p className="hero-text">
                  Enter the email for your account and continue to reset your
                  password directly.
                </p>
              </div>

              <div className="login-feature-grid">
                <div className="login-feature-card glass-card">
                  <h3>Quick reset</h3>
                  <p>
                    Verify your account email and continue directly to password reset.
                  </p>
                </div>
                <div className="login-feature-card glass-card">
                  <h3>No email required</h3>
                  <p>
                    The reset happens instantly in the app, without waiting for a message.
                  </p>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="login-right glass-card"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="showcase-label">PASSWORD RESET</div>

              <h2>Reset access</h2>

              <p className="login-desc">
                Enter your account email and continue directly to password reset.
              </p>

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    className="auth-input"
                    placeholder="creator@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-accent auth-submit">
                  {submitting ? "Continuing..." : "Continue to reset"}
                </button>
              </form>

              {message && <div className="success-banner">{message}</div>}
              {error && <div className="error-banner">{error}</div>}

              <p className="auth-footer">
                Remembered your password?{' '}
                <Link className="auth-link" to="/login">
                  Back to login
                </Link>
              </p>
            </motion.section>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default ForgotPasswordPage;
