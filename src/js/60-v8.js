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
  function goalsHtml() {
    const g = getGoals();
    const today = agg([todayStr()]), week = agg(weekDates());
    const est = liveEst();
    const liveE = est ? est.earned : 0, liveH = est ? est.hours : 0;
    if (!g.day && !g.week && !g.rate) {
      // v9.9.3: пустое состояние — одна строка + крупная кнопка, а не абзац с «Изменить» в углу
      return `<div class="v8-goals-empty">Цель дня, недели и ₽/ч — прогресс на Главной и подсказки ассистента во время смены.<button class="w92-btn g wide" style="margin-top:10px" onclick="V8.editGoals()">🎯 Задать цели</button></div>`;
    }
    const rows = [];
    const row = (ico, lbl, val, pct, sub, ok) => `<div class="v8-goal ${ok ? 'ok' : ''}"><span class="i">${ico}</span><span class="l">${lbl}</span><span class="v">${val}</span><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div><span class="s">${sub}</span></div>`;
    const rateNow = (today.hours + liveH) > 0 ? (today.earned + liveE) / (today.hours + liveH) : 0;
    const need = (goal, have) => {
      const left = goal - have; if (left <= 0) return 'цель закрыта ✓';
      const r = rateNow || recentRate(); const h = r > 0 ? left / r : 0;
      return `осталось ${fmt(left)} ₽${h > 0 ? ' ≈ ' + (h < 1 ? Math.round(h * 60) + ' мин' : h.toFixed(1) + ' ч') : ''}${est ? ' (с учётом текущей смены)' : ''}`;
    };
    if (g.day) { const have = today.earned + liveE; rows.push(row('📅', 'Сегодня', `${fmt(have)} <small>/ ${fmt(g.day)} ₽</small>`, have / g.day * 100, need(g.day, have), have >= g.day)); }
    if (g.week) { const have = week.earned + liveE; const left = 7 - weekDates().length; rows.push(row('🗓', 'Неделя', `${fmt(have)} <small>/ ${fmt(g.week)} ₽</small>`, have / g.week * 100, have >= g.week ? 'цель закрыта ✓' : `осталось ${fmt(g.week - have)} ₽ · ${left ? 'ещё ' + left + ' ' + plural(left, 'день', 'дня', 'дней') + ' · ' + fmt((g.week - have) / left) + ' ₽/день' : 'последний день недели'}`, have >= g.week)); }
    const tr = targetRate();
    if (tr) { const have = rateNow; rows.push(row('⚡', '₽/ч сегодня', have ? `${fmt(have)} <small>/ ${fmt(tr)}</small>` : `— <small>/ ${fmt(tr)}</small>`, have / tr * 100, have ? (have >= tr ? `выше цели на ${fmt(have - tr)} ₽/ч` : `до цели ${fmt(tr - have)} ₽/ч`) : 'начните смену — покажу темп', have >= tr && have > 0)); }
    return rows.join('');
  }
  function renderGoals() {
    const root = document.getElementById('dashboardContent'); if (!root) return;
    let box = document.getElementById('v8Goals');
    if (!box) { box = document.createElement('div'); box.id = 'v8Goals'; box.className = 'v8-goals'; const after = document.getElementById('v7DashExtra') || root.querySelector('.dash-greeting'); if (after) after.insertAdjacentElement('afterend', box); else root.appendChild(box); }
    box.innerHTML = `<div class="v8-goals-head"><span class="t">🎯 ЦЕЛИ</span><button class="acc-mini go" onclick="V8.editGoals()">Изменить</button></div>${goalsHtml()}`;
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
  let _lastRateShown = -1;
  function assistHtml() {
    const est = liveEst(); if (!est) return '';
    const g = getGoals(), tr = targetRate();
    const today = agg([todayStr()]);
    const chips = [];
    if (est.src === 'units') chips.push(`<span class="v8-assist-chip">по заказам · ${fmt(est.pu)} ₽/зак</span>`); else chips.push(`<span class="v8-assist-chip">по среднему за 5 смен</span>`);
    if (tr) chips.push(`<span class="v8-assist-chip ${est.rate >= tr ? 'g' : 'o'}">${est.rate >= tr ? '↑ выше цели' : '↓ ниже цели'} ${fmt(tr)}</span>`);
    const rows = [];
    rows.push(`<div class="v8-assist-row"><span class="k">💰</span><span>Прогноз смены: <b>~${fmt(est.earned)} ₽</b> за ${est.hours.toFixed(1)} ч${est.units ? ' · ' + est.units + ' зак · ' + (est.units / Math.max(est.hours, 0.1)).toFixed(1) + '/ч' : ''}</span></div>`);
    if (g.day) {
      const left = g.day - today.earned - est.earned;
      if (left <= 0) rows.push(`<div class="v8-assist-row"><span class="k">✅</span><span><b>Цель дня закрыта</b> — можно завершать, всё сверх — бонус</span></div>`);
      else if (est.rate > 0) { const h = left / est.rate; rows.push(`<div class="v8-assist-row"><span class="k">🏁</span><span>До цели дня <b>${fmt(left)} ₽</b> — ещё ${h < 1 ? Math.round(h * 60) + ' мин' : h.toFixed(1) + ' ч'}, финиш около <b>${hm(Date.now() + h * 3600000)}</b></span></div>`); }
    }
    if (tr && est.rate < tr && est.src === 'units' && est.pu > 0) {
      const needUph = tr / est.pu; rows.push(`<div class="v8-assist-row"><span class="k">📦</span><span>Для ${fmt(tr)} ₽/ч нужно <b>${needUph.toFixed(1)} зак/ч</b>, сейчас ${(est.units / Math.max(est.hours, 0.1)).toFixed(1)}</span></div>`);
    } else if (tr && est.rate < tr && est.src === 'avg') {
      rows.push(`<div class="v8-assist-row"><span class="k">📦</span><span>Отмечайте заказы «+1» — тогда ₽/ч будет считаться по факту, а не по среднему</span></div>`);
    }
    // Перерыв: больше 3 ч непрерывной работы
    const lastBreakEnd = (activeShift.breaks || []).reduce((m, b) => Math.max(m, b.end || 0), activeShift.startTime);
    const sinceBreak = (Date.now() - lastBreakEnd) / 3600000;
    if (!est.onBreak && sinceBreak >= 3) rows.push(`<div class="v8-assist-row"><span class="k">☕</span><span>Без перерыва уже <b>${sinceBreak.toFixed(1)} ч</b> — 10 минут отдыха обычно поднимают темп</span></div>`);
    if (est.onBreak) rows.push(`<div class="v8-assist-row"><span class="k">⏸</span><span>Перерыв: минута стоит <b>~${fmt(est.rate / 60)} ₽</b></span></div>`);
    const avgLen = shifts.length ? shifts.slice(0, 10).reduce((a, s) => a + s.hours, 0) / Math.min(10, shifts.length) : 0;
    if (avgLen && est.hours > avgLen * 1.3) rows.push(`<div class="v8-assist-row"><span class="k">⏱</span><span>Смена уже длиннее обычной (${avgLen.toFixed(1)} ч) на ${Math.round((est.hours / avgLen - 1) * 100)}% — следите за темпом</span></div>`);
    return `<div class="v8-assist-top"><span class="v8-assist-rate">~${fmt(est.rate)}<small>₽/ч</small></span>${chips.join('')}</div><div class="v8-assist-rows">${rows.join('')}</div>`;
  }
  function renderAssist() {
    const panel = document.getElementById('activeShiftPanel'); if (!panel) return;
    let box = document.getElementById('v8Assist');
    if (!activeShift) { if (box) box.remove(); headRate(null); return; }
    if (!box) { box = document.createElement('div'); box.id = 'v8Assist'; box.className = 'v8-assist'; const anchor = document.getElementById('liveRateDisplay'); if (anchor) anchor.insertAdjacentElement('afterend', box); else panel.appendChild(box); }
    box.innerHTML = assistHtml();
    const est = liveEst(); headRate(est);
    const r = Math.round(est.rate / 10);
    if (_lastRateShown !== -1 && r !== _lastRateShown) pop(box.querySelector('.v8-assist-rate'));
    _lastRateShown = r;
  }
  function headRate(est) {
    const ident = document.getElementById('headerIdent'); if (!ident) return;
    let chip = document.getElementById('v8HeadRate');
    if (!est) { if (chip) chip.remove(); return; }
    if (!chip) { chip = document.createElement('button'); chip.id = 'v8HeadRate'; chip.className = 'v8-head-rate'; chip.onclick = () => switchTab('live'); ident.appendChild(chip); }
    chip.classList.toggle('brk', !!est.onBreak);
    chip.innerHTML = `<i></i>~${fmt(est.rate)} ₽/ч · ${est.hours.toFixed(1)} ч`;
  }

  // ---------- ОТЧЁТЫ ----------
  const TAX = { none: { l: 'без налога', r: 0 }, npd4: { l: 'НПД 4% (физлица)', r: .04 }, npd6: { l: 'НПД 6% (юрлица)', r: .06 }, usn6: { l: 'УСН 6%', r: .06 }, ndfl13: { l: 'НДФЛ 13%', r: .13 } };
  let _repMonth = null;
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
  function reportsHtml() {
    const keys = monthKeys(); if (!_repMonth || !keys.includes(_repMonth)) _repMonth = keys[0];
    const k = _repMonth, cur = monthAgg(k), prev = monthAgg(prevKey(k));
    const tr = TAX[taxRegime()].r, tax = cur.earned * tr, after = cur.net - tax;
    const delta = (a, b, inv) => { if (!b) return ''; const d = (a - b) / b * 100; const cls = Math.abs(d) < 3 ? 'flat' : ((d > 0) !== !!inv ? 'up' : 'down'); return `<div class="d ${cls}">${d > 0 ? '+' : ''}${Math.round(d)}% к пред.</div>`; };
    const cell = (v, l, d) => `<div class="v8-rep-cell"><div class="v">${v}</div><div class="l">${l}</div>${d || ''}</div>`;
    const sel = `<select onchange="V8.setRepMonth(this.value)">${keys.map(x => `<option value="${x}" ${x === k ? 'selected' : ''}>${monthLabel(x)}</option>`).join('')}</select>`;
    const kpi = cur.n ? `<div class="v8-rep-kpi">
      ${cell(fmt(cur.earned) + ' ₽', 'доход', delta(cur.earned, prev.earned))}
      ${cell(fmt(cur.rate) + ' ₽/ч', 'средний темп', delta(cur.rate, prev.rate))}
      ${cell(cur.hours.toFixed(1) + ' ч', 'часов', delta(cur.hours, prev.hours))}
      ${cell(cur.n, plural(cur.n, 'смена', 'смены', 'смен') + ' · ' + cur.days + ' дн', delta(cur.n, prev.n))}
      ${cell((cur.expenses ? '−' : '') + fmt(cur.expenses) + ' ₽', 'расходы', delta(cur.expenses, prev.expenses, true))}
      ${cell(fmt(cur.net) + ' ₽', 'чистыми', delta(cur.net, prev.net))}
    </div>` : '<div class="eff-empty">В этом месяце смен нет.</div>';
    const taxHtml = cur.n ? `<div class="v8-tax"><div>Налог <select onchange="V8.setTax(this.value)">${Object.entries(TAX).map(([v, t]) => `<option value="${v}" ${v === taxRegime() ? 'selected' : ''}>${t.l}</option>`).join('')}</select><div style="margin-top:4px;color:var(--text-secondary)">${tr ? `к уплате <b style="font-size:12px">${fmt(tax)} ₽</b>` : 'налог не считается'}</div></div><div style="text-align:right"><div style="font-size:10.5px;color:var(--text-dim);font-weight:700">на руки после налога</div><b>${fmt(after)} ₽</b></div></div>` : '';
    // 6 месяцев: доход / расходы / налог
    const six = []; let kk = k; for (let i = 0; i < 6; i++) { six.unshift(kk); kk = prevKey(kk); }
    const rows = six.map(x => ({ k: x, a: monthAgg(x) }));
    const max = Math.max(1, ...rows.map(r => r.a.earned));
    const bars = rows.map(r => { const e = r.a.earned, x = Math.min(e, r.a.expenses), t = e * tr; const H = 72; const he = Math.round((e - x - t) / max * H), hx = Math.round(x / max * H), ht = Math.round(t / max * H); const [, m] = r.k.split('-'); return `<div class="col ${r.k === k ? 'cur' : ''}" onclick="V8.setRepMonth('${r.k}')" title="${monthLabel(r.k)}: ${fmt(e)} ₽">${e ? `<small>${fmt(e / 1000)}к</small>` : ''}<div class="stack"><div class="t" style="height:${ht}px"></div><div class="x" style="height:${hx}px"></div><div class="e" style="height:${Math.max(e ? 2 : 0, he)}px"></div></div><b>${['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][+m - 1]}</b></div>`; }).join('');
    const legend = `<div class="v8-legend"><span><i style="background:var(--primary)"></i>чистыми</span><span><i style="background:var(--red)"></i>расходы</span>${tr ? '<span><i style="background:var(--orange)"></i>налог</span>' : ''}</div>`;
    const btns = `<div class="v8-rep-ctl" style="margin:10px 0 0"><button class="v8-rep-btn p" onclick="V8.exportPdf()">🖨 PDF / печать</button><button class="v8-rep-btn" onclick="V8.exportCsv(false)">📄 CSV месяц</button><button class="v8-rep-btn" onclick="V8.exportCsv(true)">📚 CSV всё</button></div>`;
    return `<div class="v8-rep-ctl">${sel}</div>${kpi}${taxHtml}<div class="v8-bars">${bars}</div>${legend}${btns}`;
  }
  function renderReports() {
    const root = document.getElementById('contentStats'); if (!root) return;
    let box = document.getElementById('v8Reports');
    if (!box) { box = document.createElement('div'); box.id = 'v8Reports'; box.className = 'v7-sec'; box.style.marginTop = 'var(--sp-3)'; const v7 = document.getElementById('v7StatsExtra'); if (v7) v7.insertAdjacentElement('afterend', box); else root.insertBefore(box, root.firstChild); }
    box.innerHTML = `<div class="v7-sec-head"><div class="v7-sec-title">📑 Отчёт за месяц</div><span style="font-size:11px;color:var(--text-dim)">сравнение с прошлым</span></div>` + reportsHtml();
  }
  function setRepMonth(k) { _repMonth = k; renderReports(); try { haptic('light'); } catch (e) {} }
  function curMonth() { const keys = monthKeys(); if (!_repMonth || !keys.includes(_repMonth)) _repMonth = keys[0]; return _repMonth; }
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
      if (typeof oTimer === 'function' && !oTimer._v8) { let i = 0; window.updateTimer = function () { const r = oTimer.apply(this, arguments); try { if (++i % 5 === 1) renderAssist(); } catch (e) {} return r; }; window.updateTimer._v8 = 1; }
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

  return { boot, setThemeMode, askNotify, editGoals, renderGoals, renderAssist, renderReports, setRepMonth, setTax, exportCsv, exportPdf, liveEst, getGoals };
})();
window.V8 = V8;


