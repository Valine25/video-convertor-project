import json
import sys
import os
import subprocess
import shutil

os.environ["PATH"] += os.pathsep + r"C:\\users\\intel\Downloads\\ffmpeg-8.0.1-essentials_build\\ffmpeg-8.0.1-essentials_build\\bin"
os.environ["FFMPEG_BINARY"] = r"C:\\users\\intel\Downloads\\ffmpeg-8.0.1-essentials_build\\ffmpeg-8.0.1-essentials_build\\bin\\ffmpeg.exe"

video_path = sys.argv[1]

# -------------------------
# READ + PARSE INPUT
# -------------------------
data = json.loads(sys.stdin.read())

# Get mode — trailer or minivlog
mode = data.get("mode", "trailer") if isinstance(data, dict) else "trailer"

if isinstance(data, list):
    highlights = data
else:
    highlights = data.get("highlights", [])

# Group highlights by trailer_index
trailer_map = {}
for h in highlights:
    idx = h.get("trailer_index", 0)
    if idx not in trailer_map:
        trailer_map[idx] = []
    trailer_map[idx].append(h)

trailers = [trailer_map[i] for i in sorted(trailer_map.keys())]
trailers = trailers[:1]

# -------------------------
# CONFIG
# -------------------------
output_dir = "ai-engine/clips"
os.makedirs(output_dir, exist_ok=True)

WORDS_PATH = "ai-engine/words.json"

# Mode-based config
if mode == "minivlog":
    FONT_SIZE = 44
    OUTLINE_WIDTH = 3
    MODE_LABEL = "minivlog"
else:
    FONT_SIZE = 48
    OUTLINE_WIDTH = 3
    MODE_LABEL = "trailer"


