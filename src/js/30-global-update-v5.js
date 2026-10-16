// ====== GLOBAL UPDATE v5.0 ======

// --- Haptic feedback ---
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  if (type === 'light') navigator.vibrate(10);
  else if (type === 'medium') navigator.vibrate(25);
  else if (type === 'heavy') navigator.vibrate([30, 10, 30]);
  else if (type === 'success') navigator.vibrate([10, 50, 10, 50, 10]);
}

// --- Tab animation ---
const _origSwitchTab = switchTab;
switchTab = function(tab) {
  haptic('light');
  const targets = document.querySelectorAll('.tab-content');
  targets.forEach(c => { c.classList.remove('active'); c.style.opacity='0'; c.style.transform='translateY(12px)'; });
  _origSwitchTab(tab);
  const active = document.querySelector('.tab-content.active');
  if (active) { requestAnimationFrame(() => { active.style.opacity='1'; active.style.transform='translateY(0)'; }); }
};

// --- CountUp animation ---
function countUp(el, target, duration = 600) {
  const start = parseInt(el.textContent.replace(/\s/g,'')) || 0;
  if (start === target) return;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = Math.round(start + (target - start) * ease);
    el.textContent = val.toLocaleString('ru-RU');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// --- Live Rate Display --- v9.21: → Svelte (src/svelte/work/live.svelte.js, блок внутри ActiveShift.svelte).
// Старый код — в src/js/_archive/30-live-legacy.js. Обёртка — для updateTimer/renderActiveShift.
function updateLiveRate() { if (window.LIVE) LIVE.updateLiveRate(); }

// --- Focus Mode ---
let focusInterval = null;
function openFocusMode() {
  if (!activeShift) return;
  haptic('medium');
  document.getElementById('focusOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  focusInterval = setInterval(updateFocusMode, 1000);
  updateFocusMode();
}
function closeFocusMode() {
  haptic('light');
  document.getElementById('focusOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  clearInterval(focusInterval);
}
function focusBreak() {
  if (activeShift && activeShift.status === 'working') startBreak();
  else if (activeShift && activeShift.status === 'break') endBreak();
  updateFocusMode();
}
function focusEnd() { closeFocusMode(); endShift(); }
function updateFocusMode() {
  if (!activeShift) { closeFocusMode(); return; }
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((s, b) => s + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  const workMs = totalMs - breakMs;
  document.getElementById('focusTimer').textContent = formatDuration(workMs);
  const recentRate = shifts.length > 0 ? shifts.slice(0, 5).reduce((s, x) => s + x.rate, 0) / Math.min(shifts.length, 5) : 850;
  const estimated = Math.round(recentRate * workMs / 3600000);
  document.getElementById('focusEarn').textContent = `~${estimated.toLocaleString('ru-RU')} ₽`;
  document.getElementById('focusSub').textContent = activeShift.status === 'break' ? '☕ перерыв' : '💪 в работе';
  const brkBtn = document.querySelector('.focus-btn.brk');
  if (brkBtn) brkBtn.textContent = activeShift.status === 'break' ? '▶ Работать' : '☕ Перерыв';
}

// --- Achievement Unlock Animation ---
let _prevUnlocked = null;
function checkNewAchievements() {
  const totalEarned = getShiftTotals().totalEarned;
  const streak = calcStreak(DIFFICULTIES[difficulty].goal);
  const achData = { shifts, totalEarned, streak };
  const nowUnlocked = ACHIEVEMENTS.filter(a => a.check(achData)).map(a => a.id);
  if (_prevUnlocked === null) { _prevUnlocked = new Set(nowUnlocked); return; }
  const newOnes = nowUnlocked.filter(id => !_prevUnlocked.has(id));
  newOnes.forEach(id => {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (ach) showAchUnlock(ach);
  });
  _prevUnlocked = new Set(nowUnlocked);
}
function showAchUnlock(ach) { if (window.REST) REST.showAchUnlock(ach); } // v9.20: Svelte (src/svelte/rest/AchUnlock.svelte)

// --- Daily Summary Popup --- v9.21: сетка → Svelte (src/svelte/work/Summary.svelte, window.LIVE.showSummary)
function showDailySummary(earned, workHours, rate) { if (window.LIVE) LIVE.showSummary(earned, workHours, rate); }
function closeSummary() {
  document.getElementById('summaryOverlay').style.display = 'none';
}

// --- Million Path / Kopilka / Weekly Challenge / Insight: v9.16 → Svelte (window.CARDS, src/svelte/work/cards.svelte.js) ---

// --- Week Comparison / Heatmap / Diary list: v9.19 → Svelte (window.STATS, src/svelte/stats/) ---
// Старый код — в src/js/_archive/30-stats-legacy.js. Обёртки — для старых вызовов (saveDiaryEntry, хуки).
function renderWeekCompare() { if (window.STATS) STATS.renderWeekCompare(); }
function renderHeatmap() { if (window.STATS) STATS.renderHeatmap(); }
function renderDiary() { if (window.STATS) STATS.renderDiary(); }

// --- Social Diary ---
function getDiary() { return uGet('social_diary', []); }
function saveDiary(d) { uSet('social_diary', d); }
// Звёзды оценки: чёрные выбранные, белые пустые (CSS, не эмодзи — движок иконок
// подменяет ⭐ и ☆ одним и тем же SVG, из-за чего оценка была не видна).
function renderStars(n, max = 5) {
  n = Math.max(0, Math.min(max, Math.round(n || 0)));
  let s = '<span class="rate-stars no-ico" aria-label="' + n + ' из ' + max + '">';
  for (let i = 0; i < max; i++) s += '<span class="rs' + (i < n ? ' on' : '') + '"></span>';
  return s + '</span>';
}
// v9.20: модалка дневника → Svelte (src/svelte/rest/DiaryModal.svelte). Обёртки — для старых вызовов.
function setDiaryStar(n) { if (window.REST) REST.setDiaryStar(n); }
function openDiaryModal() { if (window.REST) REST.openDiaryModal(); }
function closeDiaryModal() { if (window.REST) REST.closeDiaryModal(); }
function saveDiaryEntry() { if (window.REST) REST.saveDiaryEntry(); }
// --- Fortune Wheel: see v7 block (window.openWheelModal / spinWheel) ---

// --- Contextual phrases for timer ---
function getTimerPhrase(workMs) {
  const hours = workMs / 3600000;
  if (hours < 0.5) return '🚀 Начало работы';
  if (hours < 1) return '💪 Первый час — настройка';
  if (hours < 2) return '⚡ Рабочий ритм';
  if (hours < 4) return '🔥 Продуктивная работа';
  if (hours < 6) return '💎 Отличный темп';
  if (hours < 8) return '🦁 Высокая продуктивность';
  return '👑 Выдающийся результат!';
}

// --- Enhanced timer update ---
const _origUpdateTimer = updateTimer;
updateTimer = function() {
  _origUpdateTimer();
  updateLiveRate();
  if (activeShift && activeShift.status === 'working') {
    const now = Date.now();
    const totalMs = now - activeShift.startTime;
    const breakMs = activeShift.breaks.reduce((s, b) => s + ((b.end || now) - b.start), 0);
    const workMs = totalMs - breakMs;
    const sub = document.getElementById('timerSub');
    if (sub) sub.textContent = `${getTimerPhrase(workMs)} | Всего: ${formatDuration(totalMs)} | ☕ ${formatShortDuration(breakMs)}`;
  }
};

// --- Cached shift totals (avoid 15+ reduce calls per render) ---
let _shiftCache = { len: -1, totalEarned: 0, totalHours: 0, avgRate: 0 };
