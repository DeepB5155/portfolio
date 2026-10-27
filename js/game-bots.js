// Detailed humanoid bots for the Core Defense game. Hit meshes carry userData.part = 'head' | 'body' | 'legs'.

const boost = (hex, k = 2.2) => new THREE.Color(hex).multiplyScalar(k);

const LOOKS = {
  spam: { body: 0x2a303c, plate: 0x3d4656, accent: 0xff6a2c, visor: 0xff3b3b, ring: 0xff3b3b },
  ddos: { body: 0x2c2436, plate: 0x4d3f63, accent: 0xff2ea6, visor: 0xff3b3b, ring: 0xff2ea6 },
  boss: { body: 0x2b1640, plate: 0x55297f, accent: 0xb04dff, visor: 0xff2222, ring: 0xb04dff },
  legit: { body: 0xdfe7f2, plate: 0x9bb2d2, accent: 0x59ff9c, visor: 0x59ff9c, ring: 0x59ff9c }
};

export function createBotKit(labelTexture, { shadowsOn = false } = {}) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const sph = new THREE.SphereGeometry(0.5, 10, 8);
  const cone = new THREE.ConeGeometry(0.5, 1, 6);
  const torus = new THREE.TorusGeometry(0.5, 0.045, 6, 28);
  const ringGeo = new THREE.RingGeometry(0.5, 0.62, 28);
  const blobGeo = new THREE.CircleGeometry(0.6, 20);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x0f1318, roughness: 0.4, metalness: 0.8 });

  const kit = {};
  Object.entries(LOOKS).forEach(([kind, l]) => {
    kit[kind] = {
      body: new THREE.MeshStandardMaterial({ color: l.body, roughness: kind === 'legit' ? 0.7 : 0.5, metalness: kind === 'legit' ? 0.1 : 0.55, emissive: kind === 'legit' ? 0x6f86a8 : 0x000000, emissiveIntensity: 0.55 }),
      plate: new THREE.MeshStandardMaterial({ color: l.plate, roughness: 0.4, metalness: 0.6, emissive: kind === 'legit' ? 0x3d5170 : 0x000000, emissiveIntensity: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.45, metalness: 0.7 }),
      accent: new THREE.MeshBasicMaterial({ color: boost(l.accent) }),
      visor: new THREE.MeshBasicMaterial({ color: boost(l.visor, 2.6) }),
      ring: new THREE.MeshBasicMaterial({ color: boost(l.ring, 1.4), transparent: true, opacity: kind === 'legit' ? 0.75 : 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    };
  });
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });

  function build(kind, scale) {
    const m = kit[kind];
    const legit = kind === 'legit';
    const boss = kind === 'boss';
    const heavy = kind === 'ddos';
    const g = new THREE.Group();
    const parts = [];
    const deco = [];

    const make = (geo, mat, sx, sy, sz, x, y, z, parent, part) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      if (part) {
        mesh.userData.part = part;
        parts.push(mesh);
        if (shadowsOn) mesh.castShadow = true;
      } else {
        deco.push(mesh);
      }
      return mesh;
    };

    // Upper body pivots around the hips so hits can make it flinch
    const upper = new THREE.Group();
    upper.position.y = 0.8;
    g.add(upper);

    const tw = heavy ? 0.74 : boss ? 0.68 : legit ? 0.54 : 0.5;
    const td = heavy ? 0.42 : 0.3;
    const torso = make(box, m.body, tw, 0.68, td, 0, 0.35, 0, upper, 'body');
    make(box, m.plate, tw * 0.86, 0.34, td + 0.06, 0, 0.5, 0, upper, 'body');
    make(box, m.accent, tw * 0.5, 0.05, 0.02, 0, 0.42, td / 2 + 0.05, upper);
    if (!legit) make(box, m.accent, 0.05, 0.28, 0.02, 0, 0.5, td / 2 + 0.05, upper);
    make(box, m.dark, tw * 0.9, 0.12, td * 0.9, 0, -0.03, 0, upper, 'body');
    // Backpack with a blinking light
    const pack = make(box, m.dark, heavy ? 0.5 : 0.34, heavy ? 0.5 : 0.4, 0.16, 0, 0.42, -td / 2 - 0.1, upper, 'body');
    const blink = make(box, m.accent, 0.06, 0.06, 0.03, 0.08, 0.52, -td / 2 - 0.19, upper);

    // Head group
    const headG = new THREE.Group();
    headG.position.y = 0.88;
    upper.add(headG);
    const head = make(box, m.dark, 0.3, 0.3, 0.3, 0, 0, 0, headG, 'head');
    make(box, m.plate, 0.34, 0.12, 0.34, 0, 0.12, 0, headG, 'head');
    const visor = make(box, m.visor, 0.24, 0.08, 0.02, 0, 0.02, 0.16, headG, 'head');
    if (!legit) {
      make(box, m.dark, 0.05, 0.14, 0.2, 0.17, -0.02, 0, headG);
      make(box, m.dark, 0.05, 0.14, 0.2, -0.17, -0.02, 0, headG);
    }
    let halo = null;
    if (kind === 'spam') {
      make(cyl, m.dark, 0.02, 0.4, 0.02, 0.1, 0.32, -0.04, headG);
      make(sph, m.accent, 0.07, 0.07, 0.07, 0.1, 0.53, -0.04, headG);
    } else if (heavy) {
      make(box, m.plate, 0.38, 0.08, 0.2, 0, 0.2, 0.02, headG);
      make(cyl, m.dark, 0.03, 0.3, 0.03, -0.14, 0.3, -0.06, headG);
      make(cyl, m.dark, 0.03, 0.3, 0.03, 0.14, 0.3, -0.06, headG);
    } else if (boss) {
      const hornL = make(cone, m.accent, 0.1, 0.42, 0.1, -0.15, 0.28, 0, headG);
      const hornR = make(cone, m.accent, 0.1, 0.42, 0.1, 0.15, 0.28, 0, headG);
      hornL.rotation.z = 0.5; hornR.rotation.z = -0.5;
      halo = make(torus, m.accent, 1.1, 1.1, 1.1, 0, 0.1, -0.28, headG);
    } else {
      make(box, m.plate, 0.36, 0.08, 0.1, 0, 0.18, 0.22, headG);
    }

    // Arms, shoulders and gun
    const armL = new THREE.Group(); armL.position.set(-(tw / 2 + 0.1), 0.66, 0); upper.add(armL);
    const armR = new THREE.Group(); armR.position.set(tw / 2 + 0.1, 0.66, 0); upper.add(armR);
    const aw = heavy ? 0.2 : 0.14;
    make(box, m.body, aw, 0.6, aw, 0, -0.3, 0, armL, 'body');
    make(box, m.body, aw, 0.6, aw, 0, -0.3, 0.05, armR, 'body');
    make(box, m.dark, aw + 0.04, 0.12, aw + 0.04, 0, -0.62, 0, armL);
    const padW = heavy ? 0.34 : boss ? 0.36 : 0.24;
    make(box, m.plate, padW, 0.14, heavy ? 0.4 : 0.26, 0, 0.04, 0, armL, 'body');
    make(box, m.plate, padW, 0.14, heavy ? 0.4 : 0.26, 0, 0.04, 0, armR, 'body');
    if (boss) {
      const spL = make(cone, m.accent, 0.12, 0.34, 0.12, 0, 0.26, 0, armL); spL.rotation.z = 0.4;
      const spR = make(cone, m.accent, 0.12, 0.34, 0.12, 0, 0.26, 0, armR); spR.rotation.z = -0.4;
      make(sph, m.accent, 0.18, 0.18, 0.1, 0, 0.42, td / 2 + 0.04, upper);
    }
    if (!legit) {
      make(box, gunMat, 0.09, 0.12, 0.55, 0, -0.55, 0.3, armR);
      make(box, m.accent, 0.05, 0.05, 0.04, 0, -0.55, 0.6, armR);
      armR.rotation.x = -1.2;
    } else {
      make(box, m.accent, 0.1, 0.14, 0.14, 0, -0.5, 0.06, armR);
    }

    // Legs with boots and knee pads
    const legL = new THREE.Group(); legL.position.set(-0.15, 0.78, 0); g.add(legL);
    const legR = new THREE.Group(); legR.position.set(0.15, 0.78, 0); g.add(legR);
    const lw = heavy ? 0.26 : 0.2;
    [legL, legR].forEach(leg => {
      make(box, m.body, lw, 0.76, 0.22, 0, -0.38, 0, leg, 'legs');
      make(box, m.plate, lw + 0.03, 0.14, 0.26, 0, -0.34, 0.02, leg);
      make(box, m.dark, lw + 0.04, 0.12, 0.34, 0, -0.72, 0.05, leg, 'legs');
    });

    if (legit) {
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('USER', '#59ff9c'), transparent: true, depthWrite: false, fog: false }));
      tag.scale.set(1.5, 0.48, 1);
      tag.position.y = 2.3;
      g.add(tag);
    }

    // Ground ring (readability) and fake shadow blob
    const ring = new THREE.Mesh(ringGeo, m.ring);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.scale.setScalar(boss ? 1.5 : heavy ? 1.15 : 1);
    g.add(ring);
    if (!shadowsOn) {
      const blob = new THREE.Mesh(blobGeo, blobMat);
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.02;
      blob.scale.setScalar(boss ? 1.4 : 1);
      g.add(blob);
    }

    g.scale.setScalar(scale);
    return { g, parts, deco, torso, head, headG, upper, legL, legR, armL, armR, legit, blink, halo, ring };
  }

  return { build, kit };
}
