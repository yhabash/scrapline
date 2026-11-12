// Scrapline sound: every effect and the synthwave soundtrack are synthesized live with the Web Audio API.
// No audio files. "Refined 16-bit": pulse and saw voices, filtered noise, short echoes and a soft compressor.

const SETTINGS_KEY = 'scrapline_audio_v1';
let ctx = null, master, sfxBus, musicBus, musicDuck, echoIn, comp, noiseBuf, pulse12, pulse25;
let settings = { music: 0.6, sfx: 0.8, muted: false };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* defaults */ }
const lastPlayed = {};

export function getSettings() { return { ...settings }; }
export function setSetting(k, v) {
  settings[k] = v;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ }
  applyVolumes();
}
export function toggleMute() { setSetting('muted', !settings.muted); return settings.muted; }

function applyVolumes() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.muted ? 0 : 2.4, t, 0.03);
  sfxBus.gain.setTargetAtTime(settings.sfx * 0.9, t, 0.03);
  musicBus.gain.setTargetAtTime(settings.music * 0.8, t, 0.03);
}

function makePulse(duty) {
  const n = 64, re = new Float32Array(n), im = new Float32Array(n);
  for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
  return ctx.createPeriodicWave(re, im);
}

// Must be called from a user gesture (first tap/click/key) to satisfy browser autoplay rules.
export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended' && !hiddenSuspend) ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
  master = ctx.createGain(); master.connect(comp); comp.connect(limiter); limiter.connect(ctx.destination);
  comp.limiter = limiter;
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  musicDuck = ctx.createGain(); musicDuck.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(musicDuck);
  // shared echo for that polished 16-bit space
  echoIn = ctx.createGain(); echoIn.gain.value = 1;
  const d = ctx.createDelay(1); d.delayTime.value = 0.19;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  echoIn.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  pulse12 = makePulse(0.125); pulse25 = makePulse(0.25);
  applyVolumes();
  if (pendingTrack) { const t = pendingTrack; pendingTrack = null; playMusic(t); }
}

let hiddenSuspend = false;
export function suspendForHidden(hidden) {
  if (!ctx) return;
  hiddenSuspend = hidden;
  if (hidden) ctx.suspend(); else ctx.resume();
}

// ---------------------------------------------------------------- voices
function env(g, t, a, peak, dur, curve = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(curve, t + dur);
}
function tone(o) {
  const t = (o.at ?? ctx.currentTime) + (o.delay || 0);
  const osc = ctx.createOscillator();
  if (o.type === 'p12') osc.setPeriodicWave(pulse12); else if (o.type === 'p25') osc.setPeriodicWave(pulse25); else osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + (o.slide ?? o.dur));
  if (o.detune) osc.detune.value = o.detune;
  if (o.vib) {
    const l = ctx.createOscillator(), lg = ctx.createGain();
    l.frequency.value = o.vib; lg.gain.value = o.vibDepth || 18;
    l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.05);
  }
  const g = ctx.createGain();
  env(g, t, o.a ?? 0.004, o.v ?? 0.2, o.dur);
  let node = osc;
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t); if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + o.dur); f.Q.value = o.q ?? 1; node.connect(f); node = f; }
  node.connect(g);
  g.connect(o.bus || sfxBus);
  if (o.echo) { const s = ctx.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(echoIn); }
  osc.start(t); osc.stop(t + o.dur + 0.05);
}
function noise(o) {
  const t = (o.at ?? ctx.currentTime) + (o.delay || 0);
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  src.playbackRate.value = o.rate ?? 1;
  const f = ctx.createBiquadFilter(); f.type = o.ft || 'lowpass';
  f.frequency.setValueAtTime(o.f || 2000, t);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
  f.Q.value = o.q ?? 0.8;
  const g = ctx.createGain(); env(g, t, o.a ?? 0.003, o.v ?? 0.2, o.dur);
  src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
  if (o.echo) { const s = ctx.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(echoIn); }
  src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
}
const notes = (list, step, fn) => list.forEach((f, i) => fn(f, i * step));

