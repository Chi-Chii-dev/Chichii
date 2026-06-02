/* ============================================================
   GLOBAL POINTER + CUSTOM CURSOR
   ============================================================ */
let pointerX = innerWidth / 2, pointerY = innerHeight / 2;   // raw
let nx = 0, ny = 0;                                          // normalized -1..1 from center
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let ringX = pointerX, ringY = pointerY;

window.addEventListener('pointermove', e => {
  pointerX = e.clientX; pointerY = e.clientY;
  nx = (pointerX / innerWidth - 0.5) * 2;
  ny = (pointerY / innerHeight - 0.5) * 2;
  cursor.style.left = pointerX + 'px'; cursor.style.top = pointerY + 'px';
}, { passive: true });

// grow the ring over interactive things
document.addEventListener('pointerover', e => {
  if (e.target.closest('button, a, textarea, .dot, #enterPrompt')) ring.classList.add('hot');
  else ring.classList.remove('hot');
});

function cursorLoop() {
  ringX += (pointerX - ringX) * 0.18;
  ringY += (pointerY - ringY) * 0.18;
  ring.style.left = ringX + 'px'; ring.style.top = ringY + 'px';
  requestAnimationFrame(cursorLoop);
}
cursorLoop();

/* ============================================================
   INTRO — gather drifting stardust into a glowing heart of light
   ============================================================ */
const iCanvas = document.getElementById('introCanvas');
const ix = iCanvas.getContext('2d');
let IW, IH, IDPR;

function iSize() {
  IDPR = Math.min(devicePixelRatio || 1, 2);
  IW = innerWidth; IH = innerHeight;
  iCanvas.width = IW * IDPR; iCanvas.height = IH * IDPR;
  iCanvas.style.width = IW + 'px'; iCanvas.style.height = IH + 'px';
  ix.setTransform(IDPR, 0, 0, IDPR, 0, 0);
}
iSize();

function heartTarget(i, total) {
  const tt = Math.PI - (i / total) * Math.PI * 2;
  const hx = 16 * Math.pow(Math.sin(tt), 3);
  const hy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt);
  const scale = Math.min(IW, IH) * 0.016;
  return { x: IW / 2 + hx * scale, y: IH / 2 - hy * scale + IH * 0.02 };
}

const MOTES = 150;
let motes = [];
function buildMotes() {
  motes = [];
  for (let i = 0; i < MOTES; i++) {
    const tgt = heartTarget(i, MOTES);
    motes.push({
      x: Math.random() * IW, y: Math.random() * IH,
      tx: tgt.x, ty: tgt.y, r: Math.random() * 1.6 + 0.6,
      gathered: false, tw: Math.random() * 6.28, sp: Math.random() * 0.02 + 0.005,
      hue: Math.random() < 0.45 ? '225,40,64' : (Math.random() < 0.5 ? '244,136,154' : '155,18,38'),
      vx: 0, vy: 0
    });
  }
}
buildMotes();

let iStars = [];
function buildIStars() {
  iStars = [];
  const c = Math.floor((IW * IH) / 8000);
  for (let i = 0; i < c; i++) iStars.push({ x: Math.random() * IW, y: Math.random() * IH, r: Math.random() * 1.1 + 0.2, b: Math.random() * 0.4 + 0.1, tw: Math.random() * 6.28, sp: Math.random() * 0.012 + 0.003 });
}
buildIStars();

let gatheredCount = 0, introActive = true, imx = -999, imy = -999;
let whisperShown = false;

function introMove(x, y) {
  imx = x; imy = y;
  const reach = Math.min(IW, IH) * 0.12;
  motes.forEach(m => {
    if (!m.gathered && Math.hypot(x - m.x, y - m.y) < reach) {
      m.gathered = true; gatheredCount++;
      if (gatheredCount > MOTES * 0.3 && !whisperShown) { whisperShown = true; fetchWhisper(); }
      if (gatheredCount >= MOTES * 0.92) showEnter();
    }
  });
}
const introEl = document.getElementById('intro');
introEl.addEventListener('mousemove', e => introMove(e.clientX, e.clientY));
introEl.addEventListener('touchmove', e => { const t = e.touches[0]; introMove(t.clientX, t.clientY); }, { passive: true });
introEl.addEventListener('touchstart', e => { const t = e.touches[0]; introMove(t.clientX, t.clientY); }, { passive: true });

