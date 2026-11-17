/* Booking engine and the booking widget (service, time, details, payment, confirmation).
   The calendar step follows the Cal.com month view the brief pointed at: summary on the left, month in the middle, times on the right.
   Availability is simulated (seeded per barber and day, so it is stable between visits) and every demo booking blocks its slot.
   BC.book.slots / quote / commit / ics are shared with the chat, which books through the same rules. */
(() => {
  const BC = window.BC;
  const { h } = BC;
  const D = () => BC.data;
  const STEP_MIN = 15; // occupancy grid
  const START_EVERY = 30; // offered start times
  const WINDOW_DAYS = 56; // how far ahead people can book

  /* ---------- availability ---------- */
  const busyCache = {};
  function busyFor(barberId, iso) {
    const key = barberId + iso;
    if (busyCache[key]) return busyCache[key];
    const rnd = BC.seed('balrcutz:' + key);
    const d = BC.fromIso(iso), dow = d.getDay(), weekend = dow === 0 || dow === 6 || dow === 5;
    const { open, close } = D().brand;
    const busy = new Set();
    /* about one day off in sixteen, never two in a row */
    const offRoll = (day) => BC.seed('off:' + barberId + day)() < 0.065;
    if (offRoll(iso) && !offRoll(BC.iso(BC.addDays(d, -1)))) { for (let t = open; t < close; t += STEP_MIN) busy.add(t); busyCache[key] = { off: true, busy }; return busyCache[key]; }
    // a break somewhere between 2pm and 5pm
    const brk = 840 + Math.floor(rnd() * 12) * STEP_MIN;
    for (let t = brk; t < brk + 45; t += STEP_MIN) busy.add(t);
    // existing appointments: more in the evening and at the weekend
    for (let t = open; t < close; t += STEP_MIN) {
      if (busy.has(t)) continue;
      let p = 0.13 + (t >= 1080 ? 0.12 : 0) + (weekend ? 0.09 : 0) + (t < 690 ? -0.05 : 0);
      if (rnd() < p) {
        const len = [30, 45, 45, 60, 60, 90][Math.floor(rnd() * 6)];
        for (let k = t; k < Math.min(close, t + len); k += STEP_MIN) busy.add(k);
        t += len - STEP_MIN;
      }
    }
    busyCache[key] = { off: false, busy };
    return busyCache[key];
  }

  function taken() { return BC.store.get('taken', []); }

  function freeFor(barberId, iso, start, dur) {
    const b = busyFor(barberId, iso);
    if (b.off) return false;
    const mine = taken().filter((x) => x.barber === barberId && x.date === iso);
    for (let t = start; t < start + dur; t += STEP_MIN) {
      if (b.busy.has(t - (t % STEP_MIN))) return false;
      if (mine.some((x) => t >= x.time && t < x.time + x.dur)) return false;
    }
    return true;
  }

  /* Free start times for a service length. barber 'any' returns the first free barber for each time. */
  function slots(club, barber, iso, dur) {
    const { open, close } = D().brand;
    const today = BC.iso(BC.today());
    if (iso < today) return [];
    const team = barber === 'any' ? BC.teamAt(club) : [BC.barber(barber)];
    // a fixed per-day order decides who takes "any barber" bookings, so the same time always maps to the same person
    const order = team.slice().sort((a, b) => BC.seed(a.id + iso)() - BC.seed(b.id + iso)());
    const out = [];
    const earliest = iso === today ? Math.ceil((BC.nowMins() + 30) / START_EVERY) * START_EVERY : open;
    for (let t = Math.max(open, earliest); t + dur <= close; t += START_EVERY) {
      const who = order.find((b) => freeFor(b.id, iso, t, dur));
      if (who) out.push({ t, barber: who.id });
    }
    return out;
  }

  function dayState(club, barber, iso, dur) {
    const today = BC.iso(BC.today());
    if (iso < today) return 'past';
    if (iso > BC.iso(BC.addDays(BC.today(), WINDOW_DAYS))) return 'later';
    if (barber !== 'any' && busyFor(barber, iso).off) return 'off';
    return slots(club, barber, iso, dur).length ? 'open' : 'full';
  }

  /* ---------- money ---------- */
  function quote(s) {
    const lines = [];
    const main = s.svc && BC.svcAt(s.svc, s.club);
    if (main) lines.push({ id: main.id, label: main.name, price: main.price, dur: main.dur });
    (s.addons || []).forEach((id) => { const a = BC.svcAt(id, s.club); if (a) lines.push({ id, label: a.name, price: a.price, dur: a.dur, addon: true }); });
    const total = lines.reduce((n, l) => n + l.price, 0);
    const dur = lines.reduce((n, l) => n + l.dur, 0);
    const deposit = Math.min(D().pay.deposit, total);
    const mode = s.payMode || 'deposit';
    const now = mode === 'full' ? total : mode === 'deposit' ? deposit : 0;
    return { lines, total, dur, deposit, now, later: total - now, mode };
  }

  /* ---------- records ---------- */
  function commit(s, source) {
    const q = quote(s);
    const barberId = s.barber === 'any' ? s.assigned : s.barber;
    const rec = {
      ref: s.ref || BC.ref(),
      source: source || 'Website',
      club: s.club, svc: s.svc, addons: (s.addons || []).slice(), barber: barberId, anyBarber: s.barber === 'any',
      date: s.date, time: s.time, dur: q.dur,
      name: s.name, phone: s.phone, email: s.email || '', notes: s.notes || '', first: !!s.first,
      style: Object.assign({}, s.style || {}), photo: s.photo || null, remind: s.remind !== false,
      total: q.total, paid: s.paid ? q.now : 0, payMode: q.mode, method: q.mode === 'shop' ? 'At the shop' : (D().pay.methods.find((m) => m.id === s.method) || {}).label,
      status: q.mode === 'shop' ? 'Pay at shop' : s.paid ? (s.method === 'bank' ? 'Receipt sent' : 'Paid') : 'Unpaid',
      created: new Date().toISOString(),
    };
    const t = taken(); t.push({ barber: barberId, date: rec.date, time: rec.time, dur: rec.dur }); BC.store.set('taken', t);
    if (BC.desk) BC.desk.add('booking', rec);
    BC.store.set('lead', { name: rec.name, phone: rec.phone, email: rec.email });
    BC.emit('booked', rec);
    return rec;
  }

  function stamp(iso, mins) { return iso.replace(/-/g, '') + 'T' + String(Math.floor(mins / 60)).padStart(2, '0') + String(mins % 60).padStart(2, '0') + '00'; }
  function ics(rec) {
    const club = D().clubs[rec.club], svc = BC.svcAt(rec.svc, rec.club), b = BC.barber(rec.barber);
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BalrCutz//Booking//EN', 'BEGIN:VEVENT',
      'UID:' + rec.ref + '@balrcutz', 'DTSTAMP:' + now, 'DTSTART:' + stamp(rec.date, rec.time), 'DTEND:' + stamp(rec.date, rec.time + rec.dur),
      'SUMMARY:BalrCutz: ' + svc.name + ' with ' + b.name, 'LOCATION:' + club.address.replace(/,/g, '\\,'),
      'DESCRIPTION:Booking ' + rec.ref + '. ' + D().brand.whatsappLabel + ' on WhatsApp if you need to move it.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  function waText(rec) {
    const club = D().clubs[rec.club], svc = BC.svcAt(rec.svc, rec.club), b = BC.barber(rec.barber);
    return 'Hi BalrCutz, this is ' + rec.name + '. Booking ' + rec.ref + ': ' + svc.name + ' with ' + b.name + ' at ' + club.name + ', ' + BC.longDate(rec.date) + ' at ' + BC.clock(rec.time) + '.';
  }

  /* Reference photos are shrunk in the browser before they are kept */
  function shrinkPhoto(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('type'));
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, 360 / Math.max(img.width, img.height));
          const c = h('canvas', { width: Math.round(img.width * s), height: Math.round(img.height * s) });
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = rej;
        img.src = r.result;
      };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  const STYLE = {
    fade: { label: 'Fade', opts: ['No fade', 'Low', 'Mid', 'High', 'Skin'] },
    top: { label: 'On top', opts: ['Keep the length', 'Trim it', 'Go short'] },
    beard: { label: 'Beard', opts: ['Leave it', 'Line it up', 'Trim and shape'] },
  };

  /* ---------- widget ---------- */
  const STEPS = ['Service', 'Time', 'Details', 'Payment'];

  function mount(root, opts) {
    opts = opts || {};
    const lead = BC.store.get('lead', {}) || {};
    const s = {
      step: 1, club: opts.club || 'jayaone', svc: null, addons: [], barber: 'any', assigned: null,
      month: (() => { const d = BC.today(); d.setDate(1); return d; })(), date: null, time: null, h24: false,
      name: lead.name || '', phone: lead.phone || '', email: lead.email || '', notes: '', first: false, remind: true,
      style: {}, photo: null, payMode: 'deposit', method: 'duitnow', paid: false, ref: null, cat: null,
    };
    let rec = null;

    root.classList.add('bk');
    root.innerHTML = '';
    const side = h('aside.bk-side');
    const main = h('div.bk-main', { 'aria-live': 'polite' });
    root.append(side, main);

    function setStep(n) {
      s.step = n;
      root.dataset.step = n;
      render();
      const top = root.getBoundingClientRect().top;
      if (opts.scrollOnStep !== false && (top < 0 || top > innerHeight * 0.5)) {
        const y = scrollY + top - (opts.offset || 90);
        if (BC.lenis) BC.lenis.scrollTo(y, { duration: 0.9 }); else scrollTo({ top: y, behavior: 'smooth' });
      }
      const focus = main.querySelector('h3, [data-autofocus]');
      if (focus) { focus.setAttribute('tabindex', '-1'); focus.focus({ preventScroll: true }); }
    }

    /* Side panel: the running summary */
    function renderSide() {
      side.innerHTML = '';
      const q = quote(s);
      const svc = s.svc && BC.svcAt(s.svc, s.club);
      const b = s.barber === 'any' ? null : BC.barber(s.barber);
      const club = D().clubs[s.club];
      const clubs = h('div.bk-clubs', { role: 'group', 'aria-label': 'Choose a club' }, Object.values(D().clubs).map((c) =>
        h('button.bk-club', { type: 'button', 'aria-pressed': String(c.id === s.club), disabled: s.step >= 5 ? true : null, on: { click: () => switchClub(c.id) } }, [h('span.bk-club-name', c.name), h('span.bk-club-area', c.area.split(',')[0])])));
      const facts = h('dl.bk-facts', [
        fact('Duration', q.dur ? BC.dur(q.dur) : 'Pick a service'),
        fact('Barber', b ? b.name : s.assigned && s.date ? 'Any barber (' + BC.barber(s.assigned).name + ')' : 'Any barber'),
        fact('When', s.date && s.time != null ? BC.shortDate(s.date) + ', ' + BC.clock(s.time, s.h24) : s.date ? BC.shortDate(s.date) : 'Pick a time'),
        fact('Where', club.short),
      ]);
      const lines = q.lines.length > 1 ? h('ul.bk-lines', q.lines.map((l) => h('li', [h('span', l.label), h('span', BC.money(l.price))]))) : null;
      const total = h('div.bk-total', [h('span', 'Total'), h('strong', q.total ? BC.money(q.total) : 'RM 0')]);
      const prog = h('ol.bk-progress', STEPS.map((name, i) => h('li', { class: i + 1 < s.step ? 'is-done' : i + 1 === s.step ? 'is-now' : '', 'aria-current': i + 1 === s.step ? 'step' : null }, [h('span.bk-progress-n', String(i + 1)), h('span', name)])));
      side.append(...[clubs, h('p.bk-kicker', s.step >= 5 ? 'Booked' : 'Your booking'), h('h3.bk-title', svc ? BC.plus(svc.name) : 'Choose a service'), facts, lines, total, s.step < 5 ? prog : null].filter(Boolean));
    }
    function fact(k, v) { return h('div', [h('dt', k), h('dd', v)]); }

    function switchClub(id) {
      if (id === s.club) return;
      s.club = id;
      if (s.svc && !BC.svcAt(s.svc, id)) s.svc = null;
      s.addons = s.addons.filter((a) => BC.svcAt(a, id));
      if (s.barber !== 'any' && BC.barber(s.barber).club !== id) s.barber = 'any';
      s.time = null; s.assigned = null;
      if (s.step > 2) s.step = s.svc ? 2 : 1;
      if (!s.svc) s.step = 1;
      root.dataset.step = s.step;
      render();
    }

    /* Step 1: service, add-ons, barber */
    function paneService() {
      const menu = BC.menu(s.club);
      const cats = D().cats.filter((c) => menu.some((m) => m.cat === c.id));
      if (!s.cat || !cats.some((c) => c.id === s.cat)) s.cat = (s.svc && BC.svcAt(s.svc, s.club).cat) || cats[0].id;
      const tabs = h('div.bk-cats', { role: 'tablist', 'aria-label': 'Service type' }, cats.map((c) =>
        h('button.bk-cat', { type: 'button', role: 'tab', 'aria-selected': String(c.id === s.cat), on: { click: () => { s.cat = c.id; render(); } } }, c.name)));
      const list = h('div.bk-list', { role: 'radiogroup', 'aria-label': 'Services', 'data-lenis-prevent': true }, menu.filter((m) => m.cat === s.cat).map((m) =>
        h('button.bk-svc', { type: 'button', role: 'radio', 'aria-checked': String(m.id === s.svc), on: { click: () => pickSvc(m.id) } }, [
          h('span.bk-svc-main', [h('span.bk-svc-name', m.name), h('span.bk-svc-blurb', m.blurb || '')]),
          h('span.bk-svc-meta', [h('span.bk-svc-dur', BC.dur(m.dur)), h('span.bk-svc-price', BC.money(m.price))]),
        ])));
      const wrap = h('div.bk-pane.bk-pane-svc', [h('h3.bk-h', 'What are we doing today?'), tabs, list]);
      if (s.svc) {
        const svc = BC.svcAt(s.svc, s.club);
        const addons = menu.filter((m) => m.addon && m.id !== s.svc);
        const extra = h('div.bk-extra', [
          h('div.bk-addons', [h('h4.bk-sub', 'Add to it'), h('div.bk-chips', addons.map((a) =>
            h('button.bk-chip', { type: 'button', 'aria-pressed': String(s.addons.includes(a.id)), on: { click: () => toggleAddon(a.id) } }, [a.name, h('small', '+' + BC.money(a.price))])))]),
          h('div.bk-barbers', [h('h4.bk-sub', 'Your barber'), h('div.bk-team', [barberBtn(null)].concat(BC.teamAt(s.club).map(barberBtn)))]),
          h('div.bk-actions', [h('button.bk-btn.bk-btn-primary', { type: 'button', on: { click: () => setStep(2) } }, 'Choose a time'), h('span.bk-hint', svc.name + ', ' + BC.dur(quote(s).dur))]),
        ]);
        wrap.appendChild(extra);
      }
      return wrap;
    }
    function barberBtn(b) {
      const id = b ? b.id : 'any';
      return h('button.bk-barber', { type: 'button', 'aria-pressed': String(s.barber === id), on: { click: () => { s.barber = id; s.time = null; s.assigned = null; render(); } } }, [
        b ? h('img', { src: BC.asset(b.photo + '-bw.webp'), alt: '', loading: 'lazy', width: 56, height: 70 }) : h('span.bk-any', { 'aria-hidden': 'true' }, h('img', { src: BC.asset('img/logo/mark-white-sm.png'), alt: '' })),
        h('span.bk-barber-name', b ? b.name : 'Any barber'),
        h('small', b ? (b.years ? b.years + ' yrs' : b.role) : 'First free chair'),
      ]);
    }
    function pickSvc(id) {
      s.svc = id; s.addons = s.addons.filter((a) => a !== id); s.time = null; s.assigned = null;
      render();
      const ex = main.querySelector('.bk-extra');
      if (ex && opts.revealExtra !== false) ex.scrollIntoView({ block: 'nearest', behavior: BC.reducedMotion() ? 'auto' : 'smooth' });
    }
    function toggleAddon(id) {
      s.addons = s.addons.includes(id) ? s.addons.filter((a) => a !== id) : s.addons.concat(id);
      s.time = null; s.assigned = null;
      render();
    }

    /* Step 2: month calendar and times */
    function paneTime() {
      const q = quote(s);
      const m = s.month, y = m.getFullYear(), mo = m.getMonth();
      const first = new Date(y, mo, 1), startDow = (first.getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
      const thisMonth = BC.today(); thisMonth.setDate(1);
      const lastMonth = BC.addDays(BC.today(), WINDOW_DAYS); lastMonth.setDate(1);
      const head = h('div.bk-cal-head', [
        h('h4.bk-month', [h('strong', BC.MONTHS[mo]), ' ', h('span', String(y))]),
        h('div.bk-cal-nav', [
          h('button.bk-nav', { type: 'button', 'aria-label': 'Previous month', disabled: m <= thisMonth ? true : null, on: { click: () => { s.month = new Date(y, mo - 1, 1); render(); } } }, '‹'),
          h('button.bk-nav', { type: 'button', 'aria-label': 'Next month', disabled: m >= lastMonth ? true : null, on: { click: () => { s.month = new Date(y, mo + 1, 1); render(); } } }, '›'),
        ]),
      ]);
      const grid = h('div.bk-grid', { role: 'grid', 'aria-label': BC.MONTHS[mo] + ' ' + y });
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d) => grid.appendChild(h('span.bk-dow', { role: 'columnheader' }, d)));
      for (let i = 0; i < startDow; i++) grid.appendChild(h('span.bk-blank'));
      const todayIso = BC.iso(BC.today());
      for (let d = 1; d <= days; d++) {
        const iso = BC.iso(new Date(y, mo, d));
        const st = dayState(s.club, s.barber, iso, q.dur);
        const label = BC.longDate(iso) + (st === 'open' ? ', times available' : st === 'full' ? ', fully booked' : st === 'off' ? ', barber off' : ', not bookable');
        grid.appendChild(h('button.bk-day', {
          type: 'button', class: 'is-' + st + (iso === todayIso ? ' is-today' : '') + (iso === s.date ? ' is-picked' : ''),
          disabled: st !== 'open' ? true : null, 'aria-pressed': String(iso === s.date), 'aria-label': label,
          on: { click: () => { s.date = iso; s.time = null; s.assigned = null; render(); } },
        }, [h('span', String(d)), iso === todayIso ? h('i.bk-dot', { 'aria-hidden': 'true' }) : null]));
      }
      const cal = h('div.bk-cal', [head, grid, h('p.bk-legend', [h('i.bk-key.is-open'), 'Open ', h('i.bk-key.is-full'), 'Fully booked'])]);

      const times = h('div.bk-times');
      const fmt = h('div.bk-fmt', { role: 'group', 'aria-label': 'Clock format' }, [
        h('button', { type: 'button', 'aria-pressed': String(!s.h24), on: { click: () => { s.h24 = false; render(); } } }, '12h'),
        h('button', { type: 'button', 'aria-pressed': String(s.h24), on: { click: () => { s.h24 = true; render(); } } }, '24h'),
      ]);
      if (!s.date) {
        times.append(h('div.bk-times-head', [h('h4', 'Times'), fmt]), h('p.bk-empty', 'Pick a day to see free times.'));
      } else {
        const list = slots(s.club, s.barber, s.date, q.dur);
        times.append(h('div.bk-times-head', [h('h4', BC.shortDate(s.date)), fmt]));
        const groups = [['Morning', 0, 720], ['Afternoon', 720, 1020], ['Evening', 1020, 1440]];
        const box = h('div.bk-slots', { 'data-lenis-prevent': true });
        groups.forEach(([name, a, b]) => {
          const g = list.filter((x) => x.t >= a && x.t < b);
          if (!g.length) return;
          box.append(h('p.bk-slot-group', name), ...g.map((x) => h('button.bk-slot', {
            type: 'button', 'aria-pressed': String(s.time === x.t),
            on: { click: () => { s.time = x.t; s.assigned = x.barber; render(); } },
          }, BC.clock(x.t, s.h24))));
        });
        if (!list.length) box.append(h('p.bk-empty', 'No free times left that day. Try another day.'));
        times.append(box);
      }
      const actions = h('div.bk-actions', [
        h('button.bk-btn.bk-btn-ghost', { type: 'button', on: { click: () => setStep(1) } }, 'Back'),
        h('button.bk-btn.bk-btn-primary', { type: 'button', disabled: s.time == null ? true : null, on: { click: () => setStep(3) } }, 'Continue'),
      ]);
      return h('div.bk-pane.bk-pane-time', [h('h3.bk-h.bk-sr', 'Pick a day and time'), h('div.bk-when', [cal, times]), actions]);
    }

    /* Step 3: contact details and the style brief */
    function paneDetails() {
      const err = {};
      const field = (name, label, attrs) => {
        const id = 'bk-' + name + '-' + (root.id || 'w');
        return h('div.bk-field', [h('label', { for: id }, label), h('input', Object.assign({ id, name, value: s[name] || '', on: { input: (e) => { s[name] = e.target.value; } } }, attrs)), h('p.bk-err', { id: id + '-err' })]);
      };
      const svc = BC.svcAt(s.svc, s.club);
      const showFirst = ['cut-dry', 'cut-wash', 'cut-wash-beard'].includes(s.svc);
      const firstNote = showFirst && s.first ? h('p.bk-note', [
        'First visit: the ', h('strong', s.svc === 'cut-wash-beard' ? BC.svcAt('ft-cut-beard', s.club).name : 'First Time Cut + Wash'), ' is ',
        h('strong', BC.money(BC.svcAt(s.svc === 'cut-wash-beard' ? 'ft-cut-beard' : 'ft-cut', s.club).price)), ' instead of ', BC.money(svc.price), '. ',
        h('button.bk-link', { type: 'button', on: { click: () => { s.svc = s.svc === 'cut-wash-beard' ? 'ft-cut-beard' : 'ft-cut'; s.first = true; render(); BC.toast('Switched to the first-visit price'); } } }, 'Switch to it'),
      ]) : null;
      const styleRows = Object.keys(STYLE).map((k) => h('div.bk-style-row', [h('span.bk-style-k', STYLE[k].label), h('div.bk-chips', STYLE[k].opts.map((o) =>
        h('button.bk-chip.bk-chip-sm', { type: 'button', 'aria-pressed': String(s.style[k] === o), on: { click: () => { s.style[k] = s.style[k] === o ? '' : o; render(); } } }, o)))]));
      const photoIn = h('input', { type: 'file', accept: 'image/*', id: 'bk-photo-' + (root.id || 'w'), class: 'bk-file', on: { change: (e) => {
        shrinkPhoto(e.target.files[0]).then((url) => { s.photo = url; render(); }, () => BC.toast('That file is not a photo. Try a JPG or PNG.', 'warn'));
      } } });
      const photo = h('div.bk-photo', [
        s.photo ? h('img', { src: s.photo, alt: 'Your reference photo' }) : null,
        h('label.bk-btn.bk-btn-ghost.bk-btn-sm', { for: photoIn.id }, s.photo ? 'Change photo' : 'Add a reference photo'),
        s.photo ? h('button.bk-link', { type: 'button', on: { click: () => { s.photo = null; render(); } } }, 'Remove') : null,
        photoIn,
      ]);
      const form = h('form.bk-form', { novalidate: true, on: { submit: (e) => {
        e.preventDefault();
        if (!String(s.name).trim()) err.name = 'Add your name so your barber knows who to call.';
        if (!BC.phoneOk(s.phone)) err.phone = 'Use a Malaysian mobile number, for example 012-345 6789.';
        if (!BC.emailOk(s.email)) err.email = 'That email looks incomplete.';
        Object.keys(err).length ? showErr(form, err) : setStep(4);
      } } }, [
        h('div.bk-cols', [field('name', 'Name', { autocomplete: 'name', required: true, 'data-autofocus': true }), field('phone', 'WhatsApp number', { type: 'tel', autocomplete: 'tel', required: true, placeholder: '012-345 6789' })]),
        field('email', 'Email (optional)', { type: 'email', autocomplete: 'email' }),
        showFirst ? h('label.bk-check', [h('input', { type: 'checkbox', checked: s.first ? true : null, on: { change: (e) => { s.first = e.target.checked; render(); } } }), 'This is my first visit to BalrCutz']) : null,
        firstNote,
        h('fieldset.bk-style', [h('legend', 'Style brief for your barber'), h('p.bk-help', 'Optional. It goes to your barber with the booking, so the cut starts from what you want.'), ...styleRows, photo,
          h('div.bk-field', [h('label', { for: 'bk-notes-' + (root.id || 'w') }, 'Anything else?'), h('textarea', { id: 'bk-notes-' + (root.id || 'w'), rows: 2, placeholder: 'Growing it out, wedding on Saturday, sensitive scalp…', on: { input: (e) => { s.notes = e.target.value; } } }, s.notes)])]),
        h('label.bk-check', [h('input', { type: 'checkbox', checked: s.remind ? true : null, on: { change: (e) => { s.remind = e.target.checked; } } }), 'Send me a WhatsApp reminder the day before']),
        h('div.bk-actions', [h('button.bk-btn.bk-btn-ghost', { type: 'button', on: { click: () => setStep(2) } }, 'Back'), h('button.bk-btn.bk-btn-primary', { type: 'submit' }, 'Continue to payment')]),
      ]);
      return h('div.bk-pane.bk-pane-details', [h('h3.bk-h', 'Your details'), form]);
    }
    function showErr(form, err) {
      BC.$$('.bk-err', form).forEach((p) => { p.textContent = ''; });
      let firstBad = null;
      Object.keys(err).forEach((k) => {
        const input = form.querySelector('[name="' + k + '"]');
        if (!input) return;
        input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', input.id + '-err');
        form.querySelector('#' + input.id + '-err').textContent = err[k];
        firstBad = firstBad || input;
      });
      if (firstBad) firstBad.focus();
    }

    /* Step 4: quote and payment */
    function panePay() {
      const q = quote(s);
      if (!s.ref) s.ref = BC.ref();
      const modes = h('div.bk-modes', { role: 'radiogroup', 'aria-label': 'How much to pay now' }, [
        ['deposit', 'Pay a deposit', BC.money(q.deposit) + ' now, ' + BC.money(q.total - q.deposit) + ' at the shop'],
        ['full', 'Pay in full', BC.money(q.total) + ' now, nothing at the shop'],
        ['shop', 'Pay at the shop', 'Cash, card or QR after your cut'],
      ].map(([id, t, sub]) => h('button.bk-mode', { type: 'button', role: 'radio', 'aria-checked': String(s.payMode === id), on: { click: () => { s.payMode = id; s.paid = false; render(); } } }, [h('strong', t), h('span', sub)])));
      const table = h('table.bk-quote', [h('caption', 'Quote ' + s.ref), h('tbody', q.lines.map((l) => h('tr', [h('th', { scope: 'row' }, l.label + (l.addon ? '' : '')), h('td', BC.dur(l.dur)), h('td', BC.money(l.price))]))),
        h('tfoot', [h('tr', [h('th', { scope: 'row' }, 'Total'), h('td', BC.dur(q.dur)), h('td', BC.money(q.total))]), q.mode !== 'shop' ? h('tr.bk-quote-now', [h('th', { scope: 'row' }, 'Pay now'), h('td'), h('td', BC.money(q.now))]) : null])]);
      const payBox = h('div.bk-paybox');
      if (q.mode === 'shop') {
        payBox.append(h('p.bk-note', 'Your chair is held. Pay at the counter after your cut, by cash, card or QR.'),
          h('div.bk-actions', [h('button.bk-btn.bk-btn-ghost', { type: 'button', on: { click: () => setStep(3) } }, 'Back'), h('button.bk-btn.bk-btn-primary', { type: 'button', on: { click: finish } }, 'Confirm booking')]));
      } else if (BC.pay) {
        BC.pay.render(payBox, { amount: q.now, ref: s.ref, method: s.method, onMethod: (m) => { s.method = m; }, onPaid: (m) => { s.method = m; s.paid = true; finish(); }, back: () => setStep(3), label: 'Pay ' + BC.money(q.now) });
      }
      return h('div.bk-pane.bk-pane-pay', [h('h3.bk-h', 'Quote and payment'), h('div.bk-pay-cols', [h('div', [table, modes]), payBox])]);
    }

    function finish() { rec = commit(s, opts.source || 'Website'); setStep(5); }

    /* Step 5: the ticket */
    function paneDone() {
      if (!rec) return h('div');
      const club = D().clubs[rec.club], svc = BC.svcAt(rec.svc, rec.club), b = BC.barber(rec.barber);
      const addons = rec.addons.map((a) => BC.svcAt(a, rec.club).name);
      const ticket = h('div.bk-ticket', { role: 'group', 'aria-label': 'Your booking pass' }, [
        h('div.tk-main', [
          h('div.tk-top', [h('img.tk-badge', { src: BC.asset('img/logo/badge-light-sm.png'), alt: '' }), h('div', [h('span.tk-k', 'Booking'), h('strong.tk-ref', rec.ref)])]),
          h('p.tk-name', rec.name),
          h('dl.tk-grid', [
            fact('Service', svc.name + (addons.length ? ' + ' + addons.join(', ') : '')),
            fact('Barber', b.name + (rec.anyBarber ? ' (first free chair)' : '')),
            fact('Club', club.name + ', ' + club.area.split(',')[0]),
            fact('Payment', rec.status === 'Pay at shop' ? 'Pay at the shop, ' + BC.money(rec.total) : rec.status === 'Receipt sent' ? BC.money(rec.paid) + ' by bank transfer, receipt sent' : BC.money(rec.paid) + ' paid by ' + rec.method + (rec.total > rec.paid ? ', ' + BC.money(rec.total - rec.paid) + ' at the shop' : '')),
          ]),
        ]),
        h('div.tk-stub', [h('span.tk-k', BC.shortDate(rec.date)), h('strong.tk-time', BC.clock(rec.time, s.h24)), h('span.tk-k', BC.dur(rec.dur))]),
      ]);
      const actions = h('div.bk-actions.bk-done-actions', [
        h('button.bk-btn.bk-btn-primary', { type: 'button', on: { click: () => BC.download('balrcutz-' + rec.ref + '.ics', ics(rec), 'text/calendar') } }, 'Add to calendar'),
        h('a.bk-btn.bk-btn-ghost', { href: BC.wa(waText(rec)), target: '_blank', rel: 'noopener' }, 'Send to BalrCutz on WhatsApp'),
        h('button.bk-link', { type: 'button', on: { click: reset } }, 'Book another chair'),
      ]);
      return h('div.bk-pane.bk-pane-done', [h('h3.bk-h', 'You\'re booked, ' + BC.firstName(rec.name) + '.'), h('p.bk-lede', 'We\'ve held ' + b.name + '\'s chair. ' + (rec.remind ? 'A reminder goes to ' + rec.phone + ' on WhatsApp the day before.' : '')), ticket, actions,
        BC.desk ? h('p.bk-demo', ['This is a demo: nothing was charged. ', h('button.bk-link', { type: 'button', on: { click: () => BC.desk.open('booking') } }, 'See it on the front desk'), ' the way the shop would.']) : null]);
    }

    function reset() {
      Object.assign(s, { step: 1, svc: null, addons: [], barber: 'any', assigned: null, date: null, time: null, notes: '', first: false, style: {}, photo: null, payMode: 'deposit', method: 'duitnow', paid: false, ref: null });
      rec = null;
      setStep(1);
    }

    function render() {
      root.dataset.step = s.step;
      renderSide();
      main.innerHTML = '';
      const pane = s.step === 1 ? paneService() : s.step === 2 ? paneTime() : s.step === 3 ? paneDetails() : s.step === 4 ? panePay() : paneDone();
      main.appendChild(pane);
      BC.emit('booking:render', { root, step: s.step });
    }

    const api = {
      root,
      state: s,
      preset(p) {
        if (p.club && p.club !== s.club) switchClub(p.club);
        if (p.svc && BC.svcAt(p.svc, s.club)) { s.svc = p.svc; s.cat = BC.svcAt(p.svc, s.club).cat; s.addons = s.addons.filter((a) => a !== p.svc); }
        if (p.addon && BC.svcAt(p.addon, s.club) && !s.addons.includes(p.addon) && p.addon !== s.svc) s.addons.push(p.addon);
        if (p.barber) { const b = BC.barber(p.barber); if (b) { if (b.club !== s.club) switchClub(b.club); s.barber = b.id; } }
        s.time = null; s.assigned = null;
        if (rec) { rec = null; s.ref = null; s.paid = false; }
        s.step = p.step && s.svc ? p.step : 1;
        render();
      },
      go: setStep,
    };
    render();
    return api;
  }

  BC.book = { slots, dayState, quote, commit, ics, waText, shrinkPhoto, STYLE, mount, busyFor, WINDOW_DAYS };

  /* Page helper: buttons with data-book="svc:mvp,club:hartamas,barber:laith,step:2" preset the page's widget and scroll to it */
  BC.book.open = (p) => {
    const w = BC.book.main;
    if (!w) return;
    w.preset(p || {});
    const y = scrollY + w.root.getBoundingClientRect().top - 90;
    if (BC.lenis) BC.lenis.scrollTo(y, { duration: 1.2 }); else scrollTo({ top: y, behavior: BC.reducedMotion() ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-book]');
    if (!t || !BC.book.main) return;
    e.preventDefault();
    const p = {};
    String(t.getAttribute('data-book') || '').split(',').forEach((kv) => { const [k, v] = kv.split(':').map((x) => x && x.trim()); if (k && v) p[k] = k === 'step' ? Number(v) : v; });
    BC.book.open(p);
  });
})();
