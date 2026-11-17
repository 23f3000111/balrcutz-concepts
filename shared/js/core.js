/* BalrCutz shared core: namespace, DOM helpers, money and time formatting, safe storage, a tiny event bus.
   Both concepts load this first; every other shared module hangs off window.BC. */
(() => {
  const BC = (window.BC = window.BC || {});

  BC.$ = (s, r) => (r || document).querySelector(s);
  BC.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* h('button.chip', { type: 'button', on: { click } , data: { id } }, ['Text', node]) */
  BC.h = (spec, attrs, kids) => {
    const m = spec.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') el.classList.add(v); else el.id = v; });
    if (Array.isArray(attrs) || typeof attrs === 'string' || attrs instanceof Node) { kids = attrs; attrs = null; }
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'on') Object.keys(v).forEach((e) => el.addEventListener(e, v[e]));
        else if (k === 'data') Object.keys(v).forEach((d) => { el.dataset[d] = v[d]; });
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    [].concat(kids == null ? [] : kids).flat(Infinity).forEach((k) => {
      if (k == null || k === false) return;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    });
    return el;
  };

  /* Service names joined with "+" ("Haircut + Wash"): the plus gets its own span, because a Didone's hairline plus nearly vanishes */
  BC.plus = (name) => String(name).split(' + ').flatMap((part, i) => (i ? [BC.h('span.plus', ' + '), part] : [part]));

  BC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Money: whole ringgit print without decimals ("RM 45"); anything with sen prints two places ("RM 40.50") */
  BC.money = (n) => 'RM ' + (Math.round(n * 100) % 100 ? (Math.round(n * 100) / 100).toFixed(2) : String(Math.round(n)));

  /* Durations: 45 -> "45 min", 60 -> "1 hr", 90 -> "1 hr 30 min" */
  BC.dur = (m) => {
    const h = Math.floor(m / 60), r = m % 60;
    return (h ? h + ' hr' : '') + (h && r ? ' ' : '') + (r ? r + ' min' : '');
  };

  /* Clock from minutes after midnight: 870 -> "2:30 pm" or "14:30" */
  BC.clock = (mins, h24) => {
    const h = Math.floor(mins / 60) % 24, m = mins % 60;
    if (h24) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' am' : ' pm');
  };

  BC.iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  BC.fromIso = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  BC.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  BC.today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  BC.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  BC.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  BC.longDate = (iso) => { const d = BC.fromIso(iso); return BC.DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + BC.MONTHS[d.getMonth()]; };
  BC.shortDate = (iso) => { const d = BC.fromIso(iso); return BC.DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + BC.MONTHS[d.getMonth()].slice(0, 3); };
  BC.nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  /* Storage that never throws (private windows, blocked site data) */
  BC.store = {
    get(k, fallback) { try { const v = localStorage.getItem('bc.' + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem('bc.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('bc.' + k); } catch (e) { /* ignore */ } },
  };

  const handlers = {};
  BC.on = (evt, fn) => { (handlers[evt] = handlers[evt] || []).push(fn); };
  BC.emit = (evt, data) => { (handlers[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };

  BC.reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Booking references read like a locker tag: BC-7Q2K */
  BC.ref = () => {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)];
    return 'BC-' + s;
  };

  BC.firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';

  /* Malaysian mobile numbers: accept 012-345 6789, +60 12 345 6789, 60123456789 */
  BC.phoneOk = (p) => /^(\+?6?0)1\d{8,9}$/.test(String(p || '').replace(/[\s-]/g, ''));
  BC.emailOk = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

  BC.wa = (text, number) => 'https://wa.me/' + (number || (BC.data && BC.data.brand.whatsapp) || '60126061715') + (text ? '?text=' + encodeURIComponent(text) : '');

  BC.copy = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true, () => false);
    const t = BC.h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.appendChild(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    t.remove();
    return Promise.resolve(ok);
  };

  BC.download = (name, text, type) => {
    const a = BC.h('a', { href: URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };

  /* One toast region per page, polite for screen readers */
  BC.toast = (msg, kind) => {
    let wrap = BC.$('.bc-toasts');
    if (!wrap) { wrap = BC.h('div.bc-toasts', { 'aria-live': 'polite' }); document.body.appendChild(wrap); }
    const t = BC.h('div.bc-toast' + (kind ? '.is-' + kind : ''), msg);
    wrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 500); }, 3400);
  };

  /* Seeded random numbers so the demo availability is the same on every visit */
  BC.seed = (str) => {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  // Paths: each concept page lives one folder down, so shared assets sit at ../shared

  BC.asset = (p) => (BC.base || '../shared/') + p;
})();
