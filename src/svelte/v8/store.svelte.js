// V8 — рендер блока «🎯 ЦЕЛИ» (#v8Goals на Главной), ассистента смены (#v8Assist в панели смены
// + чип темпа #v8HeadRate в шапке) и «📑 Отчёт за месяц» (#v8Reports в «Стате»).
// Бывшие goalsHtml/renderGoals/assistHtml/renderAssist/headRate/reportsHtml/renderReports
// из src/js/60-v8.js (→ _archive/60-v8-legacy.js). Данные (цели, liveEst, агрегаты, налог,
// экспорт, хуки boot) остались в легаси V8 — стор ходит к ним через window.V8.
//
// Ассистент тикает каждые 5 с вместе с таймером смены. Чтобы DOM-мутаций во время смены
// не стало больше (легаси переписывал innerHTML всего блока и чипа), стор хранит готовые
// строки: Svelte трогает узел только когда строка реально поменялась.
import { legacy } from '../lib/legacy.js';

const V8 = () => window.V8;
export const fmt = n => Math.round(n || 0).toLocaleString('ru-RU');
export const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 10 || h >= 20)) ? b : c; };
const hm = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const v8 = $state({
  goals: { empty: true, rows: [] },   // блок целей: пустое состояние или строки (html, как legacy row())
  assist: null,                        // { rate, chips:[{cls,text}], rows:[html] } | null — нет смены
  head: null,                          // { text, brk } | null — чип в шапке
  rep: null,                           // отчёт за месяц (computeReports)
  repMonth: null,                      // бывший _repMonth
});

// Инфо-блок модалки завершения смены (#endShiftInfo): { hours, total, breaks } | null
export const esi = $state({ info: null });
export function setEndShiftInfo(p) {
  if (!p) { esi.info = null; return; }
  esi.info = { hours: p.hours, total: legacy.fmtShort(p.totalMs), breaks: p.breakMs > 0 ? `☕ Перерывов: ${p.breakCount} (${legacy.fmtShort(p.breakMs)})` : '☕ Без перерывов' };
}

// ---------- ЦЕЛИ ----------
export function computeGoals() {
  const X = V8(); if (!X) return { empty: true, rows: [] };
  const g = X.getGoals();
  const today = X.agg([legacy.todayStr()]), week = X.agg(X.weekDates());
  const est = X.liveEst();
  const liveE = est ? est.earned : 0, liveH = est ? est.hours : 0;
  if (!g.day && !g.week && !g.rate) return { empty: true, rows: [] };
  const rows = [];
  const row = (ico, lbl, val, pct, sub, ok) => `<div class="v8-goal ${ok ? 'ok' : ''}"><span class="i">${ico}</span><span class="l">${lbl}</span><span class="v">${val}</span><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div><span class="s">${sub}</span></div>`;
  const rateNow = (today.hours + liveH) > 0 ? (today.earned + liveE) / (today.hours + liveH) : 0;
  const need = (goal, have) => {
    const left = goal - have; if (left <= 0) return 'цель закрыта ✓';
    const r = rateNow || X.recentRate(); const h = r > 0 ? left / r : 0;
    return `осталось ${fmt(left)} ₽${h > 0 ? ' ≈ ' + (h < 1 ? Math.round(h * 60) + ' мин' : h.toFixed(1) + ' ч') : ''}${est ? ' (с учётом текущей смены)' : ''}`;
  };
  if (g.day) { const have = today.earned + liveE; rows.push(row('📅', 'Сегодня', `${fmt(have)} <small>/ ${fmt(g.day)} ₽</small>`, have / g.day * 100, need(g.day, have), have >= g.day)); }
  if (g.week) { const have = week.earned + liveE; const left = 7 - X.weekDates().length; rows.push(row('🗓', 'Неделя', `${fmt(have)} <small>/ ${fmt(g.week)} ₽</small>`, have / g.week * 100, have >= g.week ? 'цель закрыта ✓' : `осталось ${fmt(g.week - have)} ₽ · ${left ? 'ещё ' + left + ' ' + plural(left, 'день', 'дня', 'дней') + ' · ' + fmt((g.week - have) / left) + ' ₽/день' : 'последний день недели'}`, have >= g.week)); }
  const tr = X.targetRate();
  if (tr) { const have = rateNow; rows.push(row('⚡', '₽/ч сегодня', have ? `${fmt(have)} <small>/ ${fmt(tr)}</small>` : `— <small>/ ${fmt(tr)}</small>`, have / tr * 100, have ? (have >= tr ? `выше цели на ${fmt(have - tr)} ₽/ч` : `до цели ${fmt(tr - have)} ₽/ч`) : 'начните смену — покажу темп', have >= tr && have > 0)); }
  return { empty: false, rows };
}

