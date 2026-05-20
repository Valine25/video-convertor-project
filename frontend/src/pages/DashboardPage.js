import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/theme.css";

import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";

import { useAuth } from "../context/AuthContext";

import {
  assetUrl,
  deleteVideo,
  getVideoById,
  listVideos,
  uploadVideo,
} from "../api";

const statusLabels = {
  preprocessing: "Preprocessing",
  detecting_highlights: "Analyzing",
  generating_clips: "Generating Reel",
  completed: "Completed",
  failed: "Failed",
};

function DashboardPage() {
  const { currentUser, logout } = useAuth();

  const navigate = useNavigate();

  const pollingRef = useRef(null);

  const [videos, setVideos] = useState([]);

  const [selectedVideoId, setSelectedVideoId] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  const [videoPreview, setVideoPreview] = useState("");

  const [dragging, setDragging] = useState(false);

  const [uploadSettings, setUploadSettings] = useState({
    clipLength: 30,
    platform: "instagram",
    targetLanguage: "auto",
  });

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const activeVideo = useMemo(
    () =>
      videos.find((video) => video.id === selectedVideoId) ||
      videos[0] ||
      null,
    [videos, selectedVideoId]
  );

  const activeStatuses = useMemo(
    () =>
      videos.filter((video) =>
        [
          "preprocessing",
          "detecting_highlights",
          "generating_clips",
        ].includes(video.status)
      ),
    [videos]
  );

  const loadVideos = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const result = await listVideos(currentUser.id);

      setVideos(result.videos);

      if (result.videos.length > 0) {
        setSelectedVideoId(result.videos[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    window.clearInterval(pollingRef.current);

    if (!activeStatuses.length) return;

    pollingRef.current = window.setInterval(async () => {
      for (const item of activeStatuses) {
        try {
          const result = await getVideoById(item.id);

          setVideos((prev) =>
            prev.map((video) =>
              video.id === item.id ? result.video : video
            )
          );
        } catch (err) {
          console.log(err);
        }
      }
    }, 5000);

    return () => window.clearInterval(pollingRef.current);
  }, [activeStatuses]);

  const handleLogout = () => {
    logout();

    navigate("/", { replace: true });
  };

  const handleVideoSelection = (file) => {
    if (!file) return;

    setSelectedFile(file);

    const preview = URL.createObjectURL(file);

    setVideoPreview(preview);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setDragging(false);

    const file = event.dataTransfer.files[0];

    handleVideoSelection(file);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please choose a video file.");
      return;
    }

    setUploading(true);

    setError("");

    setSuccess("");

    try {
      const result = await uploadVideo({
        file: selectedFile,
        userId: currentUser.id,
        settings: uploadSettings,
      });

      setVideos((prev) => [result.video, ...prev]);

      setSelectedVideoId(result.video.id);

      setSuccess("Upload started successfully.");

      setSelectedFile(null);

      setVideoPreview("");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    try {
      await deleteVideo(videoId, currentUser.id);

      setVideos((prev) =>
        prev.filter((video) => video.id !== videoId)
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="site-shell dashboard-shell">
      <SceneBackground />

      <PageTransition>
        <div className="page">

          <TopNav
            rightContent={
  <div className="dashboard-nav-actions">

    <button
      className="nav-mini-btn"
      onClick={() => navigate("/")}
    >
      Home
    </button>

    <button
      className="nav-mini-btn logout-btn"
      onClick={handleLogout}
    >
      Logout
    </button>

  </div>
}
          />

          <main className="dashboard-main modern-dashboard">

            {/* HERO */}

            <section className="dashboard-hero glass-card">

              <p className="showcase-label">
                Dashboard
              </p>

              <h1>
               Welcome back, {currentUser?.name || "Creator"}  
              </h1>
              

              <p>
                Upload long-form videos and generate
                cinematic AI-powered reels instantly.
              </p>

            </section>

            {/* UPLOAD SECTION */}

            <section className="glass-card upload-main-card">

  {/* DRAG DROP */}

  <div
    className={`drag-drop-area ${
      dragging ? "drag-active" : ""
    }`}
    onDragOver={(e) => {
      e.preventDefault();
      setDragging(true);
    }}
    onDragLeave={() => setDragging(false)}
    onDrop={handleDrop}
  >

    <h2>Drag & Drop Video Here</h2>

    <p>Upload MP4 / MOV videos</p>

    <label className="upload-hidden-btn">

      {selectedFile
        ? selectedFile.name
        : "No file selected"}

      <input
        type="file"
        hidden
        accept="video/*"
        onChange={(e) =>
          handleVideoSelection(
            e.target.files?.[0]
          )
        }
      />

    </label>

  </div>

  {/* PREVIEW */}

  <div className="preview-section">

    <h2>Preview</h2>

    <div className="preview-video-box">

      {videoPreview ? (
        <video
          src={videoPreview}
          controls
          className="preview-video"
        />
      ) : (
        <div className="preview-placeholder">
          Video preview will appear here
        </div>
      )}

    </div>

  </div>

  {/* SETTINGS */}

  <div className="mini-settings-grid">

    <label className="auth-field">

      <span>Reel Length</span>

      <select
        className="auth-input"
        value={uploadSettings.clipLength}
        onChange={(e) =>
          setUploadSettings((prev) => ({
            ...prev,
            clipLength: Number(e.target.value),
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
        onChange={(e) =>
          setUploadSettings((prev) => ({
            ...prev,
            platform: e.target.value,
          }))
        }
      >
        <option value="instagram">
          Instagram Reels
        </option>

        <option value="youtube">
          YouTube Shorts
        </option>
      </select>

    </label>

    <label className="auth-field">

      <span>Language</span>

      <select
        className="auth-input"
        value={uploadSettings.targetLanguage}
        onChange={(e) =>
          setUploadSettings((prev) => ({
            ...prev,
            targetLanguage: e.target.value,
          }))
        }
      >
        <option value="auto">
          Auto Detect
        </option>

        <option value="english">
          English
        </option>

        <option value="hindi">
          Hindi
        </option>

        <option value="kannada">
          Kannada
        </option>
      </select>

    </label>

  </div>

  {/* BUTTONS */}

  <div className="upload-actions">

    <button
      className="btn btn-primary"
      onClick={handleUpload}
      disabled={uploading}
    >
      {uploading
        ? "Uploading..."
        : "Generate Reel"}
    </button>

    <button
      className="btn btn-secondary"
      onClick={loadVideos}
    >
      Refresh Status
    </button>

  </div>

</section>

            {/* HISTORY */}

            <section className="glass-card history-section">

              <div className="section-head">

                <h2>
                  Recent Uploads
                </h2>

              </div>

              {loading ? (
                <p>Loading videos...</p>
              ) : videos.length === 0 ? (
                <p>No uploads yet.</p>
              ) : (
                <div className="history-grid">

                  {videos.map((video) => (

                    <div
                      key={video.id}
                      className="history-card"
                    >

                      <div>

                        <h3>
                          {video.originalName}
                        </h3>

                        <p>
                          {
                            statusLabels[
                              video.status
                            ]
                          }
                        </p>

                      </div>

                      <div className="history-actions">

                        {video.clips?.length ? (
                          <video
                            controls
                            className="history-video"
                            src={assetUrl(
                              video.clips[0].url
                            )}
                          />
                        ) : (
                          <div className="video-processing">
                            Processing...
                          </div>
                        )}

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDeleteVideo(
                              video.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </section>

          </main>

        </div>
      </PageTransition>
    </div>
  );
}

export default DashboardPage;