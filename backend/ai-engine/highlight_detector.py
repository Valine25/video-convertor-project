import json
import sys
import os
import cv2
import wave
import audioop
import numpy as np

from sentence_transformers import SentenceTransformer, util
from transformers import pipeline

from hashtags import generate_hashtags
from thumbnail_generator import generate_thumbnail
from caption_generation import generate_caption



# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]

os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "1"

# -------------------------
# LOAD MODELS ONCE
# -------------------------
embedder = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

sentiment_model = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

# -------------------------
# PRECOMPUTED ROLE EMBEDDINGS
# -------------------------
HOOK_EMB = embedder.encode(
    [
        "something shocking or surprising",
        "kuch shocking ya surprising",
        "ಒಂದು ಆಶ್ಚರ್ಯಕರ ಅಥವಾ ಶಾಕಿಂಗ್ ವಿಷಯ"
    ],
    convert_to_tensor=True
)

CONTEXT_EMB = embedder.encode(
    [
        "explaining something",
        "kuch samjha raha hai",
        "ಏನನ್ನಾದರೂ ವಿವರಿಸುತ್ತಿದೆ"
    ],
    convert_to_tensor=True
)

TENSION_EMB = embedder.encode(
    [
        "conflict suspense tension",
        "tension ya problem ho rahi hai",
        "ತಣಿವು ಅಥವಾ ಸಮಸ್ಯೆ ಉಂಟಾಗಿದೆ"
    ],
    convert_to_tensor=True
)

RESOLUTION_EMB = embedder.encode(
    [
        "final conclusion lesson",
        "ant mein result ya solution",
        "ಕೊನೆಗೆ ಪರಿಹಾರ ಅಥವಾ نتيجہ"
    ],
    convert_to_tensor=True
)


# -------------------------
# STEP 1: VIDEO INFO
# -------------------------
def get_video_info(video_path):

    cap = cv2.VideoCapture(video_path)

    fps = cap.get(cv2.CAP_PROP_FPS)

    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)

    duration = int(frame_count / fps) if fps > 0 else 0

    cap.release()

    return duration, fps


# -------------------------
# STEP 2: LOAD SEGMENTS
# -------------------------
def load_segments():

    path = "ai-engine/segments.json"

    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# -------------------------
# STEP 3: AUDIO ENERGY
# -------------------------
def get_audio_energy(video_path):

    filename = os.path.basename(video_path).split(".")[0]

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

    except Exception as e:

        print(f"Audio Energy Error: {e}", file=sys.stderr)

        return {}


# -------------------------
# STEP 4: SPEECH RATE
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

    has_alpha = any(char.isalpha() for char in text)

    return has_alpha


# -------------------------
# STEP 6: ROLE DETECTION
# -------------------------
def detect_role_from_embedding(emb):

    def max_sim(emb, ref_embs):

        sims = util.cos_sim(emb, ref_embs)

        return float(sims.max().item())

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

    filtered = [
        seg for seg in segments
        if is_good_text(seg["text"])
    ]

    if not filtered:
        return []

    texts = [seg["text"] for seg in filtered]

    embeddings = embedder.encode(
        texts,
        batch_size=32,
        show_progress_bar=False,
        convert_to_tensor=True
    )

    sentiments = sentiment_model(
        texts,
        batch_size=32
    )

    scored = []

    for i, seg in enumerate(filtered):

        try:

            label = sentiments[i]["label"]

            score = sentiments[i]["score"]

            sentiment_score = score if label == "POSITIVE" else 1 - score

        except:
            sentiment_score = 0.5

        # AUDIO SCORE
        start = int(seg["start"])

        energies = [
            energy_map.get(t, 0.3)
            for t in range(start, start + 5)
        ]

        audio_score = (
            sum(energies) / len(energies)
            if energies else 0.3
        )

        audio_score = min(audio_score, 1)

        # SPEECH SCORE
        speech_score = speech_rates.get(seg["start"], 0.3)

        speech_score = min(speech_score, 1)

        # SEMANTIC SCORE
        emb = embeddings[i]

        semantic_score = min(
            1.0,
            float(emb.abs().mean().item())
        )

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

    return sorted(
        scored,
        key=lambda x: (x["ml_score"], -x["start"]),
        reverse=True
    )


