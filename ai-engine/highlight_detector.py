from email.mime import text
import json
import sys
import os
from turtle import st
import cv2
import wave
import audioop
import numpy as np

from sentence_transformers import SentenceTransformer, util
from transformers import pipeline
from hashtags import generate_hashtags
from thumbnail_generator import generate_thumbnail


# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]

# os.environ["HF_HUB_TIMEOUT"] = "60"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"
# Load models ONCE
embedder = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
# embedder = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",cache_folder="./models")

sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
#  PRECOMPUTE ROLE EMBEDDINGS (VERY IMPORTANT)
HOOK_EMB = embedder.encode([
    "something shocking or surprising",
    "kuch shocking ya surprising",
    "ಒಂದು ಆಶ್ಚರ್ಯಕರ ಅಥವಾ ಶಾಕಿಂಗ್ ವಿಷಯ"
],convert_to_tensor=True)

CONTEXT_EMB = embedder.encode([
    "explaining something",
    "kuch samjha raha hai",
    "ಏನನ್ನಾದರೂ ವಿವರಿಸುತ್ತಿದೆ"
],convert_to_tensor=True)

TENSION_EMB = embedder.encode([
    "conflict suspense tension",
    "tension ya problem ho rahi hai",
    "ತಣಿವು ಅಥವಾ ಸಮಸ್ಯೆ ಉಂಟಾಗಿದೆ"
],convert_to_tensor=True)

RESOLUTION_EMB = embedder.encode([
    "final conclusion lesson",
    "ant mein result ya solution",
    "ಕೊನೆಗೆ ಪರಿಹಾರ ಅಥವಾ نتیجہ"
],convert_to_tensor=True)
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
    text = text.strip()

    if len(text) < 15:
        return False

    words = text.split()

    if len(words) < 4:
        return False

    # Allow non-English scripts
    has_alpha = any(char.isalpha() for char in text)

    return has_alpha
