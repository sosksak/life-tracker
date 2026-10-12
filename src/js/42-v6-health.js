// ============================================================
//  MODULE 3: HEALTH — Здоровье и самочувствие
// ============================================================
// Вода, сон, настроение, вес, упражнения. Ежедневный трекинг
// с историей и мини-графиками.

const HEALTH = (() => {
  'use strict';

  const STORAGE_KEY = 'v6_health';

  const MOODS = [
    { id: 'great',   icon: '😄', label: 'Отлично',     value: 5, color: '#38A169' },
    { id: 'good',    icon: '🙂', label: 'Хорошо',      value: 4, color: '#68D391' },
    { id: 'neutral', icon: '😐', label: 'Нормально',   value: 3, color: '#ECC94B' },
    { id: 'bad',     icon: '😕', label: 'Не очень',     value: 2, color: '#ED8936' },
    { id: 'awful',   icon: '😫', label: 'Плохо',        value: 1, color: '#E53E3E' },
  ];

  function getData() {
    return uGet(STORAGE_KEY, {});
  }

  function saveData(data) {
    uSet(STORAGE_KEY, data);
    markLocalChange();
    schedulePushProgress();
  }

  function dayKey(dateStr) {
    return dateStr || todayStr();
  }

  function getDayData(dateStr) {
    const all = getData();
    const key = dayKey(dateStr);
    return all[key] || { water: 0, sleep: 0, mood: null, weight: null, exercise: 0, notes: '' };
  }

  function saveDayData(dateStr, dayData) {
    const all = getData();
    all[dayKey(dateStr)] = { ...dayData, updatedAt: Date.now() };
    // Очистка старых записей (>180 дней)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const cutoffStr = localDateStr(cutoff);
    for (const k of Object.keys(all)) {
      if (k < cutoffStr && k.match(/^\d{4}-\d{2}-\d{2}$/)) delete all[k];
    }
    saveData(all);
  }

  function getTodayData() {
    const d = getDayData();
    return {
      water: d.water || 0,
      sleep: d.sleep || 0,
      mood: d.mood ? (MOODS.find(m => m.id === d.mood)?.icon || '—') : null,
      moodId: d.mood,
      weight: d.weight,
      exercise: d.exercise || 0,
    };
  }

  // --- Быстрые действия ---
  function quickWater() {
    const d = getDayData();
    d.water = (d.water || 0) + 1;
    saveDayData(null, d);
    showToast(`💧 Вода: ${d.water}/8 стаканов`, 'success');
    haptic('light');
    render();
    if (typeof DASHBOARD !== 'undefined') DASHBOARD.render();
  }

  function setWater(amount) {
    const d = getDayData();
    d.water = Math.max(0, Math.min(20, amount));
    saveDayData(null, d);
    render();
  }

  function setMood(moodId) {
    const d = getDayData();
    d.mood = moodId;
    saveDayData(null, d);
    showToast(`Настроение: ${MOODS.find(m => m.id === moodId)?.icon || ''}`, 'success');
    haptic('light');
    render();
  }

  function setSleep(hours) {
    const d = getDayData();
    d.sleep = Math.max(0, Math.min(24, parseFloat(hours) || 0));
    saveDayData(null, d);
    render();
  }

  function setWeight(kg) {
    const d = getDayData();
    d.weight = parseFloat(kg) || null;
    saveDayData(null, d);
    render();
  }

  function setExercise(minutes) {
    const d = getDayData();
    d.exercise = Math.max(0, parseInt(minutes) || 0);
    saveDayData(null, d);
    render();
  }

  // --- Статистика за период ---
  function getWeekStats() {
    const stats = { water: 0, sleepTotal: 0, sleepDays: 0, exerciseTotal: 0, moodSum: 0, moodDays: 0 };
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const dd = getDayData(localDateStr(d));
      stats.water += dd.water || 0;
      if (dd.sleep > 0) { stats.sleepTotal += dd.sleep; stats.sleepDays++; }
      stats.exerciseTotal += dd.exercise || 0;
      if (dd.mood) {
        const mv = MOODS.find(m => m.id === dd.mood);
        if (mv) { stats.moodSum += mv.value; stats.moodDays++; }
      }
      d.setDate(d.getDate() - 1);
    }
    return {
      avgWater: Math.round(stats.water / 7 * 10) / 10,
      avgSleep: stats.sleepDays > 0 ? Math.round(stats.sleepTotal / stats.sleepDays * 10) / 10 : 0,
      totalExercise: stats.exerciseTotal,
      avgMood: stats.moodDays > 0 ? Math.round(stats.moodSum / stats.moodDays * 10) / 10 : 0,
    };
  }

  // --- Тренд веса за 30 дней ---
  function getWeightHistory(days = 30) {
    const data = getData();
    const points = [];
    const d = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const dd = new Date(d);
      dd.setDate(dd.getDate() - i);
      const key = localDateStr(dd);
      if (data[key] && data[key].weight) {
        points.push({ date: key, weight: data[key].weight });
      }
    }
    return points;
  }

  // --- Рендер ---
  function render() {
    const container = document.getElementById('healthContent');
    if (!container) return;

    const d = getDayData();
    const week = getWeekStats();
    const weightHist = getWeightHistory();

    // Мини-график настроения за 7 дней
    let moodWeek = '';
    const dt = new Date();
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(dt);
      dd.setDate(dd.getDate() - i);
      const dayD = getDayData(localDateStr(dd));
      const moodObj = dayD.mood ? MOODS.find(m => m.id === dayD.mood) : null;
      const dayLabel = dd.toLocaleDateString('ru-RU', { weekday: 'short' });
      moodWeek += `<div class="health-mood-day">
        <span class="health-mood-icon">${moodObj ? moodObj.icon : '·'}</span>
        <span class="health-mood-lbl">${dayLabel}</span>
      </div>`;
    }

    container.innerHTML = `
      <div class="health-section">
        <div class="health-section-title">😊 Настроение</div>
        <div class="health-mood-picker">
          ${MOODS.map(m => `
            <button class="health-mood-btn ${d.mood === m.id ? 'selected' : ''}"
                    onclick="HEALTH.setMood('${m.id}')"
                    style="--mood-color:${m.color}">
              <span class="health-mood-emoji">${m.icon}</span>
              <span class="health-mood-label">${m.label}</span>
            </button>
          `).join('')}
        </div>
        <div class="health-mood-week">${moodWeek}</div>
      </div>

      <div class="health-section">
        <div class="health-section-title">💧 Вода</div>
        <div class="health-water-track">
          <div class="health-water-glasses">
            ${Array.from({length: 8}, (_, i) => `
              <button class="health-glass ${i < d.water ? 'filled' : ''}"
                      onclick="HEALTH.setWater(${i + 1 <= d.water ? i : i + 1})">
                💧
              </button>
            `).join('')}
          </div>
          <div class="health-water-label">${d.water}/8 стаканов</div>
        </div>
      </div>

      <div class="health-section">
        <div class="health-section-title">😴 Сон</div>
        <div class="health-input-row">
          <input type="number" class="health-input" id="healthSleepInput"
                 value="${d.sleep || ''}" min="0" max="24" step="0.5"
                 placeholder="часов"
                 onchange="HEALTH.setSleep(this.value)">
          <span class="health-input-unit">часов</span>
          ${d.sleep > 0 ? `<span class="health-sleep-quality">${d.sleep >= 7 ? '✅ Норма' : d.sleep >= 5 ? '⚠️ Мало' : '❌ Критично мало'}</span>` : ''}
        </div>
      </div>

      <div class="health-section">
        <div class="health-section-title">🏃 Активность</div>
        <div class="health-input-row">
          <input type="number" class="health-input" id="healthExerciseInput"
                 value="${d.exercise || ''}" min="0" max="600" step="5"
                 placeholder="минут"
                 onchange="HEALTH.setExercise(this.value)">
          <span class="health-input-unit">минут</span>
          <div class="health-exercise-btns">
            <button onclick="HEALTH.setExercise(${(d.exercise||0)+15})">+15</button>
            <button onclick="HEALTH.setExercise(${(d.exercise||0)+30})">+30</button>
            <button onclick="HEALTH.setExercise(${(d.exercise||0)+60})">+60</button>
          </div>
        </div>
      </div>

      <div class="health-section">
        <div class="health-section-title">⚖️ Вес</div>
        <div class="health-input-row">
          <input type="number" class="health-input" id="healthWeightInput"
                 value="${d.weight || ''}" min="30" max="300" step="0.1"
                 placeholder="кг"
                 onchange="HEALTH.setWeight(this.value)">
          <span class="health-input-unit">кг</span>
          ${weightHist.length >= 2 ? (() => {
            const diff = weightHist[weightHist.length - 1].weight - weightHist[0].weight;
            const sign = diff > 0 ? '+' : '';
            return `<span class="health-weight-trend">${sign}${diff.toFixed(1)} кг за ${weightHist.length} записей</span>`;
          })() : ''}
        </div>
      </div>

      <div class="health-section">
        <div class="health-section-title">📊 Средние за неделю</div>
        <div class="health-week-grid">
          <div class="health-week-card">
            <div class="health-week-val">${week.avgWater}</div>
            <div class="health-week-lbl">💧 стаканов/день</div>
          </div>
          <div class="health-week-card">
            <div class="health-week-val">${week.avgSleep > 0 ? week.avgSleep + 'ч' : '—'}</div>
            <div class="health-week-lbl">😴 сон</div>
          </div>
          <div class="health-week-card">
            <div class="health-week-val">${week.totalExercise}</div>
            <div class="health-week-lbl">🏃 мин активности</div>
          </div>
          <div class="health-week-card">
            <div class="health-week-val">${week.avgMood > 0 ? week.avgMood + '/5' : '—'}</div>
            <div class="health-week-lbl">😊 настроение</div>
          </div>
        </div>
      </div>
    `;
  }

  function openPanel() {
    if (typeof switchV6Tab === 'function') switchV6Tab('health');
    render();
  }

  return {
    getTodayData, getDayData, quickWater, setWater, setMood,
    setSleep, setWeight, setExercise, getWeekStats, getWeightHistory,
    render, openPanel, MOODS,
  };
})();