# -------------------------
# LOAD WORDS
# -------------------------
def load_words():
    if not os.path.exists(WORDS_PATH):
        print("[Subtitle] No words.json found", file=sys.stderr)
        return []
    with open(WORDS_PATH, "r", encoding="utf-8") as f:
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
# SUBTITLE HELPERS
# -------------------------
def seconds_to_ass(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    cs = int((s % 1) * 100)
    return f"{h}:{m:02d}:{sec:02d}.{cs:02d}"


def build_ass_content(combined_words, font_size, outline_width):
    """Build ASS subtitle content from word list"""
    MAX_PER_LINE = 5
    lines = [combined_words[i:i+MAX_PER_LINE] for i in range(0, len(combined_words), MAX_PER_LINE)]

    ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{font_size},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,{outline_width},0,2,80,80,150,1

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
    return ass


# -------------------------
# BURN SUBTITLES — FIXED FOR WINDOWS
# -------------------------
def burn_subtitles(clip_path, ass_path, output_path):
    """
    Burn subtitles using subtitles filter instead of ass filter.
    This avoids the 'original_size' error on Windows.
    """
    abs_ass = os.path.abspath(ass_path)

    # Windows path fix for ffmpeg
    abs_ass = abs_ass.replace("\\", "/")
    if len(abs_ass) > 1 and abs_ass[1] == ":":
        # Convert C:/path to C\:/path for ffmpeg on Windows
        abs_ass = abs_ass[0] + "\\:" + abs_ass[2:]

    # Use subtitles filter instead of ass filter — avoids original_size issue
    command = [
        "ffmpeg", "-y",
        "-i", clip_path,
        "-vf", f"subtitles={abs_ass}:force_style='FontName=Arial,FontSize={FONT_SIZE},PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline={OUTLINE_WIDTH},Bold=1,Alignment=2,MarginV=150'",
        "-c:v", "libx264", "-preset", "fast",
        "-crf", "18",
        "-c:a", "copy",
        output_path
    ]
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if result.returncode != 0:
        print(f"[Sub Burn] subtitles filter failed, trying ass filter...", file=sys.stderr)
        # Fallback to ass filter
        command2 = [
            "ffmpeg", "-y",
            "-i", clip_path,
            "-vf", f"ass={abs_ass}",
            "-c:v", "libx264", "-preset", "fast",
            "-crf", "18",
            "-c:a", "copy",
            output_path
        ]
        result2 = subprocess.run(command2, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if result2.returncode != 0:
            print(f"[Sub Burn] Both filters failed: {result2.stderr.decode()[-200:]}", file=sys.stderr)
            return False
    return True


# -------------------------
# BUILD ONE OUTPUT VIDEO
# -------------------------
def build_video(trailer_moments, trailer_idx, words):
    print(f"\n[{MODE_LABEL.upper()}] Building with {len(trailer_moments)} moments...", file=sys.stderr)

    moment_clips = []
    temp_files = []

    for i, moment in enumerate(trailer_moments):
        start = float(moment.get("start", 0))
        end = float(moment.get("end", start + 10))
        role = moment.get("role", "")
        emotion = moment.get("emotion", "")

        print(f"  [{role.upper()}] {start}s-{end}s | {emotion} | {round(end-start,1)}s", file=sys.stderr)

        raw_path = f"{output_dir}/t{trailer_idx}_m{i}_raw.mp4"
        success = extract_moment(video_path, start, end, raw_path)
        if not success:
            continue

        temp_files.append(raw_path)
        moment_clips.append(raw_path)


    if not moment_clips:
        print(f"[{MODE_LABEL.upper()}] No moments extracted!", file=sys.stderr)
        return None

    # Stitch all moments
    stitched_path = f"{output_dir}/t{trailer_idx}_stitched.mp4"
    print(f"[{MODE_LABEL.upper()}] Stitching {len(moment_clips)} moments...", file=sys.stderr)
    if not stitch_clips(moment_clips, stitched_path):
        return None
    temp_files.append(stitched_path)

    # video_name = os.path.splitext(os.path.basename(video_path))[0]
    # final_path = f"{output_dir}/{MODE_LABEL}_{video_name}.mp4"
    video_name = os.path.splitext(os.path.basename(video_path))[0]
    final_path = f"{output_dir}/trailer_{video_name}_{trailer_idx+1}.mp4"

    # Generate + burn subtitles
    if words:
        print(f"[{MODE_LABEL.upper()}] Generating subtitles...", file=sys.stderr)

        # Remap word timestamps to stitched timeline
        combined_words = []
        cumulative_time = 0.0

        for moment in trailer_moments:
            m_start = float(moment["start"])
            m_end = float(moment["end"])
            m_duration = m_end - m_start

            moment_words = [
                w for w in words
                if w["start"] >= m_start - 0.2 and w["end"] <= m_end + 0.2
            ]

            for w in moment_words:
                combined_words.append({
                    "word": w["word"],
                    "start": round(cumulative_time + (w["start"] - m_start), 3),
                    "end": round(cumulative_time + (w["end"] - m_start), 3)
                })

            cumulative_time += m_duration

        if combined_words:
            sub_ass_path = f"{output_dir}/t{trailer_idx}_sub.ass"
            ass_content = build_ass_content(combined_words, FONT_SIZE, OUTLINE_WIDTH)

            with open(sub_ass_path, "w", encoding="utf-8") as f:
                f.write(ass_content)

            temp_files.append(sub_ass_path)

            burn_success = burn_subtitles(stitched_path, sub_ass_path, final_path)
            if not burn_success:
                print(f"[{MODE_LABEL.upper()}] Subtitle burn failed, saving without subtitles", file=sys.stderr)
                shutil.copy(stitched_path, final_path)
            else:
                print(f"[{MODE_LABEL.upper()}] Subtitles burned successfully!", file=sys.stderr)
        else:
            print(f"[{MODE_LABEL.upper()}] No words found for subtitles", file=sys.stderr)
            shutil.copy(stitched_path, final_path)
    else:
        shutil.copy(stitched_path, final_path)

    # Cleanup
    for f in temp_files:
        if os.path.exists(f) and f != final_path:
            try:
                os.remove(f)
            except:
                pass

    duration = get_duration(final_path)
    print(f"[{MODE_LABEL.upper()}] Done! {round(duration, 1)}s → {final_path}", file=sys.stderr)
    return final_path


# -------------------------
# MAIN
# -------------------------
def run():
    print(f"[Generator] Mode: {MODE_LABEL} | {len(trailers)} group(s) from {len(highlights)} highlights", file=sys.stderr)

    if not trailers:
        print("[Error] No highlights found!", file=sys.stderr)
        print(json.dumps({"clips": [], "total": 0}))
        return

    words = load_words()
    print(f"[Generator] Loaded {len(words)} word timestamps", file=sys.stderr)

    output_paths = []

    real_clip_paths = []

    for i, moments in enumerate(trailers):

        if not moments:
            continue

        print(
            f"[Generator] Group {i+1} has {len(moments)} moments",
        file=sys.stderr
        )

        path = build_video(moments, i, words)

        if path:

            # Real filesystem path
            real_clip_paths.append(path)

            # Browser-accessible URL path
            browser_path = f"/clips/{os.path.basename(path)}"

            output_paths.append(browser_path)

    print(f"\n[Done] Generated {len(output_paths)} video(s):", file=sys.stderr)
    for p in output_paths:
        d = get_duration(p)
        print(f"  → {p} ({round(d,1)}s)", file=sys.stderr)
    # -------------------------
    # PLATFORM ADAPTATION
    # -------------------------

    from platform_adapter import process_generated_clips

    converted = process_generated_clips(real_clip_paths)
    platform_clips = []

    for c in converted:

        if isinstance(c, dict):

            output_file = c.get("output")

        else:

            output_file = c

        if output_file:

            browser_platform_path = (
                f"/platform/{os.path.basename(output_file)}"
            )

            platform_clips.append(browser_platform_path)

    print(json.dumps({
        "clips": output_paths,
        "platformClips": platform_clips,
        "total": len(output_paths)
    }))


if __name__ == "__main__":
    run()