// pull a tender line from the Python backend
function fetchWhisper() {
  fetch('/api/whisper').then(r => r.json()).then(d => {
    const el = document.getElementById('introWhisper');
    el.textContent = d.whisper;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 4200);
  }).catch(() => {});
}

let it = 0;
function introLoop() {
  if (!introActive) return;
  it += 0.016;
  ix.clearRect(0, 0, IW, IH);

  iStars.forEach(s => {
    s.tw += s.sp; const a = s.b + Math.sin(s.tw) * 0.3;
    ix.fillStyle = `rgba(225,40,64,${Math.max(0, a)})`;
    ix.beginPath(); ix.arc(s.x, s.y, s.r, 0, 7); ix.fill();
  });

  motes.forEach(m => {
    m.tw += m.sp;
    if (m.gathered) {
      m.vx += (m.tx - m.x) * 0.02; m.vy += (m.ty - m.y) * 0.02;
      m.vx *= 0.86; m.vy *= 0.86; m.x += m.vx; m.y += m.vy;
    } else {
      m.x += Math.cos(m.tw) * 0.2; m.y += Math.sin(m.tw * 0.8) * 0.2;
    }
    const tw = 0.6 + 0.4 * Math.sin(m.tw * 2);
    const R = m.gathered ? m.r * 1.4 : m.r;
    const g = ix.createRadialGradient(m.x, m.y, 0, m.x, m.y, R * 5);
    g.addColorStop(0, `rgba(${m.hue},${(m.gathered ? 0.9 : 0.5) * tw})`);
    g.addColorStop(0.4, `rgba(${m.hue},${0.2 * tw})`);
    g.addColorStop(1, `rgba(${m.hue},0)`);
    ix.fillStyle = g; ix.beginPath(); ix.arc(m.x, m.y, R * 5, 0, 7); ix.fill();
    ix.fillStyle = `rgba(190,22,48,${(m.gathered ? 1 : 0.6) * tw})`;
    ix.beginPath(); ix.arc(m.x, m.y, R, 0, 7); ix.fill();
  });

  // hand-glow + gather progress ring around the pointer
  if (imx > 0) {
    const g = ix.createRadialGradient(imx, imy, 0, imx, imy, 46);
    g.addColorStop(0, 'rgba(244,136,154,0.25)'); g.addColorStop(1, 'rgba(244,136,154,0)');
    ix.fillStyle = g; ix.beginPath(); ix.arc(imx, imy, 46, 0, 7); ix.fill();

    const prog = Math.min(1, gatheredCount / (MOTES * 0.92));
    ix.beginPath(); ix.arc(imx, imy, 30, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
    ix.strokeStyle = 'rgba(225,29,58,.9)'; ix.lineWidth = 2; ix.lineCap = 'round'; ix.stroke();
  }
  requestAnimationFrame(introLoop);
}
introLoop();

let entered = false;
function showEnter() { document.getElementById('enterPrompt').classList.add('show'); }
function enterStory() {
  if (entered) return; entered = true; introActive = false;
  document.getElementById('introText').style.opacity = '0';
  document.getElementById('enterPrompt').style.opacity = '0';
  document.getElementById('introWhisper').style.opacity = '0';
  const intro = document.getElementById('intro');
  intro.classList.add('done');
  intro.style.opacity = '0';
  setTimeout(() => {
    intro.style.display = 'none';
    revealStory();
  }, 1500);
  window.scrollTo(0, 0);
}
document.getElementById('enterPrompt').addEventListener('click', enterStory);
introEl.addEventListener('click', () => { if (gatheredCount >= MOTES * 0.6) enterStory(); });

/* ============================================================
   READY GATE — a playful yes/no before the letter ("no" runs)
   ============================================================ */
const gate = document.getElementById('gate');
const gateYes = document.getElementById('gateYes');
const gateNo = document.getElementById('gateNo');
let noTries = 0;
const noPhrases = ['no', 'are you sure?', 'really?', 'think again', 'last chance…', 'just say yes ✦', 'please? 🥺', "you can't catch me", '😌', 'yes is right there →'];

function dodge() {
  const pad = 70;
  const x = pad + Math.random() * (innerWidth - pad * 2);
  const y = pad + Math.random() * (innerHeight - pad * 2);
  gateNo.style.position = 'fixed';
  gateNo.style.left = x + 'px';
  gateNo.style.top = y + 'px';
  gateNo.style.margin = '0';
  gateNo.style.transform = 'translate(-50%, -50%)';
  noTries++;
  gateNo.textContent = noPhrases[Math.min(noTries, noPhrases.length - 1)];
}
gateNo.addEventListener('pointerenter', dodge);
gateNo.addEventListener('pointerdown', e => { e.preventDefault(); dodge(); });

// "yes" closes the gate and reveals the gather-the-light intro beneath it
function closeGate() {
  gate.classList.remove('show');
  gate.classList.add('done');
  setTimeout(() => { gate.style.display = 'none'; }, 1000);
  // fade the gather-the-light intro in beneath the closing gate
  introEl.style.opacity = '1';
  introEl.style.pointerEvents = 'auto';
}
gateYes.addEventListener('click', closeGate);

// the gather-the-light "enter" then reveals the actual letter
function revealStory() {
  document.body.classList.remove('locked');
  document.getElementById('scrollCue').classList.add('show');
  document.getElementById('constellation').classList.add('show');
  window.scrollTo(0, 0);
}

// show the opening gate FIRST — keep the gather-the-light intro hidden until "yes"
introEl.style.opacity = '0';
introEl.style.pointerEvents = 'none';
document.body.classList.add('locked');
gate.classList.add('show');
// sequence: heart falls (CSS) -> blooms into the heart-tree + greeting -> slides aside + question
setTimeout(() => gate.classList.add('bloomed'), 1350);
setTimeout(() => gate.classList.add('split'), 4300);

/* ============================================================
   BACKGROUND MUSIC — gentle "Calm Down" loop (file supplied by you)
   ============================================================ */
const bgm = document.getElementById('bgm');
const soundToggle = document.getElementById('soundToggle');
const soundHint = document.getElementById('soundHint');
let soundOn = true, fadeTimer = null;
function hideHint() { if (soundHint) { soundHint.classList.add('hide'); soundHint.classList.remove('show'); } }

function fadeTo(target, ms) {
  if (!bgm) return;
  clearInterval(fadeTimer);
  const steps = 24, start = bgm.volume, dv = (target - start) / steps;
  let i = 0;
  fadeTimer = setInterval(() => {
    i++; bgm.volume = Math.min(1, Math.max(0, start + dv * i));
    if (i >= steps) clearInterval(fadeTimer);
  }, ms / steps);
}

function startBgm() {
  if (!bgm || !soundOn) return;
  bgm.muted = false;
  const p = bgm.play();
  if (p && p.then) p.then(() => { fadeTo(0.35, 1600); hideHint(); }).catch(() => {});
}

if (bgm) {
  bgm.volume = 0;
  startBgm();   // try immediately (browsers may defer until a gesture)
  // browsers block audio until the first interaction — start it then
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, startBgm, { once: true }));
}
// nudge her to tap the speaker for the song (only if it isn't already playing)
setTimeout(() => { if (soundHint && bgm && bgm.paused) soundHint.classList.add('show'); }, 1000);

