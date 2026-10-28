// Procedural sound engine for the Core Defense game. No audio files: everything is synthesised with Web Audio.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]];
const BASS = [33, 29, 31, 28];
const ARP = [0, 1, 2, 1, 2, 1, 0, 2];

// Layered gunshot recipes. crack = sharp transient, body = muzzle blast, boom = low thump,
// tail = room decay, echoes = reflections off the walls, clicks = bolt / slide mechanics.
const GUNS = {
  pistol: {
    len: 1.0, shaper: 2.4,
    crack: { f: 2600, gain: 1.0, decay: 0.016 },
    body: { f0: 5200, f1: 650, gain: 0.95, decay: 0.15 },
    boom: { f0: 150, f1: 58, gain: 0.95, decay: 0.12 },
    tail: { f0: 2600, f1: 260, gain: 0.2, decay: 0.7 },
    echoes: [[0.045, 0.16], [0.11, 0.09]],
    clicks: [[0.17, 0.07]]
  },
  smg: {
    len: 0.7, shaper: 2.2,
    crack: { f: 3200, gain: 1.0, decay: 0.012 },
    body: { f0: 6200, f1: 950, gain: 0.8, decay: 0.09 },
    boom: { f0: 170, f1: 72, gain: 0.7, decay: 0.08 },
    tail: { f0: 3200, f1: 320, gain: 0.15, decay: 0.45 },
    echoes: [[0.04, 0.12], [0.09, 0.06]],
    clicks: []
  },
  rifle: {
    len: 1.5, shaper: 2.6,
    crack: { f: 2000, gain: 1.15, decay: 0.022 },
    body: { f0: 4800, f1: 340, gain: 1.0, decay: 0.24 },
    boom: { f0: 100, f1: 45, gain: 1.0, decay: 0.22 },
    tail: { f0: 2300, f1: 170, gain: 0.24, decay: 1.1 },
    echoes: [[0.06, 0.2], [0.14, 0.12], [0.26, 0.07]],
    clicks: []
  },
  sniper: {
    len: 2.5, shaper: 3.0,
    crack: { f: 1500, gain: 1.3, decay: 0.032 },
    body: { f0: 3800, f1: 190, gain: 1.2, decay: 0.55 },
    boom: { f0: 72, f1: 30, gain: 1.35, decay: 0.5 },
    tail: { f0: 1900, f1: 110, gain: 0.32, decay: 1.9 },
    echoes: [[0.08, 0.28], [0.18, 0.2], [0.33, 0.13], [0.5, 0.08]],
    clicks: [[0.62, 0.09], [0.78, 0.07]]
  }
};
const GUN_VARIANTS = 3;