// ---------- АССИСТЕНТ СМЕНЫ ----------
export function computeAssist() {
  const X = V8(); const a = legacy.activeShift();
  const est = X && a ? X.liveEst() : null; if (!est) return null;
  const g = X.getGoals(), tr = X.targetRate();
  const today = X.agg([legacy.todayStr()]);
  const shifts = legacy.shifts();
  const chips = [];
  if (est.src === 'units') chips.push({ cls: '', text: `по заказам · ${fmt(est.pu)} ₽/зак` }); else chips.push({ cls: '', text: 'по среднему за 5 смен' });
  if (tr) chips.push({ cls: est.rate >= tr ? 'g' : 'o', text: `${est.rate >= tr ? '↑ выше цели' : '↓ ниже цели'} ${fmt(tr)}` });
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
  const lastBreakEnd = (a.breaks || []).reduce((m, b) => Math.max(m, b.end || 0), a.startTime);
  const sinceBreak = (Date.now() - lastBreakEnd) / 3600000;
  if (!est.onBreak && sinceBreak >= 3) rows.push(`<div class="v8-assist-row"><span class="k">☕</span><span>Без перерыва уже <b>${sinceBreak.toFixed(1)} ч</b> — 10 минут отдыха обычно поднимают темп</span></div>`);
  if (est.onBreak) rows.push(`<div class="v8-assist-row"><span class="k">⏸</span><span>Перерыв: минута стоит <b>~${fmt(est.rate / 60)} ₽</b></span></div>`);
  const avgLen = shifts.length ? shifts.slice(0, 10).reduce((s, x) => s + x.hours, 0) / Math.min(10, shifts.length) : 0;
  if (avgLen && est.hours > avgLen * 1.3) rows.push(`<div class="v8-assist-row"><span class="k">⏱</span><span>Смена уже длиннее обычной (${avgLen.toFixed(1)} ч) на ${Math.round((est.hours / avgLen - 1) * 100)}% — следите за темпом</span></div>`);
  return { rate: `~${fmt(est.rate)}`, rateRaw: est.rate, chips, rows, head: { text: `~${fmt(est.rate)} ₽/ч · ${est.hours.toFixed(1)} ч`, brk: !!est.onBreak } };
}

// ---------- ОТЧЁТЫ ----------
export function curMonth() {
  const X = V8(); const keys = X.monthKeys();
  if (!v8.repMonth || !keys.includes(v8.repMonth)) v8.repMonth = keys[0];
  return v8.repMonth;
}
export function computeReports() {
  const X = V8(); if (!X) return null;
  const TAX = X.TAX, keys = X.monthKeys();
  const k = curMonth(), cur = X.monthAgg(k), prev = X.monthAgg(X.prevKey(k));
  const regime = X.taxRegime(), tr = TAX[regime].r, tax = cur.earned * tr, after = cur.net - tax;
  const delta = (a, b, inv) => { if (!b) return null; const d = (a - b) / b * 100; const cls = Math.abs(d) < 3 ? 'flat' : ((d > 0) !== !!inv ? 'up' : 'down'); return { cls, text: `${d > 0 ? '+' : ''}${Math.round(d)}% к пред.` }; };
  const cell = (v, l, d) => ({ v, l, d });
  const months = keys.map(x => ({ k: x, label: X.monthLabel(x), sel: x === k }));
  const kpi = cur.n ? [
    cell(fmt(cur.earned) + ' ₽', 'доход', delta(cur.earned, prev.earned)),
    cell(fmt(cur.rate) + ' ₽/ч', 'средний темп', delta(cur.rate, prev.rate)),
    cell(cur.hours.toFixed(1) + ' ч', 'часов', delta(cur.hours, prev.hours)),
    cell(String(cur.n), plural(cur.n, 'смена', 'смены', 'смен') + ' · ' + cur.days + ' дн', delta(cur.n, prev.n)),
    cell((cur.expenses ? '−' : '') + fmt(cur.expenses) + ' ₽', 'расходы', delta(cur.expenses, prev.expenses, true)),
    cell(fmt(cur.net) + ' ₽', 'чистыми', delta(cur.net, prev.net)),
  ] : null;
  const taxOpts = Object.entries(TAX).map(([v, t]) => ({ v, l: t.l, sel: v === regime }));
  // 6 месяцев: доход / расходы / налог
  const six = []; let kk = k; for (let i = 0; i < 6; i++) { six.unshift(kk); kk = X.prevKey(kk); }
  const rows = six.map(x => ({ k: x, a: X.monthAgg(x) }));
  const max = Math.max(1, ...rows.map(r => r.a.earned));
  const bars = rows.map(r => { const e = r.a.earned, x = Math.min(e, r.a.expenses), t = e * tr; const H = 72; const he = Math.round((e - x - t) / max * H), hx = Math.round(x / max * H), ht = Math.round(t / max * H); const [, m] = r.k.split('-'); return { k: r.k, cur: r.k === k, title: `${X.monthLabel(r.k)}: ${fmt(e)} ₽`, small: e ? `${fmt(e / 1000)}к` : '', ht, hx, he: Math.max(e ? 2 : 0, he), mon: MON[+m - 1] }; });
  return { months, hasShifts: !!cur.n, kpi, taxOpts, tr, taxText: tr ? `к уплате <b style="font-size:12px">${fmt(tax)} ₽</b>` : 'налог не считается', after: fmt(after) + ' ₽', bars };
}
