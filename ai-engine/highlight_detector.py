import json
import sys
import os
import cv2
import wave
import audioop
import numpy as np

from sentence_transformers import SentenceTransformer, util
from transformers import pipeline

# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]

# Load models ONCE
embedder = SentenceTransformer('all-MiniLM-L6-v2')
sentiment_model = pipeline("sentiment-analysis", framework="pt")

# ✅ PRECOMPUTE ROLE EMBEDDINGS (VERY IMPORTANT)
HOOK_EMB = embedder.encode("something shocking or surprising")
CONTEXT_EMB = embedder.encode("explaining something")
TENSION_EMB = embedder.encode("conflict suspense")
RESOLUTION_EMB = embedder.encode("final conclusion lesson")

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
    short_words = [w for w in text.split() if len(w) <= 2]
    if len(short_words) > 3:
        return False
    return True

# -------------------------
# STEP 6: ROLE DETECTION (FAST)
# -------------------------
def detect_role_from_embedding(emb):
    scores = {
        "hook": float(util.cos_sim(emb, HOOK_EMB)),
        "context": float(util.cos_sim(emb, CONTEXT_EMB)),
        "tension": float(util.cos_sim(emb, TENSION_EMB)),
        "resolution": float(util.cos_sim(emb, RESOLUTION_EMB))
    }
    return max(scores, key=scores.get)

# -------------------------
# STEP 7: FAST SCORING
# -------------------------
def score_segments(segments, energy_map, speech_rates):
    
    filtered = [seg for seg in segments if is_good_text(seg["text"])]
    if not filtered:
        return []

    texts = [seg["text"] for seg in filtered]

    embeddings = embedder.encode(texts, batch_size=32, show_progress_bar=False)
    sentiments = sentiment_model(texts, batch_size=32)

    scored = []

    for i, seg in enumerate(filtered):
        #  FIXED sentiment
        try:
            label = sentiments[i]["label"]
            score = sentiments[i]["score"]

            if label == "POSITIVE":
                sentiment_score = score
            else:
                sentiment_score = 1 - score
        except:
            sentiment_score = 0.5

        # Audio
        start = int(seg["start"])
        energies = [energy_map.get(t, 0.3) for t in range(start, start + 5)]
        audio_score = sum(energies) / len(energies) if energies else 0.3
        audio_score = min(audio_score, 1)

        # Speech
        speech_score = speech_rates.get(seg["start"], 0.3)
        speech_score = min(speech_score, 1)

        #  Better semantic score
        emb = embeddings[i]
        semantic_score = min(1.0, np.mean(np.abs(emb)))

        final_score = (
            0.4 * sentiment_score +
            0.2 * audio_score +
            0.2 * speech_score +
            0.2 * semantic_score
        )

        scored.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
            "ml_score": round(float(final_score), 3),
            "embedding": emb
        })

    return sorted(scored, key=lambda x: x["ml_score"], reverse=True)
# -------------------------
# STEP 8: BUILD STORY (FIXED)
# -------------------------
def build_story(scored, duration):
    story = []

    def pick_spread_clips(scored, num_clips=8, min_gap=35):
        selected = []
        for clip in scored:
            if len(selected) >= num_clips:
                break
            if all(abs(clip["start"] - s["start"]) > min_gap for s in selected):
                selected.append(clip)
        return selected

    top_clips = pick_spread_clips(scored)
    # ✅ ensure ending clip from last part of video
    end_candidates = [c for c in scored if c["start"] > duration * 0.8]

    if end_candidates:
        best_end = end_candidates[0]  # highest scored from last part

    # replace last clip if not already included
    if best_end not in top_clips:
        top_clips[-1] = best_end

    def clip(c):
        seg_start = c["start"]
        seg_end = c["end"]

        #  better center (speech-aware)
        center = seg_start + (seg_end - seg_start) * 0.6

        TARGET_DUR = 7.5
        half = TARGET_DUR / 2

        start = center - half
        end = center + half

        # use full segment if longer
        if (seg_end - seg_start) > TARGET_DUR:
            start = seg_start
            end = seg_end

        start = max(0, start)
        end = min(duration, end)

        # small extension for ending clips
        if c["start"] > duration * 0.8:
            end = min(duration, end + 1.5)   # extend ending slightly

        return {
            "start": round(start, 2),
            "end": round(end, 2),
            "text": c["text"],
            "role": detect_role_from_embedding(c["embedding"]),
            "score": c["ml_score"] * 10,
            "trailer_index": 0
        }

    story = [clip(c) for c in top_clips]

    #  remove overlaps
    story = sorted(story, key=lambda x: x["start"])
    final_story = []
    last_end = -1

    for c in story:
        if c["start"] >= last_end:
            final_story.append(c)
            last_end = c["end"]

    return [final_story]

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
    trailers = build_story(scored, duration)

    top_scores = [s["ml_score"] for s in scored[:5]] if scored else []
    virality_score = round((sum(top_scores) / len(top_scores)) * 10, 1) if top_scores else 0.0

    result = {
        "highlights": trailers[0] if trailers else [],
        "trailers": trailers,
        "num_trailers": len(trailers),
        "duration": duration,
        "virality_score": virality_score
    }

    print(json.dumps(result))

if __name__ == "__main__":
    run()