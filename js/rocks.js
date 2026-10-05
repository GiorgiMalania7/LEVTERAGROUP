/* Levtera Group — shared 3D helpers: procedural stones, wire mesh, gabion baskets.
   Requires global THREE (r128). Classic script so the site also works from file://  */
(function () {
  'use strict';
  const T = window.THREE;
  if (!T) return;

  /* ---------- seeded random ---------- */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- palettes ---------- */
  const PALETTES = {
    black: [0x2a2826, 0x353230, 0x1f1e1d, 0x3b3735, 0x2f2c2a],
    grey:  [0x6b6d6f, 0x7c7e80, 0x58595b, 0x8a8b8c, 0x727476],
    sand:  [0xb09a76, 0xc2ad88, 0x9a8663, 0xd0bd9a, 0xa89270],
    river: [0x7a6f64, 0x8c7d6c, 0x5f574f, 0x9b8e7b, 0x6e645a]
  };

  /* ---------- stone geometry (smooth blobby rock, baked aspect) ---------- */
  function n3(x, y, z, s) {
    return Math.sin(x * 3.1 + s) * Math.cos(y * 2.7 + s * 1.3) * 0.5 +
           Math.sin(z * 3.7 + s * 0.7 + x * 1.9) * 0.35 +
           Math.sin((x + y + z) * 5.3 + s) * 0.15;
  }
  const ASPECTS = [
    [1.0, 0.86, 0.95], [1.12, 0.8, 0.9], [0.92, 1.0, 1.0],
    [1.05, 0.9, 1.1], [0.98, 0.78, 0.92], [1.15, 0.95, 0.85]
  ];
  const geoCache = {};
  function stoneGeometry(variant, detail) {
    const key = variant + ':' + detail;
    if (geoCache[key]) return geoCache[key];
    const g = new T.IcosahedronGeometry(1, detail);
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    const v = new T.Vector3();
    const a = ASPECTS[variant % ASPECTS.length];
    const seed = variant * 7.13 + 1.7;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const r = 1 + n3(v.x, v.y, v.z, seed) * 0.17 + n3(v.x * 3.3, v.y * 3.3, v.z * 3.3, seed + 9) * 0.035;
      p.setXYZ(i, v.x * r * a[0], v.y * r * a[1], v.z * r * a[2]);
      // smooth, pebble-like shading
      nrm.setXYZ(i, v.x / a[0], v.y / a[1], v.z / a[2]);
    }
    g.attributes.position.needsUpdate = true;
    // normalise baked normals
    for (let i = 0; i < nrm.count; i++) {
      v.fromBufferAttribute(nrm, i).normalize();
      nrm.setXYZ(i, v.x, v.y, v.z);
    }
    geoCache[key] = g;
    return g;
  }

  /* ---------- procedural rock texture (bump) ---------- */
  let bumpTex = null;
  function getBump() {
    if (bumpTex) return bumpTex;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    const rand = rng(99);
    for (let i = 0; i < 256 * 256; i++) {
      const v = 90 + rand() * 120;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // pores
    for (let i = 0; i < 900; i++) {
      const px = rand() * 256, py = rand() * 256, pr = 1 + rand() * 4;
      const gr = x.createRadialGradient(px, py, 0, px, py, pr);
      gr.addColorStop(0, 'rgba(0,0,0,0.75)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr;
      x.beginPath(); x.arc(px, py, pr, 0, 7); x.fill();
    }
    bumpTex = new T.CanvasTexture(c);
    bumpTex.wrapS = bumpTex.wrapT = T.RepeatWrapping;
    bumpTex.repeat.set(2, 2);
    return bumpTex;
  }

  const matCache = {};
  function stoneMaterial() {
    if (!matCache.stone) {
      matCache.stone = new T.MeshStandardMaterial({
        color: 0xffffff, roughness: 0.94, metalness: 0.04,
        bumpMap: getBump(), bumpScale: 2.2
      });
    }
    return matCache.stone;
  }

  /* ---------- instanced stone field ---------- */
  const VARIANTS = 6;
  function createStones(count, paletteName, detail, seed) {
    detail = detail == null ? 2 : detail;
    const pal = PALETTES[paletteName] || PALETTES.black;
    const rand = rng(seed || 7);
    const group = new T.Group();
    const per = Math.ceil(count / VARIANTS);
    const meshes = [];
    const col = new T.Color();
    for (let v = 0; v < VARIANTS; v++) {
      const m = new T.InstancedMesh(stoneGeometry(v, detail), stoneMaterial(), per);
      m.frustumCulled = false;
      for (let i = 0; i < per; i++) {
        col.setHex(pal[Math.floor(rand() * pal.length)]);
        const k = 0.82 + rand() * 0.4;
        col.multiplyScalar(k);
        m.setColorAt(i, col);
      }
      m.instanceColor.needsUpdate = true;
      m.count = per;
      meshes.push(m);
      group.add(m);
    }
    return {
      group: group,
      count: count,
      setMatrix: function (i, matrix) {
        meshes[i % VARIANTS].setMatrixAt(Math.floor(i / VARIANTS), matrix);
      },
      commit: function () { for (let k = 0; k < meshes.length; k++) meshes[k].instanceMatrix.needsUpdate = true; },
      dispose: function () { meshes.forEach(function (m) { m.dispose(); }); }
    };
  }

  /* ---------- wire mesh (grid of thin bars in XY plane) ---------- */
  function wireMesh(w, h, spacing, thick, material) {
    const nx = Math.max(1, Math.round(w / spacing));
    const ny = Math.max(1, Math.round(h / spacing));
    const total = (nx + 1) + (ny + 1);
    const m = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), material, total);
    const d = new T.Object3D();
    let k = 0;
    for (let i = 0; i <= nx; i++) {
      d.position.set(-w / 2 + (w * i) / nx, 0, 0);
      d.scale.set(thick, h, thick);
      d.updateMatrix(); m.setMatrixAt(k++, d.matrix);
    }
    for (let j = 0; j <= ny; j++) {
      d.position.set(0, -h / 2 + (h * j) / ny, 0);
      d.scale.set(w, thick, thick);
      d.updateMatrix(); m.setMatrixAt(k++, d.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }

  function wireMaterial(hex) {
    return new T.MeshStandardMaterial({ color: hex == null ? 0xb8935a : hex, roughness: 0.38, metalness: 0.85 });
  }

  /* ---------- gabion basket ---------- */
  /* opts: w,h,d (metres), stone (approx diameter), palette, seed, mesh (wire spacing),
           thick (wire thickness), faces {front,back,left,right,top}, wireHex */
  function basket(o) {
    const w = o.w, h = o.h, d = o.d;
    const stone = o.stone || 0.16;
    const faces = Object.assign({ front: true, back: true, left: true, right: true, top: true }, o.faces || {});
    const rand = rng(o.seed || 3);
    const group = new T.Group();
    const wm = o.wireMat || wireMaterial(o.wireHex);

    // dark core so no gaps show between stones
    const core = new T.Mesh(
      new T.BoxGeometry(w * 0.985, h * 0.985, d * 0.985),
      new T.MeshStandardMaterial({ color: 0x100f0e, roughness: 1 })
    );
    group.add(core);

    const items = [];
    function face(lenU, lenV, place) {
      const cols = Math.max(1, Math.round(lenU / (stone * 0.95)));
      const rows = Math.max(1, Math.round(lenV / (stone * 0.88)));
      const su = lenU / cols, sv = lenV / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const off = (r % 2) * 0.5 - 0.25;
          let u = -lenU / 2 + (c + 0.5 + off) * su;
          u = Math.max(-lenU / 2 + su * 0.35, Math.min(lenU / 2 - su * 0.35, u));
          const v = -lenV / 2 + (r + 0.5) * sv;
          items.push(place(u + (rand() - 0.5) * su * 0.12, v + (rand() - 0.5) * sv * 0.1, Math.max(su, sv * 1.05) * (0.54 + rand() * 0.09)));
        }
      }
    }
    const inset = 0.3;
    if (faces.front) face(w, h, function (u, v, s) { return { x: u, y: v, z: d / 2 - s * inset, s: s }; });
    if (faces.back)  face(w, h, function (u, v, s) { return { x: u, y: v, z: -d / 2 + s * inset, s: s }; });
    if (faces.right) face(d, h, function (u, v, s) { return { x: w / 2 - s * inset, y: v, z: u, s: s }; });
    if (faces.left)  face(d, h, function (u, v, s) { return { x: -w / 2 + s * inset, y: v, z: u, s: s }; });
    if (faces.top)   face(w, d, function (u, v, s) { return { x: u, y: h / 2 - s * inset, z: v, s: s }; });

    const field = createStones(items.length, o.palette || 'black', o.detail == null ? 1 : o.detail, o.seed || 3);
    const dm = new T.Object3D();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      dm.position.set(it.x, it.y, it.z);
      dm.rotation.set(rand() * 6.28, rand() * 6.28, rand() * 6.28);
      dm.scale.setScalar(it.s);
      dm.updateMatrix();
      field.setMatrix(i, dm.matrix);
    }
    field.commit();
    group.add(field.group);

    // wire panels
    const spacing = o.mesh || 0.1;
    const t = o.thick || 0.011;
    function addWire(wU, hV, pos, rotY, rotX) {
      const m = wireMesh(wU, hV, spacing, t, wm);
      m.position.copy(pos);
      if (rotY) m.rotation.y = rotY;
      if (rotX) m.rotation.x = rotX;
      group.add(m);
    }
    const P = T.Vector3;
    if (faces.front) addWire(w, h, new P(0, 0, d / 2 + t * 0.5), 0, 0);
    if (faces.back)  addWire(w, h, new P(0, 0, -d / 2 - t * 0.5), 0, 0);
    if (faces.right) addWire(d, h, new P(w / 2 + t * 0.5, 0, 0), Math.PI / 2, 0);
    if (faces.left)  addWire(d, h, new P(-w / 2 - t * 0.5, 0, 0), Math.PI / 2, 0);
    if (faces.top)   addWire(w, d, new P(0, h / 2 + t * 0.5, 0), 0, Math.PI / 2);

    // frame (edges)
    const ft = Math.max(0.018, t * 1.9);
    const edgeGeo = new T.BoxGeometry(1, 1, 1);
    const addEdge = function (sx, sy, sz, x, y, z) {
      const e = new T.Mesh(edgeGeo, wm);
      e.scale.set(sx, sy, sz); e.position.set(x, y, z); group.add(e);
    };
    [-1, 1].forEach(function (a) {
      [-1, 1].forEach(function (b) {
        addEdge(ft, h + ft, ft, a * w / 2, 0, b * d / 2);
        if (a === 1) addEdge(w + ft, ft, ft, 0, b * h / 2, a * d / 2);
        if (a === 1) addEdge(w + ft, ft, ft, 0, b * h / 2, -a * d / 2);
      });
    });
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { addEdge(ft, ft, d + ft, a * w / 2, b * h / 2, 0); }); });

    group.userData.dispose = function () {
      field.dispose();
      group.traverse(function (n) { if (n.geometry && n.geometry !== edgeGeo) n.geometry.dispose(); });
      edgeGeo.dispose();
    };
    return group;
  }

  /* ---------- renderer helper ---------- */
  function webglOK() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  window.Rocks = {
    rng: rng,
    PALETTES: PALETTES,
    createStones: createStones,
    wireMesh: wireMesh,
    wireMaterial: wireMaterial,
    basket: basket,
    webglOK: webglOK
  };
})();
