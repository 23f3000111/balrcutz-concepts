/* Front desk: the staff view of every booking, lead, quote and chat the two concepts collect.
   It lives in this browser only (localStorage) for the pitch; the live build would post the same records to the shop's inbox.
   BC.desk.add(kind, record)  kind: booking | lead | quote | chat     BC.desk.open(tab) */
(() => {
  const BC = window.BC;
  const { h } = BC;
  const KEY = 'desk';

  const all = () => BC.store.get(KEY, []);
  function add(kind, rec) {
    const list = all();
    if (kind === 'lead') {
      const i = list.findIndex((r) => r.kind === 'lead' && r.phone && rec.phone && r.phone.replace(/\D/g, '') === rec.phone.replace(/\D/g, ''));
      if (i > -1) {
        const old = list[i];
        list[i] = Object.assign({}, old, rec, { interests: Array.from(new Set((old.interests || []).concat(rec.interests || []))), updated: new Date().toISOString() });
        BC.store.set(KEY, list);
        refresh();
        return list[i];
      }
    }
    if (kind === 'chat') {
      const i = list.findIndex((r) => r.kind === 'chat' && r.chatId === rec.chatId);
      if (i > -1) { list[i] = Object.assign({}, list[i], rec); BC.store.set(KEY, list); refresh(); return list[i]; }
    }
    const row = Object.assign({ id: Math.random().toString(36).slice(2, 9), kind, created: new Date().toISOString() }, rec);
    list.unshift(row);
    BC.store.set(KEY, list.slice(0, 300));
    refresh();
    return row;
  }
  function note(phone, interest) {
    if (!phone || !interest) return;
    add('lead', { phone, interests: [interest] });
  }

  /* Two sample rows so the desk is never blank in a pitch; they are marked as samples */
  const SAMPLES = [
    { kind: 'booking', sample: true, ref: 'BC-SMPL', created: '2026-11-16T09:12:00', source: 'Chat', club: 'hartamas', svc: 'cut-wash-beard', addons: ['waxing'], barber: 'adam', date: '2026-11-19', time: 1170, dur: 75, name: 'Sample client', phone: '012-000 0000', email: '', total: 95, paid: 20, status: 'Paid', method: 'DuitNow QR', style: { fade: 'Mid', top: 'Keep the length', beard: 'Line it up' }, notes: 'Wedding on Saturday' },
    { kind: 'quote', sample: true, created: '2026-11-15T15:40:00', source: 'Chat', name: 'Sample groom', phone: '012-000 0001', occasion: 'Wedding party', people: 6, svc: 'supercut', club: 'jayaone', when: 'Sat 6 Dec, morning', estimate: 405, note: 'Proposed group rate, to be confirmed by the shop' },
  ];

  let dlg = null, tab = 'booking';

  function cell(x) { return h('td', x); }
  function when(r) { return r.date ? [h('strong', BC.shortDate(r.date)), h('br'), BC.clock(r.time)] : ''; }
  function who(r) { return [h('strong', r.name || 'Unnamed'), r.sample ? h('span.dk-tag', 'Sample') : null, h('br'), r.phone || '', r.email ? [h('br'), r.email] : null]; }
  function brief(r) {
    const st = r.style || {};
    const bits = ['fade', 'top', 'beard'].filter((k) => st[k]).map((k) => h('span.dk-chip', st[k]));
    return [bits.length ? h('div.dk-chips', bits) : null, r.notes ? h('p.dk-notes', r.notes) : null, r.photo ? h('img.dk-photo', { src: r.photo, alt: 'Reference photo' }) : null, r.first ? h('span.dk-chip.is-red', 'First visit') : null];
  }

  function table(head, rows) {
    return h('div.dk-scroll', h('table.dk-table', [h('thead', h('tr', head.map((x) => h('th', { scope: 'col' }, x)))), h('tbody', rows)]));
  }

  function body() {
    const list = all();
    const box = h('div.dk-body');
    if (tab === 'booking') {
      const rows = list.filter((r) => r.kind === 'booking').concat(SAMPLES.filter((r) => r.kind === 'booking'));
      box.appendChild(table(['When', 'Client', 'Service', 'Barber', 'Club', 'Total', 'Payment', 'Style brief', 'From'], rows.map((r) => {
        const svc = BC.svcAt(r.svc, r.club), b = BC.barber(r.barber);
        return h('tr', [cell(when(r)), cell(who(r)), cell([svc ? svc.name : r.svc, (r.addons || []).length ? [h('br'), h('small', '+ ' + r.addons.map((a) => (BC.svcAt(a, r.club) || {}).name).join(', '))] : null]),
          cell(b ? b.name + (r.anyBarber ? ' (any)' : '') : ''), cell(BC.data.clubs[r.club].name), cell(BC.money(r.total)),
          cell([h('span.dk-status' + (/Paid|Receipt/.test(r.status) ? '.is-ok' : ''), r.status), h('br'), h('small', r.paid ? BC.money(r.paid) + ' by ' + r.method : r.method || '')]),
          cell(brief(r)), cell([r.source, h('br'), h('small', r.ref)])]);
      })));
      if (!rows.length) box.appendChild(h('p.dk-empty', 'No bookings yet. Book a chair on the site or in the chat and it lands here.'));
    } else if (tab === 'lead') {
      const leads = list.filter((r) => r.kind === 'lead');
      const quotes = list.filter((r) => r.kind === 'quote').concat(SAMPLES.filter((r) => r.kind === 'quote'));
      box.appendChild(h('h3.dk-h', 'Quote requests'));
      box.appendChild(quotes.length ? table(['Received', 'Client', 'Occasion', 'People', 'Service', 'Club', 'When', 'Estimate'], quotes.map((r) =>
        h('tr', [cell(new Date(r.created).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })), cell(who(r)), cell(r.occasion), cell(String(r.people)),
          cell((BC.svcAt(r.svc, r.club) || {}).name || r.svc), cell(BC.data.clubs[r.club] ? BC.data.clubs[r.club].name : r.club), cell(r.when || ''), cell([h('strong', BC.money(r.estimate)), r.note ? [h('br'), h('small', r.note)] : null])]))) : h('p.dk-empty', 'No quote requests yet. Ask the chat for a group or wedding quote.'));
      box.appendChild(h('h3.dk-h', 'Chat leads'));
      box.appendChild(leads.length ? table(['First contact', 'Name and number', 'Asked about', 'Last said'], leads.map((r) =>
        h('tr', [cell(new Date(r.created).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })), cell(who(r)), cell(h('div.dk-chips', (r.interests || []).map((i) => h('span.dk-chip', i)))), cell(r.last || '')]))) : h('p.dk-empty', 'No leads yet. Open the chat, leave a name and number, and ask anything.'));
    } else {
      const chats = list.filter((r) => r.kind === 'chat');
      if (!chats.length) box.appendChild(h('p.dk-empty', 'No conversations yet.'));
      chats.forEach((c) => box.appendChild(h('details.dk-chat', [h('summary', [h('strong', c.name || 'Visitor'), ' ', h('span', (c.messages || []).length + ' messages, ' + new Date(c.updated || c.created).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))]),
        h('ol.dk-msgs', (c.messages || []).map((m) => h('li.is-' + m.who, [h('span', m.who === 'bot' ? 'Coach' : c.name || 'Visitor'), m.text])))])));
    }
    return box;
  }

  function csv() {
    const rows = all().filter((r) => r.kind === 'booking');
    const head = ['ref', 'created', 'source', 'club', 'service', 'add-ons', 'barber', 'date', 'time', 'minutes', 'name', 'phone', 'email', 'total', 'paid', 'status', 'method', 'fade', 'top', 'beard', 'notes'];
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lines = rows.map((r) => [r.ref, r.created, r.source, r.club, (BC.svcAt(r.svc, r.club) || {}).name, (r.addons || []).join(' + '), (BC.barber(r.barber) || {}).name, r.date, BC.clock(r.time, true), r.dur, r.name, r.phone, r.email, r.total, r.paid, r.status, r.method, (r.style || {}).fade, (r.style || {}).top, (r.style || {}).beard, r.notes].map(q).join(','));
    BC.download('balrcutz-bookings.csv', [head.join(',')].concat(lines).join('\n'), 'text/csv');
  }

  function build() {
    dlg = h('div.dk', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dk-title', hidden: true, 'data-lenis-prevent': true, on: { click: (e) => { if (e.target === dlg) close(); } } });
    document.body.appendChild(dlg);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && dlg && !dlg.hidden) close(); });
  }

  function refresh() {
    if (!dlg || dlg.hidden) return;
    const list = all();
    const n = (k) => list.filter((r) => r.kind === k).length + SAMPLES.filter((r) => r.kind === k).length;
    dlg.innerHTML = '';
    const card = h('div.dk-card', [
      h('header.dk-head', [h('div', [h('h2#dk-title', 'Front desk'), h('p', 'What the shop sees when someone books or chats. In this demo the records stay in your browser.')]),
        h('button.dk-close', { type: 'button', 'aria-label': 'Close the front desk', on: { click: close } }, '×')]),
      h('div.dk-bar', [h('div.dk-tabs', { role: 'tablist' }, [['booking', 'Bookings', n('booking')], ['lead', 'Leads and quotes', n('lead') + n('quote')], ['chat', 'Chats', n('chat')]].map(([id, name, count]) =>
        h('button.dk-tab', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), on: { click: () => { tab = id; refresh(); } } }, [name, h('span.dk-count', String(count))]))),
      h('div.dk-tools', [h('button.dk-tool', { type: 'button', on: { click: csv } }, 'Export bookings (CSV)'), h('button.dk-tool', { type: 'button', on: { click: () => { ['desk', 'taken', 'chat', 'lead'].forEach(BC.store.del); BC.toast('Demo data cleared'); refresh(); BC.emit('desk:cleared'); } } }, 'Clear demo data')])]),
      body(),
    ]);
    dlg.appendChild(card);
  }

  let lastFocus = null;
  function open(t) {
    if (!dlg) build();
    if (t) tab = t;
    lastFocus = document.activeElement;
    dlg.hidden = false;
    document.documentElement.classList.add('dk-open');
    if (BC.lenis) BC.lenis.stop();
    refresh();
    const c = dlg.querySelector('.dk-close');
    if (c) c.focus();
  }
  function close() {
    if (!dlg) return;
    dlg.hidden = true;
    document.documentElement.classList.remove('dk-open');
    if (BC.lenis) BC.lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => { const t = e.target.closest('[data-desk]'); if (t) { e.preventDefault(); open(t.getAttribute('data-desk') || 'booking'); } });

  BC.desk = { add, all, note, open, close };
})();
