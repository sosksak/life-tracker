// ====== V9.2 — ВИДЖЕТЫ ГЛАВНОЙ: смена, месяц, неделя, задания, курсы, колесо ======
// Главная становится рабочим экраном: всё, ради чего раньше приходилось ходить по вкладкам,
// теперь под рукой. Состав и порядок виджетов настраивается (Главная → «Настроить»),
// настройки хранятся в v92_widgets и уезжают в облако вместе с прогрессом.
const V92 = (() => {
  'use strict';
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('ru-RU');
  const esc = t => escapeHtml(t == null ? '' : t);
  const dstr = off => { const d = new Date(); d.setDate(d.getDate() - off); return localDateStr(d); };
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14)) ? b : c; };
  const W_KEY = 'v92_widgets';
  const WIDGETS = [
    { id: 'shift',  name: 'Смена сейчас',      sub: 'таймер, прогноз, +1 заказ, перерыв' },
    { id: 'month',  name: 'Путь к цели месяца', sub: 'факт / прогноз / цель и калькулятор смен' },
    { id: 'week',   name: 'Эта неделя',         sub: 'доход по дням и сравнение с прошлой' },
    { id: 'quests', name: 'Задания дня',        sub: 'отметить прямо с Главной' },
    { id: 'wheel',  name: 'Колесо бонусов',     sub: 'напоминание о бесплатном спине' },
    { id: 'ticker', name: 'Курсы крипты',       sub: 'BTC / ETH / TON из последнего обновления Биржи' },
  ];
  const DEFAULT_ORDER = WIDGETS.map(w => w.id);
  function getCfg() {
    const c = uGet(W_KEY, null) || {};
    const order = Array.isArray(c.order) ? c.order.filter(id => DEFAULT_ORDER.includes(id)) : [];
    for (const id of DEFAULT_ORDER) if (!order.includes(id)) order.push(id);
    const hidden = Array.isArray(c.hidden) ? c.hidden : ['ticker'];
    return { order, hidden };
  }
  function saveCfg(c) { uSet(W_KEY, c); try { markLocalChange(); schedulePushProgress(); } catch (e) {} }

  // ---------- ДАННЫЕ ----------
  function workedMs(sh) {
    const now = Date.now();
    const brk = (sh.breaks || []).reduce((a, b) => a + Math.max(0, (b.end || now) - b.start), 0) + (sh.currentBreak ? now - sh.currentBreak.start : 0);
    return Math.max(0, now - sh.startTime - brk);
  }
  function dayAgg(dates) {
    const set = new Set(dates); let earned = 0, hours = 0, n = 0;
    (shifts || []).forEach(s => { if (set.has(s.date)) { earned += s.earned || 0; hours += s.hours || 0; n++; } });
    return { earned, hours, n };
  }
  function monthPrefix(d) { d = d || new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  function monthData() {
    const now = new Date(), prefix = monthPrefix(now);
    const ms = (shifts || []).filter(s => s.date && s.date.startsWith(prefix));
    const mn = typeof getMonthNet === 'function' ? getMonthNet(prefix) : null;
    const earned = mn ? Math.round(mn.net) : ms.reduce((a, s) => a + (s.earned || 0), 0); // чистыми
    const goal = typeof getMonthGoal === 'function' ? getMonthGoal() : 0;
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate(), daysLeft = daysIn - today;
    // средняя смена: этот месяц → последние 20 смен → 0
    let avg = 0;
    if (ms.length) avg = mn ? mn.avgNetPerShift : earned / ms.length;
    else { const r = (shifts || []).slice(0, 20); if (r.length) avg = r.reduce((a, s) => a + (s.earned || 0) - (s.expenses || 0), 0) / r.length; }
    // запланированные смены в календаре до конца месяца
    let planned = 0; const plan = typeof getCalendarPlan === 'function' ? getCalendarPlan() : {};
    const ts = todayStr();
    for (let d = today; d <= daysIn; d++) { const k = `${prefix}-${String(d).padStart(2, '0')}`; if (plan[k] === 'planned' && (k > ts || (k === ts && !ms.some(s => s.date === ts)))) planned++; }
    // прогноз: если есть план — по нему, иначе — по текущему темпу (смен/день)
    const pace = today > 0 ? ms.length / today : 0;
    const forecast = earned + (planned > 0 ? planned : Math.round(pace * daysLeft)) * avg;
    const live = (typeof V8 !== 'undefined' && V8.liveEst) ? V8.liveEst() : null;
    const liveEarn = live ? live.earned : 0;
    const remain = Math.max(0, goal - earned - liveEarn);
    const needShifts = avg > 0 ? Math.ceil(remain / avg) : 0;
    return { earned, goal, daysIn, today, daysLeft, avg, planned, forecast, remain, needShifts, n: ms.length, liveEarn, pct: goal > 0 ? Math.max(0, Math.min(100, earned / goal * 100)) : 0, fpct: goal > 0 ? Math.max(0, Math.min(100, forecast / goal * 100)) : 0 };
  }
  function weekData() {
    const d = new Date(), dow = (d.getDay() + 6) % 7, out = [], plan = typeof getCalendarPlan === 'function' ? getCalendarPlan() : {};
    const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    let total = 0, prev = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(d); date.setDate(d.getDate() - dow + i); const k = localDateStr(date);
      const a = dayAgg([k]); total += a.earned;
      out.push({ k, name: names[i], earned: a.earned, hours: a.hours, today: i === dow, future: i > dow, plan: plan[k] === 'planned' });
      const pd = new Date(date); pd.setDate(pd.getDate() - 7); prev += dayAgg([localDateStr(pd)]).earned;
    }
    if (activeShift && typeof V8 !== 'undefined' && V8.liveEst) { const e = V8.liveEst(); if (e) { out[dow].live = e.earned; } }
    return { days: out, total, prev, max: Math.max(1, ...out.map(x => x.earned + (x.live || 0))) };
  }

  // ---------- ВИДЖЕТЫ ----------
  function shiftHtml() {
    const noun = (typeof V7 !== 'undefined' && V7.getWorkType) ? V7.getWorkType() : null;
    if (activeShift) {
      const ms = workedMs(activeShift), onBrk = activeShift.status === 'break';
      const est = (typeof V8 !== 'undefined' && V8.liveEst) ? V8.liveEst() : null;
      const units = activeShift.units || 0;
      const sub = onBrk ? '☕ Перерыв · ' + esc(activeShift.currentBreak && activeShift.currentBreak.type || '') : '🟢 В работе с ' + new Date(activeShift.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) + (units ? ' · ' + units + ' ' + plural(units, 'заказ', 'заказа', 'заказов') : '');
      return `<div class="w92-head"><span class="t">▶ Смена сейчас</span><button class="a" onclick="switchTab('live')">Открыть ›</button></div>
        <div class="w92-shift">
          <div><div class="big ${onBrk ? 'brk w92-pulse' : ''}" id="w92Timer">${formatDuration(ms)}</div><div class="sub" id="w92Sub">${sub}</div></div>
          <div class="est"><div class="v" id="w92Est">${est ? '~' + fmt(est.earned) + ' ₽' : '—'}</div><div class="l">${est ? fmt(est.rate) + ' ₽/ч · прогноз' : 'прогноз'}</div></div>
          <div class="w92-btns">
            <button class="w92-btn p" onclick="bumpUnits(1);V92.render()">+1 заказ</button>
            ${onBrk ? '<button class="w92-btn g" onclick="endBreak();V92.render()">▶ Продолжить</button>' : '<button class="w92-btn o" onclick="V92.quickBreak()">☕ Перерыв</button>'}
            <button class="w92-btn r" onclick="endShift()">⏹ Завершить</button>
          </div>
        </div>`;
    }
    const t = dayAgg([todayStr()]);
    const goals = (typeof V8 !== 'undefined' && V8.getGoals) ? V8.getGoals() : {};
    const dayGoal = goals.day || 0;
    const h = new Date().getHours();
    const sub = t.n ? `Сегодня: ${t.n} ${plural(t.n, 'смена', 'смены', 'смен')} · ${t.hours.toFixed(1)} ч` : (h < 12 ? 'Отличное время начать' : h < 18 ? 'Смена ещё не начата' : 'Сегодня без смены');
    return `<div class="w92-head"><span class="t">💼 Смена сейчас</span><button class="a" onclick="switchTab('live')">Работа ›</button></div>
      <div class="w92-shift">
        <div><div class="big">${fmt(t.earned)} <small style="font-size:14px;color:var(--text-dim)">₽</small></div><div class="sub">${sub}</div></div>
        <div class="est"><div class="v" style="color:var(--text)">${dayGoal ? fmt(dayGoal) + ' ₽' : '—'}</div><div class="l">${dayGoal ? 'цель дня' : '<span onclick="V8.editGoals()" style="color:var(--accent);cursor:pointer">задать цель дня</span>'}</div></div>
        ${dayGoal ? `<div class="w92-bar" style="grid-column:1/-1;margin:2px 0 0"><div class="f" style="width:${Math.min(100, t.earned / dayGoal * 100).toFixed(1)}%;background:${t.earned >= dayGoal ? 'var(--green)' : 'var(--primary)'}"></div></div>` : ''}
        <div class="w92-btns"><button class="w92-btn g wide" onclick="startShift();V92.render()">▶ Начать смену</button></div>
      </div>`;
  }
  function monthHtml() {
    const m = monthData();
    const now = new Date(), mname = now.toLocaleDateString('ru-RU', { month: 'long' });
    if (!m.goal) {
      return `<div class="w92-head"><span class="t">🎯 Путь к цели месяца</span><button class="a" onclick="openMonthGoalPrompt()">Задать цель</button></div>
        <div class="w92-month-top"><div class="v">${fmt(m.earned)} <small>₽ чистыми за ${mname}</small></div><span class="w92-pill">${m.n} ${plural(m.n, 'смена', 'смены', 'смен')}</span></div>
        <div class="w92-hint">Задай цель месяца — покажу прогноз, сколько смен осталось и успеваешь ли по календарю.</div>`;
    }
    const ok = m.forecast >= m.goal, done = m.earned >= m.goal;
    const pill = done ? '<span class="w92-pill g">✓ цель закрыта</span>' : ok ? `<span class="w92-pill g">прогноз ${fmt(m.forecast)} ₽</span>` : `<span class="w92-pill ${m.fpct >= 80 ? 'o' : 'r'}">прогноз ${fmt(m.forecast)} ₽</span>`;
    let hint;
    if (done) hint = `🏆 <b>${fmt(m.earned - m.goal)} ₽</b> сверх цели. Можно поднять планку — или заслуженно сбавить темп.`;
    else if (m.needShifts === 0) hint = `До цели <b>${fmt(m.remain)} ₽</b>. Пока нет ни одной смены за месяц — после первой посчитаю, сколько их ещё нужно.`;
    else {
      const perDay = m.daysLeft > 0 ? (m.needShifts / m.daysLeft) : 99;
      const live = m.liveEarn > 0 ? ` (с учётом текущей смены ~${fmt(m.liveEarn)} ₽)` : '';
      hint = `До цели <b>${fmt(m.remain)} ₽</b>${live} — это ещё <b>${m.needShifts} ${plural(m.needShifts, 'смена', 'смены', 'смен')}</b> по ~${fmt(m.avg)} ₽. `;
      if (m.daysLeft <= 0) hint += 'Сегодня последний день месяца.';
      else if (perDay > 1) hint += `Осталось ${m.daysLeft} ${plural(m.daysLeft, 'день', 'дня', 'дней')} — <b>не хватает дней</b>, пересмотри цель или ₽/смену.`;
      else if (perDay > 0.75) hint += `Нужно работать <b>почти каждый день</b> из ${m.daysLeft} оставшихся.`;
      else if (perDay > 0.5) hint += `Примерно <b>через день</b> до конца месяца (${m.daysLeft} дн.).`;
      else hint += `Хватит <b>${m.needShifts} из ${m.daysLeft}</b> оставшихся дней — темп комфортный.`;
      hint += m.planned ? ` Прогноз <b>${fmt(m.forecast)} ₽</b> — по ${m.planned} ${plural(m.planned, 'запланированной', 'запланированным', 'запланированным')} в календаре.` : ` Прогноз <b>${fmt(m.forecast)} ₽</b> — по текущему темпу; отметь смены в календаре (Стата), будет точнее.`;
    }
    return `<div class="w92-head"><span class="t">🎯 Путь к цели месяца</span><button class="a" onclick="openMonthGoalPrompt()">Изменить</button></div>
      <div class="w92-month-top"><div class="v">${fmt(m.earned)} <small>/ ${fmt(m.goal)} ₽ чистыми</small></div>${pill}</div>
      <div class="w92-bar"><div class="p" style="width:${m.fpct.toFixed(1)}%"></div><div class="f" style="width:${m.pct.toFixed(1)}%;${done ? 'background:var(--green)' : ''}"></div><div class="m" style="left:${Math.min(99.5, m.today / m.daysIn * 100).toFixed(1)}%"></div></div>
      <div class="w92-row"><span>факт <b>${m.pct.toFixed(0)}%</b></span><span>день <b>${m.today}/${m.daysIn}</b></span><span>в среднем <b>${fmt(m.avg)} ₽</b>/смена</span></div>
      <div class="w92-hint">${hint}</div>`;
  }
  function weekHtml() {
    const w = weekData();
    const diff = w.prev > 0 ? Math.round((w.total - w.prev) / w.prev * 100) : (w.total > 0 ? 100 : 0);
    const pill = w.prev > 0 || w.total > 0 ? `<span class="w92-pill ${diff >= 0 ? 'g' : 'r'}">${diff >= 0 ? '+' : ''}${diff}% к прошлой</span>` : '';
    const bars = w.days.map(d => {
      const v = d.earned + (d.live || 0), h = Math.max(3, Math.round(v / w.max * 56));
      const cls = (d.today ? ' today' : '') + (d.future ? ' future' : '') + (d.future && d.plan ? ' plan' : '');
      const lbl = v > 0 ? (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'к' : fmt(v)) : (d.future && d.plan ? '📅' : '');
      return `<div class="d${cls}" onclick="switchTab('stats');window.V994&&V994.set('contentStats','income',{silent:true})"><div class="v">${lbl}</div><div class="c" style="height:${d.future ? 3 : h}px"></div><div class="l">${d.name}</div></div>`;
    }).join('');
    return `<div class="w92-head"><span class="t">📅 Эта неделя · ${fmt(w.total)} ₽</span>${pill}</div><div class="w92-week">${bars}</div>`;
  }
  function questsHtml() {
    let qs = [], st = { checked: {} };
    try { qs = getResolvedLifeQuests(); st = getLifeQuestState(); } catch (e) { return ''; }
    if (!qs.length) return '';
    const done = qs.filter(q => st.checked[q.id]).length;
    const list = qs.slice().sort((a, b) => (st.checked[a.id] ? 1 : 0) - (st.checked[b.id] ? 1 : 0)).slice(0, 3);
    const rows = list.map(q => `<div class="w92-q ${st.checked[q.id] ? 'done' : ''}" onclick="V92.toggleQuest('${esc(q.id)}')"><div class="cb">${st.checked[q.id] ? '✓' : ''}</div><div class="n">${esc(q.icon)} ${esc(q.title)}</div><div class="x">+${q.xp} XP</div></div>`).join('');
    return `<div class="w92-head"><span class="t">✅ Задания дня · ${done}/${qs.length}</span><button class="a" onclick="switchTab('life')">Все ›</button></div>${done === qs.length ? '<div class="w92-empty">🎉 Все задания дня выполнены</div>' : rows}`;
  }
  function wheelHtml() {
    let free = false, hist = [];
    try { const w = uGet('v7_wheel', { freeDate: '', history: [] }); free = w.freeDate !== todayStr(); hist = w.history || []; } catch (e) {}
    if (!free) { const last = hist[0]; return `<div class="w92-strip" style="opacity:.75" onclick="openWheelModal()"><span style="font-size:22px">🎡</span><div class="t">Колесо бонусов<span class="s">${last ? 'Сегодня выпало: ' + esc(last.label) : 'Бесплатный спин уже использован'} · следующий завтра</span></div></div>`; }
    return `<div class="w92-strip" onclick="openWheelModal()"><span style="font-size:22px" class="w92-pulse">🎡</span><div class="t">Бесплатный спин доступен<span class="s">XP, замены заданий, щит серии — крути раз в день</span></div><button class="b">Крутить</button></div>`;
  }
  function tickerHtml() {
    const last = uGet('v7_market_last', null);
    if (!last || !last._ts) return `<div class="w92-head"><span class="t">📈 Курсы</span><button class="a" onclick="switchTab('money')">Биржа ›</button></div><div class="w92-empty">Открой вкладку ДЕНЬГИ один раз — курсы появятся здесь</div>`;
    const coins = [['bitcoin', 'BTC'], ['ethereum', 'ETH'], ['the-open-network', 'TON']];
    const age = Math.round((Date.now() - last._ts) / 60000);
    const cells = coins.map(([id, sym]) => {
      const c = last[id]; if (!c) return `<div class="w92-tk"><div class="s">${sym}</div><div class="p">—</div></div>`;
      const ch = c.usd_24h_change || 0, usd = c.usd || 0;
      const p = usd >= 1000 ? '$' + Math.round(usd).toLocaleString('en-US') : '$' + usd.toFixed(usd >= 1 ? 2 : 4);
      return `<div class="w92-tk" onclick="switchTab('money');try{MARKET.setCoin('${id}')}catch(e){}"><div class="s"><span>${sym}</span><span class="ch ${ch >= 0 ? 'g' : 'r'}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span></div><div class="p">${p}</div></div>`;
    }).join('');
    return `<div class="w92-head"><span class="t">📈 Курсы · ${age < 1 ? 'только что' : age < 60 ? age + ' мин назад' : Math.round(age / 60) + ' ч назад'}</span><button class="a" onclick="switchTab('money')">Биржа ›</button></div><div class="w92-ticker">${cells}</div>`;
  }
  const RENDER = { shift: shiftHtml, month: monthHtml, week: weekHtml, quests: questsHtml, wheel: wheelHtml, ticker: tickerHtml };
  const BARE = { wheel: 1 }; // виджет сам рисует карточку

  // ---------- РЕНДЕР ----------
  function render() {
    const root = document.getElementById('dashboardContent'); if (!root) return;
    let box = document.getElementById('v92Widgets');
    if (!box) { box = document.createElement('div'); box.id = 'v92Widgets'; box.className = 'w92-wrap'; }
    const after = document.getElementById('v9Dash') || document.getElementById('v8Goals') || document.getElementById('v7DashExtra') || root.querySelector('.dash-greeting');
    if (after && after.nextSibling !== box) after.insertAdjacentElement('afterend', box); else if (!after && !box.parentNode) root.appendChild(box);
    const cfg = getCfg();
    let html = '';
    for (const id of cfg.order) {
      if (cfg.hidden.includes(id)) continue;
      let inner = ''; try { inner = RENDER[id](); } catch (e) { console.warn('[v92]', id, e); }
      if (!inner) continue;
      html += BARE[id] ? inner : `<div class="w92" data-w="${id}">${inner}</div>`;
    }
    html += `<div style="text-align:right;margin-top:-4px"><button class="w92-head a" style="font-size:11px;color:var(--text-dim);background:none;border:none;font-family:inherit;cursor:pointer;padding:2px 4px" onclick="V92.settings()">⚙ Настроить виджеты</button></div>`;
    box.innerHTML = html;
    // Прежняя карточка «Работа» в сетке дублирует виджет смены — прячем, чтобы не было двух кнопок «Начать смену»
    try { const qa = root.querySelector('.dash-quick-actions'); if (qa && !cfg.hidden.includes('shift')) { qa.querySelectorAll('.dash-action-btn').forEach(b => { if (/смену/i.test(b.textContent)) b.style.display = 'none'; }); } } catch (e) {}
  }
  // Лёгкий тик раз в секунду: только таймер и прогноз, без пересборки DOM
  function tick() {
    if (!activeShift) return;
    const t = document.getElementById('w92Timer'); if (!t || !document.getElementById('dashboardContent')?.classList.contains('active')) return;
    t.textContent = formatDuration(workedMs(activeShift));
    const e = document.getElementById('w92Est'); if (e && Math.floor(Date.now() / 1000) % 15 === 0) { const est = V8.liveEst && V8.liveEst(); if (est) e.textContent = '~' + fmt(est.earned) + ' ₽'; }
  }
  function visible() { return document.getElementById('dashboardContent')?.classList.contains('active'); }

  // ---------- ДЕЙСТВИЯ ----------
  function quickBreak() {
    if (!activeShift) return;
    // Короткий перерыв одним тапом; тип можно сменить на вкладке РАБОТА
    if (typeof confirmBreak === 'function') { try { document.getElementById('breakTypeSelector').style.display = 'none'; } catch (e) {} confirmBreak('Отдых'); }
    render();
  }
  function toggleQuest(id) { try { toggleLifeQuest(id); } catch (e) {} render(); try { if (typeof DASHBOARD !== 'undefined' && V7.renderDashExtras) V7.renderDashExtras(); } catch (e) {} }
  function settings() {
    const cfg = getCfg();
    const rows = cfg.order.map((id, i) => {
      const w = WIDGETS.find(x => x.id === id), on = !cfg.hidden.includes(id);
      return `<div class="row"><div class="n">${esc(w.name)}<span class="s">${esc(w.sub)}</span></div><button class="ib" ${i === 0 ? 'disabled' : ''} onclick="V92.move('${id}',-1)">▲</button><button class="ib" ${i === cfg.order.length - 1 ? 'disabled' : ''} onclick="V92.move('${id}',1)">▼</button><button class="w92-sw ${on ? 'on' : ''}" onclick="V92.toggle('${id}')" aria-label="${on ? 'скрыть' : 'показать'}"></button></div>`;
    }).join('');
    let m = document.getElementById('v92SetModal');
    if (!m) {
      m = document.createElement('div'); m.id = 'v92SetModal'; m.className = 'modal-overlay';
      m.innerHTML = `<div class="modal-content" style="max-width:420px"><div class="modal-title">⚙ Виджеты Главной</div><div class="w92-set" id="v92SetBody"></div><div style="margin-top:14px;display:flex;gap:8px"><button class="modal-close-btn" style="margin-top:0;flex:1" onclick="V92.reset()">Сбросить</button><button class="modal-save-btn" style="flex:1" onclick="V92.closeSettings()">Готово</button></div></div>`;
      m.addEventListener('click', e => { if (e.target === m) closeSettings(); });
      document.body.appendChild(m);
    }
    document.getElementById('v92SetBody').innerHTML = rows;
    m.classList.add('show'); document.body.classList.add('modal-open');
  }
  function closeSettings() { const m = document.getElementById('v92SetModal'); if (m) m.classList.remove('show'); if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open'); render(); }
  function move(id, d) { const c = getCfg(); const i = c.order.indexOf(id), j = i + d; if (i < 0 || j < 0 || j >= c.order.length) return; c.order.splice(i, 1); c.order.splice(j, 0, id); saveCfg(c); settings(); haptic('light'); }
  function toggle(id) { const c = getCfg(); const k = c.hidden.indexOf(id); if (k >= 0) c.hidden.splice(k, 1); else c.hidden.push(id); saveCfg(c); settings(); haptic('light'); }
  function reset() { uRemove(W_KEY); try { markLocalChange(); schedulePushProgress(); } catch (e) {} settings(); showToast('Виджеты по умолчанию', 'success'); }

  // ---------- BOOT ----------
  let _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    try {
      try { if (!PROGRESS_KEYS.includes(W_KEY)) PROGRESS_KEYS.push(W_KEY); } catch (e) {}
      if (typeof DASHBOARD !== 'undefined' && DASHBOARD.render && !DASHBOARD._v92) { const o = DASHBOARD.render; DASHBOARD.render = function () { const r = o.apply(this, arguments); try { render(); } catch (e) { console.warn('[v92] dash', e); } return r; }; DASHBOARD._v92 = 1; }
      const oSw = window.switchTab;
      if (typeof oSw === 'function' && !oSw._v92) { window.switchTab = function (tab) { const r = oSw.apply(this, arguments); try { if (tab === 'dashboard') render(); } catch (e) {} return r; }; window.switchTab._v92 = 1; }
      const oRender = window.render;
      if (typeof oRender === 'function' && !oRender._v92) { window.render = function () { const r = oRender.apply(this, arguments); try { if (visible()) render(); } catch (e) {} return r; }; window.render._v92 = 1; }
      for (const fn of ['startShift', 'endBreak', 'confirmBreak', 'bumpUnits', 'toggleLifeQuest']) {
        const o = window[fn]; if (typeof o === 'function' && !o._v92) { window[fn] = function () { const r = o.apply(this, arguments); try { if (visible()) render(); } catch (e) {} return r; }; window[fn]._v92 = 1; }
      }
      const oTimer = window.updateTimer;
      if (typeof oTimer === 'function' && !oTimer._v92) { window.updateTimer = function () { const r = oTimer.apply(this, arguments); try { tick(); } catch (e) {} return r; }; window.updateTimer._v92 = 1; }
      render();
      setInterval(() => { if (visible() && !document.querySelector('.modal-overlay.show')) { try { render(); } catch (e) {} } }, 60000);
      console.log('[v9.2] dashboard widgets ready');
    } catch (e) { console.error('[v92] boot', e); _booted = false; }
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') { window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 800); return r; }; }
    document.addEventListener('v7:login', () => setTimeout(boot, 500));
    setTimeout(() => { if (!_booted && typeof currentUser !== 'undefined' && currentUser) boot(); }, 7000);
  })();

  return { boot, render, quickBreak, toggleQuest, settings, closeSettings, move, toggle, reset, monthData, weekData };
})();
window.V92 = V92;

