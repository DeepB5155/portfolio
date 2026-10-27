import { projectsData } from './projects-data.js';
import { loadGithubProjects } from './github-data.js';

const LANG_COLORS = {
  'C#': '#b46cf0',
  JavaScript: '#f1e05a',
  TypeScript: '#4b9aea',
  CSS: '#c084fc',
  HTML: '#ff6b45',
  C: '#8a97a8',
  Python: '#4f9ad6',
  Java: '#d89a3c',
  'C++': '#f06292',
  Go: '#4dd0e1',
  Dart: '#45b6f2',
  Kotlin: '#a97bff',
  Swift: '#ff7a3d',
  PHP: '#8e9be0',
  Other: '#00D4C8'
};
const MAX_ITEMS = 40;
const MARKUP_LANGS = new Set(['CSS', 'HTML', 'SCSS', 'Less', 'Shell', 'Batchfile', 'Dockerfile', 'Makefile']);
const primaryLang = (langs) => (langs.includes('C#') ? 'C#' : langs.find(l => !MARKUP_LANGS.has(l)) || langs[0] || 'Other');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const normalize = (url) => String(url || '').toLowerCase().replace(/\/+$/, '');
const colorOf = (lang) => LANG_COLORS[lang] || LANG_COLORS.Other;

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? 'recently' : d.toLocaleDateString('en', { month: 'short', year: 'numeric' });
}

function modalDataFor(item) {
  if (item.featuredKey) return projectsData[item.featuredKey];
  const stack = [...new Set([...item.languages, ...item.topics])].slice(0, 10);
  return {
    title: item.title,
    tagline: 'GitHub project',
    overview: item.description || 'No description yet.',
    techStack: stack.length ? stack : ['GitHub'],
    features: [],
    github: item.url,
    live: item.live
  };
}

async function loadItems() {
  const featuredByUrl = new Map(Object.entries(projectsData).map(([key, p]) => [normalize(p.github), key]));
  const repos = await loadGithubProjects();

  const items = repos.map(r => ({
    title: r.title,
    description: r.description,
    url: r.url,
    live: r.live,
    languages: r.languages || [],
    topics: r.topics || [],
    size: r.size || 1,
    langBytes: r.langBytes || {},
    createdAt: r.createdAt || null,
    stars: r.stars || 0,
    pushedAt: r.pushedAt,
    featuredKey: featuredByUrl.get(normalize(r.url)) || null
  }));

  // Keep featured projects visible even if the synced data is unavailable
  for (const [key, p] of Object.entries(projectsData)) {
    if (!items.some(i => i.featuredKey === key)) {
      items.push({
        title: p.title.split(' — ')[0], description: p.tagline, url: p.github, live: p.live,
        languages: [], topics: [], size: 100000, pushedAt: null, featuredKey: key
      });
    }
  }

  items.sort((a, b) => (b.featuredKey ? 1 : 0) - (a.featuredKey ? 1 : 0) || String(b.pushedAt).localeCompare(String(a.pushedAt)));
  return items.slice(0, MAX_ITEMS).map(i => ({ ...i, lang: primaryLang(i.languages) }));
}

function glowTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color + '55');
  grad.addColorStop(1, color + '00');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowTexture(color, litRatio, heightUnits) {
  const cols = 4, rows = 12, cell = 16;
  const c = document.createElement('canvas');
  c.width = cols * cell;
  c.height = rows * cell;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (Math.random() < litRatio) {
        g.fillStyle = Math.random() < 0.2 ? '#ffffff' : color;
        g.fillRect(x * cell + 3, y * cell + 4, cell - 6, cell - 8);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, Math.max(1, Math.round(heightUnits / 1.6)));
  return tex;
}

const CITY_SPACING = 3.0;
const ROAD_HALF = 0.38;

function labelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  const label = text.length > 26 ? text.slice(0, 25) + '…' : text;
  g.font = '600 36px Inter, Arial, sans-serif';
  const w = Math.min(500, g.measureText(label).width + 76);
  const x = (512 - w) / 2;
  const y = 12, h = 72, r = 36;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fillStyle = 'rgba(8,12,20,0.85)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = color;
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.arc(x + 30, 48, 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#eef3fb';
  g.textBaseline = 'middle';
  g.fillText(label, x + 52, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  sprite.renderOrder = 10;
  return sprite;
}

// Top-down texture of the city: roads with lane markings, sidewalks, lawns and parks with ponds
function cityGroundTexture(cols, spacing, size, cells, itemCount, texSize) {
  const c = document.createElement('canvas');
  c.width = c.height = texSize;
  const g = c.getContext('2d');
  const k = texSize / size;
  const px = (w) => (w + size / 2) * k;
  const half = (cols * spacing) / 2;
  const block = spacing - 2 * ROAD_HALF;

  g.fillStyle = '#0a0e16';
  g.fillRect(0, 0, texSize, texSize);
  g.fillStyle = '#171b24';
  g.fillRect(px(-half - 0.45), px(-half - 0.45), (cols * spacing + 0.9) * k, (cols * spacing + 0.9) * k);

  // Rivers on the north and south side, crossed by a bridge on every north-south road
  const band = (za, zb, color) => {
    g.fillStyle = color;
    g.fillRect(0, px(Math.min(za, zb)), texSize, Math.abs(zb - za) * k);
  };
  [-1, 1].forEach(sign => {
    band(sign * (half + 0.45), sign * (half + 0.9), '#103f27');
    band(sign * (half + 0.9), sign * (half + 2.1), '#0d3b5e');
    band(sign * (half + 2.1), sign * (half + 3), '#103f27');
    g.fillStyle = '#2f77a3';
    g.fillRect(0, px(sign * (half + 0.9)) - 0.02 * k, texSize, 0.04 * k);
    g.fillRect(0, px(sign * (half + 2.1)) - 0.02 * k, texSize, 0.04 * k);
    for (let i = 0; i <= cols; i++) {
      const line = i * spacing - half;
      const zA = Math.min(sign * (half + 0.45), sign * (half + 2.6));
      const len = Math.abs(2.15);
      g.fillStyle = '#171b24';
      g.fillRect(px(line - ROAD_HALF), px(zA), ROAD_HALF * 2 * k, len * k);
      g.fillStyle = '#9aa6b8';
      g.fillRect(px(line - ROAD_HALF) - 0.02 * k, px(zA), 0.04 * k, len * k);
      g.fillRect(px(line + ROAD_HALF) - 0.02 * k, px(zA), 0.04 * k, len * k);
    }
  });

  const rect = (cx, cz, s, color) => {
    g.fillStyle = color;
    g.fillRect(px(cx - s / 2), px(cz - s / 2), s * k, s * k);
  };

  cells.forEach((cell, idx) => {
    const park = idx >= itemCount;
    rect(cell.x, cell.z, block, '#343c49');
    rect(cell.x, cell.z, block - 0.2, park ? '#17562f' : '#123d27');
    if (park) {
      rect(cell.x, cell.z, 0.2, '#2e3744');
      g.fillStyle = '#2e3744';
      g.fillRect(px(cell.x - (block - 0.2) / 2), px(cell.z - 0.1), (block - 0.2) * k, 0.2 * k);
      g.fillRect(px(cell.x - 0.1), px(cell.z - (block - 0.2) / 2), 0.2 * k, (block - 0.2) * k);
      g.fillStyle = '#1d5d82';
      g.beginPath();
      g.ellipse(px(cell.x), px(cell.z), 0.42 * k, 0.32 * k, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#6fc3e8';
      g.lineWidth = 0.03 * k;
      g.stroke();
    } else {
      rect(cell.x, cell.z, 1.5, '#222a37');
    }
  });

  // Dashed centre lines on every road (bridges included)
  g.fillStyle = '#c9a227';
  for (let i = 0; i <= cols; i++) {
    const line = i * spacing - half;
    for (let d = -half - 0.4; d < half + 0.4; d += 0.55) {
      g.fillRect(px(d), px(line - 0.02), 0.3 * k, 0.04 * k);
    }
    for (let d = -half - 2.6; d < half + 2.6; d += 0.55) {
      g.fillRect(px(line - 0.02), px(d), 0.04 * k, 0.3 * k);
    }
  }

  // Tram rails along the first east-west road
  g.fillStyle = '#8c97a8';
  g.fillRect(px(-half - 0.45), px(-half - 0.1) - 0.012 * k, (cols * spacing + 0.9) * k, 0.025 * k);
  g.fillRect(px(-half - 0.45), px(-half + 0.1) - 0.012 * k, (cols * spacing + 0.9) * k, 0.025 * k);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const NEW_DAYS = 30;

function formatBytes(n) {
  if (!n || n < 1024) return '';
  return n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB of code` : `${Math.round(n / 1024)} KB of code`;
}

// Tower crane that slews over a building under construction
function buildCrane(buildingHeight, buildingWidth) {
  const group = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xffb020, roughness: 0.6, metalness: 0.2 });
  const mastH = buildingHeight + 1.1;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.07, mastH, 0.07), yellow);
  mast.position.y = mastH / 2;
  const lattice = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, mastH, 0.13, 1, Math.max(2, Math.round(mastH / 0.25)), 1),
    new THREE.MeshBasicMaterial({ color: 0xffb020, wireframe: true })
  );
  lattice.position.y = mastH / 2;
  group.add(mast, lattice);

  const top = new THREE.Group();
  top.position.y = mastH;
  const jibLen = buildingWidth / 2 + 0.95;
  const jib = new THREE.Mesh(new THREE.BoxGeometry(jibLen, 0.06, 0.06), yellow);
  jib.position.set(-jibLen / 2, 0.05, 0);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), yellow);
  counter.position.set(0.25, 0.05, 0);
  const weight = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x59616e }));
  weight.position.set(0.42, 0.0, 0);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  cab.position.set(0, 0.0, 0.06);
  const apex = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), yellow);
  apex.position.y = 0.17;
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.4, 0.008), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  cable.position.set(-jibLen * 0.72, -0.17, 0);
  const load = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x4dd2ff, emissive: 0x0a3a50 }));
  load.position.set(-jibLen * 0.72, -0.4, 0);
  top.add(jib, counter, weight, cab, apex, cable, load);

  const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff3b30'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  light.scale.setScalar(0.5);
  light.position.y = 0.32;
  top.add(light);
  group.add(top);
  group.position.set(buildingWidth / 2 + 0.22, 0, 0);
  return { group, top, light };
}

export function initUniverse() {
  const stage = document.getElementById('universe-stage');
  if (!stage) return;

  const section = document.getElementById('universe');
  const listEl = document.getElementById('universe-list');
  let started = false;

  const observer = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting) && !started) {
      started = true;
      observer.disconnect();
      start();
    }
  }, { rootMargin: '300px' });
  observer.observe(section);

  async function start() {
    const items = await loadItems();
    renderList(items);
    renderLegend(items);

    const canvas = document.getElementById('universe-canvas');
    let renderer;
    try {
      if (typeof THREE === 'undefined') throw new Error('three missing');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      stage.classList.add('no-webgl');
      return;
    }
    buildScene(renderer, canvas, items);
  }

  function renderList(items) {
    listEl.innerHTML = '';
    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'universe-chip';
      btn.dataset.index = String(i);
      const dot = document.createElement('span');
      dot.className = 'universe-dot';
      dot.style.background = colorOf(item.lang);
      btn.append(dot, document.createTextNode(item.title));
      btn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('open-project', { detail: modalDataFor(item) }));
      });
      listEl.appendChild(btn);
    });
  }

  function renderLegend(items) {
    const legend = stage.querySelector('.universe-legend');
    const counts = new Map();
    items.forEach(i => counts.set(i.lang, (counts.get(i.lang) || 0) + 1));
    legend.innerHTML = '';
    [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([lang, n]) => {
      const span = document.createElement('span');
      span.className = 'universe-legend-item';
      const dot = document.createElement('span');
      dot.className = 'universe-dot';
      dot.style.background = colorOf(lang);
      span.append(dot, document.createTextNode(`${lang} · ${n}`));
      legend.appendChild(span);
    });
  }

  function buildScene(renderer, canvas, items) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmall = window.innerWidth < 768;
    const tooltip = stage.querySelector('.universe-tooltip');
    const toggleBtns = stage.querySelectorAll('[data-mode]');

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060a, 0.018);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sunLight = new THREE.PointLight(0x7ffff2, 90, 60, 2);
    scene.add(sunLight);
    const cityLight = new THREE.DirectionalLight(0xbcd7ff, 0);
    cityLight.position.set(6, 12, 8);
    scene.add(cityLight);

    // Background stars
    const starCount = isSmall ? 500 : 1200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 45 + Math.random() * 40;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.cos(ph);
      starPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.18, color: 0x9fb4d0, transparent: true, opacity: 0.7, fog: false })));

    // Sun
    const sun = new THREE.Group();
    sun.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), new THREE.MeshBasicMaterial({ color: 0x00d4c8 })));
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#00D4C8'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sunGlow.scale.setScalar(6);
    sun.add(sunGlow);
    scene.add(sun);

    // Orbit rings (created per radius below)
    const rings = [];
    const ringMat = new THREE.LineBasicMaterial({ color: 0x00d4c8, transparent: true, opacity: 0.16 });

    // Layout
    const featuredCount = items.filter(i => i.featuredKey).length;
    const others = items.length - featuredCount;
    const ringRadii = [4.4, 7.2, 9.6];
    const ringOf = (i) => {
      if (items[i].featuredKey) return 0;
      const k = i - featuredCount;
      return others > 8 ? 1 + (k % 2) : 1;
    };
    const ringMembers = [[], [], []];
    items.forEach((_, i) => ringMembers[ringOf(i)].push(i));
    ringRadii.forEach((r, idx) => {
      if (ringMembers[idx].length === 0) return;
      const pts = [];
      for (let a = 0; a <= 96; a++) pts.push(new THREE.Vector3(Math.cos((a / 96) * Math.PI * 2) * r, 0, Math.sin((a / 96) * Math.PI * 2) * r));
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      scene.add(ring);
      rings.push(ring);
    });

    const now = Date.now();
    const logs = items.map(i => Math.log(i.size + 1));
    const logMin = Math.min(...logs);
    const logMax = Math.max(...logs);

    const cols = Math.ceil(Math.sqrt(items.length));
    const spacing = CITY_SPACING;
    const cells = [];
    for (let r = 0; r < cols; r++) for (let c = 0; c < cols; c++) {
      cells.push({ x: (c - (cols - 1) / 2) * spacing, z: (r - (cols - 1) / 2) * spacing });
    }
    cells.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));

    const planets = [];
    const buildings = [];
    const nodes = items.map((item, i) => {
      const age = item.pushedAt ? (now - new Date(item.pushedAt).getTime()) / 86400000 : 400;
      const recency = clamp(1 - age / 730, 0, 1);
      const color = colorOf(item.lang);
      const group = new THREE.Group();

      const radius = 0.38 + 0.42 * recency + (item.featuredKey ? 0.1 : 0);
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, roughness: 0.55, metalness: 0.1 })
      );
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(color), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      glow.scale.setScalar(radius * 4.2);
      planet.add(glow);
      if (item.live) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.5, radius * 1.65, 48), new THREE.MeshBasicMaterial({ color: 0x00d4c8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
        ring.rotation.x = Math.PI / 2.4;
        planet.add(ring);
      }
      planet.userData.i = i;
      group.add(planet);

      const norm = logMax > logMin ? (logs[i] - logMin) / (logMax - logMin) : 0.5;
      const fullHeight = 0.9 + 3.8 * norm;
      const createdAge = item.createdAt ? (now - new Date(item.createdAt).getTime()) / 86400000 : Infinity;
      const isNew = createdAge < NEW_DAYS;
      item.isNew = isNew;
      const height = isNew ? fullHeight * 0.65 : fullHeight;
      const width = 0.7 + 0.18 * Math.min(item.languages.length || 1, 3);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x0d1018, roughness: 0.7, metalness: 0.2,
        emissive: 0xffffff, emissiveMap: windowTexture(color, (0.25 + 0.6 * recency) * (isNew ? 0.5 : 1), height), emissiveIntensity: 1
      });
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), bMat);
      building.userData.i = i;
      group.add(building);

      let crane = null;
      let scaffold = null;
      if (isNew) {
        crane = buildCrane(height, width);
        group.add(crane.group);
        scaffold = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.12, height + 0.25, width + 0.12, 1, Math.max(2, Math.round(height / 0.45)), 1),
          new THREE.MeshBasicMaterial({ color: 0xffb020, wireframe: true, transparent: true, opacity: 0.65 })
        );
        group.add(scaffold);
      }

      const label = labelSprite(item.title + (isNew ? '  ·  NEW' : ''), color);
      label.scale.set(4.0, 0.75, 1);
      group.add(label);

      const ringIdx = ringOf(i);
      const members = ringMembers[ringIdx];
      const node = {
        item, group, planet, building, label, radius, height, hover: 0, recency, crane, scaffold, baseGlow: isNew ? 0.55 : 1,
        ringR: ringRadii[ringIdx],
        angle0: (members.indexOf(i) / members.length) * Math.PI * 2 + ringIdx * 0.7,
        speed: (0.05 + 0.18 / ringRadii[ringIdx]) * (ringIdx % 2 ? -1 : 1) * 0.6,
        tilt: Math.sin(i * 1.7) * 0.5,
        city: cells[i]
      };
      planets.push(planet);
      buildings.push(building);
      scene.add(group);
      return node;
    });

    // ----- City details: roads, parks, trees, street lamps, cars -----
    const cityGroup = new THREE.Group();
    scene.add(cityGroup);
    const half = (cols * spacing) / 2;
    const citySize = cols * spacing + 6;

    const groundTex = cityGroundTexture(cols, spacing, citySize, cells, items.length, isSmall ? 1024 : 2048);
    groundTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex, emissiveMap: groundTex, emissive: 0xffffff, emissiveIntensity: 0.4,
      roughness: 0.95, metalness: 0, transparent: true, opacity: 0
    });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(citySize, citySize), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    cityGroup.add(groundMesh);

    const treeSpots = [];
    cells.forEach((cell, idx) => {
      if (idx < items.length) {
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
          treeSpots.push([cell.x + sx * 0.88, cell.z + sz * 0.88, 0.85 + Math.random() * 0.5]);
        });
      } else {
        for (let k = 0; k < 10; k++) {
          let px, pz;
          do {
            px = (Math.random() - 0.5) * 1.9;
            pz = (Math.random() - 0.5) * 1.9;
          } while (Math.hypot(px, pz) < 0.55);
          treeSpots.push([cell.x + px, cell.z + pz, 0.8 + Math.random() * 0.7]);
        }
      }
    });
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }), treeSpots.length);
    const leaves = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 0.6, 7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), treeSpots.length);
    const m4 = new THREE.Matrix4();
    const qIdentity = new THREE.Quaternion();
    const tScale = new THREE.Vector3();
    const tPos = new THREE.Vector3();
    const tColor = new THREE.Color();
    treeSpots.forEach(([x, z, s], i) => {
      tScale.set(s, s, s);
      tPos.set(x, 0.15 * s, z);
      m4.compose(tPos, qIdentity, tScale);
      trunks.setMatrixAt(i, m4);
      tPos.set(x, 0.6 * s, z);
      m4.compose(tPos, qIdentity, tScale);
      leaves.setMatrixAt(i, m4);
      tColor.setHSL(0.31 + Math.random() * 0.07, 0.55, 0.2 + Math.random() * 0.1);
      leaves.setColorAt(i, tColor);
    });
    cityGroup.add(trunks, leaves);

    // Street lamps at every intersection (poles + glow)
    const lampSpots = [];
    for (let i = 0; i <= cols; i++) for (let j = 0; j <= cols; j++) lampSpots.push([i * spacing - half + 0.5, j * spacing - half + 0.5]);
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.018, 0.8, 6), new THREE.MeshStandardMaterial({ color: 0x2b3340 }), lampSpots.length);
    const lampPos = new Float32Array(lampSpots.length * 3);
    lampSpots.forEach(([x, z], i) => {
      tPos.set(x, 0.4, z);
      tScale.set(1, 1, 1);
      m4.compose(tPos, qIdentity, tScale);
      poles.setMatrixAt(i, m4);
      lampPos.set([x, 0.84, z], i * 3);
    });
    const lampGeo = new THREE.BufferGeometry();
    lampGeo.setAttribute('position', new THREE.BufferAttribute(lampPos, 3));
    const lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({
      map: glowTexture('#ffd9a0'), size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    cityGroup.add(poles, lamps);

    // Cars driving along the roads
    const roadCoords = Array.from({ length: cols + 1 }, (_, k) => k * spacing - half);
    const carColors = [0xff5d5d, 0xffc857, 0x4dd2ff, 0xffffff, 0x9bff8a, 0xc792ff];
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff1c1 });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
    const carCount = isSmall ? 8 : Math.min(22, 6 + cols * 3);
    const carLimitX = half + 0.4;
    const carLimitZ = half + 2.5;
    const cars = [];
    for (let i = 0; i < carCount; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.16), new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.4, metalness: 0.3 }));
      body.position.y = 0.07;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.13), new THREE.MeshStandardMaterial({ color: 0x10151f, roughness: 0.2, metalness: 0.6 }));
      cabin.position.set(-0.02, 0.14, 0);
      g.add(body, cabin);
      [-1, 1].forEach(s => {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.035), headMat);
        head.position.set(0.175, 0.075, s * 0.055);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.035), tailMat);
        tail.position.set(-0.175, 0.075, s * 0.055);
        g.add(head, tail);
      });
      cityGroup.add(g);
      const axis = i % 2 === 0 ? 'x' : 'z';
      // East-west cars skip the first road, which belongs to the tram
      const lineIndex = axis === 'x' ? 1 + Math.floor(Math.random() * cols) : Math.floor(Math.random() * roadCoords.length);
      const lim = axis === 'x' ? carLimitX : carLimitZ;
      cars.push({
        g, axis, dir: Math.random() < 0.5 ? 1 : -1,
        line: roadCoords[lineIndex],
        pos: (Math.random() * 2 - 1) * lim, speed: 0.7 + Math.random() * 0.9
      });
    }

    function updateCars(dt) {
      cars.forEach(car => {
        const lim = car.axis === 'x' ? carLimitX : carLimitZ;
        car.pos += car.dir * car.speed * dt;
        if (Math.abs(car.pos) > lim) car.pos = -car.dir * lim;
        if (car.axis === 'x') {
          car.g.position.set(car.pos, 0, car.line + car.dir * 0.13);
          car.g.rotation.y = car.dir > 0 ? 0 : Math.PI;
        } else {
          car.g.position.set(car.line - car.dir * 0.13, 0, car.pos);
          car.g.rotation.y = car.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
      });
    }

    // ----- More city life: tram, pedestrians, drones, helicopter, fountains, rain -----
    const tram = new THREE.Group();
    const tramBody = new THREE.MeshStandardMaterial({ color: 0xf2f6fb, roughness: 0.35, metalness: 0.3 });
    const tramGlass = new THREE.MeshBasicMaterial({ color: 0x7fe9ff });
    for (let k = 0; k < 3; k++) {
      const wagon = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.2), tramBody);
      wagon.position.set(-k * 0.47, 0.11, 0);
      const windows = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.205), tramGlass);
      windows.position.set(-k * 0.47, 0.14, 0);
      tram.add(wagon, windows);
    }
    const tramLamp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.12), headMat);
    tramLamp.position.set(0.225, 0.11, 0);
    tram.add(tramLamp);
    cityGroup.add(tram);
    let tramPos = -carLimitX;
    function updateTram(dt) {
      tramPos += dt * 0.9;
      if (tramPos > carLimitX + 1.4) tramPos = -carLimitX;
      tram.position.set(tramPos, 0, roadCoords[0]);
    }

    // Pedestrians walking the sidewalk around each lot
    const peopleCount = Math.min(isSmall ? 16 : 40, items.length * 5);
    const people = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.022, 0.06, 2, 6), new THREE.MeshStandardMaterial({ roughness: 0.8 }), peopleCount);
    people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    people.frustumCulled = false;
    const walkers = [];
    for (let i = 0; i < peopleCount; i++) {
      tColor.setHSL(Math.random(), 0.6, 0.62);
      people.setColorAt(i, tColor);
      walkers.push({ cell: cells[Math.floor(Math.random() * items.length)], s: Math.random(), dir: Math.random() < 0.5 ? 1 : -1, speed: 0.01 + Math.random() * 0.012 });
    }
    cityGroup.add(people);
    const WALK = 1.07;
    function updatePeople(dt) {
      walkers.forEach((w, i) => {
        w.s = (w.s + w.dir * w.speed * dt + 1) % 1;
        const side = Math.floor(w.s * 4);
        const u = w.s * 4 - side;
        let x, z;
        if (side === 0) { x = -WALK + 2 * WALK * u; z = -WALK; }
        else if (side === 1) { x = WALK; z = -WALK + 2 * WALK * u; }
        else if (side === 2) { x = WALK - 2 * WALK * u; z = WALK; }
        else { x = -WALK; z = WALK - 2 * WALK * u; }
        tPos.set(w.cell.x + x, 0.055, w.cell.z + z);
        tScale.set(1, 1, 1);
        m4.compose(tPos, qIdentity, tScale);
        people.setMatrixAt(i, m4);
      });
      people.instanceMatrix.needsUpdate = true;
    }
    updatePeople(0);

    // Drones patrolling over the rooftops
    const drones = [];
    const rotorMat = new THREE.MeshBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0.55 });
    const droneCount = isSmall ? 2 : 4;
    for (let i = 0; i < droneCount; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.12), new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.5, roughness: 0.4 })));
      const rotors = [];
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.004, 12), rotorMat);
        rotor.position.set(sx * 0.085, 0.03, sz * 0.085);
        g.add(rotor);
        rotors.push(rotor);
      });
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff3030 });
      const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), lightMat);
      lightMesh.position.set(0.07, 0, 0);
      g.add(lightMesh);
      cityGroup.add(g);
      drones.push({
        g, rotors, lightMat,
        ax: half * (0.5 + Math.random() * 0.5), az: half * (0.5 + Math.random() * 0.5),
        wx: 0.25 + Math.random() * 0.2, wz: 0.2 + Math.random() * 0.2,
        px: Math.random() * 6, pz: Math.random() * 6, h: 2.6 + Math.random() * 2.2
      });
    }
    function updateDrones(t, dt) {
      drones.forEach(d => {
        const x = d.ax * Math.sin(d.wx * t + d.px);
        const z = d.az * Math.sin(d.wz * t + d.pz);
        const vx = d.ax * d.wx * Math.cos(d.wx * t + d.px);
        const vz = d.az * d.wz * Math.cos(d.wz * t + d.pz);
        d.g.position.set(x, d.h + 0.25 * Math.sin(t * 1.3 + d.px), z);
        d.g.rotation.y = Math.atan2(-vz, vx);
        d.rotors.forEach(r => { r.rotation.y += dt * 60; });
        d.lightMat.color.setHex(Math.sin(t * 6 + d.px) > 0 ? 0xff3030 : 0x330808);
      });
    }

    // Helicopter circling the city with a searchlight
    const heli = new THREE.Group();
    const heliMetal = new THREE.MeshStandardMaterial({ color: 0xd9e2f0, metalness: 0.4, roughness: 0.4 });
    const heliBody = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), heliMetal);
    heliBody.scale.set(0.26, 0.13, 0.13);
    const heliGlass = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0x7fe9ff }));
    heliGlass.scale.set(0.12, 0.09, 0.1);
    heliGlass.position.set(0.14, 0.03, 0);
    const heliBoom = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.035), heliMetal);
    heliBoom.position.set(-0.3, 0.03, 0);
    const heliFin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.015), heliMetal);
    heliFin.position.set(-0.47, 0.07, 0);
    const mainRotor = new THREE.Group();
    mainRotor.position.y = 0.15;
    const bladeMat = new THREE.MeshBasicMaterial({ color: 0x2b3340 });
    const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.008, 0.045), bladeMat);
    const bladeB = bladeA.clone();
    bladeB.rotation.y = Math.PI / 2;
    mainRotor.add(bladeA, bladeB);
    const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01), bladeMat);
    tailRotor.position.set(-0.47, 0.07, 0.02);
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), heliMetal);
    skid.position.set(0, -0.12, 0.07);
    const skid2 = skid.clone();
    skid2.position.z = -0.07;
    const heliLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff3b30'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    heliLight.scale.setScalar(0.35);
    heliLight.position.set(-0.5, 0.1, 0);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 2.2, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
    );
    beam.position.y = -1.1;
    heli.add(heliBody, heliGlass, heliBoom, heliFin, mainRotor, tailRotor, skid, skid2, heliLight, beam);
    heli.scale.setScalar(1.4);
    cityGroup.add(heli);
    function updateHeli(t, dt) {
      const a = t * 0.32;
      const R = half * 0.85 + 0.6;
      heli.position.set(Math.cos(a) * R, 5.9 + 0.15 * Math.sin(t * 0.9), Math.sin(a) * R);
      heli.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
      mainRotor.rotation.y += dt * 45;
      tailRotor.rotation.z += dt * 50;
      heliLight.visible = Math.sin(t * 5) > 0;
    }

    // Fountains in the parks
    const parkCells = cells.slice(items.length);
    const JETS = 26;
    const jetCount = parkCells.length * JETS;
    const jetPos = new Float32Array(Math.max(1, jetCount) * 3);
    const jetMeta = Array.from({ length: jetCount }, () => ({ phase: Math.random(), ang: Math.random() * Math.PI * 2, spd: 0.8 + Math.random() * 0.4, rad: 0.14 + Math.random() * 0.16 }));
    const jetGeo = new THREE.BufferGeometry();
    jetGeo.setAttribute('position', new THREE.BufferAttribute(jetPos, 3));
    const jets = new THREE.Points(jetGeo, new THREE.PointsMaterial({
      map: glowTexture('#9fdcff'), color: 0x9fdcff, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    jets.frustumCulled = false;
    jets.visible = jetCount > 0;
    cityGroup.add(jets);
    function updateFountains(t) {
      jetMeta.forEach((m, i) => {
        const cell = parkCells[Math.floor(i / JETS)];
        const u = (t * m.spd + m.phase) % 1;
        jetPos[i * 3] = cell.x + Math.cos(m.ang) * m.rad * u * 1.6;
        jetPos[i * 3 + 1] = 0.06 + 0.55 * 4 * u * (1 - u);
        jetPos[i * 3 + 2] = cell.z + Math.sin(m.ang) * m.rad * u * 1.6;
      });
      jetGeo.attributes.position.needsUpdate = true;
    }

    // Rain
    const RAIN = isSmall ? 350 : 800;
    const rainPos = new Float32Array(RAIN * 6);
    const rainHead = new Float32Array(RAIN * 3);
    for (let i = 0; i < RAIN; i++) {
      rainHead[i * 3] = (Math.random() - 0.5) * citySize;
      rainHead[i * 3 + 1] = Math.random() * 9;
      rainHead[i * 3 + 2] = (Math.random() - 0.5) * citySize;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: 0xa9c7ff, transparent: true, opacity: 0, fog: false });
    const rain = new THREE.LineSegments(rainGeo, rainMat);
    rain.frustumCulled = false;
    rain.visible = false;
    cityGroup.add(rain);
    let rainOn = false;
    function updateRain(dt) {
      const goalOpacity = rainOn ? 0.4 : 0;
      rainMat.opacity += (goalOpacity - rainMat.opacity) * 0.08;
      rain.visible = rainMat.opacity > 0.01;
      if (!rain.visible) return;
      for (let i = 0; i < RAIN; i++) {
        let y = rainHead[i * 3 + 1] - 11 * dt;
        if (y < 0) y = 9;
        rainHead[i * 3 + 1] = y;
        rainPos.set([rainHead[i * 3], y, rainHead[i * 3 + 2], rainHead[i * 3], y - 0.35, rainHead[i * 3 + 2]], i * 6);
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    stage.querySelectorAll('[data-weather]').forEach(btn => btn.addEventListener('click', () => {
      rainOn = !rainOn;
      btn.setAttribute('aria-pressed', String(rainOn));
      dirty = true;
      schedule();
    }));

    // ----- Space details: asteroid belt + rockets flying between planets -----
    const spaceGroup = new THREE.Group();
    scene.add(spaceGroup);
    const beltCount = isSmall ? 90 : 220;
    const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: 0x8d93a3, roughness: 1, flatShading: true }), beltCount);
    const beltQ = new THREE.Quaternion();
    const beltE = new THREE.Euler();
    for (let i = 0; i < beltCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 5.5 + Math.random() * 0.7;
      const s = 0.5 + Math.random() * 1.2;
      tPos.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.3, Math.sin(a) * r);
      beltE.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      beltQ.setFromEuler(beltE);
      tScale.set(s, s, s);
      m4.compose(tPos, beltQ, tScale);
      belt.setMatrixAt(i, m4);
    }
    spaceGroup.add(belt);

    const TRAIL = 28;
    const UP = new THREE.Vector3(0, 1, 0);
    const flameTex = glowTexture('#ffb347');
    const trailTex = glowTexture('#ffffff');
    const rocketCount = Math.min(isSmall ? 3 : 6, Math.max(0, items.length - 1));
    const rockets = [];

    function buildRocket() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 0.4, roughness: 0.35 }));
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xff5a4d, roughness: 0.4 }));
      nose.position.y = 0.19;
      g.add(body, nose);
      for (let f = 0; f < 3; f++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.07), new THREE.MeshStandardMaterial({ color: 0xff5a4d }));
        const ang = (f / 3) * Math.PI * 2;
        fin.position.set(Math.cos(ang) * 0.055, -0.1, Math.sin(ang) * 0.055);
        fin.rotation.y = -ang;
        g.add(fin);
      }
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      flame.position.y = -0.22;
      flame.scale.setScalar(0.32);
      g.add(flame);
      g.scale.setScalar(2.4);
      scene.add(g);
      return { g, flame };
    }

    for (let i = 0; i < rocketCount; i++) {
      const { g, flame } = buildRocket();
      const trailPos = new Float32Array(TRAIL * 3).fill(0);
      const trailCol = new Float32Array(TRAIL * 3);
      for (let k = 0; k < TRAIL; k++) {
        const fade = Math.pow(1 - k / TRAIL, 1.7);
        trailCol.set([1.0 * fade, 0.78 * fade, 0.45 * fade], k * 3);
      }
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
      const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
        map: trailTex, size: 0.3, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
      }));
      trail.frustumCulled = false;
      scene.add(trail);
      const from = i % nodes.length;
      rockets.push({ g, flame, trail, trailPos, from, to: (from + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length, phase: 'wait', timer: i * 1.1 + Math.random(), t: 0, dur: 6, side: 1 });
    }

    const rA = new THREE.Vector3();
    const rB = new THREE.Vector3();
    const rDir = new THREE.Vector3();
    const rP0 = new THREE.Vector3();
    const rP1 = new THREE.Vector3();
    const rP2 = new THREE.Vector3();
    const rPos = new THREE.Vector3();
    const rTan = new THREE.Vector3();
    const rSide = new THREE.Vector3();

    function updateRockets(dt, time, planetS) {
      rockets.forEach(r => {
        const show = planetS > 0.02;
        r.g.visible = show && r.phase === 'fly';
        r.trail.visible = show && r.phase === 'fly';
        r.trail.material.opacity = planetS;

        if (r.phase === 'wait') {
          r.timer -= dt;
          if (r.timer <= 0 && show) {
            r.phase = 'fly';
            r.t = 0;
            r.side = Math.random() < 0.5 ? -1 : 1;
            r.dur = 5 + nodes[r.from].group.position.distanceTo(nodes[r.to].group.position) * 0.45;
            const start = nodes[r.from].group.position;
            for (let k = 0; k < TRAIL; k++) r.trailPos.set([start.x, start.y, start.z], k * 3);
          }
          return;
        }

        const A = nodes[r.from];
        const B = nodes[r.to];
        rA.copy(A.group.position);
        rB.copy(B.group.position);
        rDir.subVectors(rB, rA).normalize();
        rP0.copy(rA).addScaledVector(rDir, A.radius * 1.2);
        rP2.copy(rB).addScaledVector(rDir, -B.radius * 1.2);
        const dist = rP0.distanceTo(rP2);
        rSide.crossVectors(rDir, UP).normalize().multiplyScalar(r.side * (0.5 + dist * 0.08));
        rP1.addVectors(rP0, rP2).multiplyScalar(0.5).add(rSide);
        rP1.y += 0.8 + dist * 0.18;

        r.t += dt;
        const u = easeInOut(clamp(r.t / r.dur, 0, 1));
        const iu = 1 - u;
        rPos.set(0, 0, 0).addScaledVector(rP0, iu * iu).addScaledVector(rP1, 2 * iu * u).addScaledVector(rP2, u * u);
        rTan.set(0, 0, 0).addScaledVector(rP0, -2 * iu).addScaledVector(rP1, 2 * (1 - 2 * u)).addScaledVector(rP2, 2 * u);
        if (rTan.lengthSq() < 1e-6) rTan.copy(rDir);
        rTan.normalize();

        r.g.position.copy(rPos);
        r.g.quaternion.setFromUnitVectors(UP, rTan);
        const grow = clamp(Math.min(r.t, r.dur - r.t) / 0.6, 0, 1);
        r.g.scale.setScalar(2.4 * planetS * grow);
        r.flame.scale.setScalar(0.28 + 0.1 * Math.sin(time * 40 + r.dur));

        r.trailPos.copyWithin(3, 0, (TRAIL - 1) * 3);
        r.trailPos[0] = rPos.x - rTan.x * 0.3;
        r.trailPos[1] = rPos.y - rTan.y * 0.3;
        r.trailPos[2] = rPos.z - rTan.z * 0.3;
        r.trail.geometry.attributes.position.needsUpdate = true;

        if (r.t >= r.dur) {
          r.phase = 'wait';
          r.timer = 0.8 + Math.random() * 1.6;
          r.from = r.to;
          r.to = (r.from + 1 + Math.floor(Math.random() * (nodes.length - 1))) % nodes.length;
        }
      });
    }

    // ----- Space life: nebula, space station, satellites, comets -----
    const nebulae = ['#1b7f9e', '#6a3fb0', '#1c4fa3', '#0e8f7a', '#a03fa0'].slice(0, isSmall ? 2 : 5).map((c, i) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.2, fog: false }));
      const a = (i / 5) * Math.PI * 2 + 0.5;
      sprite.position.set(Math.cos(a) * 65, i % 2 ? 14 : -10, Math.sin(a) * 65);
      sprite.scale.setScalar(80 + i * 12);
      scene.add(sprite);
      return sprite;
    });

    const station = new THREE.Group();
    const stationMetal = new THREE.MeshStandardMaterial({ color: 0xcfd8e6, metalness: 0.6, roughness: 0.35 });
    const stationSpin = new THREE.Group();
    const stationRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 28), stationMetal);
    stationRing.rotation.x = Math.PI / 2;
    stationSpin.add(stationRing);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.012), stationMetal);
      spoke.position.set(Math.cos((s / 4) * Math.PI * 2) * 0.17, 0, Math.sin((s / 4) * Math.PI * 2) * 0.17);
      spoke.rotation.y = -(s / 4) * Math.PI * 2;
      stationSpin.add(spoke);
    }
    const stationHub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 10), stationMetal);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a5da8, emissive: 0x0a2a5a, metalness: 0.5, roughness: 0.4 });
    const panelArm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.03), stationMetal);
    panelArm.position.y = 0.3;
    const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.18), panelMat);
    panelL.position.set(-0.35, 0.3, 0);
    const panelR = panelL.clone();
    panelR.position.x = 0.35;
    const stationLight = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ff3b30'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    stationLight.scale.setScalar(0.4);
    stationLight.position.y = 0.4;
    station.add(stationSpin, stationHub, panelArm, panelL, panelR, stationLight);
    station.scale.setScalar(1.7);
    spaceGroup.add(station);

    const satellites = [0, 1, 2].map(i => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), stationMetal));
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.07), panelMat);
      wing.position.x = 0.12;
      const wing2 = wing.clone();
      wing2.position.x = -0.12;
      const light = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#ffd36b'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      light.scale.setScalar(0.3);
      light.position.y = 0.07;
      g.add(wing, wing2, light);
      g.scale.setScalar(1.6);
      spaceGroup.add(g);
      return { g, light, r: 2.3 + i * 0.35, inc: [0.9, -0.6, 0.3][i], speed: 0.5 + i * 0.17, phase: i * 2.1 };
    });

    function updateSpaceLife(t, dt) {
      const a = t * 0.05;
      station.position.set(Math.cos(a) * 11.8, Math.sin(a) * 11.8 * 0.35, Math.sin(a) * 11.8);
      station.rotation.y = t * 0.15;
      stationSpin.rotation.y = t * 0.6;
      stationLight.visible = Math.sin(t * 3) > 0;
      satellites.forEach(s => {
        const b = t * s.speed + s.phase;
        s.g.position.set(Math.cos(b) * s.r, Math.sin(b) * s.r * Math.sin(s.inc), Math.sin(b) * s.r * Math.cos(s.inc));
        s.g.rotation.y = b;
        s.light.visible = Math.sin(t * 4 + s.phase) > 0.2;
      });
    }

    const COMET_TRAIL = 46;
    const cometHead = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('#bfe9ff'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    cometHead.scale.setScalar(1.5);
    cometHead.visible = false;
    scene.add(cometHead);
    const cometPos = new Float32Array(COMET_TRAIL * 3);
    const cometCol = new Float32Array(COMET_TRAIL * 3);
    for (let k = 0; k < COMET_TRAIL; k++) {
      const fade = Math.pow(1 - k / COMET_TRAIL, 1.5);
      cometCol.set([0.55 * fade, 0.85 * fade, 1.0 * fade], k * 3);
    }
    const cometGeo = new THREE.BufferGeometry();
    cometGeo.setAttribute('position', new THREE.BufferAttribute(cometPos, 3));
    cometGeo.setAttribute('color', new THREE.BufferAttribute(cometCol, 3));
    const cometTrail = new THREE.Points(cometGeo, new THREE.PointsMaterial({
      map: trailTex, size: 0.5, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    cometTrail.frustumCulled = false;
    cometTrail.visible = false;
    scene.add(cometTrail);
    const comet = { active: false, timer: 4, t: 0, dur: 6, from: new THREE.Vector3(), to: new THREE.Vector3() };
    const cometPt = new THREE.Vector3();

    function updateComet(dt, planetS) {
      if (!comet.active) {
        comet.timer -= dt;
        if (comet.timer <= 0 && planetS > 0.5) {
          const a = Math.random() * Math.PI * 2;
          const off = (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.3);
          comet.from.set(Math.cos(a) * 38, -6 + Math.random() * 20, Math.sin(a) * 38);
          comet.to.set(-Math.cos(a + off) * 38, -6 + Math.random() * 20, -Math.sin(a + off) * 38);
          comet.t = 0;
          comet.dur = 5 + Math.random() * 3;
          comet.active = true;
          for (let k = 0; k < COMET_TRAIL; k++) cometPos.set([comet.from.x, comet.from.y, comet.from.z], k * 3);
        }
        cometHead.visible = false;
        cometTrail.visible = false;
        return;
      }
      comet.t += dt;
      const u = clamp(comet.t / comet.dur, 0, 1);
      cometPt.lerpVectors(comet.from, comet.to, u);
      cometHead.position.copy(cometPt);
      cometPos.copyWithin(3, 0, (COMET_TRAIL - 1) * 3);
      cometPos[0] = cometPt.x;
      cometPos[1] = cometPt.y;
      cometPos[2] = cometPt.z;
      cometGeo.attributes.position.needsUpdate = true;
      const vis = planetS * Math.sin(Math.PI * u);
      cometHead.material.opacity = vis;
      cometTrail.material.opacity = vis;
      cometHead.visible = vis > 0.02;
      cometTrail.visible = vis > 0.02;
      if (u >= 1) {
        comet.active = false;
        comet.timer = 7 + Math.random() * 8;
      }
    }

    // Camera state
    const cam = { theta: 0.6, phi: 1.0, radius: 15, tx: 0, ty: 0, tz: 0 };
    const goal = { ...cam };
    const baseRadius = (mode) => {
      const aspect = camera.aspect || 1;
      return (mode === 'city' ? 15 : 15) * (aspect < 1 ? 1.5 : aspect < 1.4 ? 1.2 : 1);
    };
    const basePhi = (mode) => (mode === 'city' ? 0.85 : 1.0);

    let mode = 'galaxy';
    let progress = 0; // 0 galaxy .. 1 city
    let morph = 0;
    let lastInteract = 0;
    let dirty = true;
    let visible = true;
    let hovered = -1;
    let rafId = 0;
    const clockStart = performance.now();
    let lastFrame = clockStart;

    function resize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!lastInteract) goal.radius = cam.radius = baseRadius(mode);
      dirty = true;
    }
    new ResizeObserver(resize).observe(stage);
    resize();

    function setMode(next) {
      if (typeof deselect === 'function') deselect();
      mode = next;
      toggleBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
      goal.tx = goal.ty = goal.tz = 0;
      goal.radius = baseRadius(next);
      goal.phi = basePhi(next);
      stage.dataset.mode = next;
      dirty = true;
      schedule();
    }
    toggleBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

    stage.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
      goal.radius = clamp(goal.radius * (b.dataset.zoom === 'in' ? 0.8 : 1.25), 5, 28);
      lastInteract = performance.now();
      dirty = true;
      schedule();
    }));

    // Pointer controls
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;

    function pick(e) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(morph < 0.5 ? planets : buildings, false);
      return hits.length ? hits[0].object.userData.i : -1;
    }

    function showTooltip(i, e) {
      const item = items[i];
      tooltip.hidden = false;
      tooltip.innerHTML = '';
      const t = document.createElement('strong');
      t.textContent = item.title;
      const m = document.createElement('span');
      m.textContent = `${item.lang}${item.pushedAt ? ' · Updated ' + formatDate(item.pushedAt) : ''}${item.featuredKey ? ' · Featured' : ''}${item.isNew ? ' · Under construction' : ''}`;
      const d = document.createElement('p');
      d.textContent = (item.description || '').slice(0, 90) + ((item.description || '').length > 90 ? '…' : '');
      tooltip.append(t, m, d);
      const rect = stage.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left + 14, 8, rect.width - 250);
      const y = clamp(e.clientY - rect.top + 14, 8, rect.height - 110);
      tooltip.style.transform = `translate(${x}px, ${y}px)`;
    }

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      lastInteract = performance.now();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (down) {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) down.moved = true;
        goal.theta -= (e.clientX - down.lx) * 0.006;
        if (e.pointerType !== 'touch') goal.phi = clamp(goal.phi - (e.clientY - down.ly) * 0.006, 0.3, 1.45);
        down.lx = e.clientX;
        down.ly = e.clientY;
        lastInteract = performance.now();
        tooltip.hidden = true;
      } else if (e.pointerType === 'mouse') {
        hovered = pick(e);
        canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
        if (hovered >= 0) showTooltip(hovered, e); else tooltip.hidden = true;
      }
      dirty = true;
      schedule();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (down && !down.moved) {
        const i = pick(e);
        if (i >= 0) select(i); else if (selected >= 0) deselect();
      }
      down = null;
    });
    canvas.addEventListener('pointerleave', () => { hovered = -1; tooltip.hidden = true; });
    canvas.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      goal.radius = clamp(goal.radius * (1 + e.deltaY * 0.001), 5, 28);
      lastInteract = performance.now();
      dirty = true;
      schedule();
    }, { passive: false });

    const card = stage.querySelector('#universe-card');
    const cardTitle = card.querySelector('.universe-card-title');
    const cardBadge = card.querySelector('.universe-card-badge');
    const cardMeta = card.querySelector('.universe-card-meta');
    const cardDesc = card.querySelector('.universe-card-desc');
    const cardBar = card.querySelector('.universe-card-bar');
    const cardLangs = card.querySelector('.universe-card-langs');
    const cardActions = card.querySelector('.universe-card-actions');
    const worldPos = new THREE.Vector3();
    let selected = -1;

    function fillCard(item) {
      cardTitle.textContent = item.title;
      cardBadge.hidden = !item.isNew;
      cardBadge.textContent = 'Under construction · new repo';
      cardMeta.textContent = [
        item.pushedAt ? 'Updated ' + formatDate(item.pushedAt) : '',
        formatBytes(item.size),
        item.stars > 0 ? '★ ' + item.stars : '',
        item.featuredKey ? 'Featured' : ''
      ].filter(Boolean).join(' · ');
      cardDesc.textContent = (item.description || 'No description yet.').slice(0, 180);

      const entries = Object.entries(item.langBytes || {}).filter(([, b]) => b > 0);
      const list = entries.length ? entries : [[item.lang, 1]];
      const total = list.reduce((sum, [, b]) => sum + b, 0);
      cardBar.innerHTML = '';
      cardLangs.innerHTML = '';
      list.forEach(([lang, bytes]) => {
        const pct = (bytes / total) * 100;
        if (pct < 2) return;
        const seg = document.createElement('span');
        seg.className = 'seg';
        seg.style.width = pct + '%';
        seg.style.background = colorOf(lang);
        cardBar.appendChild(seg);
      });
      list.slice(0, 4).forEach(([lang, bytes]) => {
        const span = document.createElement('span');
        span.className = 'universe-legend-item';
        const dot = document.createElement('span');
        dot.className = 'universe-dot';
        dot.style.background = colorOf(lang);
        span.append(dot, document.createTextNode(`${lang} ${Math.round((bytes / total) * 100)}%`));
        cardLangs.appendChild(span);
      });

      cardActions.innerHTML = '';
      const study = document.createElement('button');
      study.type = 'button';
      study.className = 'btn btn-primary btn-sm';
      study.textContent = item.featuredKey ? 'Case study' : 'Details';
      study.addEventListener('click', () => {
        deselect();
        window.dispatchEvent(new CustomEvent('open-project', { detail: modalDataFor(item) }));
      });
      cardActions.appendChild(study);
      const addLink = (href, label, cls) => {
        if (!/^https?:\/\//i.test(href || '')) return;
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = cls;
        a.textContent = label;
        cardActions.appendChild(a);
      };
      addLink(item.url, 'GitHub', 'btn btn-ghost btn-sm');
      addLink(item.live, 'Live demo', 'btn btn-ghost btn-sm');
    }

    function select(i) {
      selected = i;
      tooltip.hidden = true;
      fillCard(items[i]);
      card.hidden = false;
      stage.classList.add('has-card');
      goal.radius = mode === 'city' ? 9.5 : 7;
      if (mode === 'city') goal.phi = 0.7;
      lastInteract = performance.now();
      dirty = true;
      schedule();
    }

    function deselect() {
      if (selected < 0) return;
      selected = -1;
      card.hidden = true;
      stage.classList.remove('has-card');
      goal.tx = goal.ty = goal.tz = 0;
      goal.radius = baseRadius(mode);
      goal.phi = basePhi(mode);
      dirty = true;
      schedule();
    }

    card.querySelector('.universe-card-close').addEventListener('click', deselect);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selected >= 0 && !document.getElementById('project-modal').classList.contains('is-active')) deselect();
    });

    function frame() {
      rafId = 0;
      const t = (performance.now() - clockStart) / 1000;
      const nowMs = performance.now();
      const dt = Math.min(0.05, (nowMs - lastFrame) / 1000);
      lastFrame = nowMs;
      const idle = nowMs - lastInteract > 3500;

      // Mode morph (linear time, eased display)
      const target = mode === 'city' ? 1 : 0;
      const step = 1 / 90;
      progress += clamp(target - progress, -step, step);
      morph = easeInOut(progress);

      if (!reduceMotion && idle && down === null && selected < 0) goal.theta += 0.0016;
      for (const k of ['theta', 'phi', 'radius', 'tx', 'ty', 'tz']) cam[k] += (goal[k] - cam[k]) * 0.08;

      camera.position.set(
        cam.tx + cam.radius * Math.sin(cam.phi) * Math.cos(cam.theta),
        cam.ty + cam.radius * Math.cos(cam.phi),
        cam.tz + cam.radius * Math.sin(cam.phi) * Math.sin(cam.theta)
      );
      camera.lookAt(cam.tx, cam.ty, cam.tz);

      const planetS = 1 - smoothstep(0, 0.5, morph);
      const buildS = smoothstep(0.5, 1, morph);
      sun.scale.setScalar(Math.max(0.001, 1 - morph));
      sun.visible = morph < 0.99;
      sunLight.intensity = 90 * (1 - morph);
      cityLight.intensity = 1.4 * morph;
      ringMat.opacity = 0.16 * (1 - morph);
      groundMat.opacity = smoothstep(0.3, 1, morph);
      cityGroup.visible = buildS > 0.01;
      cityGroup.scale.y = Math.max(0.001, buildS);
      spaceGroup.visible = planetS > 0.01;
      spaceGroup.scale.setScalar(Math.max(0.001, planetS));
      scene.fog.color.setHex(morph > 0.5 ? 0x070a12 : 0x05060a);

      if (!reduceMotion) {
        belt.rotation.y += dt * 0.03;
        if (cityGroup.visible) {
          updateCars(dt);
          updateTram(dt);
          updatePeople(dt);
          updateDrones(t, dt);
          updateHeli(t, dt);
          updateFountains(t);
        }
        if (spaceGroup.visible) updateSpaceLife(t, dt);
      }
      if (cityGroup.visible) updateRain(reduceMotion ? 0 : dt);
      updateRockets(reduceMotion ? 0 : dt, t, planetS);
      updateComet(reduceMotion ? 0 : dt, planetS);
      nebulae.forEach(n => { n.material.opacity = 0.2 * planetS; n.visible = planetS > 0.01; });
      scene.fog.density = 0.018 + 0.01 * (rainMat.opacity / 0.4);

      if (selected >= 0) {
        nodes[selected].group.getWorldPosition(worldPos);
        goal.tx = worldPos.x;
        goal.ty = worldPos.y;
        goal.tz = worldPos.z;
      }

      nodes.forEach((n, i) => {
        const orbitT = reduceMotion ? 0 : t;
        const a = n.angle0 + orbitT * n.speed;
        const gx = Math.cos(a) * n.ringR;
        const gz = Math.sin(a) * n.ringR;
        const gy = Math.sin(a * 2 + i) * n.tilt;
        n.group.position.set(gx + (n.city.x - gx) * morph, gy * (1 - morph), gz + (n.city.z - gz) * morph);

        n.hover += ((hovered === i || selected === i ? 1 : 0) - n.hover) * 0.2;
        n.planet.scale.setScalar(Math.max(0.001, planetS * (1 + 0.2 * n.hover)));
        n.planet.visible = planetS > 0.01;
        const sy = Math.max(0.001, buildS);
        n.building.scale.y = sy;
        n.building.position.y = (n.height * sy) / 2;
        n.building.visible = buildS > 0.01;
        n.building.material.emissiveIntensity = n.baseGlow + 0.9 * n.hover;
        if (n.crane) {
          n.crane.group.visible = buildS > 0.01;
          n.crane.group.scale.y = sy;
          n.crane.top.rotation.y = reduceMotion ? 0 : Math.sin(t * 0.4 + i) * 0.7;
          n.crane.light.visible = Math.sin(t * 3 + i) > -0.2;
          n.scaffold.visible = buildS > 0.01;
          n.scaffold.scale.y = sy;
          n.scaffold.position.y = ((n.height + 0.25) * sy) / 2;
        }
        n.planet.rotation.y = orbitT * 0.4;

        const showLabel = items.length <= 12 || n.item.featuredKey || n.hover > 0.3;
        n.label.visible = showLabel;
        const galaxyY = n.radius * (1 + 0.2 * n.hover) * planetS + 0.8;
        const cityY = n.height * sy + 0.8;
        n.label.position.y = galaxyY * (1 - morph) + cityY * morph;
      });

      renderer.render(scene, camera);

      const moving = Math.abs(target - progress) > 0.0005 ||
        ['theta', 'phi', 'radius', 'tx', 'ty', 'tz'].some(k => Math.abs(goal[k] - cam[k]) > 0.001);
      dirty = moving;
      schedule();
    }

    function schedule() {
      if (rafId || !visible || document.hidden || gameOpen) return;
      if (reduceMotion && !dirty) return;
      rafId = requestAnimationFrame(frame);
    }

    let gameOpen = false;
    window.addEventListener('game-state', (e) => {
      gameOpen = !!e.detail;
      if (!gameOpen) { lastFrame = performance.now(); schedule(); }
    });

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      lastFrame = performance.now();
      schedule();
    }).observe(stage);
    document.addEventListener('visibilitychange', () => { lastFrame = performance.now(); schedule(); });

    setMode('galaxy');
    schedule();
  }
}
