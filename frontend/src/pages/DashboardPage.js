import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/theme.css";
import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";
import { CaptionIcon, FrameIcon, PulseIcon, TrimIcon } from "../components/FeatureIcons";
import { useAuth } from "../context/AuthContext";
import { assetUrl, deleteVideo, getVideoById, listVideos, uploadVideo } from "../api";

const tools = [
  {
    title: "Personalized Highlight Engine",
    text: "Ranks moments by emotion, motion, speech energy, creator goal, audience, and tone.",
    icon: <TrimIcon />,
  },
  {
    title: "Creator Copy Brief",
    text: "Captions, hashtags, thumbnail text, and retention reasons adapt to the input video.",
    icon: <CaptionIcon />,
  },
  {
    title: "Shorts Story Arc",
    text: "The final reel is planned as hook, tension, climax, and payoff instead of random cuts.",
    icon: <PulseIcon />,
  },
];

const statusLabels = {
  preprocessing: "Preprocessing",
  detecting_highlights: "Detecting highlights",
  generating_clips: "Generating clips",
  completed: "Completed",
  failed: "Failed",
};

function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const pollingRef = useRef(null);
  const overviewRef = useRef(null);
  const uploadRef = useRef(null);
  const shortsRef = useRef(null);
  const transcriptRef = useRef(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploadSettings, setUploadSettings] = useState({
    clipLength: 30,
    subtitles: true,
    platform: "instagram",
    targetLanguage: "auto",
    creatorGoal: "engagement",
    audience: "general",
    tone: "cinematic",
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  const activeVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) || videos[0] || null,
    [selectedVideoId, videos]
  );
  const transcriptPreview = activeVideo?.transcript
    ? (transcriptExpanded
      ? activeVideo.transcript
      : `${activeVideo.transcript.slice(0, 320)}${activeVideo.transcript.length > 320 ? "..." : ""}`)
    : "Transcript will appear here after preprocessing finishes.";

  const activeStatuses = useMemo(
    () =>
      videos.filter((video) =>
        ["preprocessing", "detecting_highlights", "generating_clips"].includes(video.status)
      ),
    [videos]
  );

  const sidebarItems = useMemo(
    () => [
      { id: "overview", label: "Dashboard Overview", ref: overviewRef },
      { id: "uploads", label: "Uploads & Status", ref: uploadRef },
      { id: "shorts", label: "Generated Shorts", ref: shortsRef },
      { id: "transcript", label: "Transcript View", ref: transcriptRef },
    ],
    []
  );

  const scrollToSection = (item) => {
    setActiveSection(item.id);
    const fallbackRef = item.id === "shorts" || item.id === "transcript" ? uploadRef : item.ref;
    const target = item.ref.current || fallbackRef.current;

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.focus?.({ preventScroll: true });
    }
  };

  const loadVideos = useCallback(async ({ keepSelection = true } = {}) => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const result = await listVideos(currentUser.id);
      setVideos(result.videos);

      if (!keepSelection && result.videos[0]) {
        setSelectedVideoId(result.videos[0].id);
      } else if (result.videos.length) {
        setSelectedVideoId((currentSelectedId) =>
          result.videos.some((video) => video.id === currentSelectedId)
            ? currentSelectedId
            : result.videos[0].id
        );
      }
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadVideos({ keepSelection: false });
  }, [loadVideos]);

  useEffect(() => {
    setTranscriptExpanded(false);
  }, [selectedVideoId]);

  useEffect(() => {
    window.clearInterval(pollingRef.current);

    if (!activeStatuses.length) {
      return undefined;
    }

    pollingRef.current = window.setInterval(async () => {
      for (const item of activeStatuses) {
        try {
          const result = await getVideoById(item.id);
          setVideos((prev) =>
            prev.map((video) => (video.id === item.id ? result.video : video))
          );
        } catch (apiError) {
          setError(apiError.message);
        }
      }
    }, 6000);

    return () => window.clearInterval(pollingRef.current);
  }, [activeStatuses]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleCopy = async (label, value) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setSuccess(`${label} copied.`);
      window.setTimeout(() => setSuccess(""), 1800);
    } catch (copyError) {
      setError(`Could not copy ${label.toLowerCase()}.`);
      window.setTimeout(() => setError(""), 1800);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a video file before uploading.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const result = await uploadVideo({
        file: selectedFile,
        thumbnail: selectedThumbnail,
        userId: currentUser.id,
        settings: uploadSettings,
      });
      setSuccess("Video uploaded. Processing has started.");
      setSelectedFile(null);
      setSelectedThumbnail(null);
      setVideos((prev) => [result.video, ...prev]);
      setSelectedVideoId(result.video.id);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (event, videoId) => {
    event.stopPropagation();

    const targetVideo = videos.find((video) => video.id === videoId);
    const confirmed = window.confirm(`Delete ${targetVideo?.originalName || "this video"} and its generated files?`);

    if (!confirmed) {
      return;
    }

    try {
      await deleteVideo(videoId, currentUser.id);
      setVideos((prev) => {
        const next = prev.filter((video) => video.id !== videoId);
        if (selectedVideoId === videoId) {
          setSelectedVideoId(next[0]?.id || "");
        }
        return next;
      });
      setSuccess("Video deleted.");
      window.setTimeout(() => setSuccess(""), 1800);
    } catch (apiError) {
      setError(apiError.message);
      window.setTimeout(() => setError(""), 2200);
    }
  };

  return (
    <div className="site-shell dashboard-shell">
      <SceneBackground />
      <PageTransition>
        <div className="page">
          <TopNav
            showHome
            rightContent={
              <button className="btn btn-danger" onClick={handleLogout}>
                Log Out
              </button>
            }
          />
          <div className="dashboard-layout">
            <aside className="sidebar glass-card">
              <div>
                <p className="brand-title">CinePulse Studio</p>
                <p className="brand-subtitle">Workspace for {currentUser?.name}</p>
              </div>

              <div style={{ marginTop: "28px" }} className="sidebar-menu">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-link ${activeSection === item.id ? "active" : ""}`}
                    onClick={() => scrollToSection(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="glass-card feature-card" style={{ marginTop: "28px", minHeight: "unset" }}>
                <div className="feature-icon"><FrameIcon /></div>
                <h3>Connected account</h3>
                <p>{currentUser?.email}</p>
              </div>
            </aside>

            <main className="dashboard-main">
              <section ref={overviewRef} tabIndex={-1} className="dashboard-hero glass-card dashboard-anchor">
                <p className="showcase-label">Dashboard</p>
                <h1>{currentUser?.name}, your smart shorts pipeline is live.</h1>
                <p>
                  Upload a long video, track processing stages, and review one polished transcript-aware reel from one connected workspace.
                </p>
              </section>

              <section className="dashboard-grid">
                {tools.map((tool, index) => (
                  <motion.article
                    key={tool.title}
                    className="dashboard-card glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                  >
                    <div className="feature-icon">{tool.icon}</div>
                    <h3>{tool.title}</h3>
                    <p>{tool.text}</p>
                  </motion.article>
                ))}
              </section>

              <section ref={uploadRef} tabIndex={-1} className="upload-card glass-card dashboard-anchor">
                <p className="showcase-label">Upload</p>
                <h2 className="dashboard-section-title">Send a source video into the pipeline</h2>

                <form className="upload-zone" onSubmit={handleUpload}>
                  <h3>Choose an MP4 or MOV file</h3>
                  <p>The backend will preprocess audio, detect highlights, and generate one personalized reel plus thumbnail, captions, hashtags, and a creative direction brief.</p>

                  <label className="file-picker">
                    <span>{selectedFile ? selectedFile.name : "Select video file"}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/*"
                      onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    />
                  </label>

                  <label className="file-picker">
                    <span>{selectedThumbnail ? selectedThumbnail.name : "Optional custom thumbnail image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/*"
                      onChange={(event) => setSelectedThumbnail(event.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="settings-grid">
                    <label className="auth-field">
                      <span>Reel length</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.clipLength}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            clipLength: Number(event.target.value),
                          }))
                        }
                      >
                        <option value={30}>30 seconds</option>
                        <option value={60}>60 seconds</option>
                      </select>
                    </label>

                    <label className="auth-field">
                      <span>Platform</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.platform}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            platform: event.target.value,
                          }))
                        }
                      >
                        <option value="instagram">Instagram Reels</option>
                        <option value="youtube">YouTube Shorts</option>
                      </select>
                    </label>

                    <label className="auth-field">
                      <span>Language</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.targetLanguage}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            targetLanguage: event.target.value,
                          }))
                        }
                      >
                        <option value="auto">Auto detect</option>
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                        <option value="kannada">Kannada</option>
                      </select>
                    </label>

                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={uploadSettings.subtitles}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            subtitles: event.target.checked,
                          }))
                        }
                      />
                      <span>Add subtitles to final reel</span>
                    </label>

                    <label className="auth-field">
                      <span>Creator goal</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.creatorGoal}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            creatorGoal: event.target.value,
                          }))
                        }
                      >
                        <option value="engagement">Engagement</option>
                        <option value="education">Education</option>
                        <option value="sales">Sales / product</option>
                        <option value="story">Emotional story</option>
                        <option value="portfolio">Portfolio proof</option>
                      </select>
                    </label>

                    <label className="auth-field">
                      <span>Audience</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.audience}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            audience: event.target.value,
                          }))
                        }
                      >
                        <option value="general">General viewers</option>
                        <option value="students">Students</option>
                        <option value="professionals">Professionals</option>
                        <option value="creators">Creators</option>
                        <option value="customers">Customers</option>
                      </select>
                    </label>

                    <label className="auth-field">
                      <span>Tone</span>
                      <select
                        className="auth-input"
                        value={uploadSettings.tone}
                        onChange={(event) =>
                          setUploadSettings((prev) => ({
                            ...prev,
                            tone: event.target.value,
                          }))
                        }
                      >
                        <option value="cinematic">Cinematic</option>
                        <option value="emotional">Emotional</option>
                        <option value="bold">Bold</option>
                        <option value="clean">Clean</option>
                        <option value="funny">Funny</option>
                      </select>
                    </label>
                  </div>

                  <div className="upload-actions">
                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                      {uploading ? "Uploading..." : "Upload and Process"}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => loadVideos()} disabled={loading}>
                      Refresh Status
                    </button>
                  </div>
                </form>

                {error ? <div className="error-banner">{error}</div> : null}
                {success ? <div className="success-banner">{success}</div> : null}
              </section>

              <section className="pipeline-card glass-card dashboard-anchor">
                <div className="dashboard-section-head">
                  <div>
                    <p className="showcase-label">History</p>
                    <h2 className="dashboard-section-title">Uploads and generated reel</h2>
                  </div>
                  {activeVideo ? (
                    <div className={`status-pill status-${activeVideo.status}`}>
                      {statusLabels[activeVideo.status] || activeVideo.status}
                    </div>
                  ) : null}
                </div>

                {loading ? (
                  <p className="dashboard-empty">Loading your videos...</p>
                ) : videos.length === 0 ? (
                  <p className="dashboard-empty">No uploads yet. Start with one long-form video above.</p>
                ) : (
                  <div className="video-workspace">
                    <div className="video-history">
                      {videos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          className={`video-history-item ${activeVideo?.id === video.id ? "active" : ""}`}
                          onClick={() => setSelectedVideoId(video.id)}
                        >
                          <span className="video-history-text">
                            <strong>{video.originalName}</strong>
                            <span>
                              {statusLabels[video.status] || video.status}
                              {video.settings?.clipLength ? ` | ${video.settings.clipLength}s` : ""}
                            </span>
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="delete-video-button"
                            onClick={(event) => handleDeleteVideo(event, video.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                handleDeleteVideo(event, video.id);
                              }
                            }}
                          >
                            Delete
                          </span>
                        </button>
                      ))}
                    </div>

                    {activeVideo ? (
                      <div className="video-detail">
                        <div className="video-detail-grid">
                          <div className="glass-card video-summary-card">
                            <p className="showcase-label">Processing Status</p>
                            <h3>{activeVideo.originalName}</h3>
                            <p>{statusLabels[activeVideo.status] || activeVideo.status}</p>
                            <p className="video-meta">
                              {activeVideo.sourceLanguage || "unknown"} to {activeVideo.analysisLanguage || "analysis pending"}
                            </p>
                            {activeVideo.failureReason ? (
                              <p className="video-failure">{activeVideo.failureReason}</p>
                            ) : null}
                          </div>

                          <div className="glass-card video-summary-card">
                            <p className="showcase-label">Highlights</p>
                            <h3>{activeVideo.highlights?.length || 0} moments</h3>
                            <p>
                              {activeVideo.duration
                                ? `${Math.round(activeVideo.duration)}s source duration`
                                : "Waiting for analysis"}
                            </p>
                          </div>

                          <div className="glass-card video-summary-card">
                            <p className="showcase-label">Final Reel</p>
                            <h3>{activeVideo.clips?.length ? "1 reel ready" : "Rendering"}</h3>
                            <p>
                              {activeVideo.status === "completed"
                                ? "Ready to preview below"
                                : "Your final reel will appear here"}
                            </p>
                            <p className="video-meta">
                              {activeVideo.settings?.clipLength || 30}s | {activeVideo.settings?.platform || "instagram"} | {activeVideo.settings?.tone || "cinematic"}
                            </p>
                          </div>

                          <div className="glass-card video-summary-card">
                            <p className="showcase-label">Viral Score</p>
                            <h3>{activeVideo.viralScore || 0}/100</h3>
                            <p>{activeVideo.contentInsights?.viralReasons?.[0] || "Heuristic score based on highlight strength, emotion, and social-ready pacing."}</p>
                          </div>
                        </div>

                        <div className="video-detail-panels">
                          <div ref={transcriptRef} tabIndex={-1} className="glass-card transcript-panel dashboard-anchor">
                            <p className="showcase-label">Transcript</p>
                            <div className="transcript-copy">
                              {transcriptPreview}
                            </div>
                            {activeVideo.transcript?.length > 320 ? (
                              <button
                                type="button"
                                className="btn btn-secondary transcript-toggle"
                                onClick={() => setTranscriptExpanded((prev) => !prev)}
                              >
                                {transcriptExpanded ? "Show Less" : "Show More"}
                              </button>
                            ) : null}
                          </div>

                          <div ref={shortsRef} tabIndex={-1} className="glass-card clips-panel dashboard-anchor">
                            <p className="showcase-label">Final Reel Preview</p>
                            {activeVideo.clips?.length ? (
                              <div className="clip-grid">
                                {activeVideo.clips.map((clip, index) => (
                                  <div key={clip.path || index} className="clip-card">
                                    <video
                                      controls
                                      preload="metadata"
                                      src={assetUrl(clip.url)}
                                      className="clip-player"
                                    />
                                    <a
                                      className="auth-link"
                                      href={assetUrl(clip.url)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open final reel
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="dashboard-empty">
                                Clips are not ready yet. The dashboard will keep refreshing while processing continues.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="video-detail-panels">
                          <div className="glass-card clips-panel">
                            <p className="showcase-label">Thumbnail</p>
                            {activeVideo.thumbnail?.url ? (
                              <div className="clip-card">
                                <img src={assetUrl(activeVideo.thumbnail.url)} alt="Generated thumbnail" className="clip-player" />
                                {activeVideo.thumbnail.title ? (
                                  <div className="utility-row">
                                    <p className="video-meta">{activeVideo.thumbnail.title}</p>
                                    <button
                                      type="button"
                                      className="copy-button"
                                      onClick={() => handleCopy("Thumbnail title", activeVideo.thumbnail.title)}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                ) : null}
                                <a
                                  className="auth-link"
                                  href={assetUrl(activeVideo.thumbnail.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open thumbnail
                                </a>
                              </div>
                            ) : (
                              <p className="dashboard-empty">Thumbnail will appear after the reel is generated.</p>
                            )}
                          </div>

                          <div className="glass-card transcript-panel">
                            <p className="showcase-label">Caption Suggestions</p>
                            {activeVideo.captionSuggestions?.length ? (
                              <div className="tag-list">
                                {activeVideo.captionSuggestions.map((caption) => (
                                  <div key={caption} className="tag-pill caption-pill">
                                    <span>{caption}</span>
                                    <button
                                      type="button"
                                      className="copy-button"
                                      onClick={() => handleCopy("Caption", caption)}
                                    >
                                      Copy
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="dashboard-empty">Caption suggestions will appear after analysis.</p>
                            )}
                          </div>

                          <div className="glass-card clips-panel">
                            <p className="showcase-label">Hashtags</p>
                            {activeVideo.hashtags?.length ? (
                              <>
                                <div className="utility-row utility-row-tight">
                                  <p className="video-meta">Platform-ready hashtag pack</p>
                                  <button
                                    type="button"
                                    className="copy-button"
                                    onClick={() => handleCopy("Hashtags", activeVideo.hashtags.join(" "))}
                                  >
                                    Copy all
                                  </button>
                                </div>
                                <div className="tag-list">
                                  {activeVideo.hashtags.map((tag) => (
                                    <div key={tag} className="tag-pill">{tag}</div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="dashboard-empty">Hashtags will appear after analysis.</p>
                            )}
                          </div>

                          <div className="glass-card transcript-panel">
                            <p className="showcase-label">Creative Direction</p>
                            {activeVideo.contentInsights?.hookLine ? (
                              <div className="insight-list">
                                <div className="insight-row">
                                  <span>Hook</span>
                                  <strong>{activeVideo.contentInsights.hookLine}</strong>
                                </div>
                                <div className="insight-row">
                                  <span>Emotion</span>
                                  <strong>{activeVideo.contentInsights.dominantEmotion || "unknown"}</strong>
                                </div>
                                <div className="insight-row">
                                  <span>Audience</span>
                                  <strong>{activeVideo.contentInsights.audience || activeVideo.settings?.audience || "general viewers"}</strong>
                                </div>
                                <div className="insight-row">
                                  <span>Goal</span>
                                  <strong>{activeVideo.contentInsights.creatorGoal || activeVideo.settings?.creatorGoal || "Engagement"}</strong>
                                </div>
                                <div className="insight-row">
                                  <span>Retention pattern</span>
                                  <strong>{activeVideo.contentInsights.retentionPattern || "Fast hook, rising curiosity, payoff"}</strong>
                                </div>
                                <div className="insight-row">
                                  <span>Thumbnail tag</span>
                                  <strong>{activeVideo.contentInsights.thumbnailSticker || "MUST WATCH"}</strong>
                                </div>
                                <div className="insight-summary">
                                  {activeVideo.contentInsights.personalizationAngle || activeVideo.contentInsights.reelSummary}
                                </div>
                                <div className="insight-summary">
                                  {activeVideo.contentInsights.thumbnailConcept || activeVideo.contentInsights.reelSummary}
                                </div>
                                <div className="tag-list">
                                  {(activeVideo.contentInsights.viralReasons || []).map((reason) => (
                                    <div key={reason} className="tag-pill caption-pill">{reason}</div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="dashboard-empty">Creative direction will appear after analysis.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            </main>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default DashboardPage;
