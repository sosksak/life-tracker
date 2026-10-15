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

// --- Live Rate Display ---
function updateLiveRate() {
  if (!activeShift) {
    document.getElementById('liveRateDisplay').style.display = 'none';
    return;
  }
  document.getElementById('liveRateDisplay').style.display = 'block';
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  const workH = (totalMs - breakMs) / 3600000;
  const el = document.getElementById('liveRateAmount');
  const lbl = document.getElementById('liveRateLabel');

  if (workH > 0.01) {
    // Use average of last shifts to estimate ₽/hour
    const recentRate = shifts.length > 0 ? shifts.slice(0, 5).reduce((s, x) => s + x.rate, 0) / Math.min(shifts.length, 5) : 850;
    const estimatedEarned = Math.round(recentRate * workH);
    const currentRate = Math.round(recentRate);
    el.textContent = `~${estimatedEarned.toLocaleString('ru-RU')} ₽`;

    if (activeShift.status === 'break') {
      el.className = 'live-rate-amount break-loss';
      const breakMin = (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0) / 60000;
      const lossPerMin = Math.round(recentRate / 60);
      lbl.innerHTML = `☕ перерыв · потери <span class="loss">~${lossPerMin} ₽/мин</span>`;
    } else {
      el.className = 'live-rate-amount earning';
      lbl.textContent = `⚡ прогноз по ~${currentRate} ₽/час`;
    }
  }
}

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
function showAchUnlock(ach) {
  haptic('success');
  const ov = document.createElement('div');
  ov.className = 'ach-unlock-overlay';
  ov.innerHTML = `
    <div class="ach-unlock-glow"></div>
    <div class="ach-unlock-icon">${ach.icon}</div>
    <div class="ach-unlock-title">🏆 ДОСТИЖЕНИЕ!</div>
    <div class="ach-unlock-name">${ach.name}</div>
  `;
  ov.onclick = () => { ov.style.opacity='0'; setTimeout(()=>ov.remove(), 300); };
  document.body.appendChild(ov);
  setTimeout(() => { ov.style.opacity='0'; setTimeout(()=>ov.remove(), 300); }, 3000);
}

// --- Daily Summary Popup ---
function showDailySummary(earned, workHours, rate) {
  const streak = calcStreak(DIFFICULTIES[difficulty].goal);
  const grid = document.getElementById('summaryGrid');
  grid.innerHTML = `
    <div class="summary-item"><div class="summary-item-val">💰 ${earned.toLocaleString('ru-RU')}</div><div class="summary-item-lbl">заработок ₽</div></div>
    <div class="summary-item"><div class="summary-item-val">⏱ ${workHours} ч</div><div class="summary-item-lbl">работа</div></div>
    <div class="summary-item"><div class="summary-item-val">🚀 ${rate}</div><div class="summary-item-lbl">₽/час</div></div>
    <div class="summary-item"><div class="summary-item-val">📋 ${shifts.length}</div><div class="summary-item-lbl">смен всего</div></div>
    ${(shifts[0] && shifts[0].expenses > 0) ? `<div class="summary-item"><div class="summary-item-val">💸 ${shifts[0].net.toLocaleString('ru-RU')}</div><div class="summary-item-lbl">чистыми (−${shifts[0].expenses.toLocaleString('ru-RU')} ₽)</div></div>` : ''}
    ${(shifts[0] && shifts[0].units > 0) ? `<div class="summary-item"><div class="summary-item-val">📦 ${shifts[0].units}</div><div class="summary-item-lbl">заказов · ${workHours > 0 ? Math.round(shifts[0].units / workHours * 10) / 10 : 0}/ч</div></div>` : ''}
  `;
  const streakEl = document.getElementById('summaryStreak');
  streakEl.textContent = streak > 0 ? `🔥 ${streak} дней подряд в цели!` : '';
  document.getElementById('summaryOverlay').style.display = 'flex';
  haptic('success');
}
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
let _diaryStar = 3;
function setDiaryStar(n) {
  _diaryStar = n;
  const stars = document.getElementById('diaryStars');
  if (stars) {
    const spans = stars.querySelectorAll('span');
    spans.forEach((s, i) => { s.classList.toggle('on', i < n); });
  }
}
function openDiaryModal() {
  _diaryStar = 3;
  document.getElementById('diaryPlace').value = '';
  document.getElementById('diaryDesc').value = '';
  document.getElementById('diaryLesson').value = '';
  setDiaryStar(3);
  document.getElementById('diaryModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeDiaryModal() {
  document.getElementById('diaryModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}
function saveDiaryEntry() {
  const place = document.getElementById('diaryPlace').value.trim();
  const desc = document.getElementById('diaryDesc').value.trim();
  const lesson = document.getElementById('diaryLesson').value.trim();
  if (!place && !desc) { showToast('❌ Напиши хотя бы место или описание', 'error'); return; }
  const diary = getDiary();
  diary.unshift({
    id: Date.now(),
    date: todayStr(),
    place, desc, lesson,
    rating: _diaryStar,
    ts: Date.now()
  });
  saveDiary(diary);
  closeDiaryModal();
  renderDiary();
  showToast('📓 Запись сохранена!', 'success');
  haptic('success');
}
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
