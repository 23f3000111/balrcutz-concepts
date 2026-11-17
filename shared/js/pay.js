/* Payment panel shared by the booking widget and the chat: DuitNow QR, bank transfer, Touch 'n Go eWallet.
   Demo only. The QR codes carry a plain "demo" text, not a DuitNow payload, so no banking app can pay them.
   BC.pay.render(container, { amount, ref, method, onMethod(id), onPaid(id), back(), compact, label }) */
(() => {
  const BC = window.BC;
  const { h } = BC;

  function qrSvg(text, size) {
    const make = window.qrcode;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Demo payment QR code');
    if (!make) { svg.setAttribute('viewBox', '0 0 10 10'); return svg; }
    const q = make(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n);
    svg.setAttribute('width', size || 196);
    svg.setAttribute('height', size || 196);
    svg.setAttribute('shape-rendering', 'crispEdges');
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', n); bg.setAttribute('height', n); bg.setAttribute('fill', '#fff');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', '#000');
    svg.append(bg, p);
    return svg;
  }

  function render(box, o) {
    const methods = BC.data.pay.methods;
    let method = o.method && methods.some((m) => m.id === o.method) ? o.method : methods[0].id;
    let timer = null;
    let receipt = null;
    box.innerHTML = '';
    box.classList.add('py');
    if (o.compact) box.classList.add('py-compact');

    const tabs = h('div.py-methods', { role: 'tablist', 'aria-label': 'Payment method' });
    const panel = h('div.py-panel', { role: 'tabpanel' });
    methods.forEach((m) => tabs.appendChild(h('button.py-method', { type: 'button', role: 'tab', 'aria-selected': String(m.id === method), data: { m: m.id }, on: { click: () => { method = m.id; if (o.onMethod) o.onMethod(m.id); draw(); } } }, [h('span.py-method-name', o.compact ? m.short : m.label)])));
    const foot = h('p.py-demo', 'Demo: no money moves. The live site would use the shop\'s own DuitNow, bank and TNG details.');
    box.append(tabs, panel, foot);

    function countdown(el) {
      clearInterval(timer);
      let left = BC.data.pay.qrMinutes * 60;
      const tick = () => {
        if (!el.isConnected) { clearInterval(timer); return; }
        if (left <= 0) { clearInterval(timer); el.textContent = 'Code expired. '; el.appendChild(h('button.bk-link', { type: 'button', on: { click: draw } }, 'Get a new code')); return; }
        el.textContent = 'Code valid for ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        left--;
      };
      tick();
      timer = setInterval(tick, 1000);
    }

    function paidButton(text, enabled) {
      const b = h('button.bk-btn.bk-btn-primary.py-paid', { type: 'button', disabled: enabled === false ? true : null, on: { click: () => confirm(b) } }, text);
      return b;
    }

    function confirm(btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
      btn.textContent = method === 'bank' ? 'Sending receipt…' : 'Checking payment…';
      setTimeout(() => {
        clearInterval(timer);
        btn.classList.remove('is-busy');
        btn.classList.add('is-ok');
        btn.textContent = method === 'bank' ? 'Receipt sent' : 'Payment received';
        setTimeout(() => o.onPaid && o.onPaid(method, receipt), 650);
      }, 1300);
    }

    function row(k, v, copy) {
      const copyBtn = copy ? h('button.py-copy', { type: 'button', 'aria-label': 'Copy ' + k.toLowerCase(), on: { click: () => BC.copy(copy).then((ok) => { copyBtn.textContent = ok ? 'Copied' : 'Copy'; BC.toast(ok ? k + ' copied' : 'Copy did not work here'); }) } }, 'Copy') : null;
      return h('div.py-row', [h('dt', k), h('dd', [h('span', v), copyBtn])]);
    }

    function draw() {
      BC.$$('.py-method', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.m === method)));
      panel.innerHTML = '';
      panel.dataset.m = method;
      const amt = BC.money(o.amount);
      if (method === 'duitnow' || method === 'tng') {
        const isTng = method === 'tng';
        const code = h('div.py-qr' + (isTng ? '.is-tng' : ''), [
          h('span.py-qr-tag', isTng ? 'TNG eWallet' : 'DuitNow QR'),
          qrSvg('BALRCUTZ DEMO ' + (isTng ? 'TNG' : 'DUITNOW') + ' ' + o.ref + ' ' + amt + ' (not a real payment code)', o.compact ? 150 : 184),
          h('span.py-qr-name', BC.data.brand.long),
        ]);
        const timeEl = h('p.py-timer', { 'aria-live': 'off' });
        const steps = isTng
          ? h('ol.py-steps', [h('li', 'Open the TNG eWallet app and tap Scan.'), h('li', ['Scan this code and pay ', h('strong', amt), '.']), h('li', 'Come back and tap the button below.')])
          : h('ol.py-steps', [h('li', 'Open your banking app or e-wallet and choose DuitNow QR.'), h('li', ['Scan this code. The amount is ', h('strong', amt), '.']), h('li', 'Come back and tap the button below.')]);
        panel.append(h('div.py-qr-wrap', [code, h('div.py-qr-side', [h('p.py-amt', [h('span', 'Amount'), h('strong', amt)]), h('p.py-ref', ['Reference ', h('strong', o.ref)]), steps, timeEl])]),
          h('div.bk-actions', [o.back ? h('button.bk-btn.bk-btn-ghost', { type: 'button', on: { click: o.back } }, 'Back') : null, paidButton('I\'ve paid ' + amt)]));
        countdown(timeEl);
      } else {
        const b = BC.data.pay.bank;
        const fileIn = h('input.bk-file', { type: 'file', accept: 'image/*,application/pdf', id: 'py-rc-' + o.ref + (o.compact ? '-c' : ''), on: { change: (e) => {
          const f = e.target.files[0];
          if (!f) return;
          receipt = f.name;
          name.textContent = f.name;
          send.disabled = false;
        } } });
        const name = h('span.py-file-name', 'No receipt yet');
        const send = paidButton('Send receipt', false);
        panel.append(h('dl.py-bank', [row('Bank', b.bank), row('Account name', b.name, b.name), row('Account number', b.number), row('Reference', o.ref, o.ref), row('Amount', amt, String(o.amount))]),
          h('div.py-upload', [h('label.bk-btn.bk-btn-ghost.bk-btn-sm', { for: fileIn.id }, 'Upload receipt'), name, fileIn]),
          h('p.py-note', 'Use the reference so the shop can match your transfer. Your chair is held while they check it.'),
          h('div.bk-actions', [o.back ? h('button.bk-btn.bk-btn-ghost', { type: 'button', on: { click: o.back } }, 'Back') : null, send]));
      }
    }
    draw();
    return { destroy() { clearInterval(timer); } };
  }

  BC.pay = { render, qrSvg };
})();
