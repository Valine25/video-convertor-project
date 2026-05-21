from groq import Groq
import os
from dotenv import load_dotenv
import sys

load_dotenv()

api_key = os.getenv("GROQ_KEY")

client = Groq(api_key=api_key)

def generate_caption(story):
    if not story:
        return [
            "This reel is too good.\nWatch till the end 👀"
        ]

    try:
        best_clip = max(
            story,
            key=lambda x: x.get("score", 0)
        )

        full_text = best_clip.get("text", "")

        prompt = f"""
You are an expert Instagram Reels caption writer.

Generate ONLY 3 viral Instagram Reel captions.

STYLE RULES:

* Captions should feel like Instagram Reels/TikTok hooks
* Conversational tone
* Gen Z style
* Emotional, catchy, relatable
* Focus on ONE strong moment
* No long explanations
* No hashtags
* No numbering
* Make it feel human
* Each caption should be ONE compact sentence
* Maximum 8 to 14 words
* give 2 sentences.

GOOD EXAMPLES:

Just had the best idea 💡 Gonna change everything.

This fit is unreal 😭 Need this ASAP.

Nah this transition is actually insane 🔥.
\

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
            ]
        )

        output = response.choices[0].message.content.strip()

        captions = [
            c.strip()
            for c in output.split("---")
            if c.strip()
        ]

        return captions[:3]

    except Exception as e:
        print(f"Caption Error: {e}", file=sys.stderr)
        return [
            "This reel is insane.\nWait till the end 🔥"
        ]

