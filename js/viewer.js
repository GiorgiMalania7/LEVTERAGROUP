/* Levtera Group — interactive 3D gabion configurator (fence / retaining wall). */
(function () {
  'use strict';
  var T = window.THREE, canvas = document.getElementById('viewerCanvas');
  if (!canvas) return;
  var wrap = canvas.parentNode;
  if (!T || !window.Rocks || !window.Rocks.webglOK()) { wrap.classList.add('no-webgl'); return; }

  var PAL_NAMES = { black: 'შავი ბაზალტი', grey: 'ნაცრისფერი ქვა', sand: 'ქვიშისფერი ქვა', river: 'მდინარის ქვა' };
  var CFG = {
    fence: { name: 'გაბიონის ღობე', lenMin: 2, lenMax: 12, lenStep: 1, lenDef: 6, heiMin: 0.5, heiMax: 2.5, heiStep: 0.1, heiDef: 1.6, depth: 0.22 },
    wall:  { name: 'საყრდენი კედელი', lenMin: 2, lenMax: 12, lenStep: 1, lenDef: 6, heiMin: 0.5, heiMax: 3, heiStep: 0.5, heiDef: 2, depth: 1.0 }
  };
  var state = { type: 'fence', len: 6, hei: 1.6, pal: 'black' };

  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  var scene = new T.Scene();
  scene.fog = new T.Fog(0x0b0b0c, 16, 40);
  var camera = new T.PerspectiveCamera(36, 1, 0.1, 100);

  scene.add(new T.HemisphereLight(0xd8cdb8, 0x0a0a0b, 0.7));
  var key = new T.DirectionalLight(0xffe0b0, 2.0); key.position.set(-6, 9, 7); scene.add(key);
  var rim = new T.DirectionalLight(0x9db0cc, 0.5); rim.position.set(7, 4, -6); scene.add(rim);
  var warm = new T.PointLight(0xb8935a, 1.3, 20); warm.position.set(3, 3, 6); scene.add(warm);

  /* ground */
  var ground = new T.Mesh(new T.CircleGeometry(1, 72), new T.MeshStandardMaterial({ color: 0x121213, roughness: 0.95, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01;
  scene.add(ground);
  var ring = new T.Mesh(new T.RingGeometry(0.985, 1, 96), new T.MeshBasicMaterial({ color: 0xb8935a, transparent: true, opacity: 0.55, side: T.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002;
  scene.add(ring);

  var model = new T.Group();
  scene.add(model);

  var postMat = new T.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.45, metalness: 0.8 });
  var capMat = window.Rocks.wireMaterial(0xb8935a);
  var soilMat = new T.MeshStandardMaterial({ color: 0x2b2118, roughness: 1 });
  var grassMat = new T.MeshStandardMaterial({ color: 0x2b3a25, roughness: 1 });
  var unit = new T.BoxGeometry(1, 1, 1);

  function clearModel() {
    for (var i = model.children.length - 1; i >= 0; i--) {
      var c = model.children[i];
      if (c.userData && c.userData.dispose) c.userData.dispose();
      model.remove(c);
    }
  }

  function build() {
    clearModel();
    var L = state.len, H = state.hei, pal = state.pal, avgD;
    var R = Math.max(L * 0.78, H * 2.4, 3.6) + 1.2;
    ground.scale.set(R, R, 1); ring.scale.set(R, R, 1);

    if (state.type === 'fence') {
      var n = Math.max(1, Math.ceil(L / 2)), pw = L / n, D = CFG.fence.depth;
      avgD = D;
      for (var i = 0; i < n; i++) {
        var b = window.Rocks.basket({
          w: pw - 0.09, h: H, d: D, stone: 0.13, palette: pal, seed: 10 + i, mesh: 0.1, thick: 0.008,
          faces: { front: true, back: true, left: i === 0, right: i === n - 1, top: true }, detail: 1
        });
        b.position.set(-L / 2 + pw * (i + 0.5), H / 2, 0);
        model.add(b);
      }
      for (var p = 0; p <= n; p++) {
        var post = new T.Mesh(unit, postMat); post.scale.set(0.1, H + 0.3, 0.1);
        post.position.set(-L / 2 + pw * p, (H + 0.3) / 2 - 0.02, 0); model.add(post);
        var cap = new T.Mesh(unit, capMat); cap.scale.set(0.125, 0.04, 0.125);
        cap.position.set(-L / 2 + pw * p, H + 0.3 - 0.02, 0); model.add(cap);
      }
    } else {
      var layers = Math.max(1, Math.round(H / 0.5)), lh = H / layers, baseD = CFG.wall.depth, step = 0.12, sum = 0;
      for (var l = 0; l < layers; l++) {
        var d = Math.max(0.45, baseD - l * step); sum += d;
        var bl = window.Rocks.basket({
          w: L, h: lh, d: d, stone: 0.16, palette: pal, seed: 30 + l, mesh: 0.1, thick: 0.009,
          faces: { front: true, back: false, left: true, right: true, top: l === layers - 1 }, detail: 1
        });
        bl.position.set(0, lh * (l + 0.5), -baseD / 2 + d / 2);
        model.add(bl);
      }
      avgD = sum / layers;
      var bank = new T.Mesh(unit, soilMat);
      bank.scale.set(L + 2.4, H * 0.985, 2.6);
      bank.position.set(0, H * 0.985 / 2, -baseD / 2 - 1.3); model.add(bank);
      var grass = new T.Mesh(unit, grassMat);
      grass.scale.set(L + 2.4, 0.06, 2.6);
      grass.position.set(0, H * 0.985 + 0.03, -baseD / 2 - 1.3); model.add(grass);
    }

    // camera framing
    viewer.target.set(0, H * 0.45, 0);
    viewer.baseDist = Math.max(L * 0.95, H * 3.2) + 3.2;
    updateStats(L, H, avgD);
    model.scale.setScalar(0.001);
    buildT = performance.now();
  }

  /* ---------- stats ---------- */
  var elVol = document.getElementById('vVol'), elArea = document.getElementById('vArea'), elUnits = document.getElementById('vUnits'), elUnitsLabel = document.getElementById('vUnitsLabel');
  function fmt(v) { return v.toFixed(1).replace(/\.0$/, ''); }
  function updateStats(L, H, d) {
    if (elVol) elVol.textContent = '≈ ' + fmt(L * H * d) + ' მ³';
    if (elArea) elArea.textContent = fmt(L * H) + ' მ²';
    if (state.type === 'fence') {
      if (elUnitsLabel) elUnitsLabel.textContent = 'სექცია (≈2 მ)';
      if (elUnits) elUnits.textContent = Math.ceil(L / 2);
    } else {
      if (elUnitsLabel) elUnitsLabel.textContent = 'რიგი (≈0.5 მ)';
      if (elUnits) elUnits.textContent = Math.max(1, Math.round(H / 0.5));
    }
    var out = document.getElementById('vLenVal'); if (out) out.textContent = fmt(L) + ' მ';
    out = document.getElementById('vHeiVal'); if (out) out.textContent = fmt(H) + ' მ';
  }

  /* ---------- orbit-lite controls ---------- */
  var viewer = { az: -0.55, el: 0.3, zoom: 1, target: new T.Vector3(), baseDist: 10 };
  var drag = null, lastInteract = -1e9, buildT = 0;
  canvas.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, az: viewer.az, el: viewer.el, touch: e.pointerType === 'touch' };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('grabbing');
    lastInteract = performance.now();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!drag) return;
    viewer.az = drag.az - (e.clientX - drag.x) * 0.008;
    if (!drag.touch) viewer.el = Math.max(0.04, Math.min(1.35, drag.el + (e.clientY - drag.y) * 0.006));
    lastInteract = performance.now();
  });
  function endDrag() { drag = null; canvas.classList.remove('grabbing'); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  function zoom(f) { viewer.zoom = Math.max(0.55, Math.min(1.5, viewer.zoom * f)); lastInteract = performance.now(); }
  var b;
  if ((b = document.getElementById('vZoomIn'))) b.addEventListener('click', function () { zoom(0.88); });
  if ((b = document.getElementById('vZoomOut'))) b.addEventListener('click', function () { zoom(1.14); });
  if ((b = document.getElementById('vReset'))) b.addEventListener('click', function () { viewer.az = -0.55; viewer.el = 0.3; viewer.zoom = 1; lastInteract = -1e9; });

  /* ---------- UI ---------- */
  var lenIn = document.getElementById('vLen'), heiIn = document.getElementById('vHei');
  var timer = 0;
  function schedule() { clearTimeout(timer); timer = setTimeout(build, 60); }
  function applyType(t) {
    state.type = t;
    var c = CFG[t];
    lenIn.min = c.lenMin; lenIn.max = c.lenMax; lenIn.step = c.lenStep; lenIn.value = state.len = c.lenDef;
    heiIn.min = c.heiMin; heiIn.max = c.heiMax; heiIn.step = c.heiStep; heiIn.value = state.hei = c.heiDef;
    Array.prototype.forEach.call(document.querySelectorAll('[data-vtype]'), function (el) {
      var on = el.getAttribute('data-vtype') === t;
      el.classList.toggle('active', on); el.setAttribute('aria-pressed', on);
    });
    build();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-vtype]'), function (el) {
    el.addEventListener('click', function () { applyType(el.getAttribute('data-vtype')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-pal]'), function (el) {
    el.addEventListener('click', function () {
      state.pal = el.getAttribute('data-pal');
      Array.prototype.forEach.call(document.querySelectorAll('[data-pal]'), function (o) {
        var on = o === el; o.classList.toggle('active', on); o.setAttribute('aria-pressed', on);
      });
      var nm = document.getElementById('vPalName'); if (nm) nm.textContent = PAL_NAMES[state.pal];
      build();
    });
  });
  lenIn.addEventListener('input', function () { state.len = parseFloat(lenIn.value); updateStats(state.len, state.hei, state.type === 'fence' ? CFG.fence.depth : 0.8); schedule(); });
  heiIn.addEventListener('input', function () { state.hei = parseFloat(heiIn.value); updateStats(state.len, state.hei, state.type === 'fence' ? CFG.fence.depth : 0.8); schedule(); });

  var q = document.getElementById('vQuote');
  if (q) q.addEventListener('click', function () {
    var msg = 'გამარჯობა! მაინტერესებს: ' + CFG[state.type].name + '. სიგრძე ≈ ' + fmt(state.len) + ' მ, სიმაღლე ≈ ' + fmt(state.hei) + ' მ, ქვა: ' + PAL_NAMES[state.pal] + '. გთხოვთ დამიკავშირდეთ.';
    window.dispatchEvent(new CustomEvent('viewer:quote', { detail: { message: msg, service: state.type === 'fence' ? 'გაბიონის ღობე' : 'გაბიონით მიწის საყრდენი' } }));
  });

  /* ---------- sizing / loop ---------- */
  function resize() {
    var r = wrap.getBoundingClientRect();
    var w = Math.max(10, r.width), h = Math.max(10, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var visible = false, running = false, last = performance.now();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !running) loop(); }, { threshold: 0.05 }).observe(wrap);
  } else { visible = true; }

  function easeOutBack(p) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }

  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!drag && now - lastInteract > 3500) viewer.az += dt * 0.16;
    var p = Math.min(1, (now - buildT) / 650);
    model.scale.setScalar(Math.max(0.001, p < 1 ? easeOutBack(p) : 1));
    var d = viewer.baseDist * viewer.zoom;
    camera.position.set(
      viewer.target.x + Math.sin(viewer.az) * d * Math.cos(viewer.el),
      viewer.target.y + Math.sin(viewer.el) * d,
      viewer.target.z + Math.cos(viewer.az) * d * Math.cos(viewer.el)
    );
    camera.lookAt(viewer.target);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  applyType('fence');
})();
