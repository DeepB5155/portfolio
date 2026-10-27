// Visual effects helpers for the Core Defense game: bloom post-processing, bullet holes, debris, glow pops, floating numbers.

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const BRIGHT = `
uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;
void main(){
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(threshold, threshold + 0.5, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR = `
uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
  s += texture2D(tDiffuse, vUv + dir * 1.3846).rgb * 0.3162162;
  s += texture2D(tDiffuse, vUv - dir * 1.3846).rgb * 0.3162162;
  s += texture2D(tDiffuse, vUv + dir * 3.2308).rgb * 0.0702703;
  s += texture2D(tDiffuse, vUv - dir * 3.2308).rgb * 0.0702703;
  gl_FragColor = vec4(s, 1.0);
}`;

const COMPOSITE = `
uniform sampler2D tScene; uniform sampler2D tB1; uniform sampler2D tB2;
uniform float strength; uniform float aberration; uniform float vignette; varying vec2 vUv;
void main(){
  vec2 off = (vUv - 0.5) * aberration;
  vec3 c;
  c.r = texture2D(tScene, vUv + off).r;
  c.g = texture2D(tScene, vUv).g;
  c.b = texture2D(tScene, vUv - off).b;
  c += texture2D(tB1, vUv).rgb * 0.55 * strength + texture2D(tB2, vUv).rgb * 0.95 * strength;
  float d = length(vUv - 0.5);
  c *= 1.0 - smoothstep(0.35, 0.95, d) * vignette;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Returns null when the device cannot render to float targets
export function createBloom(renderer, { msaa = true } = {}) {
  const ext = renderer.extensions;
  if (!renderer.capabilities.isWebGL2 || !(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))) return null;

  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const mk = () => new THREE.WebGLRenderTarget(4, 4, opts);
  const sceneRT = new THREE.WebGLRenderTarget(4, 4, { ...opts, depthBuffer: true, samples: msaa ? 4 : 0 });
  const a1 = mk(), b1 = mk(), a2 = mk(), b2 = mk();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(geo, null);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const mat = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
  const brightMat = mat(BRIGHT, { tDiffuse: { value: null }, threshold: { value: 0.85 } });
  const blurMat = mat(BLUR, { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } });
  const compMat = mat(COMPOSITE, { tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, strength: { value: 0.8 }, aberration: { value: 0 }, vignette: { value: 0.5 } });

  const size = new THREE.Vector2();
  let w = 4, h = 4;

  function pass(material, target) {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  function blur(src, dst, horizontal, tw, th) {
    blurMat.uniforms.tDiffuse.value = src.texture;
    blurMat.uniforms.dir.value.set(horizontal ? 1 / tw : 0, horizontal ? 0 : 1 / th);
    pass(blurMat, dst);
  }

  const api = {
    enabled: true,
    uniforms: compMat.uniforms,
    setSize() {
      renderer.getDrawingBufferSize(size);
      w = Math.max(4, Math.floor(size.x));
      h = Math.max(4, Math.floor(size.y));
      sceneRT.setSize(w, h);
      const w1 = Math.max(4, w >> 1), h1 = Math.max(4, h >> 1);
      const w2 = Math.max(4, w >> 2), h2 = Math.max(4, h >> 2);
      a1.setSize(w1, h1); b1.setSize(w1, h1);
      a2.setSize(w2, h2); b2.setSize(w2, h2);
    },
    render(scene, camera) {
      const w1 = a1.width, h1 = a1.height, w2 = a2.width, h2 = a2.height;
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      brightMat.uniforms.tDiffuse.value = sceneRT.texture;
      pass(brightMat, a1);
      blur(a1, b1, true, w1, h1);
      blur(b1, a1, false, w1, h1);
      blur(a1, a2, true, w2, h2);
      blur(a2, b2, false, w2, h2);
      blur(b2, a2, true, w2, h2);
      blur(a2, b2, false, w2, h2);
      compMat.uniforms.tScene.value = sceneRT.texture;
      compMat.uniforms.tB1.value = a1.texture;
      compMat.uniforms.tB2.value = b2.texture;
      pass(compMat, null);
    },
    dispose() {
      [sceneRT, a1, b1, a2, b2].forEach(rt => rt.dispose());
      [brightMat, blurMat, compMat].forEach(m => m.dispose());
      geo.dispose();
    }
  };
  api.setSize();
  return api;
}

function makeCanvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Bullet holes recycled in a ring buffer
export function createDecals(scene, max = 56) {
  const tex = makeCanvasTex(64, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.35, 'rgba(0,0,0,0.9)');
    grad.addColorStop(0.55, 'rgba(255,170,60,0.55)');
    grad.addColorStop(0.75, 'rgba(10,10,10,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const geo = new THREE.PlaneGeometry(0.2, 0.2);
  const list = [];
  let head = 0;
  const target = new THREE.Vector3();
  return {
    add(point, normal, size = 1) {
      let m = list[head % max];
      if (!m) { m = new THREE.Mesh(geo, mat); scene.add(m); list[head % max] = m; }
      head += 1;
      m.position.copy(point).addScaledVector(normal, 0.012);
      target.copy(point).add(normal);
      m.lookAt(target);
      m.rotateZ(Math.random() * Math.PI * 2);
      m.scale.setScalar(size * (0.8 + Math.random() * 0.5));
      m.visible = true;
    },
    clear() { list.forEach(m => { if (m) m.visible = false; }); head = 0; },
    dispose() { list.forEach(m => m && scene.remove(m)); tex.dispose(); mat.dispose(); geo.dispose(); }
  };
}

// Additive glow sprites that pop and fade (muzzle bursts, impacts, explosions)
export function createGlows(scene, texture, max = 16) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.visible = false;
    scene.add(s);
    pool.push({ s, t: 0, life: 1, size: 1, grow: 1 });
  }
  let head = 0;
  return {
    pop(x, y, z, color, size = 1, life = 0.25, grow = 1.6) {
      const g = pool[head++ % max];
      g.s.position.set(x, y, z);
      g.s.material.color.set(color);
      g.t = 0; g.life = life; g.size = size; g.grow = grow;
      g.s.visible = true;
      g.s.scale.setScalar(size);
    },
    update(dt) {
      pool.forEach(g => {
        if (!g.s.visible) return;
        g.t += dt;
        const k = g.t / g.life;
        if (k >= 1) { g.s.visible = false; return; }
        g.s.scale.setScalar(g.size * (1 + k * (g.grow - 1)));
        g.s.material.opacity = (1 - k) * (1 - k);
      });
    },
    clear() { pool.forEach(g => { g.s.visible = false; }); },
    dispose() { pool.forEach(g => { scene.remove(g.s); g.s.material.dispose(); }); }
  };
}

