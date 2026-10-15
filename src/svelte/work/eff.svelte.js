// EFF — карточки вкладки «Работа»: «⚡ ЭФФЕКТИВНОСТЬ» (#effCard) и «📈 АНАЛИТИКА» (#waCard).
// Бывший IIFE `EFF` в src/js/31-efficiency-analytics.js (→ _archive/31-eff-legacy.js).
//
// Данные (shifts, activeShift, метаданные смен) по-прежнему живут в легаси, поэтому
// стор хранит только выбор пользователя (период, метрика) и два счётчика версий.
// EFF.render() из легаси увеличивает их — реактивные выражения в компонентах
// пересчитываются. Счётчика два, чтобы скрытую раскладкой V93 карточку не считать
// вовсе (как раньше: `if (!_hid('contentLive','#effCard')) renderEff()`).
import { legacy } from '../lib/legacy.js';

function lsGet(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

export const eff = $state({
  period: lsGet('v7_eff_period', 'today'),   // 'today' | '7' | '30' | '90'
  metric: lsGet('v7_wa_metric', 'rate'),     // 'rate' | 'earned' | 'hours' | 'units'
  effV: 0,   // версия карточки «Эффективность»
  waV: 0,    // версия карточки «Аналитика»
});

export function setPeriod(p) { eff.period = p; lsSet('v7_eff_period', p); }
export function setMetric(m) { eff.metric = m; lsSet('v7_wa_metric', m); }

// ---------- общие помощники ----------
export const fmt = n => Math.round(n).toLocaleString('ru-RU');
export const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; };
const dstr = (off) => { const d = new Date(); d.setDate(d.getDate() - off); return legacy.dateStr(d); };
// «2026-10-13» → «13.10»
export const dLbl = (date) => { const [, m, dd] = date.split('-'); return `${+dd}.${m}`; };

// Агрегат за набор дат: закрытые смены + (для сегодня) активная смена.
export function agg(dates) {
  const set = new Set(dates);
  const meta = legacy.shiftMeta();
  let earned = 0, hours = 0, units = 0, expenses = 0, n = 0;
  legacy.shifts().forEach(s => {
    if (!set.has(s.date)) return;
    const m = meta[legacy.shiftMetaKey(s)] || {};
    earned += s.earned || 0; hours += s.hours || 0; n++;
    units += m.units || 0; expenses += m.expenses || 0;
  });
  const today = legacy.todayStr();
  const a = legacy.activeShift();
  if (a && set.has(today)) {
    const brk = (a.breaks || []).reduce((acc, b) => acc + Math.max(0, (b.end || Date.now()) - b.start), 0)
      + (a.currentBreak ? Date.now() - a.currentBreak.start : 0);
    const h = Math.max(0, (Date.now() - a.startTime - brk) / 3600000);
    hours += h; units += a.units || 0; n += 1;
  }
  return { earned, hours, units, expenses, n, net: earned - expenses,
    rate: hours > 0 ? earned / hours : 0, uph: hours > 0 ? units / hours : 0,
    perUnit: units > 0 ? earned / units : 0 };
}

function dayRate(date) { const a = agg([date]); return a.hours > 0 ? a.rate : 0; }

