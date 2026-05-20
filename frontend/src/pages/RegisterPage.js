import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import "../styles/theme.css";

import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import BrandMark from "../components/BrandMark";
import TopNav from "../components/TopNav";

import { useAuth } from "../context/AuthContext";

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="site-shell auth-shell">
      <SceneBackground />

      <PageTransition>
        <div className="page">

          <TopNav showHome />

          <div className="login-layout">

            {/* LEFT SIDE */}

            <motion.div
              className="login-left"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >



              <div>

                <div className="showcase-label">
                  REGISTER
                </div>

                <h2>
                  Create your creator workspace.
                </h2>

                <p className="hero-text">
                  Create an account to unlock your upload dashboard,
                  processing history, and clip previews inside one
                  connected workspace.
                </p>

              </div>

              <div className="login-feature-grid">

                <div className="login-feature-card">

                  <div className="feature-number">
                    01
                  </div>

                  <h3>Upload</h3>

                  <p>
                    Bring long content into a flow designed
                    for short-form output.
                  </p>

                </div>

                <div className="login-feature-card">

                  <div className="feature-number">
                    02
                  </div>

                  <h3>Analyze</h3>

                  <p>
                    Detect hooks, reactions, and moments
                    with the highest engagement.
                  </p>

                </div>

                <div className="login-feature-card">

                  <div className="feature-number">
                    03
                  </div>

                  <h3>Generate</h3>

                  <p>
                    Build caption-ready vertical shorts
                    automatically.
                  </p>

                </div>

                <div className="login-feature-card">

                  <div className="feature-number">
                    04
                  </div>

                  <h3>Export</h3>

                  <p>
                    Publish optimized reels for YouTube,
                    Instagram, and TikTok.
                  </p>

                </div>

              </div>

            </motion.div>


            {/* RIGHT SIDE */}

            <motion.div
              className="login-right"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >

              <div className="showcase-label">
                CREATE ACCOUNT
              </div>

              <h2>
                Open your account
              </h2>

              <p className="hero-text">
                Create your sign in details to access
                your personal dashboard.
              </p>

              <form
                className="login-form"
                onSubmit={handleSubmit}
              >

                <div className="auth-field">

                  <label htmlFor="name">
                    Full name
                  </label>

                  <input
                    id="name"
                    className="auth-input"
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="email">
                    Email
                  </label>

                  <input
                    id="email"
                    className="auth-input"
                    type="email"
                    name="email"
                    placeholder="creator@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="password">
                    Password
                  </label>

                  <input
                    id="password"
                    className="auth-input"
                    type="password"
                    name="password"
                    placeholder="At least 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-field">

                  <label htmlFor="confirmPassword">
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    className="auth-input"
                    type="password"
                    name="confirmPassword"
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />

                </div>

                <button
                  type="submit"
                  className="btn btn-accent auth-submit"
                >
                  {submitting
                    ? "Creating Account..."
                    : "Create Account"}
                </button>

              </form>

              {error ? (
                <div className="error-banner">
                  {error}
                </div>
              ) : null}

              <div className="auth-footer">
                Already have an account?{" "}

                <Link
                  className="auth-link"
                  to="/login"
                >
                  Sign in here
                </Link>

              </div>

            </motion.div>

          </div>

        </div>
      </PageTransition>

    </div>
  );
}

export default RegisterPage;