/* Concept B, Game Day: the first BalrCutz layout rebuilt with the booking engine, the chat and bouncy motion.
   Preloader, the ball that lands in the hero, services by club and type, jersey cards for the barbers, rotating reviews. */
(() => {
  const BC = window.BC;
  const { h } = BC;
  const D = BC.data;
  const g = () => (BC.reducedMotion() ? null : window.gsap);

  /* ---------- preloader: letters drop, the ball lands, the curtain lifts ---------- */
  function preloader(done) {
    const pre = BC.$('#pre');
    const G = g();
    if (!pre) return done();
    if (!G) { pre.remove(); return done(); }
    const letters = BC.$$('.pre-word span', pre), ball = BC.$('.pre-ball', pre);
    const tl = G.timeline({ onComplete: () => { pre.remove(); } });
    tl.from(letters, { yPercent: -260, rotation: () => G.utils.random(-25, 25), autoAlpha: 0, duration: 0.8, ease: 'bounce.out', stagger: 0.05 })
      .fromTo(ball, { y: -window.innerHeight * 0.6, rotation: -200, autoAlpha: 1 }, { y: 0, rotation: 0, duration: 0.9, ease: 'bounce.out' }, 0.25)
      .to(ball, { scale: 1.25, duration: 0.18, ease: 'power2.out' }, '>-0.05')
      .to(ball, { scale: 0, duration: 0.25, ease: 'back.in(2)' })
      .add(() => done(), '-=0.05')
      .to(pre, { yPercent: -100, duration: 0.75, ease: 'power4.inOut' }, '-=0.05');
  }

  /* ---------- the ball in the hero ---------- */
  function heroBall() {
    const ball = BC.$('#hero-ball');
    const G = g();
    if (!ball) return;
    if (!G) { ball.style.opacity = 1; return; }
    const drop = () => G.timeline()
      .fromTo(ball, { y: -window.innerHeight, rotation: -540, autoAlpha: 1 }, { y: 0, rotation: 0, duration: 1.5, ease: 'bounce.out' })
      .fromTo(ball, { scaleY: 1, scaleX: 1 }, { scaleY: 0.86, scaleX: 1.1, duration: 0.09, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '50% 100%' }, 0.55);
    G.delayedCall(0.55, drop);
    let busy = false;
    ball.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      G.timeline({ onComplete: () => { busy = false; } })
        .to(ball, { y: -220, rotation: '+=360', duration: 0.45, ease: 'power2.out' })
        .to(ball, { y: 0, duration: 1.1, ease: 'bounce.out' })
        .fromTo(ball, { scaleY: 1 }, { scaleY: 0.86, scaleX: 1.1, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: '50% 100%' }, 0.75);
    });
    ball.addEventListener('pointerenter', () => G.to(ball, { rotation: '+=25', duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
  }

  /* ---------- services ---------- */
  let svcClub = 'jayaone', svcCat = 'hair';
  const CAT_TABS = [['first', 'First visit'], ['hair', 'Haircuts'], ['signature', 'Signature'], ['extras', 'Beard and finishing'], ['face', 'Face care'], ['colour', 'Colour'], ['scalp', 'Scalp care'], ['other', 'Straightening'], ['all', 'Everything']];
  function services(animate) {
    const menu = BC.menu(svcClub);
    const pills = BC.$('#svc-pills');
    pills.innerHTML = '';
    CAT_TABS.filter(([id]) => id === 'all' || menu.some((m) => m.cat === id)).forEach(([id, name]) => {
      pills.appendChild(h('button.pill', { type: 'button', 'aria-pressed': String(id === svcCat), on: { click: () => { svcCat = id; services(true); } } }, name));
    });
    if (svcCat !== 'all' && !menu.some((m) => m.cat === svcCat)) svcCat = 'hair';
    const grid = BC.$('#svc-grid');
    grid.innerHTML = '';
    menu.filter((m) => svcCat === 'all' || m.cat === svcCat).forEach((m) => {
      const cat = D.cats.find((c) => c.id === m.cat);
      const featured = m.id === 'mvp' || m.id === 'vip';
      grid.appendChild(h('article.svc' + (featured ? '.is-featured' : ''), { 'data-tilt': true }, [
        m.cat === 'first' ? h('span.svc-badge', 'First visit') : featured ? h('span.svc-badge', 'Signature') : h('span.svc-cat', cat.name),
        h('h3.svc-name', BC.plus(m.name)),
        m.full ? h('p.svc-full', m.full) : null,
        h('p.svc-blurb', m.blurb || ''),
        h('div.svc-foot', [h('b.svc-price', BC.money(m.price)), h('span.svc-dur', BC.dur(m.dur)), h('button.svc-book', { type: 'button', 'data-book': 'svc:' + m.id + ',club:' + svcClub + ',step:1' }, 'Book')]),
      ]));
    });
    BC.$$('[data-svc-club]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.svcClub === svcClub)));
    const G = g();
    if (animate && G) G.from(grid.children, { y: 40, scale: 0.9, rotation: () => G.utils.random(-4, 4), autoAlpha: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.05 });
    tilt(grid);
  }

  /* ---------- the roster: jerseys that flip ---------- */
  let teamClub = 'all';
  function team(animate) {
    const grid = BC.$('#team-grid');
    grid.innerHTML = '';
    BC.teamAt(teamClub === 'all' ? null : teamClub).forEach((b) => {
      const num = b.years ? String(b.years).padStart(2, '0') : '00';
      const card = h('article.jersey', { tabindex: '0', 'aria-label': (b.full || b.name) + ', ' + D.clubs[b.club].name }, h('div.jersey-inner', [
        h('div.jersey-front', { 'aria-hidden': 'true' }, [
          h('div.jersey-shirt', [h('span.jersey-name', b.name.toUpperCase()), h('span.jersey-num', num), h('img.jersey-mark', { src: BC.asset('img/logo/mark-maroon.png'), alt: '' })]),
          h('span.jersey-club', D.clubs[b.club].name),
        ]),
        h('div.jersey-back', [
          h('img.jersey-photo', { src: BC.asset(b.photo + '-bw.webp'), alt: '', loading: 'lazy', width: 120, height: 150 }),
          h('h3', b.full || b.name),
          h('p.jersey-role', b.role + (b.years ? ', ' + b.years + ' years' : '')),
          h('p.jersey-skills', b.skills),
          h('button.btn.btn-red.btn-sm', { type: 'button', 'data-book': 'barber:' + b.id + ',step:1' }, 'Book ' + b.name),
          h('button.jersey-more', { type: 'button', 'data-barber-card': b.id }, 'Profile and reviews'),
        ]),
      ]));
      card.addEventListener('click', (e) => { if (!e.target.closest('button')) card.classList.toggle('is-flipped'); });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === card) card.classList.toggle('is-flipped'); });
      grid.appendChild(card);
    });
    BC.$$('[data-team]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.team === teamClub)));
    const G = g();
    if (animate && G) G.from(grid.children, { y: -60, rotation: () => G.utils.random(-10, 10), autoAlpha: 0, duration: 0.9, ease: 'bounce.out', stagger: 0.07 });
  }

  /* ---------- reviews ---------- */
  function testimonials() {
    const list = D.reviews.filter((r) => r.rotate !== false);
    const text = BC.$('#testi-text'), author = BC.$('#testi-author'), source = BC.$('#testi-source'), dots = BC.$('#testi-dots');
    let i = 0, timer = null;
    list.forEach((r, k) => dots.appendChild(h('button.testi-dot', { type: 'button', 'aria-label': 'Review ' + (k + 1) + ' of ' + list.length, 'aria-pressed': String(k === 0), on: { click: () => { show(k); auto(); } } })));
    const put = () => {
      const r = list[i];
      text.textContent = r.text;
      author.textContent = r.name;
      source.textContent = 'via ' + r.source + ', BalrCutz ' + D.clubs[r.club].name;
      BC.$$('.testi-dot', dots).forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
    };
    const show = (k) => {
      i = (k + list.length) % list.length;
      const G = g();
      if (!G) return put();
      const card = BC.$('.testi-card');
      G.timeline().to(card, { y: -30, scale: 0.92, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }).add(put).fromTo(card, { y: 50, scale: 0.9, rotation: -2 }, { y: 0, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.8, ease: 'elastic.out(1, 0.55)' });
    };
    const auto = () => { clearInterval(timer); if (!BC.reducedMotion()) timer = setInterval(() => show(i + 1), 6500); };
    put();
    auto();
  }

  /* ---------- locations ---------- */
  function locations() {
    const grid = BC.$('#loc-grid');
    Object.values(D.clubs).forEach((c) => {
      grid.appendChild(h('article.loc', { 'data-tilt': true }, [
        h('div.loc-map', h('iframe', { 'data-src': c.embed, title: 'Map of BalrCutz ' + c.name, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' })),
        h('div.loc-body', [
          h('h3.loc-name', [c.name.toUpperCase(), h('span.loc-badge', c.id === 'jayaone' ? 'The original' : 'VIP Room')]),
          h('ul.loc-rows', [
            h('li', [ico('pin'), c.address]),
            h('li', [ico('clock'), 'Every day, 10am to 11pm']),
            h('li', [ico('phone'), h('a', { href: 'tel:' + c.tel }, c.phone)]),
            h('li', [ico('star'), c.rating.toFixed(1) + ' on Google from ' + c.reviews.toLocaleString('en-GB') + ' reviews']),
            h('li', [ico('car'), c.parking]),
          ]),
          h('div.loc-btns', [h('button.btn.btn-red.btn-sm', { type: 'button', 'data-book': 'club:' + c.id + ',step:1' }, 'Book ' + c.name), h('a.btn.btn-outline.btn-sm', { href: c.maps, target: '_blank', rel: 'noopener', 'data-directions': c.id }, 'Get directions')]),
        ]),
      ]));
    });
  }
  const ICONS = {
    pin: 'M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
    star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z',
    car: 'M5 17h14M6 17v2M18 17v2M3 13l2-6h14l2 6v4H3zM7.5 13.5h.01M16.5 13.5h.01',
  };
  function ico(name) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONS[name]); svg.appendChild(p);
    return svg;
  }

  /* Pointer tilt for cards made after the motion layer started */
  function tilt(root) {
    const G = g();
    if (!G || matchMedia('(hover: none)').matches) return;
    BC.$$('[data-tilt]', root).forEach((el) => {
      if (el.__tilt) return;
      el.__tilt = true;
      const rx = G.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = G.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      G.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 12); rx(-((e.clientY - r.top) / r.height - 0.5) * 10); });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  function backTop() {
    const b = BC.$('.back-top');
    if (!b) return;
    const on = () => b.classList.toggle('is-on', scrollY > 700);
    addEventListener('scroll', on, { passive: true });
    on();
  }

  /* Buttons squash a little when pressed */
  function squash() {
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.btn, .svc-book, .pill, .nav-book');
      const G = g();
      if (!b || !G) return;
      G.fromTo(b, { scaleX: 1.08, scaleY: 0.9 }, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.35)', overwrite: 'auto' });
    });
  }

  function init() {
    services(false);
    team(false);
    testimonials();
    locations();
    BC.$$('[data-svc-club]').forEach((b) => b.addEventListener('click', () => { svcClub = b.dataset.svcClub; services(true); }));
    BC.$$('[data-team]').forEach((b) => b.addEventListener('click', () => { teamClub = b.dataset.team; team(true); }));
    BC.book.main = BC.book.mount(BC.$('#bk-main'), { source: 'Website', offset: 96 });
    BC.chatMount({ label: 'Book or ask Coach' });
    BC.ui.init('bouncy');
    backTop();
    squash();
    preloader(() => {
      BC.fx.init('bouncy');
      heroBall();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