// Falling shell casings and dropped magazines
export function createDebris(scene, geoBox, max = 28) {
  const mats = {
    brass: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.9, roughness: 0.3, emissive: 0x3a2808, emissiveIntensity: 0.5 }),
    mag: new THREE.MeshStandardMaterial({ color: 0x1a2028, metalness: 0.6, roughness: 0.5 })
  };
  const pool = [];
  for (let i = 0; i < max; i++) {
    const m = new THREE.Mesh(geoBox, mats.brass);
    m.visible = false;
    scene.add(m);
    pool.push({ m, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0, life: 0, size: 0.02, bounced: false, onBounce: null });
  }
  let head = 0;
  return {
    spawn(kind, pos, vel, size, spin, onBounce) {
      const d = pool[head++ % max];
      d.m.material = mats[kind];
      d.m.scale.set(size.x, size.y, size.z);
      d.m.position.copy(pos);
      d.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      d.vx = vel.x; d.vy = vel.y; d.vz = vel.z;
      d.sx = (Math.random() - 0.5) * spin; d.sy = (Math.random() - 0.5) * spin; d.sz = (Math.random() - 0.5) * spin;
      d.life = kind === 'mag' ? 2.5 : 3;
      d.size = size.y / 2;
      d.bounced = false;
      d.onBounce = onBounce || null;
      d.m.visible = true;
    },
    update(dt) {
      pool.forEach(d => {
        if (!d.m.visible) return;
        d.life -= dt;
        if (d.life <= 0) { d.m.visible = false; return; }
        d.vy -= 14 * dt;
        d.m.position.x += d.vx * dt;
        d.m.position.y += d.vy * dt;
        d.m.position.z += d.vz * dt;
        if (d.m.position.y <= d.size) {
          d.m.position.y = d.size;
          if (Math.abs(d.vy) > 1 && d.onBounce) d.onBounce();
          d.vy = -d.vy * 0.35;
          d.vx *= 0.6; d.vz *= 0.6;
          d.sx *= 0.5; d.sy *= 0.5; d.sz *= 0.5;
          if (Math.abs(d.vy) < 0.4) d.vy = 0;
        }
        d.m.rotation.x += d.sx * dt;
        d.m.rotation.y += d.sy * dt;
        d.m.rotation.z += d.sz * dt;
      });
    },
    clear() { pool.forEach(d => { d.m.visible = false; }); },
    dispose() { pool.forEach(d => scene.remove(d.m)); mats.brass.dispose(); mats.mag.dispose(); }
  };
}

// DOM numbers that float up from a world position
export function createFloaters(container, max = 18) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    const el = document.createElement('div');
    el.className = 'dmg-float';
    el.hidden = true;
    container.appendChild(el);
    pool.push({ el, pos: new THREE.Vector3(), t: 0, life: 1, dx: 0, active: false });
  }
  let head = 0;
  const v = new THREE.Vector3();
  return {
    add(pos, text, cls = '') {
      const f = pool[head++ % max];
      f.pos.copy(pos);
      f.t = 0;
      f.life = cls.includes('big') ? 1.2 : 0.85;
      f.dx = (Math.random() - 0.5) * 50;
      f.active = true;
      f.el.className = `dmg-float ${cls}`;
      f.el.textContent = text;
      f.el.hidden = false;
    },
    update(dt, camera, w, h) {
      pool.forEach(f => {
        if (!f.active) return;
        f.t += dt;
        if (f.t >= f.life) { f.active = false; f.el.hidden = true; return; }
        v.copy(f.pos).project(camera);
        if (v.z > 1) { f.el.style.opacity = '0'; return; }
        const k = f.t / f.life;
        const x = (v.x * 0.5 + 0.5) * w + f.dx * k;
        const y = (-v.y * 0.5 + 0.5) * h - 70 * Math.sqrt(k);
        f.el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${1 + (1 - k) * 0.35})`;
        f.el.style.opacity = String(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
      });
    },
    clear() { pool.forEach(f => { f.active = false; f.el.hidden = true; }); }
  };
}

// Red arcs around the crosshair pointing at whoever hit you
export function createDamageDir(container, max = 6) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    const el = document.createElement('i');
    el.className = 'dmg-arc';
    el.hidden = true;
    container.appendChild(el);
    pool.push({ el, sx: 0, sz: 0, t: 0, active: false });
  }
  let head = 0;
  return {
    add(sx, sz) {
      const a = pool[head++ % max];
      a.sx = sx; a.sz = sz; a.t = 0; a.active = true;
      a.el.hidden = false;
    },
    update(dt, px, pz, yaw) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);
      pool.forEach(a => {
        if (!a.active) return;
        a.t += dt;
        if (a.t > 1.3) { a.active = false; a.el.hidden = true; return; }
        const dx = a.sx - px, dz = a.sz - pz;
        const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
        a.el.style.transform = `rotate(${ang}rad)`;
        a.el.style.opacity = String(Math.max(0, 1 - a.t / 1.3));
      });
    },
    clear() { pool.forEach(a => { a.active = false; a.el.hidden = true; }); }
  };
}
