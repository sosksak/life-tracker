// ====== RENDER ======
// v9.18: уровень/серия, «📈 ДИНАМИКА», «📌 ПЛАН МЕСЯЦА», «📅 ПО ДНЯМ НЕДЕЛИ», «🏅 ЛУЧШИЕ ПОКАЗАТЕЛИ»
// вкладки «Стата» переехали в Svelte — src/svelte/stats/*.svelte + store.svelte.js (window.STATS).
// Старый код — в src/js/_archive/28-stats-legacy.js.
function render() {
  const goal = DIFFICULTIES[difficulty].goal;
  const { totalEarned, totalHours, avgRate } = getShiftTotals();

  // v9.11: кошелёк (#wallet) рисует src/svelte/work/Wallet.svelte —
  // баланс, подпись, уровень, тренд и три счётчика считаются в его сторе.
  if (window.WORK) WORK.render();

  // Title
  const activeTitle = getActiveTitle();
  const subtitleEl = document.querySelector('.header .subtitle');
  if (subtitleEl && activeTitle) {
    subtitleEl.textContent = `${activeTitle} · Трекер продуктивности`;
  }

  // Level + Streak + Chart + Month goal / dow / records → Svelte (v9.18)
  if (window.STATS) STATS.render();
  const streak = calcStreak(goal);

  // Achievements
  const achData = { shifts, totalEarned, streak };
  document.getElementById('achGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const u = a.check(achData);
    return `<div class="ach-item ${u?'unlocked':'locked'}"><div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div></div>`;
  }).join('');

  // History
  const shiftList = document.getElementById('shiftList');
  if (shifts.length === 0) {
    shiftList.innerHTML = `<div class="empty-state"><div class="emoji">📊</div><p>Нет данных — добавьте первую смену</p></div>`;
  } else {
    shiftList.innerHTML = shifts.map(s => {
      const cls = s.rate >= goal ? 'goal-hit' : (s.rate >= goal * 0.9 ? 'goal-close' : 'goal-miss');
      const rateCls = s.rate >= goal ? 'good' : (s.rate >= goal * 0.9 ? 'ok' : 'bad');
      const icon = s.rate >= goal ? '✅' : (s.rate >= goal * 0.9 ? '🔸' : '❌');
      // FIX: Parse date without timezone issues
      const dp = s.date.split('-');
      const d = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const noteHtml = s.displayNote ? `<div class="shift-note">${escapeHtml(s.displayNote)}</div>` : '';
      // FIX: id кладём в кавычках — у локальных (ещё не синхронизированных) смен он строковый
      // и без кавычек onclick падал с ошибкой.
      const idArg = JSON.stringify(s.id);
      const pendingBadge = s._pending ? `<span class="shift-pending" title="Ждёт загрузки в облако">📱</span>` : '';
      // Перерывы: раньше считались и терялись, теперь видны в истории.
      const breakHtml = (s.breakMs > 0)
        ? `<div class="shift-breaks" title="${escapeHtml(s.breakSummary || '')}">☕ ${s.breakCount} · ${formatShortDuration(s.breakMs)} · на складе ${formatShortDuration(s.totalMs)}</div>`
        : '';
      const extraParts = [];
      if (s.expenses > 0) extraParts.push(`💸 −${s.expenses.toLocaleString('ru-RU')} ₽ · чистыми ${s.net.toLocaleString('ru-RU')} ₽`);
      if (s.units > 0) extraParts.push(`📦 ${s.units} · ${(s.hours > 0 ? Math.round(s.units / s.hours * 10) / 10 : 0)}/ч`);
      const extraHtml = extraParts.length ? `<div class="shift-breaks">${extraParts.join(' · ')}</div>` : '';
      return `<div class="shift-card ${cls} slide-up">
        <div class="shift-actions dev-only">
          <button class="shift-action-btn edit" onclick='openEditModal(${idArg})' title="Редактировать">✏️</button>
          <button class="shift-action-btn delete" onclick='removeShift(${idArg})' title="Удалить">✕</button>
        </div>
        <div class="shift-left"><div class="shift-date">${dateStr} ${pendingBadge}</div><div class="shift-hours">${s.hours} ч</div>${breakHtml}${extraHtml}${noteHtml}</div>
        <div class="shift-right"><div class="shift-earned">${s.earned.toLocaleString('ru-RU')} ₽</div><div class="shift-rate ${rateCls}">${icon} ${s.rate} ₽/час</div></div>
      </div>`;
    }).join('');
  }

  // Quests
  renderQuests();
  // Calendar
  renderCalendar();
}

// ====== ЦЕЛЬ МЕСЯЦА ======
function getMonthGoal() {
  return parseInt(localStorage.getItem(uKey('lt_month_goal')) || '0', 10) || 0;
}
async function openMonthGoalPrompt() {
  const cur = getMonthGoal();
  const result = await askForm([
    { key: 'goal', label: 'Цель по заработку (₽)', type: 'number', placeholder: '80000', value: String(cur || 80000) }
  ], { icon: '🎯', title: 'Цель месяца', okText: 'Сохранить' });
  if (!result) return;
  const n = parseInt(String(result.goal).replace(/\D/g, ''), 10);
  if (!n || n <= 0) { showToast('❌ Введи число больше нуля', 'error'); return; }
  localStorage.setItem(uKey('lt_month_goal'), String(n));
  markLocalChange();
  schedulePushProgress();
  render();
  showToast(`🎯 Цель месяца: ${n.toLocaleString('ru-RU')} ₽`, 'success');
}

// Обёртки для старых вызовов (календарь, импорт, кнопки переключателя): карточки рисует Svelte.
function renderMonthGoal() { if (window.STATS) STATS.renderGoal(); }
function renderChart() { if (window.STATS) STATS.renderChart(); }
function setChartMode(days) { if (window.STATS) STATS.setChartMode(days); }

// ====== STREAK ======
function getStreakShields() {
  try {
    const b = uGet('lt_shop_boosts', {});
    return new Set(Array.isArray(b.streak_shields) ? b.streak_shields : []);
  } catch (e) { return new Set(); }
}

let _streakCache = { key: '', val: 0 };
function calcStreak(goal) {
  const cacheKey = shifts.length + ':' + goal + ':' + (shifts[0]?.id || '');
  if (_streakCache.key === cacheKey) return _streakCache.val;
  const shields = getStreakShields();
  const dateMap = {};
  for (const s of shifts) {
    if (!dateMap[s.date] || s.rate > dateMap[s.date]) dateMap[s.date] = s.rate;
  }
  const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
  if (dates.length === 0) { _streakCache = { key: cacheKey, val: 0 }; return 0; }
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < dates.length; i++) {
    const parts = dates[i].split('-');
    const shiftDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const gapCovered = (from, to) => {
      for (let d = new Date(from); d > to; d.setDate(d.getDate() - 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (d.getTime() !== from.getTime() && !shields.has(key)) return false;
      }
      return true;
    };
    if (i === 0) {
      if (Math.floor((today - shiftDate) / 86400000) > 1 && !gapCovered(today, shiftDate)) { _streakCache = { key: cacheKey, val: 0 }; return 0; }
    }
    if (i > 0) {
      const prevParts = dates[i-1].split('-');
      const prevDate = new Date(parseInt(prevParts[0]), parseInt(prevParts[1]) - 1, parseInt(prevParts[2]));
      if (Math.floor((prevDate - shiftDate) / 86400000) !== 1 && !gapCovered(prevDate, shiftDate)) break;
    }
    if (dateMap[dates[i]] >= goal) streak++; else break;
  }
  _streakCache = { key: cacheKey, val: streak };
  return streak;
}