if (soundToggle) {
  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    soundToggle.classList.toggle('off', !soundOn);
    soundToggle.textContent = soundOn ? '🔊' : '🔇';
    hideHint();
    if (soundOn) { startBgm(); }
    else { fadeTo(0, 500); setTimeout(() => { if (!soundOn && bgm) bgm.pause(); }, 520); }
  });
}

window.addEventListener('resize', () => { iSize(); buildMotes(); buildIStars(); motes.forEach((m, i) => { const t = heartTarget(i, MOTES); m.tx = t.x; m.ty = t.y; }); });

/* ============================================================
   STORY BACKGROUND — parallax stars (scroll + mouse) + shooting stars
   ============================================================ */
const sCanvas = document.getElementById('storyCanvas');
const sx = sCanvas.getContext('2d');
let SW, SH, SDPR;
function sSize() { SDPR = Math.min(devicePixelRatio || 1, 2); SW = innerWidth; SH = innerHeight; sCanvas.width = SW * SDPR; sCanvas.height = SH * SDPR; sCanvas.style.width = SW + 'px'; sCanvas.style.height = SH + 'px'; sx.setTransform(SDPR, 0, 0, SDPR, 0, 0); }
sSize();

let sStars = [];
function buildSStars() {
  sStars = []; const c = Math.floor((SW * SH) / 7000);
  for (let i = 0; i < c; i++) sStars.push({ x: Math.random() * SW, y: Math.random() * SH, r: Math.random() * 1.3 + 0.2, b: Math.random() * 0.45 + 0.12, tw: Math.random() * 6.28, sp: Math.random() * 0.013 + 0.004, hue: Math.random() < 0.3 ? '225,40,64' : (Math.random() < 0.25 ? '155,18,38' : '244,136,154'), depth: Math.random() * 0.6 + 0.2 });
}
buildSStars();

