/* Procedural gabion-wall texture (dark basalt stones behind a steel grid).
   Painted once on a canvas and exposed as CSS variable --wall. */
(function () {
  'use strict';
  try {
    var W = 1400, H = 900;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d');
    var R = window.Rocks ? window.Rocks.rng(2024) : Math.random;

    x.fillStyle = '#0b0b0c';
    x.fillRect(0, 0, W, H);

    var stepY = 74, stepX = 84;
    for (var row = -1; row * stepY < H + stepY; row++) {
      for (var col = -1; col * stepX < W + stepX; col++) {
        var cx = col * stepX + (row % 2 ? stepX / 2 : 0) + (R() - 0.5) * 12;
        var cy = row * stepY + (R() - 0.5) * 10;
        var rx = 40 + R() * 9, ry = 33 + R() * 8;
        var pts = 16, rot = R() * 6.28;
        x.beginPath();
        for (var i = 0; i <= pts; i++) {
          var a = (i / pts) * 6.2832;
          var k = 1 + Math.sin(a * 3 + rot) * 0.07 + Math.sin(a * 5 + rot * 2) * 0.04;
          var px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
          i ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.closePath();
        var g = x.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, 4, cx, cy, rx * 1.1);
        var base = 34 + Math.floor(R() * 16);
        g.addColorStop(0, 'rgb(' + (base + 14) + ',' + (base + 11) + ',' + (base + 8) + ')');
        g.addColorStop(0.6, 'rgb(' + base + ',' + (base - 2) + ',' + (base - 5) + ')');
        g.addColorStop(1, 'rgb(14,13,12)');
        x.fillStyle = g;
        x.fill();
        // pores
        for (var p = 0; p < 26; p++) {
          var a2 = R() * 6.28, d2 = Math.sqrt(R());
          x.fillStyle = 'rgba(0,0,0,' + (0.25 + R() * 0.35) + ')';
          x.beginPath();
          x.arc(cx + Math.cos(a2) * rx * 0.85 * d2, cy + Math.sin(a2) * ry * 0.85 * d2, 0.8 + R() * 2.2, 0, 6.28);
          x.fill();
        }
      }
    }
    // grain
    for (var n = 0; n < 9000; n++) {
      x.fillStyle = 'rgba(255,240,220,' + R() * 0.05 + ')';
      x.fillRect(R() * W, R() * H, 1.4, 1.4);
    }
    // steel mesh
    x.lineWidth = 2.4;
    x.strokeStyle = 'rgba(0,0,0,0.7)';
    for (var gx = 0; gx <= W; gx += 112) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (var gy = 0; gy <= H; gy += 112) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
    x.lineWidth = 0.8;
    x.strokeStyle = 'rgba(184,147,90,0.14)';
    for (gx = 1; gx <= W; gx += 112) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
    for (gy = 1; gy <= H; gy += 112) { x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }

    var url = c.toDataURL('image/jpeg', 0.8);
    document.documentElement.style.setProperty('--wall', 'url(' + url + ')');
  } catch (e) { /* texture is decorative only */ }
})();
