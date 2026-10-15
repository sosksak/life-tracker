// STATS — вкладка «Стата» (#contentStats). Бывшие render() (уровень/серия/достижения/история),
// renderChart/renderMonthGoal/renderDowStats/renderRecords/calcBestStreak из
// src/js/28-render-goal-chart.js и renderWeekCompare/renderHeatmap/renderDiary из
// src/js/30-global-update-v5.js (→ src/js/_archive/28-stats-legacy.js, 30-stats-legacy.js).
//
// Данные (shifts, уровни, цель месяца, транзакции) живут в легаси — здесь только расчёт.
// STATS.render() из легаси render() бросает счётчики версий, компоненты под {#key}
// пересобирают DOM карточки целиком, как раньше innerHTML (так движок иконок и
// MutationObserver-локализатор v7 видят новые узлы). У каждой карточки свой счётчик,
// чтобы скрытую раскладкой V93 карточку не считать вовсе (как раньше через _hid()).
import { legacy } from '../lib/legacy.js';

const g = () => window;
const fmt = n => n.toLocaleString('ru-RU');
function lsGet(k, d) { try { return localStorage.getItem(g().uKey(k)) || d; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(g().uKey(k), v); } catch (e) {} }
const pd = s => { const p = s.split('-'); return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])); };
const fmtD = d => pd(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

let chartMode0 = 7;
export const stats = $state({
  v: 0,        // уровень + серия (всегда вместе с render())
  chartV: 0,
  goalV: 0,
  dowV: 0,
  recV: 0,
  chartMode: chartMode0,   // 7 | 14 | 30 (lt_chart_mode, читается при первом рендере — uKey зависит от профиля)
  chartModeLoaded: false,
  lastStreak: 0,   // легаси при серии 0 только прятал #streakBar, не трогая #streakCount
  // v9.19: «Неделя vs неделя», «Карта активности», «Дневник общения», «Достижения», «История смен»
  wcV: 0,
  heatV: 0,
  heatKey: '',     // бывший _heatmapLastKey: 90 ячеек не пересобираем, пока набор смен тот же
  heatShown: false,
  heatHas: false,  // сетка уже отрисована (ключ сбрасывает invalidateShiftCache, а DOM, как в легаси, остаётся)
  diaryV: 0,
  achV: 0,
  histV: 0,
});

export function loadChartMode() {
  if (stats.chartModeLoaded || !legacy.hasUser()) return;
  let m = parseInt(lsGet('lt_chart_mode', '7'), 10);
  if (![7, 14, 30].includes(m)) m = 7;
  stats.chartMode = m; stats.chartModeLoaded = true;
}
export function setChartMode(days) {
  stats.chartMode = days; stats.chartModeLoaded = true;
  lsSet('lt_chart_mode', String(days));
}
export function getChartMode() { loadChartMode(); return stats.chartMode; }

// ---------- уровень + серия ----------
export function computeLevel() {
  const shifts = legacy.shifts();
  const { totalHours } = legacy.shiftTotals();
  const LEVELS = legacy.levels();
  // до загрузки легаси (монтируем при загрузке бандла) — значения статической разметки
  if (!LEVELS.length) return { icon: '📈', name: 'LVL 1 — Стажёр', title: 'Начало карьеры', fill: '0%', xpText: '0 / 50 000 XP' };
  const xp = legacy.grindXP(shifts.length, totalHours);
  let cur = LEVELS[0], next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { cur = LEVELS[i]; next = LEVELS[i + 1] || null; break; }
  }
  const out = { icon: cur.icon, name: `LVL ${cur.lvl} — ${cur.name}`, title: cur.title };
  if (next) {
    const progress = ((xp - cur.xp) / (next.xp - cur.xp)) * 100;
    out.fill = Math.min(progress, 100) + '%';
    out.xpText = `${fmt(xp)} / ${fmt(next.xp)} XP`;
  } else { out.fill = '100%'; out.xpText = 'МАКСИМАЛЬНЫЙ УРОВЕНЬ'; }
  return out;
}
export function computeStreak() { return legacy.calcStreak(legacy.streakGoal()); }

