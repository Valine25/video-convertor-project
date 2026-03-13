import json
import random
import sys

video_path = sys.argv[1]

# Simulate highlight detection for now
highlights = []

for i in range(3):
    start = random.randint(10, 200)
    end = start + random.randint(15, 40)

    highlights.append({
        "start": start,
        "end": end
    })

result = {
    "highlights": highlights
}

print(json.dumps(result))