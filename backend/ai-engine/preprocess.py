import cv2
import whisper
from moviepy import VideoFileClip
import os
import sys
import shutil
import json

os.environ["PATH"] += os.pathsep + r"C:\\users\\intel\\Downloads\\ffmpeg-8.0.1-essentials_build\\ffmpeg-8.0.1-essentials_build\\bin"

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

        cv2.imwrite(
            frame_name,
            frame
        )

    frame_count += 1

cap.release()

print("Frames extracted")


# -------------------------
# 3. Speech-to-Text
# -------------------------

# FIRST PASS - LANGUAGE DETECTION
tiny_model = whisper.load_model("tiny")

detection_result = tiny_model.transcribe(
    audio_path,
    task="transcribe"
)

language = detection_result.get(
    "language",
    "unknown"
)

print(
    f"Detected language: {language}",
    file=sys.stderr
)


if language == "en":

    print(
        "English detected. Using TINY model...",
        file=sys.stderr
    )

    model = tiny_model

elif language in ["hi", "kn"]:

    print(
        "Hindi/Kannada detected. Using BASE model...",
        file=sys.stderr
    )

    model = whisper.load_model("base")

else:

    print(
        "Unknown language. Using BASE model...",
        file=sys.stderr
    )

    model = whisper.load_model("base")


result = model.transcribe(
    audio_path,
    word_timestamps=True,
    task="transcribe"
)

transcript = result["text"]

# -------------------------
# 4. Save transcript + segments
# -------------------------

os.makedirs(
    "ai-engine",
    exist_ok=True
)

with open(
    "ai-engine/transcript.txt",
    "w",
    encoding="utf-8"
) as f:

    f.write(transcript)

segments = []
words = []

for seg in result["segments"]:

    segments.append({

        "start": round(
            seg["start"],
            2
        ),

        "end": round(
            seg["end"],
            2
        ),

        "text": seg["text"].strip()
    })

    for w in seg.get("words", []):

        words.append({

            "word": w["word"].strip(),

            "start": round(
                w["start"],
                3
            ),

            "end": round(
                w["end"],
                3
            )
        })

with open(
    "ai-engine/segments.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        segments,
        f,
        indent=2,
        ensure_ascii=False
    )

with open(
    "ai-engine/words.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        words,
        f,
        indent=2,
        ensure_ascii=False
    )

print("Transcript generated")

print(
    transcript[:500]
    .encode(
        "utf-8",
        errors="ignore"
    )
    .decode(
        "ascii",
        errors="ignore"
    )
)