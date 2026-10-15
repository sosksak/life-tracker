// CARDS — четыре карточки вкладки «Работа»: «📈 ПЛАН ДОХОДА» (#millionPath),
// «Копилка» (#kopilkaCard), «Задача недели» (#weeklyChallenge), «Рекомендация» (#insightCard).
// Бывшие renderMillionPath / renderKopilka / renderWeeklyChallenge / renderInsight
// из src/js/30-global-update-v5.js (→ _archive/30-cards-legacy.js).
//
// Данные (shifts, кошелёк, серия) живут в легаси, поэтому расчёт — обычные функции,
// которые CARDS.render() из легаси зовёт на каждый render() (как раньше), а результат
// кладёт в $state — компонент перерисовывает только изменившиеся узлы.
// Скрытую раскладкой V93 карточку не считаем вовсе (как раньше через _hid()),
// поэтому у каждой карточки своё поле: render() обновляет лишь видимые.
import { legacy } from '../lib/legacy.js';

const fmt = n => n.toLocaleString('ru-RU');

export const cards = $state({
  million: null,   // null → display:none
  kopilka: null,
  weekly: null,
  insight: null,
});

// ---------- 📈 ПЛАН ДОХОДА ----------
const MILESTONES = [0, 100000, 250000, 500000, 750000, 1000000];
const LABELS = ['0', '100К', '250К', '500К', '750К', '1М'];
export function computeMillion() {
  const total = Math.max(0, Math.round(legacy.walletBalance().balance));
  if (total < 1000) return null;
  const pct = Math.min((total / 1000000) * 100, 100);
  return {
    pct: pct + '%',
    current: `${fmt(total)} ₽ / 1 000 000 ₽`,
    milestones: MILESTONES.map((m, i) => ({ lbl: LABELS[i], reached: total >= m })),
  };
}

// ---------- 🎯 КОПИЛКА ----------
export function getKopilka() { return legacy.get('kopilka', null); }
export function saveKopilkaData(d) { legacy.set('kopilka', d); }
export function computeKopilka() {
  const k = getKopilka();
  if (!k || !k.goal) return null;
  const total = Math.max(0, Math.round(legacy.walletBalance().balance));
  const pct = Math.min((total / k.goal) * 100, 100);
  const remaining = Math.max(k.goal - total, 0);
  const shifts = legacy.shifts();
  const avgPerShift = shifts.length > 0 ? (legacy.shiftTotals().totalEarned - shifts.reduce((a, s) => a + (s.expenses || 0), 0)) / shifts.length : 0;
  const shiftsLeft = avgPerShift > 0 ? Math.ceil(remaining / avgPerShift) : '∞';
  return {
    name: `🎯 ${k.name || 'Цель'}`,
    amount: `${fmt(total)} / ${fmt(k.goal)} ₽`,
    pct: pct + '%',
    sub: remaining > 0 ? `Осталось ~${shiftsLeft} смен` : '🎉 Цель достигнута',
  };
}

// ---------- 📌 ЗАДАЧА НЕДЕЛИ ----------
export const WEEKLY_CHALLENGES = [
  { id: 'wc_5shifts', title: 'Пятидневка', desc: 'Отработать 5 смен за неделю', target: 5, unit: 'shifts', reward: 300, icon: '🏃' },
  { id: 'wc_40hours', title: 'Полная загрузка', desc: 'Отработать 40 часов за неделю', target: 40, unit: 'hours', reward: 400, icon: '⏰' },
  { id: 'wc_50k', title: '50К за неделю', desc: 'Заработать 50 000₽ за неделю', target: 50000, unit: 'earned', reward: 500, icon: '💸' },
  { id: 'wc_avg900', title: 'Топ-эффективность', desc: 'Средний rate ≥ 900₽/час за неделю', target: 900, unit: 'avg_rate', reward: 350, icon: '🚀' },
  { id: 'wc_streak5', title: 'Непрерывная серия', desc: '5 дней подряд в работе', target: 5, unit: 'streak', reward: 400, icon: '🔥' },
  { id: 'wc_3quests', title: 'Активист', desc: 'Выполнить 15+ заданий за неделю', target: 15, unit: 'quests', reward: 300, icon: '⚔️' },
];
function weekBounds() {
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);
  return { now, monday, sunday };
}
export function getWeeklyChallenge() {
  const saved = legacy.get('weekly_challenge', null);
  const weekKey = weekBounds().monday.toISOString().slice(0, 10);
  if (saved && saved.weekKey === weekKey) return saved;
  // Новая неделя — случайный вызов
  const ch = WEEKLY_CHALLENGES[Math.floor(Math.random() * WEEKLY_CHALLENGES.length)];
  const data = { ...ch, weekKey, completed: false };
  legacy.set('weekly_challenge', data);
  return data;
}
export function computeWeekly() {
  const wc = getWeeklyChallenge();
  const { now, monday, sunday } = weekBounds();
  const weekShifts = legacy.shifts().filter(s => {
    const d = new Date(s.date.split('-').map(Number).join('/'));
    return d >= monday && d < sunday;
  });

  let progress = 0;
  if (wc.unit === 'shifts') progress = weekShifts.length;
  else if (wc.unit === 'hours') progress = weekShifts.reduce((s, x) => s + x.hours, 0);
  else if (wc.unit === 'earned') progress = weekShifts.reduce((s, x) => s + x.earned, 0);
  else if (wc.unit === 'avg_rate') {
    const h = weekShifts.reduce((s, x) => s + x.hours, 0);
    const e = weekShifts.reduce((s, x) => s + x.earned, 0);
    progress = h > 0 ? Math.round(e / h) : 0;
  }
  else if (wc.unit === 'streak') progress = legacy.calcStreak(legacy.streakGoal());

  const pct = Math.min((progress / wc.target) * 100, 100);
  let progressText = '';
  if (wc.unit === 'earned') progressText = `${fmt(progress)} / ${fmt(wc.target)} ₽`;
  else if (wc.unit === 'avg_rate') progressText = `${progress} / ${wc.target} ₽/час`;
  else if (wc.unit === 'hours') progressText = `${progress.toFixed(1)} / ${wc.target} ч`;
  else progressText = `${progress} / ${wc.target}`;

  const daysLeft = Math.max(0, Math.ceil((sunday - now) / 86400000));

  // Выполнение — побочный эффект, как в легаси: XP + тост один раз
  if (pct >= 100 && !wc.completed) {
    wc.completed = true;
    legacy.set('weekly_challenge', wc);
    legacy.addLifeXP('wc_' + wc.id, wc.reward, 'challenge');
    legacy.toast(`🎉 Вызов «${wc.title}» выполнен! +${wc.reward} XP`, 'success');
    legacy.haptic('success');
  }

  return {
    title: `${wc.icon} ${wc.title}`,
    desc: wc.desc,
    reward: `🎁 Награда: ${wc.reward} Life XP`,
    pct: pct + '%',
    progress: progressText,
    timer: `⏳ ${daysLeft} дн осталось`,
  };
}

