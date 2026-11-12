import { Music } from './music.js';
// Scrapline sound: every effect and the funk soundtrack are synthesized live with the Web Audio API.
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
  musicBus.gain.setTargetAtTime(settings.music * 0.5, t, 0.03);
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
  disc: () => { tone({ type: 'p25', f: 700, f2: 1500, dur: 0.1, v: 0.1, vib: 60, vibDepth: 80 }); noise({ ft: 'bandpass', f: 5200, f2: 2600, dur: 0.12, v: 0.12, q: 3 }); },
  ricochet: () => { tone({ type: 'triangle', f: 2400, f2: 1700, dur: 0.07, v: 0.07 }); noise({ ft: 'highpass', f: 4000, dur: 0.03, v: 0.06 }); },
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
const MIN_GAP = { ricochet: 0.05, hit: 0.03, chip: 0.022, enemyShot: 0.05, smg: 0.05, explode: 0.04 };

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
// Songs and instruments live in music.js (groovy synth-funk). This file just drives the scheduler.
let music = null, pendingTrack = null, timer = null;
export function playMusic(name) {
  if (!ctx) { pendingTrack = name; return; }
  if (!music) music = new Music(ctx, musicBus);
  music.play(name);
  if (!timer) timer = setInterval(() => { if (ctx.state === 'running') music.tick(); }, 25);
}
export function stopMusic() { if (timer) clearInterval(timer); timer = null; music?.stop(); }
export function duckMusic(on) { if (ctx) musicDuck.gain.setTargetAtTime(on ? 0.35 : 1, ctx.currentTime, 0.1); }

// Dev helper: tap the final mix as a MediaStream (used to record audio previews).
export function recordTap() { if (!ctx) return null; const d = ctx.createMediaStreamDestination(); comp.limiter.connect(d); return d.stream; }
