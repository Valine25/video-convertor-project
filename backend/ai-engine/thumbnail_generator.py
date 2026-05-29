import cv2
import os
import numpy as np
import shutil


# Load face detector (built-in, no download needed)
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

# Edge detector for interesting content
def detect_edges(image):
    """Detect edges to identify visually interesting frames."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = np.count_nonzero(edges) / edges.size
    return edge_density

def calculate_saturation(image):
    """Calculate color saturation to prefer vibrant frames."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
    saturation = hsv[:, :, 1].mean()
    return saturation / 255.0  # normalize to 0-1

def calculate_entropy(image):
    """Calculate image entropy (complexity/interest level)."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist = hist.ravel() / hist.sum()
    entropy = -np.sum(hist * np.log2(hist + 1e-7))
    return entropy / 8.0  # normalize to 0-1

# -------------------------
# Score a frame (IMPROVED)
# -------------------------
def score_frame(image_path):
    img = cv2.imread(image_path)

    if img is None:
        return 0

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Sharpness (important)
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness_score = min(sharpness / 500, 1.0)  # normalize

    # 2. Brightness (avoid too dark or too bright)
    brightness = np.mean(gray)
    brightness_score = 1 - abs(brightness - 120) / 120  # ideal brightness range

    # 3. Contrast
    contrast = gray.std()
    contrast_score = min(contrast / 60, 1.0)  # normalize

    # 4. Face detection (VERY IMPORTANT)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    face_score = min(len(faces) * 0.3, 1.0)  # normalize

    # 5. Edge detection (interesting content)
    edge_score = detect_edges(img)

    # 6. Color saturation (vibrant frames are more engaging)
    saturation_score = calculate_saturation(img)

    # 7. Image entropy/complexity
    entropy_score = calculate_entropy(img)

    # Final weighted score (balanced across multiple factors)
    score = (
        sharpness_score * 0.20 +
        contrast_score * 0.15 +
        brightness_score * 0.10 +
        face_score * 0.25 +
        edge_score * 0.15 +
        saturation_score * 0.10 +
        entropy_score * 0.05
    )

    return score


def enhance_thumbnail(image_path):
    """Apply enhancements to make the thumbnail more visually appealing."""
    img = cv2.imread(image_path)
    
    if img is None:
        return image_path
    
    # Increase contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    
    enhanced = cv2.merge([l, a, b])
    enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
    
    # Slightly increase saturation
    hsv = cv2.cvtColor(enhanced, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.15, 0, 255)
    enhanced = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    
    # Slight unsharp mask for edge enhancement
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    enhanced = cv2.addWeighted(enhanced, 1.3, blurred, -0.3, 0)
    enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)
    
    # Save enhanced version
    cv2.imwrite(image_path, enhanced)
    return image_path


# -------------------------
# Get best thumbnail
# -------------------------
def get_best_thumbnail(frame_folder):
    best_score = -1
    best_frame = None

    frames_available = [f for f in os.listdir(frame_folder) if f.endswith(".jpg")]
    
    if not frames_available:
        return None
    
    # Score frames and find top candidates
    candidates = []
    for file in frames_available:
        path = os.path.join(frame_folder, file)
        score = score_frame(path)
        candidates.append((score, path))
    
    # Get the best frame
    candidates.sort(key=lambda x: x[0], reverse=True)
    if candidates:
        best_score, best_frame = candidates[0]
    
    return best_frame


# -------------------------
# Save thumbnail (filename-wise)
# -------------------------
def save_thumbnail(best_frame, video_path, output_folder="ai-engine/thumbnail"):
    if not best_frame:
        return None

    os.makedirs(output_folder, exist_ok=True)

    filename = os.path.basename(video_path).replace(".mp4", "")
    output_path = os.path.join(output_folder, f"{filename}_thumbnail.jpg")

    shutil.copy(best_frame, output_path)
    
    # Apply enhancements to the thumbnail
    enhance_thumbnail(output_path)
    
    return f"/thumbnail/{os.path.basename(output_path)}"

# -------------------------
# Main function
# -------------------------
def generate_thumbnail(frame_folder, video_path):
    best_frame = get_best_thumbnail(frame_folder)
    return save_thumbnail(best_frame, video_path)


