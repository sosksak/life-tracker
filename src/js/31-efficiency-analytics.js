// ====== EFFICIENCY (вкладка РАБОТА): ₽/ч, заказы, расходы, чистыми за период ======
const EFF = (() => {
  let period = 'today';
  try { period = localStorage.getItem('v7_eff_period') || 'today'; } catch (e) {}
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const dstr = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return localDateStr(d); };

  // Агрегат за набор дат: закрытые смены + (для сегодня) активная смена.
  function agg(dates) {
    const set = new Set(dates);
    const meta = getShiftMeta();
    let earned = 0, hours = 0, units = 0, expenses = 0, n = 0;
    shifts.forEach(s => {
      if (!set.has(s.date)) return;
      const m = meta[shiftMetaKey(s)] || {};
      earned += s.earned || 0; hours += s.hours || 0; n++;
      units += m.units || 0; expenses += m.expenses || 0;
    });
    const today = todayStr();
    if (activeShift && set.has(today)) {
      const brk = (activeShift.breaks || []).reduce((a, b) => a + Math.max(0, (b.end || Date.now()) - b.start), 0)
        + (activeShift.currentBreak ? Date.now() - activeShift.currentBreak.start : 0);
      const h = Math.max(0, (Date.now() - activeShift.startTime - brk) / 3600000);
      hours += h; units += activeShift.units || 0; n += 1;
    }
    return { earned, hours, units, expenses, n, net: earned - expenses,
      rate: hours > 0 ? earned / hours : 0, uph: hours > 0 ? units / hours : 0,
      perUnit: units > 0 ? earned / units : 0 };
  }

  function dayRate(date) {
    const a = agg([date]);
    return a.hours > 0 ? a.rate : 0;
  }

  function renderEff() {
    const body = document.getElementById('effBody');
    if (!body) return;
    document.querySelectorAll('#effSeg .eff-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.p === period));

    const days = period === 'today' ? 1 : parseInt(period, 10);
    const cur = agg(Array.from({ length: days }, (_, i) => dstr(i)));
    const prev = agg(Array.from({ length: days }, (_, i) => dstr(i + days)));

    if (!cur.n && !prev.n) {
      body.innerHTML = '<div class="eff-empty">Нет смен за период. Начните смену — показатели появятся сразу.</div>';
      return;
    }
    let delta = '';
    if (prev.hours > 0 && cur.hours > 0) {
      const d = cur.rate - prev.rate;
      const cls = d > 5 ? 'up' : d < -5 ? 'down' : 'flat';
      const sym = d > 5 ? '↑' : d < -5 ? '↓' : '→';
      const vs = period === 'today' ? 'вчера' : 'пред. ' + days + ' дн';
      delta = `<span class="eff-delta ${cls}">${sym} ${fmt(Math.abs(d))} ₽/ч vs ${vs}</span>`;
    }
    const live = activeShift ? ' · смена идёт' : '';
    const sub = `${cur.n} ${plural(cur.n, 'смена', 'смены', 'смен')} · ${cur.hours.toFixed(1)} ч${live}`;

    // Мини-график ₽/ч по дням (для 7/30), для «сегодня» — последние 7 дней с выделением сегодня.
    const span = period === 'today' ? 7 : Math.min(days, 30);
    const bars = Array.from({ length: span }, (_, i) => { const date = dstr(span - 1 - i); return { date, r: dayRate(date) }; });
    const max = Math.max(1, ...bars.map(b => b.r));
    const bestIdx = bars.reduce((bi, b, i) => b.r > (bars[bi]?.r || 0) ? i : bi, 0);
    const today = todayStr();
    const barsHtml = bars.map((b, i) => {
      const cls = b.r <= 0 ? 'off' : (i === bestIdx ? 'best' : '');
      const h = b.r <= 0 ? 4 : Math.max(6, Math.round(b.r / max * 44));
      return `<div class="eff-bar ${cls} ${b.date === today ? 'today' : ''}" style="height:${h}px" title="${b.date}: ${fmt(b.r)} ₽/ч"></div>`;
    }).join('');
    const lbl = (d) => { const [y, m, dd] = d.split('-'); return `${+dd}.${m}`; };

    body.innerHTML = `
      <div class="eff-main"><span class="eff-main-val">${fmt(cur.rate)}</span><span class="eff-main-unit">₽/ч</span>${delta}</div>
      <div class="eff-sub">${sub}</div>
      <div class="eff-grid">
        <div class="eff-cell"><div class="eff-cell-val">${fmt(cur.earned)} ₽</div><div class="eff-cell-lbl">Доход</div></div>
        <div class="eff-cell"><div class="eff-cell-val" style="color:var(--red)">${cur.expenses ? '−' + fmt(cur.expenses) : '0'} ₽</div><div class="eff-cell-lbl">Расходы</div></div>
        <div class="eff-cell"><div class="eff-cell-val net">${fmt(cur.net)} ₽</div><div class="eff-cell-lbl">Чистыми</div></div>
        <div class="eff-cell"><div class="eff-cell-val">${cur.units}</div><div class="eff-cell-lbl">Заказов</div></div>
        <div class="eff-cell"><div class="eff-cell-val">${cur.uph.toFixed(1)}</div><div class="eff-cell-lbl">Заказов/ч</div></div>
        <div class="eff-cell"><div class="eff-cell-val">${cur.perUnit ? fmt(cur.perUnit) + ' ₽' : '—'}</div><div class="eff-cell-lbl">За заказ</div></div>
      </div>
      <div class="eff-bars">${barsHtml}</div>
      <div class="eff-bars-lbl"><span>${lbl(bars[0].date)}</span><span>₽/ч по дням · лучший — зелёный</span><span>${lbl(bars[bars.length - 1].date)}</span></div>`;
  }
  function plural(n, a, b, c) { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; }
  function setPeriod(p) { period = p; try { localStorage.setItem('v7_eff_period', p); } catch (e) {} render(); }

  // ===== АНАЛИТИКА РАБОТЫ (#waCard): линейный график метрики, дни недели, часы начала, прогноз, рекорды =====
  let metric = 'rate';
  try { metric = localStorage.getItem('v7_wa_metric') || 'rate'; } catch (e) {}
  const METRICS = {
    rate:   { lbl: '₽/ч',    unit: '₽/ч', pick: a => a.rate,   fmtv: v => fmt(v) },
    earned: { lbl: 'Доход',  unit: '₽',   pick: a => a.earned, fmtv: v => fmt(v) },
    hours:  { lbl: 'Часы',   unit: 'ч',   pick: a => a.hours,  fmtv: v => (Math.round(v * 10) / 10).toString() },
    units:  { lbl: 'Заказы', unit: '',    pick: a => a.units,  fmtv: v => fmt(v) }
  };
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const dowIdx = date => (new Date(date + 'T12:00:00').getDay() + 6) % 7;

  function goalRate() {
    try { const g = DIFFICULTIES[difficulty] && DIFFICULTIES[difficulty].goal; return g || 0; } catch (e) { return 0; }
  }

  function lineChart(pts, M) {
    // pts: [{date, v, has}] в хронологическом порядке
    const W = 320, H = 150, L = 34, R = 8, T = 14, B = 22;
    const iw = W - L - R, ih = H - T - B;
    const vals = pts.filter(p => p.has).map(p => p.v);
    if (!vals.length) return '<div class="eff-empty">Нет данных для графика.</div>';
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const goal = M === METRICS.rate ? goalRate() : 0;
    let max = Math.max(...vals, goal || 0, 1); max *= 1.12;
    const x = i => L + (pts.length === 1 ? iw / 2 : i / (pts.length - 1) * iw);
    const y = v => T + ih - (v / max) * ih;
    // Линия только через дни с данными, пропуски соединяем (визуально — тренд).
    const withData = pts.map((p, i) => ({ ...p, i })).filter(p => p.has);
    const path = withData.map((p, k) => (k ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    const area = withData.length > 1
      ? path + ` L${x(withData[withData.length - 1].i).toFixed(1)} ${(T + ih).toFixed(1)} L${x(withData[0].i).toFixed(1)} ${(T + ih).toFixed(1)} Z` : '';
    const bestV = Math.max(...vals);
    const today = todayStr();
    const dots = withData.map(p => {
      const cls = p.date === today ? 'today' : (p.v === bestV ? 'best' : '');
      return `<circle class="wa-dot ${cls}" cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${pts.length > 31 ? 2 : 3.2}"><title>${p.date}: ${M.fmtv(p.v)} ${M.unit}</title></circle>`;
    }).join('');
    // Сетка: 3 горизонтальные линии с подписями
    const grid = [0.25, 0.5, 0.75, 1].map(f => {
      const v = max * f / 1.12, yy = y(v);
      return `<line class="wa-grid" x1="${L}" x2="${W - R}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/><text class="wa-ytxt" x="${L - 4}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${M.fmtv(v)}</text>`;
    }).join('');
    // Подписи X: первая, середина, последняя
    const xi = pts.length <= 7 ? pts.map((_, i) => i) : [0, Math.floor(pts.length / 2), pts.length - 1];
    const xl = xi.map(i => { const [, m, d] = pts[i].date.split('-'); return `<text class="wa-xtxt" x="${x(i).toFixed(1)}" y="${H - 6}">${+d}.${m}</text>`; }).join('');
    const avgL = `<line class="wa-avg" x1="${L}" x2="${W - R}" y1="${y(avg).toFixed(1)}" y2="${y(avg).toFixed(1)}"/>`;
    const goalL = goal ? `<line class="wa-goal" x1="${L}" x2="${W - R}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}"/>` : '';
    return `<div class="wa-chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="waGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".22"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
      ${grid}${area ? `<path class="wa-area" d="${area}"/>` : ''}<path class="wa-line" d="${path}"/>${avgL}${goalL}${dots}${xl}</svg></div>
      <div class="wa-legend"><span><i style="border-color:var(--primary)"></i>${M.lbl}</span><span><i class="d" style="border-color:var(--accent)"></i>среднее ${M.fmtv(avg)}</span>${goal ? `<span><i class="d" style="border-color:var(--green)"></i>цель ${fmt(goal)}</span>` : ''}</div>`;
  }

  function dowSection(dates) {
    const meta = getShiftMeta();
    const acc = DOW.map(() => ({ e: 0, h: 0, n: 0 }));
    const set = new Set(dates);
    shifts.forEach(s => { if (!set.has(s.date)) return; const a = acc[dowIdx(s.date)]; a.e += s.earned || 0; a.h += s.hours || 0; a.n++; });
    const rows = acc.map((a, i) => ({ i, rate: a.h > 0 ? a.e / a.h : 0, n: a.n, e: a.e }));
    const has = rows.filter(r => r.n > 0);
    if (has.length < 2) return '';
    const max = Math.max(...rows.map(r => r.rate), 1);
    const best = has.reduce((b, r) => r.rate > b.rate ? r : b, has[0]);
    const worst = has.reduce((b, r) => r.rate < b.rate ? r : b, has[0]);
    const html = rows.map(r => `<div class="wa-row ${r.i === best.i ? 'best' : r.i === worst.i && has.length > 2 ? 'worst' : ''}">
        <span class="l">${DOW[r.i]}</span><span class="b"><i style="width:${Math.round(r.rate / max * 100)}%"></i></span>
        <span class="v">${r.n ? fmt(r.rate) + ' <small>₽/ч · ' + r.n + '</small>' : '<small>—</small>'}</span></div>`).join('');
    return `<div class="wa-sec"><div class="wa-sec-t"><span>По дням недели</span><span>лучший — ${DOW[best.i]}</span></div><div class="wa-rows">${html}</div></div>`;
  }

  function startHourSection(dates) {
    const meta = getShiftMeta();
    const set = new Set(dates);
    const buckets = [[5, 9, 'до 9'], [9, 12, '9–12'], [12, 15, '12–15'], [15, 18, '15–18'], [18, 24, 'после 18']];
    const acc = buckets.map(() => ({ e: 0, h: 0, n: 0 }));
    let known = 0;
    shifts.forEach(s => {
      if (!set.has(s.date)) return;
      const m = meta[shiftMetaKey(s)]; if (!m || !m.startTime) return;
      const hr = new Date(m.startTime).getHours();
      const bi = buckets.findIndex(b => hr >= b[0] && hr < b[1]); if (bi < 0) return;
      acc[bi].e += s.earned || 0; acc[bi].h += s.hours || 0; acc[bi].n++; known++;
    });
    if (known < 2) return '';
    const rows = acc.map((a, i) => ({ i, rate: a.h > 0 ? a.e / a.h : 0, n: a.n }));
    const max = Math.max(...rows.map(r => r.rate), 1);
    const has = rows.filter(r => r.n);
    const best = has.reduce((b, r) => r.rate > b.rate ? r : b, has[0]);
    const cols = rows.map(r => `<div class="wa-hist-col ${r.i === best.i ? 'hi' : ''}"><small>${r.n ? fmt(r.rate) : ''}</small><i style="height:${r.n ? Math.max(4, Math.round(r.rate / max * 40)) : 2}px"></i><b>${buckets[r.i][2]}</b></div>`).join('');
    return `<div class="wa-sec"><div class="wa-sec-t"><span>₽/ч по времени старта</span><span>лучше стартовать ${buckets[best.i][2]}</span></div><div class="wa-hist">${cols}</div></div>`;
  }

  function forecastSection() {
    const goal = getMonthGoal();
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const dayN = now.getDate();
    const pref = `${y}-${String(m + 1).padStart(2, '0')}-`;
    const month = shifts.filter(s => s.date.startsWith(pref));
    const earned = month.reduce((a, s) => a + (s.earned || 0), 0);
    const hours = month.reduce((a, s) => a + (s.hours || 0), 0);
    if (!month.length) return '';
    const perDay = earned / dayN;
    const proj = Math.round(perDay * dim);
    const left = dim - dayN;
    let txt = `<b>${fmt(proj)} ₽</b> прогноз на месяц<br>${fmt(earned)} ₽ за ${dayN} дн · ${fmt(perDay)} ₽/день · ${month.length} ${plural(month.length, 'смена', 'смены', 'смен')}`;
    let pct = 0;
    if (goal > 0) {
      pct = Math.min(100, Math.round(earned / goal * 100));
      const need = goal - earned;
      if (need <= 0) txt += `<br><span class="g">Цель ${fmt(goal)} ₽ выполнена ✓</span>`;
      else {
        const rate = hours > 0 ? earned / hours : 0;
        const needH = rate > 0 ? Math.round(need / rate) : 0;
        txt += `<br>до цели <span class="${proj >= goal ? 'g' : 'r'}">${fmt(need)} ₽</span> · ${left ? fmt(need / left) + ' ₽/день' : ''}${needH ? ` · ≈${needH} ч` : ''}`;
      }
    } else txt += '<br>Цель месяца не задана — задайте в календаре';
    const C = 2 * Math.PI * 27;
    return `<div class="wa-sec"><div class="wa-sec-t"><span>Прогноз месяца</span><span>осталось ${left} дн</span></div>
      <div class="wa-fc"><div class="wa-ring"><svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="27"/>${pct > 0 ? `<circle class="fg" cx="32" cy="32" r="27" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}"/>` : ''}</svg><div class="pct">${goal ? pct + '%' : '—'}</div></div><div class="wa-fc-txt">${txt}</div></div></div>`;
  }

  function recordsSection(dates) {
    const set = new Set(dates);
    const meta = getShiftMeta();
    const list = shifts.filter(s => set.has(s.date) && s.hours > 0);
    if (!list.length) return '';
    const byRate = [...list].sort((a, b) => b.earned / b.hours - a.earned / a.hours)[0];
    const byEarn = [...list].sort((a, b) => b.earned - a.earned)[0];
    const byHours = [...list].sort((a, b) => b.hours - a.hours)[0];
    const byUnits = [...list].map(s => ({ s, u: (meta[shiftMetaKey(s)] || {}).units || 0 })).sort((a, b) => b.u - a.u)[0];
    // Стабильность: коэффициент вариации ₽/ч
    const rates = list.map(s => s.earned / s.hours);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const sd = Math.sqrt(rates.reduce((a, r) => a + (r - mean) ** 2, 0) / rates.length);
    const cv = mean ? sd / mean : 0;
    const stab = rates.length < 3 ? '—' : cv < .12 ? 'стабильно' : cv < .25 ? 'умеренно' : 'разброс';
    // Доля смен выше цели
    const goal = goalRate();
    const aboveGoal = goal ? Math.round(rates.filter(r => r >= goal).length / rates.length * 100) : 0;
    const d = s => { const [, m, dd] = s.date.split('-'); return `${+dd}.${m}`; };
    const cell = (ico, val, lbl) => `<div class="wa-kpi-cell"><div class="wa-kpi-ico">${ico}</div><div><div class="wa-kpi-val">${val}</div><div class="wa-kpi-lbl">${lbl}</div></div></div>`;
    return `<div class="wa-sec"><div class="wa-sec-t"><span>Рекорды и стабильность</span><span>${list.length} ${plural(list.length, 'смена', 'смены', 'смен')}</span></div>
      <div class="wa-kpi">
        ${cell('🚀', fmt(byRate.earned / byRate.hours) + ' ₽/ч', 'рекорд ₽/ч · ' + d(byRate))}
        ${cell('💰', fmt(byEarn.earned) + ' ₽', 'рекорд дохода · ' + d(byEarn))}
        ${cell('⏱', byHours.hours + ' ч', 'самая длинная · ' + d(byHours))}
        ${byUnits.u ? cell('📦', byUnits.u, 'рекорд заказов · ' + d(byUnits.s)) : cell('📊', stab, 'стабильность ₽/ч')}
      </div>
      <div class="wa-chips" style="margin-top:8px">
        <span class="wa-chip ${cv < .12 ? 'g' : cv < .25 ? 'p' : 'o'}">σ ${fmt(sd)} ₽/ч · ${stab}</span>
        ${goal ? `<span class="wa-chip ${aboveGoal >= 50 ? 'g' : 'o'}">${aboveGoal}% смен ≥ ${fmt(goal)} ₽/ч</span>` : ''}
        <span class="wa-chip">медиана ${fmt([...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)])} ₽/ч</span>
      </div></div>`;
  }

  function renderWA() {
    const body = document.getElementById('waBody');
    if (!body) return;
    document.querySelectorAll('#waMetricSeg .eff-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.m === metric));
    const M = METRICS[metric] || METRICS.rate;
    const span = period === 'today' ? 14 : Math.max(14, parseInt(period, 10));
    const dates = Array.from({ length: span }, (_, i) => dstr(span - 1 - i));
    const pts = dates.map(date => { const a = agg([date]); return { date, v: M.pick(a), has: a.n > 0 && (metric === 'units' ? a.units > 0 : true) }; });
    if (!pts.some(p => p.has)) { body.innerHTML = '<div class="eff-empty">Пока нет смен — графики появятся после первой.</div>'; return; }
    const wide = Array.from({ length: 90 }, (_, i) => dstr(i));
    body.innerHTML = lineChart(pts, M)
      + `<div class="eff-sub" style="margin:6px 0 0">${span} дн · точки — смены, зелёная — лучший день</div>`
      + forecastSection()
      + dowSection(wide)
      + startHourSection(wide)
      + recordsSection(wide);
  }
  function setMetric(m) { metric = m; try { localStorage.setItem('v7_wa_metric', m); } catch (e) {} renderWA(); }

  let render;
  render = function () { if (!_hid('contentLive', '#effCard')) renderEff(); if (!_hid('contentLive', '#waCard')) { try { renderWA(); } catch (e) { console.warn('WA', e); } } };

  // Во время смены ₽/ч и заказы тикают — обновляем раз в 30с, только когда вкладка активна.
  setInterval(() => { if (activeShift && document.getElementById('contentLive')?.classList.contains('active')) render(); }, 30000);
  return { render: () => render(), setPeriod, setMetric };
})();

function getShiftTotals() {
  if (_shiftCache.len === shifts.length) return _shiftCache;
  const totalEarned = shifts.reduce((s, x) => s + x.earned, 0);
  const totalHours = shifts.reduce((s, x) => s + x.hours, 0);
  _shiftCache = { len: shifts.length, totalEarned, totalHours, avgRate: totalHours > 0 ? Math.round(totalEarned / totalHours) : 0 };
  return _shiftCache;
}
// v9.6.2: баланс кошелька = смены + прочие доходы − расходы смен − записанные расходы (± корректировки)
function getWalletBalance() {
  const { totalEarned } = getShiftTotals();
  const shiftExp = shifts.reduce((a, s) => a + (s.expenses || 0), 0);
  let txInc = 0, txExp = 0, adj = 0;
  try {
    (FINANCE.getTransactions() || []).forEach(t => {
      const a = +t.amount || 0;
      if (t.category === 'adjust') adj += t.type === 'income' ? a : -a;
      else if (t.type === 'income') txInc += a;
      else txExp += a;
    });
  } catch (e) {}
  return { balance: totalEarned + txInc + adj - shiftExp - txExp, totalEarned, shiftExp, txInc, txExp, adj };
}
// v9.6.3: единый расчёт месяца "чистыми": смены + прочие доходы − расходы смен − расходы/корректировки из «Деньги».
// Этим пользуются цель месяца, прогноз, дашборд и FINANCE — чтобы все вкладки сходились в одну цифру.
function getMonthNet(prefix) {
  if (!prefix) { const n = new Date(); prefix = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; }
  const ms = (shifts || []).filter(x => x.date && x.date.startsWith(prefix));
  const shiftEarned = ms.reduce((a, x) => a + (x.earned || 0), 0);
  const shiftExp = ms.reduce((a, x) => a + (x.expenses || 0), 0);
  let txInc = 0, txExp = 0, adj = 0; const byCat = {};
  try {
    (FINANCE.getTransactions() || []).forEach(t => {
      if (!t.date || !t.date.startsWith(prefix)) return;
      const a = +t.amount || 0;
      if (t.category === 'adjust') adj += t.type === 'income' ? a : -a;
      else if (t.type === 'income') txInc += a;
      else { txExp += a; byCat[t.category || 'other'] = (byCat[t.category || 'other'] || 0) + a; }
    });
  } catch (e) {}
  if (!uGet('lt_goal_use_adjust', true)) adj = 0; // настройка: учитывать ли корректировку в цели
  const gross = shiftEarned + txInc;
  const spent = shiftExp + txExp;
  return { n: ms.length, shiftEarned, shiftExp, txInc, txExp, adj, byCat, gross, spent, net: gross - spent + adj,
           avgNetPerShift: ms.length ? (shiftEarned - shiftExp) / ms.length : 0 };
}
async function editWalletBalance() {
  const w = getWalletBalance();
  const res = await askForm([
    { key: 'amount', label: 'Сколько денег есть на самом деле, ₽', type: 'number', placeholder: String(Math.round(w.balance)), value: Math.round(w.balance) },
  ], { icon: '⚖️', title: 'Изменить баланс', okText: 'Сохранить', text: 'Разница запишется корректировкой во вкладке «Деньги». Смены и история не меняются.' });
  if (!res || res.amount === '' || res.amount == null) return;
  const target = Math.round(parseFloat(res.amount));
  if (isNaN(target)) { showToast('Нужно число', 'warn'); return; }
  const diff = target - Math.round(w.balance);
  if (!diff) { showToast('Баланс уже такой', 'info'); return; }
  FINANCE.addAdjustment(diff);
  showToast(`⚖️ Баланс скорректирован: ${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('ru-RU')} ₽`, 'success');
  haptic('light');
  invalidateShiftCache();
  render();
  try { if (typeof renderStats === 'function') renderStats(); } catch (e) {}
}
function invalidateShiftCache() { _shiftCache.len = -1; _streakCache.key = ''; _heatmapLastKey = ''; }

// --- Debounced render to avoid rapid re-renders ---
let _renderTimer = null;
function scheduleRender() {
  if (_renderTimer) return;
  _renderTimer = requestAnimationFrame(() => { _renderTimer = null; render(); });
}

// --- Enhanced render with countUp ---
const _origRender = render;
render = function() {
  _origRender();
  try { EFF.render(); } catch (e) { console.warn('EFF', e); }
  countUp(document.getElementById('totalEarned'), Math.round(getWalletBalance().balance));
  // Only render heavy stats widgets when stats tab is active
  const statsActive = document.getElementById('contentStats')?.classList.contains('active');
  const liveActive = document.getElementById('contentLive')?.classList.contains('active');
  // v9.4: скрытые пользователем карточки не считаем вовсе
  if (liveActive || statsActive) {
    if (!_hid('contentLive', '#millionPath')) renderMillionPath();
    if (!_hid('contentLive', '#kopilkaCard')) renderKopilka();
    if (!_hid('contentLive', '#weeklyChallenge')) renderWeeklyChallenge();
    if (!_hid('contentLive', '#insightCard')) renderInsight();
  }
  if (statsActive) {
    if (!_hid('contentStats', '#weekCompare')) renderWeekCompare();
    if (!_hid('contentStats', '#heatmapSection')) renderHeatmap();
    if (!_hid('contentStats', '#diarySection')) renderDiary();
  }
  checkNewAchievements();
};

// --- Add Focus button to shift controls ---
const _origRenderActiveShift = renderActiveShift;
renderActiveShift = function() {
  _origRenderActiveShift();
  if (activeShift) {
    // Add focus button if not exists
    const controls = document.querySelector('.shift-controls');
    if (controls && !document.getElementById('btnFocus')) {
      const btn = document.createElement('button');
      btn.id = 'btnFocus';
      btn.className = 'shift-ctrl-btn';
      btn.style.cssText = 'background:var(--primary);color:#fff;border:none;';
      btn.textContent = '🎯 ФОКУС';
      btn.onclick = openFocusMode;
      controls.appendChild(btn);
    }
    updateLiveRate();
  } else {
    document.getElementById('liveRateDisplay').style.display = 'none';
  }
};

// --- Enhanced endShift to show summary ---
const _origSaveEndShift = saveEndShift;
saveEndShift = async function() {
  const earnedInput = document.getElementById('endShiftEarned');
  const earned = parseInt(earnedInput.value) || 0;
  const workHours = pendingEndShift ? pendingEndShift.hours : 0;
  const rate = workHours > 0 ? Math.round(earned / workHours) : 0;
  await _origSaveEndShift();
  // Show summary if shift was saved
  if (!activeShift && earned > 0) {
    setTimeout(() => showDailySummary(earned, workHours, rate), 500);
  }
};

// --- Add Kopilka setup to FAB menu ---
setTimeout(() => {
  const fabMenu = document.querySelector('.fab-menu');
  if (fabMenu) {
    const kopilkaBtn = document.createElement('button');
    kopilkaBtn.className = 'fab-item';
    kopilkaBtn.onclick = setupKopilka;
    kopilkaBtn.innerHTML = '<span class="fab-icon">🎯</span><span class="fab-label">Цель</span>';
    fabMenu.appendChild(kopilkaBtn);

    const wheelBtn = document.createElement('button');
    wheelBtn.className = 'fab-item';
    wheelBtn.onclick = openWheelModal;
    wheelBtn.innerHTML = '<span class="fab-icon">🎡</span><span class="fab-label">Колесо бонусов</span>';
    fabMenu.appendChild(wheelBtn);

    const focusBtn = document.createElement('button');
    focusBtn.className = 'fab-item';
    focusBtn.onclick = openFocusMode;
    focusBtn.innerHTML = '<span class="fab-icon">🎯</span><span class="fab-label">Режим фокуса</span>';
    fabMenu.appendChild(focusBtn);
  }
}, 100);

// --- Add haptic to buttons ---
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) haptic('light');
});

