// ============================================================
//  MODULE 1: DASHBOARD — Сводная панель
// ============================================================
// Единая точка входа: обзор всех модулей, ключевые метрики,
// уведомления и быстрые действия. Отображается как первый экран.

const DASHBOARD = (() => {
  'use strict';

  // --- Виджеты ---
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 6)  return { text: 'Доброй ночи', icon: '🌙' };
    if (h < 12) return { text: 'Доброе утро', icon: '☀️' };
    if (h < 18) return { text: 'Добрый день', icon: '🌤' };
    return { text: 'Добрый вечер', icon: '🌆' };
  }

  function getUserDisplayName() {
    if (!currentUser) return 'Пользователь';
    return currentUser.name || currentUser.login || 'Пользователь';
  }

  // Собирает данные из всех модулей для виджетов
  function collectMetrics() {
    const today = todayStr();
    const { totalEarned, totalHours, avgRate } = getShiftTotals();
    const streak = typeof calcStreak === 'function'
      ? calcStreak(DIFFICULTIES[difficulty].goal)
      : 0;

    // Привычки
    const habitsToday = HABITS.getTodayProgress();

    // Здоровье
    const healthToday = HEALTH.getTodayData();

    // Финансы
    const finToday = FINANCE.getMonthSummary();

    // Крипто
    const cryptoTotal = CRYPTO.getPortfolioValue();

    return {
      today,
      // Работа
      shiftActive: !!activeShift,
      shiftCount: shifts.length,
      totalEarned, totalHours, avgRate, streak,
      // Модули
      habitsToday,
      healthToday,
      finToday,
      cryptoTotal,
    };
  }

  // Генерация уведомлений / напоминаний
  function getAlerts() {
    const alerts = [];
    const today = todayStr();

    // Не начата смена
    if (!activeShift) {
      const now = new Date();
      if (now.getHours() >= 8 && now.getHours() < 20) {
        alerts.push({ icon: '📋', text: 'Смена ещё не начата', type: 'info' });
      }
    }

    // Привычки
    const hp = HABITS.getTodayProgress();
    if (hp.total > 0 && hp.done < hp.total) {
      alerts.push({ icon: '📌', text: `Привычки: ${hp.done}/${hp.total} выполнено`, type: hp.done === 0 ? 'warn' : 'info' });
    }

    // Вода
    const hd = HEALTH.getTodayData();
    if (hd.water < 6) {
      alerts.push({ icon: '💧', text: `Вода: ${hd.water}/8 стаканов`, type: 'warn' });
    }

    // Бюджет
    const fin = FINANCE.getMonthSummary();
    if (fin.budgetPct > 90) {
      alerts.push({ icon: '⚠️', text: `Бюджет израсходован на ${fin.budgetPct}%`, type: 'error' });
    }

    return alerts;
  }

  // --- Рендер ---
  function render() {
    const el = document.getElementById('dashboardContent');
    if (!el) return;

    const m = collectMetrics();
    const greet = getGreeting();
    const alerts = getAlerts();

    // Мини-карточки
    const alertsHtml = alerts.length > 0
      ? `<div class="dash-alerts">${alerts.map(a =>
          `<div class="dash-alert dash-alert--${a.type}"><span class="dash-alert-icon">${a.icon}</span><span>${a.text}</span></div>`
        ).join('')}</div>`
      : '';

    el.innerHTML = `
      <div class="dash-greeting">
        <span class="dash-greeting-icon">${greet.icon}</span>
        <div>
          <div class="dash-greeting-text">${greet.text}, <b>${escapeHtml(getUserDisplayName())}</b></div>
          <div class="dash-greeting-date">${new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </div>

      ${alertsHtml}

      <div class="dash-cards">
        <div class="dash-card" onclick="switchTab('shift')">
          <div class="dash-card-header">
            <span class="dash-card-icon">💼</span>
            <span class="dash-card-title">Работа</span>
          </div>
          <div class="dash-card-value">${m.totalEarned.toLocaleString('ru-RU')} ₽</div>
          <div class="dash-card-sub">${m.shiftCount} смен · ${m.avgRate} ₽/ч${m.streak > 0 ? ' · 📈 ' + m.streak + ' дн.' : ''}</div>
          <div class="dash-card-status ${m.shiftActive ? 'active' : ''}">${m.shiftActive ? '▶ Смена активна' : '⏸ Нет активной смены'}</div>
        </div>

        <div class="dash-card" onclick="HABITS.openPanel()">
          <div class="dash-card-header">
            <span class="dash-card-icon">📋</span>
            <span class="dash-card-title">Привычки</span>
          </div>
          <div class="dash-card-value">${m.habitsToday.done}/${m.habitsToday.total}</div>
          <div class="dash-card-sub">выполнено сегодня</div>
          <div class="dash-card-bar"><div class="dash-card-fill" style="width:${m.habitsToday.total > 0 ? Math.round(m.habitsToday.done / m.habitsToday.total * 100) : 0}%"></div></div>
        </div>

        <div class="dash-card" onclick="HEALTH.openPanel()">
          <div class="dash-card-header">
            <span class="dash-card-icon">❤️</span>
            <span class="dash-card-title">Здоровье</span>
          </div>
          <div class="dash-card-value">${m.healthToday.mood ? m.healthToday.mood : '—'}</div>
          <div class="dash-card-sub">💧 ${m.healthToday.water}/8 · 😴 ${m.healthToday.sleep > 0 ? m.healthToday.sleep + 'ч' : '—'}</div>
        </div>

        <div class="dash-card" onclick="FINANCE.openPanel()">
          <div class="dash-card-header">
            <span class="dash-card-icon">📊</span>
            <span class="dash-card-title">Финансы</span>
          </div>
          <div class="dash-card-value">${m.finToday.balance.toLocaleString('ru-RU')} ₽</div>
          <div class="dash-card-sub">расход: ${m.finToday.expenses.toLocaleString('ru-RU')} ₽ / мес</div>
        </div>

        <div class="dash-card" onclick="CRYPTO.openPanel()">
          <div class="dash-card-header">
            <span class="dash-card-icon">📈</span>
            <span class="dash-card-title">Портфель</span>
          </div>
          <div class="dash-card-value">${m.cryptoTotal.totalUSD > 0 ? '$' + m.cryptoTotal.totalUSD.toLocaleString('en-US', {maximumFractionDigits:2}) : '—'}</div>
          <div class="dash-card-sub">${m.cryptoTotal.assets} активов${m.cryptoTotal.changePct !== 0 ? ' · ' + (m.cryptoTotal.changePct > 0 ? '+' : '') + m.cryptoTotal.changePct.toFixed(1) + '%' : ''}</div>
        </div>
      </div>

      <div class="dash-quick-actions">
        <div class="dash-section-title">📌 Быстрые действия</div>
        <div class="dash-actions-grid">
          ${!m.shiftActive ? '<button class="dash-action-btn" onclick="startShift();DASHBOARD.render()">▶ Начать смену</button>' : '<button class="dash-action-btn" onclick="endShift()">⏹ Завершить смену</button>'}
          <button class="dash-action-btn" onclick="HABITS.quickCheck()">✅ Отметить привычку</button>
          <button class="dash-action-btn" onclick="HEALTH.quickWater()">💧 +1 стакан воды</button>
          <button class="dash-action-btn" onclick="FINANCE.quickExpense()">📝 Записать расход</button>
        </div>
      </div>
    `;
  }

  return { render, collectMetrics, getAlerts };
})();