// ---------- 📈 ДИНАМИКА ----------
export function computeChart(days) {
  const shifts = legacy.shifts();
  const goal = legacy.streakGoal();
  const byDate = {};
  for (const s of shifts) {
    if (!byDate[s.date]) byDate[s.date] = { earned: 0, hours: 0 };
    byDate[s.date].earned += s.earned;
    byDate[s.date].hours += s.hours;
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = legacy.dateStr(d);
    const rec = byDate[key] || { earned: 0, hours: 0 };
    buckets.push({ date: d, key, earned: rec.earned, hours: rec.hours, rate: rec.hours > 0 ? Math.round(rec.earned / rec.hours) : 0, isToday: i === 0 });
  }
  const total = buckets.reduce((s, b) => s + b.earned, 0);
  const workedDays = buckets.filter(b => b.earned > 0).length;
  const avg = workedDays > 0 ? Math.round(total / workedDays) : 0;
  const out = { total: fmt(total) + ' ₽', avg: fmt(avg) + ' ₽', lbl: `за ${days} дн. · смен: ${workedDays}`, empty: total === 0, bars: [], labels: [], dense: days > 7 ? ' dense' : '' };
  if (out.empty) return out;
  const max = Math.max(...buckets.map(b => b.earned));
  const showVals = days <= 7;
  const labelEvery = days <= 7 ? 1 : (days <= 14 ? 2 : 5);
  out.bars = buckets.map(b => {
    const h = max > 0 ? Math.max((b.earned / max) * 100, b.earned > 0 ? 6 : 0) : 0;
    let cls = 'empty';
    if (b.earned > 0) cls = b.rate >= goal ? 'hit' : 'miss';
    return { h: h + '%', cls, val: (showVals && b.earned > 0) ? Math.round(b.earned / 1000) + 'к' : '',
      title: b.earned > 0 ? `${b.key}: ${fmt(b.earned)} ₽ / ${b.hours.toFixed(1)} ч / ${b.rate} ₽ в час` : `${b.key}: выходной` };
  });
  out.labels = buckets.map((b, i) => {
    const show = (i % labelEvery === 0) || b.isToday;
    return { today: b.isToday, txt: show ? (days <= 7 ? b.date.toLocaleDateString('ru-RU', { weekday: 'short' }) : String(b.date.getDate())) : '' };
  });
  return out;
}

