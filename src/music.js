// Scrapline music engine: groovy, upbeat synth-funk, synthesized live with Web Audio. No audio files.
// Songs have a real form (intro, groove, melody, hook, breakdown) and loop back past the intro.
// Works on a live AudioContext (in game) or an OfflineAudioContext (to render review previews).

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);
function noteToMidi(s) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

// chord voicings (semitones above root) + the chord's third / fifth / seventh for chord-aware bass lines
const QUAL = {
  m7: [0, 3, 7, 10], m9: [3, 7, 10, 14], m11: [3, 7, 10, 17], m6: [0, 3, 7, 9], m7b5: [0, 3, 6, 10],
  7: [0, 4, 7, 10], 9: [4, 7, 10, 14], 13: [4, 10, 14, 21], '7#9': [4, 10, 15], '7b9': [4, 10, 13],
  maj7: [0, 4, 7, 11], maj9: [4, 7, 11, 14], 6: [0, 4, 7, 9], sus: [0, 5, 7, 10], '': [0, 4, 7], m: [0, 3, 7],
};
function parseChord(name) {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  const root = (NOTE[m[1][0]] + (m[1][1] === '#' ? 1 : m[1][1] === 'b' ? -1 : 0) + 12) % 12;
  const q = m[2], iv = QUAL[q];
  if (!iv) throw new Error('unknown chord ' + name);
  let base = 48 + root; if (base < 52) base += 12;
  const minor = q.startsWith('m') && !q.startsWith('maj');
  return {
    bass: 28 + ((root - 4 + 12) % 12), // E1..D#2
    notes: iv.map(i => base + i),
    deg: {
      r: 0, o: 12,
      t: q === 'sus' ? 5 : minor ? 3 : 4,
      f: q === 'm7b5' ? 6 : 7,
      s: q.includes('maj') ? 11 : (q === '6' || q === 'm6') ? 9 : (q === '' || q === 'm') ? 12 : 10,
    },
  };
}
// pattern -> 16 tokens: space-separated tokens, or a plain 16-character string
function toks(s) {
  if (s == null) return null;
  const t = s.trim().includes(' ') ? s.trim().split(/\s+/) : s.split('');
  if (t.length !== 16) throw new Error('pattern needs 16 steps: ' + s);
  return t;
}

