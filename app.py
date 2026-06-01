"""
For Chi Chii — a Flask love application.
Run:  pip install flask  &&  python app.py
Then open http://127.0.0.1:5000
"""

from flask import Flask, render_template, jsonify, request
from datetime import datetime
import json
import os
import random

app = Flask(__name__)

# ----------------------------------------------------------------------------
# The story. Each chapter is one beat of the message, revealed as she scrolls.
# Phrases wrapped in | | are rendered as glowing accents on the frontend.
# ----------------------------------------------------------------------------
STORY = [
    {"eyebrow": "for you",   "text": "There's something I've wanted to say."},
    {"eyebrow": "",          "text": "We haven't sat together yet — |not once, not really.|"},
    {"eyebrow": "",          "text": "And still, somehow, you've quietly become |the star I keep looking for.|"},
    {"eyebrow": "",          "text": "Two lights on far sides of the same sky —"},
    {"eyebrow": "",          "text": "with the universe slowly |drawing the line between us.|"},
    {"eyebrow": "",          "text": "And I love where it's pointing."},
    {"eyebrow": "",          "text": "I'd cross the whole sky just to find you |once.|"},
    {"eyebrow": "and it's all for", "text": "Chi Chii", "is_name": True,
     "closer": "you are the most beautiful coincidence I never planned for."},
]

# A few sweet lines the backend serves at random for the "whisper" feature.
WHISPERS = [
    "Something about you stopped me mid-thought.",
    "You make even the quiet feel warm.",
    "There's a whole sky in the way you smile.",
    "I wonder if you feel this too.",
    "Some people are written in starlight.",
    "You are easy to think about and impossible to forget.",
    "Of all the things I've built, you're the one I most wanted to get right.",
]

# Tiny in-memory store for the interactive "leave a star" feature.
DATA_FILE = os.path.join(os.path.dirname(__file__), "echoes.json")


def load_echoes():
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_echoes(echoes):
    with open(DATA_FILE, "w") as f:
        json.dump(echoes, f, indent=2)


@app.context_processor
def inject_asset_version():
    """Cache-busting: append each static file's mtime so the browser always
    fetches the freshest CSS/JS after an edit."""
    def asset_v(filename):
        path = os.path.join(app.static_folder, filename)
        try:
            return int(os.path.getmtime(path))
        except OSError:
            return 0
    return {"asset_v": asset_v}


@app.route("/")
def index():
    return render_template("index.html", story=STORY)


@app.route("/api/whisper")
def whisper():
    """Serve a random tender line — used by the gather-the-light intro."""
    return jsonify({"whisper": random.choice(WHISPERS)})


@app.route("/api/echo", methods=["POST"])
def echo():
    """
    The interactive heart of the app: when Chi Chii reaches the end,
    she can leave a reply — a 'star' that gets saved server-side.
    """
    payload = request.get_json(force=True, silent=True) or {}
    message = (payload.get("message") or "").strip()[:280]
    if not message:
        return jsonify({"ok": False, "error": "empty"}), 400

    echoes = load_echoes()
    echoes.append({
        "message": message,
        "at": datetime.utcnow().isoformat() + "Z",
    })
    save_echoes(echoes)
    return jsonify({"ok": True, "count": len(echoes)})


@app.route("/api/echoes")
def echoes():
    """Return how many stars have been left (so you'll know she replied)."""
    return jsonify({"echoes": load_echoes()})


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
