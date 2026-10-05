/* Levtera Group — page behaviour: header, reveal, tilt, menu, form. */
(function () {
  'use strict';
  var body = document.body;
  var header = document.getElementById('siteHeader');
  var progress = document.getElementById('scrollProgress');
  var burger = document.getElementById('burger');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* header + progress */
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle('scrolled', y > 30);
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* mobile menu */
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  burger.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
  Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* active nav link */
  var links = Array.prototype.slice.call(document.querySelectorAll('#nav a'));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) so.observe(s); });

    /* reveal on scroll (staggered inside grids) */
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    ['.features', '.svc-grid', '.steps', '.contact-info'].forEach(function (sel) {
      var g = document.querySelector(sel);
      if (g) Array.prototype.forEach.call(g.querySelectorAll('.reveal'), function (el, i) { el.style.setProperty('--d', (i * 0.09) + 's'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { ro.observe(el); });
  } else {
    Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) { el.classList.add('in'); });
  }

  /* hero parallax (wall background drifts slower than content) */
  var hero = document.getElementById('hero');
  if (hero && !reduce) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight * 1.2) hero.style.backgroundPositionY = 'calc(50% + ' + (y * 0.25) + 'px)';
    }, { passive: true });
  }

  /* spotlight + 3D tilt on service cards (fine pointers only) */
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    Array.prototype.forEach.call(document.querySelectorAll('.tilt'), function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 5) + 'deg) rotateY(' + ((px - 0.5) * 6) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* contact form -> mailto (no backend) */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  function fillForm(msg, service) {
    if (!form) return;
    if (msg) form.elements.message.value = msg;
    if (service) form.elements.service.value = service;
  }
  window.addEventListener('viewer:quote', function (e) {
    fillForm(e.detail.message, e.detail.service);
    var c = document.getElementById('contact');
    if (c) c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { form.elements.name.focus({ preventScroll: true }); }, 700);
  });
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, ok = true;
      ['name', 'phone'].forEach(function (k) {
        var bad = !f[k].value.trim();
        f[k].classList.toggle('err', bad);
        if (bad) ok = false;
      });
      if (!ok) { note.textContent = 'გთხოვთ, შეავსოთ სახელი და ტელეფონი.'; return; }
      var subject = 'შეტყობინება საიტიდან — ' + f.service.value;
      var text = 'სახელი: ' + f.name.value.trim() + '\nტელეფონი: ' + f.phone.value.trim() + '\nსერვისი: ' + f.service.value + '\n\n' + f.message.value.trim();
      window.location.href = 'mailto:Levteragroup@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
      note.textContent = 'იხსნება თქვენი ელფოსტის აპლიკაცია. თუ არ გაიხსნა — დაგვირეკეთ: 544 44 26 37.';
    });
    form.addEventListener('input', function (e) { if (e.target.classList) e.target.classList.remove('err'); });
  }
})();
