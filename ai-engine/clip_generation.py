import json
import sys
import os
import subprocess

video_path = sys.argv[1]

# 🔥 read highlights from stdin
highlights = json.loads(sys.stdin.read())

output_dir = "ai-engine/clips"
os.makedirs(output_dir, exist_ok=True)

clip_paths = []

for i, h in enumerate(highlights):
    start = h["start"]
    end = h["end"]

    output_file = f"{output_dir}/clip_{i}.mp4"

    command = [
        "ffmpeg",
        "-i", video_path,
        "-ss", str(start),
        "-to", str(end),
        "-c", "copy",
        output_file
    ]

    subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    clip_paths.append(output_file)

print(json.dumps({"clips": clip_paths}))