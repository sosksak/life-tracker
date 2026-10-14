// WORK — данные вкладки «Работа»: кошелёк и панель активной смены.
// Состояние (shifts, activeShift, транзакции, магазин) по-прежнему живёт в легаси,
// поэтому стор здесь — счётчик `version`: WORK.renderWallet()/renderShift() его
// увеличивают, реактивные выражения в компонентах пересчитываются.
//
// Почему не {#key} (как на «Главной»): внутрь .active-shift свои блоки вставляют
// v8-ассистент (#v8Assist после #liveRateDisplay) и 31-eff (#btnFocus в .shift-controls),
// а таймер (#timerDisplay/#timerSub) обновляет легаси updateTimer каждую секунду.
// Полная пересборка их бы снесла, поэтому DOM статичен, меняются только
// атрибуты и текст — ровно то, что раньше делал renderActiveShift().
import { legacy } from '../lib/legacy.js';

export const work = $state({
  version: 0,      // кошелёк + панель: любое изменение данных
  breakPicker: false, // показан выбор типа перерыва (бывший #breakTypeSelector)
});

export function bump() { work.version++; }

// ---------- КОШЕЛЁК ----------
export function walletView() {
  work.version;              // зависимость: bump() из WORK.render() пересчитывает всё ниже
  const w = legacy.walletBalance();
  const { totalHours, avgRate } = legacy.shiftTotals();
  const shifts = legacy.shifts();

  // Подпись под балансом: доход · расходы · корректировка
  const exp = w.shiftExp + w.txExp;
  const parts = [`доход <b>${Math.round(w.totalEarned + w.txInc).toLocaleString('ru-RU')}</b>`];
  if (exp) parts.push(`расходы <b>−${Math.round(exp).toLocaleString('ru-RU')}</b>`);
  if (w.adj) parts.push(`корр. <b>${w.adj > 0 ? '+' : '−'}${Math.abs(Math.round(w.adj)).toLocaleString('ru-RU')}</b>`);

  // Уровень: очки за смены и часы (calcGrindXP), а не за рубли
  const level = levelFor(legacy.grindXP(shifts.length, totalHours));

  // Тренд: последняя смена против предыдущей
  let trend = null;
  if (shifts.length >= 2) {
    const diff = Math.round((shifts[0].rate || 0) - (shifts[1].rate || 0));
    trend = {
      cls: diff > 5 ? 'up' : (diff < -5 ? 'down' : 'neutral'),
      symbol: diff > 5 ? '↑' : (diff < -5 ? '↓' : '→'),
      abs: Math.abs(diff),
    };
  }

  return {
    balance: w.balance,
    subHtml: parts.join(' · '),
    shiftCount: shifts.length,
    totalHours, avgRate,
    level, trend,
    golden: legacy.shopOwned('golden_border'),
  };
}

function levelFor(xp) {
  const L = legacy.levels();
  let cur = L[0] || { lvl: 1, icon: '📈' };
  for (let i = L.length - 1; i >= 0; i--) {
    if (xp >= L[i].xp) { cur = L[i]; break; }
  }
  return cur;
}

// ---------- АКТИВНАЯ СМЕНА ----------
export function shiftView() {
  work.version;              // зависимость: см. walletView()
  const a = legacy.activeShift();
  if (!a) return { active: false, onBreak: false, units: 0, unitWord: legacy.unitWord(), uph: 0, breaks: [], breakTotalText: '' };

  const onBreak = a.status === 'break';
  const now = Date.now();
  const breaks = Array.isArray(a.breaks) ? a.breaks : [];
  const breakMs = breaks.reduce((s, b) => s + ((b.end || now) - b.start), 0)
    + (a.currentBreak ? (now - a.currentBreak.start) : 0);
  const workH = Math.max(0.1, (now - a.startTime - breakMs) / 3600000);
  const units = a.units || 0;

  return {
    active: true,
    onBreak,
    units,
    unitWord: legacy.unitWord(),
    uph: units ? Math.round(units / workH * 10) / 10 : 0,
    breaks: breaks.map(b => ({
      type: b.type || '',
      dur: legacy.fmtShort((b.end || now) - b.start),
    })),
    breakTotalText: legacy.fmtShort(breaks.reduce((s, b) => s + ((b.end || now) - b.start), 0)),
  };
}
