import os
import subprocess
import sys


# -------------------------
# Convert single clip
# -------------------------
def convert_clip(input_video, platform="shorts"):

    os.makedirs("ai-engine/platform", exist_ok=True)

    filename = os.path.basename(input_video).split('.')[0]

    output_video = f"ai-engine/platform/{filename}_{platform}.mp4"

    # Platform resolutions
    platform_sizes = {
        "shorts": ("720", "1280"),
        "reels": ("720", "1280"),
        "tiktok": ("720", "1280"),
        "youtube": ("1280", "720"),
        "square": ("720", "720")
    }

    width, height = platform_sizes.get(platform, ("720", "1280"))

    print(f"\n[Converting] {input_video}", file=sys.stderr)
    print(f"[Target] {platform} ({width}x{height})", file=sys.stderr)

    command = [
        "ffmpeg",
        "-i", input_video,
        "-vf",
        f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height}",
        "-preset", "ultrafast",
        "-c:v", "libx264",
        "-c:a", "copy",
        output_video,
        "-y"
    ]

    result = subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    if result.returncode == 0:
        print(f"[Saved] {output_video}", file=sys.stderr)
        return output_video

    else:
        print(f"[Failed] {input_video}", file=sys.stderr)
        return None


# -------------------------
# Convert CURRENT clips only
# -------------------------
def process_generated_clips(clip_paths, platform="shorts"):

    converted = []

    print("\n[Platform Adapter] Processing generated clips...", file=sys.stderr)

    for clip in clip_paths:

        if not os.path.exists(clip):
            print(f"[Missing] {clip}", file=sys.stderr)
            continue

        result = convert_clip(clip, platform)

        if result:
            converted.append(result)

    print(
        f"\n[Platform Adapter] Converted {len(converted)} clips",
        file=sys.stderr
    )

    return converted