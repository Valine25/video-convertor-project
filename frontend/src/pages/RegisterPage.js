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
    setForm((prev) => ({ ...prev, [name]: value }));
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
          <div className="auth-layout">
          <motion.section
            className="auth-promo glass-card"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="brand">
              <div className="brand-mark">
                <BrandMark />
              </div>
              <div>
                <p className="brand-title">CinePulse Studio</p>
                <p className="brand-subtitle">Launch your personal short-form creation space</p>
              </div>
            </div>

            <h1>Create your creator workspace.</h1>
            <p>
              Create an account to unlock your upload dashboard, processing history, and clip previews inside one connected workspace.
            </p>

            <div className="auth-promo-grid">
              <div className="glass-card feature-card">
                <div className="feature-icon">01</div>
                <h3>Upload</h3>
                <p>Bring long content into a flow that feels designed for short-form output.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon">02</div>
                <h3>Analyze</h3>
                <p>Let transcript signals, energy, and timing identify the best moments.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon">03</div>
                <h3>Compose</h3>
                <p>Turn selected scenes into one stronger reel with a clearer story arc.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon">04</div>
                <h3>Publish</h3>
                <p>Preview final shorts and keep the dashboard ready for next uploads.</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="auth-card glass-card"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
          >
            <p className="showcase-label">Register</p>
            <h2>Open your account</h2>
            <p>Create your sign in details to access your personal dashboard.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="name">Full name</label>
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
                <label htmlFor="email">Email</label>
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
                <label htmlFor="password">Password</label>
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
                <label htmlFor="confirmPassword">Confirm password</label>
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

              <button type="submit" className="btn btn-primary auth-submit">
                {submitting ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            {error ? <div className="error-banner">{error}</div> : null}

            <p className="auth-footer">
              Already have an account? <Link className="auth-link" to="/login">Sign in here</Link>
            </p>
          </motion.section>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default RegisterPage;