# -------------------------
# STEP 8: BUILD STORY
# -------------------------
def build_story(scored, duration):

    if not scored:
        return []

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

    hook_zone = sorted(
        hook_zone,
        key=lambda x: x["ml_score"],
        reverse=True
    )

    middle_zone = sorted(
        middle_zone,
        key=lambda x: x["ml_score"],
        reverse=True
    )

    ending_zone = sorted(
        ending_zone,
        key=lambda x: x["ml_score"],
        reverse=True
    )

    def pick_clips(zone, num, min_gap=25):

        selected = []

        for clip in zone:

            if len(selected) >= num:
                break

            if all(
                abs(clip["start"] - s["start"]) > min_gap
                for s in selected
            ):
                selected.append(clip)

        return selected

    hook_clips = pick_clips(hook_zone, 2)

    middle_clips = pick_clips(middle_zone, 5)

    ending_clips = pick_clips(ending_zone, 2)

    if not hook_clips:
        hook_clips = scored[:2]

    if not ending_clips:
        ending_clips = scored[-2:]

    story_clips = hook_clips + middle_clips + ending_clips

    def shape_clip(c):

        seg_start = c["start"]

        seg_end = c["end"]

        center = seg_start + (seg_end - seg_start) * 0.65

        target_dur = 8

        half = target_dur / 2

        start = center - half

        end = center + half

        if (seg_end - seg_start) > target_dur:
            start = seg_start
            end = seg_end

        start = max(0, start)

        end = min(duration, end)

        max_clip = 8

        if (end - start) > max_clip:
            end = start + max_clip

        return {
            "start": round(start, 2),
            "end": round(end, 2),
            "text": c["text"],
            "role": detect_role_from_embedding(c["embedding"]),
            "score": round(c["ml_score"] * 10, 2),
            "trailer_index": 0
        }

    story = [shape_clip(c) for c in story_clips]

    story = sorted(story, key=lambda x: x["start"])

    final_story = []

    last_end = -1

    for clip in story:

        if clip["start"] >= last_end:

            final_story.append(clip)

            last_end = clip["end"]

    # IMPROVE CONTINUITY
    for i in range(1, len(final_story)):

        gap = final_story[i]["start"] - final_story[i - 1]["end"]

        if gap > 50:
            final_story[i]["score"] *= 0.85

    # EXTEND ENDING
    if final_story:

        last_clip = final_story[-1]

        extend_by = 2.5

        last_clip["end"] = min(
            duration,
            last_clip["end"] + extend_by
        )

    def enforce_duration_limits(story, min_total=30, max_total=60):

        def total_duration(st):
            return sum(c["end"] - c["start"] for c in st)

        while total_duration(story) > max_total and len(story) > 1:

            story = sorted(story, key=lambda x: x["score"])

            story.pop(0)

        if total_duration(story) < min_total:

            extra_needed = min_total - total_duration(story)

            per_clip_extra = extra_needed / len(story)

            for clip in story:

                clip["end"] = min(
                    duration,
                    clip["end"] + per_clip_extra
                )

        return story

    final_story = enforce_duration_limits(final_story)

    final_story = sorted(final_story, key=lambda x: x["start"])

    return [final_story]


# -------------------------
# VIRALITY SCORE
# -------------------------
def compute_virality_score(story):

    if not story:
        return 0

    def normalize(score):
        return min(
            1.0,
            max(
                0.0,
                (score - 4) / 3
            )
        )

    hook_score = normalize(
        story[0]["score"]
    )

    avg_score = normalize(
        sum(
            c["score"]
            for c in story
        ) / len(story)
    )

    end_score = normalize(
        story[-1]["score"]
    )

    scores = [
        c["score"]
        for c in story
    ]

    variation = (
        min(
            1.0,
            np.std(scores) / 2
        )
        if len(scores) > 1
        else 0
    )

    flow_penalty = 0

    for i in range(1, len(story)):

        gap = (
            story[i]["start"]
            - story[i - 1]["end"]
        )

        if gap > 60:
            flow_penalty += 0.05

    flow_score = max(
        0,
        1 - flow_penalty
    )

    virality = (
        0.25 * hook_score +
        0.25 * avg_score +
        0.20 * end_score +
        0.15 * variation +
        0.15 * flow_score
    )

    return round(
        virality * 10,
        1
    )

# -------------------------
# MAIN
# -------------------------
def run():

    duration, fps = get_video_info(video_path)

    segments = load_segments()

    if not segments:

        print(json.dumps({
            "highlights": [],
            "trailers": [],
            "duration": duration,
            "hashtags": [],
            "virality_score": 0,
            "thumbnail": ""
        }))

        return

    energy_map = get_audio_energy(video_path)

    speech_rates = get_speech_rate(segments)

    scored = score_segments(
        segments,
        energy_map,
        speech_rates
    )

    trailers = build_story(scored, duration)

    story = trailers[0] if trailers else []

    virality_score = compute_virality_score(story)

    hashtags = generate_hashtags(segments)
    caption = generate_caption(segments)

    # -------------------------
    # THUMBNAIL GENERATION
    # -------------------------
    frame_folder = "ai-engine/frames"

    thumbnail_path = ""

    try:
        
        thumbnail_path = generate_thumbnail(
            frame_folder,
            video_path
        )

        print(
            f"Thumbnail: {thumbnail_path}",
            file=sys.stderr
        )

    except Exception as e:

        print(
            f"Thumbnail Error: {e}",
            file=sys.stderr
        )
    #----------------------------
    # CAPTION GENERATION
    #----------------------------
    
    # -------------------------
    # FINAL RESULT
    # -------------------------
    result = {
        "highlights": story,
        "trailers": trailers,
        "num_trailers": len(trailers),
        "duration": duration,

        "hashtags": hashtags,

        "captions": caption,

        "virality_score": virality_score*10,

        "thumbnail": thumbnail_path
    }

    # JSON OUTPUT FOR NODE.JS
    print(json.dumps(result))

    # DEBUG LOGS
    print("\n==============================", file=sys.stderr)

    print(
        f"VIRALITY SCORE: {virality_score} / 10",
        file=sys.stderr
    )

    print("==============================\n", file=sys.stderr)

    print("HASHTAGS:", file=sys.stderr)

    print(" ".join(hashtags), file=sys.stderr)


# -------------------------
# ENTRY
# -------------------------
if __name__ == "__main__":
    run()