// ---------------------------------------------------------------- sound effects
const SFX = {
  pistol: () => { tone({ type: 'p25', f: 920, f2: 240, dur: 0.09, v: 0.16 }); noise({ ft: 'highpass', f: 3500, dur: 0.035, v: 0.08 }); },
  smg: () => { tone({ type: 'p12', f: 1300, f2: 480, dur: 0.05, v: 0.11 }); noise({ ft: 'highpass', f: 5000, dur: 0.02, v: 0.05 }); },
  scatter: () => { noise({ ft: 'bandpass', f: 1400, f2: 260, dur: 0.2, v: 0.32, q: 0.7 }); tone({ type: 'square', f: 170, f2: 55, dur: 0.14, v: 0.16, lp: 900 }); },
  arc: () => { tone({ type: 'sawtooth', f: 1300, f2: 2300, dur: 0.12, v: 0.08, vib: 40, vibDepth: 60, lp: 5000 }); tone({ type: 'triangle', f: 650, f2: 1600, dur: 0.12, v: 0.12, echo: 0.3 }); },
  rail: () => { tone({ type: 'sawtooth', f: 180, f2: 2600, dur: 0.07, v: 0.1 }); noise({ ft: 'bandpass', f: 4000, f2: 600, dur: 0.3, v: 0.22, delay: 0.05 }); tone({ type: 'sine', f: 1900, f2: 110, dur: 0.4, v: 0.2, delay: 0.05, echo: 0.4 }); },
  blade: () => { noise({ ft: 'bandpass', f: 3200, f2: 700, dur: 0.14, v: 0.22, q: 2 }); tone({ type: 'triangle', f: 600, f2: 1300, dur: 0.1, v: 0.08 }); },
  launcher: () => { tone({ type: 'square', f: 150, f2: 70, dur: 0.12, v: 0.18, lp: 700 }); noise({ f: 700, f2: 150, dur: 0.16, v: 0.16 }); },
  enemyShot: () => tone({ type: 'p25', f: 640, f2: 300, dur: 0.08, v: 0.06 }),
  hit: () => tone({ type: 'square', f: 420, f2: 180, dur: 0.045, v: 0.07, lp: 2400 }),
  explode: () => { noise({ f: 2000, f2: 160, dur: 0.38, v: 0.34 }); tone({ type: 'square', f: 130, f2: 40, dur: 0.28, v: 0.16, lp: 500 }); },
  explodeBig: () => {
    noise({ f: 1400, f2: 70, dur: 1.1, v: 0.45, echo: 0.3 }); tone({ type: 'sine', f: 90, f2: 28, dur: 0.9, v: 0.4 });
    for (let i = 0; i < 4; i++) noise({ ft: 'bandpass', f: 1800 - i * 250, f2: 300, dur: 0.18, v: 0.2, delay: 0.12 + i * 0.13 });
  },
  jump: () => tone({ type: 'p25', f: 300, f2: 620, dur: 0.1, v: 0.09, slide: 0.08 }),
  doubleJump: () => { tone({ type: 'p25', f: 460, f2: 940, dur: 0.11, v: 0.09, slide: 0.08 }); noise({ ft: 'highpass', f: 2500, dur: 0.08, v: 0.04 }); },
  wallJump: () => { noise({ ft: 'bandpass', f: 900, dur: 0.04, v: 0.12 }); tone({ type: 'p25', f: 360, f2: 760, dur: 0.1, v: 0.09, delay: 0.015 }); },
  chip: (combo = 0) => { const b = 1320 * Math.pow(2, Math.min(combo, 8) / 24); tone({ type: 'p12', f: b, dur: 0.05, v: 0.07 }); tone({ type: 'p12', f: b * 1.335, dur: 0.09, v: 0.07, delay: 0.045, echo: 0.2 }); },
  crate: () => notes([523, 659, 784, 1047, 1319], 0.055, (f, d) => tone({ type: 'p25', f, dur: 0.12, v: 0.1, delay: d, echo: 0.35 })),
  heal: () => notes([392, 523, 659, 784], 0.06, (f, d) => tone({ type: 'triangle', f, dur: 0.16, v: 0.14, delay: d, echo: 0.3 })),
  hurt: () => { tone({ type: 'square', f: 240, f2: 70, dur: 0.24, v: 0.16, lp: 1600 }); noise({ f: 1500, f2: 300, dur: 0.18, v: 0.16 }); },
  armorBreak: () => { noise({ ft: 'highpass', f: 2500, dur: 0.16, v: 0.16 }); tone({ type: 'triangle', f: 1400, f2: 300, dur: 0.22, v: 0.14 }); },
  death: () => { notes([440, 349, 262, 196, 131], 0.09, (f, d) => tone({ type: 'p25', f, dur: 0.16, v: 0.12, delay: d })); SFX.explodeBig(); },
  warning: () => { for (let i = 0; i < 3; i++) { tone({ type: 'square', f: 440, dur: 0.2, v: 0.09, delay: i * 0.42, lp: 2000 }); tone({ type: 'square', f: 330, dur: 0.2, v: 0.09, delay: i * 0.42 + 0.21, lp: 2000 }); } },
  bossDown: () => { SFX.explodeBig(); notes([523, 659, 784, 1047], 0.11, (f, d) => tone({ type: 'p25', f, dur: d === 0.33 ? 0.6 : 0.14, v: 0.12, delay: 1.0 + d, echo: 0.4 })); },
  victory: () => notes([523, 659, 784, 1047, 784, 1047], 0.1, (f, d) => tone({ type: 'p25', f, dur: 0.2, v: 0.12, delay: d, echo: 0.4 })),
  uiMove: () => tone({ type: 'p12', f: 880, dur: 0.03, v: 0.05 }),
  uiSelect: () => { tone({ type: 'p25', f: 660, dur: 0.05, v: 0.08 }); tone({ type: 'p25', f: 1320, dur: 0.08, v: 0.08, delay: 0.05 }); },
  uiBack: () => { tone({ type: 'p25', f: 520, dur: 0.05, v: 0.07 }); tone({ type: 'p25', f: 390, dur: 0.08, v: 0.07, delay: 0.05 }); },
  uiDenied: () => tone({ type: 'square', f: 110, dur: 0.18, v: 0.1, lp: 600 }),
  buy: () => { notes([988, 1319], 0.07, (f, d) => tone({ type: 'p12', f, dur: 0.1, v: 0.09, delay: d })); SFX.crate(); },
  supply: () => { noise({ ft: 'bandpass', f: 500, f2: 1500, dur: 0.5, v: 0.08 }); tone({ type: 'sine', f: 880, dur: 0.12, v: 0.06, delay: 0.1 }); tone({ type: 'sine', f: 1175, dur: 0.18, v: 0.06, delay: 0.22, echo: 0.3 }); },
  shock: () => { noise({ f: 900, f2: 120, dur: 0.4, v: 0.3 }); tone({ type: 'sine', f: 70, f2: 35, dur: 0.35, v: 0.3 }); },
  laserCharge: () => tone({ type: 'sawtooth', f: 200, f2: 1600, dur: 0.6, v: 0.06, lp: 3000, slide: 0.6 }),
  laserFire: () => { tone({ type: 'sawtooth', f: 110, dur: 0.45, v: 0.14, vib: 30, vibDepth: 30, lp: 2400 }); noise({ ft: 'highpass', f: 3000, dur: 0.4, v: 0.06 }); },
};
const MIN_GAP = { hit: 0.03, chip: 0.022, enemyShot: 0.05, smg: 0.05, explode: 0.04 };

