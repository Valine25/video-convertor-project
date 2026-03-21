import json
import sys
import os
import cv2
import wave
import audioop
from groq import Groq

# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]
client = Groq(api_key=os.environ.get("GROQ_KEY"))

TRAILERS_TO_GENERATE = 3       # how many trailers we want
MOMENTS_PER_TRAILER = 4        # moments per trailer (each 8-12 sec = ~40sec total)
MOMENT_DURATION = 10           # seconds per moment
TOTAL_MOMENTS_NEEDED = TRAILERS_TO_GENERATE * MOMENTS_PER_TRAILER  # 12 total


# -------------------------
# STEP 1: Video Info
# -------------------------
def get_video_info(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = int(frame_count / fps) if fps > 0 else 0
    cap.release()
    return duration, fps


# -------------------------
# STEP 2: Load Whisper Segments
# -------------------------
def load_segments():
    path = "ai-engine/segments.json"
    if not os.path.exists(path):
        print("[Warning] segments.json not found", file=sys.stderr)
        return []
    with open(path, "r") as f:
        return json.load(f)


# -------------------------
# STEP 3: ML — Audio Energy
# -------------------------
def get_audio_energy(video_path):
    filename = os.path.basename(video_path).split('.')[0]
    audio_path = f"ai-engine/audio/{filename}.wav"

    if not os.path.exists(audio_path):
        print("[Audio] No WAV file found", file=sys.stderr)
        return {}

    energy_map = {}
    try:
        with wave.open(audio_path, "rb") as wf:
            framerate = wf.getframerate()
            sampwidth = wf.getsampwidth()
            frames_per_sec = framerate
            t = 0
            while True:
                frames = wf.readframes(frames_per_sec)
                if not frames:
                    break
                rms = audioop.rms(frames, sampwidth)
                energy_map[t] = rms
                t += 1

        max_e = max(energy_map.values()) or 1
        for t in energy_map:
            energy_map[t] = round(energy_map[t] / max_e, 3)

        return energy_map

    except Exception as e:
        print(f"[Audio] Failed: {e}", file=sys.stderr)
        return {}


# -------------------------
# STEP 4: ML — Speech Rate
# -------------------------
def get_speech_rate(segments):
    rates = {}
    for seg in segments:
        duration = seg["end"] - seg["start"]
        if duration > 0:
            word_count = len(seg["text"].split())
            rate = word_count / duration
            rates[seg["start"]] = round(rate, 3)

    if rates:
        max_r = max(rates.values()) or 1
        for t in rates:
            rates[t] = round(rates[t] / max_r, 3)

    return rates


# -------------------------
# STEP 5: ML Score Every Segment
# -------------------------
def score_segments(segments, energy_map, speech_rates):
    scored = []

    for seg in segments:
        start = int(seg["start"])

        # Average audio energy over segment
        seg_energies = [
            energy_map[t]
            for t in range(start, min(int(seg["end"]) + 1, start + 15))
            if t in energy_map
        ]
        audio_score = sum(seg_energies) / len(seg_energies) if seg_energies else 0.3
        speech_score = speech_rates.get(seg["start"], 0.3)

        ml_score = round((audio_score * 0.6) + (speech_score * 0.4), 3)

        scored.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
            "ml_score": ml_score
        })

    return sorted(scored, key=lambda x: x["ml_score"], reverse=True)


# -------------------------
# STEP 6: Select Diverse Candidates
# -------------------------
def select_candidates(scored_segments, duration, needed, min_gap=15):
    """
    Pick top ML-scored segments spread across the video.
    Need enough for multiple trailers.
    """
    candidates = []
    used_times = []

    for seg in scored_segments:
        too_close = any(abs(seg["start"] - t) < min_gap for t in used_times)
        if too_close:
            continue

        candidates.append(seg)
        used_times.append(seg["start"])

        if len(candidates) >= needed:
            break

    # If not enough candidates, lower the gap requirement
    if len(candidates) < needed:
        for seg in scored_segments:
            if seg in candidates:
                continue
            too_close = any(abs(seg["start"] - t) < 5 for t in used_times)
            if not too_close:
                candidates.append(seg)
                used_times.append(seg["start"])
            if len(candidates) >= needed:
                break

    print(f"[ML] Selected {len(candidates)} candidates for {TRAILERS_TO_GENERATE} trailers", file=sys.stderr)
    for c in candidates:
        print(f"  {c['start']:.1f}s | ml_score={c['ml_score']} | \"{c['text'][:50]}\"", file=sys.stderr)

    return candidates


