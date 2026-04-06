import json
import sys
import os
import cv2
import wave
import audioop

# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]

MOMENTS_COUNT = 8
TOTAL_CANDIDATES = 30


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
# STEP 2: Load Segments
# -------------------------
def load_segments():
    path = "ai-engine/segments.json"
    if not os.path.exists(path):
        print("[Warning] segments.json not found", file=sys.stderr)
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -------------------------
# STEP 3: Audio Energy
# -------------------------
def get_audio_energy(video_path):
    filename = os.path.basename(video_path).split('.')[0]
    audio_path = f"ai-engine/audio/{filename}.wav"

    if not os.path.exists(audio_path):
        return {}

    energy_map = {}
    try:
        with wave.open(audio_path, "rb") as wf:
            framerate = wf.getframerate()
            sampwidth = wf.getsampwidth()
            t = 0

            while True:
                frames = wf.readframes(framerate)
                if not frames:
                    break
                rms = audioop.rms(frames, sampwidth)
                energy_map[t] = rms
                t += 1

        max_e = max(energy_map.values()) or 1
        for t in energy_map:
            energy_map[t] /= max_e

        return energy_map

    except:
        return {}


# -------------------------
# STEP 4: Speech Rate
# -------------------------
def get_speech_rate(segments):
    rates = {}
    for seg in segments:
        dur = seg["end"] - seg["start"]
        if dur > 0:
            wc = len(seg["text"].split())
            rates[seg["start"]] = wc / dur

    if rates:
        max_r = max(rates.values()) or 1
        for t in rates:
            rates[t] /= max_r

    return rates


# -------------------------
# STEP 5: TEXT FILTER
# -------------------------
def is_good_text(text):
    text = text.strip().lower()

    if len(text) < 20:
        return False

    if len(text.split()) < 5:
        return False

    # reject broken Hinglish
    short_words = [w for w in text.split() if len(w) <= 2]
    if len(short_words) > 3:
        return False
    return True

# -------------------------
# STEP 6: ML SCORING
# -------------------------
def score_segments(segments, energy_map, speech_rates):
    scored = []

    for seg in segments:
        if not is_good_text(seg["text"]):
            continue

        start = int(seg["start"])

        energies = [
            energy_map[t]
            for t in range(start, min(int(seg["end"]) + 1, start + 10))
            if t in energy_map
        ]

        audio_score = sum(energies) / len(energies) if energies else 0.3
        speech_score = speech_rates.get(seg["start"], 0.3)

        ml_score = (audio_score * 0.6) + (speech_score * 0.4)

        scored.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
            "ml_score": round(ml_score, 3)
        })

    # remove duplicates
    seen = set()
    unique = []

    for s in scored:
        key = s["text"].strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(s)

    return sorted(unique, key=lambda x: x["ml_score"], reverse=True)


# -------------------------
# STEP 7: SELECT DIVERSE CANDIDATES
# -------------------------
def select_candidates(scored_segments, duration, needed):
    # Split video into 3 sections
    early_end = duration * 0.25
    late_start = duration * 0.75

    early = [s for s in scored_segments if s["start"] < early_end]
    middle = [s for s in scored_segments if early_end <= s["start"] < late_start]
    late = [s for s in scored_segments if s["start"] >= late_start]

    # Pick best from each section
    early_picks = pick_spread(early, 2)    # 2 from start
    middle_picks = pick_spread(middle, 4)  # 4 from middle
    late_picks = pick_spread(late, 2)      # 2 from end

    candidates = early_picks + middle_picks + late_picks
    return candidates


def pick_spread(segments, count, min_gap=20):
    """Pick top scoring segments spread apart"""
    picked = []
    used_times = []
    for seg in segments:  # already sorted by ml_score
        too_close = any(abs(seg["start"] - t) < min_gap for t in used_times)
        if not too_close:
            picked.append(seg)
            used_times.append(seg["start"])
        if len(picked) >= count:
            break
    return picked
def classify_role(text):
    text = text.lower()

    # Strong hooks
    if any(x in text for x in [
        "you won't believe", "this changed", "big mistake",
        "i lost", "this happened", "listen", "today i"
    ]):
        return "hook"

    # Resolution
    if any(x in text for x in [
        "so the lesson", "finally", "this is why",
        "in the end", "i realized"
    ]):
        return "resolution"

    # Context
    if any(x in text for x in [
        "because", "then", "after that",
        "so what happened", "basically"
    ]):
        return "context"

    return "tension"

def build_story_trailer(candidates, duration):
    hooks, context, tension, resolution = [], [], [], []

    for c in candidates:
        role = classify_role(c["text"])

        if role == "hook":
            hooks.append(c)
        elif role == "context":
            context.append(c)
        elif role == "resolution":
            resolution.append(c)
        else:
            tension.append(c)

    story = []

    def add_clip(c, role):
        half = 7.5 / 2
        center = c["start"]
        return {
            "start": round(max(0, center - half), 2),
            "end": round(min(duration, center + half), 2),
            "text": c["text"],
            "role": role,
            "score": c["ml_score"] * 10
        }

    # Build story flow
    if hooks:
        story.append(add_clip(hooks[0], "hook"))

    if context:
        story.append(add_clip(context[0], "context"))

    story += [add_clip(c, "tension") for c in tension[:3]]

    if resolution:
        story.append(add_clip(resolution[0], "resolution"))

    return [story]
    
# -------------------------
# MAIN
# -------------------------
def run():
    duration, fps = get_video_info(video_path)
    segments = load_segments()

    if not segments:
        print(json.dumps({"highlights": [], "trailers": [], "duration": duration}))
        return

    energy_map = get_audio_energy(video_path)
    speech_rates = get_speech_rate(segments)

    scored = score_segments(segments, energy_map, speech_rates)
    # classify first
    hooks, context, tension, resolution = [], [], [], []

    for s in scored:
        role = classify_role(s["text"])

        if role == "hook":
            hooks.append(s)
        elif role == "context":
            context.append(s)
        elif role == "resolution":
            resolution.append(s)
        else:
            tension.append(s)

    # sort each group
    hooks = sorted(hooks, key=lambda x: x["ml_score"], reverse=True)
    context = sorted(context, key=lambda x: x["ml_score"], reverse=True)
    tension = sorted(tension, key=lambda x: x["ml_score"], reverse=True)
    resolution = sorted(resolution, key=lambda x: x["ml_score"], reverse=True)

    # build candidates FROM ROLES
    candidates = []

    if hooks:
        candidates.append(hooks[0])

    if context:
        candidates.append(context[0])

    candidates += tension[:3]

    if resolution:
        candidates.append(resolution[0])

    trailers = build_story_trailer(candidates, duration)

    result = {
    "highlights": trailers[0],
    "trailers": trailers,
    "num_trailers": len(trailers),
    "duration": duration
    }

    print(json.dumps(result))


if __name__ == "__main__":
    run()