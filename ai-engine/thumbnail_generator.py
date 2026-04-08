import cv2
import os
import numpy as np
import shutil


# Load face detector (built-in, no download needed)
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


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

    # 2. Brightness (avoid too dark or too bright)
    brightness = np.mean(gray)
    brightness_score = 1 - abs(brightness - 130) / 130  # ideal mid brightness

    # 3. Contrast
    contrast = gray.std()

    # 4. Face detection (VERY IMPORTANT)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    face_score = len(faces) * 50  # reward frames with faces

    # Final weighted score
    score = (
        sharpness * 0.4 +
        contrast * 0.2 +
        brightness_score * 100 * 0.2 +
        face_score * 0.2
    )

    return score


# -------------------------
# Get best thumbnail
# -------------------------
def get_best_thumbnail(frame_folder):
    best_score = -1
    best_frame = None

    for file in os.listdir(frame_folder):
        if not file.endswith(".jpg"):
            continue

        path = os.path.join(frame_folder, file)

        score = score_frame(path)

        if score > best_score:
            best_score = score
            best_frame = path

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
    return output_path


# -------------------------
# Main function
# -------------------------
def generate_thumbnail(frame_folder, video_path):
    best_frame = get_best_thumbnail(frame_folder)
    return save_thumbnail(best_frame, video_path)