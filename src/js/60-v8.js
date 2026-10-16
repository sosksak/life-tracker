// ====== V8 — LEVEL UP: тема, анимации, цели, ассистент смены, отчёты ======
const V8 = (() => {
  'use strict';
  const fmt = n => Math.round(n || 0).toLocaleString('ru-RU');
  const lget = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lset = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; };
  const dstr = off => { const d = new Date(); d.setDate(d.getDate() - off); return localDateStr(d); };
  const wt = () => { try { return (window.V7 && V7.getWorkType) ? V7.getWorkType() : { name: 'Работа', goal: 0 }; } catch (e) { return { name: 'Работа', goal: 0 }; } };
  const hm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  // ---------- ТЕМА (устройство-локальная настройка: light / dark / auto) ----------
  const THEME_KEY = 'v8_theme';
  let _mq = null;
  function themeMode() { return lget(THEME_KEY, 'auto'); }
  function wantDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    // auto: системная тёмная ИЛИ ночь (20:00–07:00)
    try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true; } catch (e) {}
    const h = new Date().getHours();
    return h >= 20 || h < 7;
  }
  function applyThemeMode(animate) {
    const dark = wantDark(themeMode());
    const html = document.documentElement;
    const cur = html.getAttribute('data-theme') === 'dark';
    if (cur === dark && html.hasAttribute('data-theme')) return;
    if (animate) { html.classList.add('v8-theming'); setTimeout(() => html.classList.remove('v8-theming'), 450); }
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (animate) reapplyWork();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && dark) meta.setAttribute('content', '#0F141A');
    else if (meta) { try { meta.setAttribute('content', getComputedStyle(html).getPropertyValue('--primary').trim() || '#1B3A5C'); } catch (e) {} }
  }
  // Тема типа работы ставит --accent-soft инлайном на <html> (светлые пастели) —
  // в тёмном режиме они перебивают data-theme, поэтому подменяем их тут же.
  function fixInlineVars() {
    const r = document.documentElement.style;
    if (wantDark(themeMode())) {
      r.setProperty('--accent-soft', '#17283B'); r.setProperty('--accent-soft-2', '#1D3652');
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', '#0F141A');
    }
  }
  function reapplyWork() {
    try { if (window.V7 && V7.applyWorkType && typeof currentUser !== 'undefined' && currentUser) V7.applyWorkType(); } catch (e) {}
    fixInlineVars();
  }
  function setThemeMode(m) {
    lset(THEME_KEY, m); applyThemeMode(true);
    reapplyWork();
    if (typeof haptic === 'function') haptic('light');
    document.querySelectorAll('#v8ThemeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
    showToast(m === 'dark' ? '🌙 Тёмная тема' : m === 'light' ? '☀️ Светлая тема' : '🌗 Авто: тёмная ночью и по системе', 'success');
  }
  function initTheme() {
    applyThemeMode(false);
    try { _mq = window.matchMedia('(prefers-color-scheme: dark)'); _mq.addEventListener('change', () => applyThemeMode(true)); } catch (e) {}
    setInterval(() => { if (themeMode() === 'auto') applyThemeMode(true); }, 60000);
    // Шапка и магазинные темы ставят theme-color сами — после них переcтавим под тёмную
    // applyWorkTheme живёт в замыкании V7 — хук не повесить; следим за инлайн-стилем <html>.
    let _fixing = false;
    try { new MutationObserver(() => { if (_fixing) return; _fixing = true; try { fixInlineVars(); } finally { _fixing = false; } }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] }); } catch (e) {}
    fixInlineVars();
  }
  function themeRowHtml() {
    const m = themeMode();
    const seg = ['light', 'dark', 'auto'].map(x => `<button data-m="${x}" class="${m === x ? 'on' : ''}" onclick="V8.setThemeMode('${x}')">${x === 'light' ? '☀️' : x === 'dark' ? '🌙' : '🌗 Авто'}</button>`).join('');
    const notif = ('Notification' in window);
    const nst = notif ? Notification.permission : 'unsupported';
    const nrow = `<div class="v7-set-row"><span style="font-size:20px">🔔</span><div class="t">Уведомления о целях<span class="s">${nst === 'granted' ? 'включены: сообщу, когда цель дня закрыта' : nst === 'denied' ? 'запрещены в настройках браузера' : nst === 'unsupported' ? 'не поддерживаются на этом устройстве' : 'сообщать, когда закрыта цель дня'}</span></div>${nst === 'default' ? '<button class="acc-mini go" onclick="V8.askNotify()">Включить</button>' : ''}</div>`;
    return `<div class="acc-sec"><h4>Оформление</h4><div class="v7-set-row" style="border-top:none"><span style="font-size:20px">🎨</span><div class="t">Тема<span class="s">авто — тёмная с 20:00 до 7:00 и по системе</span></div><div class="v8-seg" id="v8ThemeSeg">${seg}</div></div>${nrow}<div class="v7-set-row"><span style="font-size:20px">✨</span><div class="t">Эффекты и вибрация<span class="s">звёздочки на тап, пульс чисел, салют за цель</span></div><button class="acc-mini ${uGet('lt_fx', true) ? 'go' : ''}" onclick="uSet('lt_fx', !uGet('lt_fx', true)); haptic('medium'); renderAccountModal()">${uGet('lt_fx', true) ? 'Вкл' : 'Выкл'}</button></div></div>`;
  }
  async function askNotify() {
    try { const p = await Notification.requestPermission(); showToast(p === 'granted' ? '🔔 Уведомления включены' : '🔕 Уведомления не разрешены', p === 'granted' ? 'success' : 'error'); } catch (e) {}
    try { renderAccountModal(); } catch (e) {}
  }
  function notify(title, body, tag) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, tag, icon: 'icon-192.png', badge: 'icon-192.png' })).catch(() => new Notification(title, { body, tag }));
      else new Notification(title, { body, tag });
    } catch (e) {}
  }

  // ---------- АНИМАЦИИ ----------
  function animateTab() {
    const el = document.querySelector('.tab-content.active');
    if (!el) return;
    el.classList.remove('v8-anim'); void el.offsetWidth; el.classList.add('v8-anim');
    setTimeout(() => el.classList.remove('v8-anim'), 600);
  }
  function pop(el) { if (!el) return; el.classList.remove('v8-pop'); void el.offsetWidth; el.classList.add('v8-pop'); }

  // ---------- ДАННЫЕ ----------
  function agg(dates) {
    const set = new Set(dates), meta = getShiftMeta();
    let earned = 0, hours = 0, units = 0, expenses = 0, n = 0;
    shifts.forEach(s => { if (!set.has(s.date)) return; const m = meta[shiftMetaKey(s)] || {}; earned += s.earned || 0; hours += s.hours || 0; units += m.units || 0; expenses += m.expenses || 0; n++; });
    return { earned, hours, units, expenses, n, rate: hours > 0 ? earned / hours : 0 };
  }
  function weekDates() { const d = new Date(); const dow = (d.getDay() + 6) % 7; return Array.from({ length: dow + 1 }, (_, i) => dstr(dow - i)); }
  function recentRate() {
    const r = shifts.filter(s => s.hours > 0).slice(0, 5);
    return r.length ? r.reduce((a, s) => a + s.earned / s.hours, 0) / r.length : (wt().goal || 850);
  }
  function avgPerUnit() {
    const meta = getShiftMeta(); let e = 0, u = 0, n = 0;
    for (const s of shifts) { const m = meta[shiftMetaKey(s)]; if (m && m.units > 0) { e += s.earned; u += m.units; if (++n >= 30) break; } }
    return u > 0 ? e / u : 0;
  }
  // Оценка активной смены: часы, заказы, прогноз дохода и ₽/ч
  function liveEst() {
    if (!activeShift) return null;
    const now = Date.now();
    const brk = (activeShift.breaks || []).reduce((a, b) => a + ((b.end || now) - b.start), 0) + (activeShift.currentBreak ? now - activeShift.currentBreak.start : 0);
    const hours = Math.max(0, (now - activeShift.startTime - brk) / 3600000);
    const units = activeShift.units || 0, pu = avgPerUnit();
    let rate, src;
    if (units > 0 && pu > 0 && hours >= 0.25) { rate = units * pu / hours; src = 'units'; }
    else { rate = recentRate(); src = 'avg'; }
    return { hours, units, pu, rate, earned: rate * hours, src, brk, onBreak: activeShift.status === 'break' };
  }

  // ---------- ЦЕЛИ ----------
  function getGoals() { const g = uGet('v8_goals', null); return g && typeof g === 'object' ? g : { day: 0, week: 0, rate: 0 }; }
  function saveGoals(g) { uSet('v8_goals', g); try { markLocalChange(); schedulePushProgress(); } catch (e) {} }
  function targetRate() { const g = getGoals(); return g.rate || wt().goal || (DIFFICULTIES[difficulty] || {}).goal || 0; }
  async function editGoals() {
    const g = getGoals();
    const r = await askForm([
      { key: 'day', label: 'Цель дня (₽)', type: 'number', placeholder: '5000', value: g.day ? String(g.day) : '' },
      { key: 'week', label: 'Цель недели (₽)', type: 'number', placeholder: '30000', value: g.week ? String(g.week) : '' },
      { key: 'rate', label: 'Целевой ₽/ч (пусто — из типа работы)', type: 'number', placeholder: String(wt().goal || 850), value: g.rate ? String(g.rate) : '' }
    ], { icon: '🎯', title: 'Цели', okText: 'Сохранить' });
    if (!r) return;
    const num = v => Math.max(0, parseInt(String(v || '').replace(/\D/g, ''), 10) || 0);
    saveGoals({ day: num(r.day), week: num(r.week), rate: num(r.rate) });
    if (typeof haptic === 'function') haptic('success');
    showToast('🎯 Цели сохранены', 'success');
    renderGoals(); renderAssist(); try { render(); } catch (e) {}
  }
  // v9.22: goalsHtml/renderGoals → src/svelte/v8 (store.svelte.js computeGoals + Goals.svelte); здесь — обёртка
  function renderGoals() {
    if (!document.getElementById('dashboardContent')) return;
    V8S.renderGoals();
    checkGoalEvents();
  }
  // Единоразовые события: закрыта цель дня/недели → тост + haptic + уведомление
  function checkGoalEvents() {
    const g = getGoals(); if (!g.day && !g.week) return;
    const st = uGet('v8_goal_hits', {}); const t = todayStr(); let changed = false;
    const today = agg([t]);
    if (g.day && today.earned >= g.day && st.day !== t) { st.day = t; changed = true; celebrate('🎯 Цель дня закрыта', `${fmt(today.earned)} ₽ из ${fmt(g.day)} ₽. Отличная работа!`); }
    const wk = weekDates(); const wkey = wk[wk.length - 1];
    if (g.week && agg(wk).earned >= g.week && st.week !== wkey) { st.week = wkey; changed = true; celebrate('🗓 Цель недели закрыта', `${fmt(agg(wk).earned)} ₽ из ${fmt(g.week)} ₽`); }
    if (changed) uSet('v8_goal_hits', st);
  }
  function celebrate(title, body) {
    try { haptic('success'); } catch (e) {}
    showToast(title + ' · ' + body, 'success');
    notify(title, body, 'v8goal');
    const box = document.getElementById('v8Goals'); if (box) { box.classList.remove('v8-done'); void box.offsetWidth; box.classList.add('v8-done'); }
  }

  // ---------- АССИСТЕНТ СМЕНЫ ----------
  // v9.22: assistHtml/renderAssist/headRate → src/svelte/v8 (computeAssist + Assist.svelte в панели смены, HeadRate.svelte в шапке)
  function renderAssist() { V8S.renderAssist(); }

  // ---------- ОТЧЁТЫ ----------
  const TAX = { none: { l: 'без налога', r: 0 }, npd4: { l: 'НПД 4% (физлица)', r: .04 }, npd6: { l: 'НПД 6% (юрлица)', r: .06 }, usn6: { l: 'УСН 6%', r: .06 }, ndfl13: { l: 'НДФЛ 13%', r: .13 } };
  function monthKeys() { const set = new Set(shifts.map(s => s.date.slice(0, 7))); set.add(todayStr().slice(0, 7)); return [...set].sort().reverse(); }
  function monthLabel(k) { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }); }
  function monthAgg(k) {
    const meta = getShiftMeta(); let earned = 0, hours = 0, units = 0, expenses = 0, n = 0; const days = new Set();
    shifts.forEach(s => { if (!s.date.startsWith(k)) return; const m = meta[shiftMetaKey(s)] || {}; earned += s.earned || 0; hours += s.hours || 0; units += m.units || 0; expenses += m.expenses || 0; n++; days.add(s.date); });
    return { earned, hours, units, expenses, n, days: days.size, rate: hours > 0 ? earned / hours : 0, net: earned - expenses };
  }
  function prevKey(k) { const [y, m] = k.split('-').map(Number); const d = new Date(y, m - 2, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function taxRegime() { return TAX[uGetRaw('v8_tax')] ? uGetRaw('v8_tax') : 'npd4'; }
  function setTax(v) { uSetRaw('v8_tax', v); try { markLocalChange(); schedulePushProgress(); } catch (e) {} renderReports(); }
  // v9.22: reportsHtml/renderReports → src/svelte/v8 (computeReports + Reports.svelte); здесь — обёртки
  function renderReports() { if (document.getElementById('contentStats')) V8S.renderReports(); }
  function setRepMonth(k) { V8S.setRepMonth(k); try { haptic('light'); } catch (e) {} }
  function curMonth() { return V8S.curMonth(); }
  function csvEscape(v) { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportCsv(all) {
    const meta = getShiftMeta();
    const list = shifts.filter(s => all || s.date.startsWith(curMonth())).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!list.length) { showToast('Нет смен для экспорта', 'error'); return; }
    const head = ['Дата', 'Часы', 'Доход', '₽/ч', 'Заказы', 'Расходы', 'Чистыми', 'Начало', 'Конец', 'Перерывы (мин)', 'Комментарий'];
    const rows = list.map(s => { const m = meta[shiftMetaKey(s)] || {}; return [s.date, s.hours, s.earned, s.rate, m.units || '', m.expenses || '', s.earned - (m.expenses || 0), m.startTime ? hm(m.startTime) : '', m.endTime ? hm(m.endTime) : '', m.breakMs ? Math.round(m.breakMs / 60000) : '', s.displayNote || ''].map(csvEscape).join(';'); });
    const csv = '\uFEFF' + head.join(';') + '\n' + rows.join('\n');
    downloadFile(`life_tracker_${all ? 'all' : curMonth()}.csv`, csv, 'text/csv;charset=utf-8');
    showToast(`📄 CSV: ${list.length} ${plural(list.length, 'смена', 'смены', 'смен')}`, 'success');
    try { haptic('light'); } catch (e) {}
  }
  function exportPdf() {
    const k = curMonth(), cur = monthAgg(k), prev = monthAgg(prevKey(k)), meta = getShiftMeta();
    const tr = TAX[taxRegime()].r, tax = cur.earned * tr;
    const list = shifts.filter(s => s.date.startsWith(k)).slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!list.length) { showToast('В этом месяце смен нет', 'error'); return; }
    const name = currentUser ? (currentUser.name || currentUser.login) : '';
    const d = (a, b) => b ? ` <span class="m">(${a >= b ? '+' : ''}${Math.round((a - b) / b * 100)}%)</span>` : '';
    const html = `<div id="v8Print">
      <h1>Отчёт за ${monthLabel(k)}</h1>
      <div class="sub">${escapeHtml(name)} · ${escapeHtml(wt().name)} · сформирован ${new Date().toLocaleDateString('ru-RU')} · Life Tracker ${APP_VERSION}</div>
      <table class="kpi"><tr>
        <td><b>${fmt(cur.earned)} ₽</b><span>доход${d(cur.earned, prev.earned)}</span></td>
        <td><b>${fmt(cur.rate)} ₽/ч</b><span>средний темп${d(cur.rate, prev.rate)}</span></td>
        <td><b>${cur.hours.toFixed(1)} ч</b><span>часов${d(cur.hours, prev.hours)}</span></td>
        <td><b>${cur.n}</b><span>${plural(cur.n, 'смена', 'смены', 'смен')} · ${cur.days} дн</span></td>
        <td><b>${fmt(cur.expenses)} ₽</b><span>расходы</span></td>
        <td><b>${fmt(cur.net - tax)} ₽</b><span>на руки${tr ? ' после ' + TAX[taxRegime()].l : ''}</span></td>
      </tr></table>
      <table class="rows"><thead><tr><th>Дата</th><th>Часы</th><th>Доход</th><th>₽/ч</th><th>Заказы</th><th>Расходы</th><th>Начало–конец</th><th>Комментарий</th></tr></thead><tbody>
      ${list.map(s => { const m = meta[shiftMetaKey(s)] || {}; const [, , dd] = s.date.split('-'); const dow = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'][new Date(s.date + 'T12:00:00').getDay()]; return `<tr><td>${+dd} ${dow}</td><td>${s.hours}</td><td>${fmt(s.earned)}</td><td>${fmt(s.rate)}</td><td>${m.units || ''}</td><td>${m.expenses ? fmt(m.expenses) : ''}</td><td>${m.startTime ? hm(m.startTime) + '–' + (m.endTime ? hm(m.endTime) : '') : ''}</td><td>${escapeHtml(s.displayNote || '')}</td></tr>`; }).join('')}
      </tbody><tfoot><tr><td>Итого</td><td>${cur.hours.toFixed(1)}</td><td>${fmt(cur.earned)}</td><td>${fmt(cur.rate)}</td><td>${cur.units || ''}</td><td>${cur.expenses ? fmt(cur.expenses) : ''}</td><td></td><td></td></tr></tfoot></table>
      ${tr ? `<div class="tax">Налог ${TAX[taxRegime()].l}: <b>${fmt(tax)} ₽</b> · чистыми после расходов и налога: <b>${fmt(cur.net - tax)} ₽</b></div>` : ''}
    </div>`;
    let st = document.getElementById('v8PrintStyle');
    if (!st) { st = document.createElement('style'); st.id = 'v8PrintStyle'; st.textContent = `#v8Print{display:none}@media print{body>*{display:none!important}body{background:#fff!important;padding:0!important}#v8Print{display:block!important;font:12px/1.4 Inter,Arial,sans-serif;color:#111;padding:8mm}#v8Print h1{font-size:20px;margin:0 0 2px}#v8Print .sub{color:#666;font-size:11px;margin-bottom:12px}#v8Print table{width:100%;border-collapse:collapse}#v8Print .kpi td{border:1px solid #ddd;padding:8px;text-align:center;width:16%}#v8Print .kpi b{display:block;font-size:15px}#v8Print .kpi span{font-size:10px;color:#666}#v8Print .m{color:#888}#v8Print .rows{margin-top:12px}#v8Print .rows th,#v8Print .rows td{border-bottom:1px solid #e5e5e5;padding:5px 6px;text-align:left;font-size:11px}#v8Print .rows th{background:#f3f4f6;font-weight:700}#v8Print .rows tfoot td{font-weight:700;border-top:2px solid #333}#v8Print .tax{margin-top:12px;padding:8px 10px;background:#fff7e6;border:1px solid #f0d9a8;font-size:12px}}`; document.head.appendChild(st); }
    let old = document.getElementById('v8Print'); if (old) old.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    try { haptic('medium'); } catch (e) {}
    showToast('🖨 В диалоге печати выберите «Сохранить как PDF»', 'success');
    setTimeout(() => window.print(), 250);
  }

  // ---------- ХУКИ / BOOT ----------
  let _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    try {
      initTheme();
      try { for (const k of ['v8_goals', 'v8_goal_hits', 'v8_tax']) if (!PROGRESS_KEYS.includes(k)) PROGRESS_KEYS.push(k); } catch (e) {}
      // Дашборд: цели после v7-блока
      if (typeof DASHBOARD !== 'undefined' && DASHBOARD.render && !DASHBOARD._v8) { const o = DASHBOARD.render; DASHBOARD.render = function () { const r = o.apply(this, arguments); try { renderGoals(); } catch (e) { console.warn('[v8] goals', e); } return r; }; DASHBOARD._v8 = 1; }
      // Таймер смены: ассистент тикает вместе с ним (раз в секунду — лёгкая математика)
      const oTimer = window.updateTimer;
      if (typeof oTimer === 'function' && !oTimer._v8) { let i = 0; window.updateTimer = function () { const r = oTimer.apply(this, arguments); try { if (++i % 5 === 1) V8S.renderAssistTick(); } catch (e) {} return r; }; window.updateTimer._v8 = 1; }
      const oRAS = window.renderActiveShift;
      if (typeof oRAS === 'function' && !oRAS._v8) { window.renderActiveShift = function () { const r = oRAS.apply(this, arguments); try { renderAssist(); } catch (e) {} return r; }; window.renderActiveShift._v8 = 1; }
      const oBump = window.bumpUnits;
      if (typeof oBump === 'function' && !oBump._v8) { window.bumpUnits = function () { const r = oBump.apply(this, arguments); try { renderAssist(); } catch (e) {} return r; }; window.bumpUnits._v8 = 1; }
      // Haptic на ключевых действиях
      for (const [fn, kind] of [['startShift', 'medium'], ['endShift', 'medium'], ['startBreak', 'light'], ['endBreak', 'light']]) {
        const o = window[fn]; if (typeof o === 'function' && !o._v8) { window[fn] = function () { try { haptic(kind); } catch (e) {} return o.apply(this, arguments); }; window[fn]._v8 = 1; }
      }
      // Анимация появления при переключении вкладок
      const oSw = window.switchTab;
      if (typeof oSw === 'function' && !oSw._v8) { window.switchTab = function (tab) { const r = oSw.apply(this, arguments); try { animateTab(); if (tab === 'stats') renderReports(); } catch (e) {} return r; }; window.switchTab._v8 = 1; }
      // Главный render → цели и отчёты актуальны после сохранения смены
      const oRender = window.render;
      if (typeof oRender === 'function' && !oRender._v8) { window.render = function () { const r = oRender.apply(this, arguments); try { if (document.getElementById('v8Goals')) renderGoals(); if (document.getElementById('contentStats')?.classList.contains('active')) renderReports(); } catch (e) {} return r; }; window.render._v8 = 1; }
      // Профиль и доступ → блок «Оформление»
      const oAcc = window.renderAccountModal;
      if (typeof oAcc === 'function' && !oAcc._v8) { window.renderAccountModal = function () { const r = oAcc.apply(this, arguments); try { const el = document.getElementById('accountBody'); if (el && !el.querySelector('#v8ThemeSeg')) { const first = el.querySelector('.acc-sec'); if (first) first.insertAdjacentHTML('afterend', themeRowHtml()); else el.insertAdjacentHTML('afterbegin', themeRowHtml()); } } catch (e) {} return r; }; window.renderAccountModal._v8 = 1; }
      renderGoals(); renderAssist();
      if (document.getElementById('contentStats')?.classList.contains('active')) renderReports();
      setInterval(() => { if (document.getElementById('dashboardContent')?.classList.contains('active')) { try { renderGoals(); } catch (e) {} } }, 60000);
      console.log('[v8] level up ready');
    } catch (e) { console.error('[v8] boot', e); _booted = false; }
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') { window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 400); return r; }; }
    document.addEventListener('v7:login', () => setTimeout(boot, 300));
    setTimeout(() => { if (!_booted && typeof currentUser !== 'undefined' && currentUser) boot(); }, 6500);
  })();
  // Тема применяется сразу, до входа — чтобы экран логина не слепил ночью
  try { applyThemeMode(false); } catch (e) {}

  return { boot, setThemeMode, askNotify, editGoals, renderGoals, renderAssist, renderReports, setRepMonth, setTax, exportCsv, exportPdf, liveEst, getGoals,
    // v9.22: данные для Svelte-рендера (src/svelte/v8/store.svelte.js)
    agg, weekDates, recentRate, targetRate, monthKeys, monthLabel, monthAgg, prevKey, taxRegime, TAX, pop };
})();
window.V8 = V8;


