import json
import sys
import os
import subprocess

video_path = sys.argv[1]

# Read highlights from stdin
data = json.loads(sys.stdin.read())

# Support both formats
if isinstance(data, list):
    # Old format — treat all as one trailer
    trailers = [data]
else:
    trailers = data.get("trailers", [])
    if not trailers and data.get("highlights"):
        # Group by trailer_index
        highlights = data["highlights"]
        trailer_map = {}
        for h in highlights:
            idx = h.get("trailer_index", 0)
            if idx not in trailer_map:
                trailer_map[idx] = []
            trailer_map[idx].append(h)
        trailers = [trailer_map[i] for i in sorted(trailer_map.keys())]

output_dir = "ai-engine/clips"
os.makedirs(output_dir, exist_ok=True)

# -------------------------
# CONFIG
# -------------------------
WORDS_PATH = "ai-engine/words.json"
FONT_SIZE = 48
OUTLINE_WIDTH = 3


# -------------------------
# LOAD WORDS
# -------------------------
def load_words():
    if not os.path.exists(WORDS_PATH):
        print("[Subtitle] No words.json found", file=sys.stderr)
        return []
    with open(WORDS_PATH, "r") as f:
        return json.load(f)


# -------------------------
# GET VIDEO DURATION
# -------------------------
def get_duration(path):
    probe = subprocess.run([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path
    ], capture_output=True, text=True)
    try:
        return float(probe.stdout.strip())
    except:
        return 0


# -------------------------
# EXTRACT MOMENT
# -------------------------
def extract_moment(video_path, start, end, output_path):
    duration = max(1, end - start)
    command = [
        "ffmpeg", "-y",
        "-ss", str(start),
        "-i", video_path,
        "-t", str(duration),
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "18",
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
        "-avoid_negative_ts", "make_zero",
        "-vsync", "cfr",
        output_path
    ]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if result.returncode != 0:
        print(f"[Extract] Failed {start}-{end}: {result.stderr.decode()[-200:]}", file=sys.stderr)
        return False
    return True


# -------------------------
# STITCH CLIPS
# -------------------------
def stitch_clips(clip_paths, output_path):
    if len(clip_paths) == 1:
        # Just copy single clip
        import shutil
        shutil.copy(clip_paths[0], output_path)
        return True

    concat_file = f"{output_dir}/concat_temp.txt"
    with open(concat_file, "w") as f:
        for path in clip_paths:
            abs_path = os.path.abspath(path)
            f.write(f"file '{abs_path}'\n")

    command = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "18",
        "-c:a", "aac",
        "-movflags", "+faststart",
        output_path
    ]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if os.path.exists(concat_file):
        os.remove(concat_file)
    if result.returncode != 0:
        print(f"[Stitch] Failed: {result.stderr.decode()[-200:]}", file=sys.stderr)
        return False
    return True


