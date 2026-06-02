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
import urllib.request
import urllib.error

app = Flask(__name__)

# ----------------------------------------------------------------------------
# Storage. Replies persist in Supabase when configured (survives redeploys);
# otherwise they fall back to a local JSON file for development.
# ----------------------------------------------------------------------------
# Defaults are baked in so persistence works without any dashboard config.
# The publishable key is public-safe (Row-Level Security restricts it to
# insert/select on the echoes table). Env vars override if set.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eemcfihirbziubndronx.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_eFM2Ghq8Bu1Eqg36H-0xZA_c5ol1SZd")
SUPABASE_TABLE = os.environ.get("SUPABASE_TABLE", "echoes")
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY)


def _sb_request(method, path, body=None, extra_headers=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw else []

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

# Local fallback store for the interactive "leave a star" feature.
DATA_FILE = os.path.join(os.path.dirname(__file__), "echoes.json")


def load_echoes():
    """Return all replies, oldest first, as [{message, at}]."""
    if USE_SUPABASE:
        try:
            rows = _sb_request("GET", f"{SUPABASE_TABLE}?select=message,at&order=at.asc")
            return rows or []
        except Exception:
            return []
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def add_echo(message, at):
    """Persist a single reply. Returns True on success."""
    if USE_SUPABASE:
        try:
            _sb_request("POST", SUPABASE_TABLE, body={"message": message, "at": at},
                        extra_headers={"Prefer": "return=minimal"})
            return True
        except Exception:
            return False
    try:
        echoes = load_echoes()
        echoes.append({"message": message, "at": at})
        with open(DATA_FILE, "w") as f:
            json.dump(echoes, f, indent=2)
        return True
    except OSError:
        return False


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

    at = datetime.utcnow().isoformat() + "Z"
    if not add_echo(message, at):
        return jsonify({"ok": False, "error": "store"}), 500
    return jsonify({"ok": True})


@app.route("/api/echoes")
def echoes():
    """Return how many stars have been left (so you'll know she replied)."""
    return jsonify({"echoes": load_echoes()})


@app.route("/api/health")
def health():
    """Diagnostic: does the running server see the Supabase config? (no secrets)"""
    return jsonify({
        "supabase_enabled": USE_SUPABASE,
        "supabase_url_set": bool(SUPABASE_URL),
        "supabase_key_set": bool(SUPABASE_KEY),
    })


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