# -------------------------
# STEP 6: ROLE DETECTION (FAST)
# -------------------------
def detect_role_from_embedding(emb):

    def max_sim(emb, ref_embs):
        sims = util.cos_sim(emb, ref_embs)  # tensor
        return float(sims.max().item())     # ✅ FIX

    scores = {
        "hook": max_sim(emb, HOOK_EMB),
        "context": max_sim(emb, CONTEXT_EMB),
        "tension": max_sim(emb, TENSION_EMB),
        "resolution": max_sim(emb, RESOLUTION_EMB)
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

    embeddings = embedder.encode(
    texts,
    batch_size=32,
    show_progress_bar=False,
    convert_to_tensor=True   
)
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
        semantic_score = min(1.0, float(emb.abs().mean().item()))

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
    # for s in scored:
    #     s["ml_score"] = round(s["ml_score"], 3)

    return sorted(scored, key=lambda x: (x["ml_score"], -x["start"]), reverse=True)
    # sorted(scored, key=lambda x: x["ml_score"], reverse=True)
# -------------------------
# STEP 8: BUILD STORY (FIXED)
# -------------------------
def build_story(scored, duration):

    if not scored:
        return []

    # -------------------------
    # 1. Divide into zones
    # -------------------------
    hook_zone = []
    middle_zone = []
    ending_zone = []

    for clip in scored:
        ratio = clip["start"] / duration if duration > 0 else 0

        if ratio < 0.2:
            hook_zone.append(clip)
        elif ratio < 0.8:
            middle_zone.append(clip)
        else:
            ending_zone.append(clip)

    # Sort each zone
    hook_zone = sorted(hook_zone, key=lambda x: x["ml_score"], reverse=True)
    middle_zone = sorted(middle_zone, key=lambda x: x["ml_score"], reverse=True)
    ending_zone = sorted(ending_zone, key=lambda x: x["ml_score"], reverse=True)

    # -------------------------
    # 2. Smart picker (less random)
    # -------------------------
    def pick_clips(zone, num, min_gap=25):
        selected = []

        for clip in zone:
            if len(selected) >= num:
                break

            if all(abs(clip["start"] - s["start"]) > min_gap for s in selected):
                selected.append(clip)

        return selected

    # -------------------------
    # 3. Story Structure
    # -------------------------
    hook_clips = pick_clips(hook_zone, 2)
    middle_clips = pick_clips(middle_zone, 5)
    ending_clips = pick_clips(ending_zone, 2)

    # fallback (important if zones empty)
    if not hook_clips:
        hook_clips = scored[:2]

    if not ending_clips:
        ending_clips = scored[-2:]

    story_clips = hook_clips + middle_clips + ending_clips

    # -------------------------
    # 4. Clip shaping (BETTER TIMING)
    # -------------------------
    def shape_clip(c):
        seg_start = c["start"]
        seg_end = c["end"]

        center = seg_start + (seg_end - seg_start) * 0.65

        TARGET_DUR = 8
        half = TARGET_DUR / 2

        start = center - half
        end = center + half

        # If original segment longer → keep it
        if (seg_end - seg_start) > TARGET_DUR:
            start = seg_start
            end = seg_end

        # Clamp within video
        start = max(0, start)
        end = min(duration, end)

        #  FIX: Limit max clip duration (AFTER defining start/end)
        MAX_CLIP = 8
        if (end - start) > MAX_CLIP:
            end = start + MAX_CLIP

        return {
        "start": round(start, 2),
        "end": round(end, 2),
        "text": c["text"],
        "role": detect_role_from_embedding(c["embedding"]),
        "score": c["ml_score"] * 10,
        "trailer_index": 0
        }
    
    story = [shape_clip(c) for c in story_clips]

    # -------------------------
    # 5. Sort + Remove overlaps
    # -------------------------
    story = sorted(story, key=lambda x: x["start"])

    final_story = []
    last_end = -1

    for clip in story:
        if clip["start"] >= last_end:
            final_story.append(clip)
            last_end = clip["end"]

    # -------------------------
    # 6. Improve continuity (reduce jumps)
    # -------------------------
    for i in range(1, len(final_story)):
        gap = final_story[i]["start"] - final_story[i - 1]["end"]

        if gap > 50:
            final_story[i]["score"] *= 0.85  # penalize jumpy clips

    # -------------------------
    # 7. FIX ENDING (IMPORTANT)
    # -------------------------
    if final_story:
        last_clip = final_story[-1]

        # extend ending smoothly
        extend_by = 2.5
        last_clip["end"] = min(duration, last_clip["end"] + extend_by)
    
    def enforce_duration_limits(story, min_total=30, max_total=60):

        def total_duration(st):
            return sum(c["end"] - c["start"] for c in st)

        # -------------------------
        # TRIM if too long
        # -------------------------
        while total_duration(story) > max_total and len(story) > 1:
            # remove lowest score clip
            story = sorted(story, key=lambda x: x["score"])
            story.pop(0)

        # -------------------------
        # EXTEND if too short
        # -------------------------
        if total_duration(story) < min_total:
            extra_needed = min_total - total_duration(story)
            per_clip_extra = extra_needed / len(story)

            for clip in story:
                clip["end"] = min(duration, clip["end"] + per_clip_extra)

        return story

    final_story = enforce_duration_limits(final_story)

    # 🔥 FINAL ORDER FIX (VERY IMPORTANT)
    final_story = sorted(final_story, key=lambda x: x["start"])

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

    def compute_virality_score(story, scored):

        if not story:
            return 0.0

        # -------------------------
        # 1. Hook strength (VERY IMPORTANT)
        # -------------------------
        hook_score = 0
        if story:
            hook_score = story[0]["score"] / 10  # first clip impact

        # -------------------------
        # 2. Average clip quality
        # -------------------------
        avg_score = sum(c["score"] for c in story) / len(story) / 10

        # -------------------------
        # 3. Emotional variation (spikes)
        # -------------------------
        scores = [c["score"] for c in story]
        variation = min(1.0, np.std(scores) / 10) if len(scores) > 1 else 0

        # -------------------------
        # 4. Ending strength
        # -------------------------
        end_score = story[-1]["score"] / 10 if story else 0

        # -------------------------
        # 5. Story flow (penalize gaps)
        # -------------------------
        flow_penalty = 0
        for i in range(1, len(story)):
            gap = story[i]["start"] - story[i-1]["end"]
            if gap > 60:
                flow_penalty += 0.05

        flow_score = max(0, 1 - flow_penalty)

        # -------------------------
        # FINAL VIRALITY
        # -------------------------
        virality = (
            0.30 * hook_score +
            0.25 * avg_score +
            0.15 * variation +
            0.20 * end_score +
            0.10 * flow_score
        )

        return round(min(10, virality * 10), 1)
    
    story = trailers[0] if trailers else []
    virality_score = compute_virality_score(story, scored)
    hashtags = generate_hashtags(story)
    result = {
        "highlights": trailers[0] if trailers else [],
        "trailers": trailers,
        "num_trailers": len(trailers),
        "duration": duration,
        "virality_score": virality_score
    }

    print(json.dumps(result))
    #  Print virality score clearly in terminal
    print("\n==============================", file=sys.stderr)
    print(f"VIRALITY SCORE: {virality_score} / 10", file=sys.stderr)
    print("==============================\n", file=sys.stderr)

    print("HASHTAGS:", file=sys.stderr)
    print(" ".join(hashtags), file=sys.stderr)

    frame_folder = "ai-engine/frames"
    video_path = sys.argv[1]  # already used in your preprocess

    thumbnail_path = generate_thumbnail(frame_folder, video_path)

    print(f"Thumbnail: {thumbnail_path}", file=sys.stderr)

if __name__ == "__main__":
    run()