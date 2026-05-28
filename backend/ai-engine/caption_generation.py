from groq import Groq
import os
from dotenv import load_dotenv
import sys

load_dotenv()

api_key = os.getenv("GROQ_KEY")

client = Groq(api_key=api_key)


def generate_caption(story):

    fallback = [
        "This challenge got completely OUT OF CONTROL 😭🔥"
    ]

    if not story:
        return fallback

    try:

        # PICK BEST CLIP
        best_clip = max(
            story,
            key=lambda x: x.get("score", 0)
        )

        # GET TRANSCRIPT
        full_text = best_clip.get("text", "")

        # SMALLER CONTEXT = STRONGER HOOKS
        short_text = full_text[:250]

        prompt = f"""
You write viral Instagram Reel captions.

Write ONLY ONE caption.

Style:
- dramatic
- chaotic
- exaggerated
- energetic
- internet style
- viral hook energy

Avoid:
- emotional storytelling
- motivational tone
- professional language
- corporate sounding captions

Make it feel like:
- crazy Reel hooks
- viral TikTok captions
- hyper internet energy

Examples:

Diet swap gone WILD 😭🔥

This got OUT OF CONTROL real fast 💀

Nah this is actually INSANE 😳

Biggest mistake of our lives 😭

This challenge turned into COMPLETE CHAOS 💥

You won't believe what happened next 😭

Transcript:
{short_text}
"""

        response = client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=1.3,

            top_p=0.95
        )

        output = response.choices[0].message.content.strip()

        print("CAPTION OUTPUT:", file=sys.stderr)
        print(output, file=sys.stderr)

        # CLEAN OUTPUT
        caption = output.split("\n")[0].strip()

        caption = caption.lstrip(
            "-•1234567890. "
        )

        # FALLBACK IF EMPTY
        if not caption:
            return fallback

        return [caption]

    except Exception as e:

        print(
            f"Caption Error: {e}",
            file=sys.stderr
        )

        return fallback