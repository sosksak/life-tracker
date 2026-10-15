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

// --- Week Comparison ---
function renderWeekCompare() {
  const el = document.getElementById('weekCompare');
  if (shifts.length < 2) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);

  function weekData(from, to) {
    const ws = shifts.filter(s => {
      const dp = s.date.split('-');
      const d = new Date(parseInt(dp[0]), parseInt(dp[1])-1, parseInt(dp[2]));
      return d >= from && d < to;
    });
    return {
      shifts: ws.length,
      earned: ws.reduce((s, x) => s + x.earned, 0),
      hours: Math.round(ws.reduce((s, x) => s + x.hours, 0) * 10) / 10,
      rate: ws.reduce((s, x) => s + x.hours, 0) > 0
        ? Math.round(ws.reduce((s, x) => s + x.earned, 0) / ws.reduce((s, x) => s + x.hours, 0)) : 0
    };
  }

  const curr = weekData(monday, new Date(monday.getTime() + 7*86400000));
  const prev = weekData(prevMonday, monday);

  function deltaHtml(curr, prev, suffix = '') {
    const diff = curr - prev;
    if (diff === 0) return `<span class="wc-delta same">—</span>`;
    const cls = diff > 0 ? 'up' : 'down';
    const sign = diff > 0 ? '+' : '';
    return `<span class="wc-delta ${cls}">${sign}${typeof diff === 'number' && diff % 1 !== 0 ? diff.toFixed(1) : diff}${suffix}</span>`;
  }

  document.getElementById('weekCompareGrid').innerHTML = `
    <span class="wc-label">Смен</span><span class="wc-val">${curr.shifts}</span><span class="wc-prev">${prev.shifts}</span>${deltaHtml(curr.shifts, prev.shifts)}
    <span class="wc-label">Заработок</span><span class="wc-val">${curr.earned.toLocaleString('ru-RU')} ₽</span><span class="wc-prev">${prev.earned.toLocaleString('ru-RU')}</span>${deltaHtml(curr.earned, prev.earned)}
    <span class="wc-label">Часов</span><span class="wc-val">${curr.hours}</span><span class="wc-prev">${prev.hours}</span>${deltaHtml(curr.hours, prev.hours)}
    <span class="wc-label">Rate</span><span class="wc-val">${curr.rate} ₽/ч</span><span class="wc-prev">${prev.rate}</span>${deltaHtml(curr.rate, prev.rate)}
  `;
}

// --- Heatmap ---
let _heatmapLastKey = '';
function renderHeatmap() {
  const el = document.getElementById('heatmapSection');
  if (shifts.length < 1) { el.style.display = 'none'; return; }
  const hKey = shifts.length + ':' + (shifts[0]?.id || '') + ':' + (shifts[shifts.length-1]?.id || '');
  if (_heatmapLastKey === hKey) return;
  _heatmapLastKey = hKey;
  el.style.display = 'block';

  const grid = document.getElementById('heatmapGrid');
  const now = new Date(); now.setHours(0,0,0,0);
  const start = new Date(now); start.setDate(start.getDate() - 89);
  // Align to Monday
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

  // Build date->earned map
  const earnMap = {};
  shifts.forEach(s => { earnMap[s.date] = (earnMap[s.date] || 0) + s.earned; });
  const maxEarn = Math.max(...Object.values(earnMap), 1);

  // Weekday headers
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html = days.map(d => `<div class="heatmap-weekday">${d}</div>`).join('');

  const cur = new Date(start);
  while (cur <= now) {
    const key = localDateStr(cur);
    const earned = earnMap[key] || 0;
    const intensity = earned > 0 ? 0.2 + (earned / maxEarn) * 0.8 : 0;
    const color = earned > 0
      ? `rgba(56, 161, 105, ${intensity})`
      : '#F0F2F5';
    const title = earned > 0 ? `${key}: ${earned.toLocaleString('ru-RU')} ₽` : key;
    html += `<div class="heatmap-cell" style="background:${color}" title="${title}"></div>`;
    cur.setDate(cur.getDate() + 1);
  }
  grid.innerHTML = html;
}

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
function renderDiary() {
  const diary = getDiary();
  const list = document.getElementById('diaryList');
  const stats = document.getElementById('diaryStatsGrid');

  // Stats
  const total = diary.length;
  const thisWeek = diary.filter(d => {
    const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7)); mon.setHours(0,0,0,0);
    return d.ts >= mon.getTime();
  }).length;
  const avgRating = total > 0 ? (diary.reduce((s, d) => s + d.rating, 0) / total).toFixed(1) : '—';
  stats.innerHTML = `
    <div class="diary-stat-card"><div class="diary-stat-val">${total}</div><div class="diary-stat-lbl">всего записей</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">${thisWeek}</div><div class="diary-stat-lbl">за неделю</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">${avgRating}</div><div class="diary-stat-lbl">ср. оценка</div></div>
  `;

  // List (last 10)
  if (diary.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:16px;">Пока пусто — добавь первую запись!</div>';
    return;
  }
  list.innerHTML = diary.slice(0, 10).map(d => {
    const stars = renderStars(d.rating);
    const dp = d.date.split('-');
    const dateObj = new Date(parseInt(dp[0]), parseInt(dp[1])-1, parseInt(dp[2]));
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `<div class="diary-card">
      <div class="diary-card-top"><span class="diary-place">${escapeHtml(d.place || '—')}</span><span class="diary-date">${dateStr}</span></div>
      ${d.desc ? `<div class="diary-desc">${escapeHtml(d.desc)}</div>` : ''}
      <div class="diary-rating">${stars}</div>
      ${d.lesson ? `<div class="diary-lesson">💡 ${escapeHtml(d.lesson)}</div>` : ''}
    </div>`;
  }).join('');
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
