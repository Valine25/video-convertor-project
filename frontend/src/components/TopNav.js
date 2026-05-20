import { Link } from "react-router-dom";
import "../styles/theme.css";
import BrandMark from "./BrandMark";

function TopNav({ showHome = false, showAuth = false, rightContent = null }) {
  return (
    <header className="topbar topbar-compact">
      <div className="brand compact">
        <div className="brand-mark small">
          <BrandMark />
        </div>

        <div className="brand-text">
          <div className="brand-title">PulseForge</div>
          <div className="brand-subtle">
            Create • Trim • Share
          </div>
        </div>
      </div>

      <nav className="nav-actions compact">
        <div className="nav-left">
          {showHome ? (
            <Link to="/" className="link-muted">
              Home
            </Link>
          ) : null}
        </div>

        <div className="nav-right">
          {showAuth ? (
            <>
              <Link to="/login" className="btn-ghost">
                Sign In
              </Link>

              <Link to="/register" className="btn-accent">
                Get Started
              </Link>
            </>
          ) : null}

          {rightContent}
        </div>
      </nav>
    </header>
  );
}

export default TopNav;