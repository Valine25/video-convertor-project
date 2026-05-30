import "../styles/theme.css";
import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";
import BrandMark from "../components/BrandMark";
import {
  CaptionIcon,
  FrameIcon,
  PulseIcon,
  TrimIcon,
} from "../components/FeatureIcons";

const features = [
  {
    title: "Smart Reel Generation",
    text: "Turn long videos into one polished video output with a focused narrative.",
    Icon: TrimIcon,
  },
  {
    title: "Automatic Captions",
    text: "Add subtitle-ready captions for English, Hindi, and Kannada quickly.",
    Icon: CaptionIcon,
  },
  {
    title: "Social Copy Built In",
    text: "Generate captions, hashtags, and thumbnail text that match your footage.",
    Icon: PulseIcon,
  },
 {
    title: "Vertical Export",
    text: "Produce one platform-ready reel optimized for Instagram Reels and YouTube Shorts.",
    Icon: FrameIcon,
  },
];

const stats = [
  { value: "15m", label: "accepts long-form uploads" },
  { value: "3", label: "languages supported" },
  { value: "9:16", label: "portrait-ready delivery" },
];

function HomePage() {

  return (
    <div className="site-shell">
      <SceneBackground />

      <PageTransition>
        <div className="page">

          <TopNav showAuth />

          <section className="hero">

  {/* LEFT SIDE */}
  <div className="hero-copy">

    <div className="eyebrow">
      Smart short-form video from long-form content
    </div>

    <h1 className="hero-title">
      Turn long-form videos into
      <span className="hero-highlight">
        {" "}viral-ready shorts.
      </span>
    </h1>

    <p className="hero-text">
      Upload a single source video and get one refined short with
      captions, thumbnail concept, hashtags, and export settings
      tuned for reels and social feeds.
    </p>

    <div className="hero-actions">

      <button
        className="btn-primary"
        onClick={() => window.location.href = "/register"}
      >
        Start Creating
      </button>

      <button
        className="btn-secondary"
        onClick={() => {
          document
            .getElementById("features-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        See How It Works
      </button>

    </div>

  </div>

  {/* RIGHT SIDE */}
  <div className="hero-right">
    <div className="hero-logo-card glass-card">
      <div className="logo-circle">
        <div className="logo-rotator">
          <BrandMark />
        </div>
        <div className="logo-ring ring-one" />
        <div className="logo-ring ring-two" />
        <div className="logo-ring ring-three" />
      </div>
      <div className="logo-copy">
        
      </div>
    </div>
  </div>

</section>

          {/* FEATURES */}
          <section
            className="feature-section"
            id="features-section"
          >

            <div className="section-header">

              <div>

                <div className="showcase-label">
                  WHAT THE PRODUCT DELIVERS
                </div>

                <h2>
                  A streamlined workflow for creators,
                  editors, and social teams.
                </h2>

              </div>

            </div>

            <div className="feature-grid">

              {features.map(({ title, text, Icon }) => (

                <div
                  key={title}
                  className="feature-card glass-card"
                >

                  <div className="feature-icon">
                    <Icon />
                  </div>

                  <h3>{title}</h3>

                  <p>{text}</p>

                </div>

              ))}

            </div>

          </section>

          {/* STATS */}
          <section className="stats-strip">

            {stats.map((item) => (

              <div
                key={item.label}
                className="mini-card glass-card"
              >

                <strong>{item.value}</strong>

                <span>{item.label}</span>

              </div>

            ))}

          </section>
          <section className="final-cta">

  <div className="final-cta-content">

    <h2>Ready to turn long videos into viral shorts?</h2>
      <button
        className="scroll-top-btn"
        onClick={() =>
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      >
        ↑
      </button>
{/* 
    <p>
      Upload once and let AI generate highlights,
      captions, thumbnails, and social-ready reels.
    </p> */}

    

    

    

  </div>

</section>

        </div>
      </PageTransition>
    </div>
  );
}

export default HomePage;