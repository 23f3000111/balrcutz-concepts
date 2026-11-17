/* "Coach", the BalrCutz chat. Modelled on the MIR (Malaysia Industrial Realtors) assistant the brief points to:
   a lead gate first (name, WhatsApp number, optional email), then free text with intent detection and quick replies.
   It books inside the conversation with the same rules as the booking widget (club, service, extras, barber, day, time,
   style brief), quotes group bookings, takes payment by DuitNow QR, bank transfer or TNG eWallet, and files every lead,
   quote, booking and transcript on the front desk. Rule based and fully in the browser for the pitch. */
(() => {
  const BC = window.BC;
  const { h } = BC;
  const D = () => BC.data;
  const wait = (ms) => new Promise((r) => setTimeout(r, BC.reducedMotion() ? Math.min(ms, 120) : ms));

  const S = {
    lead: null, chatId: null, messages: [], pending: null, chain: Promise.resolve(),
    b: null, // booking in progress
  };

  let ui = {};

  /* ---------- persistence ---------- */
  function save() {
    BC.store.set('chat', { lead: S.lead, chatId: S.chatId, messages: S.messages.slice(-80) });
    if (S.lead && BC.desk) BC.desk.add('chat', { chatId: S.chatId, name: S.lead.name, phone: S.lead.phone, messages: S.messages.slice(-80), updated: new Date().toISOString() });
  }
  function interest(label, last) {
    if (!S.lead || !BC.desk) return;
    BC.desk.add('lead', { name: S.lead.name, phone: S.lead.phone, email: S.lead.email, source: 'Chat', interests: label ? [label] : [], last: last || undefined });
  }

  /* ---------- rendering ---------- */
  function scroll() { requestAnimationFrame(() => { ui.log.scrollTop = ui.log.scrollHeight; }); }
  function bubble(who, content) {
    const b = h('div.ch-msg.is-' + who, content);
    ui.log.appendChild(b);
    scroll();
    return b;
  }
  function you(text) {
    bubble('you', text);
    S.messages.push({ who: 'you', text, t: Date.now() });
    save();
  }
  async function say(content, ms) {
    const typing = h('div.ch-typing', { 'aria-label': 'Coach is typing' }, [h('i'), h('i'), h('i')]);
    ui.log.appendChild(typing); scroll();
    await wait(ms == null ? 520 + Math.min(900, (typeof content === 'string' ? content.length : 60) * 9) : ms);
    typing.remove();
    const b = bubble('bot', content);
    const text = typeof content === 'string' ? content : b.textContent;
    S.messages.push({ who: 'bot', text, t: Date.now() });
    save();
    return b;
  }
  function widget(node) {
    const w = h('div.ch-widget', node);
    ui.log.appendChild(w); scroll();
    return w;
  }
  /* Quick replies under the log. pick(item) gets the chosen item. */
  function quick(items, pick) {
    ui.quick.innerHTML = '';
    items.forEach((it) => ui.quick.appendChild(h('button.ch-chip', { type: 'button', on: { click: () => { ui.quick.innerHTML = ''; you(it.label); run(() => pick(it)); } } }, it.label)));
  }
  function clearQuick() { ui.quick.innerHTML = ''; }
  function lock(w) { BC.$$('button, input', w).forEach((b) => { b.disabled = true; }); w.classList.add('is-done'); }

  /* Everything the bot does runs in order, even if the visitor types fast */
  function run(fn) { S.chain = S.chain.then(fn).catch((e) => console.error(e)); return S.chain; }

  /* ---------- language ---------- */
  const RX = {
    greet: /^(hi+|hello|hey+|yo|hai|helo|salam|assalamualaikum|good (morning|afternoon|evening)|sup)\b/,
    thanks: /\b(thanks?|thank you|thx|tq|terima kasih|cheers|appreciate)\b/,
    book: /\b(book|booking|appointment|appt|reserve|slot|available|availability|free (today|tomorrow|tonight)|schedule|get a (cut|haircut|trim)|can i come|walk ?in)\b/,
    quote: /\b(quote|quotation|group|wedding|groom|groomsmen|bachelor|party|corporate|company event|event|photoshoot|squad|pax|\d+\s*(people|guys|persons|of us))\b|\bteam (outing|event|booking|haircuts?)\b/,
    price: /\b(price|prices|pricing|cost|how much|rate|rates|charge|charges|fee|berapa|harga|rm\s?\d*|menu)\b/,
    barbers: /\b(barber|barbers|who cuts|staff|team|stylist)\b/,
    where: /\b(where|location|located|address|direction|directions|map|waze|branch|outlet|club|find you)\b/,
    hours: /\b(open|opening|close|closing|hours?|tonight|sunday|public holiday|raya|cny|deepavali|christmas)\b/,
    parking: /\b(park|parking|car)\b/,
    pay: /\b(pay|paying|payment|duitnow|qr|tng|touch ?n ?go|e-?wallet|ewallet|bank|transfer|card|cash|deposit|refund|grabpay|boost)\b/,
    walkin: /\b(walk[- ]?in|walk-ins|without (a )?(booking|appointment))\b/,
    first: /\b(first[- ]?time|first visit|new customer|promo|promotion|discount|offer|deal|student)\b/,
    cancel: /\b(cancel|reschedule|change (my )?(booking|appointment|time)|running late|late)\b/,
    human: /\b(human|real person|someone|talk to|call|phone|whatsapp|speak|contact)\b/,
    kids: /\b(kid|kids|child|children|son|boy|toddler|baby)\b/,
    women: /\b(women|woman|lady|ladies|girl|female|her hair)\b/,
    products: /\b(product|products|pomade|clay|wax stick|hair wax|gel|shampoo|buy)\b/,
    vip: /\bvip\b/,
    mvp: /\bmvp\b/,
  };

  function findClub(t) {
    if (/hartamas|desa sri|\bkl\b|kuala lumpur|mont kiara/.test(t)) return 'hartamas';
    if (/jaya ?one|\bpj\b|petaling|section 13|seksyen 13/.test(t)) return 'jayaone';
    return null;
  }
  function findBarber(t) {
    const map = [[/\b(micheal|michael|mike|michale)\b/, 'micheal'], [/\blaith\b/, 'laith'], [/\b(ammar|amar)\b/, 'ammar'], [/\b(issa|isa)\b/, 'issa'], [/\badam\b/, 'adam'], [/\b(noor|nur|almendel)\b/, 'noor'], [/\b(crck|crack|crk)\b/, 'crck']];
    const m = map.find(([re]) => re.test(t));
    return m ? m[1] : null;
  }
  function findService(t, club) {
    const has = (id) => !club || BC.svcAt(id, club);
    const rules = [
      [/\bvip\b/, 'vip'], [/\bmvp\b/, 'mvp'], [/straighten|rebond|keratin/, 'straighten'],
      [/beard.{0,12}(colou?r|dye)|(colou?r|dye).{0,12}beard/, 'beard-colour'], [/colou?r|dye|grey|gray|highlight/, 'colour'],
      [/full facial|\bfacial\b/, 'facial'], [/black ?mask|charcoal/, 'black-mask'], [/face ?wash/, 'face-wash'],
      [/scalp|dandruff/, 'scalp'], [/(oil|head) ?massage|\bmassage\b/, 'oil-massage'], [/\bwax|nose|ear hair/, 'waxing'], [/brow/, 'brows'],
      [/super ?cut|hot (and|&) cold|towel/, 'supercut'], [/first[- ]?time.{0,20}beard|first[- ]?time.{0,20}shave/, 'ft-cut-beard'], [/first[- ]?time|first visit/, 'ft-cut'],
      [/(cut|hair|fade).{0,24}beard|beard.{0,24}(cut|hair|fade)/, 'cut-wash-beard'], [/\bbeard|shave|line ?up\b/, 'beard'],
      [/\b(dry cut|no wash|without wash)\b/, 'cut-dry'],
      [/\b(hair ?cut|haircut|cut|fade|trim|taper|buzz|crop|mullet|undercut|zero|skin fade|style)\b/, 'cut'],
    ];
    for (const [re, id] of rules) {
      if (!re.test(t)) continue;
      if (id === 'cut') return 'cut';
      if (id === 'oil-massage' && club === 'hartamas') return 'scalp';
      if (has(id)) return id;
    }
    return null;
  }
  function findDate(t) {
    const today = BC.today();
    if (/\b(today|tonight|now|this evening|sekarang|hari ini)\b/.test(t)) return BC.iso(today);
    if (/\b(tomorrow|tmr|tmrw|esok)\b/.test(t)) return BC.iso(BC.addDays(today, 1));
    if (/\b(day after tomorrow|lusa)\b/.test(t)) return BC.iso(BC.addDays(today, 2));
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dm = t.match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|sday|urday|rsday)?\b/);
    if (dm) { const want = days.indexOf(dm[1].slice(0, 3)); let n = (want - today.getDay() + 7) % 7; if (n === 0 && /next/.test(t)) n = 7; return BC.iso(BC.addDays(today, n)); }
    if (/\bweekend\b/.test(t)) return BC.iso(BC.addDays(today, (6 - today.getDay() + 7) % 7));
    const mons = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let m = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/) || null;
    let day, mon;
    if (m) { day = +m[1]; mon = mons.indexOf(m[2]); } else {
      m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);
      if (m) { day = +m[2]; mon = mons.indexOf(m[1]); } else {
        m = t.match(/\b(\d{1,2})[/.-](\d{1,2})\b/);
        if (m) { day = +m[1]; mon = +m[2] - 1; }
      }
    }
    if (day && mon >= 0 && mon < 12) {
      let d = new Date(today.getFullYear(), mon, day);
      if (d < today) d = new Date(today.getFullYear() + 1, mon, day);
      if (d.getDate() === day) return BC.iso(d);
    }
    return null;
  }
  function findTime(t) {
    if (/\bnoon\b/.test(t)) return { at: 720 };
    let m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/);
    if (m) { let hh = +m[1] % 12; if (/p/.test(m[3])) hh += 12; return { at: hh * 60 + (+m[2] || 0) }; }
    m = t.match(/\b(?:at|@|around|by)\s*(\d{1,2})(?::(\d{2}))?\b(?![/.-]\d)/) || t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (m) { let hh = +m[1]; if (hh < 10) hh += 12; return { at: hh * 60 + (+m[2] || 0) }; }
    if (/\bmorning\b/.test(t)) return { from: 600, to: 720 };
    if (/\b(afternoon|lunch)\b/.test(t)) return { from: 720, to: 1020 };
    if (/\b(evening|tonight|after work|night)\b/.test(t)) return { from: 1020, to: 1380 };
    return null;
  }

  /* ---------- the gate ---------- */
  function gate() {
    ui.form.hidden = true;
    clearQuick();
    const err = h('p.ch-err', { 'aria-live': 'assertive' });
    const f = h('form.ch-gate', { novalidate: true, on: { submit: (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const name = String(fd.get('name') || '').trim(), phone = String(fd.get('phone') || '').trim(), email = String(fd.get('email') || '').trim();
      const field = (n) => f.elements.namedItem(n);
      if (!name) { err.textContent = 'Add your name so the team knows who they are talking to.'; field('name').focus(); return; }
      if (!BC.phoneOk(phone)) { err.textContent = 'Use a Malaysian mobile number, for example 012-345 6789.'; field('phone').focus(); return; }
      if (!BC.emailOk(email)) { err.textContent = 'That email looks incomplete. Leave it empty if you prefer.'; field('email').focus(); return; }
      S.lead = { name, phone, email };
      BC.store.set('lead', S.lead);
      if (BC.desk) BC.desk.add('lead', { name, phone, email, source: 'Chat', interests: [], last: 'Started a chat' });
      card.remove();
      ui.form.hidden = false;
      run(welcome);
    } } }, [
      h('label', [h('span', 'Your name'), h('input', { name: 'name', autocomplete: 'name', required: true })]),
      h('label', [h('span', 'WhatsApp number'), h('input', { name: 'phone', type: 'tel', autocomplete: 'tel', placeholder: '012-345 6789', required: true })]),
      h('label', [h('span', 'Email (optional)'), h('input', { name: 'email', type: 'email', autocomplete: 'email' })]),
      err,
      h('button.ch-start', { type: 'submit' }, 'Start chat'),
      h('p.ch-fine', 'By starting, you agree BalrCutz may contact you on WhatsApp about your booking or question.'),
    ]);
    const card = h('div.ch-welcome', [
      h('img.ch-welcome-badge', { src: BC.asset('img/logo/badge-light-sm.png'), alt: '' }),
      h('h3', 'Hey, I\'m Coach'),
      h('p', 'I book chairs at both BalrCutz clubs, quote prices and answer questions. Leave your details so the team can follow up, then let\'s talk.'),
      f,
    ]);
    ui.log.appendChild(card);
  }

  const MAIN = [
    { label: 'Book a chair', go: 'book' },
    { label: 'Get a quote', go: 'quote' },
    { label: 'Prices', go: 'price' },
    { label: 'Barbers', go: 'barbers' },
    { label: 'Find us', go: 'where' },
    { label: 'Payment options', go: 'pay' },
  ];
  function mainChips() { quick(MAIN, (it) => route(it.go, '')); }

  async function welcome() {
    await say('Thanks, ' + BC.firstName(S.lead.name) + '. I can book your chair, give you a quote or answer anything about BalrCutz. What do you need?');
    mainChips();
  }

  /* ---------- intents ---------- */
  async function route(intent, text) {
    S.pending = null;
    switch (intent) {
      case 'book': return bookStart(text);
      case 'quote': return quoteStart(text);
      case 'price': return prices(text);
      case 'barbers': return barbers(text);
      case 'where': return where(text);
      case 'hours': interest('Opening hours'); await say(D().brand.hoursLabel + ', at both clubs. Evenings and weekends fill up first, so booking ahead holds your barber.'); return quick([{ label: 'Book a chair', go: 'book' }, { label: 'Find us', go: 'where' }], (it) => route(it.go, ''));
      case 'parking': return parking(text);
      case 'pay': return payInfo();
      case 'walkin': interest('Walk-ins'); await say('Walk-ins are welcome when a chair is free. Booking holds your barber and your time, and it takes a minute here.'); return quick([{ label: 'Book a chair', go: 'book' }, { label: 'Opening hours', go: 'hours' }], (it) => route(it.go, ''));
      case 'first': return firstVisit();
      case 'cancel': interest('Reschedule or cancel'); await say('You can cancel or move your booking any time before your appointment. Send the team your booking reference on WhatsApp and they will sort it.'); return quick([{ label: 'Message the team', go: 'human' }, { label: 'Book a new time', go: 'book' }], (it) => route(it.go, ''));
      case 'human': return human(text);
      case 'kids': interest('Kids cuts'); await say('For a kid\'s cut, message the team first so they can match the right barber and time.'); return quick([{ label: 'Message the team', go: 'human' }, { label: 'Book a chair', go: 'book' }], (it) => route(it.go, ''));
      case 'women': interest('Women\'s cuts'); await say('BalrCutz is a men\'s grooming shop. For anything else, ask the team on WhatsApp and they will tell you straight.'); return quick([{ label: 'Message the team', go: 'human' }, ...MAIN.slice(2, 4)], (it) => route(it.go, ''));
      case 'products': interest('Products'); await say('Both clubs stock styling products. Ask your barber what suits your hair at the end of your cut and they will show you how to use it.'); return mainChips();
      case 'vip': return signature('vip');
      case 'mvp': return signature('mvp');
      case 'greet': await say('Hey ' + BC.firstName(S.lead.name) + '. What can I do for you?'); return mainChips();
      case 'thanks': await say('Any time. See you in the chair.'); return mainChips();
      default: return fallback(text);
    }
  }

  function detect(t) {
    if (/\b(gift ?cards?|vouchers?|franchise|job|jobs|hiring|vacanc|intern)\b/.test(t)) return 'free';
    if (RX.where.test(t) && RX.parking.test(t)) return 'where';
    if (RX.quote.test(t) && !RX.barbers.test(t)) return 'quote';
    if (RX.cancel.test(t)) return 'cancel';
    if (RX.book.test(t) && !RX.walkin.test(t)) return 'book';
    if (RX.walkin.test(t)) return 'walkin';
    if (RX.first.test(t)) return 'first';
    if (RX.vip.test(t)) return 'vip';
    if (RX.mvp.test(t)) return 'mvp';
    if (RX.pay.test(t)) return 'pay';
    if (RX.price.test(t) || findService(t)) return 'price';
    if (RX.parking.test(t)) return 'parking';
    if (RX.hours.test(t)) return 'hours';
    if (RX.where.test(t) || findClub(t)) return 'where';
    if (RX.barbers.test(t) || findBarber(t)) return 'barbers';
    if (RX.kids.test(t)) return 'kids';
    if (RX.women.test(t)) return 'women';
    if (RX.products.test(t)) return 'products';
    if (RX.human.test(t)) return 'human';
    if (RX.thanks.test(t)) return 'thanks';
    if (RX.greet.test(t)) return 'greet';
    return 'free';
  }

  function onText(text) {
    if (!text.trim()) return;
    you(text);
    clearQuick();
    const t = text.toLowerCase();
    interest(null, text.slice(0, 140));
    if (S.pending) { const p = S.pending; S.pending = null; return run(() => p(text, t)); }
    return run(() => route(detect(t), t));
  }

  async function fallback(text) {
    interest('Asked: ' + String(text).slice(0, 60));
    await say('I\'m not sure about that one, but the team will know. I can send your question to them on WhatsApp, or pick something below.');
    const link = h('a.ch-btn', { href: BC.wa('Hi BalrCutz, ' + BC.firstName(S.lead.name) + ' here (' + S.lead.phone + '). Question from the website chat: ' + text), target: '_blank', rel: 'noopener' }, 'Ask the team on WhatsApp');
    widget(link);
    mainChips();
  }

  async function human(text) {
    interest('Wants to talk to the team');
    await say('Here\'s the team on WhatsApp. They usually reply within minutes during opening hours.');
    widget(h('div.ch-actions', [
      h('a.ch-btn', { href: BC.wa('Hi BalrCutz, ' + BC.firstName(S.lead.name) + ' here (' + S.lead.phone + ').' + (text ? ' ' + text : '')), target: '_blank', rel: 'noopener' }, 'WhatsApp ' + D().brand.whatsappLabel),
      ...Object.values(D().clubs).map((c) => h('a.ch-btn.is-ghost', { href: 'tel:' + c.tel }, 'Call ' + c.name)),
    ]));
    mainChips();
  }

  async function prices(t) {
    const club = findClub(t || '');
    const id = findService(t || '', club);
    if (id && id !== 'cut') {
      const s = BC.svc(id);
      interest('Price: ' + s.name);
      const at = Object.keys(s.at).map((c) => s.at[c].name ? s.at[c].name + ' at ' + D().clubs[c].name + ' is ' + BC.money(s.at[c].price) + ' (' + BC.dur(s.at[c].dur) + ')' : D().clubs[c].name + ' ' + BC.money(s.at[c].price) + ' (' + BC.dur(s.at[c].dur) + ')');
      const same = Object.keys(s.at).length === 2 && s.at.jayaone.price === s.at.hartamas.price;
      await say(same ? s.name + ' is ' + BC.money(s.at.jayaone.price) + ' at both clubs. ' + (s.blurb || '') : s.name + ': ' + at.join('; ') + '. ' + (s.blurb || ''));
      return quick([{ label: 'Book it', go: 'book', svc: id }, { label: 'Full menu', go: 'menu' }, { label: 'Something else', go: 'main' }], (it) => it.go === 'book' ? bookStart('', { svc: it.svc, club: Object.keys(s.at).length === 1 ? Object.keys(s.at)[0] : club }) : it.go === 'menu' ? menu(club || 'jayaone') : mainChips());
    }
    interest('Prices');
    if (id === 'cut') {
      await say('Haircuts are ' + BC.money(45) + ' without a wash, ' + BC.money(55) + ' with a wash, ' + BC.money(65) + ' with a beard trim and ' + BC.money(75) + ' for the Super Cut with hot and cold towels. First visit? Cut + wash is ' + BC.money(39) + '.');
      return quick([{ label: 'Book a cut', go: 'book' }, { label: 'Full menu', go: 'menu' }], (it) => it.go === 'book' ? bookStart('cut') : menu(club || 'jayaone'));
    }
    return menu(club || 'jayaone');
  }

  async function menu(club) {
    await say('Here\'s the ' + D().clubs[club].name + ' menu. Tap anything to book it.', 400);
    const list = BC.menu(club).filter((m) => !m.addon);
    const w = widget(h('div.ch-menu', [
      h('div.ch-seg', Object.values(D().clubs).map((c) => h('button', { type: 'button', 'aria-pressed': String(c.id === club), on: { click: () => { lock(w); run(() => menu(c.id)); } } }, c.name))),
      h('ul', list.map((m) => h('li', h('button.ch-row', { type: 'button', on: { click: () => { lock(w); you(m.name); run(() => bookStart('', { svc: m.id, club })); } } }, [h('span', m.name), h('span.ch-row-meta', BC.dur(m.dur)), h('strong', BC.money(m.price))])))),
      h('p.ch-small', 'Add-ons like beard trims, masks and waxing can be added when you book.'),
    ]));
    mainChips();
  }

  async function barbers(t) {
    const one = findBarber(t || '');
    if (one) {
      const b = BC.barber(one);
      interest('Barber: ' + b.name);
      await say((b.full || b.name) + ' cuts at ' + D().clubs[b.club].name + '. ' + b.skills + (b.years ? ', with ' + b.years + ' years behind the chair.' : '.') + ' Want his chair?');
      return quick([{ label: 'Book ' + b.name, go: 'book' }, { label: 'All barbers', go: 'all' }], (it) => it.go === 'book' ? bookStart('', { barber: b.id, club: b.club }) : barbers(''));
    }
    interest('Barbers');
    await say('Seven barbers across two clubs. Pick one to book their chair.');
    const w = widget(h('div.ch-team', BC.teamAt().map((b) => h('button.ch-person', { type: 'button', on: { click: () => { lock(w); you(b.name); run(() => bookStart('', { barber: b.id, club: b.club })); } } }, [
      h('img', { src: BC.asset(b.photo + '-bw.webp'), alt: '', width: 48, height: 60, loading: 'lazy' }), h('strong', b.name), h('small', D().clubs[b.club].name),
    ]))));
    mainChips();
  }

  async function where(t) {
    const club = findClub(t || '');
    interest('Location' + (club ? ': ' + D().clubs[club].name : ''));
    const list = club ? [D().clubs[club]] : Object.values(D().clubs);
    await say(club ? 'Here\'s ' + D().clubs[club].name + '.' : 'Two clubs, both open every day from 10am to 11pm.');
    const parkingToo = RX.parking.test(t || '');
    widget(h('div.ch-places', list.map((c) => h('div.ch-place', [
      h('strong', c.name), h('p', c.address), parkingToo ? h('p', 'Parking: ' + c.parking) : null,
      h('div.ch-actions', [h('a.ch-btn', { href: c.maps, target: '_blank', rel: 'noopener' }, 'Directions'), h('a.ch-btn.is-ghost', { href: 'tel:' + c.tel }, 'Call ' + c.phone)]),
    ]))));
    if (parkingToo) interest('Parking');
    quick((parkingToo ? [] : [{ label: 'Parking', go: 'parking' }]).concat([{ label: 'Book a chair', go: 'book' }, { label: 'Something else', go: 'main' }]), (it) => it.go === 'main' ? mainChips() : route(it.go, t || ''));
  }

  async function parking(t) {
    const club = findClub(t || '');
    interest('Parking');
    const list = club ? [D().clubs[club]] : Object.values(D().clubs);
    for (const c of list) await say(c.name + ': ' + c.parking, 380);
    quick([{ label: 'Directions', go: 'where' }, { label: 'Book a chair', go: 'book' }], (it) => route(it.go, t || ''));
  }

  async function payInfo() {
    interest('Payment options');
    await say('Book online and pay a ' + BC.money(D().pay.deposit) + ' deposit or the full amount by DuitNow QR, bank transfer or Touch \'n Go eWallet. Prefer to pay after your cut? Choose pay at the shop.');
    quick([{ label: 'Book a chair', go: 'book' }, { label: 'Prices', go: 'price' }], (it) => route(it.go, ''));
  }

  async function firstVisit() {
    interest('First visit offer');
    await say('First time with us? The First Time Cut + Wash is ' + BC.money(39) + ', and Cut + Wash + Beard is ' + BC.money(59) + ' (a shave instead of the beard trim at Hartamas).');
    quick([{ label: 'Book my first cut', go: 'book' }, { label: 'Full menu', go: 'menu' }], (it) => it.go === 'book' ? bookStart('', { svc: 'ft-cut' }) : menu('jayaone'));
  }

  async function signature(id) {
    const s = BC.svc(id);
    interest(s.name);
    if (id === 'vip') await say('The VIP Room is at Hartamas: ' + s.includes.join(', ').toLowerCase() + '. ' + BC.money(s.at.hartamas.price) + ' for ' + BC.dur(s.at.hartamas.dur) + '.');
    else await say('The MVP Package is ' + BC.money(200) + ': consultation, precision cut, deep cleanse wash and a full facial. ' + BC.dur(90) + ' at Jaya One, ' + BC.dur(60) + ' at Hartamas.');
    quick([{ label: 'Book the ' + s.name, go: 'book' }, { label: 'Something else', go: 'main' }], (it) => it.go === 'book' ? bookStart('', { svc: id, club: id === 'vip' ? 'hartamas' : null }) : mainChips());
  }

  /* ---------- booking inside the chat ---------- */
  async function bookStart(t, preset) {
    t = t || '';
    const b = (S.b = { club: null, svc: null, addons: [], barber: null, date: null, time: null, style: {}, notes: '', photo: null, payMode: 'deposit', method: 'duitnow', first: null, hint: null });
    Object.assign(b, preset || {});
    if (!b.club) b.club = findClub(t);
    const bid = b.barber || findBarber(t);
    if (bid) { b.barber = bid; b.club = BC.barber(bid).club; }
    const svc = b.svc || findService(t, b.club) || findService(t);
    if (svc) b.svc = svc;
    if (b.svc && b.svc !== 'cut' && !b.club) { const at = Object.keys(BC.svc(b.svc).at); if (at.length === 1) b.club = at[0]; }
    const day = findDate(t);
    if (day) b.date = day;
    b.hint = findTime(t);
    interest('Booking');
    const known = [b.club && D().clubs[b.club].name, b.barber && BC.barber(b.barber).name, b.svc && b.svc !== 'cut' && BC.svc(b.svc).name, b.date && BC.shortDate(b.date)].filter(Boolean);
    await say(known.length ? 'Let\'s book it. I\'ve got: ' + known.join(', ') + '.' : 'Let\'s get you in the chair.', 420);
    return nextStep();
  }

  async function nextStep() {
    const b = S.b;
    if (!b.club) return askClub();
    if (b.svc && b.svc !== 'cut' && !BC.svcAt(b.svc, b.club)) return askSwitch();
    if (b.svc === 'cut' || !b.svc) return askService();
    if (b.first == null && ['cut-dry', 'cut-wash', 'cut-wash-beard'].includes(b.svc)) return askFirst();
    if (!b.addonsDone) return askAddons();
    if (!b.barber) return askBarber();
    if (!b.date) return askDate();
    if (b.time == null) return askTime();
    if (!b.styleDone) return askStyle();
    return showSummary();
  }

  async function askClub() {
    await say('Which club?', 380);
    const w = widget(h('div.ch-options', Object.values(D().clubs).map((c) => h('button.ch-option', { type: 'button', on: { click: () => { lock(w); you(c.name); S.b.club = c.id; if (S.b.svc && S.b.svc !== 'cut' && !BC.svcAt(S.b.svc, c.id)) S.b.svc = null; run(nextStep); } } }, [h('strong', c.name), h('small', c.area)]))));
    S.pending = (text, t) => { const c = findClub(t); if (c) { lock(w); S.b.club = c; return nextStep(); } return route(detect(t), t); };
  }

  async function askSwitch() {
    const b = S.b;
    const s = BC.svc(b.svc);
    const other = Object.keys(s.at)[0];
    await say(s.name + ' is only on the menu at ' + D().clubs[other].name + '. Book it there?', 400);
    quick([{ label: 'Yes, ' + D().clubs[other].name, v: true }, { label: 'Pick another service', v: false }], (it) => {
      if (it.v) { b.club = other; if (b.barber && b.barber !== 'any' && BC.barber(b.barber).club !== other) b.barber = null; b.addons = b.addons.filter((a) => BC.svcAt(a, other)); }
      else b.svc = null;
      return nextStep();
    });
  }

  async function askService() {
    const b = S.b;
    const cut = b.svc === 'cut';
    await say(cut ? 'Which cut?' : 'What are we doing?', 380);
    const menu = BC.menu(b.club).filter((m) => !m.addon && (cut ? m.cat === 'hair' || m.cat === 'first' : true));
    const top = cut ? menu : menu.filter((m) => ['ft-cut', 'cut-wash', 'cut-wash-beard', 'supercut', 'mvp', 'vip', 'facial', 'colour'].includes(m.id));
    const w = widget(h('div.ch-svcs', top.map((m) => h('button.ch-row', { type: 'button', on: { click: () => { lock(w); you(m.name); S.b.svc = m.id; run(nextStep); } } }, [h('span', m.name), h('span.ch-row-meta', BC.dur(m.dur)), h('strong', BC.money(m.price))]))));
    if (!cut) quick([{ label: 'Something else', go: 'more' }], () => moreServices());
    S.pending = (text, t) => { const id = findService(t, b.club); if (id && id !== 'cut') { lock(w); S.b.svc = id; return nextStep(); } if (id === 'cut') { lock(w); S.b.svc = 'cut'; return nextStep(); } return route(detect(t), t); };
  }
  async function moreServices() {
    const b = S.b;
    await say('Here\'s everything at ' + D().clubs[b.club].name + '.', 300);
    const menu = BC.menu(b.club).filter((m) => !m.addon);
    const w = widget(h('div.ch-svcs', menu.map((m) => h('button.ch-row', { type: 'button', on: { click: () => { lock(w); you(m.name); S.b.svc = m.id; run(nextStep); } } }, [h('span', m.name), h('span.ch-row-meta', BC.dur(m.dur)), h('strong', BC.money(m.price))]))));
  }

  async function askFirst() {
    await say('First time at BalrCutz?', 360);
    quick([{ label: 'Yes, first time', v: true }, { label: 'I\'ve been before', v: false }], async (it) => {
      const b = S.b;
      b.first = it.v;
      if (it.v) {
        const to = b.svc === 'cut-wash-beard' ? 'ft-cut-beard' : 'ft-cut';
        const a = BC.svcAt(b.svc, b.club), c = BC.svcAt(to, b.club);
        b.svc = to;
        await say('Welcome. I\'ve switched you to the ' + c.name + ': ' + BC.money(c.price) + ' instead of ' + BC.money(a.price) + '.');
      }
      return nextStep();
    });
  }

  async function askAddons() {
    const b = S.b;
    const opts = BC.menu(b.club).filter((m) => m.addon && m.id !== b.svc);
    await say('Add anything? Tap as many as you like.', 380);
    const picked = new Set(b.addons);
    const total = h('span.ch-addon-total');
    const done = h('button.ch-btn', { type: 'button', on: { click: () => {
      lock(w);
      b.addons = Array.from(picked);
      b.addonsDone = true;
      you(b.addons.length ? 'Add ' + b.addons.map((a) => BC.svcAt(a, b.club).name).join(', ') : 'No extras');
      run(nextStep);
    } } }, 'No extras');
    const upd = () => { const sum = Array.from(picked).reduce((n, a) => n + BC.svcAt(a, b.club).price, 0); total.textContent = picked.size ? '+' + BC.money(sum) : ''; done.textContent = picked.size ? 'Done' : 'No extras'; };
    const w = widget(h('div.ch-addons', [h('div.ch-chipset', opts.map((a) => h('button.ch-tog', { type: 'button', 'aria-pressed': String(picked.has(a.id)), on: { click: (e) => { picked.has(a.id) ? picked.delete(a.id) : picked.add(a.id); e.currentTarget.setAttribute('aria-pressed', String(picked.has(a.id))); upd(); } } }, [a.name, h('small', '+' + BC.money(a.price))]))), h('div.ch-actions', [done, total])]));
    upd();
  }

  async function askBarber() {
    const b = S.b;
    await say('Any barber, or someone in particular?', 380);
    const w = widget(h('div.ch-team', [h('button.ch-person', { type: 'button', on: { click: () => pick('any', 'Any barber') } }, [h('span.ch-any', h('img', { src: BC.asset('img/logo/mark-white-sm.png'), alt: '' })), h('strong', 'Any barber'), h('small', 'First free chair')])]
      .concat(BC.teamAt(b.club).map((p) => h('button.ch-person', { type: 'button', on: { click: () => pick(p.id, p.name) } }, [h('img', { src: BC.asset(p.photo + '-bw.webp'), alt: '', width: 48, height: 60, loading: 'lazy' }), h('strong', p.name), h('small', p.years ? p.years + ' yrs' : 'Barber')]))))
    );
    function pick(id, name) { lock(w); you(name); S.b.barber = id; run(nextStep); }
    S.pending = (text, t) => { const id = findBarber(t); if (/any|anyone|whoever|no preference/.test(t)) { lock(w); S.b.barber = 'any'; return nextStep(); } if (id && BC.barber(id).club === S.b.club) { lock(w); S.b.barber = id; return nextStep(); } return route(detect(t), t); };
  }

  function dur() { return BC.book.quote({ club: S.b.club, svc: S.b.svc, addons: S.b.addons }).dur; }

  async function askDate(note) {
    const b = S.b;
    await say(note || 'Which day?', 380);
    const days = [];
    for (let i = 0; i < 10; i++) days.push(BC.iso(BC.addDays(BC.today(), i)));
    const w = widget(h('div.ch-dates', days.map((iso) => {
      const st = BC.book.dayState(b.club, b.barber, iso, dur());
      const d = BC.fromIso(iso);
      return h('button.ch-day', { type: 'button', disabled: st !== 'open' ? true : null, 'aria-label': BC.longDate(iso) + (st !== 'open' ? ', no free times' : ''), on: { click: () => { lock(w); you(BC.shortDate(iso)); S.b.date = iso; run(nextStep); } } }, [
        h('small', iso === days[0] ? 'Today' : iso === days[1] ? 'Tmrw' : BC.DAYS[d.getDay()].slice(0, 3)), h('strong', String(d.getDate())), h('small', st === 'open' ? BC.MONTHS[d.getMonth()].slice(0, 3) : st === 'off' ? 'Off' : 'Full'),
      ]);
    })));
    quick([{ label: 'Another date', go: 'cal' }], () => { lock(w); return monthPicker(); });
    S.pending = (text, t) => { const iso = findDate(t); if (iso) { lock(w); const st = BC.book.dayState(b.club, b.barber, iso, dur()); if (st === 'open') { S.b.date = iso; S.b.hint = findTime(t) || S.b.hint; return nextStep(); } return askDate(BC.shortDate(iso) + (st === 'past' ? ' has passed.' : st === 'later' ? ' is too far ahead; bookings open ' + BC.book.WINDOW_DAYS + ' days out.' : ' has no free times.') + ' Pick another day?'); } return route(detect(t), t); };
  }

  async function monthPicker() {
    const b = S.b;
    let month = BC.today(); month.setDate(1);
    await say('Pick a day.', 300);
    const box = h('div.ch-cal');
    const w = widget(box);
    const draw = () => {
      box.innerHTML = '';
      const y = month.getFullYear(), mo = month.getMonth();
      const first = (new Date(y, mo, 1).getDay() + 6) % 7, n = new Date(y, mo + 1, 0).getDate();
      const min = BC.today(); min.setDate(1);
      const max = BC.addDays(BC.today(), BC.book.WINDOW_DAYS); max.setDate(1);
      box.append(h('div.ch-cal-head', [
        h('button', { type: 'button', 'aria-label': 'Previous month', disabled: month <= min ? true : null, on: { click: () => { month = new Date(y, mo - 1, 1); draw(); } } }, '‹'),
        h('strong', BC.MONTHS[mo] + ' ' + y),
        h('button', { type: 'button', 'aria-label': 'Next month', disabled: month >= max ? true : null, on: { click: () => { month = new Date(y, mo + 1, 1); draw(); } } }, '›'),
      ]));
      const g = h('div.ch-cal-grid');
      ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((x) => g.appendChild(h('span.ch-dow', x)));
      for (let i = 0; i < first; i++) g.appendChild(h('span'));
      for (let d = 1; d <= n; d++) {
        const iso = BC.iso(new Date(y, mo, d));
        const st = BC.book.dayState(b.club, b.barber, iso, dur());
        g.appendChild(h('button.ch-cal-day', { type: 'button', class: 'is-' + st, disabled: st !== 'open' ? true : null, 'aria-label': BC.longDate(iso), on: { click: () => { lock(w); you(BC.shortDate(iso)); S.b.date = iso; run(nextStep); } } }, String(d)));
      }
      box.appendChild(g);
    };
    draw();
  }

  async function askTime() {
    const b = S.b;
    const list = BC.book.slots(b.club, b.barber, b.date, dur());
    if (!list.length) {
      const day = b.date;
      b.date = null;
      if (b.barber !== 'any' && BC.book.busyFor(b.barber, day).off) {
        const name = BC.barber(b.barber).name;
        await say(name + ' is off on ' + BC.shortDate(day) + '. Another barber that day, or another day with ' + name + '?', 420);
        return quick([{ label: 'Any barber on ' + BC.shortDate(day), v: 'any' }, { label: 'Another day with ' + name, v: 'day' }], (it) => {
          if (it.v === 'any') { b.barber = 'any'; b.date = day; }
          return nextStep();
        });
      }
      return askDate('No free times left on ' + BC.shortDate(day) + '. Pick another day?');
    }
    const hint = b.hint;
    let show = list;
    if (hint && hint.at != null) {
      const exact = list.find((x) => x.t === hint.at);
      if (exact) {
        const who = b.barber === 'any' ? BC.barber(exact.barber).name : BC.barber(b.barber).name;
        await say(BC.clock(exact.t) + ' is free with ' + who + '. Shall I hold it?', 420);
        quick([{ label: 'Yes, hold ' + BC.clock(exact.t), v: exact }, { label: 'Show other times', v: null }], (it) => {
          if (it.v) { S.b.time = it.v.t; S.b.assigned = it.v.barber; return nextStep(); }
          S.b.hint = null; return askTime();
        });
        return;
      }
      show = list.slice().sort((a, c) => Math.abs(a.t - hint.at) - Math.abs(c.t - hint.at)).slice(0, 6).sort((a, c) => a.t - c.t);
      await say(BC.clock(hint.at) + ' is taken. The closest free times:', 420);
    } else if (hint && hint.from != null) {
      const inRange = list.filter((x) => x.t >= hint.from && x.t < hint.to);
      show = inRange.length ? inRange : list;
      await say(inRange.length ? 'Free times then on ' + BC.shortDate(b.date) + ':' : 'Nothing free then. Here\'s the rest of ' + BC.shortDate(b.date) + ':', 420);
    } else {
      await say('Free times on ' + BC.shortDate(b.date) + ':', 380);
    }
    b.hint = null;
    let all = false;
    const box = h('div.ch-times');
    const w = widget(box);
    const draw = () => {
      box.innerHTML = '';
      const pickList = all ? list : show.slice(0, 12);
      pickList.forEach((x) => box.appendChild(h('button.ch-time', { type: 'button', on: { click: () => { lock(w); you(BC.clock(x.t)); S.b.time = x.t; S.b.assigned = x.barber; run(nextStep); } } }, BC.clock(x.t))));
      if (!all && list.length > pickList.length) box.appendChild(h('button.ch-time.is-more', { type: 'button', on: { click: () => { all = true; draw(); scroll(); } } }, 'All times'));
    };
    draw();
    quick([{ label: 'Change the day', go: 'day' }], () => { lock(w); S.b.date = null; return nextStep(); });
    S.pending = (text, t) => {
      const tm = findTime(t);
      if (tm) { lock(w); S.b.hint = tm; return askTime(); }
      const iso = findDate(t);
      if (iso) { lock(w); S.b.date = iso; return nextStep(); }
      return route(detect(t), t);
    };
  }

  async function askStyle() {
    const b = S.b;
    const beardy = /beard/.test(b.svc) || b.addons.includes('beard');
    await say('Quick style brief for your barber? It saves explaining in the chair. Tap what fits, or skip.', 420);
    const keys = ['fade', 'top'].concat(beardy ? ['beard'] : []);
    const STY = BC.book.STYLE;
    const w = widget(h('div.ch-style', [
      ...keys.map((k) => h('div.ch-style-row', [h('span', STY[k].label), h('div.ch-chipset', STY[k].opts.map((o) => h('button.ch-tog', { type: 'button', 'aria-pressed': 'false', on: { click: (e) => {
        b.style[k] = b.style[k] === o ? '' : o;
        BC.$$('button', e.currentTarget.parentElement).forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === b.style[k])));
      } } }, o)))])),
      h('div.ch-photo', [
        h('label.ch-btn.is-ghost', { for: 'ch-photo-' + S.chatId + ui.log.children.length }, 'Add a reference photo'),
        h('input.bk-file', { id: 'ch-photo-' + S.chatId + ui.log.children.length, type: 'file', accept: 'image/*', on: { change: (e) => BC.book.shrinkPhoto(e.target.files[0]).then((url) => { b.photo = url; const old = w.querySelector('.ch-photo img'); if (old) old.remove(); w.querySelector('.ch-photo').prepend(h('img', { src: url, alt: 'Your reference photo' })); }, () => BC.toast('That file is not a photo.', 'warn')) } }),
      ]),
      h('div.ch-actions', [h('button.ch-btn', { type: 'button', on: { click: () => finishStyle(false) } }, 'Done'), h('button.ch-btn.is-ghost', { type: 'button', on: { click: () => finishStyle(true) } }, 'Skip')]),
    ]));
    function finishStyle(skip) {
      lock(w);
      if (skip) { b.style = {}; b.photo = null; }
      const said = Object.values(b.style).filter(Boolean);
      you(skip ? 'Skip' : said.length || b.photo ? said.join(', ') + (b.photo ? (said.length ? ', ' : '') + 'photo added' : '') : 'Done');
      b.styleDone = true;
      run(async () => {
        if (!skip) {
          await say('Anything else your barber should know? Type it, or tap No.', 360);
          quick([{ label: 'No, that\'s all' }], () => nextStep());
          S.pending = (text) => { b.notes = text; return nextStep(); };
          return;
        }
        return nextStep();
      });
    }
  }

  async function showSummary() {
    const b = S.b;
    const q = BC.book.quote({ club: b.club, svc: b.svc, addons: b.addons, payMode: b.payMode });
    const barber = BC.barber(b.barber === 'any' ? b.assigned : b.barber);
    await say('Here\'s your booking and quote.', 360);
    widget(h('div.ch-sum', [
      h('p.ch-sum-when', [h('strong', BC.longDate(b.date)), ' at ', h('strong', BC.clock(b.time))]),
      h('p.ch-small', 'With ' + barber.name + (b.barber === 'any' ? ' (first free chair)' : '') + ' at ' + D().clubs[b.club].name + ', ' + BC.dur(q.dur)),
      h('table', [h('tbody', q.lines.map((l) => h('tr', [h('td', l.label), h('td', BC.money(l.price))]))), h('tfoot', h('tr', [h('td', 'Total'), h('td', BC.money(q.total))]))]),
      Object.values(b.style).some(Boolean) || b.notes ? h('p.ch-small', 'Brief: ' + Object.values(b.style).filter(Boolean).concat(b.notes ? [b.notes] : []).join(', ')) : null,
    ]));
    await say('How would you like to pay?', 380);
    quick([
      { label: 'Deposit ' + BC.money(q.deposit), mode: 'deposit' },
      { label: 'Pay in full ' + BC.money(q.total), mode: 'full' },
      { label: 'Pay at the shop', mode: 'shop' },
      { label: 'Change something', mode: 'change' },
    ], (it) => it.mode === 'change' ? changeSomething() : choosePay(it.mode));
  }

  async function changeSomething() {
    await say('What would you like to change?', 300);
    quick([
      { label: 'Service', k: 'svc' }, { label: 'Barber', k: 'barber' }, { label: 'Day and time', k: 'date' }, { label: 'Club', k: 'club' },
    ], (it) => {
      const b = S.b;
      if (it.k === 'svc') { b.svc = null; b.addonsDone = false; b.addons = []; b.time = null; }
      if (it.k === 'barber') { b.barber = null; b.time = null; }
      if (it.k === 'date') { b.date = null; b.time = null; }
      if (it.k === 'club') { b.club = null; b.barber = null; b.svc = b.svc && b.svc !== 'cut' ? b.svc : null; b.addons = []; b.addonsDone = false; b.date = null; b.time = null; }
      return nextStep();
    });
  }

  async function choosePay(mode) {
    const b = S.b;
    b.payMode = mode;
    b.ref = b.ref || BC.ref();
    const state = () => ({ club: b.club, svc: b.svc, addons: b.addons, barber: b.barber, assigned: b.assigned, date: b.date, time: b.time, name: S.lead.name, phone: S.lead.phone, email: S.lead.email, notes: b.notes, first: !!b.first, style: b.style, photo: b.photo, remind: true, payMode: mode, method: b.method, paid: b.paid, ref: b.ref });
    if (mode === 'shop') return confirmBooking(state());
    const q = BC.book.quote({ club: b.club, svc: b.svc, addons: b.addons, payMode: mode });
    await say('Pay ' + BC.money(q.now) + ' with any of these. Reference ' + b.ref + '.', 380);
    const box = h('div.ch-pay');
    const w = widget(box);
    BC.pay.render(box, { amount: q.now, ref: b.ref, method: b.method, compact: true, onMethod: (m) => { b.method = m; }, onPaid: (m) => { b.method = m; b.paid = true; lock(w); you(m === 'bank' ? 'Receipt sent' : 'Paid'); run(() => confirmBooking(state())); } });
    quick([{ label: 'Pay at the shop instead', go: 'shop' }], () => { lock(w); b.payMode = 'shop'; return confirmBooking(Object.assign(state(), { payMode: 'shop' })); });
  }

  async function confirmBooking(st) {
    const rec = BC.book.commit(st, 'Chat');
    S.b = null;
    interest('Booked ' + rec.ref);
    const club = D().clubs[rec.club], svc = BC.svcAt(rec.svc, rec.club), barber = BC.barber(rec.barber);
    await say('Done. You\'re booked, ' + BC.firstName(rec.name) + '.', 420);
    widget(h('div.ch-ticket', [
      h('div.ch-ticket-top', [h('img', { src: BC.asset('img/logo/badge-light-sm.png'), alt: '' }), h('div', [h('small', 'Booking'), h('strong', rec.ref)])]),
      h('p.ch-ticket-when', [h('strong', BC.clock(rec.time)), ' ', BC.shortDate(rec.date)]),
      h('p', svc.name + (rec.addons.length ? ' + ' + rec.addons.map((a) => BC.svcAt(a, rec.club).name).join(', ') : '')),
      h('p', barber.name + ' at ' + club.name),
      h('p.ch-small', rec.status === 'Pay at shop' ? 'Pay ' + BC.money(rec.total) + ' at the shop' : BC.money(rec.paid) + ' ' + (rec.status === 'Receipt sent' ? 'by bank transfer, receipt sent' : 'paid by ' + rec.method) + (rec.total > rec.paid ? '. ' + BC.money(rec.total - rec.paid) + ' at the shop' : '')),
      h('div.ch-actions', [
        h('button.ch-btn', { type: 'button', on: { click: () => BC.download('balrcutz-' + rec.ref + '.ics', BC.book.ics(rec), 'text/calendar') } }, 'Add to calendar'),
        h('a.ch-btn.is-ghost', { href: BC.wa(BC.book.waText(rec)), target: '_blank', rel: 'noopener' }, 'Send on WhatsApp'),
      ]),
    ]));
    await say('A reminder goes to ' + rec.phone + ' the day before. Anything else?', 500);
    if (BC.desk) widget(h('button.ch-link', { type: 'button', on: { click: () => BC.desk.open('booking') } }, 'Demo: see this booking on the front desk'));
    mainChips();
  }

  /* ---------- group quote ---------- */
  async function quoteStart(t) {
    t = t || '';
    interest('Group quote');
    const q = (S.q = { occasion: null, people: null, svc: null, club: findClub(t), when: null });
    const n = t.match(/\b(\d{1,2})\s*(people|guys|pax|persons|of us|groomsmen)?\b/);
    if (n && +n[1] > 1 && +n[1] < 60) q.people = +n[1];
    if (/wedding|groom|bachelor/.test(t)) q.occasion = 'Wedding party';
    else if (/corporate|company|office|team/.test(t)) q.occasion = 'Team or company';
    else if (/photo|shoot/.test(t)) q.occasion = 'Photoshoot';
    else if (/birthday/.test(t)) q.occasion = 'Birthday';
    await say('Happy to quote. A few quick questions.', 380);
    return quoteNext();
  }
  async function quoteNext() {
    const q = S.q;
    if (!q.occasion) {
      await say('What\'s the occasion?', 360);
      return quick(['Wedding party', 'Team or company', 'Birthday', 'Photoshoot', 'Something else'].map((x) => ({ label: x })), (it) => { q.occasion = it.label; return quoteNext(); });
    }
    if (!q.people) {
      await say('How many people? Type a number.', 360);
      quick([{ label: '2 to 3', v: 3 }, { label: '4 to 6', v: 6 }, { label: '7 to 10', v: 10 }], (it) => { q.people = it.v; return quoteNext(); });
      S.pending = function numberOnly(text) { const m = text.match(/\d{1,2}/); if (m && +m[0] > 0) { q.people = +m[0]; clearQuick(); return quoteNext(); } S.pending = numberOnly; return say('Just the number of people, for example 6.'); };
      return;
    }
    if (!q.club) {
      await say('Which club suits you?', 360);
      return quick(Object.values(D().clubs).map((c) => ({ label: c.name, v: c.id })), (it) => { q.club = it.v; return quoteNext(); });
    }
    if (!q.svc) {
      await say('What should everyone get?', 360);
      const opts = ['cut-wash', 'cut-wash-beard', 'supercut', 'mvp'].map((id) => BC.svcAt(id, q.club)).filter(Boolean);
      return quick(opts.map((s) => ({ label: s.name + ' ' + BC.money(s.price), v: s.id })), (it) => { q.svc = it.v; return quoteNext(); });
    }
    if (!q.when) {
      await say('When is it? A date or just "next Saturday morning" is fine.', 360);
      S.pending = (text) => { q.when = text; return quoteNext(); };
      return quick([{ label: 'Not sure yet' }], () => { q.when = 'Date to be decided'; return quoteNext(); });
    }
    return quoteShow();
  }
  async function quoteShow() {
    const q = S.q;
    const s = BC.svcAt(q.svc, q.club);
    const sub = s.price * q.people;
    const group = q.people >= 5;
    const est = group ? Math.round(sub * 0.9) : sub;
    const chairs = BC.teamAt(q.club).length;
    const rounds = Math.ceil(q.people / chairs);
    await say('Here\'s your estimate.', 360);
    widget(h('div.ch-sum', [
      h('p.ch-sum-when', [h('strong', q.occasion), ', ', q.people + ' people at ' + D().clubs[q.club].name]),
      h('table', [h('tbody', [h('tr', [h('td', s.name + ' x ' + q.people), h('td', BC.money(sub))]), group ? h('tr', [h('td', 'Group rate, 10% off'), h('td', '-' + BC.money(sub - est))]) : null]), h('tfoot', h('tr', [h('td', 'Estimate'), h('td', BC.money(est))]))]),
      h('p.ch-small', 'With ' + chairs + ' chairs at ' + D().clubs[q.club].name + ', that\'s about ' + rounds + ' round' + (rounds > 1 ? 's' : '') + ' of ' + BC.dur(s.dur) + '. ' + (group ? 'The group rate is our proposal; the shop confirms it.' : '')),
    ]));
    quick([{ label: 'Send it to the team', go: 'send' }, { label: 'Change it', go: 'change' }], async (it) => {
      if (it.go === 'change') { S.q = null; return quoteStart(''); }
      if (BC.desk) BC.desk.add('quote', { name: S.lead.name, phone: S.lead.phone, email: S.lead.email, source: 'Chat', occasion: q.occasion, people: q.people, svc: q.svc, club: q.club, when: q.when, estimate: est, note: group ? 'Proposed group rate, to be confirmed by the shop' : '' });
      interest('Quote sent');
      await say('Sent. The team will WhatsApp you at ' + S.lead.phone + ' to lock in the times.');
      widget(h('div.ch-actions', [h('a.ch-btn', { href: BC.wa('Hi BalrCutz, ' + BC.firstName(S.lead.name) + ' here. Quote request: ' + q.occasion + ', ' + q.people + ' people, ' + s.name + ' at ' + D().clubs[q.club].name + ', ' + q.when + '. Estimate ' + BC.money(est) + '.'), target: '_blank', rel: 'noopener' }, 'Message them now'),
        BC.desk ? h('button.ch-btn.is-ghost', { type: 'button', on: { click: () => BC.desk.open('lead') } }, 'Demo: front desk') : null]));
      S.q = null;
      mainChips();
    });
  }

  /* ---------- shell ---------- */
  function mount(opts) {
    opts = opts || {};
    const saved = BC.store.get('chat', null);
    S.chatId = (saved && saved.chatId) || 'c' + Date.now().toString(36);
    S.lead = (saved && saved.lead) || null;
    S.messages = (saved && saved.messages) || [];

    const launch = h('button.ch-launch', { type: 'button', 'aria-expanded': 'false', 'aria-controls': 'ch-panel' }, [
      h('span.ch-launch-icon', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 3.6 11.5 8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>' }),
      h('span.ch-launch-label', opts.label || 'Book or ask'),
      S.lead ? null : h('span.ch-badge', { 'aria-hidden': 'true' }, '1'),
    ]);
    const log = h('div.ch-log', { role: 'log', 'aria-live': 'polite' });
    const quickBox = h('div.ch-quick');
    const input = h('input', { type: 'text', name: 'msg', autocomplete: 'off', 'aria-label': 'Message', placeholder: 'Ask anything, or type "book"' });
    const form = h('form.ch-form', { on: { submit: (e) => { e.preventDefault(); const v = input.value; input.value = ''; onText(v); } } }, [input, h('button.ch-send', { type: 'submit', 'aria-label': 'Send' }, h('span', { 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' }))]);
    const panel = h('section.ch#ch-panel', { role: 'dialog', 'aria-label': 'Chat with BalrCutz', hidden: true, 'data-lenis-prevent': true }, [
      h('header.ch-head', [h('img.ch-avatar', { src: BC.asset('img/logo/mark-red-sm.png'), alt: '' }), h('div.ch-who', [h('strong', 'Coach'), h('span', 'BalrCutz booking assistant')]),
        h('button.ch-reset', { type: 'button', title: 'Start over', 'aria-label': 'Start the chat over', on: { click: restart } }, 'Restart'),
        h('button.ch-x', { type: 'button', 'aria-label': 'Close chat', on: { click: () => toggle(false) } }, '×')]),
      log, quickBox, form,
      h('a.ch-wa', { href: BC.wa('Hi BalrCutz!'), target: '_blank', rel: 'noopener' }, 'Prefer WhatsApp? Message the team directly'),
    ]);
    document.body.append(panel, launch);
    ui = { launch, panel, log, quick: quickBox, form, input };

    let started = false;
    function toggle(open) {
      const on = open == null ? panel.hidden : open;
      panel.hidden = !on;
      launch.setAttribute('aria-expanded', String(on));
      document.documentElement.classList.toggle('ch-open', on);
      const badge = launch.querySelector('.ch-badge');
      if (badge) badge.remove();
      if (on && !started) { started = true; start(); }
      if (on) setTimeout(() => (S.lead ? input : panel.querySelector('.ch-gate input') || input).focus({ preventScroll: true }), 60);
      else launch.focus({ preventScroll: true });
      BC.emit('chat:' + (on ? 'open' : 'close'));
    }
    launch.addEventListener('click', () => toggle());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
    document.addEventListener('click', (e) => { const t = e.target.closest('[data-chat]'); if (!t) return; e.preventDefault(); toggle(true); const go = t.getAttribute('data-chat'); if (go && S.lead) run(() => { you(t.textContent.trim()); return route(go, ''); }); });

    function start() {
      if (!S.lead) return gate();
      S.messages.slice(-12).forEach((m) => bubble(m.who, m.text));
      run(async () => { await say('Welcome back, ' + BC.firstName(S.lead.name) + '. What can I do for you?', 300); mainChips(); });
    }
    function restart() {
      S.pending = null; S.b = null; S.q = null; S.messages = [];
      ui.log.innerHTML = ''; clearQuick();
      S.chatId = 'c' + Date.now().toString(36);
      save();
      if (S.lead) run(welcome); else gate();
    }
    BC.on('desk:cleared', () => { S.lead = null; S.messages = []; if (!panel.hidden) restart(); else started = false; ui.log.innerHTML = ''; });
    BC.chat = { open: () => toggle(true), close: () => toggle(false), send: onText };
  }

  BC.chatMount = mount;
})();
