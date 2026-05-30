from groq import Groq
import os
from dotenv import load_dotenv
import sys

# Load env variables
load_dotenv()

api_key = os.getenv("GROQ_KEY")

groq_client = Groq(api_key=api_key)


def generate_hashtags(story):

    fallback = [
        "#fyp",
        "#viral",
        "#reels"
    ]

    if not story:
        return fallback

    try:

        # USE ALL STORY TEXT
        valid_segments = []

        for clip in story:

            text = clip.get("text", "").strip()

            words = text.split()

            if len(words) < 4:
                continue

            if any(char.isalpha() for char in text):
                valid_segments.append(text)

            full_text = " ".join(valid_segments)
            full_text = full_text[:2000]

        prompt = f"""
Generate EXACTLY 8 Instagram hashtags.

IMPORTANT:

Use actual keywords found in the transcript.

Do NOT use generic hashtags such as:
#lifestyle
#vlog
#contentcreator
#vlogger
#vloglife
#lifestylevlog

Focus on:

- people
- events
- activities
- locations
- celebrations
- food
- travel
- hobbies

Use specific hashtags.

BAD EXAMPLE:

#lifestyle
#vlog
#vloglife

GOOD EXAMPLE:

Birthday vlog:
#birthdaycelebration
#birthdaygirl
#birthdaymemories
#specialday

Travel vlog:
#budapesttravel
#europetrip
#traveldiaries
#wanderlust

Food vlog:
#chocolateraspberries
#foodfinds
#foodiefavorites
#breakfastideas

Output ONLY hashtags.

Transcript:
{full_text}
"""

        response = groq_client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],

            temperature=0.8
        )

        output = response.choices[0].message.content.strip()

        print("HASHTAG OUTPUT:", file=sys.stderr)
        print(output, file=sys.stderr)

        hashtags = []

        for token in output.split():

            token = token.strip()

            if (
                token.startswith("#")
                and token.lower() not in hashtags
            ):
                hashtags.append(token.lower())

        # ENSURE THESE EXIST
        if "#fyp" not in hashtags:
            hashtags.append("#fyp")

        if "#viral" not in hashtags:
            hashtags.append("#viral")

        # MINIMUM FALLBACK
        if len(hashtags) < 3:
            return fallback

        return hashtags[:8]

    except Exception as e:

        print(
            f"HASHTAG ERROR: {e}",
            file=sys.stderr
        )

        return fallback