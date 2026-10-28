import { createAudio } from './game-audio.js';
import { createBloom, createDecals, createGlows, createDebris, createFloaters, createDamageDir } from './game-fx.js';
import { createBotKit } from './game-bots.js';
import { createHazards } from './game-hazards.js';

const MAP = 22;
const WALL_H = 6;
const EYE = 1.65;
const ROUNDS = 5;
const START_MONEY = 800;
const BEST_KEY = 'core-defense-fps-best-v1';
const SIDES = ['North', 'East', 'South', 'West'];
const GATES = [[0, -MAP + 0.8], [MAP - 0.8, 0], [0, MAP - 0.8], [-MAP + 0.8, 0]];
const GATE_LETTERS = ['N', 'E', 'S', 'W'];

const WEAPONS = {
  pistol: { name: 'Pistol', dmg: 24, rate: 0.28, auto: false, mag: 12, reserve: 48, spread: 0.004, recoil: 0.012, reload: 1.1, len: 0.22, barrel: 0.1, cost: 0, color: 0x9aa7b8, vol: 0.5 },
  smg: { name: 'SMG', dmg: 14, rate: 0.075, auto: true, mag: 30, reserve: 120, spread: 0.02, recoil: 0.006, reload: 1.5, len: 0.34, barrel: 0.1, cost: 150, color: 0x6f8aa8, vol: 0.55 },
  rifle: { name: 'Rifle', dmg: 28, rate: 0.1, auto: true, mag: 30, reserve: 90, spread: 0.009, recoil: 0.011, reload: 1.8, len: 0.5, barrel: 0.2, cost: 350, color: 0x4b5f78, vol: 0.7 },
  sniper: { name: 'Sniper', dmg: 125, rate: 1.1, auto: false, mag: 5, reserve: 20, spread: 0.0006, recoil: 0.04, reload: 2.4, len: 0.6, barrel: 0.38, cost: 550, color: 0x3b4a5e, scope: true, vol: 1 }
};
const SLOT = ['pistol', 'smg', 'rifle', 'sniper'];

