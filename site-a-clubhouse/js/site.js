/* Concept A, The Clubhouse: renders the menu, roster, clubs and reviews from BC.data, shows the next free chair,
   mounts the booking widget and the chat, and runs the calm motion personality. */
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

  /* The soonest free chair for a cut and wash, from the same availability the booking uses */
  function nextChair() {
    const el = BC.$('#next-chair');
    if (!el) return;
    const n = BC.book.nextFree('cut-wash');
    el.innerHTML = '';
    if (!n) return;
    const today = BC.iso(BC.today()), tomorrow = BC.iso(BC.addDays(BC.today(), 1));
    const day = n.date === today ? 'today' : n.date === tomorrow ? 'tomorrow' : BC.shortDate(n.date);
    el.append(
      h('span.next-dot', { 'aria-hidden': 'true' }),
      h('span', ['Next free chair: ', h('strong', day + ' at ' + BC.clock(n.time)), ' with ' + BC.barber(n.barber).name + ' at ' + D.clubs[n.club].name + '.']),
      h('button.link', { type: 'button', on: { click: () => BC.book.open({ club: n.club, svc: 'cut-wash', barber: n.barber, date: n.date, time: n.time, assigned: n.barber, step: 2 }) } }, 'Take it'),
    );
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

  /* Roster: one column per club, a row per barber, everything on the same row lines */
  function roster() {
    const box = BC.$('#roster');
    Object.values(D.clubs).forEach((c) => {
      box.appendChild(h('div.roster-col', [
        h('h3.roster-club', [c.name, h('span', BC.teamAt(c.id).length + ' barbers')]),
        h('ul.roster-list', BC.teamAt(c.id).map((b) => h('li.rrow', [
          /* the photo and the name both open the barber's card */
          h('button.rrow-photo', { type: 'button', 'data-barber-card': b.id, 'aria-label': 'Open ' + (b.full || b.name) + '\'s card' }, [
            h('img', { src: BC.asset('img/team/' + b.id + '-sq.webp'), alt: '', loading: 'lazy', width: 104, height: 104 }),
            h('span.rrow-view', { 'aria-hidden': 'true' }, 'View'),
          ]),
          h('div.rrow-who', [h('button.rrow-name', { type: 'button', 'data-barber-card': b.id }, b.full || b.name), h('span.rrow-role', b.role + (b.years ? ', ' + b.years + ' years' : ''))]),
          h('span.rrow-skill', b.skills),
          h('button.btn.btn-ghost.btn-xs', { type: 'button', 'data-book': 'barber:' + b.id + ',step:1', 'aria-label': 'Book ' + (b.full || b.name) }, 'Book'),
        ]))),
      ]));
    });
  }

  /* Clubs: two cards whose rows line up (CSS subgrid), whatever the length of each address or note */
  function clubs() {
    const grid = BC.$('#clubs-grid');
    Object.values(D.clubs).forEach((c) => {
      grid.appendChild(h('article.club', [
        h('figure.club-photo.is-' + c.id, h('img', { src: BC.asset(c.photo), alt: c.id === 'jayaone' ? 'The BalrCutz storefront at Jaya One, Petaling Jaya' : 'The locker room at BalrCutz Hartamas', loading: 'lazy', width: 1000, height: 1250 })),
        h('div.club-head', [h('p.club-tag', c.tag), h('h3.club-name', c.name), h('p.club-addr', c.address)]),
        h('dl.club-facts', [
          h('div', [h('dt', 'Hours'), h('dd', 'Every day, 10am to 11pm')]),
          h('div', [h('dt', 'Phone'), h('dd', h('a', { href: 'tel:' + c.tel }, c.phone))]),
          h('div', [h('dt', 'Parking'), h('dd', c.parking)]),
          h('div', [h('dt', 'Google'), h('dd', c.rating.toFixed(1) + ' from ' + c.reviews.toLocaleString('en-GB') + ' reviews')]),
        ]),
        h('div.club-actions', [h('a.btn.btn-light.btn-sm', { href: '#book', 'data-book': 'club:' + c.id + ',step:1' }, 'Book at ' + c.name), h('a.btn.btn-ghost.btn-sm', { href: c.maps, target: '_blank', rel: 'noopener', 'data-directions': c.id }, 'Directions')]),
        h('div.club-map', h('iframe', { 'data-src': c.embed, title: 'Map of BalrCutz ' + c.name, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' })),
      ]));
    });
  }

  /* Reviews: one quote at a time, slow crossfade */
  function reviews() {
    const list = D.reviews.filter((r) => r.rotate !== false);
    let i = 0, timer = null;
    const text = BC.$('#rv-text'), by = BC.$('#rv-by'), count = BC.$('#rv-count'), fig = BC.$('#rv-quote');
    const put = () => {
      const r = list[i];
      text.textContent = r.text;
      by.textContent = r.name + ', ' + D.clubs[r.club].name + ', via ' + r.source;
      count.textContent = (i + 1) + ' / ' + list.length;
    };
    const show = (n) => {
      i = (n + list.length) % list.length;
      if (window.gsap && !BC.reducedMotion()) {
        window.gsap.to(fig, { autoAlpha: 0, y: -6, duration: 0.4, ease: 'power2.in', onComplete: () => { put(); window.gsap.fromTo(fig, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }); } });
      } else put();
    };
    const auto = () => { clearInterval(timer); timer = setInterval(() => show(i + 1), 9000); };
    BC.$('#rv-prev').addEventListener('click', () => { show(i - 1); auto(); });
    BC.$('#rv-next').addEventListener('click', () => { show(i + 1); auto(); });
    put();
    if (!BC.reducedMotion()) auto();
  }

  function init() {
    finder();
    menu();
    roster();
    clubs();
    reviews();
    BC.$$('[data-menu-club]').forEach((b) => b.addEventListener('click', () => { menuClub = b.dataset.menuClub; menu(); }));
    BC.book.main = BC.book.mount(BC.$('#bk-main'), { source: 'Website', offset: 88 });
    nextChair();
    BC.on('booked', nextChair);
    setInterval(nextChair, 60000);
    BC.chatMount({ label: 'Book or ask' });
    BC.ui.init('calm');
    BC.fx.init('calm');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
