// DASHBOARD — данные сводной панели (перенос 40-v6-dashboard.js на Svelte 5).
// Всё состояние живёт в легаси (shifts, activeShift, HABITS, HEALTH, FINANCE, CRYPTO),
// поэтому стор здесь — один счётчик `version`: DASHBOARD.render() его увеличивает,
// а компонент под {#key} пересобирает DOM целиком — как раньше делал innerHTML.
import { legacy } from '../lib/legacy.js';

export const dash = $state({ version: 0 });

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'Доброй ночи', icon: '🌙' };
  if (h < 12) return { text: 'Доброе утро', icon: '☀️' };
  if (h < 18) return { text: 'Добрый день', icon: '🌤' };
  return { text: 'Добрый вечер', icon: '🌆' };
}

export function getUserDisplayName() {
  const u = legacy.currentUser();
  if (!u) return 'Пользователь';
  return u.name || u.login || 'Пользователь';
}

// Собирает данные из всех модулей для виджетов
export function collectMetrics() {
  const today = legacy.todayStr();
  const { totalEarned, totalHours, avgRate } = legacy.shiftTotals();
  const streak = legacy.calcStreak(legacy.streakGoal());

  return {
    today,
    // Работа
    shiftActive: !!legacy.activeShift(),
    shiftCount: legacy.shifts().length,
    totalEarned, totalHours, avgRate, streak,
    // Модули
    habitsToday: legacy.habitsToday(),
    healthToday: legacy.healthToday(),
    finToday: legacy.financeMonth(),
    cryptoTotal: legacy.cryptoValue(),
  };
}

// Генерация уведомлений / напоминаний
export function getAlerts() {
  const alerts = [];

  // Не начата смена
  if (!legacy.activeShift()) {
    const now = new Date();
    if (now.getHours() >= 8 && now.getHours() < 20) {
      alerts.push({ icon: '📋', text: 'Смена ещё не начата', type: 'info' });
    }
  }

  // Привычки
  const hp = legacy.habitsToday();
  if (hp.total > 0 && hp.done < hp.total) {
    alerts.push({ icon: '📌', text: `Привычки: ${hp.done}/${hp.total} выполнено`, type: hp.done === 0 ? 'warn' : 'info' });
  }

  // Вода
  const hd = legacy.healthToday();
  if (hd.water < 6) {
    alerts.push({ icon: '💧', text: `Вода: ${hd.water}/8 стаканов`, type: 'warn' });
  }

  // Бюджет
  const fin = legacy.financeMonth();
  if (fin.budgetPct > 90) {
    alerts.push({ icon: '⚠️', text: `Бюджет израсходован на ${fin.budgetPct}%`, type: 'error' });
  }

  return alerts;
}
