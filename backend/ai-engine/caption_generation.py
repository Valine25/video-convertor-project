from groq import Groq
import os
from dotenv import load_dotenv
import sys

load_dotenv()

api_key = os.getenv("GROQ_KEY")

client = Groq(api_key=api_key)


def generate_caption(story):

    fallback = [
        "Core memory unlocked ❤️"
    ]

    if not story:
        return fallback

    try:

        # USE ALL STORY TEXT INSTEAD OF ONE CLIP
        valid_segments = []

        for clip in story:

            text = clip.get("text", "").strip()

            words = text.split()

            if len(words) < 4:
                continue

            if any(char.isalpha() for char in text):
                valid_segments.append(text)

        full_text = " ".join(valid_segments)

        prompt = f"""
You are an Instagram Reels caption writer.

Your job is NOT to summarize the video.

Your job is to find the most memorable moment,
emotion, event or theme in the video and turn it
into a caption someone would actually post.

IMPORTANT:

- If the video is a birthday vlog, write a birthday caption
- If the video is travel, write a travel caption
- If the video is food, write a food caption
- If the video is friendship, write a friendship caption
- If the video is family, write a family caption
- If the video is a photoshoot for a birthday, treat it as a birthday vlog, not a photography tutorial

RULES:

- One caption only
- Minimum 7 words
- Human sounding
- Instagram style
- No hashtags
- No quotation marks
- No numbering
- No generic captions
- No describing camera work
- No describing filming
- Focus on what the creator is experiencing

GOOD EXAMPLES:

Birthday vlog:
#birthdayvlog
#birthdaycelebration
#birthdaygirl
#birthdaymemories
#celebrationtime
#specialday
#fyp
#viral

Travel vlog:
#travelvlog
#wanderlust
#traveldiaries
#exploremore
#adventuretime
#travelgram
#fyp
#viral

Lifestyle vlog:
#lifestylevlog
#dayinmylife
#dailyvlog
#everydaymoments
#lifestylecontent
#vloglife
#fyp
#viral


Transcript:
{full_text}
"""

        response = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=1.0,

            top_p=0.9
        )

        output = response.choices[0].message.content.strip()

        print("CAPTION OUTPUT:", file=sys.stderr)
        print(output, file=sys.stderr)

        caption = output.split("\n")[0].strip()

        caption = caption.lstrip(
            "-•1234567890. "
        )

        if not caption:
            return fallback

        return [caption]

    except Exception as e:

        print(
            f"Caption Error: {e}",
            file=sys.stderr
        )

        return fallback