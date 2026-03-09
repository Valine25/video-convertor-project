import cv2
import whisper
from moviepy import VideoFileClip
import os
import sys

video_path = sys.argv[1]

# Create output folders
os.makedirs("ai-engine/frames", exist_ok=True)
os.makedirs("ai-engine/audio", exist_ok=True)

# -------------------------
# 1. Extract Audio
# -------------------------
video = VideoFileClip(video_path)
audio_path = "ai-engine/audio/audio.wav"
video.audio.write_audiofile(audio_path)

print("Audio extracted")

# -------------------------
# 2. Extract Frames
# -------------------------
cap = cv2.VideoCapture(video_path)

frame_count = 0
frame_rate = cap.get(cv2.CAP_PROP_FPS)

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Save one frame per second
    if int(frame_count % frame_rate) == 0:
        frame_name = f"ai-engine/frames/frame_{frame_count}.jpg"
        cv2.imwrite(frame_name, frame)

    frame_count += 1

cap.release()

print("Frames extracted")

# -------------------------
# 3. Speech to Text
# -------------------------
model = whisper.load_model("base")

result = model.transcribe(audio_path)

transcript = result["text"]

print("Transcript generated")

# Print result so Node.js can read it
print(transcript)