# -------------------------
# GENERATE ASS SUBTITLES
# -------------------------
def seconds_to_ass(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    cs = int((s % 1) * 100)
    return f"{h}:{m:02d}:{sec:02d}.{cs:02d}"


def generate_subtitles(words, clip_start, clip_end, ass_path):
    """Generate word-by-word highlighted subtitles for a clip"""

    # Get words for this time range
    clip_words = [
        w for w in words
        if w["start"] >= clip_start - 0.2 and w["end"] <= clip_end + 0.2
    ]

    if not clip_words:
        print(f"[Sub] No words found for {clip_start}-{clip_end}", file=sys.stderr)
        return False

    # Shift to relative timestamps
    shifted = [
        {
            "word": w["word"],
            "start": max(0, round(w["start"] - clip_start, 3)),
            "end": max(0, round(w["end"] - clip_start, 3))
        }
        for w in clip_words
    ]

    # Group into lines of 5 words
    MAX_PER_LINE = 5
    lines = [shifted[i:i+MAX_PER_LINE] for i in range(0, len(shifted), MAX_PER_LINE)]

    ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{FONT_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{OUTLINE_WIDTH},0,2,80,80,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    for line_words in lines:
        for i, current in enumerate(line_words):
            parts = []
            for j, w in enumerate(line_words):
                if j == i:
                    # Highlighted word — yellow
                    parts.append(f"{{\\c&H00FFFF&}}{w['word']}{{\\c&HFFFFFF&}}")
                else:
                    parts.append(w["word"])
            line_text = " ".join(parts)
            events.append(
                f"Dialogue: 0,{seconds_to_ass(current['start'])},{seconds_to_ass(current['end'])},Default,,0,0,0,,{line_text}"
            )

    ass += "\n".join(events)

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(ass)

    return True


# -------------------------
# BURN SUBTITLES
# -------------------------
def burn_subtitles(clip_path, ass_path, output_path):
    abs_ass = os.path.abspath(ass_path)

    # Windows path fix
    if sys.platform == "win32":
        abs_ass = abs_ass.replace("\\", "/")
        drive = abs_ass[0]
        abs_ass = drive + "\\:" + abs_ass[2:]
        abs_ass = abs_ass.replace("\\:", "\\\\:")

    command = [
        "ffmpeg", "-y",
        "-i", clip_path,
        "-vf", f"ass='{abs_ass}'",
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "18",
        "-c:a", "copy",
        output_path
    ]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if result.returncode != 0:
        print(f"[Sub Burn] Failed: {result.stderr.decode()[-200:]}", file=sys.stderr)
        return False
    return True


# -------------------------
# BUILD ONE TRAILER
# -------------------------
def build_trailer(trailer_moments, trailer_idx, words):
    print(f"\n[Trailer {trailer_idx+1}] Building with {len(trailer_moments)} moments...", file=sys.stderr)

    moment_clips = []
    temp_files = []

    for i, moment in enumerate(trailer_moments):
        start = float(moment.get("start", 0))
        end = float(moment.get("end", start + 10))
        emotion = moment.get("emotion", "")
        role = moment.get("role", "")

        print(f"  [{role.upper()}] {start}s-{end}s | {emotion}", file=sys.stderr)

        raw_path = f"{output_dir}/t{trailer_idx}_m{i}_raw.mp4"

        success = extract_moment(video_path, start, end, raw_path)
        if not success:
            continue

        temp_files.append(raw_path)
        moment_clips.append(raw_path)

    if not moment_clips:
        print(f"[Trailer {trailer_idx+1}] No moments extracted!", file=sys.stderr)
        return None

    # Stitch moments into one trailer
    stitched_path = f"{output_dir}/t{trailer_idx}_stitched.mp4"
    print(f"[Trailer {trailer_idx+1}] Stitching {len(moment_clips)} moments...", file=sys.stderr)

    stitch_success = stitch_clips(moment_clips, stitched_path)
    if not stitch_success:
        print(f"[Trailer {trailer_idx+1}] Stitch failed!", file=sys.stderr)
        return None

    temp_files.append(stitched_path)

    # Generate subtitles for the full stitched trailer
    # Calculate the full time range covered
    all_starts = [float(m["start"]) for m in trailer_moments]
    all_ends = [float(m["end"]) for m in trailer_moments]
    trailer_clip_start = min(all_starts)
    trailer_clip_end = max(all_ends)

    ass_path = f"{output_dir}/t{trailer_idx}.ass"
    final_path = f"{output_dir}/trailer_{trailer_idx+1}.mp4"

    if words:
        print(f"[Trailer {trailer_idx+1}] Generating subtitles...", file=sys.stderr)

        # Build combined word list with adjusted timestamps
        # Since we stitched clips, we need to remap word timestamps
        combined_words = []
        cumulative_time = 0.0

        for moment in trailer_moments:
            m_start = float(moment["start"])
            m_end = float(moment["end"])
            m_duration = m_end - m_start

            # Get words for this moment
            moment_words = [
                w for w in words
                if w["start"] >= m_start - 0.2 and w["end"] <= m_end + 0.2
            ]

            # Remap to stitched timeline
            for w in moment_words:
                combined_words.append({
                    "word": w["word"],
                    "start": round(cumulative_time + (w["start"] - m_start), 3),
                    "end": round(cumulative_time + (w["end"] - m_start), 3)
                })

            cumulative_time += m_duration

        # Generate ASS for stitched trailer
        sub_ass_path = f"{output_dir}/t{trailer_idx}_sub.ass"

        if combined_words:
            MAX_PER_LINE = 5
            lines = [combined_words[i:i+MAX_PER_LINE] for i in range(0, len(combined_words), MAX_PER_LINE)]

            ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{FONT_SIZE},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{OUTLINE_WIDTH},0,2,80,80,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
            events = []
            for line_words in lines:
                for i, current in enumerate(line_words):
                    parts = []
                    for j, w in enumerate(line_words):
                        if j == i:
                            parts.append(f"{{\\c&H00FFFF&}}{w['word']}{{\\c&HFFFFFF&}}")
                        else:
                            parts.append(w["word"])
                    line_text = " ".join(parts)
                    events.append(
                        f"Dialogue: 0,{seconds_to_ass(current['start'])},{seconds_to_ass(current['end'])},Default,,0,0,0,,{line_text}"
                    )

            ass += "\n".join(events)
            with open(sub_ass_path, "w", encoding="utf-8") as f:
                f.write(ass)

            temp_files.append(sub_ass_path)

            # Burn subtitles
            burn_success = burn_subtitles(stitched_path, sub_ass_path, final_path)
            if not burn_success:
                print(f"[Trailer {trailer_idx+1}] Subtitle burn failed, using without subtitles", file=sys.stderr)
                import shutil
                shutil.copy(stitched_path, final_path)
        else:
            import shutil
            shutil.copy(stitched_path, final_path)
    else:
        import shutil
        shutil.copy(stitched_path, final_path)

    # Cleanup temp files
    for f in temp_files:
        if os.path.exists(f) and f != final_path:
            try:
                os.remove(f)
            except:
                pass

    duration = get_duration(final_path)
    print(f"[Trailer {trailer_idx+1}] Done! {round(duration, 1)}s → {final_path}", file=sys.stderr)
    return final_path


# -------------------------
# MAIN
# -------------------------
def run():
    print(f"[Generator] Building {len(trailers)} trailers...", file=sys.stderr)

    if not trailers:
        print("[Error] No trailers to generate!", file=sys.stderr)
        print(json.dumps({"clips": [], "total": 0}))
        return

    words = load_words()
    print(f"[Generator] Loaded {len(words)} word timestamps", file=sys.stderr)

    trailer_paths = []

    for i, trailer_moments in enumerate(trailers):
        if not trailer_moments:
            continue
        path = build_trailer(trailer_moments, i, words)
        if path:
            trailer_paths.append(path)

    print(f"\n[Done] Generated {len(trailer_paths)} trailers:", file=sys.stderr)
    for p in trailer_paths:
        d = get_duration(p)
        print(f"  → {p} ({round(d,1)}s)", file=sys.stderr)

    print(json.dumps({
        "clips": trailer_paths,
        "total": len(trailer_paths)
    }))


if __name__ == "__main__":
    run()
