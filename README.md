# For Chi Chii 🌙

A little full-stack love letter. Flask backend, animated frontend.

## What it does
1. **Gather the light** — she sweeps across a black night sky and collects
   drifting stardust that gathers into a glowing heart. As she gathers, the
   Python backend serves her a random tender line.
2. **The story** — a cinematic, chaptered scroll. Each beat of the message
   reveals word-by-word, then *falls away* as the next rises.
3. **Leave a star** — at the end she can write a reply. It's POSTed to the
   Flask backend and saved server-side, so you'll know if she wrote back.

## Run it

```bash
pip install flask
python app.py
```

Then open **http://127.0.0.1:5000** in a browser (full-screen looks best).

## Did she reply?
Check anytime:

```bash
curl http://127.0.0.1:5000/api/echoes
```

Or just open that URL in your browser. Replies are stored in `echoes.json`.

## Files
```
chichii/
├── app.py                  # Flask backend + routes + message data
├── templates/index.html    # the page
├── static/css/style.css     # all styling
├── static/js/main.js        # intro animation, scroll story, backend calls
└── README.md
```

## Customizing
Open `app.py` and edit the `STORY` list to change the message, or `WHISPERS`
for the tender lines shown during the intro. Everything else follows.