const KINDS = {
  spam: { name: 'spam bots', label: 'SPAM BOT', hp: 30, speed: 3.4, scale: 1.0, dmg: 6, rate: 2.0, bolt: 15, core: 1.2, money: 60, score: 10, keep: 9 },
  ddos: { name: 'DDoS bots', label: 'DDOS BOT', hp: 140, speed: 2.0, scale: 1.35, dmg: 13, rate: 2.3, bolt: 13, core: 3.5, money: 160, score: 30, keep: 11 },
  boss: { name: 'boss', label: 'BOSS', hp: 900, speed: 1.4, scale: 2.1, dmg: 20, rate: 1.7, bolt: 12, core: 8, money: 700, score: 250, keep: 13 },
  legit: { name: 'legit users', label: 'USER', hp: 40, speed: 2.6, scale: 1.0, dmg: 0, rate: 9, bolt: 0, core: 0, money: 50, score: 15, keep: 0 }
};
const WAVES = [
  { spam: 6, ddos: 0, boss: 0, legit: 3 },
  { spam: 9, ddos: 2, boss: 0, legit: 4 },
  { spam: 11, ddos: 4, boss: 0, legit: 5 },
  { spam: 13, ddos: 6, boss: 0, legit: 6 },
  { spam: 12, ddos: 6, boss: 1, legit: 6 }
];
const PRICES = { smg: 150, rifle: 350, sniper: 550, armor: 100, medkit: 80, sentry: 250 };
const TUT_KEY = 'core-defense-training-done-v1';
const TUT_PLAN = [
  { kind: 'spam', side: 3, off: 0, t: 2 },
  { kind: 'legit', side: 1, off: 0, t: 5 },
  { kind: 'spam', side: 1, off: 0, t: 11 },
  { kind: 'spam', side: 3, off: 0, t: 18 }
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

function glowTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color + '66');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function labelTexture(text, color) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const g = c.getContext('2d');
  g.font = '700 40px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(6,10,18,0.8)';
  g.fillRect(8, 8, 240, 64);
  g.strokeStyle = color;
  g.lineWidth = 3;
  g.strokeRect(8, 8, 240, 64);
  g.fillStyle = color;
  g.fillText(text, 128, 42);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTexture(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

export function initGame() {
  const overlay = document.getElementById('game-overlay');
  if (!overlay) return;

  const $ = (id) => document.getElementById(id);
  const canvas = $('game-canvas');
  const hud = overlay.querySelector('.game-hud');
  const startScreen = $('game-start');
  const endScreen = $('game-end');
  const pauseScreen = $('game-pause');
  const buyPanel = $('game-buy');
  const touchUi = $('game-touch');
  const crosshair = $('game-crosshair');
  const hitmarker = $('game-hitmarker');
  const scopeEl = $('game-scope');
  const killfeed = $('game-killfeed');
  const toast = $('game-toast');
  const flash = $('game-flash');
  const soundBtn = $('game-sound');
  const helpScreen = $('game-help');
  const coach = $('game-coach');
  const radarCtx = $('game-radar').getContext('2d');
  const buyMapCtx = $('buy-map').getContext('2d');
  let radarTick = 0;
  const startBtn = $('game-start-btn');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  let isOpen = false;
  let lastFocus = null;
  let rafId = 0;
  let last = 0;
  let toastTimer = 0;
  let hitTimer = 0;
  const audio = createAudio();
  const musicBtn = $('game-music');
  const promptEl = $('game-prompt');
  const fwEl = $('game-fw');
  const touchAct = $('touch-act');
  let locked = false;
  let lastUnlock = 0;
  let shadowsOn = false;
  let bloom = null;
  let slowFrames = 0;
  let fpsAcc = 0;
  let fpsN = 0;

  let renderer, scene, camera, vm, muzzle, flashSprite, geoBox, mats, colliders, staticMeshes, hitMeshes, bots, bolts, tracers, sentries, particles, coreGroup, crystal, coreRings;
  let botKit, decals, glows, debris, floaters, dmgDir, muzzleLight, panels, dust, hazards, gunEnv, gunMats, geoCyl, geoBall;
  const raycaster = new THREE.Raycaster();
  const losRay = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpRight = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  const S = {
    phase: 'idle', paused: false, round: 0, money: START_MONEY, score: 0, kills: 0, legitServed: 0, legitShot: 0, core: 100,
    px: 0, pz: 7, py: 0, vy: 0, yaw: 0, pitch: 0, kick: 0, health: 100, armor: 0, bob: 0,
    weapon: 'pistol', owned: new Set(['pistol']), ammo: {}, reloadT: 0, fireCd: 0, firing: false, semiReady: true, scoped: false,
    keys: new Set(), moveX: 0, moveZ: 0, freeLook: false, hadLock: false, plan: [], spawnIdx: 0, waveT: 0, shake: 0, flashT: 0, roundT: 0,
    tutorial: false, tutStep: 0, tut: { moved: 0, shots: 0, kills: 0, served: 0, reloaded: false, legitHit: false },
    adsOn: false, ads: 0, roll: 0, sprintT: 0, drawT: 0, landT: 0, wasAir: false, fovKick: 0, lookDX: 0, lookDY: 0, streak: 0, streakT: 0, stepPhase: 0, reloadStage: 0, hbT: 0, alarmT: 0, fw: [], held: [[], [], [], []]
  };
  const VM = { kickZ: 0, kickRot: 0, slide: 0, roll: 0, lightT: 0, lagX: 0, lagY: 0, wallT: 0, sniperCycle: 0 };
  let panelT = 0;
  let fxClock = 0;

  floaters = createFloaters($('game-fx'));
  dmgDir = createDamageDir($('game-dmgdir'));
  hazards = createHazards({
    S, GATES, SIDES, labelTexture, audio, panOf, emit, zapBot, hurtPlayer, showToast, feed, spawnBot, floaters,
    getBots: () => bots,
    get glows() { return glows; },
    refillAmmo: () => refillAmmo(),
    clearBolts: () => { bolts.forEach(b => scene.remove(b.m)); bolts.length = 0; },
    kickFx: (ab, shake) => { if (bloom) bloom.uniforms.aberration.value = ab; S.shake = reduceMotion ? 0 : shake; },
    setPrompt: (text) => { promptEl.textContent = text; promptEl.hidden = !text; touchAct.hidden = !text || !isTouch; },
    setFirewallHud: (list) => {
      fwEl.innerHTML = '<span class="fw-label">FIREWALL (F)</span>' + list.map(g => `<span class="fw-gate ${g.state}"><b>${g.side}</b>${g.state === 'ready' ? '' : ` ${g.n}s`}${g.held ? ` <i>+${g.held}</i>` : ''}</span>`).join('');
    }
  });

  // ---------- small helpers ----------
  const best = () => Number(localStorage.getItem(BEST_KEY)) || 0;
  const cache = {};
  const setText = (id, value) => {
    const v = String(value);
    if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; }
  };

  function showToast(message, bad = false, ms = 1800) {
    toast.textContent = message;
    toast.classList.toggle('bad', bad);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function feed(text, cls = '') {
    const row = document.createElement('div');
    row.textContent = text;
    if (cls) row.className = cls;
    killfeed.appendChild(row);
    while (killfeed.children.length > 4) killfeed.removeChild(killfeed.firstChild);
    setTimeout(() => row.remove(), 4200);
  }

  const beep = (freq, dur = 0.09, type = 'sine', vol = 0.04, slide = 0) => audio.tone(freq, dur, type, vol * 1.6, slide);

  // Stereo pan and distance of a world point relative to the player's view
  function panOf(x, z) {
    const dx = x - S.px, dz = z - S.pz;
    const d = Math.hypot(dx, dz);
    const pan = d > 0.01 ? clamp((dx * Math.cos(S.yaw) + dz * -Math.sin(S.yaw)) / d, -1, 1) * 0.9 : 0;
    return [pan, d];
  }

  // ---------- scene / map ----------
  function addBox(x, z, w, d, h, mat, collide = true, y0 = 0) {
    const m = new THREE.Mesh(geoBox, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y0 + h / 2, z);
    if (shadowsOn) { m.castShadow = true; m.receiveShadow = true; }
    scene.add(m);
    staticMeshes.push(m);
    if (collide) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h });
    return m;
  }

  function addGlowBox(x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(geoBox, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2) }));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  function build() {
    const isSmall = window.innerWidth < 768;
    shadowsOn = !isSmall && !isTouch;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall });
    // The canvas context is reused across sessions, so make sure old pixel-store flags don't leak in
    const gl = renderer.getContext();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    if (shadowsOn) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    bloom = null;
    if (!isSmall) { try { bloom = createBloom(renderer); } catch { bloom = null; } }
    slowFrames = 0; fpsAcc = 0; fpsN = 0;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070c);
    scene.fog = new THREE.Fog(0x05070c, 14, 52);
    camera = new THREE.PerspectiveCamera(75, 1, 0.05, 120);
    camera.rotation.order = 'YXZ';
    scene.add(camera);

    geoBox = new THREE.BoxGeometry(1, 1, 1);
    colliders = [];
    staticMeshes = [];
    hitMeshes = [];
    bots = [];
    bolts = [];
    tracers = [];
    sentries = [];

    const floorTex = canvasTexture(256, (g, s) => {
      g.fillStyle = '#10161f'; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#1b2736'; g.lineWidth = 3; g.strokeRect(2, 2, s - 4, s - 4);
      g.strokeStyle = '#141d29'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(Math.random() * s, Math.random() * s, 4, 4); }
    }, (MAP * 2 + 4) / 4, (MAP * 2 + 4) / 4);
    const wallTex = canvasTexture(256, (g, s) => {
      g.fillStyle = '#18222e'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#1e2b3a'; g.fillRect(0, 0, s, 8);
      g.strokeStyle = '#0d141d'; g.lineWidth = 3;
      for (let x = 0; x <= s; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, s); g.stroke(); }
      g.fillStyle = '#0aa8a0'; g.fillRect(0, s * 0.62, s, 5);
    }, 8, 2);
    const rackTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#0b0f15'; g.fillRect(0, 0, s, s);
      for (let y = 6; y < s; y += 14) {
        g.fillStyle = '#141b25'; g.fillRect(6, y, s - 12, 10);
        for (let x = 12; x < s - 12; x += 12) {
          g.fillStyle = Math.random() < 0.5 ? '#12e0a8' : Math.random() < 0.5 ? '#2a7fff' : '#ff9f43';
          g.fillRect(x, y + 3, 4, 4);
        }
      }
    });
    const crateTex = canvasTexture(128, (g, s) => {
      g.fillStyle = '#2b3442'; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#46566b'; g.lineWidth = 6; g.strokeRect(5, 5, s - 10, s - 10);
      g.beginPath(); g.moveTo(5, 5); g.lineTo(s - 5, s - 5); g.moveTo(s - 5, 5); g.lineTo(5, s - 5); g.stroke();
      g.fillStyle = '#c9a227'; for (let i = 0; i < 6; i++) g.fillRect(10 + i * 20, s - 14, 10, 6);
    });

    mats = {
      wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.2 }),
      rack: new THREE.MeshStandardMaterial({ map: rackTex, roughness: 0.5, metalness: 0.5, emissive: 0x0a1a18, emissiveMap: rackTex, emissiveIntensity: 0.6 }),
      crate: new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.7, metalness: 0.3 }),
      barrier: new THREE.MeshStandardMaterial({ color: 0x3a4658, roughness: 0.6, metalness: 0.4 }),
      pillar: new THREE.MeshStandardMaterial({ color: 0x222c3a, roughness: 0.7, metalness: 0.4 }),
      gunDark: new THREE.MeshStandardMaterial({ color: 0x0f1318, roughness: 0.4, metalness: 0.8 }),
      flash: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(1.8) }),
      boltEnemy: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff5252).multiplyScalar(2.2) }),
      boltGeo: new THREE.SphereGeometry(0.13, 8, 8),
      tracer: new THREE.LineBasicMaterial({ color: new THREE.Color(0xfff2b0).multiplyScalar(1.8), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }),
      sentry: new THREE.MeshStandardMaterial({ color: 0x2b4a6e, emissive: 0x0a3a66, metalness: 0.6, roughness: 0.35 }),
      sentryHead: new THREE.MeshStandardMaterial({ color: 0x7ce8ff, emissive: 0x1a8ab0, emissiveIntensity: 0.8 })
    };

    botKit = createBotKit(labelTexture, { shadowsOn });

    // Floor, ceiling and outer walls
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2 + 4, MAP * 2 + 4), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.42, metalness: 0.45 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = shadowsOn;
    scene.add(floor);
    staticMeshes.push(floor);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2 + 4, MAP * 2 + 4), new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 1 }));
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_H;
    scene.add(ceiling);
    staticMeshes.push(ceiling);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) addGlowBox(i * 8, WALL_H - 0.05, j * 8, 4, 0.06, 0.4, 0x9bdcff).material.opacity = 1;

    const T = 1.2;
    addBox(0, -MAP - T / 2, MAP * 2 + T * 2, T, WALL_H, mats.wall, false);
    addBox(0, MAP + T / 2, MAP * 2 + T * 2, T, WALL_H, mats.wall, false);
    addBox(-MAP - T / 2, 0, T, MAP * 2, WALL_H, mats.wall, false);
    addBox(MAP + T / 2, 0, T, MAP * 2, WALL_H, mats.wall, false);

    // Cover: racks, crates, barriers, pillars
    [[-12, -6], [-12, 6], [12, -6], [12, 6], [-6, -12], [6, -12], [-6, 12], [6, 12]].forEach(([x, z], i) => {
      const alongX = i < 4;
      addBox(x, z, alongX ? 1.1 : 3.2, alongX ? 3.2 : 1.1, 2.8, mats.rack);
    });
    [[-7, -3], [7, 3], [-3, 7], [3, -7]].forEach(([x, z]) => addBox(x, z, 2, 2, 1.4, mats.crate));
    [[0, -9, 5, 0.7], [0, 9, 5, 0.7], [-9, 0, 0.7, 5], [9, 0, 0.7, 5]].forEach(([x, z, w, d]) => addBox(x, z, w, d, 1.2, mats.barrier));
    [[-15, -15], [15, -15], [-15, 15], [15, 15]].forEach(([x, z]) => addBox(x, z, 1.2, 1.2, WALL_H, mats.pillar));

    // Gates with red frames and compass letters
    GATES.forEach(([gx, gz], i) => {
      const horizontal = i % 2 === 0;
      const w = horizontal ? 6 : 0.3;
      const d = horizontal ? 0.3 : 6;
      const inward = horizontal ? [0, i === 0 ? 0.2 : -0.2] : [i === 1 ? -0.2 : 0.2, 0];
      addGlowBox(gx + inward[0], 3.2, gz + inward[1], w, 0.3, d, 0xff3b3b);
      addGlowBox(gx + inward[0] + (horizontal ? -3 : 0), 1.6, gz + inward[1] + (horizontal ? 0 : -3), horizontal ? 0.3 : 0.3, 3.2, horizontal ? 0.3 : 0.3, 0xff3b3b);
      addGlowBox(gx + inward[0] + (horizontal ? 3 : 0), 1.6, gz + inward[1] + (horizontal ? 0 : 3), 0.3, 3.2, 0.3, 0xff3b3b);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff3b3b'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, fog: false }));
      glow.scale.set(9, 7, 1);
      glow.position.set(gx + inward[0] * 2, 2, gz + inward[1] * 2);
      scene.add(glow);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(GATE_LETTERS[i] + ' GATE', '#ff8a8a'), transparent: true, depthWrite: false, fog: false }));
      label.scale.set(4, 1.25, 1);
      label.position.set(gx + inward[0] * 3, 4.6, gz + inward[1] * 3);
      scene.add(label);
      // Neon lane from gate to core
      const len = MAP - 3;
      const lane = addGlowBox(gx * 0.5, 0.02, gz * 0.5, horizontal ? 0.2 : len, 0.03, horizontal ? len : 0.2, 0x5a1020);
      lane.material.transparent = true;
      lane.material.opacity = 0.7;
    });

    // Core
    coreGroup = new THREE.Group();
    const coreBase = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.7, 10), new THREE.MeshStandardMaterial({ color: 0x1b2a3c, metalness: 0.6, roughness: 0.4 }));
    coreBase.position.y = 0.35;
    crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4, 6), new THREE.MeshStandardMaterial({ color: 0x00d4c8, emissive: 0x00d4c8, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.25, transparent: true, opacity: 0.9 }));
    crystal.position.y = 2.7;
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#00D4C8'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    coreGlow.scale.setScalar(9);
    coreGlow.position.y = 2.7;
    coreRings = [0, 1].map(i => {
      const r = new THREE.Mesh(new THREE.TorusGeometry(1.7 + i * 0.4, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0x7ce8ff, transparent: true, opacity: 0.8 }));
      r.rotation.x = Math.PI / 2;
      r.position.y = 1.4 + i * 1.6;
      return r;
    });
    const coreLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('SERVER CORE', '#7ce8ff'), transparent: true, depthWrite: false, fog: false }));
    coreLabel.scale.set(4.4, 1.4, 1);
    coreLabel.position.y = 5.2;
    coreGroup.add(coreBase, crystal, coreGlow, coreLabel, ...coreRings);
    scene.add(coreGroup);
    staticMeshes.push(coreBase, crystal);
    colliders.push({ x0: -1.9, x1: 1.9, z0: -1.9, z1: 1.9, h: 5 });

    // Lights
    scene.add(new THREE.AmbientLight(0x6f86a8, 0.5));
    scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x10161f, 0.6));
    const coreLight = new THREE.PointLight(0x00d4c8, 45, 20, 2);
    coreLight.position.set(0, 3, 0);
    scene.add(coreLight);
    if (!isSmall) {
      GATES.forEach(([gx, gz]) => {
        const l = new THREE.PointLight(0xff3b3b, 14, 14, 2);
        l.position.set(gx * 0.9, 3, gz * 0.9);
        scene.add(l);
      });
    }
    if (shadowsOn) {
      const sun = new THREE.DirectionalLight(0xbcd4ff, 1.15);
      sun.position.set(14, 26, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      const sc = sun.shadow.camera;
      sc.left = sc.bottom = -32;
      sc.right = sc.top = 32;
      sc.near = 1;
      sc.far = 70;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.04;
      scene.add(sun);
    }
    muzzleLight = new THREE.PointLight(0xffc477, 0, 12, 2);
    scene.add(muzzleLight);

    // Wall screens showing live "traffic"
    const pc2 = document.createElement('canvas');
    pc2.width = 256; pc2.height = 112;
    const panelTex = new THREE.CanvasTexture(pc2);
    panelTex.colorSpace = THREE.SRGBColorSpace;
    panels = { ctx: pc2.getContext('2d'), tex: panelTex, t: 0, bars: Array.from({ length: 24 }, () => Math.random()) };
    const panelMat = new THREE.MeshBasicMaterial({ map: panelTex, color: new THREE.Color(1.5, 1.5, 1.5) });
    const panelGeo = new THREE.PlaneGeometry(5, 2.2);
    [[-1, 0, -MAP + 0.05, 0], [1, 0, MAP - 0.05, Math.PI], [-1, 1, -MAP + 0.05, Math.PI / 2], [1, 1, MAP - 0.05, -Math.PI / 2]].forEach(([, axis, c, rot]) => {
      [-16, -10, 10, 16].forEach(u => {
        const p = new THREE.Mesh(panelGeo, panelMat);
        p.position.set(axis ? c : u, 3.4, axis ? u : c);
        p.rotation.y = rot;
        scene.add(p);
      });
    });
    drawPanels(0);

    // Light shafts and floating dust
    const coneGeo = new THREE.CylinderGeometry(0.6, 3.2, WALL_H, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x9bdcff, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let i = -2; i <= 2; i += 2) for (let j = -2; j <= 2; j += 2) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(i * 8, WALL_H / 2, j * 8);
      scene.add(cone);
    }
    const DUST = isSmall ? 50 : 130;
    const dp = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) { dp[i * 3] = rand(-MAP, MAP); dp[i * 3 + 1] = rand(0.2, WALL_H - 0.3); dp[i * 3 + 2] = rand(-MAP, MAP); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.07, map: glowTexture('#ffffff'), color: 0x9bdcff, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.frustumCulled = false;
    scene.add(dust);

    decals = createDecals(scene);
    glows = createGlows(scene, glowTexture('#ffffff'));
    debris = createDebris(scene, geoBox);
    hazards.build(scene, geoBox);
    hazards.reset();

    // Particle bursts
    const MAXP = 360;
    const pp = new Float32Array(MAXP * 3).fill(-999);
    const pc = new Float32Array(MAXP * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.18, map: glowTexture('#ffffff'), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    particles = { MAXP, pos: pp, col: pc, base: new Float32Array(MAXP * 3), vel: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), head: 0, geo: pg };

    // Viewmodel
    vm = new THREE.Group();
    camera.add(vm);
    geoCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    geoBall = new THREE.SphereGeometry(0.5, 12, 10);
    gunEnv = makeGunEnv();
    gunMats = makeGunMaterials();
    const gunLight = new THREE.PointLight(0xdfeaff, 1.1, 2.5, 2);
    gunLight.position.set(0.1, 0.35, 0.15);
    camera.add(gunLight);
    flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffd27a'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    flashSprite.visible = false;

    resize();
  }

  // Soft studio-style reflections so the metal parts of the weapons actually look like metal
  function makeGunEnv() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#34455f');
    grad.addColorStop(0.45, '#0e1522');
    grad.addColorStop(1, '#06080d');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) g.fillRect(i * 64 + 12, 34, 40, 9);
    g.fillStyle = '#7ce8ff';
    g.fillRect(40, 96, 90, 10);
    g.fillRect(330, 110, 110, 10);
    g.fillStyle = '#ff6a5a';
    g.fillRect(200, 130, 70, 8);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(tex).texture;
    pm.dispose();
    tex.dispose();
    return env;
  }

  function makeGunMaterials() {
    const stipple = canvasTexture(64, (g, s) => {
      g.fillStyle = '#808080';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 700; i++) { g.fillStyle = Math.random() < 0.5 ? '#000' : '#fff'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    }, 5, 5);
    const metal = (color, metalness, roughness, env) => new THREE.MeshStandardMaterial({ color, metalness, roughness, envMap: gunEnv, envMapIntensity: env });
    const poly = (color) => new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.72, bumpMap: stipple, bumpScale: 0.7, envMap: gunEnv, envMapIntensity: 0.6 });
    return {
      steel: metal(0x8a95a3, 0.95, 0.27, 1.5),
      blued: metal(0x2a3038, 0.9, 0.36, 1.4),
      dark: metal(0x12151a, 0.6, 0.5, 1),
      poly: poly(0x1c2027),
      olive: poly(0x3e4c30),
      glove: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.9, bumpMap: stipple, bumpScale: 0.5 }),
      sleeve: new THREE.MeshStandardMaterial({ color: 0x20293a, roughness: 0.9, bumpMap: stipple, bumpScale: 0.4 }),
      dot: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x59ff9c).multiplyScalar(2.5) }),
      accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2fe8dc).multiplyScalar(2.2) }),
      lens: new THREE.MeshStandardMaterial({ color: 0x0a1a2a, metalness: 0.3, roughness: 0.05, emissive: 0x0a3a4a, emissiveIntensity: 0.35, envMap: gunEnv, envMapIntensity: 2.2 })
    };
  }

  function buildViewmodel(key) {
    while (vm.children.length) vm.remove(vm.children[0]);
    const m = gunMats;
    const put = (parent, geo, mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const o = new THREE.Mesh(geo, mat);
      o.scale.set(sx, sy, sz);
      o.position.set(x, y, z);
      o.rotation.set(rx, ry, rz);
      parent.add(o);
      return o;
    };
    const bx = (p, mat, sx, sy, sz, x, y, z, rx, ry, rz) => put(p, geoBox, mat, sx, sy, sz, x, y, z, rx, ry, rz);
    const cz = (p, mat, d, len, x, y, z) => put(p, geoCyl, mat, d, len, d, x, y, z, Math.PI / 2);
    const cy = (p, mat, d, len, x, y, z) => put(p, geoCyl, mat, d, len, d, x, y, z);
    const cx = (p, mat, d, len, x, y, z) => put(p, geoCyl, mat, d, len, d, x, y, z, 0, 0, Math.PI / 2);
    const ball = (p, mat, d, x, y, z) => put(p, geoBall, mat, d, d, d, x, y, z);

    const rightHand = (gx, gy, gz) => {
      const h = new THREE.Group();
      h.position.set(gx, gy, gz);
      bx(h, m.glove, 0.046, 0.075, 0.05, 0.014, 0, 0.034);
      [0.034, 0.012, -0.01, -0.032].forEach(y => bx(h, m.glove, 0.054, 0.018, 0.02, 0, y, -0.036));
      bx(h, m.glove, 0.016, 0.018, 0.07, -0.032, 0.036, -0.012);
      bx(h, m.glove, 0.014, 0.014, 0.06, 0, 0.062, -0.058);
      bx(h, m.sleeve, 0.058, 0.058, 0.32, 0.04, -0.07, 0.22, 0.6, 0.18, 0);
      bx(h, m.dark, 0.064, 0.064, 0.022, 0.026, -0.04, 0.08, 0.6, 0.18, 0);
      vm.add(h);
      return h;
    };
    const leftHand = (x, y, z, ry = 0) => {
      const h = new THREE.Group();
      bx(h, m.glove, 0.085, 0.032, 0.09, 0, 0, 0);
      [-0.03, -0.01, 0.01, 0.03].forEach(zz => bx(h, m.glove, 0.02, 0.05, 0.017, -0.048, 0.022, zz));
      bx(h, m.glove, 0.018, 0.04, 0.02, 0.046, 0.016, -0.02, 0, 0, -0.2);
      bx(h, m.sleeve, 0.06, 0.06, 0.34, -0.05, -0.08, 0.26, 0.55, -0.3, 0);
      bx(h, m.dark, 0.066, 0.066, 0.022, -0.025, -0.045, 0.1, 0.55, -0.3, 0);
      h.position.set(x, y, z);
      h.rotation.y = ry;
      vm.add(h);
      return h;
    };
    const mkGroup = (x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); vm.add(g); return g; };
    const sightDots = (p, x, y, z) => bx(p, m.dot, 0.004, 0.004, 0.002, x, y, z);

    let mag, slide, handR, handL, lBase, tip, adsY, adsZ, grip;

    if (key === 'pistol') {
      bx(vm, m.poly, 0.034, 0.03, 0.17, 0, -0.028, -0.085);
      bx(vm, m.poly, 0.032, 0.014, 0.075, 0, -0.04, -0.16);
      bx(vm, m.poly, 0.036, 0.11, 0.056, 0, -0.095, -0.02, -0.2);
      bx(vm, m.poly, 0.034, 0.03, 0.03, 0, -0.045, 0.016);
      bx(vm, m.poly, 0.03, 0.006, 0.058, 0, -0.056, -0.078);
      bx(vm, m.poly, 0.03, 0.03, 0.006, 0, -0.042, -0.106);
      bx(vm, m.dark, 0.008, 0.022, 0.01, 0, -0.04, -0.07, 0.3);
      bx(vm, m.accent, 0.036, 0.004, 0.05, 0, -0.012, -0.14);
      slide = mkGroup(0, 0.012, -0.115);
      bx(slide, m.steel, 0.032, 0.038, 0.23, 0, 0, 0);
      bx(slide, m.blued, 0.03, 0.01, 0.23, 0, 0.022, 0);
      for (let i = 0; i < 6; i++) bx(slide, m.dark, 0.036, 0.03, 0.003, 0, 0, 0.1 - i * 0.009);
      bx(slide, m.dark, 0.034, 0.014, 0.05, 0, 0.004, -0.02);
      bx(slide, m.dark, 0.006, 0.011, 0.012, 0, 0.031, -0.098);
      bx(slide, m.dark, 0.022, 0.011, 0.012, 0, 0.031, 0.1);
      sightDots(slide, 0, 0.0375, -0.1045);
      sightDots(slide, -0.007, 0.0375, 0.1065);
      sightDots(slide, 0.007, 0.0375, 0.1065);
      cz(slide, m.dark, 0.017, 0.016, 0, 0.004, -0.121);
      mag = mkGroup(0, -0.118, -0.018);
      bx(mag, m.dark, 0.026, 0.09, 0.042, 0, 0, 0, -0.2);
      bx(mag, m.poly, 0.036, 0.012, 0.054, 0, -0.054, 0.012, -0.2);
      grip = [0, -0.092, -0.022];
      lBase = new THREE.Vector3(0, -0.125, -0.025);
      handL = leftHand(lBase.x, lBase.y, lBase.z);
      tip = 0.245; adsY = -0.043; adsZ = -0.27;
    } else if (key === 'smg') {
      bx(vm, m.blued, 0.05, 0.058, 0.28, 0, 0, -0.14);
      bx(vm, m.steel, 0.03, 0.012, 0.22, 0, 0.034, -0.15);
      bx(vm, m.dark, 0.022, 0.02, 0.024, 0, 0.05, -0.05);
      bx(vm, m.dark, 0.006, 0.012, 0.012, 0, 0.0, -0.05);
      bx(vm, m.poly, 0.056, 0.062, 0.13, 0, -0.004, -0.345);
      for (let i = 0; i < 4; i++) bx(vm, m.dark, 0.06, 0.02, 0.008, 0, 0.0, -0.3 - i * 0.03);
      bx(vm, m.steel, 0.03, 0.026, 0.01, 0, 0.0, -0.412);
      cz(vm, m.steel, 0.021, 0.05, 0, 0, -0.437);
      cz(vm, m.dark, 0.027, 0.032, 0, 0, -0.472);
      cy(vm, m.dark, 0.022, 0.03, 0, 0.032, -0.425);
      bx(vm, m.dark, 0.004, 0.02, 0.004, 0, 0.043, -0.425);
      sightDots(vm, 0, 0.054, -0.425);
      bx(vm, m.poly, 0.04, 0.12, 0.058, 0, -0.095, -0.035, -0.28);
      bx(vm, m.blued, 0.044, 0.03, 0.12, 0, -0.04, -0.1);
      bx(vm, m.dark, 0.03, 0.006, 0.06, 0, -0.058, -0.095);
      bx(vm, m.dark, 0.008, 0.022, 0.01, 0, -0.045, -0.088, 0.3);
      bx(vm, m.accent, 0.052, 0.004, 0.1, 0, 0.0, -0.1);
      [-0.022, 0.022].forEach(x => cz(vm, m.steel, 0.009, 0.1, x, 0.004, 0.05));
      bx(vm, m.dark, 0.05, 0.012, 0.012, 0, 0.004, 0.1);
      bx(vm, m.poly, 0.042, 0.095, 0.018, 0, -0.01, 0.112);
      slide = mkGroup(0.036, 0.016, -0.22);
      bx(slide, m.dark, 0.016, 0.016, 0.034, 0, 0, 0);
      bx(slide, m.steel, 0.01, 0.01, 0.07, 0, 0, -0.04);
      mag = mkGroup(0, -0.098, -0.17);
      bx(mag, m.dark, 0.034, 0.1, 0.052, 0, 0, 0, -0.05);
      bx(mag, m.dark, 0.034, 0.075, 0.052, 0, -0.082, -0.018, 0.22);
      bx(mag, m.poly, 0.04, 0.01, 0.056, 0, -0.123, -0.03, 0.22);
      grip = [0, -0.1, -0.04];
      lBase = new THREE.Vector3(0, -0.048, -0.345);
      handL = leftHand(lBase.x, lBase.y, lBase.z);
      tip = 0.49; adsY = -0.056; adsZ = -0.3;
    } else if (key === 'rifle') {
      bx(vm, m.blued, 0.05, 0.05, 0.28, 0, 0, -0.16);
      bx(vm, m.poly, 0.05, 0.045, 0.2, 0, -0.048, -0.11);
      bx(vm, m.steel, 0.022, 0.012, 0.42, 0, 0.03, -0.2);
      for (let i = 0; i < 11; i++) bx(vm, m.dark, 0.026, 0.008, 0.008, 0, 0.036, -0.02 - i * 0.035);
      bx(vm, m.dark, 0.022, 0.024, 0.014, 0, 0.05, -0.04);
      bx(vm, m.dark, 0.004, 0.012, 0.004, 0, 0.066, -0.04);
      bx(vm, m.dark, 0.012, 0.045, 0.014, 0, 0.056, -0.51);
      sightDots(vm, 0, 0.081, -0.51);
      bx(vm, m.poly, 0.058, 0.058, 0.24, 0, 0, -0.42);
      for (let i = 0; i < 6; i++) bx(vm, m.dark, 0.062, 0.02, 0.012, 0, 0, -0.325 - i * 0.034);
      bx(vm, m.dark, 0.03, 0.03, 0.03, 0, 0.0, -0.555);
      cz(vm, m.steel, 0.022, 0.1, 0, 0, -0.6);
      cz(vm, m.dark, 0.03, 0.05, 0, 0, -0.67);
      bx(vm, m.steel, 0.032, 0.006, 0.008, 0, 0.0, -0.67);
      bx(vm, m.poly, 0.042, 0.12, 0.06, 0, -0.12, -0.015, -0.3);
      bx(vm, m.poly, 0.034, 0.006, 0.07, 0, -0.074, -0.07);
      bx(vm, m.dark, 0.008, 0.022, 0.01, 0, -0.058, -0.075, 0.3);
      bx(vm, m.accent, 0.052, 0.004, 0.14, 0, 0.0, -0.1);
      cz(vm, m.poly, 0.034, 0.1, 0, -0.012, 0.05);
      bx(vm, m.poly, 0.044, 0.075, 0.08, 0, -0.03, 0.09);
      bx(vm, m.dark, 0.046, 0.06, 0.015, 0, -0.03, 0.135);
      slide = mkGroup(0, 0.036, -0.02);
      bx(slide, m.dark, 0.03, 0.012, 0.04, 0, 0, 0);
      bx(slide, m.dark, 0.02, 0.02, 0.02, 0, 0.0, 0.02);
      mag = mkGroup(0, -0.11, -0.14);
      bx(mag, m.dark, 0.034, 0.13, 0.055, 0, 0, 0, 0.1);
      bx(mag, m.poly, 0.038, 0.01, 0.06, 0, -0.07, 0.01, 0.1);
      grip = [0, -0.12, -0.02];
      lBase = new THREE.Vector3(0, -0.047, -0.42);
      handL = leftHand(lBase.x, lBase.y, lBase.z);
      tip = 0.695; adsY = -0.054; adsZ = -0.3;
    } else {
      bx(vm, m.blued, 0.05, 0.06, 0.26, 0, 0, -0.14);
      bx(vm, m.olive, 0.052, 0.1, 0.22, 0, -0.03, 0.09);
      bx(vm, m.olive, 0.05, 0.04, 0.14, 0, 0.034, 0.12);
      bx(vm, m.dark, 0.054, 0.11, 0.02, 0, -0.035, 0.2);
      bx(vm, m.olive, 0.05, 0.07, 0.34, 0, -0.025, -0.47);
      bx(vm, m.olive, 0.042, 0.12, 0.06, 0, -0.1, -0.04, -0.3);
      bx(vm, m.dark, 0.034, 0.006, 0.07, 0, -0.07, -0.09);
      bx(vm, m.dark, 0.008, 0.022, 0.01, 0, -0.055, -0.1, 0.3);
      cz(vm, m.steel, 0.028, 0.18, 0, 0, -0.73);
      cz(vm, m.dark, 0.038, 0.07, 0, 0, -0.85);
      for (let i = 0; i < 3; i++) bx(vm, m.steel, 0.04, 0.004, 0.008, 0, 0.0, -0.83 - i * 0.02);
      [-0.02, 0.02].forEach(x => cz(vm, m.dark, 0.009, 0.14, x, -0.07, -0.6));
      bx(vm, m.dark, 0.02, 0.03, 0.03, 0, 0.045, -0.06);
      bx(vm, m.dark, 0.02, 0.03, 0.03, 0, 0.045, -0.24);
      cz(vm, m.dark, 0.034, 0.26, 0, 0.078, -0.15);
      cz(vm, m.dark, 0.052, 0.07, 0, 0.078, -0.31);
      cz(vm, m.dark, 0.044, 0.05, 0, 0.078, 0.0);
      cz(vm, m.lens, 0.046, 0.004, 0, 0.078, -0.347);
      cz(vm, m.lens, 0.036, 0.004, 0, 0.078, 0.027);
      cy(vm, m.steel, 0.016, 0.02, 0, 0.1, -0.15);
      cx(vm, m.steel, 0.016, 0.02, 0.025, 0.078, -0.15);
      bx(vm, m.accent, 0.052, 0.004, 0.16, 0, 0.0, -0.1);
      slide = mkGroup(0.025, 0.02, -0.1);
      bx(slide, m.dark, 0.024, 0.022, 0.07, 0, 0, 0);
      bx(slide, m.dark, 0.07, 0.012, 0.012, 0.04, 0, 0.02);
      ball(slide, m.dark, 0.04, 0.08, 0, 0.02);
      mag = mkGroup(0, -0.065, -0.15);
      bx(mag, m.dark, 0.034, 0.06, 0.07, 0, 0, 0);
      bx(mag, m.olive, 0.038, 0.01, 0.074, 0, -0.035, 0);
      grip = [0, -0.1, -0.04];
      lBase = new THREE.Vector3(0, -0.078, -0.48);
      handL = leftHand(lBase.x, lBase.y, lBase.z);
      tip = 0.92; adsY = -0.075; adsZ = -0.3;
    }

    handR = rightHand(grip[0], grip[1], grip[2]);
    flashSprite.position.set(0, 0.003, -(tip + 0.03));
    vm.add(flashSprite);
    vm.userData = {
      base: key === 'pistol' ? new THREE.Vector3(0.15, -0.165, -0.46) : new THREE.Vector3(0.17, -0.19, -0.4),
      mag, slide, handL, handR, lBase, adsY, adsZ,
      magBase: mag.position.clone(),
      slideBase: slide.position.clone(),
      pistol: key === 'pistol', sniper: key === 'sniper'
    };
    vm.position.copy(vm.userData.base);
    vm.rotation.set(0, 0, 0);
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (bloom) bloom.setSize();
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 85 : 75;
    camera.userData.baseFov = camera.fov;
    camera.updateProjectionMatrix();
  }

  function disposeScene(root) {
    root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      ms.forEach(m => {
        ['map', 'emissiveMap'].forEach(k => { if (m[k]) m[k].dispose(); });
        m.dispose();
      });
    });
  }

  function destroyScene() {
    if (!renderer) return;
    if (hazards) hazards.dispose();
    if (bloom) bloom.dispose();
    if (scene) disposeScene(scene);
    if (gunEnv) { gunEnv.dispose(); gunEnv = null; }
    gunMats = null;
    renderer.dispose();
    renderer = scene = camera = bloom = null;
  }

  // ---------- particles ----------
  function emit(x, y, z, hex, count, speed, nx = 0, ny = 0, nz = 0) {
    const c = new THREE.Color(hex);
    const bias = nx || ny || nz ? 0.9 : 0;
    for (let n = 0; n < count; n++) {
      const i = particles.head++ % particles.MAXP;
      particles.pos.set([x, y, z], i * 3);
      const dx = rand(-1, 1) + nx * bias * 1.6, dy = rand(-0.2, 1) + ny * bias * 1.6, dz = rand(-1, 1) + nz * bias * 1.6;
      const len = Math.hypot(dx, dy, dz) || 1;
      const sp = rand(0.3, 1) * speed;
      particles.vel.set([(dx / len) * sp, (dy / len) * sp, (dz / len) * sp], i * 3);
      particles.base.set([c.r * 1.6, c.g * 1.6, c.b * 1.6], i * 3);
      particles.life[i] = 1;
    }
  }

  function drawPanels(t) {
    const g = panels.ctx;
    const w = 256, h = 112;
    g.fillStyle = '#04101a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,212,200,0.6)';
    g.lineWidth = 2;
    g.strokeRect(2, 2, w - 4, h - 4);
    const hostile = bots ? bots.filter(b => !b.dead && !b.legit).length : 0;
    const level = Math.min(1, 0.15 + hostile / 14);
    for (let i = 0; i < panels.bars.length; i++) {
      panels.bars[i] += (Math.random() - 0.5) * 0.35;
      panels.bars[i] = clamp(panels.bars[i], 0.08, 1);
      const v = Math.min(1, panels.bars[i] * (0.35 + level));
      g.fillStyle = v > 0.75 ? '#ff4d4d' : v > 0.5 ? '#ffb347' : '#2fe8dc';
      g.fillRect(10 + i * 10, h - 14 - v * 70, 7, v * 70);
    }
    g.fillStyle = '#7ce8ff';
    g.font = '700 13px monospace';
    g.fillText('TRAFFIC', 10, 18);
    g.fillStyle = hostile ? '#ff6b6b' : '#59ff9c';
    g.fillText(hostile ? `THREAT ${hostile}` : 'ALL CLEAR', 150, 18);
    panels.tex.needsUpdate = true;
    void t;
  }

  function updateParticles(dt) {
    for (let i = 0; i < particles.MAXP; i++) {
      if (particles.life[i] <= 0) continue;
      particles.life[i] -= dt * 2.2;
      const l = Math.max(0, particles.life[i]);
      particles.pos[i * 3] += particles.vel[i * 3] * dt;
      particles.pos[i * 3 + 1] += particles.vel[i * 3 + 1] * dt;
      particles.pos[i * 3 + 2] += particles.vel[i * 3 + 2] * dt;
      particles.vel[i * 3 + 1] -= 9 * dt;
      particles.col[i * 3] = particles.base[i * 3] * l;
      particles.col[i * 3 + 1] = particles.base[i * 3 + 1] * l;
      particles.col[i * 3 + 2] = particles.base[i * 3 + 2] * l;
      if (l === 0) particles.pos.set([0, -999, 0], i * 3);
    }
    particles.geo.attributes.position.needsUpdate = true;
    particles.geo.attributes.color.needsUpdate = true;
  }

  // ---------- collisions ----------
  function resolve(x, z, r) {
    for (const c of colliders) {
      const nx = clamp(x, c.x0, c.x1);
      const nz = clamp(z, c.z0, c.z1);
      const dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          z = nz + (dz / d) * r;
        } else {
          const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z;
          const m = Math.min(l, rr, t, b);
          if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r; else if (m === t) z = c.z0 - r; else z = c.z1 + r;
        }
      }
    }
    const lim = MAP - 0.7;
    return [clamp(x, -lim, lim), clamp(z, -lim, lim)];
  }

  function hasLOS(fromX, fromZ, toX, toZ) {
    tmpV.set(fromX, 1.4, fromZ);
    tmpDir.set(toX - fromX, 0, toZ - fromZ);
    const dist = tmpDir.length();
    if (dist < 0.1) return true;
    tmpDir.divideScalar(dist);
    losRay.set(tmpV, tmpDir);
    losRay.far = dist;
    return losRay.intersectObjects(staticMeshes, false).length === 0;
  }

  // ---------- bots ----------
  function makeHumanoid(kind) {
    return botKit.build(kind, KINDS[kind].scale);
  }

  function spawnBot(p) {
    const k = KINDS[p.kind];
    const built = makeHumanoid(p.kind);
    const [gx, gz] = GATES[p.side];
    built.g.position.set(p.side % 2 === 0 ? gx + p.off : gx, 0, p.side % 2 === 1 ? gz + p.off : gz);
    built.g.scale.setScalar(0.01);
    scene.add(built.g);
    const bot = {
      kind: p.kind, k, legit: p.kind === 'legit', g: built.g, parts: built.parts, torso: built.torso, head: built.head, legL: built.legL, legR: built.legR, armR: built.armR, armL: built.armL,
      upper: built.upper, headG: built.headG, halo: built.halo, blink: built.blink,
      x: built.g.position.x, z: built.g.position.z, hp: k.hp, dead: false, deathT: 0, walk: Math.random() * 6, cd: rand(0.8, k.rate), strafe: Math.random() < 0.5 ? 1 : -1,
      los: false, losT: Math.random() * 0.3, flashT: 0, burst: 0, stuckT: 0, origMats: built.parts.map(m => m.material),
      spawnT: 0, stunT: 0, stagger: 0, flinch: 0, trapT: 0, voiceT: rand(2.5, 7), arcT: 0
    };
    built.parts.forEach(m => { m.userData.bot = bot; hitMeshes.push(m); });
    bots.push(bot);
    const color = bot.legit ? '#59ff9c' : p.kind === 'boss' ? '#b04dff' : '#ff5a3c';
    glows.pop(built.g.position.x, 1.2, built.g.position.z, color, p.kind === 'boss' ? 7 : 3.5, 0.5, 2);
    emit(built.g.position.x, 1.2, built.g.position.z, color, 14, 4);
    const [pan, d] = panOf(bot.x, bot.z);
    audio.botVoice(p.kind, pan, d, 'spawn');
    if (p.kind === 'boss') { showToast('BOSS incoming!', true, 2200); S.shake = reduceMotion ? 0 : 0.5; }
  }

  function removeBot(b) {
    scene.remove(b.g);
    bots.splice(bots.indexOf(b), 1);
  }

  const STREAKS = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE'];
  function showStreak(text) {
    const el = $('game-streak');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function killBot(b, headshot, source = 'gun') {
    if (b.dead) return;
    b.dead = true;
    b.deathT = 0;
    b.parts.forEach(m => { const i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1); });
    const k = b.k;
    const pos = b.g.position;
    const at = new THREE.Vector3(pos.x, 1.5 * k.scale, pos.z);
    const [pan, d] = panOf(pos.x, pos.z);
    if (b.legit) {
      audio.botDie('legit', pan, d);
      glows.pop(pos.x, 1.2, pos.z, '#59ff9c', 4, 0.4, 2);
      emit(pos.x, 1.2, pos.z, '#59ff9c', 26, 6);
      if (source === 'trap') {
        feed('Legit user fried by a trap', 'bad');
        floaters.add(at, 'ZAPPED', 'legit');
      } else {
        S.money = Math.max(0, S.money - 100);
        S.score = Math.max(0, S.score - 50);
        S.legitShot += 1;
        S.tut.legitHit = true;
        S.streak = 0;
        feed('Legit user down  -$100', 'bad');
        showToast('You shot a legit user! -$100', true, 1600);
        floaters.add(at, '-$100', 'legit big');
        audio.deny();
      }
    } else {
      S.money += k.money;
      S.score += k.score + (headshot ? 25 : 0);
      S.kills += 1;
      S.tut.kills += 1;
      const big = b.kind === 'boss';
      audio.botDie(b.kind, pan, d);
      glows.pop(pos.x, 1.2 * k.scale, pos.z, big ? '#d58cff' : '#ff9a5c', big ? 12 : 4.5, big ? 0.8 : 0.35, 2.2);
      emit(pos.x, 1.2 * k.scale, pos.z, big ? '#c77dff' : '#ff7a5c', big ? 70 : 34, big ? 9 : 7);
      emit(pos.x, 1.6 * k.scale, pos.z, '#ffe08a', 12, 8);
      feed(`${k.label} down${headshot ? '  (headshot)' : ''}${source === 'trap' ? '  (trap)' : ''}  +$${k.money}`, 'good');
      floaters.add(at, `+$${k.money}`, 'cash');
      S.fovKick = Math.min(6, S.fovKick + (big ? 6 : 2.5));
      if (S.streakT > 0) S.streak += 1; else S.streak = 1;
      S.streakT = 3;
      if (S.streak >= 2) showStreak(STREAKS[Math.min(S.streak, STREAKS.length - 1)]);
      if (big) { S.shake = reduceMotion ? 0 : 0.6; if (bloom) bloom.uniforms.aberration.value = 0.01; }
    }
  }

  function damageBot(b, dmg, headshot, point) {
    if (b.dead) return;
    b.hp -= dmg;
    b.flashT = 0.07;
    b.flinch = 1;
    if (!b.legit && b.kind !== 'boss') b.stagger = headshot ? 0.3 : 0.14;
    const dead = b.hp <= 0;
    hitmarker.classList.remove('fade', 'kill', 'head');
    hitmarker.classList.add('show');
    if (dead) hitmarker.classList.add('kill');
    if (headshot) hitmarker.classList.add('head');
    clearTimeout(hitTimer);
    hitTimer = setTimeout(() => { hitmarker.classList.remove('show'); hitmarker.classList.add('fade'); }, 110);
    audio.hit(headshot, dead);
    const at = point ? point.clone() : new THREE.Vector3(b.g.position.x, 1.5 * b.k.scale, b.g.position.z);
    at.y += 0.25;
    if (!dead || headshot) floaters.add(at, headshot ? `${Math.round(dmg)} HEAD` : String(Math.round(dmg)), b.legit ? 'legit' : headshot ? 'head big' : 'norm');
    if (dead) killBot(b, headshot);
  }

  // Trap and EMP damage: no hit marker, no penalty for users
  function zapBot(b, dmg) {
    if (b.dead) return;
    b.hp -= dmg;
    b.flashT = 0.05;
    b.flinch = 0.6;
    if (b.hp <= 0) killBot(b, false, 'trap');
  }

  function fireEnemyBolt(b, count = 1) {
    const k = b.k;
    for (let n = 0; n < count; n++) {
      const m = new THREE.Mesh(mats.boltGeo, mats.boltEnemy);
      const pos = b.g.position;
      m.position.set(pos.x, 1.2 * k.scale, pos.z);
      const dx = S.px - pos.x, dz = S.pz - pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const inacc = 0.35 + dist * 0.035;
      const target = tmpV.set(S.px + rand(-inacc, inacc), S.py + 1.15 + rand(-inacc * 0.5, inacc * 0.5), S.pz + rand(-inacc, inacc));
      const dir = new THREE.Vector3().subVectors(target, m.position).normalize();
      scene.add(m);
      bolts.push({ m, vx: dir.x * k.bolt, vy: dir.y * k.bolt, vz: dir.z * k.bolt, life: 3, dmg: k.dmg, sx: pos.x, sz: pos.z });
    }
    glows.pop(b.g.position.x, 1.2 * k.scale, b.g.position.z, '#ff5252', 1.6 * k.scale, 0.12, 1.8);
    const [pan, d] = panOf(b.x, b.z);
    audio.enemyShot(pan, d, b.kind);
  }

  function updateBot(b, dt, t) {
    const k = b.k;
    if (b.dead) {
      b.deathT += dt;
      const f = Math.min(1, b.deathT / 0.5);
      b.g.rotation.x = -Math.PI / 2 * f;
      b.g.position.y = -0.1 * f;
      if (b.deathT > 1.1) b.g.scale.setScalar(Math.max(0.001, k.scale * (1 - (b.deathT - 1.1) / 0.5)));
      if (b.deathT > 1.6) removeBot(b);
      return;
    }
    if (b.flashT > 0) {
      b.flashT -= dt;
      b.parts.forEach((m, i) => { m.material = b.flashT > 0 ? mats.flash : b.origMats[i]; });
    }
    if (b.spawnT < 0.35) {
      b.spawnT += dt;
      const e = Math.min(1, b.spawnT / 0.35);
      b.g.scale.setScalar(k.scale * Math.max(0.01, 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2)));
    }
    b.flinch = Math.max(0, b.flinch - dt * 5);
    b.upper.rotation.x = -b.flinch * 0.28;
    b.headG.rotation.x = -b.flinch * 0.2;
    if (b.halo) b.halo.rotation.z += dt * 1.5;
    b.voiceT -= dt;
    if (b.voiceT <= 0) {
      b.voiceT = rand(3.5, 9);
      const [pan, d] = panOf(b.x, b.z);
      if (d < 26 && !S.tutorial) audio.botVoice(b.kind, pan, d, 'idle');
    }
    if (b.stunT > 0) {
      b.stunT -= dt;
      b.upper.rotation.z = Math.sin(t * 60) * 0.1;
      if (Math.random() < 0.3) emit(b.x + rand(-0.3, 0.3), rand(0.6, 1.8) * k.scale, b.z + rand(-0.3, 0.3), '#9fe8ff', 2, 3);
      b.legL.rotation.x = b.legR.rotation.x = 0;
      return;
    }
    b.upper.rotation.z = 0;

    const speed = k.speed * (1 + S.round * 0.04) * (S.tutorial ? 0.6 : 1) * (b.stagger > 0 ? 0.25 : 1);
    if (b.stagger > 0) b.stagger -= dt;
    const dP = Math.hypot(S.px - b.x, S.pz - b.z);
    const dC = Math.hypot(b.x, b.z);
    let mx = 0, mz = 0, face = null;

    if (b.legit) {
      if (dC < 2.9) {
        S.money += k.money;
        S.score += k.score;
        S.legitServed += 1;
        S.tut.served += 1;
        emit(b.x, 1.4, b.z, '#59ff9c', 14, 4);
        floaters.add(new THREE.Vector3(b.x, 2.1, b.z), `+$${k.money}`, 'cash');
        glows.pop(b.x, 1.2, b.z, '#59ff9c', 3, 0.35, 1.8);
        feed(`Legit user served  +$${k.money}`, 'good');
        beep(740, 0.08, 'triangle', 0.04, 200);
        audio.pickup();
        b.parts.forEach(m => { const i = hitMeshes.indexOf(m); if (i >= 0) hitMeshes.splice(i, 1); });
        removeBot(b);
        return;
      }
      mx = -b.x / dC; mz = -b.z / dC;
    } else {
      b.losT -= dt;
      if (b.losT <= 0) {
        b.losT = 0.3 + Math.random() * 0.25;
        b.los = dP < 26 && (S.tutorial || hasLOS(b.x, b.z, S.px, S.pz));
      }
      if (b.los && dP < 24 && (dC > 3.6 || S.tutorial)) {
        const dx = (S.px - b.x) / dP, dz = (S.pz - b.z) / dP;
        face = [dx, dz];
        if (dP > k.keep + 1.5) { mx = dx; mz = dz; }
        else if (dP < k.keep - 3) { mx = -dx; mz = -dz; }
        else { mx = -dz * b.strafe; mz = dx * b.strafe; if (Math.random() < 0.004) b.strafe *= -1; }
        b.cd -= dt;
        if (b.cd <= 0 && !S.tutorial) {
          const count = b.kind === 'boss' ? 3 : 1;
          fireEnemyBolt(b, count);
          b.cd = k.rate * (0.8 + Math.random() * 0.5);
        }
      } else if (dC > 3.2) {
        mx = -b.x / dC; mz = -b.z / dC;
      } else {
        face = [-b.x / dC, -b.z / dC];
        if (!S.tutorial) S.core -= k.core * dt;
        if (Math.random() < 0.05) emit(b.x, 1.2, b.z, '#ff5252', 2, 3);
      }
    }

    if (mx !== 0 || mz !== 0) {
      const prevX = b.x, prevZ = b.z;
      if (b.stuckT > 0) { const sx = -mz, sz = mx; mx = mx * 0.3 + sx * 0.9; mz = mz * 0.3 + sz * 0.9; b.stuckT -= dt; }
      const nx = b.x + mx * speed * dt;
      const nz = b.z + mz * speed * dt;
      const [rx, rz] = resolve(nx, nz, 0.4 * k.scale);
      b.x = rx; b.z = rz;
      if (Math.hypot(b.x - prevX, b.z - prevZ) < speed * dt * 0.3 && b.stuckT <= 0) b.stuckT = 0.7;
      b.walk += dt * speed * 2.6;
      if (!face) face = [mx, mz];
    }
    for (const o of bots) {
      if (o === b || o.dead) continue;
      const ox = b.x - o.x, oz = b.z - o.z;
      const od = Math.hypot(ox, oz);
      const min = 0.7 * Math.max(k.scale, o.k.scale);
      if (od > 0.001 && od < min) { b.x += (ox / od) * (min - od) * 0.4; b.z += (oz / od) * (min - od) * 0.4; }
    }
    const moving = mx !== 0 || mz !== 0;
    b.g.position.set(b.x, 0, b.z);
    if (face) b.g.rotation.y = Math.atan2(face[0], face[1]);
    const swing = moving ? Math.sin(b.walk) * 0.7 : 0;
    b.legL.rotation.x = swing;
    b.legR.rotation.x = -swing;
    if (b.legit) b.armR.rotation.x = -swing * 0.6;
    b.armL.rotation.x = -swing * 0.7;
    b.upper.position.y = 0.8 + (moving ? Math.abs(Math.sin(b.walk)) * 0.035 : Math.sin(t * 2 + b.walk) * 0.008);
    b.blink.visible = Math.sin(t * 6 + b.walk) > -0.2;
  }

  // ---------- player ----------
  function hurtPlayer(dmg, sx, sz) {
    if (S.phase !== 'combat' || S.tutorial) return;
    let d = dmg;
    const hadArmor = S.armor > 0;
    if (S.armor > 0) {
      const absorbed = Math.min(S.armor, d * 0.6);
      S.armor -= absorbed;
      d -= absorbed;
    }
    S.health -= d;
    S.shake = reduceMotion ? 0 : 0.35;
    flash.classList.remove('hit');
    void flash.offsetWidth;
    flash.classList.add('hit');
    audio.hurt(hadArmor);
    if (sx !== undefined) dmgDir.add(sx, sz);
    if (bloom) bloom.uniforms.aberration.value = Math.min(0.02, bloom.uniforms.aberration.value + 0.007);
    S.roll = reduceMotion ? 0 : (Math.random() < 0.5 ? -1 : 1) * 0.04;
    S.streak = 0;
    if (S.health <= 0) { S.health = 0; endGame(false, 'eliminated'); }
  }

  function startReload() {
    const w = WEAPONS[S.weapon];
    const st = S.ammo[S.weapon];
    if (S.reloadT > 0 || st.mag >= w.mag || st.reserve <= 0) return;
    S.reloadT = w.reload;
    S.reloadStage = 0;
    S.tut.reloaded = true;
    S.scoped = false;
    S.adsOn = false;
  }

  function equip(key) {
    if (!S.owned.has(key) || key === S.weapon) return;
    S.weapon = key;
    S.reloadT = 0;
    S.scoped = false;
    S.adsOn = false;
    S.drawT = 1;
    S.fireCd = Math.max(S.fireCd, 0.32);
    buildViewmodel(key);
    audio.draw();
  }

  function spawnCasing() {
    if (!renderer || !vm) return;
    const w = WEAPONS[S.weapon];
    const pos = vm.localToWorld(new THREE.Vector3(0.05, 0.03, -w.len * 0.25));
    const big = S.weapon === 'sniper';
    const vel = new THREE.Vector3().addScaledVector(tmpRight, 1.7 + Math.random()).addScaledVector(UP, 1.4 + Math.random() * 0.8).addScaledVector(tmpDir, -0.4);
    debris.spawn('brass', pos, vel, big ? { x: 0.025, y: 0.07, z: 0.025 } : { x: 0.014, y: 0.04, z: 0.014 }, 24, () => { if (Math.random() < 0.5) audio.casing(); });
  }

  function doShot() {
    const w = WEAPONS[S.weapon];
    camera.updateMatrixWorld(true);
    camera.getWorldDirection(tmpDir);
    tmpRight.crossVectors(tmpDir, UP).normalize();
    tmpUp.crossVectors(tmpRight, tmpDir).normalize();
    const moving = Math.hypot(S.moveX, S.moveZ) > 0.1;
    const spread = w.spread * (1 + (moving ? 1.6 : 0) + (S.py > 0.05 ? 2.5 : 0) + S.sprintT * 1.5) * (S.scoped ? 0.15 : 1) * (1 - S.ads * 0.5);
    tmpDir.addScaledVector(tmpRight, rand(-spread, spread)).addScaledVector(tmpUp, rand(-spread, spread)).normalize();
    raycaster.set(camera.position, tmpDir);
    raycaster.far = 90;
    const hits = raycaster.intersectObjects(hitMeshes.concat(staticMeshes), false);
    const end = new THREE.Vector3().copy(camera.position).addScaledVector(tmpDir, 60);
    if (hits.length) {
      const h = hits[0];
      end.copy(h.point);
      const bot = h.object.userData.bot;
      const normal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : UP.clone();
      if (bot) {
        const part = h.object.userData.part;
        const mult = part === 'head' ? 2.5 : part === 'legs' ? 0.8 : 1;
        emit(h.point.x, h.point.y, h.point.z, part === 'head' ? '#ffd24a' : '#ff7a5c', part === 'head' ? 9 : 6, 4, normal.x, normal.y, normal.z);
        emit(h.point.x, h.point.y, h.point.z, '#ffffff', 3, 5, normal.x, normal.y, normal.z);
        damageBot(bot, w.dmg * mult, part === 'head', h.point);
      } else {
        emit(h.point.x, h.point.y, h.point.z, '#ffe08a', 8, 4.5, normal.x, normal.y, normal.z);
        glows.pop(h.point.x + normal.x * 0.05, h.point.y + normal.y * 0.05, h.point.z + normal.z * 0.05, '#ffcf80', 0.5, 0.12, 2);
        if (!h.object.userData.noDecal) decals.add(h.point, normal, S.weapon === 'sniper' ? 1.5 : 1);
        audio.impact(panOf(h.point.x, h.point.z)[0]);
      }
    }
    // Tracer from the muzzle
    const from = new THREE.Vector3();
    flashSprite.getWorldPosition(from);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, end]), mats.tracer);
    scene.add(line);
    tracers.push({ line, life: 0.06 });

    S.kick += w.recoil * (S.scoped ? 0.3 : 1) * (1 - S.ads * 0.35);
    S.tut.shots += 1;
    S.pitch = clamp(S.pitch + w.recoil * 0.5, -1.45, 1.45);
    S.yaw += rand(-0.002, 0.002) * (w.recoil * 60);
    VM.kickZ = Math.min(0.14, VM.kickZ + (S.weapon === 'sniper' ? 0.1 : S.weapon === 'pistol' ? 0.055 : S.weapon === 'rifle' ? 0.04 : 0.03));
    VM.kickRot = Math.min(0.5, VM.kickRot + w.recoil * 9);
    VM.slide = 1;
    if (S.weapon === 'sniper') VM.sniperCycle = 1;
    VM.roll = (Math.random() - 0.5) * w.recoil * 6;
    flashSprite.visible = true;
    flashSprite.scale.setScalar(rand(0.22, 0.38) * (S.weapon === 'sniper' ? 1.6 : 1));
    flashSprite.material.rotation = Math.random() * 6.28;
    flashSprite.userData.t = 0.05;
    muzzleLight.intensity = (S.weapon === 'sniper' ? 55 : 32);
    VM.lightT = 0.06;
    if (S.weapon === 'sniper') setTimeout(spawnCasing, 380); else spawnCasing();
    audio.shot(S.weapon, 0);
  }

  function tryFire() {
    const w = WEAPONS[S.weapon];
    const st = S.ammo[S.weapon];
    if (S.reloadT > 0 || S.fireCd > 0) return;
    if (st.mag <= 0) { if (st.reserve > 0) startReload(); else if (S.firing) { audio.empty(); S.fireCd = 0.3; } return; }
    st.mag -= 1;
    S.fireCd = w.rate;
    doShot();
    if (st.mag === 0) startReload();
  }

  // ---------- rounds ----------
  function makePlan(n) {
    const w = WAVES[n];
    const dur = 18 + n * 2;
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const main = [order[0], order[1]];
    const list = [];
    const add = (kind, count) => {
      for (let i = 0; i < count; i++) {
        const side = kind === 'legit' ? Math.floor(Math.random() * 4) : Math.random() < 0.72 ? main[Math.floor(Math.random() * 2)] : Math.floor(Math.random() * 4);
        list.push({ kind, side, off: rand(-3.2, 3.2), t: kind === 'boss' ? dur * 0.6 : rand(1, dur) });
      }
    };
    add('spam', w.spam);
    add('ddos', w.ddos);
    add('boss', w.boss);
    add('legit', w.legit);
    list.sort((a, b) => a.t - b.t);
    return list;
  }

  function refillAmmo() {
    SLOT.forEach(key => {
      const w = WEAPONS[key];
      S.ammo[key] = { mag: w.mag, reserve: w.reserve };
    });
  }

  function intelText() {
    const counts = [0, 0, 0, 0];
    S.plan.forEach(p => { if (p.kind !== 'legit') counts[p.side] += 1; });
    const hostile = ['spam', 'ddos', 'boss'].map(k => {
      const n = S.plan.filter(p => p.kind === k).length;
      return n ? `${n} ${KINDS[k].name}` : '';
    }).filter(Boolean).join(', ');
    const legit = S.plan.filter(p => p.kind === 'legit').length;
    const hot = counts.map((n, i) => [n, i]).sort((a, b) => b[0] - a[0]).filter(x => x[0] > 0).slice(0, 2).map(x => SIDES[x[1]]);
    return `Intel: <b>${hostile}</b> plus <i>${legit} legit users</i>. Heaviest attack from the <b>${hot.join(' and ')}</b> gates (N ${counts[0]} · E ${counts[1]} · S ${counts[2]} · W ${counts[3]}). Keep the core alive, and don't shoot green visors.`;
  }

  // ---------- map, radar and planning helpers ----------
  function drawMap(ctx, size, opts = {}) {
    const k = size / (MAP * 2 + 2);
    const px = (v) => size / 2 + v * k;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    if (opts.round) { ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); ctx.clip(); }
    ctx.fillStyle = 'rgba(8,14,24,0.9)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(0,212,200,0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px(-MAP), px(-MAP), MAP * 2 * k, MAP * 2 * k);
    ctx.fillStyle = 'rgba(130,150,180,0.45)';
    colliders.forEach(c => { if (c.h > 4.5) return; ctx.fillRect(px(c.x0), px(c.z0), (c.x1 - c.x0) * k, (c.z1 - c.z0) * k); });
    hazards.drawOnMap(ctx, k, px);
    ctx.fillStyle = '#00d4c8';
    ctx.beginPath(); ctx.arc(px(0), px(0), 2.3 * k, 0, Math.PI * 2); ctx.fill();
    GATES.forEach(([gx, gz], i) => {
      const horizontal = i % 2 === 0;
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(px(gx) - (horizontal ? 3 : 1) * k, px(gz) - (horizontal ? 1 : 3) * k, (horizontal ? 6 : 2) * k, (horizontal ? 2 : 6) * k);
      if (opts.counts) {
        ctx.fillStyle = opts.counts[i] ? '#ffffff' : '#6b7788';
        ctx.font = `bold ${Math.round(size * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(opts.counts[i]), px(gx * 0.68), px(gz * 0.68));
      }
    });
    if (opts.dynamic) {
      sentries.forEach(s => { ctx.fillStyle = '#7ce8ff'; ctx.fillRect(px(s.x) - 1.2 * k, px(s.z) - 1.2 * k, 2.4 * k, 2.4 * k); });
      bots.forEach(b => {
        if (b.dead) return;
        ctx.fillStyle = b.legit ? '#59ff9c' : '#ff4d4d';
        ctx.beginPath(); ctx.arc(px(b.x), px(b.z), (b.legit ? 1.6 : 2) * k, 0, Math.PI * 2); ctx.fill();
      });
    }
    ctx.translate(px(S.px), px(S.pz));
    ctx.rotate(-S.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(0, -3.4 * k); ctx.lineTo(2.4 * k, 2.4 * k); ctx.lineTo(-2.4 * k, 2.4 * k); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function gateCounts() {
    const counts = [0, 0, 0, 0];
    S.plan.forEach(p => { if (p.kind !== 'legit') counts[p.side] += 1; });
    return counts;
  }

  // What a sensible player would buy with the current money
  function planLoadout() {
    let m = S.money;
    const list = [];
    const take = (key) => { if (m >= PRICES[key]) { m -= PRICES[key]; list.push(key); return true; } return false; };
    if (!S.owned.has('rifle')) { if (!take('rifle') && !S.owned.has('smg')) take('smg'); }
    if (S.armor < 50) take('armor');
    if (S.health < 60) take('medkit');
    if (S.round >= 1 && sentries.length < 2 && m >= PRICES.sentry + 100) take('sentry');
    return list;
  }

  function tipText() {
    if (S.tutorial) return 'Training round: enemies are slow and cannot hurt you. Buy something, then press Start round.';
    if (S.round === 0 && S.owned.size === 1) return 'New here? Press Auto-buy for a sensible loadout, then Start round.';
    if (S.plan.some(p => p.kind === 'boss')) return 'A BOSS is coming this round. Get the rifle or sniper plus armor, and keep moving to dodge its triple shots.';
    if (S.core < 50) return 'The core is damaged. A sentry guards it while you fight, so consider buying one.';
    if (S.health < 60) return 'Your health is low. A Medkit restores 50.';
    if (S.armor <= 0) return 'Armor absorbs 60% of the damage you take. It is cheap and strong.';
    if (S.money >= 900) return 'You have plenty of cash. Add a sentry and consider the sniper for DDoS bots.';
    return S.round >= 1 && S.round % 2 === 1 ? 'Use the map: press F at a gate to seal it for a few seconds, or at a wall terminal for an EMP. Stay off the flashing yellow trap plates.' : 'Read the map: stand between the busiest gate and the core, and use racks and crates as cover.';
  }

  function renderBuy() {
    $('buy-round').textContent = S.tutorial ? 'Training · Buy phase' : `Round ${S.round + 1} / ${ROUNDS} · Buy phase`;
    $('buy-money').textContent = String(S.money);
    $('buy-intel').innerHTML = intelText();
    $('buy-tip').textContent = tipText();
    const rec = planLoadout();
    buyPanel.querySelectorAll('.buy-item').forEach(btn => {
      const key = btn.dataset.buy;
      const cost = PRICES[key];
      const isWeapon = !!WEAPONS[key];
      const owned = isWeapon && S.owned.has(key);
      btn.classList.toggle('owned', owned);
      btn.classList.toggle('broke', !owned && S.money < cost);
      btn.classList.toggle('recommended', rec.includes(key));
      btn.querySelector('.buy-cost').textContent = owned ? (S.weapon === key ? 'Equipped' : 'Owned · equip') : `$${cost}`;
    });
    drawMap(buyMapCtx, 200, { counts: gateCounts() });
  }

  function autoBuy() {
    if (S.phase !== 'buy') return;
    const list = planLoadout();
    if (list.length === 0) { showToast('Nothing more to buy right now. Press Start round!', false, 1600); return; }
    list.forEach(key => buyItem(key));
    showToast(`Auto-buy: ${list.map(k => (WEAPONS[k] ? WEAPONS[k].name : k)).join(', ')}`, false, 2200);
  }

  // ---------- training ----------
  const TUT = [
    { title: 'Buy phase', text: 'Before every round you spend money. Press Auto-buy (or pick the Rifle and Armor yourself), then press Start round.' },
    { title: 'Move around', text: 'Walk with W A S D (or the on-screen joystick) and look around with the mouse (or drag on the right side).', done: () => S.tut.moved >= 4 },
    { title: 'Aim and fire', text: 'Aim at the crosshair target and click to shoot (or hold FIRE). Fire a few shots.', done: () => S.tut.shots >= 3 },
    { title: 'Shoot the red bot', text: 'Red visor means enemy. A bot enters through the W GATE and walks toward you. Turn with the mouse to find it (the radar shows red dots), aim at its head and shoot.', done: () => S.tut.kills >= 1 },
    { title: 'Spare the green user', text: 'A green visor with a USER tag is a real visitor. Do NOT shoot. Let them walk to the core to earn money.', done: () => S.tut.served >= 1 || S.tut.legitHit },
    { title: 'Reload', text: 'Press R to reload when your magazine runs low (it also reloads by itself when empty).', done: () => S.tut.reloaded },
    { title: 'Training complete', text: 'You know the basics: plan in the buy phase, shoot red, spare green, reload. The real game has 5 rounds with tougher enemies. Press ? any time for help.', final: true }
  ];

  function setCoach(i) {
    const step = TUT[i];
    $('coach-step').textContent = `Training ${i + 1} / ${TUT.length}`;
    $('coach-title').textContent = step.title;
    $('coach-text').textContent = step.text;
    $('coach-next').hidden = !step.final;
    coach.hidden = false;
    overlay.classList.add('coaching');
  }

  function hideCoach() { coach.hidden = true; overlay.classList.remove('coaching'); }

  function startTutorial() {
    resetGame();
    S.tutorial = true;
    S.tutStep = 0;
    startScreen.hidden = true;
    endScreen.hidden = true;
    beep(520, 0.15, 'triangle', 0.05, 260);
    openBuy();
  }

  function finishTutorial() {
    if (!S.tutorial) return;
    localStorage.setItem(TUT_KEY, '1');
    hideCoach();
    startGame();
    showToast('Real game starts now. Good luck!', false, 2200);
  }

  function tutorialTick() {
    if (!S.tutorial || S.tutStep < 1) return;
    const step = TUT[S.tutStep];
    if (step.done && step.done()) {
      if (S.tutStep === 4 && S.tut.legitHit) showToast('That was a legit user. In the real game it costs you money.', true, 2800);
      S.tutStep += 1;
      setCoach(S.tutStep);
      beep(740, 0.1, 'triangle', 0.04, 200);
    }
  }

  function buyItem(key) {
    if (S.phase !== 'buy') return;
    if (WEAPONS[key]) {
      if (S.owned.has(key)) { equip(key); renderBuy(); return; }
      if (S.money < PRICES[key]) { showToast('Not enough money', true, 1000); return; }
      S.money -= PRICES[key];
      S.owned.add(key);
      equip(key);
      beep(560, 0.1, 'triangle', 0.04, 200);
    } else if (key === 'armor') {
      if (S.money < PRICES.armor) { showToast('Not enough money', true, 1000); return; }
      if (S.armor >= 100) { showToast('Armor already full', true, 1000); return; }
      S.money -= PRICES.armor;
      S.armor = Math.min(100, S.armor + 50);
      beep(500, 0.1, 'triangle', 0.04, 160);
    } else if (key === 'medkit') {
      if (S.money < PRICES.medkit) { showToast('Not enough money', true, 1000); return; }
      if (S.health >= 100) { showToast('Already at full health', true, 1000); return; }
      S.money -= PRICES.medkit;
      S.health = Math.min(100, S.health + 50);
      beep(620, 0.1, 'triangle', 0.04, 160);
    } else if (key === 'sentry') {
      if (S.money < PRICES.sentry) { showToast('Not enough money', true, 1000); return; }
      if (sentries.length >= 2) { showToast('Max 2 sentries', true, 1000); return; }
      S.money -= PRICES.sentry;
      placeSentry();
      beep(480, 0.14, 'triangle', 0.04, 200);
    }
    if (S.tutorial && S.tutStep === 0) $('coach-text').textContent = 'Good buy! Add more if you like, then press Start round.';
    renderBuy();
    hudUpdate();
  }

  // Sentries deploy between the core and the busiest gate
  function placeSentry() {
    const counts = gateCounts();
    const gi = counts.indexOf(Math.max(...counts));
    const [gx, gz] = GATES[gi];
    const len = Math.hypot(gx, gz) || 1;
    const dx = gx / len, dz = gz / len;
    const side = sentries.length % 2 === 0 ? 1 : -1;
    const [x, z] = resolve(dx * 6.5 + -dz * side * 2.2, dz * 6.5 + dx * side * 2.2, 0.6);
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.55, 0.6, 10), mats.sentry);
    base.position.y = 0.3;
    const head = new THREE.Group();
    head.position.y = 0.85;
    const hb = new THREE.Mesh(geoBox, mats.sentryHead);
    hb.scale.set(0.45, 0.35, 0.55);
    const barrel = new THREE.Mesh(geoBox, mats.gunDark);
    barrel.scale.set(0.12, 0.12, 0.8);
    barrel.position.z = 0.6;
    head.add(hb, barrel);
    g.add(base, head);
    g.position.set(x, 0, z);
    scene.add(g);
    sentries.push({ g, head, x, z, cd: 0.4 });
    emit(x, 0.8, z, '#7ce8ff', 14, 4);
    showToast(`Sentry deployed toward the ${SIDES[gi]} gate`, false, 1800);
  }

  function openBuy() {
    S.phase = 'buy';
    S.firing = false;
    S.scoped = false;
    S.plan = S.tutorial ? TUT_PLAN.map(p => ({ ...p })) : makePlan(S.round);
    S.spawnIdx = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    crosshair.hidden = true;
    scopeEl.hidden = true;
    touchUi.hidden = true;
    pauseScreen.hidden = true;
    hud.hidden = false;
    buyPanel.hidden = false;
    audio.setIntensity(0.15);
    promptEl.hidden = true;
    touchAct.hidden = true;
    if (S.tutorial) setCoach(0); else hideCoach();
    renderBuy();
    hudUpdate();
    $('buy-go').focus({ preventScroll: true });
  }

  function lockPointer(retry = 0) {
    if (isTouch) return;
    try {
      const p = canvas.requestPointerLock && canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => { if (retry < 3 && isOpen && S.phase === 'combat' && !S.paused) setTimeout(() => lockPointer(retry + 1), 700); });
    } catch { /* fall back to free look */ }
    setTimeout(() => { if (isOpen && S.phase === 'combat' && !locked && retry >= 3) S.freeLook = true; }, 900);
  }

  function startRound() {
    if (S.phase !== 'buy') return;
    S.phase = 'combat';
    S.waveT = 0;
    S.spawnIdx = 0;
    S.roundT = 0;
    S.paused = false;
    refillAmmo();
    S.reloadT = 0;
    S.health = Math.max(S.health, 40);
    S.px = 0; S.pz = 7; S.py = 0; S.vy = 0; S.yaw = 0; S.pitch = 0;
    buyPanel.hidden = true;
    crosshair.hidden = false;
    touchUi.hidden = !isTouch;
    S.freeLook = false;
    lockPointer();
    audio.roundStart();
    audio.setIntensity(S.round >= ROUNDS - 1 ? 1 : 0.5 + S.round * 0.1);
    hazards.startRound();
    S.fovKick = 0;
    if (S.tutorial) {
      S.tutStep = 1;
      setCoach(1);
      showToast('Training round: enemies are slow and harmless', false, 2200);
    } else {
      showToast(S.round === 0 ? 'WASD move · Mouse aim · Click fire · R reload · ? for help' : `Round ${S.round + 1}: defend the core!`, false, S.round === 0 ? 6500 : 1800);
    }
    hudUpdate();
  }

  function resetGame() {
    bots.forEach(b => scene.remove(b.g));
    bolts.forEach(b => scene.remove(b.m));
    sentries.forEach(s => scene.remove(s.g));
    bots.length = 0; bolts.length = 0; sentries.length = 0; hitMeshes.length = 0;
    decals.clear(); debris.clear(); glows.clear(); floaters.clear(); dmgDir.clear();
    Object.assign(S, { round: 0, money: START_MONEY, score: 0, kills: 0, legitServed: 0, legitShot: 0, core: 100, health: 100, armor: 0, weapon: 'pistol', reloadT: 0, fireCd: 0, firing: false, scoped: false, paused: false, kick: 0, shake: 0, tutorial: false, tutStep: 0, adsOn: false, ads: 0, sprintT: 0, drawT: 0, streak: 0, streakT: 0, roll: 0, fovKick: 0, reloadStage: 0 });
    Object.assign(VM, { kickZ: 0, kickRot: 0, slide: 0, roll: 0, lightT: 0, lagX: 0, lagY: 0, wallT: 0, sniperCycle: 0 });
    S.tut = { moved: 0, shots: 0, kills: 0, served: 0, reloaded: false, legitHit: false };
    S.owned = new Set(['pistol']);
    hazards.reset();
    promptEl.hidden = true;
    touchAct.hidden = true;
    fwEl.innerHTML = '';
    refillAmmo();
    buildViewmodel('pistol');
  }

  function startGame() {
    resetGame();
    startScreen.hidden = true;
    endScreen.hidden = true;
    beep(520, 0.15, 'triangle', 0.05, 260);
    openBuy();
  }

  function endGame(won, reason) {
    if (S.phase === 'ended') return;
    S.phase = 'ended';
    S.firing = false;
    S.scoped = false;
    if (document.pointerLockElement) document.exitPointerLock();
    hud.hidden = true;
    crosshair.hidden = true;
    scopeEl.hidden = true;
    touchUi.hidden = true;
    buyPanel.hidden = true;
    if (won) S.score += Math.round(S.core) * 5;
    const prevBest = best();
    const finalScore = Math.max(0, Math.round(S.score));
    if (finalScore > prevBest) localStorage.setItem(BEST_KEY, String(finalScore));
    const core = Math.max(0, Math.round(S.core));
    $('game-end-kicker').textContent = won ? 'All rounds cleared' : reason === 'eliminated' ? 'You were eliminated' : 'Core offline';
    $('game-end-title').textContent = won ? (core >= 60 ? 'Core secured' : 'Barely online') : reason === 'eliminated' ? 'Eliminated' : 'System down';
    $('game-end-score').textContent = String(finalScore);
    $('game-end-blocked').textContent = String(S.kills);
    $('game-end-uptime').textContent = `${core}%`;
    $('game-end-best').textContent = String(Math.max(prevBest, finalScore));
    const list = $('game-end-delivered');
    list.innerHTML = '';
    [`Rounds cleared ${won ? ROUNDS : S.round} / ${ROUNDS}`, `Legit users served ${S.legitServed}`, `Legit users hit ${S.legitShot}`].forEach(text => {
      const chip = document.createElement('span');
      chip.className = 'game-chip';
      chip.textContent = text;
      list.appendChild(chip);
    });
    $('game-end-msg').textContent = won
      ? (core >= 60
        ? 'That is how I build: plan the loadout, hold the line, keep real users flowing. Want this mindset on your product?'
        : 'You held on, but it was close. Real projects get monitoring and scaling plans so you never fight fires. Let us design yours.')
      : 'Production went down. That costs real money. I build with redundancy, monitoring and safe rollbacks from day one. Let us talk about your project.';
    endScreen.hidden = false;
    $('game-again').focus({ preventScroll: true });
    if (won) audio.win(); else audio.lose();
    audio.setIntensity(0);
    promptEl.hidden = true;
    touchAct.hidden = true;
    S.adsOn = false;
  }

  function showStart() {
    S.phase = 'idle';
    hud.hidden = true;
    buyPanel.hidden = true;
    endScreen.hidden = true;
    pauseScreen.hidden = true;
    crosshair.hidden = true;
    touchUi.hidden = true;
    startScreen.hidden = false;
    const b = best();
    const trained = !!localStorage.getItem(TUT_KEY);
    $('game-best').textContent = !trained ? 'First time? The training explains everything and takes about 90 seconds.' : b ? `Your best score: ${b}` : 'Tip: turn the sound on in the top-right corner.';
    $('game-tutorial-btn').classList.toggle('btn-primary', !trained);
    $('game-tutorial-btn').classList.toggle('btn-ghost', trained);
    $('game-start-btn').classList.toggle('btn-primary', trained);
    $('game-start-btn').classList.toggle('btn-ghost', !trained);
    (trained ? startBtn : $('game-tutorial-btn')).focus({ preventScroll: true });
  }

  function setPaused(p) {
    if (S.phase !== 'combat') return;
    S.paused = p;
    S.firing = false;
    pauseScreen.hidden = !p;
    audio.setIntensity(p ? 0.1 : (S.round >= ROUNDS - 1 ? 1 : 0.5 + S.round * 0.1));
    if (p && document.pointerLockElement) document.exitPointerLock();
  }

  function openHelp() {
    if (S.phase === 'combat' && !S.paused) {
      S.paused = true;
      S.firing = false;
      if (document.pointerLockElement) document.exitPointerLock();
    }
    helpScreen.hidden = false;
    $('game-help-close').focus({ preventScroll: true });
  }

  function closeHelp() {
    helpScreen.hidden = true;
    if (S.phase === 'combat' && S.paused) pauseScreen.hidden = false;
    if (S.phase === 'idle') startBtn.focus({ preventScroll: true });
  }

  function hudUpdate() {
    setText('game-money', S.money);
    setText('game-score', Math.max(0, Math.round(S.score)));
    setText('game-round', S.tutorial ? 'Training' : `Round ${Math.min(S.round + 1, ROUNDS)} / ${ROUNDS}`);
    const hostiles = bots.filter(b => !b.dead && !b.legit).length + S.plan.slice(S.spawnIdx).filter(p => p.kind !== 'legit').length + hazards.heldHostile();
    setText('game-enemies', S.phase === 'combat' ? `Hostiles: ${hostiles}` : 'Buy phase');
    const core = Math.max(0, Math.round(S.core));
    setText('game-core-pct', `${core}%`);
    const bar = $('game-core-bar');
    bar.style.width = `${core}%`;
    bar.classList.toggle('low', core < 35);
    setText('game-health', Math.max(0, Math.round(S.health)));
    $('game-health').classList.toggle('low', S.health < 35);
    setText('game-armor', Math.round(S.armor));
    const w = WEAPONS[S.weapon];
    const st = S.ammo[S.weapon];
    setText('game-weapon', S.reloadT > 0 ? `${w.name} · reloading` : w.name);
    setText('game-ammo', st.mag);
    $('game-ammo').classList.toggle('low', st.mag <= Math.ceil(w.mag * 0.25));
    setText('game-reserve', `/ ${st.reserve}`);
  }

  // ---------- camera and weapon animation ----------
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const vD = new THREE.Vector3();
  const smooth = (u) => u * u * (3 - 2 * u);

  function kf(p, keys) {
    if (p <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) {
        const [t0, v0] = keys[i - 1];
        const [t1, v1] = keys[i];
        return v0 + (v1 - v0) * smooth((p - t0) / (t1 - t0));
      }
    }
    return keys[keys.length - 1][1];
  }

  function vecKf(p, keys, out) {
    if (p <= keys[0][0]) return out.copy(keys[0][1]);
    for (let i = 1; i < keys.length; i++) {
      if (p <= keys[i][0]) {
        const [t0, v0] = keys[i - 1];
        const [t1, v1] = keys[i];
        return out.lerpVectors(v0, v1, smooth((p - t0) / (t1 - t0)));
      }
    }
    return out.copy(keys[keys.length - 1][1]);
  }

  const RELOAD_PITCH = { pistol: 1.2, smg: 1.05, rifle: 0.9, sniper: 0.7 };

  function animateView(dt, t, combat) {
    const w = WEAPONS[S.weapon];
    const ud = vm.userData;
    const k = Math.min(1, dt * 16);

    S.shake = Math.max(0, S.shake - dt * 1.4);
    S.kick = Math.max(0, S.kick - dt * 5);
    S.fovKick = Math.max(0, S.fovKick - dt * 22);
    S.roll *= 1 - Math.min(1, dt * 8);
    S.drawT = Math.max(0, S.drawT - dt / 0.35);
    S.landT = Math.max(0, S.landT - dt * 4);
    VM.kickZ *= 1 - Math.min(1, dt * 13);
    VM.kickRot *= 1 - Math.min(1, dt * 9);
    VM.roll *= 1 - Math.min(1, dt * 9);
    VM.slide = Math.max(0, VM.slide - dt * 16);

    const moving = combat && Math.hypot(S.moveX, S.moveZ) > 0.1 && S.py < 0.05;
    const sprinting = moving && S.keys.has('ShiftLeft') && !S.scoped && !S.firing && S.reloadT <= 0;
    S.sprintT += ((sprinting ? 1 : 0) - S.sprintT) * Math.min(1, dt * (sprinting ? 7 : 12));
    const adsTarget = S.adsOn && !sprinting && S.reloadT <= 0 && !S.scoped && S.drawT < 0.5 ? 1 : 0;
    S.ads += (adsTarget - S.ads) * Math.min(1, dt * 12);
    crosshair.classList.toggle('ads', S.ads > 0.5);

    S.bob += dt * (moving ? (sprinting ? 13 : 9.5) : 1.5);
    const shakeAmt = S.shake * 0.04;
    camera.rotation.y = S.yaw + (Math.random() - 0.5) * shakeAmt;
    camera.rotation.x = clamp(S.pitch + S.kick, -1.5, 1.5) + (Math.random() - 0.5) * shakeAmt * 0.5;
    VM.lean = (VM.lean || 0) + ((combat ? -S.moveX * 0.018 : 0) - (VM.lean || 0)) * Math.min(1, dt * 8);
    camera.rotation.z = S.roll + VM.lean;
    camera.position.set(S.px, EYE + S.py + (moving ? Math.sin(S.bob) * (sprinting ? 0.055 : 0.035) : 0) - S.landT * 0.12, S.pz);

    // Pull the weapon back when a wall is right in front of the muzzle
    let wallTarget = 0;
    if (combat && Math.abs(S.pitch) < 0.7) {
      tmpV.set(camera.position.x, camera.position.y, camera.position.z);
      tmpDir.set(-Math.sin(S.yaw), 0, -Math.cos(S.yaw));
      raycaster.set(tmpV, tmpDir);
      raycaster.far = 1.1;
      const wh = raycaster.intersectObjects(staticMeshes, false);
      if (wh.length) wallTarget = clamp((0.95 - wh[0].distance) / 0.5, 0, 1);
    }
    VM.wallT += (wallTarget - VM.wallT) * Math.min(1, dt * 12);

    // Mouse-look sway
    VM.lagX += (clamp(-S.lookDX * 1.6, -0.09, 0.09) - VM.lagX) * Math.min(1, dt * 10);
    VM.lagY += (clamp(-S.lookDY * 1.6, -0.07, 0.07) - VM.lagY) * Math.min(1, dt * 10);
    S.lookDX = 0; S.lookDY = 0;

    // Target pose
    const base = ud.base;
    const bobK = 1 - S.ads * 0.85;
    let tx = base.x + (0 - base.x) * S.ads;
    let ty = base.y + (ud.adsY - base.y) * S.ads;
    let tz = base.z + (ud.adsZ - base.z) * S.ads;
    let rx = 0, ry = 0, rz = 0;
    if (moving) {
      tx += Math.cos(S.bob * 0.5) * 0.012 * bobK * (sprinting ? 2.4 : 1);
      ty += Math.abs(Math.sin(S.bob)) * 0.012 * bobK * (sprinting ? 2.2 : 1);
    } else {
      ty += Math.sin(t * 1.4) * 0.003 * bobK;
      tx += Math.cos(t * 0.9) * 0.0015 * bobK;
    }
    const sp = smooth(S.sprintT);
    tx += -0.11 * sp; ty += -0.075 * sp; tz += 0.02 * sp;
    ry += 0.7 * sp; rz += 0.24 * sp; rx += 0.22 * sp;
    if (sprinting) { rz += Math.sin(S.bob * 0.5) * 0.04; ry += Math.cos(S.bob * 0.5) * 0.04; }
    const dr = S.drawT * S.drawT;
    ty += -0.32 * dr; tz += 0.08 * dr; rx += -0.9 * dr; rz += 0.3 * dr;
    ty += -0.05 * S.landT;
    const wl = smooth(VM.wallT);
    tz += 0.2 * wl; rx += 0.75 * wl; ty += -0.04 * wl; ry += 0.3 * wl;
    tz += VM.kickZ; rx += VM.kickRot; rz += VM.roll;
    ry += VM.lagX; rx += VM.lagY;

    // Reload choreography
    let slidePull = 0;
    let lift = 0;
    let p = -1;
    if (S.reloadT > 0) {
      p = clamp(1 - S.reloadT / w.reload, 0, 1);
      const tilt = kf(p, [[0, 0], [0.12, 1], [0.88, 1], [1, 0]]);
      rz += 0.4 * tilt; rx += 0.2 * tilt; tx += -0.035 * tilt; ty += 0.025 * tilt; ry += -0.12 * tilt;
      slidePull = kf(p, [[0.84, 0], [0.9, 1], [0.97, 0]]);
      lift = ud.sniper ? kf(p, [[0.78, 0], [0.84, 1], [0.95, 1], [1, 0]]) : 0;
      const pitchK = RELOAD_PITCH[S.weapon] || 1;
      if (S.reloadStage === 0 && p >= 0.16) { S.reloadStage = 1; audio.reload('out', pitchK); }
      if (S.reloadStage === 1 && p >= 0.27) {
        S.reloadStage = 2;
        vm.updateWorldMatrix(true, true);
        camera.getWorldDirection(vC);
        vA.crossVectors(vC, UP).normalize();
        const pos = vm.localToWorld(ud.mag.position.clone());
        debris.spawn('mag', pos, vD.set(0, -0.5, 0).addScaledVector(vA, 0.7), { x: 0.045, y: 0.16, z: 0.065 }, 8, () => audio.casing());
      }
      if (S.reloadStage === 2 && p >= 0.72) { S.reloadStage = 3; audio.reload('in', pitchK); }
      if (S.reloadStage === 3 && p >= 0.86) { S.reloadStage = 4; audio.reload('slide', pitchK); }
    }

    // Magazine and hands
    const magBase = ud.magBase;
    if (p >= 0) {
      const magW = vA.copy(magBase).add(vB.set(0, -0.09, 0)).clone();
      const outP = magW.clone().add(vB.set(-0.03, -0.34, 0.1));
      const boltP = ud.slideBase.clone().add(vB.set(ud.pistol ? 0 : -0.03, ud.pistol ? 0 : -0.05, 0.05));
      const boltP2 = boltP.clone().add(vB.set(0, 0, 0.07));
      vecKf(p, [[0, ud.lBase], [0.12, magW], [0.22, magW], [0.36, outP], [0.58, outP], [0.72, magW], [0.8, magW], [0.87, boltP], [0.93, boltP2], [1, ud.lBase]], ud.handL.position);
      ud.mag.visible = p < 0.29 || p > 0.6;
      const my = p < 0.29 ? -(Math.max(0, p - 0.2) / 0.09) * 0.2 : p > 0.6 ? -0.36 * (1 - smooth(clamp((p - 0.6) / 0.12, 0, 1))) : 0;
      ud.mag.position.set(magBase.x, magBase.y + my, magBase.z);
    } else {
      ud.handL.position.lerp(ud.lBase, Math.min(1, dt * 14));
      ud.mag.visible = true;
      ud.mag.position.copy(magBase);
    }

    // Slide / bolt
    const slide = ud.slide;
    if (ud.sniper) {
      let cyc = 0, handle = 0;
      if (VM.sniperCycle > 0) {
        VM.sniperCycle = Math.max(0, VM.sniperCycle - dt / Math.max(0.3, w.rate));
        const q = 1 - VM.sniperCycle;
        handle = kf(q, [[0.1, 0], [0.3, 1], [0.82, 1], [0.95, 0]]);
        cyc = kf(q, [[0.3, 0], [0.55, 1], [0.78, 0]]);
      }
      handle = Math.max(handle, lift);
      cyc = Math.max(cyc, slidePull);
      slide.position.set(ud.slideBase.x, ud.slideBase.y, ud.slideBase.z + cyc * 0.09);
      slide.rotation.z = handle * 1.15;
    } else if (ud.pistol) {
      slide.position.z = ud.slideBase.z + (VM.slide * 0.045 + slidePull * 0.06);
    } else {
      slide.position.z = ud.slideBase.z + (VM.slide * 0.03 + slidePull * 0.06);
    }

    vm.position.x += (tx - vm.position.x) * k;
    vm.position.y += (ty - vm.position.y) * k;
    vm.position.z += (tz - vm.position.z) * k;
    vm.rotation.x += (rx - vm.rotation.x) * k;
    vm.rotation.y += (ry - vm.rotation.y) * k;
    vm.rotation.z += (rz - vm.rotation.z) * k;
    vm.visible = !S.scoped;

    const baseFov = camera.userData.baseFov;
    const targetFov = S.scoped ? 22 : baseFov * (1 - S.ads * 0.17) + S.sprintT * 5 + S.fovKick;
    if (Math.abs(camera.fov - targetFov) > 0.05) { camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix(); }

    // Crosshair opens up while moving or firing
    const gap = 5 + (w.spread * 900) * (1 + (moving ? 1.4 : 0) + (S.py > 0.05 ? 2 : 0)) + S.kick * 220 + S.sprintT * 10;
    if (Math.abs(gap - (VM.gap || 0)) > 0.4) { VM.gap = gap; crosshair.style.setProperty('--gap', `${gap.toFixed(1)}px`); }
  }

  // ---------- main update ----------
  function update(dt, t) {
    crystal.rotation.y += dt * 0.8;
    coreRings[0].rotation.z += dt * 1.1;
    coreRings[1].rotation.z -= dt * 0.8;
    updateParticles(dt);
    radarTick += 1;
    if (radarTick % 3 === 0 && !hud.hidden && S.phase === 'combat') drawMap(radarCtx, 140, { dynamic: true, round: true });

    tracers.forEach(tr => { tr.life -= dt; });
    for (let i = tracers.length - 1; i >= 0; i--) {
      if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers[i].line.geometry.dispose(); tracers.splice(i, 1); }
    }

    const combat = S.phase === 'combat' && !S.paused;
    glows.update(dt);
    debris.update(dt);
    if (!reduceMotion) {
      dust.rotation.y += dt * 0.012;
      dust.position.y = Math.sin(t * 0.25) * 0.25;
      panelT += dt;
      if (panelT > 0.25) { panelT = 0; drawPanels(t); }
    }
    hazards.update(dt, S.roundT, combat);
    if (bloom) bloom.uniforms.aberration.value *= 1 - Math.min(1, dt * 7);
    if (combat) {
      S.streakT = Math.max(0, S.streakT - dt);
      if (S.health < 35) { S.hbT -= dt; if (S.hbT <= 0) { audio.heartbeat(); S.hbT = 0.7 + S.health / 60; } }
      if (S.core < 30) { S.alarmT -= dt; if (S.alarmT <= 0) { audio.alarm(); S.alarmT = 2.6; } }
    }
    overlay.classList.toggle('lowhp', combat && S.health < 35);

    animateView(dt, t, combat);
    dmgDir.update(dt, S.px, S.pz, S.yaw);
    floaters.update(dt, camera, window.innerWidth, window.innerHeight);
    if (flashSprite.userData.t > 0) { flashSprite.userData.t -= dt; if (flashSprite.userData.t <= 0) flashSprite.visible = false; }
    if (VM.lightT > 0) {
      VM.lightT -= dt;
      flashSprite.getWorldPosition(muzzleLight.position);
      muzzleLight.intensity *= 1 - Math.min(1, dt * 24);
      if (VM.lightT <= 0) muzzleLight.intensity = 0;
    }
    scopeEl.hidden = !S.scoped;

    if (S.phase !== 'combat' && S.phase !== 'buy') return;

    // Sentries and enemy projectiles keep running in buy phase visuals only when combat is live
    if (!combat) { return; }

    S.waveT += dt;
    S.roundT += dt;

    // Player movement
    let ix = 0, iz = 0;
    const k = S.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    ix += S.stickX || 0;
    iz += S.stickZ || 0;
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    S.moveX = ix; S.moveZ = iz;
    S.tut.moved += Math.hypot(ix, iz) * (k.has('ShiftLeft') ? 7.2 : 5.2) * dt;
    const speed = (k.has('ShiftLeft') ? 7.2 : 5.2) * (S.scoped ? 0.5 : 1) * (S.reloadT > 0 ? 0.92 : 1) * (1 - S.ads * 0.3);
    const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
    const rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);
    const vx = (rx * ix + fx * -iz) * speed;
    const vz = (rz * ix + fz * -iz) * speed;
    const px0 = S.px, pz0 = S.pz;
    const [nx, nz] = resolve(S.px + vx * dt, S.pz + vz * dt, 0.4);
    S.px = nx; S.pz = nz;
    S.vy -= 20 * dt;
    S.py += S.vy * dt;
    if (S.py <= 0) { S.py = 0; S.vy = 0; }
    const airNow = S.py > 0.01;
    if (S.wasAir && !airNow) { S.landT = 1; audio.land(); }
    S.wasAir = airNow;
    if (!airNow) {
      S.stepPhase += Math.hypot(S.px - px0, S.pz - pz0);
      const stride = k.has('ShiftLeft') ? 2.5 : 1.9;
      if (S.stepPhase >= stride) { S.stepPhase -= stride; audio.footstep(k.has('ShiftLeft')); }
    }

    // Weapons
    S.fireCd -= dt;
    if (S.tutorial) { const ts = S.ammo[S.weapon]; if (ts.reserve < 60) ts.reserve = 60; }
    if (S.reloadT > 0) {
      S.reloadT -= dt;
      if (S.reloadT <= 0) {
        const w = WEAPONS[S.weapon];
        const st = S.ammo[S.weapon];
        const take = Math.min(w.mag - st.mag, st.reserve);
        st.mag += take;
        st.reserve -= take;
        S.reloadT = 0;
      }
    }
    if (S.firing && S.sprintT < 0.6) {
      const w = WEAPONS[S.weapon];
      if (w.auto || S.semiReady) {
        tryFire();
        if (!w.auto) S.semiReady = false;
      }
    }

    // Spawning: a sealed gate holds incoming bots until the firewall drops
    while (S.spawnIdx < S.plan.length && S.plan[S.spawnIdx].t <= S.waveT) {
      const item = S.plan[S.spawnIdx++];
      if (hazards.isSealed(item.side)) S.held[item.side].push(item); else spawnBot(item);
    }

    // Bots
    for (let i = bots.length - 1; i >= 0; i--) updateBot(bots[i], dt, t);

    // Enemy bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.m.position.x += b.vx * dt;
      b.m.position.y += b.vy * dt;
      b.m.position.z += b.vz * dt;
      b.life -= dt;
      let gone = b.life <= 0 || b.m.position.y < 0 || b.m.position.y > WALL_H;
      if (!gone) {
        const p = b.m.position;
        if (Math.hypot(p.x - S.px, p.z - S.pz) < 0.55 && p.y > S.py && p.y < S.py + 1.9) {
          hurtPlayer(b.dmg, b.sx, b.sz);
          gone = true;
        } else {
          for (const c of colliders) {
            if (p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && p.y < c.h) { emit(p.x, p.y, p.z, '#ff8a8a', 5, 3); glows.pop(p.x, p.y, p.z, '#ff6a6a', 0.7, 0.12, 2); gone = true; break; }
          }
        }
      }
      if (gone) { scene.remove(b.m); bolts.splice(i, 1); }
    }

    // Sentries
    sentries.forEach(s => {
      s.cd -= dt;
      let target = null, bestD = 16;
      for (const b of bots) {
        if (b.dead || b.legit) continue;
        const d = Math.hypot(b.x - s.x, b.z - s.z);
        if (d < bestD) { bestD = d; target = b; }
      }
      if (target) {
        s.head.rotation.y = Math.atan2(target.x - s.x, target.z - s.z);
        if (s.cd <= 0 && hasLOS(s.x, s.z, target.x, target.z)) {
          s.cd = 0.4;
          const from = new THREE.Vector3(s.x, 0.85, s.z);
          const to = new THREE.Vector3(target.x, 1.2, target.z);
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), mats.tracer);
          scene.add(line);
          tracers.push({ line, life: 0.06 });
          glows.pop(s.x, 0.85, s.z, '#7ce8ff', 0.9, 0.1, 1.6);
          damageBot(target, 12, false);
          const [pan, d] = panOf(s.x, s.z);
          audio.sentryShot(pan, d);
        }
      }
    });

    hudUpdate();
    tutorialTick();

    // Win / lose
    if (S.core <= 0) { S.core = 0; endGame(false, 'core'); return; }
    if (!S.tutorial && S.spawnIdx >= S.plan.length && hazards.heldCount() === 0 && bots.every(b => b.dead)) {
      if (S.round >= ROUNDS - 1) { endGame(true); return; }
      const bonus = 500 + Math.round(S.core * 2);
      S.money += bonus;
      S.core = Math.min(100, S.core + 15);
      S.score += 200;
      S.round += 1;
      S.health = Math.min(100, S.health + 20);
      bolts.forEach(b => scene.remove(b.m));
      bolts.length = 0;
      audio.win();
      openBuy();
      showToast(`Round won! +$${bonus}, core repaired +15%. Buy for round ${S.round + 1}`, false, 3000);
    }
  }

  function loop(now) {
    rafId = 0;
    if (!isOpen || !renderer) return;
    const rawDt = (now - last) / 1000;
    const dt = Math.min(0.05, rawDt);
    last = now;
    update(dt, now / 1000);
    // Quality governor: drop bloom when the device cannot keep up
    if (bloom && bloom.enabled) {
      fpsAcc += rawDt; fpsN += 1;
      if (fpsN >= 60) {
        slowFrames = fpsAcc / fpsN > 0.03 ? slowFrames + 1 : 0;
        fpsAcc = 0; fpsN = 0;
        if (slowFrames >= 2) { bloom.enabled = false; }
      }
    }
    if (renderer) {
      if (bloom && bloom.enabled) bloom.render(scene, camera);
      else renderer.render(scene, camera);
    }
    if (!document.hidden) rafId = requestAnimationFrame(loop);
  }

  // ---------- open / close ----------
  function open() {
    if (isOpen) return;
    lastFocus = document.activeElement;
    try {
      if (typeof THREE === 'undefined') throw new Error('three missing');
      build();
    } catch (err) {
      console.warn('Core Defense: 3D init failed', err);
      renderer = null;
      overlay.hidden = false;
      isOpen = true;
      startBtn.hidden = true;
      $('game-best').textContent = 'This device cannot run 3D graphics, but the rest of the site works fine.';
      return;
    }
    isOpen = true;
    startBtn.hidden = false;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('game-state', { detail: true }));
    Object.keys(cache).forEach(k => delete cache[k]);
    S.plan = [];
    resetGame();
    S.px = 0; S.pz = 7; S.yaw = 0; S.pitch = 0;
    showStart();
    audio.setIntensity(0.05);
    if (audio.enabled) audio.startMusic();
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    overlay.hidden = true;
    overlay.classList.remove('lowhp');
    toast.classList.remove('show');
    killfeed.innerHTML = '';
    hideCoach();
    helpScreen.hidden = true;
    audio.stopMusic();
    floaters.clear();
    dmgDir.clear();
    promptEl.hidden = true;
    touchAct.hidden = true;
    fwEl.innerHTML = '';
    destroyScene();
    S.firing = false;
    S.keys.clear();
    S.stickX = S.stickZ = 0;
    if (!document.getElementById('project-modal').classList.contains('is-active')) document.body.style.overflow = '';
    window.dispatchEvent(new CustomEvent('game-state', { detail: false }));
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  // ---------- events ----------
  document.querySelectorAll('[data-open-game]').forEach(btn => btn.addEventListener('click', open));

  const fab = document.querySelector('.game-fab');
  if (fab && 'IntersectionObserver' in window) {
    const covered = new Set();
    const fabObserver = new IntersectionObserver((entries) => {
      entries.forEach(e => (e.isIntersecting ? covered.add(e.target) : covered.delete(e.target)));
      fab.classList.toggle('is-hidden', covered.size > 0);
    });
    ['contact', 'universe-stage'].forEach(id => { const el = document.getElementById(id); if (el) fabObserver.observe(el); });
    const footer = document.querySelector('.footer');
    if (footer) fabObserver.observe(footer);
  }

  $('game-close').addEventListener('click', close);
  $('game-quit').addEventListener('click', close);
  $('game-back-start').addEventListener('click', close);
  $('game-back-end').addEventListener('click', close);
  $('game-resume').addEventListener('click', () => { setPaused(false); lockPointer(); });
  $('game-tutorial-btn').addEventListener('click', startTutorial);
  $('coach-skip').addEventListener('click', finishTutorial);
  $('coach-next').addEventListener('click', finishTutorial);
  $('buy-auto').addEventListener('click', autoBuy);
  $('game-help-btn').addEventListener('click', openHelp);
  $('game-help-open').addEventListener('click', openHelp);
  $('game-help-close').addEventListener('click', closeHelp);
  startBtn.addEventListener('click', startGame);
  $('game-again').addEventListener('click', startGame);
  $('game-cta').addEventListener('click', close);
  $('buy-go').addEventListener('click', startRound);
  buyPanel.querySelectorAll('.buy-item').forEach(btn => btn.addEventListener('click', () => buyItem(btn.dataset.buy)));
  window.addEventListener('resize', resize);
  overlay.addEventListener('contextmenu', (e) => e.preventDefault());

  const syncAudioButtons = () => {
    const on = audio.enabled;
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off');
    soundBtn.innerHTML = on ? '&#128266;' : '&#128263;';
    musicBtn.setAttribute('aria-pressed', String(audio.musicOn));
    musicBtn.setAttribute('aria-label', audio.musicOn ? 'Music on' : 'Music off');
    musicBtn.classList.toggle('is-off', !audio.musicOn);
  };
  const musicLevel = () => (S.phase === 'combat' ? (S.paused ? 0.1 : S.round >= ROUNDS - 1 ? 1 : 0.5 + S.round * 0.1) : S.phase === 'buy' ? 0.15 : S.phase === 'ended' ? 0 : 0.05);

  soundBtn.addEventListener('click', () => {
    audio.setEnabled(!audio.enabled);
    audio.setIntensity(musicLevel());
    syncAudioButtons();
    if (audio.enabled) audio.ui();
  });
  musicBtn.addEventListener('click', () => {
    audio.setMusic(!audio.musicOn);
    audio.setIntensity(musicLevel());
    syncAudioButtons();
  });
  touchAct.addEventListener('pointerdown', (e) => { e.preventDefault(); hazards.act(); });

  document.addEventListener('visibilitychange', () => {
    if (!isOpen || !renderer) return;
    if (document.hidden) { setPaused(true); audio.suspend(); }
    else { audio.resume(); if (!rafId) { last = performance.now(); rafId = requestAnimationFrame(loop); } }
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (locked) { S.hadLock = true; return; }
    if (S.hadLock && isOpen && S.phase === 'combat' && !S.paused) { lastUnlock = performance.now(); setPaused(true); }
  });
  document.addEventListener('pointerlockerror', () => { S.freeLook = true; });

  const look = (dx, dy, sens) => {
    const m = S.scoped ? 0.35 : 1 - S.ads * 0.3;
    S.yaw -= dx * sens * m;
    S.pitch = clamp(S.pitch - dy * sens * m, -1.45, 1.45);
    S.lookDX += -dx * sens * m;
    S.lookDY += -dy * sens * m;
  };
  function jump() {
    if (S.py <= 0.01 && S.phase === 'combat' && !S.paused) { S.vy = 7; audio.jump(); }
  }
  document.addEventListener('mousemove', (e) => {
    if (!isOpen || S.phase !== 'combat' || S.paused) return;
    if (locked || (S.freeLook && e.target === canvas)) look(e.movementX || 0, e.movementY || 0, 0.0022);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (S.phase !== 'combat' || S.paused) return;
    if (!locked && !isTouch && !S.freeLook) { lockPointer(); return; }
    if (e.button === 0) { S.firing = true; }
    else if (e.button === 2) {
      if (WEAPONS[S.weapon].scope) S.scoped = !S.scoped;
      else if (S.reloadT <= 0) S.adsOn = !S.adsOn;
    }
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) { S.firing = false; S.semiReady = true; }
  });

  // Touch controls
  const stick = $('touch-stick');
  let stickId = null, lookId = null, lookX = 0, lookY = 0;
  S.stickX = 0; S.stickZ = 0;
  stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; stick.setPointerCapture(e.pointerId); });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    const r = stick.getBoundingClientRect();
    const dx = clamp((e.clientX - (r.left + r.width / 2)) / 50, -1, 1);
    const dy = clamp((e.clientY - (r.top + r.height / 2)) / 50, -1, 1);
    S.stickX = dx; S.stickZ = dy;
    const knob = stick.querySelector('i');
    knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
  });
  const stickEnd = (e) => {
    if (e.pointerId !== stickId) return;
    stickId = null; S.stickX = 0; S.stickZ = 0;
    stick.querySelector('i').style.transform = '';
  };
  stick.addEventListener('pointerup', stickEnd);
  stick.addEventListener('pointercancel', stickEnd);
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' || S.phase !== 'combat') return;
    lookId = e.pointerId; lookX = e.clientX; lookY = e.clientY;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' || e.pointerId !== lookId || S.paused) return;
    look(e.clientX - lookX, e.clientY - lookY, 0.0052);
    lookX = e.clientX; lookY = e.clientY;
  });
  const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };
  canvas.addEventListener('pointerup', lookEnd);
  canvas.addEventListener('pointercancel', lookEnd);
  const holdBtn = (el, down, up) => {
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  holdBtn($('touch-fire'), () => { S.firing = true; }, () => { S.firing = false; S.semiReady = true; });
  holdBtn($('touch-reload'), startReload, () => {});
  holdBtn($('touch-jump'), jump, () => {});

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      if (!helpScreen.hidden) { e.preventDefault(); closeHelp(); return; }
      if (performance.now() - lastUnlock < 400) return;
      e.preventDefault();
      if (S.phase === 'combat' && !S.paused) { setPaused(true); return; }
      close();
      return;
    }
    S.keys.add(e.code);
    if (S.phase === 'combat' && !S.paused) {
      if (e.code === 'Space') { e.preventDefault(); jump(); }
      if (e.code === 'KeyF') hazards.act();
      if (e.code === 'KeyR') startReload();
      const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (idx >= 0) equip(SLOT[idx]);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    }
    if (e.key === 'Tab') {
      const focusable = [...overlay.querySelectorAll('button, a[href]')].filter(el => !el.hidden && el.offsetParent !== null && !el.closest('[hidden]'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('keyup', (e) => { S.keys.delete(e.code); });
}