// --- Pull-to-Refresh (PWA) ---
{
  let ptrStartY = 0, ptrActive = false;
  const PTR_THRESHOLD = 80;
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0 && !document.body.classList.contains('modal-open')) {
      ptrStartY = e.touches[0].clientY;
      ptrActive = true;
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!ptrActive) return;
    const dy = e.touches[0].clientY - ptrStartY;
    if (dy > PTR_THRESHOLD && window.scrollY === 0) {
      document.getElementById('ptrIndicator').classList.add('show');
    }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!ptrActive) return;
    ptrActive = false;
    const ind = document.getElementById('ptrIndicator');
    if (ind.classList.contains('show')) {
      syncCloud().then(() => {
        render(); renderLifeQuests(); renderLifeStats();
        showToast('☁️ Данные обновлены', 'success');
      }).catch(() => {}).finally(() => {
        ind.classList.remove('show');
      });
    }
  }, { passive: true });
}

// Update quests every 30 seconds (for timer-based ones)
setInterval(() => { if (activeShift) renderQuests(); }, 30000);


// ╔══════════════════════════════════════════════════════════════════════╗
// ║  LIFE & WORK TRACKER v6.0 — PART 1: NEW MODULES                   ║
// ║  Dashboard · Habits · Health · Finance · Crypto                    ║
// ║                                                                    ║
// ║  Интеграция: uGet/uSet (профиль-изоляция), schedulePushProgress,  ║
// ║  markLocalChange, showToast, haptic, escapeHtml, todayStr,         ║
// ║  localDateStr, parseLocalDate, askConfirm, askForm, countUp        ║
// ╚══════════════════════════════════════════════════════════════════════╝

