import cv2
import whisper
from moviepy import VideoFileClip
import os
import sys
import shutil
import json

video_path = sys.argv[1]

# Clean frames
if os.path.exists("ai-engine/frames"):
    shutil.rmtree("ai-engine/frames")

os.makedirs("ai-engine/frames", exist_ok=True)
os.makedirs("ai-engine/audio", exist_ok=True)

# -------------------------
# 1. Extract Audio
# -------------------------
video = VideoFileClip(video_path)

filename = os.path.basename(video_path).split('.')[0]
audio_path = f"ai-engine/audio/{filename}.wav"

video.audio.write_audiofile(audio_path)
video.close()

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

    if frame_count % int(frame_rate * 2) == 0:
        frame_name = f"ai-engine/frames/frame_{frame_count}.jpg"
        cv2.imwrite(frame_name, frame)

    frame_count += 1

cap.release()

print("Frames extracted")

# -------------------------
# 3. Speech-to-Text
# -------------------------
model = whisper.load_model("base")
result = model.transcribe(audio_path, word_timestamps=True)

transcript = result["text"]

# -------------------------
# 4. Save transcript + segments
# -------------------------
os.makedirs("ai-engine", exist_ok=True)

# Save plain transcript
with open("ai-engine/transcript.txt", "w") as f:
    f.write(transcript)

segments = []
words = []
for seg in result["segments"]:
    segments.append({
        "start": round(seg["start"], 2),
        "end": round(seg["end"], 2),
        "text": seg["text"].strip()
    })
    for w in seg.get("words", []):
        words.append({
            "word": w["word"].strip(),
            "start": round(w["start"], 3),
            "end": round(w["end"], 3)
        })

with open("ai-engine/segments.json", "w") as f:
    json.dump(segments, f, indent=2)

with open("ai-engine/words.json", "w") as f:
    json.dump(words, f, indent=2)

print("Transcript generated")
print(transcript)
