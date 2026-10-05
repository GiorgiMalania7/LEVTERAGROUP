/* Levtera Group — intro: a gabion cage fills with stones, then the logo appears. */
(function () {
  'use strict';
  var intro = document.getElementById('intro');
  if (!intro) return;

  var body = document.body;
  var logo = document.getElementById('introLogo');
  var pctEl = document.getElementById('introPct');
  var barEl = document.getElementById('introBar');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finished = false, raf = 0, renderer = null, disposeScene = null;

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    intro.classList.add('out');
    body.classList.remove('intro-active');
    body.classList.add('ready');
    window.scrollTo(0, 0);
    setTimeout(function () {
      if (disposeScene) disposeScene();
      if (renderer) { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); }
      intro.parentNode && intro.parentNode.removeChild(intro);
      window.dispatchEvent(new Event('intro:done'));
    }, 1200);
  }

  document.getElementById('introSkip').addEventListener('click', finish);
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') finish(); });
  body.classList.add('intro-active');

  var T = window.THREE;
  var ok = T && window.Rocks && window.Rocks.webglOK() && !reduce;
  if (!ok) {
    intro.classList.add('static');
    pctEl.textContent = '100';
    barEl.style.transform = 'scaleX(1)';
    setTimeout(function () { logo.classList.add('show'); }, 250);
    setTimeout(finish, reduce ? 1500 : 3200);
    return;
  }

  /* ---------------- scene ---------------- */
  var canvas = document.getElementById('introCanvas');
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    intro.classList.add('static');
    setTimeout(function () { logo.classList.add('show'); }, 250);
    setTimeout(finish, 3000);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene = new T.Scene();
  scene.background = new T.Color(0x0a0a0b);
  scene.fog = new T.Fog(0x0a0a0b, 11, 28);

  var camera = new T.PerspectiveCamera(40, 1, 0.1, 80);

  var hemi = new T.HemisphereLight(0xd8cdb8, 0x0a0a0b, 0.6);
  var key = new T.DirectionalLight(0xffe0b0, 1.8); key.position.set(-4, 7, 8);
  var rim = new T.DirectionalLight(0x9db0cc, 0.4); rim.position.set(6, 3, -4);
  var glow = new T.PointLight(0xb8935a, 1.4, 16); glow.position.set(0, 2.4, 4.5);
  scene.add(hemi, key, rim, glow);

  /* cage */
  var W = 7, H = 4.2, D = 1.8;
  var wireMat = window.Rocks.wireMaterial(0x9b8560);
  var cage = new T.Group();
  function addWire(w, h, x, y, z, ry) {
    var m = window.Rocks.wireMesh(w, h, 0.5, 0.034, wireMat);
    m.position.set(x, y, z); m.rotation.y = ry || 0; cage.add(m);
  }
  addWire(W, H, 0, H / 2, D / 2, 0);
  addWire(W, H, 0, H / 2, -D / 2, 0);
  addWire(D, H, W / 2, H / 2, 0, Math.PI / 2);
  addWire(D, H, -W / 2, H / 2, 0, Math.PI / 2);
  var beam = new T.BoxGeometry(1, 1, 1);
  function addBeam(sx, sy, sz, x, y, z) {
    var b = new T.Mesh(beam, wireMat); b.scale.set(sx, sy, sz); b.position.set(x, y, z); cage.add(b);
  }
  [-1, 1].forEach(function (a) {
    [-1, 1].forEach(function (b) {
      addBeam(0.08, H, 0.08, a * W / 2, H / 2, b * D / 2);
      addBeam(0.08, 0.08, D, a * W / 2, H, 0);
    });
    addBeam(W, 0.08, 0.08, 0, H, a * D / 2);
    addBeam(W, 0.08, 0.08, 0, 0.04, a * D / 2);
  });
  scene.add(cage);

  /* floor */
  var floor = new T.Mesh(new T.PlaneGeometry(80, 80), new T.MeshStandardMaterial({ color: 0x0d0d0e, roughness: 0.92, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02;
  scene.add(floor);

  /* stones */
  var R = window.Rocks.rng(11);
  var cols = 11, rows = 8, layers = 3;
  var N = cols * rows * layers;
  var field = window.Rocks.createStones(N, 'black', 2, 11);
  scene.add(field.group);

  var rowH = (H - 0.12) / rows, zs = [-0.56, 0, 0.56];
  var G = 24, st = [], lastLand = 0, i = 0;
  for (var l = 0; l < layers; l++) {
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var off = ((r + l) % 2) * 0.5 - 0.25;
        var fx = -W / 2 + (c + 0.5 + off) * (W / cols);
        fx = Math.max(-W / 2 + 0.34, Math.min(W / 2 - 0.34, fx));
        var fy = 0.06 + (r + 0.5) * rowH + 0.05;
        var fz = zs[l] + (R() - 0.5) * 0.08;
        var y0 = H + 2.2 + R() * 2.4;
        var dur = Math.sqrt(2 * (y0 - fy) / G);
        var t0 = 0.5 + r * 0.38 + R() * 0.32;
        var s = 0.36 * (0.92 + R() * 0.22);
        st.push({
          fx: fx, fy: fy, fz: fz, y0: y0, dur: dur, t0: t0, s: s,
          sx: Math.max(-W / 2 + 0.34, Math.min(W / 2 - 0.34, fx + (R() - 0.5) * 0.9)),
          sz: Math.max(-0.6, Math.min(0.6, fz + (R() - 0.5) * 0.5)),
          rx: R() * 6.28, ry: R() * 6.28, rz: R() * 6.28,
          sp: [(R() - 0.5) * 9, (R() - 0.5) * 9, (R() - 0.5) * 9],
          bounce: 0.1 + R() * 0.12, landed: false
        });
        lastLand = Math.max(lastLand, t0 + dur);
        i++;
      }
    }
  }
  var tFill = lastLand + 0.35;

  var dm = new T.Object3D();
  var landed = 0, lastPct = -1;
  function ease(p) { return p * p; }

  function updateStones(t) {
    landed = 0;
    for (var k = 0; k < N; k++) {
      var o = st[k], q = t - o.t0;
      if (q <= 0) {
        dm.position.set(o.sx, 60, o.sz); dm.scale.setScalar(0.0001);
      } else if (q < o.dur) {
        var p = q / o.dur;
        var y = o.y0 - 0.5 * G * q * q;
        var xe = 1 - Math.pow(1 - p, 2);
        dm.position.set(o.sx + (o.fx - o.sx) * xe, y, o.sz + (o.fz - o.sz) * xe);
        var spin = 1 - ease(p);
        dm.rotation.set(o.rx + o.sp[0] * spin, o.ry + o.sp[1] * spin, o.rz + o.sp[2] * spin);
        dm.scale.setScalar(o.s);
      } else {
        var tb = q - o.dur;
        var bnc = Math.exp(-tb * 8) * Math.abs(Math.sin(tb * 14)) * o.bounce;
        dm.position.set(o.fx, o.fy + bnc, o.fz);
        dm.rotation.set(o.rx, o.ry, o.rz);
        dm.scale.setScalar(o.s);
        landed++;
      }
      dm.updateMatrix();
      field.setMatrix(k, dm.matrix);
    }
    field.commit();
  }

  /* ---------------- sizing ---------------- */
  var aspect = 1.78, dEnd = 5.4, dStart = 9;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    aspect = w / h;
    camera.aspect = aspect; camera.updateProjectionMatrix();
    var tanH = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    var targetW = Math.min(7.0, 4.4 * aspect);
    dEnd = (targetW / aspect) / (2 * tanH);
    dStart = Math.max(8.2, (W * 1.2 / aspect) / (2 * tanH) + 1.5);
  }
  window.addEventListener('resize', resize);
  resize();

  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener('pointermove', function (e) {
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function easeIO(p) { p = Math.max(0, Math.min(1, p)); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function lerp(a, b, p) { return a + (b - a) * p; }

  var tgt = new T.Vector3(0, H * 0.5, 0);
  var tLogo = tFill + 0.7, tEnd = tFill + 3.6;
  var logoShown = false, start = performance.now();

  function frame(now) {
    if (finished) return;
    var t = (now - start) / 1000;

    updateStones(t);

    // camera: orbit while filling, then dolly into the stone wall
    var pDolly = easeIO((t - (tFill - 0.5)) / 2.0);
    var az = lerp(-0.55 + Math.min(1, t / tFill) * 0.38, 0, pDolly);
    var el = lerp(0.2, 0.02, pDolly);
    var d = lerp(dStart, dEnd, pDolly);
    mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
    az += mx * 0.06 * (1 - pDolly * 0.6); el += -my * 0.03;
    camera.position.set(
      tgt.x + Math.sin(az) * d * Math.cos(el),
      tgt.y + Math.sin(el) * d + 0.1,
      tgt.z + Math.cos(az) * d * Math.cos(el)
    );
    camera.lookAt(tgt);

    renderer.toneMappingExposure = lerp(1.15, 0.78, pDolly);
    glow.intensity = lerp(1.4, 0.5, pDolly);

    // HUD
    var pct = Math.min(100, Math.round((landed / N) * 100));
    if (pct !== lastPct) {
      lastPct = pct; pctEl.textContent = pct;
      barEl.style.transform = 'scaleX(' + (pct / 100) + ')';
    }
    if (pct >= 100) intro.classList.add('filled');

    if (!logoShown && t > tLogo) { logoShown = true; logo.classList.add('show'); intro.classList.add('reveal'); }
    if (t > tEnd) { finish(); return; }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  disposeScene = function () {
    field.dispose();
    beam.dispose();
    scene.traverse(function (n) { if (n.geometry) n.geometry.dispose(); });
    window.removeEventListener('resize', resize);
  };
})();