// ---------- 📋 РЕКОМЕНДАЦИЯ ----------
export function computeInsight() {
  const shifts = legacy.shifts();
  if (shifts.length < 3) return null;

  const insights = [];
  const { totalEarned, avgRate } = legacy.shiftTotals();

  // Лучший день недели
  const dayStats = {};
  shifts.forEach(s => {
    const dp = s.date.split('-');
    const d = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
    const dow = d.getDay();
    if (!dayStats[dow]) dayStats[dow] = { earned: 0, hours: 0, count: 0 };
    dayStats[dow].earned += s.earned;
    dayStats[dow].hours += s.hours;
    dayStats[dow].count++;
  });
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  let bestDay = null, bestDayRate = 0;
  Object.entries(dayStats).forEach(([dow, st]) => {
    const rate = st.hours > 0 ? st.earned / st.hours : 0;
    if (rate > bestDayRate) { bestDayRate = rate; bestDay = dayNames[dow]; }
  });
  if (bestDay) insights.push({ icon: '📅', text: `Лучший день — <b>${bestDay}</b>, средний rate <b>${Math.round(bestDayRate)} ₽/час</b>. Рекомендуется планировать больше смен на этот день.` });

  // Тренд
  if (shifts.length >= 5) {
    const last5 = shifts.slice(0, 5).reduce((s, x) => s + x.rate, 0) / 5;
    const prev5 = shifts.length >= 10 ? shifts.slice(5, 10).reduce((s, x) => s + x.rate, 0) / 5 : avgRate;
    const diff = last5 - prev5;
    if (diff > 20) insights.push({ icon: '📈', text: `Ваш rate растёт! Последние 5 смен в среднем <b>${Math.round(last5)} ₽/час</b> — на <b>+${Math.round(diff)}</b> больше. Отличная динамика.` });
    else if (diff < -20) insights.push({ icon: '📉', text: `Rate снизился. Последние 5 смен — <b>${Math.round(last5)} ₽/час</b>. Рекомендуется планировать смены на ${bestDay || 'Пн'}.` });
  }

  // Длинные vs короткие смены
  const longRate = shifts.filter(s => s.hours >= 8);
  const shortRate = shifts.filter(s => s.hours < 6);
  if (longRate.length > 0 && shortRate.length > 0) {
    const avgLong = longRate.reduce((s, x) => s + x.rate, 0) / longRate.length;
    const avgShort = shortRate.reduce((s, x) => s + x.rate, 0) / shortRate.length;
    if (avgLong > avgShort + 30) {
      insights.push({ icon: '⏰', text: `Длинные смены (8+ ч) дают <b>${Math.round(avgLong)} ₽/час</b> vs <b>${Math.round(avgShort)}</b> на коротких. Рекомендуются длинные смены.` });
    }
  }

  // До миллиона
  const remaining = 1000000 - totalEarned;
  if (remaining > 0 && totalEarned > 0) {
    const avgPerShift = totalEarned / shifts.length;
    const shiftsToMillion = Math.ceil(remaining / avgPerShift);
    insights.push({ icon: '🏆', text: `До миллиона осталось <b>${fmt(remaining)} ₽</b> — ~<b>${shiftsToMillion} смен</b>. Цель достижима.` });
  }

  if (insights.length === 0) return null;
  const pick = insights[Math.floor(Math.random() * insights.length)];
  return { icon: pick.icon, html: pick.text };
}

// Пересчитать видимые карточки (зовётся из render() легаси). Параметр — какие именно.
export function refresh(which = { million: true, kopilka: true, weekly: true, insight: true }) {
  if (which.million) cards.million = computeMillion();
  if (which.kopilka) cards.kopilka = computeKopilka();
  if (which.weekly) cards.weekly = computeWeekly();
  if (which.insight) cards.insight = computeInsight();
}
