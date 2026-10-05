/* Levtera Group — hero 3D gabion block (slow rotation, mouse parallax, floating stones, gold dust). */
(function () {
  'use strict';
  var T = window.THREE, host = document.getElementById('heroCanvas');
  if (!host || !T || !window.Rocks || !window.Rocks.webglOK()) { if (host) host.parentNode.classList.add('no-webgl'); return; }

  var renderer = new T.WebGLRenderer({ canvas: host, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(0, 1.3, 8.2);

  scene.add(new T.HemisphereLight(0xd8cdb8, 0x0a0a0b, 0.65));
  var key = new T.DirectionalLight(0xffe0b0, 2.0); key.position.set(-4, 6, 6); scene.add(key);
  var rim = new T.DirectionalLight(0x9db0cc, 0.55); rim.position.set(5, 2, -5); scene.add(rim);
  var gl = new T.PointLight(0xb8935a, 1.6, 14); gl.position.set(2.5, 0.5, 4); scene.add(gl);

  var pivot = new T.Group();
  scene.add(pivot);

  var bw = 3.5, bh = 2.1, bd = 1.5;
  var block = window.Rocks.basket({ w: bw, h: bh, d: bd, stone: 0.23, palette: 'black', seed: 5, mesh: 0.35, thick: 0.02, detail: 2 });
  block.position.y = 0;
  pivot.add(block);

  // a few loose stones around the block
  var loose = window.Rocks.createStones(9, 'black', 2, 21);
  var R = window.Rocks.rng(8), dm = new T.Object3D(), floaters = [];
  for (var i = 0; i < 9; i++) {
    var a = (i / 9) * 6.28 + R(), rad = 2.9 + R() * 1.1;
    floaters.push({ a: a, rad: rad, y: -0.9 + R() * 2.4, s: 0.1 + R() * 0.16, sp: 0.12 + R() * 0.2, ph: R() * 6.28, rx: R() * 6, ry: R() * 6 });
  }
  pivot.add(loose.group);

  // shadow blob
  var sc = document.createElement('canvas'); sc.width = sc.height = 128;
  var sx = sc.getContext('2d'), sg = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
  sg.addColorStop(0, 'rgba(0,0,0,0.75)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = sg; sx.fillRect(0, 0, 128, 128);
  var shadow = new T.Mesh(new T.PlaneGeometry(7, 7), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -bh / 2 - 0.35;
  scene.add(shadow);

  // gold dust
  var dn = 140, dp = new Float32Array(dn * 3);
  for (var k = 0; k < dn; k++) { dp[k * 3] = (R() - 0.5) * 11; dp[k * 3 + 1] = (R() - 0.5) * 6; dp[k * 3 + 2] = (R() - 0.5) * 8; }
  var dg = new T.BufferGeometry(); dg.setAttribute('position', new T.BufferAttribute(dp, 3));
  var dust = new T.Points(dg, new T.PointsMaterial({ color: 0xd9b97f, size: 0.035, transparent: true, opacity: 0.65, depthWrite: false }));
  scene.add(dust);

  function resize() {
    var r = host.parentNode.getBoundingClientRect();
    var w = Math.max(10, r.width), h = Math.max(10, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 11.5 : 8.2;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var mx = 0, my = 0, tx = 0, ty = 0, visible = true, running = false, t0 = performance.now();
  window.addEventListener('pointermove', function (e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !running) loop(); }, { threshold: 0.02 }).observe(host);
  }

  function loop() {
    if (!visible) { running = false; return; }
    running = true;
    var t = (performance.now() - t0) / 1000;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    pivot.rotation.y = -0.5 + t * 0.22 + mx * 0.35;
    pivot.rotation.x = 0.16 + my * 0.08;
    pivot.position.y = Math.sin(t * 0.9) * 0.06;
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i], an = f.a + t * f.sp * 0.4;
      dm.position.set(Math.cos(an) * f.rad, f.y + Math.sin(t * f.sp * 2 + f.ph) * 0.2, Math.sin(an) * f.rad * 0.8);
      dm.rotation.set(f.rx + t * 0.3, f.ry + t * 0.2, 0);
      dm.scale.setScalar(f.s);
      dm.updateMatrix(); loose.setMatrix(i, dm.matrix);
    }
    loose.commit();
    dust.rotation.y = t * 0.02;
    dust.position.y = Math.sin(t * 0.3) * 0.15;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
})();
