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