// ---------- ⚡ ЭФФЕКТИВНОСТЬ ----------
export function effView() {
  eff.effV;                       // зависимость: EFF.render() из легаси
  const period = eff.period;
  const days = period === 'today' ? 1 : parseInt(period, 10);
  const cur = agg(Array.from({ length: days }, (_, i) => dstr(i)));
  const prev = agg(Array.from({ length: days }, (_, i) => dstr(i + days)));
  if (!cur.n && !prev.n) return { empty: true };

  let delta = null;
  if (prev.hours > 0 && cur.hours > 0) {
    const d = cur.rate - prev.rate;
    delta = {
      cls: d > 5 ? 'up' : d < -5 ? 'down' : 'flat',
      sym: d > 5 ? '↑' : d < -5 ? '↓' : '→',
      abs: fmt(Math.abs(d)),
      vs: period === 'today' ? 'вчера' : 'пред. ' + days + ' дн',
    };
  }
  const live = legacy.activeShift() ? ' · смена идёт' : '';
  const sub = `${cur.n} ${plural(cur.n, 'смена', 'смены', 'смен')} · ${cur.hours.toFixed(1)} ч${live}`;

  // Мини-график ₽/ч по дням (для 7/30), для «сегодня» — последние 7 дней с выделением сегодня.
  const span = period === 'today' ? 7 : Math.min(days, 30);
  const raw = Array.from({ length: span }, (_, i) => { const date = dstr(span - 1 - i); return { date, r: dayRate(date) }; });
  const max = Math.max(1, ...raw.map(b => b.r));
  const bestIdx = raw.reduce((bi, b, i) => b.r > (raw[bi]?.r || 0) ? i : bi, 0);
  const today = legacy.todayStr();
  const bars = raw.map((b, i) => ({
    cls: b.r <= 0 ? 'off' : (i === bestIdx ? 'best' : ''),
    today: b.date === today,
    h: b.r <= 0 ? 4 : Math.max(6, Math.round(b.r / max * 44)),
    title: `${b.date}: ${fmt(b.r)} ₽/ч`,
  }));

  return {
    empty: false, cur, delta, sub, bars,
    rate: fmt(cur.rate),
    earned: fmt(cur.earned) + ' ₽',
    expenses: (cur.expenses ? '−' + fmt(cur.expenses) : '0') + ' ₽',
    net: fmt(cur.net) + ' ₽',
    units: String(cur.units),
    uph: cur.uph.toFixed(1),
    perUnit: cur.perUnit ? fmt(cur.perUnit) + ' ₽' : '—',
    firstLbl: dLbl(raw[0].date), lastLbl: dLbl(raw[raw.length - 1].date),
  };
}

// ---------- 📈 АНАЛИТИКА ----------
export const METRICS = {
  rate:   { lbl: '₽/ч',    unit: '₽/ч', pick: a => a.rate,   fmtv: v => fmt(v) },
  earned: { lbl: 'Доход',  unit: '₽',   pick: a => a.earned, fmtv: v => fmt(v) },
  hours:  { lbl: 'Часы',   unit: 'ч',   pick: a => a.hours,  fmtv: v => (Math.round(v * 10) / 10).toString() },
  units:  { lbl: 'Заказы', unit: '',    pick: a => a.units,  fmtv: v => fmt(v) },
};
const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const dowIdx = date => (new Date(date + 'T12:00:00').getDay() + 6) % 7;
const goalRate = () => legacy.streakGoal() || 0;