# -------------------------
# STEP 7: Groq Emotion Detection
# -------------------------
def detect_emotions(candidates, duration):
    """
    Send ML candidates to Groq.
    Get emotion + role labels for each.
    We need enough labeled moments to build multiple trailers.
    """
    print(f"[Groq] Detecting emotions on {len(candidates)} candidates...", file=sys.stderr)

    formatted = ""
    for i, c in enumerate(candidates):
        formatted += f"[{i}] {c['start']:.1f}s-{c['end']:.1f}s (ml_score={c['ml_score']}): \"{c['text']}\"\n"

    prompt = f"""You are an expert trailer editor analyzing a video.

Video duration: {duration} seconds
High-energy moments detected by audio/speech analysis:
{formatted}

Label EACH moment with:
1. emotion: happy, excitement, suspense, angry, or sad
2. role: hook, tension, climax, or resolution
3. score: 0-10 virality score
4. A good start/end time that captures 8-12 seconds of the best part

IMPORTANT RULES:
- Label ALL {len(candidates)} moments
- Each moment should be 8-12 seconds long
- Use exact timestamps close to the originals
- Distribute roles so we have variety: multiple hooks, tensions, climaxes
- Return ONLY valid JSON, no explanation, no markdown

Format:
{{
  "moments": [
    {{
      "start": <number>,
      "end": <number>,
      "text": "<the line>",
      "emotion": "<happy|excitement|suspense|angry|sad>",
      "role": "<hook|tension|climax|resolution>",
      "score": <float 0-10>
    }}
  ]
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        moments = result.get("moments", [])

        print(f"[Groq] Got {len(moments)} labeled moments", file=sys.stderr)
        for m in moments:
            print(f"  [{m['role'].upper()}] {m['start']}s-{m['end']}s | {m['emotion']} | score={m['score']}", file=sys.stderr)

        return moments

    except Exception as e:
        print(f"[Groq] Failed: {e}", file=sys.stderr)
        # Fallback: return candidates as basic moments
        return [
            {
                "start": c["start"],
                "end": min(c["start"] + 10, duration),
                "text": c["text"],
                "emotion": "excitement",
                "role": ["hook", "tension", "climax", "resolution"][i % 4],
                "score": c["ml_score"] * 10
            }
            for i, c in enumerate(candidates)
        ]


# -------------------------
# STEP 8: Group into Trailer Arcs
# -------------------------
def group_into_trailers(moments, duration, num_trailers=TRAILERS_TO_GENERATE):
    """
    Group moments into multiple trailer arcs.
    Each trailer gets: 1 hook + 2 tensions + 1 climax/resolution
    Trailers use DIFFERENT moments — no reuse.
    """
    # Sort by score descending
    sorted_moments = sorted(moments, key=lambda x: x.get("score", 0), reverse=True)

    # Separate by role
    hooks = [m for m in sorted_moments if m["role"] == "hook"]
    tensions = [m for m in sorted_moments if m["role"] == "tension"]
    climaxes = [m for m in sorted_moments if m["role"] in ["climax", "resolution"]]

    # If not enough of a role, use any moment
    all_moments = sorted_moments.copy()

    trailers = []

    used = set()

    def get_unused(pool, count):
        result = []
        for m in pool:
            key = f"{m['start']}-{m['end']}"
            if key not in used:
                result.append(m)
                used.add(key)
                if len(result) >= count:
                    break
        # If not enough in pool, fill from all unused
        if len(result) < count:
            for m in all_moments:
                key = f"{m['start']}-{m['end']}"
                if key not in used:
                    result.append(m)
                    used.add(key)
                    if len(result) >= count:
                        break
        return result

    for t in range(num_trailers):
        # Each trailer: 1 hook + 2 tensions + 1 climax
        trailer_moments = []

        hook_picks = get_unused(hooks, 1)
        tension_picks = get_unused(tensions, 2)
        climax_picks = get_unused(climaxes, 1)

        trailer_moments = hook_picks + tension_picks + climax_picks

        if not trailer_moments:
            print(f"[Arc] No moments left for trailer {t+1}, skipping", file=sys.stderr)
            continue

        # Sort chronologically for natural flow within trailer
        trailer_moments = sorted(trailer_moments, key=lambda x: x["start"])

        # Calculate total duration
        total = sum(m["end"] - m["start"] for m in trailer_moments)
        print(f"[Arc] Trailer {t+1}: {len(trailer_moments)} moments, ~{total:.1f}s", file=sys.stderr)
        for m in trailer_moments:
            print(f"  [{m['role'].upper()}] {m['start']}s-{m['end']}s | {m['emotion']}", file=sys.stderr)

        trailers.append(trailer_moments)

    return trailers


# -------------------------
# MAIN
# -------------------------
def run():
    duration, fps = get_video_info(video_path)
    print(f"[Info] Duration: {duration}s | FPS: {fps}", file=sys.stderr)

    segments = load_segments()
    print(f"[Info] Loaded {len(segments)} transcript segments", file=sys.stderr)

    if not segments:
        print("[Error] No segments found!", file=sys.stderr)
        print(json.dumps({"highlights": [], "trailers": [], "duration": duration}))
        return

    # ML signals
    energy_map = get_audio_energy(video_path)
    speech_rates = get_speech_rate(segments)

    # Score all segments
    scored = score_segments(segments, energy_map, speech_rates)

    # Select diverse candidates
    candidates = select_candidates(scored, duration, TOTAL_MOMENTS_NEEDED)

    if not candidates:
        print("[Error] No candidates found!", file=sys.stderr)
        print(json.dumps({"highlights": [], "trailers": [], "duration": duration}))
        return

    # Groq emotion detection
    moments = detect_emotions(candidates, duration)

    # Group into trailer arcs
    trailers = group_into_trailers(moments, duration)

    print(f"\n[Final] {len(trailers)} trailers planned", file=sys.stderr)

    # Output format — flat highlights list with trailer_index
    all_highlights = []
    for t_idx, trailer_moments in enumerate(trailers):
        for m in trailer_moments:
            m["trailer_index"] = t_idx
            all_highlights.append(m)

    result = {
        "highlights": all_highlights,
        "trailers": trailers,
        "num_trailers": len(trailers),
        "duration": duration
    }

    print(json.dumps(result))


if __name__ == "__main__":
    run()