export function sfx(name, arg) {
  if (!ctx || settings.muted || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (MIN_GAP[name] && lastPlayed[name] && now - lastPlayed[name] < MIN_GAP[name]) return;
  lastPlayed[name] = now;
  try { SFX[name]?.(arg); } catch (e) { /* never let audio break the game */ }
}

// storm rumble: continuous filtered noise whose level follows the storm's distance
let stormNode = null;
export function setStorm(level) {
  if (!ctx) return;
  if (!stormNode && level > 0) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    stormNode = { src, f, g };
  }
  if (stormNode) {
    stormNode.g.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.35, ctx.currentTime, 0.15);
    stormNode.f.frequency.setTargetAtTime(300 + level * 500, ctx.currentTime, 0.2);
  }
}
export function stopStorm() { if (stormNode) { try { stormNode.src.stop(); } catch (e) { /* already stopped */ } stormNode = null; } }

// ---------------------------------------------------------------- music
// 16-step bars. Chords are MIDI notes [root(bass), pad notes...].
const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TRACKS = {
  menu: {
    bpm: 92, swing: 0,
    chords: [[33, 57, 60, 64], [29, 57, 60, 65], [36, 55, 60, 64], [31, 55, 59, 62]],
    kick: [0, 10], snare: [8], hat: [2, 6, 10, 14], bass: [0, 3, 6, 8, 11, 14], bassOct: false, arp: true, arpRate: 2, lead: null, padLevel: 0.07,
  },
  run: {
    bpm: 116,
    chords: [[33, 57, 60, 64], [33, 57, 60, 64], [29, 57, 60, 65], [31, 55, 59, 62], [33, 57, 60, 64], [33, 57, 60, 64], [36, 55, 60, 64], [31, 55, 59, 62]],
    kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], hat16: true, bass: [0, 2, 4, 6, 8, 10, 12, 14], bassOct: true, arp: true, arpRate: 1, padLevel: 0.05,
    lead: [69, null, 72, null, 76, null, 74, 72, null, null, 69, null, 67, null, 69, null],
    leadEvery: 2,
  },
  boss: {
    bpm: 134,
    chords: [[38, 62, 65, 69], [34, 58, 62, 65], [36, 60, 64, 67], [33, 57, 61, 64]],
    kick: [0, 3, 6, 8, 11, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], hat16: true, bass: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], bassOct: true, arp: true, arpRate: 1, padLevel: 0.05,
    lead: [74, null, 74, 77, null, 76, 74, null, 72, null, 74, null, 69, null, null, null],
    leadEvery: 1,
  },
};
let current = null, pendingTrack = null, step = 0, bar = 0, nextTime = 0, timer = null, queued = null;

