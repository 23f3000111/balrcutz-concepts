/* Concept A, The Clubhouse: renders the menu, roster, clubs and reviews from BC.data, mounts the booking widget and the chat,
   and runs the calm motion personality. */
(() => {
  const BC = window.BC;
  const { h } = BC;
  const D = BC.data;

  /* Hero finder: pre-fills the booking widget and jumps to the time step */
  function finder() {
    const f = BC.$('#finder');
    if (!f) return;
    const club = f.elements.namedItem('club'), svc = f.elements.namedItem('svc'), barber = f.elements.namedItem('barber');
    const fill = () => {
      const c = club.value, keep = svc.value;
      svc.innerHTML = '';
      BC.menu(c).filter((m) => !m.addon).forEach((m) => svc.appendChild(h('option', { value: m.id }, m.name + ', ' + BC.money(m.price))));
      svc.value = BC.svcAt(keep, c) ? keep : 'cut-wash';
      const kb = barber.value;
      barber.innerHTML = '';
      barber.appendChild(h('option', { value: 'any' }, 'Any barber'));
      BC.teamAt(c).forEach((b) => barber.appendChild(h('option', { value: b.id }, b.name)));
      barber.value = BC.barber(kb) && BC.barber(kb).club === c ? kb : 'any';
    };
    club.addEventListener('change', fill);
    fill();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      BC.book.open({ club: club.value, svc: svc.value, barber: barber.value === 'any' ? null : barber.value, step: 2 });
    });
  }

  /* The menu: two columns of categories, dotted leaders, a line per service */
  let menuClub = 'jayaone';
  function menu() {
    const box = BC.$('#menu-list');
    const items = BC.menu(menuClub);
    const left = ['first', 'hair', 'extras'], right = ['face', 'colour', 'scalp', 'other', 'signature'];
    const col = (ids) => h('div.menu-col', ids.map((cid) => {
      const rows = items.filter((m) => m.cat === cid);
      if (!rows.length) return null;
      const cat = D.cats.find((c) => c.id === cid);
      return h('div.menu-group', [
        h('h3.menu-cat', cat.name),
        h('ul', rows.map((m) => h('li', h('button.mrow' + (cid === 'first' ? '.is-first' : ''), { type: 'button', 'data-book': 'svc:' + m.id + ',club:' + menuClub + ',step:1', 'aria-label': 'Book ' + m.name + ', ' + BC.money(m.price) }, [
          h('span.mrow-name', [h('span', BC.plus(m.name)), m.full ? h('small', m.full) : null]),
          h('span.mrow-dots', { 'aria-hidden': 'true' }),
          h('span.mrow-dur', BC.dur(m.dur)),
          h('span.mrow-price', BC.money(m.price)),
        ])))),
      ]);
    }));
    box.innerHTML = '';
    box.append(col(left), col(right));
    BC.$$('[data-menu-club]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.menuClub === menuClub)));
  }

  /* Roster: names set large; a portrait follows the pointer on hover */
  let rosterClub = 'all';
  function roster() {
    const list = BC.$('#roster-list');
    list.innerHTML = '';
    BC.teamAt(rosterClub === 'all' ? null : rosterClub).forEach((b) => {
      list.appendChild(h('li.rrow', { data: { photo: BC.asset(b.photo + '-bw.webp') } }, h('button.rrow-btn', { type: 'button', 'data-book': 'barber:' + b.id + ',step:1' }, [
        h('img.rrow-thumb', { src: BC.asset(b.photo + '-bw.webp'), alt: '', loading: 'lazy', width: 64, height: 80 }),
        h('span.rrow-name', b.full || b.name),
        h('span.rrow-meta', [h('span.rrow-role', b.role + (b.years ? ', ' + b.years + ' years' : '')), h('span.rrow-skill', b.skills)]),
        h('span.rrow-club', D.clubs[b.club].name),
        h('span.rrow-cta', 'Book ' + b.name),
      ])));
    });
    BC.$$('[data-roster]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.roster === rosterClub)));
  }
  function rosterFloat() {
    const fig = BC.$('.roster-float'), img = fig && fig.querySelector('img'), sec = BC.$('#barbers');
    if (!fig || matchMedia('(hover: none)').matches) return;
    const g = window.gsap;
    let qx = null, qy = null;
    if (g && !BC.reducedMotion()) { qx = g.quickTo(fig, 'x', { duration: 0.7, ease: 'power3' }); qy = g.quickTo(fig, 'y', { duration: 0.7, ease: 'power3' }); }
    sec.addEventListener('pointermove', (e) => {
      const r = sec.getBoundingClientRect();
      const x = e.clientX - r.left - 140, y = e.clientY - r.top - 190;
      if (qx) { qx(x); qy(y); } else { fig.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    });
    sec.addEventListener('pointerover', (e) => {
      const row = e.target.closest('.rrow');
      if (row) { if (img.getAttribute('src') !== row.dataset.photo) img.src = row.dataset.photo; fig.classList.add('is-on'); }
    });
    sec.addEventListener('pointerout', (e) => { const row = e.target.closest('.rrow'); if (row && !row.contains(e.relatedTarget)) fig.classList.remove('is-on'); });
  }

  function clubs() {
    const grid = BC.$('#clubs-grid');
    Object.values(D.clubs).forEach((c, i) => {
      grid.appendChild(h('article.club', [
        h('figure.club-photo.arch', { 'data-reveal': 'clip', 'data-delay': String(i * 0.15) }, h('img', { src: BC.asset(c.photo), alt: c.id === 'jayaone' ? 'The BalrCutz storefront at Jaya One, Petaling Jaya' : 'The locker room at BalrCutz Hartamas', loading: 'lazy', width: 1000, height: 1250 })),
        h('div.club-body', [
          h('p.club-tag', c.tag),
          h('h3.club-name', c.name),
          h('p.club-addr', c.address),
          h('dl.club-facts', [
            h('div', [h('dt', 'Hours'), h('dd', 'Every day, 10am to 11pm')]),
            h('div', [h('dt', 'Phone'), h('dd', h('a', { href: 'tel:' + c.tel }, c.phone))]),
            h('div', [h('dt', 'Parking'), h('dd', c.parking)]),
            h('div', [h('dt', 'Google'), h('dd', c.rating.toFixed(1) + ' from ' + c.reviews.toLocaleString('en-GB') + ' reviews')]),
          ]),
          h('div.club-actions', [h('a.btn.btn-light.btn-sm', { href: '#book', 'data-book': 'club:' + c.id + ',step:1' }, 'Book at ' + c.name), h('a.btn.btn-ghost.btn-sm', { href: c.maps, target: '_blank', rel: 'noopener' }, 'Directions')]),
        ]),
        h('div.club-map', h('iframe', { 'data-src': c.embed, title: 'Map of BalrCutz ' + c.name, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' })),
      ]));
    });
  }

  /* Reviews: one large quote at a time, slow crossfade */
  function reviews() {
    const list = D.reviews;
    let i = 0, timer = null;
    const text = BC.$('#rv-text'), by = BC.$('#rv-by'), count = BC.$('#rv-count'), fig = BC.$('#rv-quote');
    const show = (n) => {
      i = (n + list.length) % list.length;
      const r = list[i];
      const put = () => {
        text.textContent = r.text;
        by.textContent = r.name + ', ' + D.clubs[r.club].name + ', via ' + r.source;
        count.textContent = (i + 1) + ' / ' + list.length;
      };
      if (window.gsap && !BC.reducedMotion()) {
        window.gsap.to(fig, { autoAlpha: 0, y: -8, duration: 0.45, ease: 'power2.in', onComplete: () => { put(); window.gsap.fromTo(fig, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out' }); } });
      } else put();
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => show(i + 1), 9000); };
    BC.$('#rv-prev').addEventListener('click', () => { show(i - 1); auto(); });
    BC.$('#rv-next').addEventListener('click', () => { show(i + 1); auto(); });
    text.textContent = list[0].text;
    by.textContent = list[0].name + ', ' + D.clubs[list[0].club].name + ', via ' + list[0].source;
    count.textContent = '1 / ' + list.length;
    if (!BC.reducedMotion()) auto();
  }

  function init() {
    finder();
    menu();
    roster();
    clubs();
    reviews();
    BC.$$('[data-menu-club]').forEach((b) => b.addEventListener('click', () => { menuClub = b.dataset.menuClub; menu(); }));
    BC.$$('[data-roster]').forEach((b) => b.addEventListener('click', () => { rosterClub = b.dataset.roster; roster(); }));
    BC.book.main = BC.book.mount(BC.$('#bk-main'), { source: 'Website', offset: 96 });
    BC.chatMount({ label: 'Book or ask' });
    BC.ui.init('calm');
    BC.fx.init('calm');
    rosterFloat();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