export function createAudio() {
  let ctx = null;
  let master = null;
  let sfx = null;
  let musicBus = null;
  let reverb = null;
  let reverbSend = null;
  let noiseBuf = null;
  let enabled = false;
  let musicOn = true;
  let timer = 0;
  let nextTime = 0;
  let step = 0;
  let intensity = 0;
  let musicRunning = false;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    master.connect(comp).connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);

    const len = Math.floor(ctx.sampleRate * 1.5);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = ir;
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.35;
    reverb.connect(reverbSend).connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  const live = () => enabled && ctx && ctx.state !== 'closed';

  // Output node with optional stereo pan and reverb send
  function route(pan = 0, wet = 0.12) {
    const g = ctx.createGain();
    let tail = g;
    if (ctx.createStereoPanner && pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      tail = p;
    }
    tail.connect(sfx);
    if (wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      tail.connect(w).connect(reverb);
    }
    return g;
  }

  function tone(freq, dur = 0.1, type = 'sine', vol = 0.05, slide = 0, pan = 0, wet = 0.1, delay = 0) {
    if (!live()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = route(pan, wet);
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur = 0.1, opts = {}) {
    if (!live()) return;
    const { type = 'lowpass', f0 = 2000, f1 = f0, q = 0.7, vol = 0.1, pan = 0, wet = 0.12, delay = 0 } = opts;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = route(pan, wet);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g);
    src.start(t, Math.random() * 1.4, dur + 0.05);
  }

  const dist = (d) => Math.max(0.08, 1 / (1 + d * 0.09));

  // ----- sampled-style gunshots, rendered once with an OfflineAudioContext -----
  const gunBufs = {};
  let gunPrep = null;

  function renderGun(key) {
    const p = GUNS[key];
    const sr = ctx.sampleRate;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * p.len), sr);
    const nb = oc.createBuffer(2, sr * 2, sr);
    for (let c = 0; c < 2; c++) { const d = nb.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const shaper = oc.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * p.shaper); }
    shaper.curve = curve;
    const out = oc.createGain();
    out.gain.value = 0.85;
    const sum = oc.createGain();
    sum.connect(shaper).connect(out).connect(oc.destination);

    const noiseLayer = (type, f0, f1, gain, decay, delay = 0, q = 0.7) => {
      const src = oc.createBufferSource();
      src.buffer = nb;
      const f = oc.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, delay);
      if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), delay + decay);
      const g = oc.createGain();
      g.gain.setValueAtTime(0.0001, delay);
      g.gain.linearRampToValueAtTime(gain, delay + 0.0006);
      g.gain.exponentialRampToValueAtTime(0.0001, delay + decay);
      src.connect(f).connect(g).connect(sum);
      src.start(delay, Math.random() * 1.5, decay + 0.05);
    };
    const toneLayer = (f0, f1, gain, decay) => {
      const o = oc.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, 0);
      o.frequency.exponentialRampToValueAtTime(f1, decay);
      const g = oc.createGain();
      g.gain.setValueAtTime(gain, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, decay);
      o.connect(g).connect(sum);
      o.start(0);
      o.stop(decay + 0.02);
    };

    noiseLayer('highpass', p.crack.f * (0.9 + Math.random() * 0.2), p.crack.f, p.crack.gain, p.crack.decay);
    noiseLayer('bandpass', 2400, 1200, p.crack.gain * 0.5, p.crack.decay * 2.2, 0, 0.8);
    noiseLayer('lowpass', p.body.f0, p.body.f1, p.body.gain, p.body.decay);
    toneLayer(p.boom.f0, p.boom.f1, p.boom.gain, p.boom.decay);
    noiseLayer('lowpass', p.tail.f0, p.tail.f1, p.tail.gain, p.tail.decay, 0.01);
    p.echoes.forEach(([delay, gain]) => {
      noiseLayer('lowpass', p.body.f0 * 0.55, p.body.f1 * 0.7, gain * p.body.gain, p.body.decay * 1.1, delay);
      noiseLayer('lowpass', p.tail.f0, p.tail.f1, gain * 0.35, p.tail.decay * 0.6, delay);
    });
    p.clicks.forEach(([delay, gain]) => {
      noiseLayer('bandpass', 2600 + Math.random() * 600, 1800, gain, 0.02, delay, 1.4);
      noiseLayer('highpass', 4500, 4500, gain * 0.5, 0.008, delay + 0.012);
    });
    return oc.startRendering();
  }

  function prepareGuns() {
    if (gunPrep || typeof OfflineAudioContext === 'undefined') return gunPrep;
    gunPrep = Promise.all(Object.keys(GUNS).map(async (key) => {
      const list = [];
      for (let v = 0; v < GUN_VARIANTS; v++) list.push(await renderGun(key));
      gunBufs[key] = list;
    })).catch(() => { gunPrep = null; });
    return gunPrep;
  }

  function playGun(key, pan) {
    const list = gunBufs[key];
    if (!list || !list.length) return false;
    const src = ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = 0.96 + Math.random() * 0.08;
    const g = route(pan, key === 'sniper' ? 0.3 : 0.18);
    g.gain.value = key === 'sniper' ? 1.0 : key === 'smg' ? 0.8 : 0.9;
    src.connect(g);
    src.start();
    return true;
  }

  const api = {
    get enabled() { return enabled; },
    get musicOn() { return musicOn; },
    setEnabled(on) {
      enabled = on;
      if (on) {
        if (!ensure()) { enabled = false; return false; }
        if (ctx.state === 'suspended') ctx.resume();
        prepareGuns();
        if (musicOn) api.startMusic();
      } else {
        api.stopMusic();
      }
      return enabled;
    },
    setMusic(on) {
      musicOn = on;
      if (!enabled) return;
      if (on) api.startMusic(); else api.stopMusic();
    },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && enabled && ctx.state === 'suspended') ctx.resume(); },
    tone,
    noise,
    gunInfo() {
      return Object.fromEntries(Object.entries(gunBufs).map(([k, list]) => {
        const d = list[0].getChannelData(0);
        let peak = 0, early = 0, late = 0;
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (i < d.length * 0.2) early += a * a; else late += a * a; }
        return [k, { variants: list.length, seconds: +list[0].duration.toFixed(2), peak: +peak.toFixed(2), earlyToLate: +(early / (late || 1)).toFixed(1) }];
      }));
    },

    shot(key, pan = 0) {
      if (!live()) return;
      if (playGun(key, pan)) return;
      if (key === 'sniper') {
        noise(0.55, { type: 'lowpass', f0: 2600, f1: 220, vol: 0.34, pan, wet: 0.5 });
        noise(0.05, { type: 'highpass', f0: 3000, vol: 0.2, pan, wet: 0.2 });
        tone(95, 0.45, 'sine', 0.4, -65, pan, 0.4);
      } else if (key === 'rifle') {
        noise(0.16, { type: 'lowpass', f0: 3000, f1: 700, vol: 0.26, pan, wet: 0.3 });
        noise(0.03, { type: 'highpass', f0: 2500, vol: 0.12, pan, wet: 0.1 });
        tone(120, 0.14, 'sine', 0.3, -70, pan, 0.25);
      } else if (key === 'smg') {
        noise(0.09, { type: 'bandpass', f0: 2600, f1: 900, q: 0.9, vol: 0.22, pan, wet: 0.2 });
        tone(150, 0.08, 'sine', 0.18, -80, pan, 0.15);
      } else {
        noise(0.12, { type: 'bandpass', f0: 2000, f1: 700, q: 0.8, vol: 0.24, pan, wet: 0.25 });
        tone(170, 0.1, 'sine', 0.2, -100, pan, 0.2);
      }
    },
    sentryShot(pan, d) {
      noise(0.07, { type: 'highpass', f0: 2200, vol: 0.12 * dist(d), pan, wet: 0.2 });
      tone(700, 0.08, 'square', 0.04 * dist(d), -380, pan, 0.2);
    },
    enemyShot(pan, d, kind) {
      const v = dist(d);
      if (kind === 'boss') {
        tone(180, 0.2, 'sawtooth', 0.09 * v, -110, pan, 0.3);
        noise(0.14, { type: 'lowpass', f0: 1200, f1: 300, vol: 0.12 * v, pan, wet: 0.3 });
      } else {
        tone(kind === 'ddos' ? 260 : 380, 0.1, 'square', 0.05 * v, -170, pan, 0.2);
        noise(0.05, { type: 'highpass', f0: 3000, vol: 0.05 * v, pan, wet: 0.15 });
      }
    },
    empty() { tone(1400, 0.025, 'square', 0.03); noise(0.02, { type: 'highpass', f0: 4000, vol: 0.05 }); },
    footstep(sprint) {
      noise(0.07, { type: 'lowpass', f0: 600 + Math.random() * 250, f1: 180, vol: sprint ? 0.22 : 0.13, wet: 0.2 });
      tone(85 + Math.random() * 20, 0.07, 'sine', sprint ? 0.1 : 0.06, -30, 0, 0.1);
    },
    land() { noise(0.14, { type: 'lowpass', f0: 500, f1: 120, vol: 0.3, wet: 0.2 }); tone(60, 0.12, 'sine', 0.18, -20); },
    jump() { noise(0.08, { type: 'lowpass', f0: 700, f1: 250, vol: 0.1 }); },
    reload(stage, pitch = 1) {
      if (stage === 'out') {
        noise(0.04, { type: 'highpass', f0: 1800, vol: 0.16 });
        tone(210 * pitch, 0.06, 'square', 0.04, -80);
      } else if (stage === 'in') {
        tone(330 * pitch, 0.04, 'square', 0.05, -120);
        noise(0.05, { type: 'bandpass', f0: 1500, q: 1.2, vol: 0.2 });
        tone(120 * pitch, 0.08, 'sine', 0.12, -30, 0, 0.05, 0.03);
      } else {
        noise(0.05, { type: 'bandpass', f0: 1000, f1: 2400, q: 1.4, vol: 0.2 });
        tone(520 * pitch, 0.06, 'triangle', 0.05, -260);
        tone(900 * pitch, 0.03, 'square', 0.03, -300, 0, 0.05, 0.06);
      }
    },
    draw() {
      noise(0.1, { type: 'bandpass', f0: 900, f1: 1800, q: 1, vol: 0.14 });
      tone(300, 0.05, 'square', 0.03, 140, 0, 0.05, 0.07);
    },
    casing() { tone(3200 + Math.random() * 900, 0.05, 'triangle', 0.025, -1200, (Math.random() - 0.5) * 0.4, 0.15); },
    hit(head, kill) {
      tone(head ? 2400 : 1700, 0.05, 'square', 0.04, -600);
      if (head) tone(3000, 0.18, 'sine', 0.045, -200, 0, 0.2, 0.03);
      if (kill) {
        tone(520, 0.14, 'triangle', 0.06, 380, 0, 0.2, 0.04);
        tone(95, 0.2, 'sine', 0.2, -50);
      }
    },
    impact(pan = 0) {
      noise(0.05, { type: 'bandpass', f0: 2400, q: 1.5, vol: 0.06, pan, wet: 0.2 });
    },
    botVoice(kind, pan, d, event) {
      const v = dist(d);
      if (event === 'spawn') {
        const base = kind === 'boss' ? 70 : kind === 'ddos' ? 140 : kind === 'legit' ? 700 : 520;
        tone(base, 0.28, kind === 'legit' ? 'sine' : 'sawtooth', 0.07 * v, base * (kind === 'legit' ? 0.5 : 1.6), pan, 0.3);
        tone(base * 1.5, 0.2, 'square', 0.03 * v, 60, pan, 0.3, 0.05);
        return;
      }
      if (kind === 'legit') {
        tone(900, 0.07, 'sine', 0.05 * v, 300, pan, 0.15);
        tone(1200, 0.08, 'sine', 0.04 * v, 200, pan, 0.15, 0.08);
        return;
      }
      const set = kind === 'boss' ? [90, 110, 75] : kind === 'ddos' ? [220, 310, 260] : [640, 880, 760];
      const type = kind === 'boss' ? 'sawtooth' : 'square';
      for (let i = 0; i < 3; i++) tone(set[Math.floor(Math.random() * 3)], 0.045, type, 0.035 * v, 0, pan, 0.2, i * 0.055);
    },
    botDie(kind, pan, d) {
      const v = dist(d);
      noise(kind === 'boss' ? 0.9 : 0.3, { type: 'lowpass', f0: 2400, f1: 120, vol: 0.2 * v, pan, wet: 0.35 });
      tone(kind === 'boss' ? 160 : 420, kind === 'boss' ? 0.8 : 0.28, 'sawtooth', 0.09 * v, -(kind === 'boss' ? 110 : 340), pan, 0.3);
      if (kind === 'boss') explosionAt(pan, 0.9);
    },
    explosion: (pan = 0, power = 1) => explosionAt(pan, power),
    hurt(armor) {
      tone(110, 0.2, 'sawtooth', 0.12, -60);
      noise(0.14, { type: 'lowpass', f0: 1200, f1: 200, vol: 0.2 });
      if (armor) tone(1200, 0.08, 'square', 0.04, -500, 0, 0.1, 0.01);
    },
    heartbeat() { tone(52, 0.13, 'sine', 0.3, -12); tone(48, 0.15, 'sine', 0.22, -10, 0, 0.1, 0.19); },
    alarm() { tone(620, 0.22, 'square', 0.06, -60); tone(460, 0.26, 'square', 0.06, -40, 0, 0.1, 0.24); },
    pickup() { [523, 659, 880].forEach((f, i) => tone(f, 0.12, 'triangle', 0.06, 0, 0, 0.25, i * 0.07)); },
    ui() { tone(660, 0.07, 'triangle', 0.04, 160); },
    deny() { tone(150, 0.12, 'square', 0.04, -40); },
    zap(pan = 0, d = 0) {
      const v = dist(d);
      noise(0.22, { type: 'bandpass', f0: 3000, f1: 900, q: 2, vol: 0.18 * v, pan, wet: 0.25 });
      tone(90 + Math.random() * 40, 0.25, 'sawtooth', 0.09 * v, 30, pan, 0.2);
    },
    trapWarn(pan = 0, d = 0) { tone(1100, 0.06, 'square', 0.03 * dist(d), 0, pan); },
    emp() {
      tone(1400, 0.9, 'sine', 0.2, -1330, 0, 0.5);
      noise(0.9, { type: 'bandpass', f0: 4000, f1: 200, q: 1.2, vol: 0.25, wet: 0.5 });
      explosionAt(0, 0.7);
    },
    firewall(on) {
      if (on) {
        tone(240, 0.5, 'square', 0.09, 700, 0, 0.3);
        noise(0.4, { type: 'bandpass', f0: 600, f1: 3000, q: 1.5, vol: 0.18, wet: 0.3 });
        tone(70, 0.4, 'sine', 0.3, -30, 0, 0.3, 0.3);
      } else {
        tone(900, 0.4, 'square', 0.06, -700, 0, 0.3);
      }
    },
    roundStart() { tone(220, 0.5, 'sawtooth', 0.06, 440, 0, 0.3); tone(110, 0.5, 'sine', 0.2, 80, 0, 0.3); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, 0, 0, 0.35, i * 0.12)); },
    lose() { tone(220, 0.8, 'sawtooth', 0.09, -160, 0, 0.4); tone(110, 1.1, 'sine', 0.22, -60, 0, 0.4, 0.1); },

    setIntensity(v) { intensity = v; },
    startMusic() {
      if (!live() || musicRunning || !musicOn) return;
      musicRunning = true;
      nextTime = ctx.currentTime + 0.1;
      step = 0;
      timer = setInterval(schedule, 60);
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
      musicBus.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
    },
    stopMusic() {
      if (!musicRunning) return;
      musicRunning = false;
      clearInterval(timer);
      timer = 0;
      if (ctx) {
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setValueAtTime(musicBus.gain.value, ctx.currentTime);
        musicBus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      }
    },
    dispose() { api.stopMusic(); }
  };

  function explosionAt(pan, power) {
    noise(0.9 * power + 0.2, { type: 'lowpass', f0: 1600, f1: 70, vol: 0.45 * power, pan, wet: 0.5 });
    tone(70, 0.7 * power + 0.1, 'sine', 0.5 * power, -48, pan, 0.4);
    noise(0.08, { type: 'highpass', f0: 2500, vol: 0.2 * power, pan, wet: 0.2 });
  }

  // ----- music (lookahead step sequencer) -----
  function mNote(freq, t, dur, type, vol, cutoff, bus = musicBus) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function mNoise(t, dur, type, freq, vol) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(musicBus);
    s.start(t, Math.random() * 1.5, dur + 0.02);
  }

  function schedule() {
    if (!ctx || !musicRunning) return;
    if (ctx.state !== 'running') { nextTime = ctx.currentTime + 0.1; return; }
    while (nextTime < ctx.currentTime + 0.25) {
      playStep(step, nextTime);
      step = (step + 1) % 64;
      nextTime += 60 / (84 + intensity * 44) / 4;
    }
  }

  function playStep(s, t) {
    const bar = Math.floor(s / 16);
    const i16 = s % 16;
    const chord = CHORDS[bar];
    const stepDur = 60 / (84 + intensity * 44) / 4;
    if (i16 === 0) {
      chord.forEach((n, k) => {
        mNote(midi(n), t, stepDur * 15, 'sawtooth', 0.028, 600 + intensity * 500);
        mNote(midi(n) * 1.004, t, stepDur * 15, 'sawtooth', 0.02, 500 + intensity * 400);
        void k;
      });
    }
    if (i16 % 4 === 0 || (intensity > 0.4 && (i16 === 6 || i16 === 10 || i16 === 14))) {
      mNote(midi(BASS[bar]), t, stepDur * 2.2, 'sawtooth', 0.1, 240 + intensity * 160);
      mNote(midi(BASS[bar]), t, stepDur * 2.5, 'sine', 0.12, 400);
    }
    if (intensity > 0.3 && i16 % 4 === 0) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(musicBus);
      o.start(t);
      o.stop(t + 0.22);
    }
    if (intensity > 0.55 && (i16 === 4 || i16 === 12)) mNoise(t, 0.12, 'bandpass', 1800, 0.12);
    if (intensity > 0.45 && (i16 % 2 === 1 || intensity > 0.85)) mNoise(t, 0.04, 'highpass', 7500, 0.045);
    if (intensity > 0.22 && Math.random() < 0.35 + intensity * 0.55) {
      const idx = ARP[i16 % ARP.length] % 3;
      const n = chord[idx] + (i16 % 8 > 3 ? 24 : 12);
      mNote(midi(n), t, stepDur * 1.4, 'triangle', 0.035 + intensity * 0.02, 2600);
    }
  }

  return api;
}