let sShooters = [];
function sSpawn() { const x = Math.random() * SW, y = Math.random() < 0.6 ? -20 : Math.random() * SH * 0.4; const ang = Math.PI * (0.18 + Math.random() * 0.18), sp = 9 + Math.random() * 7; sShooters.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, len: 90 + Math.random() * 120, life: 1, decay: 0.012 + Math.random() * 0.01, w: 1 + Math.random() * 0.8 }); }

let scrollY = 0, lastSh = 0;
let mpx = 0, mpy = 0;   // smoothed mouse parallax
function storyLoop(ts) {
  sx.clearRect(0, 0, SW, SH);
  // ease the mouse parallax for buttery motion
  mpx += (nx * 26 - mpx) * 0.06;
  mpy += (ny * 26 - mpy) * 0.06;
  const par = scrollY * 0.05;
  sStars.forEach(s => {
    s.tw += s.sp; const a = s.b + Math.sin(s.tw) * 0.33;
    let yy = (s.y - par * s.depth - mpy * s.depth) % SH; const drawY = yy < 0 ? yy + SH : yy;
    const drawX = s.x - mpx * s.depth;
    sx.beginPath(); sx.arc(drawX, drawY, s.r, 0, 7);
    sx.fillStyle = `rgba(${s.hue},${Math.max(0, a)})`;
    if (s.r > 1) { sx.shadowColor = `rgba(${s.hue},0.8)`; sx.shadowBlur = 6; } else sx.shadowBlur = 0;
    sx.fill();
  });
  sx.shadowBlur = 0;
  for (let i = sShooters.length - 1; i >= 0; i--) {
    const sh = sShooters[i]; sh.x += sh.vx; sh.y += sh.vy; sh.life -= sh.decay;
    const h = Math.hypot(sh.vx, sh.vy); const tx = sh.x - sh.vx / h * sh.len, ty = sh.y - sh.vy / h * sh.len;
    const g = sx.createLinearGradient(sh.x, sh.y, tx, ty); g.addColorStop(0, `rgba(225,40,64,${sh.life})`); g.addColorStop(1, 'rgba(225,40,64,0)');
    sx.strokeStyle = g; sx.lineWidth = sh.w; sx.lineCap = 'round'; sx.beginPath(); sx.moveTo(sh.x, sh.y); sx.lineTo(tx, ty); sx.stroke();
    sx.fillStyle = `rgba(190,22,48,${sh.life})`; sx.beginPath(); sx.arc(sh.x, sh.y, sh.w, 0, 7); sx.fill();
    if (sh.life <= 0 || sh.y > SH + 50 || sh.x > SW + 50) sShooters.splice(i, 1);
  }
  if (ts - lastSh > 2600 + Math.random() * 3200) { sSpawn(); lastSh = ts; }
  requestAnimationFrame(storyLoop);
}
requestAnimationFrame(storyLoop);
window.addEventListener('resize', () => { sSize(); buildSStars(); });

/* ============================================================
   CONSTELLATION NAVIGATOR — progress + jump-to-chapter
   ============================================================ */
