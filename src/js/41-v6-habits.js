// ============================================================
//  MODULE 2: HABITS — Трекер привычек
// ============================================================
// Пользовательские привычки с ежедневным/недельным отслеживанием,
// сериями, аналитикой. Отдельно от Life Quests (те — разовые задания).

const HABITS = (() => {
  'use strict';

  const STORAGE_KEY = 'v6_habits';
  const LOG_KEY = 'v6_habits_log';

  const DEFAULT_HABITS = [
    { id: 'h_water',    name: 'Выпить 8 стаканов воды', icon: '💧', freq: 'daily',  category: 'health',       active: true, createdAt: Date.now() },
    { id: 'h_exercise', name: 'Тренировка 30+ мин',     icon: '🏃', freq: 'daily',  category: 'health',       active: true, createdAt: Date.now() },
    { id: 'h_read',     name: 'Читать 20 минут',        icon: '📖', freq: 'daily',  category: 'learning',     active: true, createdAt: Date.now() },
    { id: 'h_meditate', name: 'Медитация 10 мин',       icon: '🧘', freq: 'daily',  category: 'health',       active: true, createdAt: Date.now() },
    { id: 'h_nosugar',  name: 'День без сахара',         icon: '🚫', freq: 'daily',  category: 'health',       active: false, createdAt: Date.now() },
    { id: 'h_journal',  name: 'Дневник / рефлексия',     icon: '📓', freq: 'daily',  category: 'productivity', active: false, createdAt: Date.now() },
    { id: 'h_sleep8',   name: 'Лечь до 23:00',          icon: '😴', freq: 'daily',  category: 'health',       active: true, createdAt: Date.now() },
    { id: 'h_budget',   name: 'Записать расходы',        icon: '📊', freq: 'daily',  category: 'finance',      active: false, createdAt: Date.now() },
  ];

  const CATEGORIES = {
    health:       { name: 'Здоровье',       icon: '❤️', color: '#38A169' },
    productivity: { name: 'Продуктивность', icon: '⚡', color: '#3182CE' },
    learning:     { name: 'Обучение',       icon: '📖', color: '#D69E2E' },
    social:       { name: 'Социальное',     icon: '👥', color: '#9F7AEA' },
    finance:      { name: 'Финансы',        icon: '📊', color: '#E53E3E' },
  };

  function getHabits() {
    const saved = uGet(STORAGE_KEY, null);
    if (saved && Array.isArray(saved)) return saved;
    // Первый запуск — записываем дефолтные
    uSet(STORAGE_KEY, DEFAULT_HABITS);
    return DEFAULT_HABITS;
  }

  function saveHabits(list) {
    uSet(STORAGE_KEY, list);
    markLocalChange();
    schedulePushProgress();
  }

  function getLog() {
    return uGet(LOG_KEY, {});
  }

  function saveLog(log) {
    uSet(LOG_KEY, log);
    markLocalChange();
    schedulePushProgress();
  }

  // Ключ записи: YYYY-MM-DD_habitId
  function logKey(habitId, dateStr) {
    return `${dateStr || todayStr()}_${habitId}`;
  }

  function isChecked(habitId, dateStr) {
    const log = getLog();
    return !!log[logKey(habitId, dateStr)];
  }

  function toggle(habitId) {
    const log = getLog();
    const key = logKey(habitId);
    if (log[key]) {
      delete log[key];
    } else {
      log[key] = { ts: Date.now(), date: todayStr() };
    }
    saveLog(log);
    haptic('light');
    render();
    // Синхронизируем Dashboard
    if (typeof DASHBOARD !== 'undefined') DASHBOARD.render();
  }

  // Серия для привычки
  function getStreak(habitId) {
    const log = getLog();
    let streak = 0;
    const d = new Date();
    // Проверяем сегодня — если не отмечено, начинаем со вчера
    if (!log[logKey(habitId, localDateStr(d))]) {
      d.setDate(d.getDate() - 1);
    }
    for (let i = 0; i < 365; i++) {
      if (log[logKey(habitId, localDateStr(d))]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // Процент выполнения за последние N дней
  function getCompletionRate(habitId, days = 30) {
    const log = getLog();
    let done = 0;
    const d = new Date();
    for (let i = 0; i < days; i++) {
      if (log[logKey(habitId, localDateStr(d))]) done++;
      d.setDate(d.getDate() - 1);
    }
    return days > 0 ? Math.round((done / days) * 100) : 0;
  }

  function getTodayProgress() {
    const habits = getHabits().filter(h => h.active);
    const done = habits.filter(h => isChecked(h.id)).length;
    return { done, total: habits.length };
  }

  // --- CRUD ---
  async function addHabit() {
    const res = await askForm([
      { key: 'name', label: 'Название', placeholder: 'Например: Утренняя зарядка' },
      { key: 'icon', label: 'Иконка (эмодзи)', placeholder: '🏃' },
      { key: 'category', label: 'Категория', type: 'select', options: Object.entries(CATEGORIES).map(([k, v]) => ({ value: k, label: v.icon + ' ' + v.name })) },
    ], { icon: '📋', title: 'Новая привычка', okText: 'Создать' });
    if (!res || !res.name) return;

    const habits = getHabits();
    habits.push({
      id: 'h_' + Date.now(),
      name: res.name.trim(),
      icon: res.icon || '📌',
      freq: 'daily',
      category: res.category || 'productivity',
      active: true,
      createdAt: Date.now(),
    });
    saveHabits(habits);
    showToast('✅ Привычка добавлена', 'success');
    render();
  }

  async function removeHabit(id) {
    const habits = getHabits();
    const h = habits.find(x => x.id === id);
    if (!h) return;
    const ok = await askConfirm(`Удалить привычку «${escapeHtml(h.name)}»?`, {
      icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена'
    });
    if (!ok) return;
    saveHabits(habits.filter(x => x.id !== id));
    showToast('Привычка удалена', 'warn');
    render();
  }

  function toggleActive(id) {
    const habits = getHabits();
    const h = habits.find(x => x.id === id);
    if (h) h.active = !h.active;
    saveHabits(habits);
    render();
  }

  // --- Быстрая отметка (для Dashboard) ---
  function quickCheck() {
    const habits = getHabits().filter(h => h.active && !isChecked(h.id));
    if (habits.length === 0) {
      showToast('✅ Все привычки отмечены', 'success');
      return;
    }
    // Отмечаем первую невыполненную
    toggle(habits[0].id);
    showToast(`✅ ${habits[0].icon} ${habits[0].name}`, 'success');
  }

  // --- Рендер ---
  function render() {
    const container = document.getElementById('habitsContent');
    if (!container) return;

    const habits = getHabits();
    const active = habits.filter(h => h.active);
    const inactive = habits.filter(h => !h.active);
    const today = todayStr();

    const todayProgress = getTodayProgress();
    const pct = todayProgress.total > 0 ? Math.round(todayProgress.done / todayProgress.total * 100) : 0;

    let html = `
      <div class="hab-summary">
        <div class="hab-summary-left">
          <div class="hab-summary-title">📋 Привычки на сегодня</div>
          <div class="hab-summary-count">${todayProgress.done} из ${todayProgress.total}</div>
        </div>
        <div class="hab-summary-ring" style="--pct:${pct}">
          <span>${pct}%</span>
        </div>
      </div>
    `;

    // Активные привычки
    if (active.length > 0) {
      html += `<div class="hab-list">`;
      for (const h of active) {
        const checked = isChecked(h.id);
        const streak = getStreak(h.id);
        const rate = getCompletionRate(h.id);
        const cat = CATEGORIES[h.category] || CATEGORIES.productivity;

        // Мини-хитмап за 7 дней
        let miniHeat = '';
        const d = new Date();
        for (let i = 6; i >= 0; i--) {
          const dd = new Date(d);
          dd.setDate(dd.getDate() - i);
          const done = isChecked(h.id, localDateStr(dd));
          miniHeat += `<span class="hab-dot ${done ? 'done' : ''}" title="${localDateStr(dd)}"></span>`;
        }

        html += `
          <div class="hab-item ${checked ? 'hab-checked' : ''}" data-id="${h.id}">
            <button class="hab-check" onclick="HABITS.toggle('${h.id}')">
              ${checked ? '✅' : '⬜'}
            </button>
            <div class="hab-info">
              <div class="hab-name">${h.icon} ${escapeHtml(h.name)}</div>
              <div class="hab-meta">
                <span class="hab-cat" style="color:${cat.color}">${cat.icon} ${cat.name}</span>
                ${streak > 0 ? `<span class="hab-streak">📈 ${streak} дн.</span>` : ''}
                <span class="hab-rate">${rate}% за 30д</span>
              </div>
              <div class="hab-mini-heat">${miniHeat}</div>
            </div>
            <button class="hab-menu-btn" onclick="HABITS.removeHabit('${h.id}')" title="Удалить">✕</button>
          </div>
        `;
      }
      html += `</div>`;
    }

    // Неактивные (свёрнутые)
    if (inactive.length > 0) {
      html += `
        <details class="hab-inactive-section">
          <summary class="hab-section-title">📁 Неактивные (${inactive.length})</summary>
          <div class="hab-list hab-inactive-list">
            ${inactive.map(h => `
              <div class="hab-item hab-inactive">
                <span class="hab-icon">${h.icon}</span>
                <span class="hab-name-sm">${escapeHtml(h.name)}</span>
                <button class="hab-activate-btn" onclick="HABITS.toggleActive('${h.id}')">Включить</button>
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    // Кнопка добавления
    html += `
      <div class="hab-add-row">
        <button class="hab-add-btn" onclick="HABITS.addHabit()">＋ Добавить привычку</button>
      </div>
    `;

    // Аналитика (пропускаем, если карточка скрыта)
    if (active.length > 0 && !_hid('lifeContent', 'hab-analytics')) {
      const bestHabit = active.reduce((best, h) => {
        const r = getCompletionRate(h.id);
        return r > (best.rate || 0) ? { habit: h, rate: r } : best;
      }, { rate: 0 });

      const worstHabit = active.reduce((worst, h) => {
        const r = getCompletionRate(h.id);
        return r < (worst.rate || 101) ? { habit: h, rate: r } : worst;
      }, { rate: 101 });

      html += `
        <div class="hab-analytics">
          <div class="hab-section-title">📊 Аналитика за 30 дней</div>
          <div class="hab-analytics-grid">
            ${bestHabit.habit ? `<div class="hab-analytic-card">
              <div class="hab-analytic-label">Лучшая привычка</div>
              <div class="hab-analytic-val">${bestHabit.habit.icon} ${escapeHtml(bestHabit.habit.name)}</div>
              <div class="hab-analytic-sub">${bestHabit.rate}% выполнения</div>
            </div>` : ''}
            ${worstHabit.habit ? `<div class="hab-analytic-card">
              <div class="hab-analytic-label">Требует внимания</div>
              <div class="hab-analytic-val">${worstHabit.habit.icon} ${escapeHtml(worstHabit.habit.name)}</div>
              <div class="hab-analytic-sub">${worstHabit.rate}% выполнения</div>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function openPanel() {
    // Переключаемся на вкладку привычек (v6 tab system)
    if (typeof switchV6Tab === 'function') switchV6Tab('habits');
    render();
  }

  return {
    getHabits, saveHabits, toggle, isChecked, getStreak,
    getCompletionRate, getTodayProgress, addHabit, removeHabit,
    toggleActive, quickCheck, render, openPanel,
  };
})();