function lineChart(pts, M, isRate) {
  // pts: [{date, v, has}] в хронологическом порядке
  const W = 320, H = 150, L = 34, R = 8, T = 14, B = 22;
  const iw = W - L - R, ih = H - T - B;
  const vals = pts.filter(p => p.has).map(p => p.v);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const goal = isRate ? goalRate() : 0;
  let max = Math.max(...vals, goal || 0, 1); max *= 1.12;
  const x = i => L + (pts.length === 1 ? iw / 2 : i / (pts.length - 1) * iw);
  const y = v => T + ih - (v / max) * ih;
  // Линия только через дни с данными, пропуски соединяем (визуально — тренд).
  const withData = pts.map((p, i) => ({ ...p, i })).filter(p => p.has);
  const path = withData.map((p, k) => (k ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
  const area = withData.length > 1
    ? path + ` L${x(withData[withData.length - 1].i).toFixed(1)} ${(T + ih).toFixed(1)} L${x(withData[0].i).toFixed(1)} ${(T + ih).toFixed(1)} Z` : '';
  const bestV = Math.max(...vals);
  const today = legacy.todayStr();
  const r = pts.length > 31 ? 2 : 3.2;
  const dots = withData.map(p => ({
    cls: p.date === today ? 'today' : (p.v === bestV ? 'best' : ''),
    cx: x(p.i).toFixed(1), cy: y(p.v).toFixed(1), r,
    title: `${p.date}: ${M.fmtv(p.v)} ${M.unit}`,
  }));
  // Сетка: горизонтальные линии с подписями
  const grid = [0.25, 0.5, 0.75, 1].map(f => { const v = max * f / 1.12, yy = y(v); return { y: yy.toFixed(1), ty: (yy + 3).toFixed(1), txt: M.fmtv(v) }; });
  // Подписи X: первая, середина, последняя
  const xi = pts.length <= 7 ? pts.map((_, i) => i) : [0, Math.floor(pts.length / 2), pts.length - 1];
  const xl = xi.map(i => ({ x: x(i).toFixed(1), txt: dLbl(pts[i].date) }));
  return {
    W, H, L, R, xr: W - R, yb: H - 6, path, area, dots, grid, xl,
    avgY: y(avg).toFixed(1),
    goalY: goal ? y(goal).toFixed(1) : null,
    legendAvg: 'среднее ' + M.fmtv(avg),
    legendGoal: goal ? 'цель ' + fmt(goal) : null,
    lbl: M.lbl,
  };
}

function dowSection(dates) {
  const acc = DOW.map(() => ({ e: 0, h: 0, n: 0 }));
  const set = new Set(dates);
  legacy.shifts().forEach(s => { if (!set.has(s.date)) return; const a = acc[dowIdx(s.date)]; a.e += s.earned || 0; a.h += s.hours || 0; a.n++; });
  const rows = acc.map((a, i) => ({ i, rate: a.h > 0 ? a.e / a.h : 0, n: a.n, e: a.e }));
  const has = rows.filter(r => r.n > 0);
  if (has.length < 2) return null;
  const max = Math.max(...rows.map(r => r.rate), 1);
  const best = has.reduce((b, r) => r.rate > b.rate ? r : b, has[0]);
  const worst = has.reduce((b, r) => r.rate < b.rate ? r : b, has[0]);
  return {
    best: DOW[best.i],
    rows: rows.map(r => ({
      cls: r.i === best.i ? 'best' : r.i === worst.i && has.length > 2 ? 'worst' : '',
      lbl: DOW[r.i], w: Math.round(r.rate / max * 100) + '%',
      n: r.n, rate: fmt(r.rate),
    })),
  };
}

function startHourSection(dates) {
  const meta = legacy.shiftMeta();
  const set = new Set(dates);
  const buckets = [[5, 9, 'до 9'], [9, 12, '9–12'], [12, 15, '12–15'], [15, 18, '15–18'], [18, 24, 'после 18']];
  const acc = buckets.map(() => ({ e: 0, h: 0, n: 0 }));
  let known = 0;
  legacy.shifts().forEach(s => {
    if (!set.has(s.date)) return;
    const m = meta[legacy.shiftMetaKey(s)]; if (!m || !m.startTime) return;
    const hr = new Date(m.startTime).getHours();
    const bi = buckets.findIndex(b => hr >= b[0] && hr < b[1]); if (bi < 0) return;
    acc[bi].e += s.earned || 0; acc[bi].h += s.hours || 0; acc[bi].n++; known++;
  });
  if (known < 2) return null;
  const rows = acc.map((a, i) => ({ i, rate: a.h > 0 ? a.e / a.h : 0, n: a.n }));
  const max = Math.max(...rows.map(r => r.rate), 1);
  const has = rows.filter(r => r.n);
  const best = has.reduce((b, r) => r.rate > b.rate ? r : b, has[0]);
  return {
    best: buckets[best.i][2],
    cols: rows.map(r => ({
      hi: r.i === best.i,
      small: r.n ? fmt(r.rate) : '',
      h: (r.n ? Math.max(4, Math.round(r.rate / max * 40)) : 2) + 'px',
      lbl: buckets[r.i][2],
    })),
  };
}

function forecastSection() {
  const goal = legacy.monthGoal();
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const dim = new Date(y, m + 1, 0).getDate();
  const dayN = now.getDate();
  const pref = `${y}-${String(m + 1).padStart(2, '0')}-`;
  const month = legacy.shifts().filter(s => s.date.startsWith(pref));
  const earned = month.reduce((a, s) => a + (s.earned || 0), 0);
  const hours = month.reduce((a, s) => a + (s.hours || 0), 0);
  if (!month.length) return null;
  const perDay = earned / dayN;
  const proj = Math.round(perDay * dim);
  const left = dim - dayN;
  const out = {
    left,
    proj: fmt(proj) + ' ₽',
    line2: `${fmt(earned)} ₽ за ${dayN} дн · ${fmt(perDay)} ₽/день · ${month.length} ${plural(month.length, 'смена', 'смены', 'смен')}`,
    kind: 'nogoal',      // 'done' | 'need' | 'nogoal'
    pct: 0, hasGoal: goal > 0,
  };
  if (goal > 0) {
    out.pct = Math.min(100, Math.round(earned / goal * 100));
    const need = goal - earned;
    if (need <= 0) { out.kind = 'done'; out.doneTxt = `Цель ${fmt(goal)} ₽ выполнена ✓`; }
    else {
      const rate = hours > 0 ? earned / hours : 0;
      const needH = rate > 0 ? Math.round(need / rate) : 0;
      out.kind = 'need';
      out.needCls = proj >= goal ? 'g' : 'r';
      out.need = fmt(need) + ' ₽';
      out.needTail = ` · ${left ? fmt(need / left) + ' ₽/день' : ''}${needH ? ` · ≈${needH} ч` : ''}`;
    }
  }
  const C = 2 * Math.PI * 27;
  out.dash = out.pct > 0 ? `${(C * out.pct / 100).toFixed(1)} ${C.toFixed(1)}` : null;
  out.pctTxt = goal ? out.pct + '%' : '—';
  return out;
}

function recordsSection(dates) {
  const set = new Set(dates);
  const meta = legacy.shiftMeta();
  const list = legacy.shifts().filter(s => set.has(s.date) && s.hours > 0);
  if (!list.length) return null;
  const byRate = [...list].sort((a, b) => b.earned / b.hours - a.earned / a.hours)[0];
  const byEarn = [...list].sort((a, b) => b.earned - a.earned)[0];
  const byHours = [...list].sort((a, b) => b.hours - a.hours)[0];
  const byUnits = [...list].map(s => ({ s, u: (meta[legacy.shiftMetaKey(s)] || {}).units || 0 })).sort((a, b) => b.u - a.u)[0];
  // Стабильность: коэффициент вариации ₽/ч
  const rates = list.map(s => s.earned / s.hours);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const sd = Math.sqrt(rates.reduce((a, r) => a + (r - mean) ** 2, 0) / rates.length);
  const cv = mean ? sd / mean : 0;
  const stab = rates.length < 3 ? '—' : cv < .12 ? 'стабильно' : cv < .25 ? 'умеренно' : 'разброс';
  // Доля смен выше цели
  const goal = goalRate();
  const aboveGoal = goal ? Math.round(rates.filter(r => r >= goal).length / rates.length * 100) : 0;
  const d = s => dLbl(s.date);
  const cells = [
    { ico: '🚀', val: fmt(byRate.earned / byRate.hours) + ' ₽/ч', lbl: 'рекорд ₽/ч · ' + d(byRate) },
    { ico: '💰', val: fmt(byEarn.earned) + ' ₽', lbl: 'рекорд дохода · ' + d(byEarn) },
    { ico: '⏱', val: byHours.hours + ' ч', lbl: 'самая длинная · ' + d(byHours) },
    byUnits.u ? { ico: '📦', val: String(byUnits.u), lbl: 'рекорд заказов · ' + d(byUnits.s) } : { ico: '📊', val: stab, lbl: 'стабильность ₽/ч' },
  ];
  return {
    count: `${list.length} ${plural(list.length, 'смена', 'смены', 'смен')}`,
    cells,
    sdCls: cv < .12 ? 'g' : cv < .25 ? 'p' : 'o',
    sdTxt: `σ ${fmt(sd)} ₽/ч · ${stab}`,
    goalChip: goal ? { cls: aboveGoal >= 50 ? 'g' : 'o', txt: `${aboveGoal}% смен ≥ ${fmt(goal)} ₽/ч` } : null,
    median: `медиана ${fmt([...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)])} ₽/ч`,
  };
}

export function waView() {
  eff.waV;                        // зависимость: EFF.render() из легаси
  const M = METRICS[eff.metric] || METRICS.rate;
  const period = eff.period;
  const span = period === 'today' ? 14 : Math.max(14, parseInt(period, 10));
  const dates = Array.from({ length: span }, (_, i) => dstr(span - 1 - i));
  const pts = dates.map(date => { const a = agg([date]); return { date, v: M.pick(a), has: a.n > 0 && (eff.metric === 'units' ? a.units > 0 : true) }; });
  if (!pts.some(p => p.has)) return { empty: true };
  const wide = Array.from({ length: 90 }, (_, i) => dstr(i));
  return {
    empty: false,
    chart: lineChart(pts, M, M === METRICS.rate),
    span,
    forecast: forecastSection(),
    dow: dowSection(wide),
    hours: startHourSection(wide),
    records: recordsSection(wide),
  };
}