export function playMusic(name) {
  if (!ctx) { pendingTrack = name; return; }
  if (current === name && timer) return;
  if (!timer) { current = name; step = 0; bar = 0; nextTime = ctx.currentTime + 0.08; timer = setInterval(schedule, 25); return; }
  queued = name; // switch on the next bar line
}
export function stopMusic() { if (timer) clearInterval(timer); timer = null; current = null; queued = null; }
export function duckMusic(on) { if (ctx) musicDuck.gain.setTargetAtTime(on ? 0.35 : 1, ctx.currentTime, 0.1); }

function schedule() {
  if (!ctx || ctx.state !== 'running') return;
  while (nextTime < ctx.currentTime + 0.15) {
    if (step === 0 && queued) { current = queued; queued = null; bar = 0; }
    playStep(TRACKS[current], step, bar, nextTime);
    const spb = 60 / TRACKS[current].bpm / 4;
    nextTime += spb;
    step = (step + 1) % 16;
    if (step === 0) bar++;
  }
}
function playStep(T, s, b, t) {
  const bus = musicBus, ch = T.chords[b % T.chords.length], spb = 60 / T.bpm / 4;
  // drums
  if (T.kick.includes(s)) { tone({ at: t, type: 'sine', f: 150, f2: 42, dur: 0.26, v: 0.5, slide: 0.12, bus }); }
  if (T.snare.includes(s)) { noise({ at: t, ft: 'bandpass', f: 1900, dur: 0.16, v: 0.22, q: 0.6, bus, echo: 0.12 }); tone({ at: t, type: 'triangle', f: 210, f2: 140, dur: 0.1, v: 0.12, bus }); }
  if (T.hat.includes(s)) noise({ at: t, ft: 'highpass', f: 7500, dur: s % 4 === 2 ? 0.09 : 0.04, v: 0.06, bus });
  else if (T.hat16 && s % 2 === 1) noise({ at: t, ft: 'highpass', f: 9000, dur: 0.025, v: 0.025, bus });
  // bass
  if (T.bass.includes(s)) {
    const n = ch[0] + 12 + (T.bassOct && s % 4 === 2 ? 12 : 0);
    tone({ at: t, type: 'sawtooth', f: m2f(n), dur: spb * 1.6, v: 0.13, lp: 900, lp2: 260, q: 4, bus });
  }
  // pad on the bar line
  if (s === 0) ch.slice(1).forEach((n, i) => tone({ at: t, type: 'sawtooth', f: m2f(n), dur: spb * 16, v: T.padLevel, a: 0.5, lp: 1300, detune: i % 2 ? 7 : -7, bus, echo: 0.15 }));
  // arpeggio with echo
  if (T.arp && s % T.arpRate === 0) {
    const tones = ch.slice(1), idx = (s / T.arpRate) % (tones.length * 2 - 2);
    const n = tones[idx < tones.length ? idx : tones.length * 2 - 2 - idx] + 12;
    tone({ at: t, type: 'p25', f: m2f(n), dur: spb * 0.9, v: 0.045, lp: 3200, bus, echo: 0.35 });
  }
  // lead melody
  if (T.lead && b % (T.leadEvery || 1) === (T.leadEvery ? T.leadEvery - 1 : 0)) {
    const n = T.lead[s];
    if (n) tone({ at: t, type: 'p25', f: m2f(n), dur: spb * 1.8, v: 0.06, vib: 5.5, vibDepth: 6, lp: 3500, bus, echo: 0.4 });
  }
}

// Dev helper: tap the final mix as a MediaStream (used to record audio previews).
export function recordTap() { if (!ctx) return null; const d = ctx.createMediaStreamDestination(); comp.limiter.connect(d); return d.stream; }
