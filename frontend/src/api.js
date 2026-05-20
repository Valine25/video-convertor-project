const fallbackHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  `http://${fallbackHost}:${process.env.REACT_APP_API_PORT || 8000}`;

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    const details = error?.message ? ` (${error.message})` : "";
    throw new Error(`Unable to reach backend server. Please start the backend and try again.${details}`);
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }

  return payload;
}

export function registerUser(data) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function loginUser(data) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function uploadVideo({ file, thumbnail, userId, settings }) {
  const formData = new FormData();
  formData.append("video", file);
  if (thumbnail) {
    formData.append("thumbnail", thumbnail);
  }
  formData.append("userId", userId);
  formData.append("clipLength", String(settings?.clipLength || 30));
  formData.append("subtitles", String(Boolean(settings?.subtitles)));
  formData.append("platform", settings?.platform || "instagram");
  formData.append("targetLanguage", settings?.targetLanguage || "auto");
  formData.append("creatorGoal", settings?.creatorGoal || "engagement");
  formData.append("audience", settings?.audience || "general");
  formData.append("tone", settings?.tone || "cinematic");

  return fetch(`${API_BASE}/api/videos/upload`, {
    method: "POST",
    body: formData,
  })
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Upload failed.");
      }
      return payload;
    })
    .catch((error) => {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Unable to reach backend server. Please start the backend and try again.");
    });
}

export function listVideos(userId) {
  return request(`/api/videos?userId=${encodeURIComponent(userId)}`);
}

export function getVideoById(videoId) {
  return request(`/api/videos/${videoId}`);
}

export function deleteVideo(videoId, userId) {
  return request(`/api/videos/${videoId}?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export function assetUrl(relativeUrl) {
  if (!relativeUrl) {
    return "";
  }

  if (relativeUrl.startsWith("http")) {
    return relativeUrl;
  }

  return `${API_BASE}${relativeUrl}`;
}
