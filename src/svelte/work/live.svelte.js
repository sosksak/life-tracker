// LIVE — живые метрики активной смены: блок «~N ₽ / прогноз» (#liveRateDisplay,
// бывший updateLiveRate) и сетка «🏁 ИТОГИ СМЕНЫ» (#summaryGrid, бывший showDailySummary)
// из src/js/30-global-update-v5.js (→ _archive/30-live-legacy.js).
//
// updateLiveRate тикает каждую секунду вместе с таймером. Чтобы DOM-мутаций во время
// смены не стало больше, стор хранит готовые строки: Svelte трогает текстовый узел
// только когда строка реально поменялась (легаси писал textContent каждую секунду —
// браузер на одинаковое значение мутацию не шлёт, так что паритет; а подпись с эмодзи
// раньше переписывалась innerHTML каждую секунду на перерыве — теперь только при смене текста).
import { legacy } from '../lib/legacy.js';

export const live = $state({
  show: false,          // смена активна → блок виден (бывший style.display = 'block')
  amount: '~0 ₽/час',   // #liveRateAmount
  cls: 'earning',       // earning | break-loss
  label: 'текущая производительность', // #liveRateLabel (текст; на перерыве — префикс)
  loss: '',             // на перерыве: «~N ₽/мин» в <span class="loss">
  summary: { items: [], streak: '' }, // сетка итогов смены
});

function recentRate(shifts) {
  return shifts.length > 0 ? shifts.slice(0, 5).reduce((s, x) => s + x.rate, 0) / Math.min(shifts.length, 5) : 850;
}

// Бывший updateLiveRate(): считаем прогноз и записываем в стор.
export function updateLiveRate() {
  const a = legacy.activeShift();
  if (!a) { live.show = false; return; }
  live.show = true;
  const now = Date.now();
  const totalMs = now - a.startTime;
  const breakMs = a.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (a.currentBreak ? (now - a.currentBreak.start) : 0);
  const workH = (totalMs - breakMs) / 3600000;
  if (workH > 0.01) {
    const rate = recentRate(legacy.shifts());
    const estimatedEarned = Math.round(rate * workH);
    const currentRate = Math.round(rate);
    live.amount = `~${estimatedEarned.toLocaleString('ru-RU')} ₽`;
    if (a.status === 'break') {
      live.cls = 'break-loss';
      const lossPerMin = Math.round(rate / 60);
      live.label = '☕ перерыв · потери ';
      live.loss = `~${lossPerMin} ₽/мин`;
    } else {
      live.cls = 'earning';
      live.label = `⚡ прогноз по ~${currentRate} ₽/час`;
      live.loss = '';
    }
  }
}

// Бывший showDailySummary(): данные сетки итогов.
export function computeSummary(earned, workHours, rate) {
  const shifts = legacy.shifts();
  const streak = legacy.calcStreak(legacy.streakGoal());
  const s0 = shifts[0];
  const items = [
    { val: `💰 ${earned.toLocaleString('ru-RU')}`, lbl: 'заработок ₽' },
    { val: `⏱ ${workHours} ч`, lbl: 'работа' },
    { val: `🚀 ${rate}`, lbl: '₽/час' },
    { val: `📋 ${shifts.length}`, lbl: 'смен всего' },
  ];
  if (s0 && s0.expenses > 0) items.push({ val: `💸 ${s0.net.toLocaleString('ru-RU')}`, lbl: `чистыми (−${s0.expenses.toLocaleString('ru-RU')} ₽)` });
  if (s0 && s0.units > 0) items.push({ val: `📦 ${s0.units}`, lbl: `заказов · ${workHours > 0 ? Math.round(s0.units / workHours * 10) / 10 : 0}/ч` });
  return { items, streak: streak > 0 ? `🔥 ${streak} дней подряд в цели!` : '' };
}
