export function initThreeHero() {
  const canvas = document.getElementById('three-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  scene.fog = new THREE.FogExp2(isLight ? 0xF4F4F7 : 0x09090C, 0.03);

  window.addEventListener('themeChanged', (e) => {
    scene.fog.color.setHex(e.detail.theme === 'light' ? 0xF4F4F7 : 0x09090C);
  });

  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight;

  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 100);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  const light1 = new THREE.PointLight(0xffffff, 3, 12);
  light1.position.set(4, 4, 4);
  scene.add(light1);

  const light2 = new THREE.PointLight(0x4488ff, 3.5, 10);
  light2.position.set(-4, -2, 2);
  scene.add(light2);

  const light3 = new THREE.PointLight(0x00D4C8, 3, 8);
  light3.position.set(0, -3, 3);
  scene.add(light3);

  // Main glass object
  const geo = new THREE.IcosahedronGeometry(1.4, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaacccc,
    metalness: 0.3,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Wireframe overlay
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x00D4C8, wireframe: true, transparent: true, opacity: 0.18 });
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.42, 1), wireMat);
  scene.add(wire);

  // Inner glow sphere
  const glowGeo = new THREE.SphereGeometry(0.9, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00D4C8, transparent: true, opacity: 0.04 });
  scene.add(new THREE.Mesh(glowGeo, glowMat));

  // Particles
  const pCount = 2000;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 18;
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.018, color: 0x6688aa, transparent: true, opacity: 0.55, sizeAttenuation: true });
  const particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  // Mouse
  let tx = 0, ty = 0;
  document.addEventListener('mousemove', e => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  let cx = 0, cy = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;

    mesh.rotation.y = t * 0.12 + cx * 0.4;
    mesh.rotation.x = cy * 0.25;
    mesh.position.y = Math.sin(t * 0.5) * 0.12;

    wire.rotation.copy(mesh.rotation);
    wire.position.copy(mesh.position);

    particles.rotation.y = t * 0.018;

    light3.intensity = 2.5 + Math.sin(t * 1.2) * 0.8;

    renderer.render(scene, camera);
  }
  animate();

  // Resize
  window.addEventListener('resize', () => {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
