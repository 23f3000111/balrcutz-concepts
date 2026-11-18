/* Page behaviour shared by both concepts: smooth scrolling, anchor links, the header, the mobile menu,
   videos that only play while on screen, lazy map embeds, and the footer year. */
(() => {
  const BC = window.BC;
  BC.lenis = null;

  BC.scrollTo = (target, opts) => {
    opts = opts || {};
    if (typeof target === 'string') target = document.querySelector(target);
    if (target == null) return;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY - pad;
    if (BC.lenis) BC.lenis.scrollTo(y, { duration: opts.duration || Math.min(1.9, 0.8 + Math.abs(y - scrollY) / 4500), force: true });
    else scrollTo({ top: y, behavior: BC.reducedMotion() ? 'auto' : 'smooth' });
  };

  function smooth(mode) {
    if (BC.reducedMotion() || typeof window.Lenis === 'undefined' || matchMedia('(hover: none)').matches) return;
    const gsapOn = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    BC.lenis = new window.Lenis({ lerp: mode === 'calm' ? 0.075 : 0.12, wheelMultiplier: mode === 'calm' ? 0.9 : 1, smoothWheel: true, autoRaf: !gsapOn });
    if (gsapOn) {
      BC.lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((t) => BC.lenis.raf(t * 1000));
      window.gsap.ticker.lagSmoothing(0);
    }
  }

  function header() {
    const nav = BC.$('[data-nav]');
    if (!nav) return;
    let last = 0;
    const on = () => {
      const y = scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      nav.classList.toggle('is-hidden', y > 600 && y > last + 4 && !document.documentElement.classList.contains('menu-open'));
      if (y < last - 4) nav.classList.remove('is-hidden');
      last = y;
    };
    addEventListener('scroll', on, { passive: true });
    on();
    const links = BC.$$('[data-nav] a[href^="#"]');
    const map = links.map((a) => [a, document.querySelector(a.getAttribute('href'))]).filter((x) => x[1]);
    if ('IntersectionObserver' in window && map.length) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        map.forEach(([a, sec]) => a.classList.toggle('is-active', sec === e.target));
      }), { rootMargin: '-45% 0px -50% 0px' });
      map.forEach(([, sec]) => io.observe(sec));
    }
  }

  function menu() {
    const btn = BC.$('[data-menu-toggle]');
    const panel = BC.$('[data-menu]');
    if (!btn || !panel) return;
    const set = (open) => {
      document.documentElement.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      panel.toggleAttribute('inert', !open);
      if (BC.lenis) open ? BC.lenis.stop() : BC.lenis.start();
    };
    set(false);
    btn.addEventListener('click', () => set(!document.documentElement.classList.contains('menu-open')));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.documentElement.classList.contains('menu-open')) { set(false); btn.focus(); } });
  }

  function anchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-book') || a.hasAttribute('data-chat') || a.hasAttribute('data-desk')) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      BC.scrollTo(t);
      history.replaceState(null, '', id);
    });
    BC.$$('[data-top]').forEach((b) => b.addEventListener('click', () => BC.scrollTo(0)));
  }

  /* Videos marked data-autoplay play only while visible; reduced motion keeps the poster */
  function videos() {
    const vids = BC.$$('video[data-autoplay]');
    if (!vids.length) return;
    vids.forEach((v) => { v.muted = true; v.playsInline = true; v.setAttribute('muted', ''); });
    if (BC.reducedMotion() || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    }), { rootMargin: '120px 0px' });
    vids.forEach((v) => io.observe(v));
  }

  /* Hover-to-play tiles */
  function hoverVideos() {
    BC.$$('[data-hover-play]').forEach((tile) => {
      const v = tile.querySelector('video');
      if (!v || BC.reducedMotion()) return;
      tile.addEventListener('pointerenter', () => { v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); });
      tile.addEventListener('pointerleave', () => v.pause());
    });
  }

  /* Map iframes load when they come near the viewport */
  function maps() {
    const frames = BC.$$('iframe[data-src]');
    if (!frames.length) return;
    const load = (f) => { if (!f.src) f.src = f.getAttribute('data-src'); };
    if (!('IntersectionObserver' in window)) return frames.forEach(load);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } }), { rootMargin: '400px 0px' });
    frames.forEach((f) => io.observe(f));
  }

  /* ---------- panels (barber card, directions) ---------- */
  let openSheet = null;
  BC.sheet = (content, opts) => {
    opts = opts || {};
    if (openSheet) openSheet.close(true);
    const { h } = BC;
    const last = document.activeElement;
    const close = (instant) => {
      if (!wrap.isConnected) return;
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('sheet-open');
      if (BC.lenis && !document.documentElement.classList.contains('dk-open')) BC.lenis.start();
      openSheet = null;
      const done = () => wrap.remove();
      if (instant === true || BC.reducedMotion()) done(); else { wrap.classList.remove('is-in'); setTimeout(done, 260); }
      if (instant !== true && last && last.focus) last.focus({ preventScroll: true });
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const card = h('div.sheet-card' + (opts.className ? '.' + opts.className : ''), [
      h('button.sheet-x', { type: 'button', 'aria-label': 'Close', on: { click: () => close() } }, '×'),
      content,
    ]);
    const wrap = h('div.sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.label || 'Details', 'data-lenis-prevent': true, on: { click: (e) => { if (e.target === wrap) close(); } } }, card);
    document.body.appendChild(wrap);
    document.documentElement.classList.add('sheet-open');
    if (BC.lenis) BC.lenis.stop();
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => wrap.classList.add('is-in'));
    const x = card.querySelector('.sheet-x');
    if (x) x.focus({ preventScroll: true });
    openSheet = { close, el: wrap };
    return openSheet;
  };

  /* Directions: a route map inside the page (works in any viewer), from the visitor's location, a typed place or a
     nearby landmark, plus hand-offs to Google Maps and Waze */
  BC.directions = (clubId) => {
    const { h } = BC;
    const c = BC.data.clubs[clubId];
    if (!c) return;
    const dest = encodeURIComponent(c.mapsName);
    const frame = h('iframe', { title: 'Route to BalrCutz ' + c.name, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', src: c.embed });
    const status = h('p.dir-status', { 'aria-live': 'polite' }, 'Pick where you are starting from, or open the route in your maps app.');
    const input = h('input', { type: 'text', name: 'from', placeholder: 'Starting point, for example Bangsar', autocomplete: 'off', 'aria-label': 'Starting point' });
    const route = (from, label) => {
      frame.src = 'https://maps.google.com/maps?saddr=' + encodeURIComponent(from) + '&daddr=' + dest + '&output=embed';
      status.textContent = 'Route from ' + (label || from) + ' to ' + c.name + '.';
      gmaps.href = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(from) + '&destination=' + dest;
    };
    const mine = () => {
      if (!navigator.geolocation) { status.textContent = 'Your browser cannot share its location. Type your starting point instead.'; return; }
      status.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(
        (p) => route(p.coords.latitude.toFixed(5) + ',' + p.coords.longitude.toFixed(5), 'your location'),
        () => { status.textContent = 'Location is off or blocked. Type your starting point instead.'; input.focus(); },
        { timeout: 8000, maximumAge: 300000 });
    };
    const gmaps = h('a.btn.btn-red.dir-btn', { href: 'https://www.google.com/maps/dir/?api=1&destination=' + dest, target: '_blank', rel: 'noopener' }, 'Open in Google Maps');
    const copyBtn = h('button.dir-copy', { type: 'button', on: { click: () => BC.copy(c.address).then((ok) => { copyBtn.textContent = ok ? 'Copied' : 'Copy address'; }) } }, 'Copy address');
    /* controls on the left, the live route map on the right (stacked on narrow screens) */
    const body = h('div.dir', [
      h('div.dir-side', [
        h('p.sheet-kicker', 'Directions'),
        h('h2.sheet-title', 'BalrCutz ' + c.name),
        h('p.dir-addr', [c.address, ' ', copyBtn]),
        h('form.dir-from', { on: { submit: (e) => { e.preventDefault(); const v = input.value.trim(); if (v) route(v); else input.focus(); } } }, [input, h('button.btn.btn-light.dir-go', { type: 'submit' }, 'Show route')]),
        h('div.dir-chips', [h('button.dir-chip.is-me', { type: 'button', on: { click: mine } }, 'My location')].concat((c.from || []).map((f) => h('button.dir-chip', { type: 'button', on: { click: () => { input.value = f; route(f); } } }, f)))),
        status,
        h('div.dir-actions', [
          gmaps,
          h('a.btn.btn-ghost.dir-btn', { href: 'https://waze.com/ul?ll=' + c.lat + ',' + c.lng + '&navigate=yes', target: '_blank', rel: 'noopener' }, 'Open in Waze'),
          h('a.btn.btn-ghost.dir-btn', { href: 'tel:' + c.tel }, 'Call ' + c.phone),
        ]),
        h('p.dir-park', [h('strong', 'Parking: '), c.parking]),
      ]),
      h('div.dir-map', frame),
    ]);
    BC.sheet(body, { label: 'Directions to BalrCutz ' + c.name, className: 'is-dir' });
  };

  /* Barber card: bigger photo, who they are, what clients say about them by name, their next free chair */
  BC.barberCard = (id) => {
    const { h } = BC;
    const D = BC.data;
    const b = BC.barber(id);
    if (!b) return;
    const club = D.clubs[b.club];
    const order = D.barbers.map((x) => x.id);
    const i = order.indexOf(id);
    const said = D.reviews.filter((r) => r.barber === id).slice(0, 2);
    const cut = BC.svcAt('cut-wash', b.club);
    let next = null;
    for (let k = 0; k < 7 && !next && BC.book; k++) {
      const iso = BC.iso(BC.addDays(BC.today(), k));
      const s = BC.book.slots(b.club, b.id, iso, cut.dur)[0];
      if (s) next = { date: iso, time: s.t };
    }
    const dayWord = (iso) => (iso === BC.iso(BC.today()) ? 'today' : iso === BC.iso(BC.addDays(BC.today(), 1)) ? 'tomorrow' : BC.shortDate(iso));
    const go = (p) => { if (openSheet) openSheet.close(true); BC.book.open(p); };
    const body = h('div.bcard', [
      h('figure.bcard-photo', h('img', { src: BC.asset('img/team/' + b.id + '-sq.webp'), alt: (b.full || b.name) + ', barber at BalrCutz ' + club.name, width: 480, height: 480 })),
      h('div.bcard-body', [
        h('p.sheet-kicker', 'BalrCutz ' + club.short),
        h('h2.sheet-title', b.full || b.name),
        h('p.bcard-role', b.role + (b.years ? ', ' + b.years + ' years behind the chair' : '')),
        h('p.bcard-bio', b.bio),
        h('div.bcard-skills', b.skills.split(/,\s*/).map((s) => h('span', s))),
        next ? h('p.bcard-next', [h('span.next-dot', { 'aria-hidden': 'true' }), 'Next free chair: ', h('strong', dayWord(next.date) + ' at ' + BC.clock(next.time)), ' (cut and wash)']) : null,
        h('div.bcard-actions', [
          h('button.btn.btn-red', { type: 'button', on: { click: () => go({ barber: b.id, step: 1 }) } }, 'Book with ' + b.name),
          next ? h('button.btn.btn-ghost', { type: 'button', on: { click: () => go({ barber: b.id, svc: 'cut-wash', date: next.date, time: next.time, assigned: b.id, step: 2 }) } }, 'Take ' + dayWord(next.date) + ' ' + BC.clock(next.time)) : null,
        ]),
      ]),
      said.length ? h('div.bcard-said', [h('p.bcard-said-k', 'What clients say'), ...said.map((r) => h('blockquote', [h('p', r.text), h('footer', r.name + ', via ' + r.source)]))]) : null,
      h('div.bcard-nav', [
        h('button.bcard-step', { type: 'button', on: { click: () => BC.barberCard(order[(i - 1 + order.length) % order.length]) } }, ['← ', BC.barber(order[(i - 1 + order.length) % order.length]).name]),
        h('button.bcard-step', { type: 'button', on: { click: () => BC.barberCard(order[(i + 1) % order.length]) } }, [BC.barber(order[(i + 1) % order.length]).name, ' →']),
      ]),
    ]);
    BC.sheet(body, { label: (b.full || b.name) + ', barber', className: 'is-barber' });
  };

  document.addEventListener('click', (e) => {
    const d = e.target.closest('[data-directions]');
    if (d) { e.preventDefault(); BC.directions(d.getAttribute('data-directions')); return; }
    const c = e.target.closest('[data-barber-card]');
    if (c) { e.preventDefault(); BC.barberCard(c.getAttribute('data-barber-card')); }
  });

  BC.ui = {
    init(mode) {
      document.documentElement.classList.add('js');
      smooth(mode);
      header();
      menu();
      anchors();
      videos();
      hoverVideos();
      maps();
      BC.$$('[data-year]').forEach((n) => { n.textContent = new Date().getFullYear(); });
    },
  };
})();
