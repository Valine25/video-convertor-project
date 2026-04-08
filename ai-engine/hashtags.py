from groq import Groq
import os
from dotenv import load_dotenv
import sys

# Load env variables
load_dotenv()

api_key = os.getenv("GROQ_KEY")

groq_client = Groq(api_key=api_key)

def generate_hashtags(story):
    if not story:
        return ["#viral", "#trending", "#fyp"]

    # Use ALL moments text, not just first 5
    full_text = " ".join([c["text"] for c in story if len(c["text"].strip()) > 5])
    full_text = full_text[:1000]  # give more context

    prompt = f"""You are a social media expert.

Based on this video transcript, generate 6-8 relevant hashtags.

Transcript:
{full_text}

STRICT RULES:
- Output ONLY hashtags, nothing else
- Each tag must start with #
- Tags must be DIRECTLY related to the video content
- No random or generic tags except #fyp and #viral
- No punctuation between tags
- Lowercase only

Example output:
#cooking #healthyfood #recipe #homecook #fyp #viral
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}]
        )

        output = response.choices[0].message.content.strip()
        hashtags = [tag.lower() for tag in output.split() if tag.startswith("#")]
        
        # Make sure #fyp and #viral are always included
        if "#fyp" not in hashtags:
            hashtags.append("#fyp")
        if "#viral" not in hashtags:
            hashtags.append("#viral")

        return hashtags[:8]

    except Exception as e:
        print("GROQ ERROR:", e, file=sys.stderr)
        return ["#viral", "#trending", "#fyp"]