// ---------------------------------------------------------------- songs
// drums: 16 chars per bar. k: x accent, o soft | s: X snare, g ghost, c snare+clap, C clap
//        h: c closed, C accent, o open, - pedal | p (tambourine): t, T accent
// bass:  16 tokens. r t f s o = chord root/third/fifth/seventh/octave, or semitones; x dead note;
//        - tie; . rest; ^ suffix = slap pop
// keys:  16 chars. x hit, X accent, - hold, . rest
// brass/lead: 16 tokens. note names (E5), x = chord stab (brass), - tie (may cross bars), . rest
export const SONGS = {
  menu: {
    title: 'Neon Lounge', bpm: 104, swing: 0.13, drumLevel: 0.85,
    drums: {
      hats: { k: 'x.......x.......', s: '................', h: 'c.c.c.cCc.c.c.co', p: '................' },
      groove: { k: 'x......x..x.....', s: '....X.....g.X..g', h: 'c.c.cCc.c.c.cCco', p: '..t...t...t...t.' },
      groove2: { k: 'x......x..x..x..', s: '....X..g..g.X..g', h: 'c.c.cCc.c.c.cCco', p: '..t...t...t...t.' },
      fill: { k: 'x......x..x.....', s: '....X...g.XgXXgX', h: 'c.c.c.c.c.c.....', p: '................' },
      half: { k: 'x.........x.....', s: '........X.......', h: 'c.c.c.c.c.c.c.co', p: '......t.......t.' },
    },
    bass: {
      m1: 'r - . r . x o^ . s . f . r . x f',
      m2: 'r - . f . x s o^ . . r . f . t f',
      walk: 'r . . o^ . s . f . x r . t . f .',
    },
    keys: {
      rh1: 'x--.....x-.x....',
      rh2: '..x-....x--.....',
      long: 'x---------------',
    },
    brass: {
      st1: '....x..x.....x..',
      st2: '..........x.x-..',
    },
    sections: {
      intro: { chords: ['Dm9', 'G13', 'Dm9', 'G13'], drums: ['hats', 'hats', 'groove', 'fill'], bass: [null, null, 'm1', 'm2'], keys: 'rh1', keysInst: 'rhodes', crash: false },
      A: { chords: ['Dm9', 'G13', 'Dm9', 'G13', 'Dm9', 'G13', 'Bbmaj7', 'A7#9'], drums: ['groove', 'groove', 'groove', 'groove2', 'groove', 'groove', 'groove', 'fill'], bass: ['m1', 'm2'], keys: ['rh1', 'rh2'], keysInst: 'rhodes', crash: true },
      Alead: {
        chords: ['Dm9', 'G13', 'Dm9', 'G13', 'Dm9', 'G13', 'Bbmaj7', 'A7#9'], drums: ['groove', 'groove', 'groove', 'groove2', 'groove', 'groove', 'groove', 'fill'], bass: ['m1', 'm2'], keys: ['rh1', 'rh2'], keysInst: 'rhodes', leadInst: 'soft', crash: true,
        lead: [
          '. . A4 . C5 . D5 - - - . C5 D5 . F5 .',
          'E5 - - - D5 . C5 . D5 - - - . . . .',
          '. . A4 . C5 . D5 - - - . C5 D5 . A5 .',
          'G5 - - - F5 . E5 . D5 - - - . . . .',
          '. . F5 . E5 . D5 . C5 . D5 - . . A4 .',
          'B4 - - - . . D5 . E5 - . D5 . . . .',
          '. . D5 . F5 . A5 - - - G5 . F5 . D5 .',
          'E5 - - - . . G5 - E5 - . . . . . .',
        ],
      },
      B: {
        chords: ['Gm9', 'C9', 'Fmaj9', 'Bbmaj7', 'Em7b5', 'A7#9', 'Dm9', 'A7#9'], drums: ['groove2', 'groove', 'groove2', 'groove', 'groove2', 'groove', 'groove2', 'fill'], bass: ['walk'], keys: 'rh2', keysInst: 'rhodes', pad: true, leadInst: 'soft', crash: true,
        lead: [
          'D5 - . F5 . A5 . Bb5 - - . A5 . F5 . .',
          'G5 - - - . . E5 . D5 . E5 - - - . .',
          'C5 - . E5 . G5 . A5 - - . G5 . E5 . .',
          'F5 - - - . . D5 . C5 . D5 - - - . .',
          '. . G5 . Bb5 - . A5 . G5 . . E5 . . .',
          'C#5 - - - . . E5 - . . G5 - . F5 . .',
          'D5 - . . F5 . E5 . D5 . . C5 . A4 . .',
          '. . . . E5 - C#5 - A4 - - - . . . .',
        ],
      },
      Abrass: {
        chords: ['Dm9', 'G13', 'Dm9', 'G13', 'Dm9', 'G13', 'Bbmaj7', 'A7#9'], drums: ['groove', 'groove2', 'groove', 'groove2', 'groove', 'groove2', 'groove', 'fill'], bass: ['m2', 'm1'], keys: ['rh1', 'rh2'], keysInst: 'rhodes', brass: ['st1', 'st2'], leadInst: 'soft', crash: true,
        lead: [
          '. . A4 . C5 . D5 - - - . C5 D5 . F5 .',
          'E5 - - - D5 . C5 . D5 - - - . . . .',
          null, null,
          '. . F5 . E5 . D5 . C5 . D5 - . . A4 .',
          'B4 - - - . . D5 . E5 - . D5 . . . .',
          '. . D5 . F5 . A5 - - - G5 . F5 . D5 .',
          'E5 - - - . . G5 - E5 - . . . . . .',
        ],
      },
      break: { chords: ['Dm9', 'G13', 'Dm9', 'A7#9'], drums: ['half', 'half', 'half', 'fill'], bass: ['walk'], keys: 'long', keysInst: 'rhodes', pad: true, crash: true },
    },
    form: ['intro', 'A', 'Alead', 'B', 'Abrass', 'break'],
    loopFrom: 2,
  },

  run: {
    title: 'Scrap Runner', bpm: 116, swing: 0.09, drumLevel: 1,
    drums: {
      intro: { k: 'x...x...x...x...', s: '................', h: 'c.c.c.c.c.c.c.co', p: '................' },
      intro2: { k: 'x...x...x...x...', s: '........X.X.XXXX', h: 'c.c.c.c.c.c.c.c.', p: '................' },
      g: { k: 'x.....x...x..x..', s: '....X..g.g..X..g', h: 'CcccCcocCcccCcoc', p: '..t...t...t...t.' },
      g2: { k: 'x.x...x...x.....', s: '....X..g.g..X.gX', h: 'CcccCcocCcccCcoc', p: '..t...t...t...t.' },
      hook: { k: 'x.....x.x.x..x..', s: '....c..g.g..c..g', h: 'CcCcCcCcCcCcCcCo', p: 't.t.t.t.t.t.t.t.' },
      fill: { k: 'x.....x...x.....', s: '....X.g.XgX.XXXX', h: 'CcccCccc........', p: '................' },
      bridge: { k: 'x.........x.....', s: '....X.......X...', h: 'c-c-c-coc-c-c-co', p: '..t...t...t...t.' },
    },
    bass: {
      b1: 'r^ . x r . o^ . s . f . r^ x r o^ .',
      b2: 'r^ . r . x . o^ . s f . r . x t f',
      b3: 'r^ - . r o^ . x s . f - . r . o^ s',
      pedal: 'r . r . r . r . r . r . r . r .',
    },
    keys: {
      c1: '..x..x.x..x..x.x',
      c2: 'x.x...x...x.x...',
      c3: '.x.x.x.x.x.x.x.x',
    },
    brass: {
      hit: 'x..x....x-..x...',
      hit2: '..x-..x.....x-..',
      riff: 'E5 . . G5 . A5 - . B5 . . A5 . G5 E5 .',
      riff2: 'D5 . . E5 . G5 - . A5 . . G5 . E5 D5 .',
      stab: 'x-..............',
    },
    sections: {
      intro: { chords: ['Em9', 'Em9'], drums: ['intro', 'intro2'], bass: ['pedal', 'pedal'], crash: false },
      A: { chords: ['Em9', 'A13', 'Em9', 'A13', 'Em9', 'A13', 'Cmaj7', 'B7#9'], drums: ['g', 'g', 'g', 'g2', 'g', 'g', 'g', 'fill'], bass: ['b1', 'b2'], keys: ['c1', 'c2'], keysInst: 'clav', crash: true },
      Alead: {
        chords: ['Em9', 'A13', 'Em9', 'A13', 'Em9', 'A13', 'Cmaj7', 'B7#9'], drums: ['g', 'g', 'g', 'g2', 'g', 'g', 'g', 'fill'], bass: ['b1', 'b2'], keys: ['c1', 'c2'], keysInst: 'clav', leadInst: 'lead', crash: true,
        lead: [
          'B4 . . D5 . E5 - . . G5 . E5 . D5 . .',
          'E5 - - - . . F#5 . E5 . C#5 . . . . .',
          'B4 . . D5 . E5 - . . G5 . A5 . B5 . .',
          'A5 - - - G5 . F#5 . E5 - - - . . . .',
          '. . G5 . F#5 . E5 . D5 . E5 - . . B4 .',
          'C#5 - - - . . E5 . F#5 - . E5 . . . .',
          '. . E5 . G5 . B5 - - - A5 . G5 . E5 .',
          'F#5 - - - D#5 - - - . . . . . . . .',
        ],
      },
      hook: {
        chords: ['Cmaj9', 'D9', 'Em9', 'Em9', 'Cmaj9', 'D9', 'B7#9', 'B7#9'], drums: ['hook', 'hook', 'hook', 'hook', 'hook', 'hook', 'hook', 'fill'], bass: ['b3'], keys: 'c3', keysInst: 'clav', brass: ['hit', 'hit2'], pad: true, leadInst: 'lead', crash: true,
        lead: [
          'E5 - . G5 - . B5 - . A5 . G5 . E5 . .',
          'F#5 - . A5 - . C6 - . B5 . A5 . F#5 . .',
          'G5 - - - . . E5 . B4 . D5 . E5 - - -',
          '- - - - . . . . . . . . B4 . D5 .',
          'E5 - . G5 - . B5 - . A5 . G5 . E5 . .',
          'F#5 - . A5 - . C6 - . B5 . A5 . F#5 . .',
          'A5 - . F#5 - . D#5 - . B4 . D#5 . F#5 . .',
          'B5 - - - - - - - . . . . . . . .',
        ],
      },
      A2: {
        chords: ['Em9', 'A13', 'Em9', 'A13', 'Em9', 'A13', 'Cmaj7', 'B7#9'], drums: ['g2', 'g', 'g2', 'g', 'g2', 'g', 'g2', 'fill'], bass: ['b2', 'b1'], keys: ['c2', 'c1'], keysInst: 'clav', brass: ['riff', 'stab', 'riff2', 'stab'], crash: true,
      },
      bridge: {
        chords: ['Am9', 'D9', 'Gmaj7', 'Cmaj7', 'F#m7b5', 'B7#9', 'Em9', 'B7#9'], drums: ['bridge', 'bridge', 'bridge', 'bridge', 'g', 'g', 'g', 'fill'], bass: ['b3'], keys: ['c2'], keysInst: 'rhodes', pad: true, brass: [null, 'hit2', null, 'hit2', 'hit', 'hit', 'hit', 'hit2'], leadInst: 'lead', crash: true,
        lead: [
          'E5 - - - . . C5 . D5 . E5 . G5 - - -',
          'F#5 - - - . . . . . . . . . . . .',
          'D5 - - - . . B4 . C5 . D5 . F#5 - - -',
          'E5 - - - . . . . . . . . . . . .',
          null, null, null, null,
        ],
      },
    },
    form: ['intro', 'A', 'Alead', 'hook', 'A2', 'bridge', 'hook'],
    loopFrom: 1,
  },

  boss: {
    title: 'Overclock', bpm: 128, swing: 0.05, drumLevel: 1.05,
    drums: {
      roll1: { k: 'x.......x.......', s: 'X...X...X...X...', h: '................', p: '................' },
      roll2: { k: 'x.......x.......', s: 'X.X.X.X.XXXXXXXX', h: '................', p: '................' },
      g: { k: 'x.x...x.x.x...x.', s: '....X..g....X..g', h: 'CcCcCcCcCcCcCcCo', p: 't.t.t.t.t.t.t.t.' },
      g2: { k: 'x.x...x.x.x..xx.', s: '....X..g.g..X.gg', h: 'CcCcCcCcCcCcCcCo', p: 't.t.t.t.t.t.t.t.' },
      fill: { k: 'x.x...x.........', s: '....X...XgXgXXXX', h: 'CcCcCcCc........', p: '................' },
      half: { k: 'x.........x.....', s: '........c.......', h: 'c.c.c.c.c.c.c.co', p: '................' },
      build: { k: 'x...x...x...x...', s: '....X...X.X.XXXX', h: 'c.c.c.c.cccccccc', p: '................' },
    },
    bass: {
      riff: 'r^ . r . . s . o^ . 6 . f . t . s',
      riff2: 'r^ . r . . s . o^ . 6 7 . o^ . s f',
      drive: 'r^ . r r . r o^ . r . r r . r o^ r',
      long: 'r - - - - - - - f - - - s - - -',
      pedal: 'r . r . r . r . r . r . r . r .',
    },
    keys: {
      c1: '..x..x....x..x..',
      pad: 'x---------------',
    },
    brass: {
      riff: 'G4 . . Bb4 . C5 . Db5 D5 . . . F5 . D5 .',
      st: 'x..x..x...x.x...',
      d79: 'x-..x-..x.x.x.x.',
      long: 'x-------x-------',
    },
    sections: {
      intro: { chords: ['Gm7', 'Gm7'], drums: ['roll1', 'roll2'], bass: ['pedal', 'pedal'], riser: true, crash: false },
      A: { chords: ['Gm7', 'Gm7', 'Gm7', 'Gm7', 'Ebmaj7', 'Ebmaj7', 'D7#9', 'D7#9'], drums: ['g', 'g', 'g', 'g2', 'g', 'g', 'g2', 'fill'], bass: ['riff', 'riff', 'riff', 'riff2', 'drive', 'drive', 'drive', 'drive'], keys: 'c1', keysInst: 'clav', crash: true },
      A2: {
        chords: ['Gm7', 'Gm7', 'Gm7', 'Gm7', 'Ebmaj7', 'Ebmaj7', 'D7#9', 'D7#9'], drums: ['g', 'g2', 'g', 'g2', 'g', 'g2', 'g', 'fill'], bass: ['riff', 'riff', 'riff', 'riff2', 'drive', 'drive', 'drive', 'drive'], keys: 'c1', keysInst: 'clav', brass: ['riff', 'riff', 'riff', 'riff', 'st', 'st', 'd79', 'd79'], crash: true,
      },
      B: {
        chords: ['Cm9', 'F9', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7#9', 'Gm7', 'D7#9'], drums: ['g2', 'g', 'g2', 'g', 'g2', 'g', 'g2', 'fill'], bass: ['drive'], keys: 'c1', keysInst: 'clav', pad: true, brass: [null, 'st', null, 'st', null, 'd79', null, 'd79'], leadInst: 'lead', crash: true,
        lead: [
          'G5 - . Bb5 - . C6 - - - . Bb5 . G5 . F5',
          'G5 - - - . . A5 . C6 . A5 . G5 . F5 .',
          'D5 - . F5 - . A5 - - - . G5 . F5 . D5',
          'Eb5 - - - - - . . G5 . F5 . Eb5 . D5 .',
          'C5 - . Eb5 - . G5 - - - . F5 . Eb5 . C5',
          'F#5 - - - . . A5 . C6 - - - . . . .',
          'D6 - . C6 . Bb5 . A5 . G5 . F5 . D5 . .',
          'F#5 - - - - - - - . . . . . . . .',
        ],
      },
      breakdown: { chords: ['Ebmaj7', 'D7#9', 'Cm9', 'D7#9'], drums: ['half', 'half', 'half', 'build'], bass: ['long'], keys: 'pad', keysInst: 'rhodes', pad: true, brass: ['long', 'long', 'long', 'd79'], crash: true },
    },
    form: ['intro', 'A', 'A2', 'B', 'A2', 'breakdown', 'B'],
    loopFrom: 1,
  },
};

function checkDrums(d, name) {
  if (!d) throw new Error('missing drum pattern ' + name);
  for (const k of ['k', 's', 'h', 'p']) if (d[k].length !== 16) throw new Error(`drum ${name}.${k} needs 16 steps`);
  return d;
}

// ---------------------------------------------------------------- engine
export class Music {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.mix = ctx.createGain(); this.mix.gain.value = 0.42; this.mix.connect(out);
    // noise + pulse waves
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const pulse = (duty) => {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
      return ctx.createPeriodicWave(re, im);
    };
    this.p25 = pulse(0.25); this.p12 = pulse(0.125);
    // plate-style reverb
    this.rev = ctx.createConvolver();
    const rl = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, rl, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < rl; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3.2); }
    this.rev.buffer = ir;
    const revOut = ctx.createGain(); revOut.gain.value = 0.55;
    const revHp = ctx.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 280;
    const revLp = ctx.createBiquadFilter(); revLp.type = 'lowpass'; revLp.frequency.value = 4800;
    this.revIn = ctx.createGain(); this.revIn.connect(revHp); revHp.connect(this.rev); this.rev.connect(revLp); revLp.connect(revOut); revOut.connect(this.mix);
    // ping-pong delay (tempo-synced on song change)
    this.dlyIn = ctx.createGain();
    this.dL = ctx.createDelay(2); this.dR = ctx.createDelay(2);
    const fbL = ctx.createGain(), fbR = ctx.createGain(); fbL.gain.value = fbR.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const pL = ctx.createStereoPanner(), pR = ctx.createStereoPanner(); pL.pan.value = -0.7; pR.pan.value = 0.7;
    const dOut = ctx.createGain(); dOut.gain.value = 0.5;
    this.dlyIn.connect(lp); lp.connect(this.dL); this.dL.connect(fbL); fbL.connect(this.dR); this.dR.connect(fbR); fbR.connect(this.dL);
    this.dL.connect(pL); this.dR.connect(pR); pL.connect(dOut); pR.connect(dOut); dOut.connect(this.mix);
    this.song = null; this.name = null; this.queued = null; this.bar = 0; this.step = 0; this.nextTime = 0; this.lastLead = null;
  }

  // ---- song layout: flatten the form into bars
  load(name) {
    const S = SONGS[name];
    const bars = []; let loopBar = 0;
    S.form.forEach((secName, fi) => {
      if (fi === S.loopFrom) loopBar = bars.length;
      const sec = S.sections[secName];
      const pick = (v, i) => (Array.isArray(v) ? v[i % v.length] : v);
      sec.chords.forEach((cn, i) => {
        const [c1, c2] = cn.split('|');
        const dk = pick(sec.drums, i), bk = pick(sec.bass, i), kk = pick(sec.keys, i), brk = pick(sec.brass, i);
        bars.push({
          sec: secName, i, first: i === 0, c1: parseChord(c1), c2: c2 ? parseChord(c2) : null,
          drums: dk ? checkDrums(S.drums[dk], dk) : null, bass: bk ? toks(S.bass[bk]) : null,
          keys: kk ? toks(S.keys[kk]) : null, keysInst: sec.keysInst, pad: !!sec.pad,
          brass: brk ? toks(S.brass[brk]) : null,
          lead: sec.lead ? toks(sec.lead[i % sec.lead.length]) : null, leadInst: sec.leadInst || 'lead',
          crash: sec.crash && i === 0, riser: sec.riser && i === 0,
        });
      });
    });
    const spb = 60 / S.bpm / 4;
    const t = this.ctx.currentTime;
    this.dL.delayTime.setValueAtTime(spb * 3, t); this.dR.delayTime.setValueAtTime(spb * 3, t);
    return { S, bars, loopBar, spb };
  }

  play(name) {
    if (this.name === name && !this.queued) return;
    if (!this.song) { this.start(name); return; }
    this.queued = name; // switch on the next bar line
  }
  start(name, at) {
    this.name = name; this.song = this.load(name); this.bar = 0; this.step = 0;
    this.nextTime = at ?? this.ctx.currentTime + 0.08; this.lastLead = null;
  }
  stop() { this.song = null; this.name = null; this.queued = null; }

  // live scheduling: call every ~25ms
  tick(ahead = 0.2) {
    if (!this.song) return;
    while (this.nextTime < this.ctx.currentTime + ahead) this.advance();
  }
  advance() {
    if (this.step === 0 && this.queued) { const q = this.queued; this.queued = null; this.start(q, this.nextTime); }
    const { bars, spb } = this.song;
    this.playStep(this.bar, this.step, this.nextTime);
    this.nextTime += spb; this.step++;
    if (this.step === 16) { this.step = 0; this.bar++; if (this.bar >= bars.length) this.bar = this.song.loopBar; }
  }
  // offline: schedule the whole song once (intro to end of form). Returns its length in seconds.
  renderOnce(name, at = 0.05) {
    this.start(name, at);
    const total = this.song.bars.length * 16;
    for (let i = 0; i < total; i++) this.advance();
    return this.nextTime;
  }

  // ---- one 16th step
  playStep(bi, s, t0) {
    const { S, bars, spb } = this.song, B = bars[bi];
    const t = t0 + (s % 2 === 1 ? S.swing * spb : 0);
    const hum = () => 0.92 + Math.random() * 0.16;
    const ch = (B.c2 && s >= 8) ? B.c2 : B.c1;
    const dl = S.drumLevel;

    if (s === 0 && B.crash) this.crash(t, 0.9);
    if (s === 0 && B.riser) this.riser(t, spb * 32);

    // drums
    if (B.drums) {
      const D = B.drums;
      const k = D.k[s]; if (k === 'x') this.kick(t, dl * hum()); else if (k === 'o') this.kick(t, 0.6 * dl);
      const sn = D.s[s];
      if (sn === 'X') this.snare(t, dl * hum()); else if (sn === 'g') this.snare(t, 0.2 * dl * hum(), true);
      else if (sn === 'c') { this.snare(t, 0.85 * dl); this.clap(t, 0.7 * dl); } else if (sn === 'C') this.clap(t, dl);
      const h = D.h[s];
      if (h === 'c') this.hat(t, 0.5 * dl * hum()); else if (h === 'C') this.hat(t, 0.85 * dl * hum());
      else if (h === 'o') this.hat(t, 0.7 * dl, true); else if (h === '-') this.hat(t, 0.25 * dl);
      const p = D.p[s]; if (p === 't') this.tamb(t, 0.5 * dl * hum()); else if (p === 'T') this.tamb(t, 0.85 * dl);
    }
    // bass
    if (B.bass) {
      const tk = B.bass[s];
      if (tk === 'x') this.deadNote(t, ch.bass);
      else if (tk !== '.' && tk !== '-') {
        const pop = tk.endsWith('^'), core = pop ? tk.slice(0, -1) : tk;
        const semi = ch.deg[core] ?? Number(core);
        let len = 1; while (s + len < 16 && B.bass[s + len] === '-') len++;
        this.bassNote(t, ch.bass + semi, spb * (len - 0.15), pop);
      }
    }
    // pad
    if (B.pad && (s === 0 || (B.c2 && s === 8))) this.pad(t, ch.notes, spb * (B.c2 ? 8 : 16));
    // keys
    if (B.keys) {
      const c = B.keys[s];
      if (c === 'x' || c === 'X') {
        let len = 1; while (s + len < 16 && B.keys[s + len] === '-') len++;
        if (B.keysInst === 'rhodes') this.rhodes(t, ch.notes, spb * len, c === 'X' ? 1.2 : 1);
        else this.clav(t, ch.notes, spb * len, c === 'X' ? 1.3 : hum());
      }
    }
    // brass
    if (B.brass) {
      const tk = B.brass[s];
      if (tk !== '.' && tk !== '-') {
        let len = 1; while (s + len < 16 && B.brass[s + len] === '-') len++;
        const ns = tk === 'x' ? ch.notes.slice(-3).map(n => n + (n < 60 ? 12 : 0)) : [noteToMidi(tk), noteToMidi(tk) - 12];
        this.brass(t, ns, spb * len * 0.9);
      }
    }
    // lead (ties may cross the bar line)
    if (B.lead) {
      const tk = B.lead[s];
      if (tk !== '.' && tk !== '-') {
        let len = 1, b = bi, j = s + 1;
        for (;;) {
          if (j >= 16) { b++; j = 0; if (b >= bars.length || !bars[b].lead) break; }
          if (bars[b].lead[j] !== '-') break;
          len++; j++;
        }
        const n = noteToMidi(tk);
        const glide = this.lastLead && this.lastLead.end >= t - spb * 0.6 ? this.lastLead.n : null;
        this.lead(t, n, spb * len * 0.92, glide, B.leadInst);
        this.lastLead = { n, end: t + spb * len };
      }
    }
  }

  // ---------------------------------------------------------------- instruments
  out(node, pan = 0, rev = 0, dly = 0) {
    const c = this.ctx, p = c.createStereoPanner(); p.pan.value = pan;
    node.connect(p); p.connect(this.mix);
    if (rev) { const g = c.createGain(); g.gain.value = rev; p.connect(g); g.connect(this.revIn); }
    if (dly) { const g = c.createGain(); g.gain.value = dly; p.connect(g); g.connect(this.dlyIn); }
  }
  // gain envelope: attack a, decay toward sus, release r after dur
  envGain(t, dur, v, a = 0.005, sus = 1, d = 0.1, r = 0.06) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (sus !== 1) g.gain.setTargetAtTime(v * sus, t + a, d);
    g.gain.setTargetAtTime(0.0001, t + Math.max(dur, a), r / 3);
    return g;
  }
  osc(type, f, t, end, detune = 0) {
    const o = this.ctx.createOscillator();
    if (type === 'p25') o.setPeriodicWave(this.p25); else if (type === 'p12') o.setPeriodicWave(this.p12); else o.type = type;
    o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.start(t); o.stop(end);
    return o;
  }
  noiseSrc(t, end) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    s.start(t, Math.random() * 1.5); s.stop(end); return s;
  }
  filt(type, f, q = 0.7) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

  kick(t, v) {
    const c = this.ctx, o = this.osc('sine', 160, t, t + 0.4);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.95 * v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    o.connect(g); this.out(g);
    const n = this.noiseSrc(t, t + 0.03), hp = this.filt('highpass', 2500);
    const ng = c.createGain(); ng.gain.setValueAtTime(0.18 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    n.connect(hp); hp.connect(ng); this.out(ng);
  }
  snare(t, v, ghost = false) {
    const c = this.ctx, dur = ghost ? 0.07 : 0.2;
    const n = this.noiseSrc(t, t + dur + 0.05), hp = this.filt('highpass', 1100), pk = this.filt('peaking', 3500, 1);
    pk.gain.value = 4;
    const g = c.createGain(); g.gain.setValueAtTime(0.42 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(hp); hp.connect(pk); pk.connect(g); this.out(g, 0.05, ghost ? 0.05 : 0.22);
    if (!ghost) {
      const o = this.osc('triangle', 230, t, t + 0.12); o.frequency.exponentialRampToValueAtTime(170, t + 0.06);
      const og = c.createGain(); og.gain.setValueAtTime(0.32 * v, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(og); this.out(og);
    }
  }
  clap(t, v) {
    const c = this.ctx, n = this.noiseSrc(t, t + 0.25), bp = this.filt('bandpass', 1400, 1.4);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => { g.gain.setValueAtTime(0.3 * v, t + o); g.gain.exponentialRampToValueAtTime(0.03, t + o + 0.009); });
    g.gain.setValueAtTime(0.25 * v, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    n.connect(bp); bp.connect(g); this.out(g, -0.05, 0.3);
  }
  hat(t, v, open = false) {
    const c = this.ctx, dur = open ? 0.22 : 0.038;
    const n = this.noiseSrc(t, t + dur + 0.05), hp = this.filt('highpass', 7200), bp = this.filt('peaking', 10000, 0.8);
    bp.gain.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.11 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(hp); hp.connect(bp); bp.connect(g); this.out(g, 0.28, open ? 0.08 : 0);
  }
  tamb(t, v) {
    const c = this.ctx, n = this.noiseSrc(t, t + 0.1), hp = this.filt('highpass', 8500);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(hp); hp.connect(g); this.out(g, -0.4, 0.05);
  }
  crash(t, v) {
    const c = this.ctx, n = this.noiseSrc(t, t + 2), hp = this.filt('highpass', 4500);
    const g = c.createGain(); g.gain.setValueAtTime(0.085 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    n.connect(hp); hp.connect(g); this.out(g, 0.2, 0.3);
  }
  riser(t, dur) {
    const c = this.ctx, n = this.noiseSrc(t, t + dur + 0.1), bp = this.filt('bandpass', 400, 3);
    bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(bp); bp.connect(g); this.out(g, 0, 0.25);
  }

  // synth slap bass: bright filtered saw + sine sub
  bassNote(t, midi, dur, pop) {
    const c = this.ctx, f = m2f(midi), end = t + dur + 0.1;
    const lp = this.filt('lowpass', pop ? 3600 : 2000, 6);
    lp.frequency.setValueAtTime(pop ? 3600 : 2000, t); lp.frequency.setTargetAtTime(420, t + 0.005, pop ? 0.09 : 0.06);
    const g = this.envGain(t, dur, pop ? 0.36 : 0.3, 0.003, 0.65, 0.12, 0.04);
    const a = this.osc('sawtooth', f, t, end), b = this.osc('p25', f, t, end, 7);
    a.connect(lp); b.connect(lp); lp.connect(g); this.out(g);
    const sg = this.envGain(t, dur, 0.34, 0.004, 0.85, 0.2, 0.04);
    this.osc('sine', f, t, end).connect(sg); this.out(sg);
  }
  deadNote(t, midi) {
    const c = this.ctx, lp = this.filt('lowpass', 700, 2), g = this.envGain(t, 0.025, 0.22, 0.002, 1, 0.1, 0.02);
    this.osc('sawtooth', m2f(midi + 12), t, t + 0.08).connect(lp); lp.connect(g); this.out(g);
    const n = this.noiseSrc(t, t + 0.05), bp = this.filt('bandpass', 900, 2), ng = this.envGain(t, 0.015, 0.12, 0.001, 1, 0.1, 0.01);
    n.connect(bp); bp.connect(ng); this.out(ng);
  }
  // clavinet-style funk stabs
  clav(t, notes, dur, v) {
    const len = Math.max(dur * 0.8, 0.07), end = t + len + 0.1;
    notes.slice(-3).forEach((n, i) => {
      const lp = this.filt('lowpass', 5200, 5); lp.frequency.setTargetAtTime(1100, t + 0.003, 0.05);
      const hp = this.filt('highpass', 300);
      const g = this.envGain(t, len, 0.07 * v, 0.002, 0.5, 0.05, 0.03);
      this.osc('p25', m2f(n + 12), t, end, i * 4 - 4).connect(lp); lp.connect(hp); hp.connect(g);
      this.out(g, -0.35, 0.06, 0.08);
    });
  }
  // electric piano (two-operator FM)
  rhodes(t, notes, dur, v) {
    const c = this.ctx, len = Math.max(dur, 0.25), end = t + len + 0.5;
    notes.forEach((n, i) => {
      const f = m2f(n), car = this.osc('sine', f, t, end), mod = this.osc('sine', f, t, end), mg = c.createGain();
      mg.gain.setValueAtTime(f * 2.2, t); mg.gain.setTargetAtTime(f * 0.35, t, 0.12);
      mod.connect(mg); mg.connect(car.frequency);
      const g = this.envGain(t, len, 0.075 * v, 0.004, 0.45, 0.5, 0.35);
      car.connect(g); this.out(g, i % 2 ? 0.25 : -0.25, 0.22);
    });
  }
  pad(t, notes, dur) {
    const end = t + dur + 0.6;
    notes.forEach((n, i) => {
      const lp = this.filt('lowpass', 1500, 0.7), g = this.envGain(t, dur, 0.022, 0.35, 1, 0.1, 0.4);
      this.osc('sawtooth', m2f(n), t, end, -9).connect(lp); this.osc('sawtooth', m2f(n), t, end, 9).connect(lp);
      lp.connect(g); this.out(g, i % 2 ? 0.45 : -0.45, 0.35);
    });
  }
  // brass section: detuned saws with a filter "blat"
  brass(t, notes, dur) {
    const len = Math.max(dur, 0.09), end = t + len + 0.15;
    notes.forEach((n, i) => {
      const lp = this.filt('lowpass', 700, 1.5);
      lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(4200, t + 0.035); lp.frequency.setTargetAtTime(1800, t + 0.06, 0.12);
      const g = this.envGain(t, len, 0.055, 0.012, 0.75, 0.1, 0.06);
      this.osc('sawtooth', m2f(n), t, end, -8).connect(lp); this.osc('sawtooth', m2f(n), t, end, 8).connect(lp);
      lp.connect(g); this.out(g, (i - 1) * 0.18, 0.18);
    });
  }
  // lead synth with glide and delayed vibrato. 'soft' = rounder voice for the menu
  lead(t, midi, dur, glideFrom, kind) {
    const c = this.ctx, f = m2f(midi), end = t + dur + 0.2, soft = kind === 'soft';
    const a = this.osc(soft ? 'triangle' : 'sawtooth', f, t, end), b = this.osc(soft ? 'sine' : 'p25', f, t, end, soft ? 0 : 6);
    if (glideFrom != null) { [a, b].forEach(o => { o.frequency.setValueAtTime(m2f(glideFrom), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.045); }); }
    const lfo = this.osc('sine', 5.6, t, end), lg = c.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.16); lg.gain.linearRampToValueAtTime(soft ? 9 : 14, t + 0.4);
    lfo.connect(lg); lg.connect(a.detune); lg.connect(b.detune);
    const lp = this.filt('lowpass', soft ? 3200 : 2800, soft ? 0.7 : 2.5);
    if (!soft) { lp.frequency.setValueAtTime(5200, t); lp.frequency.setTargetAtTime(2400, t + 0.01, 0.15); }
    const g = this.envGain(t, dur, soft ? 0.16 : 0.085, 0.012, 0.85, 0.2, 0.09);
    a.connect(lp); b.connect(lp); lp.connect(g); this.out(g, 0.08, 0.2, 0.22);
  }
}