const chapters = Array.from(document.querySelectorAll('.chapter'));
const nav = document.getElementById('constellation');
const track = document.createElement('div'); track.className = 'track';
const trackFill = document.createElement('i'); track.appendChild(trackFill); nav.appendChild(track);
const dots = chapters.map((ch, i) => {
  const labelSrc = ch.querySelector('.ek')?.textContent
    || ch.querySelector('.name')?.textContent
    || ('chapter ' + (i + 1));
  const d = document.createElement('button');
  d.className = 'dot'; d.type = 'button';
  d.setAttribute('data-label', labelSrc.trim().toLowerCase());
  d.addEventListener('click', () => ch.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  nav.appendChild(d);
  return d;
});

/* ============================================================
   SCROLL CHOREOGRAPHY — word reveals + chapter fall-away
   ============================================================ */
document.querySelectorAll('.line').forEach(el => {
  const raw = el.getAttribute('data-text') || '';
  const parts = raw.split('|');
  el.innerHTML = '';
  parts.forEach((seg, si) => {
    const accent = si % 2 === 1;
    seg.split(' ').forEach(word => {
      if (word === '') return;
      const span = document.createElement('span');
      span.className = 'word';
      if (accent) { const a = document.createElement('span'); a.className = 'accent'; a.textContent = word; span.appendChild(a); }
      else span.textContent = word;
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    });
  });
});

let activeChapter = 0;
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    const ch = en.target;
    const idx = chapters.indexOf(ch);
    if (en.isIntersecting && en.intersectionRatio > 0.55) {
      ch.classList.add('inview'); ch.classList.remove('exiting');
      ch.querySelectorAll('.word').forEach((w, i) => { w.style.transitionDelay = (i * 0.08) + 's'; });
      activeChapter = idx;
      dots.forEach((d, i) => { d.classList.toggle('active', i === idx); d.classList.toggle('done', i < idx); });
    } else if (!en.isIntersecting) {
      const rect = ch.getBoundingClientRect();
      if (rect.bottom < 0) { ch.classList.add('exiting'); }
      else { ch.classList.remove('inview'); ch.querySelectorAll('.word').forEach(w => w.style.transitionDelay = '0s'); }
    }
  });
}, { threshold: [0, 0.55, 1] });
chapters.forEach(c => io.observe(c));

const bar = document.getElementById('bar');
const cue = document.getElementById('scrollCue');
window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  const max = document.body.scrollHeight - innerHeight;
  const pct = max > 0 ? scrollY / max * 100 : 0;
  bar.style.width = pct + '%';
  trackFill.style.height = pct + '%';
  if (scrollY > 40) cue.style.opacity = '0';
}, { passive: true });

/* ============================================================
   CARD TILT — glass cards lean toward the cursor
   ============================================================ */
const tiltCards = document.querySelectorAll('.card.tilt');
function tiltLoop() {
  tiltCards.forEach(card => {
    const ch = card.closest('.chapter');
    if (!ch.classList.contains('inview')) { card.style.transform = ''; return; }
    const rx = (-ny * 5).toFixed(2);
    const ry = (nx * 6).toFixed(2);
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  requestAnimationFrame(tiltLoop);
}
tiltLoop();

/* ============================================================
   INTERACTIVE REPLY — talks to the Python backend
   ============================================================ */
const replyInput = document.getElementById('replyInput');
const charCount = document.getElementById('charCount');
if (replyInput) {
  replyInput.addEventListener('input', () => { charCount.textContent = replyInput.value.length + ' / 280'; });
}

const replyBtn = document.getElementById('replyBtn');
if (replyBtn) {
  replyBtn.addEventListener('click', () => {
    const status = document.getElementById('replyStatus');
    const msg = replyInput.value.trim();
    if (!msg) { status.textContent = 'whisper something first…'; status.classList.add('show'); return; }
    replyBtn.disabled = true;
    fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }).then(r => r.json()).then(d => {
      if (d.ok) {
        replyInput.value = ''; charCount.textContent = '0 / 280';
        status.textContent = 'your star is in the sky now ✦';
        status.classList.add('show');
        burstHearts();
      } else {
        status.textContent = 'try once more…'; status.classList.add('show');
        replyBtn.disabled = false;
      }
    }).catch(() => { status.textContent = 'the sky is far tonight — try again.'; status.classList.add('show'); replyBtn.disabled = false; });
  });
}

function burstHearts() {
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      const h = document.createElement('div');
      h.textContent = ['✦', '🩷', '💫', '🌙', '✧'][Math.floor(Math.random() * 5)];
      h.style.cssText = `position:fixed;left:${30 + Math.random() * 40}%;top:${50 + Math.random() * 25}%;z-index:9000;font-size:${12 + Math.random() * 14}px;pointer-events:none;opacity:0;transition:all 3s ease-out;`;
      document.body.appendChild(h);
      requestAnimationFrame(() => { h.style.opacity = '1'; h.style.transform = `translateY(-${120 + Math.random() * 100}px) rotate(${(Math.random() - .5) * 60}deg)`; });
      setTimeout(() => { h.style.opacity = '0'; }, 1800);
      setTimeout(() => h.remove(), 3200);
    }, i * 120);
  }
}
