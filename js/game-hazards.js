// Map hazards and objectives for Core Defense: arc traps, firewall gates, EMP terminals and a hidden supply crate.

const TRAP_CYCLE = 6;
const TRAP_WARN = 2.6;
const TRAP_ON = 3.8;
const FW_TIME = 7;
const FW_COOLDOWN = 22;
const EMP_RANGE = 2.8;
const GATE_RANGE = 4.6;
const LOOT_SPOTS = [[-18.5, -18.5], [18.5, -18.5], [-18.5, 18.5], [18.5, 18.5], [-9, 16.5], [9, -16.5], [-16.5, -9], [16.5, 9]];

const TRAPS = [
  { x: 0, z: -14, w: 5, d: 3.2 },
  { x: 14, z: 0, w: 3.2, d: 5 },
  { x: 0, z: 14, w: 5, d: 3.2 },
  { x: -14, z: 0, w: 3.2, d: 5 }
];
const TERMINALS = [{ x: -19.4, z: 11 }, { x: 19.4, z: -11 }];

const boost = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#1a1d24';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#e8b923';
  for (let i = -128; i < 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 128); g.lineTo(i + 16, 128); g.lineTo(i + 144, 0); g.lineTo(i + 128, 0);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function gridTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,200,255,0.18)';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(160,240,255,0.95)';
  g.lineWidth = 3;
  for (let i = 0; i <= 128; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

export function createHazards(env) {
  const { S, GATES, SIDES } = env;
  let scene = null;
  let traps = [];
  let walls = [];
  let terms = [];
  let shock = null;
  let loot = null;
  let lootSpot = null;
  let hudT = 0;
  let lastPrompt = '';
  let lastFw = '';
  let empWave = { t: 9, x: 0, z: 0 };
  const geos = [];

  function build(sc, geoBox) {
    scene = sc;
    traps = [];
    walls = [];
    terms = [];
    const stripes = stripeTexture();
    const grid = gridTexture();

    TRAPS.forEach((tp, i) => {
      const mat = new THREE.MeshBasicMaterial({ map: stripes, color: 0x555555 });
      stripes.repeat.set(tp.w / 2, tp.d / 2);
      const plate = new THREE.Mesh(geoBox, mat);
      plate.scale.set(tp.w, 0.05, tp.d);
      plate.position.set(tp.x, 0.03, tp.z);
      scene.add(plate);
      const arcGeo = new THREE.BufferGeometry();
      arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 2 * 3), 3));
      geos.push(arcGeo);
      const arcMat = new THREE.LineBasicMaterial({ color: boost(0x9fe8ff, 3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const arcs = new THREE.LineSegments(arcGeo, arcMat);
      arcs.frustumCulled = false;
      arcs.visible = false;
      scene.add(arcs);
      const postMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const post = new THREE.Mesh(geoBox, postMat);
        post.scale.set(0.22, 0.9, 0.22);
        post.position.set(tp.x + sx * (tp.w / 2 + 0.1), 0.45, tp.z + sz * (tp.d / 2 + 0.1));
        scene.add(post);
      });
      traps.push({ ...tp, i, mat, postMat, arcs, arcGeo, offset: i * 1.5, state: 'off', hurtT: 0, sndT: 0, warnT: 0 });
    });

    GATES.forEach(([gx, gz], i) => {
      const horizontal = i % 2 === 0;
      const mat = new THREE.MeshBasicMaterial({ map: grid, color: boost(0x66e0ff, 1.8), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.2), mat);
      geos.push(wall.geometry);
      const inX = horizontal ? 0 : (i === 1 ? -0.5 : 0.5);
      const inZ = horizontal ? (i === 0 ? 0.5 : -0.5) : 0;
      wall.position.set(gx + inX, 1.6, gz + inZ);
      wall.rotation.y = horizontal ? 0 : Math.PI / 2;
      wall.visible = false;
      scene.add(wall);
      walls.push({ wall, mat });
    });

    TERMINALS.forEach((tm, i) => {
      const g = new THREE.Group();
      g.position.set(tm.x, 0, tm.z);
      g.rotation.y = Math.atan2(-tm.x, -tm.z);
      const base = new THREE.Mesh(geoBox, new THREE.MeshStandardMaterial({ color: 0x1b2433, metalness: 0.7, roughness: 0.4 }));
      base.scale.set(1.3, 1.0, 0.8);
      base.position.y = 0.5;
      const screenMat = new THREE.MeshBasicMaterial({ color: boost(0x58e8ff, 2.2) });
      const screen = new THREE.Mesh(geoBox, screenMat);
      screen.scale.set(1.0, 0.55, 0.06);
      screen.position.set(0, 1.25, 0.2);
      screen.rotation.x = -0.35;
      const padMat = new THREE.MeshBasicMaterial({ color: boost(0x58e8ff, 1.2), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const pad = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.6, 32), padMat);
      geos.push(pad.geometry);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(0, 0.04, 0.9);
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: env.labelTexture('EMP', '#7ce8ff'), transparent: true, depthWrite: false, fog: false }));
      label.scale.set(2.2, 0.7, 1);
      label.position.y = 2.3;
      g.add(base, screen, pad, label);
      scene.add(g);
      terms.push({ ...tm, i, g, screenMat, padMat, label, used: false });
    });

    const shockGeo = new THREE.CylinderGeometry(1, 1, 2.4, 48, 1, true);
    geos.push(shockGeo);
    shock = new THREE.Mesh(shockGeo, new THREE.MeshBasicMaterial({ color: boost(0x58e8ff, 2), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    shock.visible = false;
    scene.add(shock);

    loot = new THREE.Group();
    const crate = new THREE.Mesh(geoBox, new THREE.MeshStandardMaterial({ color: 0x23323f, metalness: 0.7, roughness: 0.35, emissive: 0x0b4a40, emissiveIntensity: 0.8 }));
    crate.scale.set(0.75, 0.6, 0.75);
    crate.position.y = 0.5;
    const lid = new THREE.Mesh(geoBox, new THREE.MeshBasicMaterial({ color: boost(0x59ff9c, 2.2) }));
    lid.scale.set(0.8, 0.06, 0.8);
    lid.position.y = 0.83;
    const beamGeo = new THREE.CylinderGeometry(0.22, 0.4, 7, 12, 1, true);
    geos.push(beamGeo);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: boost(0x59ff9c, 1.5), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = 3.5;
    loot.add(crate, lid, beam);
    loot.userData = { crate, lid };
    loot.visible = false;
    scene.add(loot);
    lootSpot = null;
  }

  function reset() {
    S.fw = [0, 1, 2, 3].map(() => ({ t: 0, cd: 0, rel: 0 }));
    S.held = [[], [], [], []];
    terms.forEach(t => { t.used = false; });
    traps.forEach(t => { t.hurtT = 0; });
    if (loot) loot.visible = false;
    lootSpot = null;
    empWave.t = 9;
    if (shock) shock.visible = false;
    walls.forEach(w => { w.wall.visible = false; w.mat.opacity = 0; });
    lastFw = '';
    lastPrompt = '';
  }

  function startRound() {
    terms.forEach(t => { t.used = false; });
    S.fw.forEach(f => { f.t = 0; f.cd = 0; f.rel = 0; });
    traps.forEach(t => { t.offset = Math.random() * TRAP_CYCLE; });
    if (!S.tutorial) {
      const [x, z] = LOOT_SPOTS[Math.floor(Math.random() * LOOT_SPOTS.length)];
      lootSpot = { x, z };
      loot.position.set(x, 0, z);
      loot.visible = true;
    } else {
      loot.visible = false;
      lootSpot = null;
    }
  }

  const inRect = (tp, x, z, pad) => Math.abs(x - tp.x) < tp.w / 2 + pad && Math.abs(z - tp.z) < tp.d / 2 + pad;

  function updateTraps(dt, t, live) {
    traps.forEach(tp => {
      const ph = S.tutorial ? 0 : (t + tp.offset) % TRAP_CYCLE;
      const state = S.tutorial ? 'off' : ph >= TRAP_ON ? 'on' : ph >= TRAP_WARN ? 'warn' : 'off';
      if (state !== tp.state) { tp.state = state; tp.arcs.visible = state === 'on'; }
      const [pan, d] = env.panOf(tp.x, tp.z);
      if (state === 'off') {
        tp.mat.color.setScalar(0.32);
        tp.postMat.color.setHex(0x3a3f4a);
        return;
      }
      if (state === 'warn') {
        const f = Math.sin(t * 22) > 0 ? 1 : 0.35;
        tp.mat.color.setRGB(1.6 * f, 1.0 * f, 0.1);
        tp.postMat.color.setRGB(2.4 * f, 1.4 * f, 0.1);
        tp.warnT -= dt;
        if (live && tp.warnT <= 0) { tp.warnT = 0.32; env.audio.trapWarn(pan, d); }
        return;
      }
      tp.mat.color.setRGB(1.2, 2.4, 2.8);
      tp.postMat.color.setRGB(1.6, 3.2, 3.6);
      if (!live) return;
      tp.arcT = (tp.arcT || 0) - dt;
      if (tp.arcT <= 0) { tp.arcT = 0.05; rebuildArcs(tp); }
      tp.sndT -= dt;
      if (tp.sndT <= 0) { tp.sndT = 0.45; env.audio.zap(pan, d); }
      if (Math.random() < 0.6) env.emit(tp.x + (Math.random() - 0.5) * tp.w, 0.15, tp.z + (Math.random() - 0.5) * tp.d, '#9fe8ff', 2, 3);
      for (const b of env.getBots()) {
        if (b.dead || !inRect(tp, b.x, b.z, 0.2)) continue;
        b.trapT = (b.trapT || 0) - dt;
        if (b.trapT <= 0) { b.trapT = 0.12; env.zapBot(b, b.legit ? 3 : b.kind === 'boss' ? 10 : 8); }
      }
      if (S.phase === 'combat' && !S.paused && inRect(tp, S.px, S.pz, 0.2) && S.py < 0.6) {
        tp.hurtT -= dt;
        if (tp.hurtT <= 0) { tp.hurtT = 0.3; env.hurtPlayer(6, tp.x, tp.z); }
      }
    });
  }

  function rebuildArcs(tp) {
    const pos = tp.arcGeo.attributes.position;
    for (let s = 0; s < 14; s++) {
      const x0 = tp.x + (Math.random() - 0.5) * tp.w;
      const z0 = tp.z + (Math.random() - 0.5) * tp.d;
      const x1 = x0 + (Math.random() - 0.5) * 1.2;
      const z1 = z0 + (Math.random() - 0.5) * 1.2;
      pos.setXYZ(s * 2, x0, 0.08, z0);
      pos.setXYZ(s * 2 + 1, x1, 0.1 + Math.random() * 0.9, z1);
    }
    pos.needsUpdate = true;
  }

  function updateFirewall(dt) {
    for (let i = 0; i < 4; i++) {
      const f = S.fw[i];
      const w = walls[i];
      if (f.cd > 0) f.cd = Math.max(0, f.cd - dt);
      if (f.t > 0) {
        f.t -= dt;
        if (f.t <= 0) { f.t = 0; env.audio.firewall(false); if (S.held[i].length) env.showToast(`${SIDES[i]} gate reopened: ${S.held[i].length} held in the queue rush in`, false, 1800); }
      }
      const target = f.t > 0 ? (f.t < 1.2 ? (Math.sin(f.t * 20) > 0 ? 0.7 : 0.15) : 0.7) : 0;
      w.mat.opacity += (target - w.mat.opacity) * Math.min(1, dt * 10);
      w.wall.visible = w.mat.opacity > 0.02;
      if (w.wall.visible) w.mat.map.offset.y -= dt * 0.4;
      if (f.t <= 0 && S.held[i].length) {
        f.rel -= dt;
        if (f.rel <= 0) { env.spawnBot(S.held[i].shift()); f.rel = 0.35; }
      }
    }
  }

  function nearestGate() {
    let best = -1, bd = GATE_RANGE;
    GATES.forEach(([gx, gz], i) => {
      const d = Math.hypot(gx - S.px, gz - S.pz);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function nearestTerm() {
    let best = null, bd = EMP_RANGE;
    terms.forEach(tm => {
      const d = Math.hypot(tm.x - S.px, tm.z - S.pz);
      if (d < bd) { bd = d; best = tm; }
    });
    return best;
  }

  function computePrompt() {
    if (S.phase !== 'combat' || S.paused) return '';
    const tm = nearestTerm();
    if (tm) return tm.used ? 'EMP terminal is recharging for the next round' : '[F] Fire EMP: stuns every bot and clears their shots';
    const gi = nearestGate();
    if (gi >= 0) {
      const f = S.fw[gi];
      if (f.t > 0) return `${SIDES[gi]} gate sealed for ${Math.ceil(f.t)}s`;
      if (f.cd > 0) return `Firewall recharging (${Math.ceil(f.cd)}s)`;
      return `[F] Seal the ${SIDES[gi]} gate: holds incoming bots for ${FW_TIME}s (users wait too)`;
    }
    return '';
  }

  function act() {
    if (S.phase !== 'combat' || S.paused) return;
    const tm = nearestTerm();
    if (tm) {
      if (tm.used) { env.showToast('This EMP terminal is spent until the next round', true, 1400); env.audio.deny(); return; }
      fireEmp(tm);
      return;
    }
    const gi = nearestGate();
    if (gi < 0) { env.showToast('Nothing to use here. Gates and EMP terminals are on the walls.', false, 1500); return; }
    const f = S.fw[gi];
    if (f.t > 0) { env.showToast(`${SIDES[gi]} gate is already sealed`, false, 1000); return; }
    if (f.cd > 0) { env.showToast(`Firewall recharging: ${Math.ceil(f.cd)}s`, true, 1000); env.audio.deny(); return; }
    f.t = FW_TIME;
    f.cd = FW_COOLDOWN;
    f.rel = 0;
    env.audio.firewall(true);
    env.feed(`Firewall up on the ${SIDES[gi]} gate`, 'good');
    env.showToast(`${SIDES[gi]} gate sealed for ${FW_TIME}s`, false, 1400);
    env.emit(GATES[gi][0] * 0.95, 1.6, GATES[gi][1] * 0.95, '#7ce8ff', 22, 6);
  }

  function fireEmp(tm) {
    tm.used = true;
    tm.screenMat.color.setHex(0x552222);
    tm.padMat.opacity = 0.12;
    env.audio.emp();
    env.kickFx(0.012, 0.5);
    empWave = { t: 0, x: tm.x, z: tm.z };
    shock.visible = true;
    env.glows.pop(tm.x, 1.2, tm.z, '#7ce8ff', 6, 0.5, 2.5);
    let hit = 0;
    env.getBots().forEach(b => {
      if (b.dead || b.legit) return;
      b.stunT = b.kind === 'boss' ? 1.6 : 3.5;
      env.zapBot(b, b.kind === 'boss' ? 40 : 20);
      env.emit(b.x, 1.3, b.z, '#9fe8ff', 12, 5);
      hit += 1;
    });
    env.clearBolts();
    env.feed(`EMP pulse: ${hit} bots stunned`, 'good');
    env.showToast('EMP fired! Bots are stunned: shoot them now', false, 1800);
  }

  function updateEmp(dt) {
    if (empWave.t >= 1) { if (shock.visible) shock.visible = false; return; }
    empWave.t += dt / 0.9;
    const k = Math.min(1, empWave.t);
    shock.position.set(empWave.x, 1.2, empWave.z);
    shock.scale.set(1 + k * 50, 1, 1 + k * 50);
    shock.material.opacity = (1 - k) * 0.55;
  }

  function collect() {
    const roll = Math.random();
    const at = new THREE.Vector3(lootSpot.x, 1.3, lootSpot.z);
    let label;
    if (roll < 0.34) {
      const cash = 150 + Math.floor(Math.random() * 5) * 50;
      S.money += cash;
      label = `+$${cash}`;
      env.floaters.add(at, label, 'cash big');
    } else if (roll < 0.52) {
      env.refillAmmo();
      label = 'Ammo resupply';
    } else if (roll < 0.72) {
      S.armor = Math.min(100, S.armor + 40);
      label = '+40 armor';
    } else if (roll < 0.9) {
      S.health = Math.min(100, S.health + 40);
      label = '+40 health';
    } else {
      S.core = Math.min(100, S.core + 12);
      label = 'Core repaired +12%';
    }
    env.audio.pickup();
    env.glows.pop(lootSpot.x, 1, lootSpot.z, '#59ff9c', 3.5, 0.5, 2.2);
    env.emit(lootSpot.x, 0.9, lootSpot.z, '#59ff9c', 20, 5);
    env.feed(`Supply crate: ${label}`, 'good');
    env.showToast(`Supply crate found: ${label}`, false, 1800);
    loot.visible = false;
    lootSpot = null;
  }

  function updateLoot(dt, t) {
    if (!lootSpot || !loot.visible) return;
    loot.userData.crate.rotation.y += dt * 0.8;
    loot.userData.crate.position.y = 0.5 + Math.sin(t * 2.5) * 0.06;
    loot.userData.lid.position.y = 0.83 + Math.sin(t * 2.5) * 0.06;
    loot.userData.lid.rotation.y = loot.userData.crate.rotation.y;
    if (S.phase === 'combat' && !S.paused && Math.hypot(lootSpot.x - S.px, lootSpot.z - S.pz) < 1.4) collect();
  }

  function updateHud(dt) {
    hudT -= dt;
    if (hudT > 0) return;
    hudT = 0.15;
    const prompt = computePrompt();
    if (prompt !== lastPrompt) { lastPrompt = prompt; env.setPrompt(prompt); }
    const parts = S.fw.map((f, i) => `${f.t > 0 ? 's' : f.cd > 0 ? 'c' : 'r'}${f.t > 0 ? Math.ceil(f.t) : f.cd > 0 ? Math.ceil(f.cd) : ''}${i}`).join('|');
    if (parts !== lastFw) {
      lastFw = parts;
      env.setFirewallHud(S.fw.map((f, i) => ({ side: ['N', 'E', 'S', 'W'][i], state: f.t > 0 ? 'sealed' : f.cd > 0 ? 'cool' : 'ready', n: f.t > 0 ? Math.ceil(f.t) : Math.ceil(f.cd), held: S.held[i].length })));
    }
  }

  function update(dt, t, live) {
    updateEmp(dt);
    updateLoot(dt, t);
    terms.forEach(tm => {
      if (!tm.used) tm.padMat.opacity = 0.35 + Math.sin(t * 3 + tm.i) * 0.15;
    });
    updateTraps(dt, t, live);
    if (live) { updateFirewall(dt); updateHud(dt); }
  }

  function heldCount() { return S.held.reduce((n, h) => n + h.length, 0); }
  function heldHostile() { return S.held.reduce((n, h) => n + h.filter(p => p.kind !== 'legit').length, 0); }
  function isSealed(i) { return S.fw[i].t > 0; }

  function drawOnMap(ctx, k, px) {
    TRAPS.forEach((tp, i) => {
      const state = traps[i] ? traps[i].state : 'off';
      ctx.fillStyle = state === 'on' ? 'rgba(120,230,255,0.9)' : state === 'warn' ? 'rgba(255,200,40,0.9)' : 'rgba(232,185,35,0.45)';
      ctx.fillRect(px(tp.x - tp.w / 2), px(tp.z - tp.d / 2), tp.w * k, tp.d * k);
    });
    TERMINALS.forEach((tm, i) => {
      const used = terms[i] && terms[i].used;
      ctx.fillStyle = used ? '#5a6272' : '#58e8ff';
      ctx.save();
      ctx.translate(px(tm.x), px(tm.z));
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-1.5 * k, -1.5 * k, 3 * k, 3 * k);
      ctx.restore();
    });
    GATES.forEach(([gx, gz], i) => {
      if (S.fw && S.fw[i] && S.fw[i].t > 0) {
        const horizontal = i % 2 === 0;
        ctx.fillStyle = '#58e8ff';
        ctx.fillRect(px(gx) - (horizontal ? 3 : 1.5) * k, px(gz) - (horizontal ? 1.5 : 3) * k, (horizontal ? 6 : 3) * k, (horizontal ? 3 : 6) * k);
      }
    });
  }

  function dispose() {
    geos.forEach(g => g.dispose());
    geos.length = 0;
    traps = []; walls = []; terms = [];
  }

  return { build, reset, startRound, update, act, drawOnMap, heldCount, heldHostile, isSealed, dispose, FW_TIME };
}
