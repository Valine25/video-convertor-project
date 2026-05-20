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
  generating_reels: "Generating Reel",
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

 

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [captionsCopied, setCaptionsCopied] = useState(false);

  const [hashtagsCopied, setHashtagsCopied] = useState(false);

  const messageTimeoutRef = useRef(null);

  const clearMessageTimeout = () => {
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
  };

  const showSuccess = (message, duration = 3000) => {
    clearMessageTimeout();
    setError("");
    setSuccess(message);
    messageTimeoutRef.current = window.setTimeout(() => {
      setSuccess("");
      messageTimeoutRef.current = null;
    }, duration);
  };

  const showError = (message, duration = 4000) => {
    clearMessageTimeout();
    setSuccess("");
    setError(message);
    messageTimeoutRef.current = window.setTimeout(() => {
      setError("");
      messageTimeoutRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      clearMessageTimeout();
    };
  }, []);

  const activeVideo = useMemo(
    () =>
      videos.find((video) => video._id === selectedVideoId) ||
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
          "generating_reels",
        ].includes(video.status)
      ),
    [videos]
  );

  const loadVideos = useCallback(async () => {
    if (!currentUser?._id) return;

    try {
      const result = await listVideos(currentUser._id);

      setVideos(result);
      if (result.length > 0) {
          setSelectedVideoId(result[0]._id);
      }
    } catch (err) {
      showError(err.message || "Error loading videos.");
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
          const result = await getVideoById(item._id);

          setVideos((prev) =>
            prev.map((video) =>
              video._id === item._id ? result : video
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
      showError("Please choose a video file.");
      return;
    }

    setUploading(true);

    clearMessageTimeout();

    try {
      const result = await uploadVideo({
        file: selectedFile,
        userId: currentUser._id,
      });

      showSuccess("Upload started successfully.");

      // RELOAD HISTORY
      loadVideos();
    } catch (err) {
      showError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

const handleDownload = async (fileUrl, filename) => {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error("Download failed");
    }
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (err) {
    showError("Failed to download file.");
  }
};

const handleDeleteVideo = async (videoId) => {

  const confirmDelete = window.confirm(
    "Delete this video permanently?"
  );

  if (!confirmDelete) return;

  try {

    await deleteVideo(
      videoId,
      currentUser._id
    );

    setVideos((prev) =>
      prev.filter((video) => video._id !== videoId)
    );

    showSuccess("Video deleted!");
  } catch (err) {
    console.log(err);
    showError(err.message || "Delete failed.");
  }
};

const handleCopyCaptions = async () => {

  if (!activeVideo?.captions) return;

  try {

    await navigator.clipboard.writeText(
      activeVideo.captions
    );

    setCaptionsCopied(true);

    setTimeout(() => {
      setCaptionsCopied(false);
    }, 2000);

  } catch {
    showError("Failed to copy captions.");
  }
};

const handleCopyHashtags = async () => {

  if (!activeVideo?.hashtags?.length)
    return;

  try {

    const text =
      activeVideo.hashtags.join(" ");

    await navigator.clipboard.writeText(
      text
    );

    setHashtagsCopied(true);

    setTimeout(() => {
      setHashtagsCopied(false);
    }, 2000);

  } catch {
    showError("Failed to copy hashtags.");
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
               Welcome back, {currentUser?.fullName || "Creator"}  
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

    <p>Upload MP4 videos</p>

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

  )  : (

    <div className="preview-placeholder">
      Video preview will appear here
    </div>

  )}

</div>

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

    {success && (
    <div className="success-box inline-success">
      {success}
    </div>
  )}

  {error && (
    <div className="error-box inline-success">
      {error}
    </div>
  )}


  </div>
  

</section>

{/* results */}

<section className="results-wrapper">

  {/* TOP RESULT GRID */}

  <div className="results-grid">

    {/* CAPTIONS */}

    <div className="result-card glass-card">

      <div className="result-top">

        <h3>AI Captions</h3>

        <button className="mini-btn" onClick={handleCopyCaptions}>
          {captionsCopied ? "Copied!" : "Copy"}
        </button>

      </div>

      {uploading ? (

        <div className="loading-box">
          Generating captions...
        </div>

      ) : (

      <p>
  {
    activeVideo?.captions ||
    "AI captions will appear here after processing."
  }
</p>

      )}

    </div>

    {/* VIRALITY */}

    <div className="result-card glass-card">

      <div className="result-top">
        <h3>Virality Score</h3>
      </div>

      {uploading ? (

        <div className="loading-box">
          Analyzing virality...
        </div>

      ) : (

        <div className="viral-score-box">

          <div className="viral-score">
            {activeVideo?.viralityScore || 0}%
          </div>

          <p>
            High engagement potential detected
          </p>

        </div>

      )}

    </div>

  </div>

  {/* HASHTAGS */}

  <div className="result-card glass-card hashtags-card">

    <div className="result-top">

      <h3>Hashtags</h3>

      <button className="mini-btn" onClick={handleCopyHashtags}>
        {hashtagsCopied ? "Copied!" : "Copy"}
      </button>

    </div>

    {uploading ? (

      <div className="loading-box">
        Generating hashtags...
      </div>

    ) : (
<div className="hashtag-wrap">

  {activeVideo?.hashtags?.length ? (

    activeVideo.hashtags.map((tag, index) => (

      <span
        key={index}
        className="hashtag-pill"
      >
        {tag}
      </span>

    ))

  ) : (

    <p>
      Hashtags will appear here after processing.
    </p>

  )}

</div>

    )}

  </div>

  {/* OUTPUT VIDEOS */}

  <div className="outputs-grid">

    {/* GENERATED REEL */}

    <div className="output-card glass-card">

  <div className="result-top">

    <h3>Generated Reel</h3>

    {activeVideo?.generatedReel && (

      <button
        className="mini-btn"
        onClick={() =>
          handleDownload(
            assetUrl(activeVideo.generatedReel),
            "generated-reel.mp4"
          )
        }
      >
        Download
      </button>

    )}

  </div>

  <br />

  {activeVideo?.generatedReel ? (

    <video
      controls
      className="result-video"
      src={assetUrl(activeVideo.generatedReel)}
    />

  ) : (

    <div className="loading-box">
      Waiting for reel...
    </div>

  )}

</div>

    {/* 9:16 REEL */}

      <div className="output-card glass-card">

  <div className="result-top">

    <h3>9:16 Platform Reel</h3>

    {activeVideo?.platformReel && (

      <button
        className="mini-btn"
        onClick={() =>
          handleDownload(
            assetUrl(activeVideo.platformReel),
            "platform-reel.mp4"
          )
        }
      >
        Download
      </button>

    )}

  </div>

  <br />

  {activeVideo?.platformReel ? (

    <video
      controls
      className="result-video vertical-video"
      src={assetUrl(activeVideo.platformReel)}
    />

  ) : (

    <div className="loading-box">
      Creating vertical reel...
    </div>

  )}

</div>

  </div>

  {/* THUMBNAIL */}

  <div className="output-card glass-card thumbnail-card">

  <div className="result-top">

    <h3>AI Thumbnail</h3>

    {activeVideo?.thumbnail && (

      <button
        className="mini-btn"
        onClick={() =>
          handleDownload(
            assetUrl(activeVideo.thumbnail),
            "thumbnail.jpg"
          )
        }
      >
        Download
      </button>

    )}

  </div>

  <br />

  {activeVideo?.thumbnail ? (

    <img
      src={assetUrl(activeVideo.thumbnail)}
      alt="AI Thumbnail"
      className="thumbnail-image"
    />

  ) : (

    <div className="thumbnail-placeholder">

      Thumbnail preview will appear here
      after AI generation.

    </div>

  )}

</div>

</section>

            {/* HISTORY */}


<section className="glass-card history-section">

  <div className="section-head">
    <h2>Recent Uploads</h2>
  </div>
{loading ? (

  <div className="empty-history-box">
    <div className="history-loader"></div>
    <p>Loading videos...</p>
  </div>

) : videos.length === 0 ? (

  <div className="empty-history-box">

    <div className="empty-history-icon">
      🎬
    </div>

    <h3>No videos yet</h3>

    <p>
      Upload your first long-form video and
      your AI-generated reels will appear here.
    </p>

  </div>

) : (

    <div className="history-grid">

      {videos.map((video) => (

        <div
          key={video._id}
          className="history-card"
        >

          <div>

            <h3>
              {video.originalName}
            </h3>

            <p>
              {statusLabels[video.status]}
            </p>
            <p className="history-time">
  {new Date(video.createdAt)
    .toLocaleString()}
</p>

          </div>

          <div className="history-actions">

            {video.generatedReel ? (

  <video
    controls
    className="history-video"
    src={assetUrl(video.generatedReel)}
  />

) : (

  <div className="video-processing">
    Processing...
  </div>

)}

            <button
              className="delete-btn"
              onClick={() =>
                handleDeleteVideo(video._id)
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