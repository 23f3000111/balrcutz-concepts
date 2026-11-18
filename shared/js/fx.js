/* Motion layer (GSAP, ScrollTrigger, SplitText; vendored). Two personalities, chosen per page:
   calm   (concept A): long, soft ease-outs, small distances, masked line rises, clip wipes. Nothing bounces.
   bouncy (concept B): overshoot and elastic eases, letters that drop and land, pops, tilts and a livelier ticker.
   Markup asks with data attributes; reduced motion or a missing library leaves everything still and visible.
   data-reveal="up|lines|words|chars|clip|wipe|fade|stagger|pop|rule|drop"  data-delay="0.2"  data-start="top 80%"
   data-parallax="-0.15"  data-count="1227" (data-decimals)  data-marquee (data-speed, data-dir)  data-magnetic  data-tilt  data-spin */
(() => {
  const BC = window.BC;
  const html = document.documentElement;
  BC.fx = { on: false, mode: 'calm' };

  /* Line splitting needs the real fonts, so the reveals wait for them (never longer than 1.6 s) */
  BC.fx.init = (mode) => {
    const go = () => start(mode);
    if (document.fonts && document.fonts.status !== 'loaded') Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1600))]).then(go);
    else go();
  };

  function start(mode) {
    const g = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
    BC.fx.mode = mode = mode || 'calm';
    /* fx-off: reduced motion, a missing library, or the page's safety timer already showed everything */
    if (!g || !ST || BC.reducedMotion() || html.classList.contains('fx-off')) { html.classList.remove('js-fx'); html.classList.add('fx-off'); return; }
    g.registerPlugin(ST);
    if (Split) g.registerPlugin(Split);
    BC.fx.on = true;
    const calm = mode === 'calm';

    /* CSS transitions on transform or opacity fight GSAP (a refresh can read a half-finished transition as the end state),
       so they are paused on anything being revealed and handed back when the reveal ends */
    const hush = (nodes) => {
      nodes.forEach((n) => { if (/all|transform|opacity|visibility|translate|rotate|scale/.test(getComputedStyle(n).transitionProperty)) { n.style.transition = 'none'; n.__hush = true; } });
      return () => nodes.forEach((n) => { if (n.__hush) { n.style.transition = ''; n.__hush = false; } });
    };

    BC.$$('[data-reveal]').forEach((el) => {
      if (el.closest('[data-reveal-manual]')) return;
      const type = el.getAttribute('data-reveal') || 'up';
      const delay = +(el.getAttribute('data-delay') || 0);
      const first = el.getBoundingClientRect().top + scrollY < innerHeight;
      const st = { trigger: el, start: el.getAttribute('data-start') || (first ? 'top bottom' : calm ? 'top 86%' : 'top 90%'), once: true };
      g.set(el, { visibility: 'visible' });

      if ((type === 'lines' || type === 'words' || type === 'chars' || type === 'drop') && Split) {
        const kind = type === 'chars' || type === 'drop' ? 'lines,chars' : type === 'words' ? 'lines,words' : 'lines';
        const s = new Split(el, { type: kind, mask: type === 'drop' ? undefined : 'lines', linesClass: 'fx-line' });
        const parts = type === 'chars' || type === 'drop' ? s.chars : type === 'words' ? s.words : s.lines;
        if (type === 'drop') {
          g.from(parts, { yPercent: -160, rotation: () => g.utils.random(-14, 14), autoAlpha: 0, duration: 1.15, ease: 'bounce.out', stagger: 0.055, delay, scrollTrigger: st });
        } else if (calm) {
          g.from(parts, { yPercent: 108, duration: type === 'chars' ? 1.2 : 1.35, ease: 'expo.out', stagger: type === 'chars' ? 0.022 : type === 'words' ? 0.045 : 0.11, delay, scrollTrigger: st });
        } else {
          g.from(parts, { yPercent: 120, rotation: type === 'lines' ? 0 : () => g.utils.random(-8, 8), duration: 0.9, ease: 'back.out(2.2)', stagger: type === 'chars' ? 0.03 : type === 'words' ? 0.06 : 0.1, delay, scrollTrigger: st });
        }
      } else if (type === 'clip') {
        const media = el.querySelector('img, video');
        if (calm) {
          g.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', delay, scrollTrigger: st, clearProps: 'clipPath' });
          if (media) g.fromTo(media, { scale: 1.16 }, { scale: 1, duration: 2.1, ease: 'expo.out', delay, scrollTrigger: st });
        } else {
          g.fromTo(el, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1.1, ease: 'back.out(1.4)', delay, scrollTrigger: st, clearProps: 'clipPath' });
          if (media) g.fromTo(media, { scale: 1.3, rotation: -4 }, { scale: 1, rotation: 0, duration: 1.3, ease: 'elastic.out(1, 0.6)', delay, scrollTrigger: st });
        }
      } else if (type === 'wipe') {
        g.fromTo(el, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: calm ? 1.4 : 0.8, ease: calm ? 'expo.inOut' : 'power4.out', delay, scrollTrigger: st, clearProps: 'clipPath' });
      } else if (type === 'rule') {
        g.from(el, { scaleX: 0, transformOrigin: 'left center', duration: calm ? 1.6 : 0.8, ease: calm ? 'expo.inOut' : 'elastic.out(1, 0.5)', delay, scrollTrigger: st });
      } else if (type === 'pop') {
        g.from(el, calm ? { autoAlpha: 0, scale: 0.97, duration: 1.2, ease: 'power3.out', delay, scrollTrigger: st, onComplete: hush([el]) }
          : { scale: 0.3, rotation: '-=14', autoAlpha: 0, duration: 1.1, ease: 'elastic.out(1, 0.5)', delay, scrollTrigger: st, onComplete: hush([el]) });
      } else if (type === 'stagger') {
        const kids = Array.from(el.children);
        const done = hush(kids);
        g.from(kids, calm ? { y: 26, autoAlpha: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, delay, scrollTrigger: st, onComplete: done }
          : { y: 70, scale: 0.86, rotation: () => g.utils.random(-5, 5), autoAlpha: 0, duration: 0.95, ease: 'back.out(2)', stagger: 0.075, delay, scrollTrigger: st, onComplete: done });
      } else if (type === 'fade') {
        const done = hush([el]);
        g.from(el, { autoAlpha: 0, duration: calm ? 1.5 : 0.8, ease: 'power2.out', delay, scrollTrigger: st, onComplete: done });
      } else {
        const done = hush([el]);
        g.from(el, calm ? { y: 32, autoAlpha: 0, duration: 1.2, ease: 'power3.out', delay, scrollTrigger: st, onComplete: done }
          : { y: 80, scale: 0.92, autoAlpha: 0, duration: 0.9, ease: 'back.out(1.9)', delay, scrollTrigger: st, onComplete: done });
      }
    });

    BC.$$('[data-parallax]').forEach((el) => {
      const amt = +el.getAttribute('data-parallax');
      g.fromTo(el, { yPercent: -amt * 50 }, { yPercent: amt * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: calm ? 1.2 : true } });
    });

    BC.$$('[data-spin]').forEach((el) => g.to(el, { rotation: 360, duration: +el.getAttribute('data-spin') || 20, ease: 'none', repeat: -1 }));

    BC.$$('[data-count]').forEach((el) => {
      const to = +el.getAttribute('data-count'), dec = +(el.getAttribute('data-decimals') || 0), o = { v: +(el.getAttribute('data-from') || 0) };
      const fmt = (v) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-GB');
      el.textContent = fmt(o.v);
      /* numbers never overshoot (a rating that reads 4.97 on the way to 4.96 looks like a mistake); the bouncy page pops the figure instead */
      g.to(o, { v: to, duration: calm ? 2.2 : 1.5, ease: calm ? 'power3.out' : 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true }, onUpdate: () => { el.textContent = fmt(Math.max(0, o.v)); },
        onComplete: () => { el.textContent = fmt(to); if (!calm) g.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.4)' }); } });
    });

    /* Marquees: duplicate the track, loop it, and let scroll speed push it along (harder in the bouncy concept) */
    const marquees = BC.$$('[data-marquee]').map((el) => {
      const track = el.firstElementChild;
      track.innerHTML += track.innerHTML;
      track.lastElementChild && Array.from(track.children).slice(track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));
      const right = el.getAttribute('data-dir') === 'right';
      return g.fromTo(track, { xPercent: right ? -50 : 0 }, { xPercent: right ? 0 : -50, duration: +(el.getAttribute('data-speed') || 30), ease: 'none', repeat: -1 });
    });
    if (marquees.length) {
      ST.create({ onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / (calm ? 900 : 350), calm ? 1.5 : 5);
        marquees.forEach((tw) => { g.to(tw, { timeScale: (self.direction < 0 && !calm ? -1 : 1) * (1 + v), duration: 0.2, overwrite: true }); g.to(tw, { timeScale: 1, duration: calm ? 1.6 : 1, delay: 0.25 }); });
      } });
    }

    if (!matchMedia('(hover: none)').matches) {
      BC.$$('[data-magnetic]').forEach((el) => {
        const x = g.quickTo(el, 'x', { duration: calm ? 0.8 : 0.5, ease: calm ? 'power3' : 'elastic.out(1, 0.4)' });
        const y = g.quickTo(el, 'y', { duration: calm ? 0.8 : 0.5, ease: calm ? 'power3' : 'elastic.out(1, 0.4)' });
        const k = calm ? 0.12 : 0.32;
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * k); y((e.clientY - r.top - r.height / 2) * k * 1.1); });
        el.addEventListener('pointerleave', () => { x(0); y(0); });
      });
      BC.$$('[data-tilt]').forEach((el) => {
        if (el.__tilt) return;
        el.__tilt = true;
        const rx = g.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = g.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
        g.set(el, { transformPerspective: 900 });
        el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 14); rx(-((e.clientY - r.top) / r.height - 0.5) * 12); });
        el.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }

    /* When the page changes height (booking steps, filtered grids, the menu switching club), every trigger below is measured
       against the old layout and fires late or never. Re-measure after any real change in height. */
    if ('ResizeObserver' in window) {
      let lastH = document.body.scrollHeight, t = null;
      new ResizeObserver(() => {
        const hgt = document.body.scrollHeight;
        if (Math.abs(hgt - lastH) < 4) return;
        lastH = hgt;
        clearTimeout(t);
        t = setTimeout(() => ST.refresh(), 180);
      }).observe(document.body);
    }

    html.classList.add('fx-ready');
    BC.emit('fx:ready', mode);
    addEventListener('load', () => ST.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
  }
})();