// ---------- 📌 ПЛАН МЕСЯЦА ----------
export function pluralShifts(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'смен';
  if (b === 1) return 'смена';
  if (b >= 2 && b <= 4) return 'смены';
  return 'смен';
}
export function computeMonthGoal() {
  const shifts = legacy.shifts();
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter(s => s.date && s.date.startsWith(prefix));
  const earned = monthShifts.reduce((a, s) => a + s.earned, 0);
  const hours = monthShifts.reduce((a, s) => a + s.hours, 0);
  const monthExp = monthShifts.reduce((a, s) => a + (s.expenses || 0), 0);
  const monthUnits = monthShifts.reduce((a, s) => a + (s.units || 0), 0);
  const mn = legacy.monthNet(prefix) || { net: 0, gross: 0, spent: 0, txInc: 0, txExp: 0, adj: 0, byCat: {}, avgNetPerShift: 0 };
  const net = Math.round(mn.net);
  const avgPerShift = monthShifts.length
    ? mn.avgNetPerShift
    : (shifts.length ? (legacy.shiftTotals().totalEarned - shifts.reduce((a, s) => a + (s.expenses || 0), 0)) / shifts.length : 0);
  const plan = legacy.calendarPlan();
  const todayS = legacy.todayStr();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let plannedAhead = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${prefix}-${String(d).padStart(2, '0')}`;
    if (plan[key] === 'planned' && (key > todayS || (key === todayS && !monthShifts.some(s => s.date === todayS)))) plannedAhead++;
  }
  const daysLeftF = daysInMonth - now.getDate();
  const paceShifts = plannedAhead > 0 ? plannedAhead : Math.round((monthShifts.length / Math.max(1, now.getDate())) * daysLeftF);
  const forecast = Math.round(net + paceShifts * avgPerShift);
  const forecastHow = paceShifts > 0
    ? `${fmt(net)} ₽ чистыми + ${paceShifts} ${pluralShifts(paceShifts)} × ~${fmt(Math.round(avgPerShift))} ₽ ${plannedAhead > 0 ? '(по календарю)' : '(по текущему темпу)'}`
    : 'только факт — отметь смены в календаре 📋 ниже, и прогноз их учтёт';
  const goal = legacy.monthGoal();
  const pct = goal ? Math.max(0, Math.min(100, (net / goal) * 100)) : 0;
  const left = goal ? Math.max(0, goal - net) : 0;
  const shiftsLeft = (goal && avgPerShift > 0) ? Math.ceil(left / avgPerShift) : 0;

  // 🔍 что влияет на цель
  const f = v => fmt(Math.round(Math.abs(v)));
  const cats = (g().FINANCE && g().FINANCE.EXPENSE_CATEGORIES) || {};
  const topCats = Object.entries(mn.byCat || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const useAdj = legacy.get('lt_goal_use_adjust', true);
  const rest = mn.txExp - topCats.reduce((a, c) => a + c[1], 0);
  const giRows = [
    { cls: 'plus', lbl: 'Доход со смен', val: '+' + f(earned) },
    mn.txInc ? { cls: 'plus', lbl: 'Прочие доходы (Деньги)', val: '+' + f(mn.txInc) } : null,
    monthExp ? { cls: 'minus', lbl: 'Расходы в сменах (топливо и т.п.)', val: '−' + f(monthExp) } : null,
    ...topCats.map(([k, v]) => ({ cls: 'minus', lbl: `${(cats[k] || {}).icon || '📋'} ${(cats[k] || {}).name || k}`, val: '−' + f(v) })),
    rest > 0 ? { cls: 'minus', lbl: 'Остальные расходы', val: '−' + f(rest) } : null,
    { cls: mn.adj >= 0 ? 'plus' : 'minus', lbl: '⚖️ Корректировка баланса', val: (mn.adj >= 0 ? '+' : '−') + f(mn.adj), adj: true },
  ].filter(Boolean);

  return {
    goal, net: fmt(net), goalFmt: fmt(goal), pct, pctRound: Math.round(pct), left, leftFmt: fmt(left), shiftsLeft,
    forecast: fmt(forecast), forecastHow,
    shiftsRow: `${monthShifts.length} · ${hours.toFixed(1)} ч`,
    gross: fmt(Math.round(mn.gross)), txInc: mn.txInc, grossNote: mn.txInc ? `смены ${fmt(earned)} + прочее ${fmt(Math.round(mn.txInc))}` : '',
    spent: mn.spent, spentFmt: fmt(Math.round(mn.spent)), monthExp, monthExpFmt: fmt(monthExp),
    adj: mn.adj, adjFmt: (mn.adj > 0 ? '+' : '−') + fmt(Math.abs(Math.round(mn.adj))),
    giRows, useAdj, giNet: fmt(net),
    monthUnits, unitsRow: `${monthUnits} · ${hours > 0 ? Math.round(monthUnits / hours * 10) / 10 : 0}/ч`,
    plannedAhead, plannedText: plannedAhead ? plannedAhead + ' ' + pluralShifts(plannedAhead) : '',
  };
}
export function toggleUseAdjust(on) {
  legacy.set('lt_goal_use_adjust', on);
  try { g().markLocalChange(); } catch (e) {}
  try { g().render(); } catch (e) {}
  try { g().renderStats(); } catch (e) {}
}
export function scrollToCalendar() { document.getElementById('calGrid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

// ---------- 📅 ПО ДНЯМ НЕДЕЛИ ----------
export function computeDow() {
  const shifts = legacy.shifts();
  if (!shifts.length) return null;
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const buckets = names.map(() => ({ earned: 0, hours: 0, count: 0 }));
  for (const s of shifts) {
    if (!s.date) continue;
    let dow = pd(s.date).getDay() - 1;
    if (dow < 0) dow = 6;
    buckets[dow].earned += s.earned; buckets[dow].hours += s.hours; buckets[dow].count++;
  }
  const rates = buckets.map(b => b.hours > 0 ? Math.round(b.earned / b.hours) : 0);
  const maxRate = Math.max(...rates, 1);
  const bestRate = Math.max(...rates);
  return names.map((n, i) => {
    const b = buckets[i], r = rates[i];
    return { n, pct: (r / maxRate) * 100 + '%', cls: r > 0 && r === bestRate ? 'is-top' : (r === 0 ? 'is-zero' : ''), val: r ? fmt(r) + ' ₽/ч' : '—', cnt: b.count || '' };
  });
}

// ---------- 🏅 ЛУЧШИЕ ПОКАЗАТЕЛИ ----------
export function calcBestStreak(goal) {
  const shifts = legacy.shifts();
  const dateMap = {};
  for (const s of shifts) if (!dateMap[s.date] || s.rate > dateMap[s.date]) dateMap[s.date] = s.rate;
  const dates = Object.keys(dateMap).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of dates) {
    const dt = pd(d);
    const consecutive = prev && Math.round((dt - prev) / 86400000) === 1;
    if (dateMap[d] >= goal) { cur = consecutive ? cur + 1 : 1; if (cur > best) best = cur; } else cur = 0;
    prev = dt;
  }
  return best;
}
export function computeRecords() {
  const shifts = legacy.shifts();
  if (!shifts.length) return null;
  const bestEarn = shifts.reduce((a, s) => s.earned > a.earned ? s : a, shifts[0]);
  const bestRate = shifts.reduce((a, s) => s.rate > a.rate ? s : a, shifts[0]);
  const longest = shifts.reduce((a, s) => s.hours > a.hours ? s : a, shifts[0]);
  const bestStreak = calcBestStreak(legacy.streakGoal());
  const withUnits = shifts.filter(s => s.units > 0);
  const bestUnits = withUnits.length ? withUnits.reduce((a, s) => s.units > a.units ? s : a, withUnits[0]) : null;
  const totalExp = shifts.reduce((a, s) => a + (s.expenses || 0), 0);
  return {
    bestEarn: `${fmt(bestEarn.earned)} ₽`, bestEarnD: fmtD(bestEarn.date),
    bestRate: `${fmt(bestRate.rate)} ₽/ч`, bestRateD: fmtD(bestRate.date),
    longest: `${longest.hours} ч`, longestD: fmtD(longest.date),
    streak: `${bestStreak} ${bestStreak === 1 ? 'день' : 'дней'}`,
    bestUnits: bestUnits ? { v: String(bestUnits.units), d: fmtD(bestUnits.date) } : null,
    totalExp: totalExp ? { v: `${fmt(totalExp)} ₽`, net: `чистыми ${fmt(legacy.shiftTotals().totalEarned - totalExp)} ₽` } : null,
  };
}

// ---------- 📊 ТЕКУЩАЯ НЕДЕЛЯ vs ПРЕДЫДУЩАЯ (бывший renderWeekCompare, 30-global-update-v5.js) ----------
let _wcLast = null; // легаси при < 2 смен только прятал блок, не очищая сетку — отдаём прошлые строки
export function wcLastRows() { return _wcLast; }
export function computeWeekCompare() {
  const shifts = legacy.shifts();
  if (shifts.length < 2) return null;
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);
  function weekData(from, to) {
    const ws = shifts.filter(s => { const d = pd(s.date); return d >= from && d < to; });
    const hours = ws.reduce((s, x) => s + x.hours, 0), earned = ws.reduce((s, x) => s + x.earned, 0);
    return { shifts: ws.length, earned, hours: Math.round(hours * 10) / 10, rate: hours > 0 ? Math.round(earned / hours) : 0 };
  }
  const curr = weekData(monday, new Date(monday.getTime() + 7 * 86400000));
  const prev = weekData(prevMonday, monday);
  const delta = (c, p, suffix = '') => {
    const diff = c - p;
    if (diff === 0) return { cls: 'same', txt: '—' };
    return { cls: diff > 0 ? 'up' : 'down', txt: (diff > 0 ? '+' : '') + (diff % 1 !== 0 ? diff.toFixed(1) : diff) + suffix };
  };
  _wcLast = [
    { lbl: 'Смен', val: String(curr.shifts), prev: String(prev.shifts), d: delta(curr.shifts, prev.shifts) },
    { lbl: 'Заработок', val: fmt(curr.earned) + ' ₽', prev: fmt(prev.earned), d: delta(curr.earned, prev.earned) },
    { lbl: 'Часов', val: String(curr.hours), prev: String(prev.hours), d: delta(curr.hours, prev.hours) },
    { lbl: 'Rate', val: curr.rate + ' ₽/ч', prev: String(prev.rate), d: delta(curr.rate, prev.rate) },
  ];
  return _wcLast;
}

// ---------- 📊 КАРТА АКТИВНОСТИ (бывший renderHeatmap) ----------
export function heatmapKey() { const s = legacy.shifts(); return s.length + ':' + (s[0]?.id || '') + ':' + (s[s.length - 1]?.id || ''); }
export function computeHeatmap() {
  const shifts = legacy.shifts();
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const start = new Date(now); start.setDate(start.getDate() - 89);
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
  const earnMap = {};
  shifts.forEach(s => { earnMap[s.date] = (earnMap[s.date] || 0) + s.earned; });
  const maxEarn = Math.max(...Object.values(earnMap), 1);
  const cells = [];
  const cur = new Date(start);
  while (cur <= now) {
    const key = legacy.dateStr(cur);
    const earned = earnMap[key] || 0;
    const intensity = earned > 0 ? 0.2 + (earned / maxEarn) * 0.8 : 0;
    cells.push({ color: earned > 0 ? `rgba(56, 161, 105, ${intensity})` : '#F0F2F5', title: earned > 0 ? `${key}: ${fmt(earned)} ₽` : key });
    cur.setDate(cur.getDate() + 1);
  }
  return { days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], cells };
}

// ---------- 📓 ДНЕВНИК ОБЩЕНИЯ (бывший renderDiary; getDiary/saveDiary/модалка остались в легаси) ----------
export function computeDiary() {
  const diary = legacy.get('social_diary', []) || [];
  const total = diary.length;
  const thisWeek = diary.filter(d => {
    const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
    return d.ts >= mon.getTime();
  }).length;
  const avgRating = total > 0 ? (diary.reduce((s, d) => s + d.rating, 0) / total).toFixed(1) : '—';
  const list = diary.slice(0, 10).map(d => ({
    place: d.place || '—', date: fmtD(d.date), desc: d.desc || '', lesson: d.lesson || '',
    stars: Math.max(0, Math.min(5, Math.round(d.rating || 0))),
  }));
  return { total: String(total), thisWeek: String(thisWeek), avgRating, list };
}

// ---------- 🏅 ДОСТИЖЕНИЯ + 📋 ИСТОРИЯ СМЕН (бывший хвост render(), 28-render-goal-chart.js) ----------
export function computeAchievements() {
  const shifts = legacy.shifts();
  const list = legacy.achievements();
  if (!list.length) return [];
  const achData = { shifts, totalEarned: legacy.shiftTotals().totalEarned, streak: computeStreak() };
  return list.map(a => ({ icon: a.icon, name: a.name, unlocked: !!a.check(achData) }));
}
export function computeHistory() {
  const shifts = legacy.shifts();
  const goal = legacy.streakGoal();
  return shifts.map(s => {
    const hit = s.rate >= goal, close = s.rate >= goal * 0.9;
    const extraParts = [];
    if (s.expenses > 0) extraParts.push(`💸 −${fmt(s.expenses)} ₽ · чистыми ${fmt(s.net)} ₽`);
    if (s.units > 0) extraParts.push(`📦 ${s.units} · ${(s.hours > 0 ? Math.round(s.units / s.hours * 10) / 10 : 0)}/ч`);
    return {
      cls: hit ? 'goal-hit' : (close ? 'goal-close' : 'goal-miss'),
      rateCls: hit ? 'good' : (close ? 'ok' : 'bad'),
      icon: hit ? '✅' : (close ? '🔸' : '❌'),
      date: fmtD(s.date), hours: s.hours, earned: fmt(s.earned), rate: s.rate,
      note: s.displayNote || '',
      // id в JSON: у локальных (ещё не синхронизированных) смен он строковый — в onclick нужны кавычки
      edit: `openEditModal(${JSON.stringify(s.id)})`, del: `removeShift(${JSON.stringify(s.id)})`,
      pending: !!s._pending,
      brk: s.breakMs > 0 ? { title: s.breakSummary || '', txt: `☕ ${s.breakCount} · ${legacy.fmtShort(s.breakMs)} · на складе ${legacy.fmtShort(s.totalMs)}` } : null,
      extra: extraParts.join(' · '),
    };
  });
}
