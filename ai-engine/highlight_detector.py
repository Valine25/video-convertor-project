import json
import random
import sys
import cv2

# Get video path
video_path = sys.argv[1]

# -------------------------
# Get Video Duration
# -------------------------
video = cv2.VideoCapture(video_path)

fps = video.get(cv2.CAP_PROP_FPS)
frame_count = video.get(cv2.CAP_PROP_FRAME_COUNT)

duration = int(frame_count / fps) if fps > 0 else 0

video.release()

# -------------------------
# Generate Highlights (VALID)
# -------------------------
highlights = []

# number of clips
num_clips = 3

for i in range(num_clips):

    # ensure valid start range
    start = random.randint(0, max(1, duration - 10))

    # clip length between 5–10 sec
    end = start + random.randint(5, 10)

    # ensure end does not exceed video
    if end > duration:
        end = duration

    highlights.append({
        "start": start,
        "end": end
    })

# -------------------------
# Output JSON
# -------------------------
result = {
    "highlights": highlights,
    "duration": duration
}

print(json.dumps(result))