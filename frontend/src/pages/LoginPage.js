import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/theme.css";

import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";

import { useAuth } from "../context/AuthContext";

import {
  CaptionIcon,
  FrameIcon,
  PulseIcon,
  TrimIcon,
} from "../components/FeatureIcons";

function LoginPage() {

  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || "/dashboard";

  const handleChange = (event) => {

    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {

    event.preventDefault();

    setSubmitting(true);

    setError("");

    const result = await login(form);

    setSubmitting(false);

    if (!result.ok) {

      setError(result.message);

      return;
    }

    navigate(from, { replace: true });
  };

  return (

    <div className="site-shell auth-shell">

      <SceneBackground />

      <PageTransition>

        <div className="page">

          <TopNav showHome />

          <div className="login-layout">

            {/* LEFT SIDE */}

            <motion.section
              className="login-left"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >

              <div className="login-hero">

                <div className="brand-row">

                  

                </div>

                <h2>
                  Step back into your editing cockpit.
                </h2>

                <p className="hero-text">
                  Sign in to continue managing highlights,
                  exports, and caption-ready reels from your workspace.
                </p>

              </div>

              <div className="login-feature-grid">

                <div className="login-feature-card glass-card">

                  <div className="feature-icon">
                    <TrimIcon />
                  </div>

                  <h3>Highlight Scoring</h3>

                  <p>
                    Prioritize the strongest segments from long-form content.
                  </p>

                </div>

                <div className="login-feature-card glass-card">

                  <div className="feature-icon">
                    <CaptionIcon />
                  </div>

                  <h3>Caption Layers</h3>

                  <p>
                    Bring timed subtitles into every rendered short automatically.
                  </p>

                </div>

                <div className="login-feature-card glass-card">

                  <div className="feature-icon">
                    <PulseIcon />
                  </div>

                  <h3>Final Reel Output</h3>

                  <p>
                    Shape one stronger short-form reel from a single uploaded source.
                  </p>

                </div>

                <div className="login-feature-card glass-card">

                  <div className="feature-icon">
                    <FrameIcon />
                  </div>

                  <h3>Vertical Ready</h3>

                  <p>
                    Shape content for reels, shorts, and mobile-first viewing.
                  </p>

                </div>

              </div>

            </motion.section>

            {/* RIGHT SIDE */}

            <motion.section
              className="login-right glass-card"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >

              <div className="showcase-label">
                SIGN IN
              </div>

              <h2>Welcome back</h2>

              <p className="login-desc">
                Use the account you created to continue to your dashboard.
              </p>

              <form className="login-form" onSubmit={handleSubmit}>

                <div className="auth-field">

                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    className="auth-input"
                    placeholder="creator@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-field">

                  <label>Password</label>

                  <input
                    type="password"
                    name="password"
                    className="auth-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="auth-footer auth-footer-small">
                  <Link className="auth-link" to="/forgot-password">
                    Forgot your password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="btn btn-accent auth-submit"
                >

                  {submitting
                    ? "Signing In..."
                    : "Enter Dashboard"}

                </button>

              </form>

              {error && (
                <div className="error-banner">
                  {error}
                </div>
              )}

              <p className="auth-footer">

                New here?

                <Link
                  className="auth-link"
                  to="/register"
                >
                  {" "}Create your account
                </Link>

              </p>

            </motion.section>

          </div>

        </div>

      </PageTransition>

    </div>
  );
}

export default LoginPage;