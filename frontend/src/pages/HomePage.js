import "../styles/theme.css";
import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";
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

  const handleUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      console.log("Uploaded:", file.name);

      const video = document.getElementById("preview-video");
      const fileName = document.getElementById("uploaded-file-name");

      fileName.innerText = file.name;

      video.src = URL.createObjectURL(file);
      video.load();
    }
  };

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
        onClick={() => window.location.href = "/dashboard"}
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

    {/* Upload Box */}
    <label className="upload-box">

      <input
        type="file"
        accept="video/*"
        hidden
        onChange={handleUpload}
      />

      <h3>Drag & Drop Video Here</h3>

      <p>Upload MP4 / MOV videos</p>

      <div
        className="uploaded-file"
        id="uploaded-file-name"
      >
        No file selected
      </div>

    </label>

    {/* Preview */}
    <div className="preview-section">

      <h4>Preview</h4>

      <div className="video-preview">

        <video
          id="preview-video"
          controls
        >
        </video>

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