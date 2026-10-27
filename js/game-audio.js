// Procedural sound engine for the Core Defense game. No audio files: everything is synthesised with Web Audio.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]];
const BASS = [33, 29, 31, 28];
const ARP = [0, 1, 2, 1, 2, 1, 0, 2];

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

  const api = {
    get enabled() { return enabled; },
    get musicOn() { return musicOn; },
    setEnabled(on) {
      enabled = on;
      if (on) {
        if (!ensure()) { enabled = false; return false; }
        if (ctx.state === 'suspended') ctx.resume();
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

    shot(key, pan = 0) {
      if (!live()) return;
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
