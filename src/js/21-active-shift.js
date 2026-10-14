// ====== ACTIVE SHIFT ======
function startShift() {
  activeShift = {
    startTime: Date.now(),
    breaks: [],
    currentBreak: null,
    status: 'working'
  };
  saveActiveShift();
  renderActiveShift();
  startTimer();
  showToast('🚀 Смена начата. Продуктивного дня!', 'success');
}

// Счётчик заказов прямо в смене: по кнопке, без ввода руками в конце.
function bumpUnits(d) {
  if (!activeShift) return;
  activeShift.units = Math.max(0, (activeShift.units || 0) + d);
  saveActiveShift();
  renderUnitsCounter();
  if (typeof EFF !== 'undefined') EFF.render();
  if (typeof haptic === 'function') haptic('light');
}
function renderUnitsCounter() {
  // v9.11: счётчик рисует ActiveShift.svelte — здесь только толчок реактивности
  if (window.WORK) WORK.render();
}

function startBreak() {
  if (window.WORK) WORK.showBreakPicker(true);
}

function confirmBreak(type) {
  if (!activeShift) return;
  activeShift.currentBreak = { type, start: Date.now(), end: null };
  activeShift.status = 'break';
  saveActiveShift();
  renderActiveShift();
  showToast(`☕ Перерыв: ${type}`, 'warn');
}

function endBreak() {
  if (!activeShift || !activeShift.currentBreak) return;
  activeShift.currentBreak.end = Date.now();
  activeShift.breaks.push({...activeShift.currentBreak});
  activeShift.currentBreak = null;
  activeShift.status = 'working';
  saveActiveShift();
  renderActiveShift();
  showToast('💪 Работа продолжена', 'success');
}

function endShift() {
  if (!activeShift) return;
  // If on break, end it first
  if (activeShift.currentBreak) {
    activeShift.currentBreak.end = Date.now();
    activeShift.breaks.push({...activeShift.currentBreak});
    activeShift.currentBreak = null;
  }

  const endTime = Date.now();
  const totalMs = endTime - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + (b.end - b.start), 0);
  const workMs = totalMs - breakMs;
  const workHours = Math.round((workMs / 3600000) * 10) / 10;

  const breakSummary = activeShift.breaks.map(b => b.type + ' ' + formatShortDuration(b.end - b.start)).join(', ');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  // Store pending data for modal
  pendingEndShift = {
    units: activeShift.units || 0,
    date: `${yyyy}-${mm}-${dd}`,
    hours: workHours,
    totalMs: totalMs,
    breakMs: breakMs,
    breakSummary: breakSummary,
    breakCount: activeShift.breaks.length,
    startTime: activeShift.startTime,
    endTime: endTime
  };

  // Show end-shift modal
  document.getElementById('endShiftInfo').innerHTML =
    `⏱ Чистая работа: <b>${workHours} ч</b><br>` +
    `🕐 Всего на смене: ${formatShortDuration(totalMs)}<br>` +
    (breakMs > 0 ? `☕ Перерывов: ${activeShift.breaks.length} (${formatShortDuration(breakMs)})` : '☕ Без перерывов');
  document.getElementById('endShiftEarned').value = '';
  document.getElementById('endShiftUnits').value = pendingEndShift.units ? String(pendingEndShift.units) : '';
  document.getElementById('endShiftExpenses').value = '';
  document.getElementById('endShiftNote').value = breakSummary ? `Перерывы: ${breakSummary}` : '';
  document.getElementById('endShiftModal').classList.add('show');
  document.body.classList.add('modal-open');

  // Focus earned input
  setTimeout(() => document.getElementById('endShiftEarned').focus(), 300);
}

function cancelEndShift() {
  document.getElementById('endShiftModal').classList.remove('show');
  document.body.classList.remove('modal-open');
  pendingEndShift = null;
  // Don't clear activeShift — shift continues
  showToast('Смена продолжается', 'warn');
}

async function saveEndShift() {
  if (!pendingEndShift) return;
  const earned = parseFloat(document.getElementById('endShiftEarned').value);
  if (!earned || earned <= 0) {
    showToast('Укажите сумму заработка', 'error');
    document.getElementById('endShiftEarned').focus();
    return;
  }

  const note = document.getElementById('endShiftNote').value.trim();
  const btn = document.getElementById('btnSaveEndShift');
  btn.disabled = true;
  btn.textContent = '⏳ Сохранение...';

  const ok = await insertShift({
    date: pendingEndShift.date,
    hours: pendingEndShift.hours,
    earned: earned,
    note: note
  });

  // Перерывы считались в endShift() и раньше просто выбрасывались.
  if (ok) {
    const extra = readMetaInputs('endShift');
    putShiftMeta({ date: pendingEndShift.date, hours: pendingEndShift.hours, earned: earned }, {
      totalMs: pendingEndShift.totalMs,
      breakMs: pendingEndShift.breakMs,
      breakCount: pendingEndShift.breakCount,
      breakSummary: pendingEndShift.breakSummary,
      startTime: pendingEndShift.startTime,
      endTime: pendingEndShift.endTime,
      expenses: extra.expenses,
      units: extra.units
    });
    const saved = shifts.find(x => x.date === pendingEndShift.date && x.hours === pendingEndShift.hours && x.earned === earned);
    if (saved) enrichShift(saved);
    document.getElementById('endShiftExpenses').value = '';
    document.getElementById('endShiftUnits').value = '';
    const t = shifts.find(s => s.date === pendingEndShift.date && s.earned === earned);
    if (t) enrichShift(t);
  }

  btn.disabled = false;
  btn.textContent = '💾 СОХРАНИТЬ';

  const _hrs = pendingEndShift ? pendingEndShift.hours : 0;
  if (ok) {
    // Close modal
    document.getElementById('endShiftModal').classList.remove('show');
  document.body.classList.remove('modal-open');

    // Clear active shift
    activeShift = null;
    saveActiveShift();
    clearInterval(timerInterval);
    pendingEndShift = null;

    renderActiveShift();
    const coinCount = getShopOwned('rain_upgrade') ? Math.min(Math.floor(earned / 300), 50) : Math.min(Math.floor(earned / 500), 30);
    rainCoins(coinCount);
    render();
    const _ph = FX.shiftPhrase(earned, _hrs);
    if (earned >= 5000 || /Монстр|воин/.test(_ph)) FX.big(earned >= 10000 ? 40 : 15); else haptic('medium');
    showToast(_ph, 'success');

    // Check for bonus rewards from shift quests
    setTimeout(() => checkAndGrantBonuses(), 800);
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();
}

function updateTimer() {
  if (!activeShift) return;
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  const workMs = totalMs - breakMs;

  document.getElementById('timerDisplay').textContent = formatDuration(workMs);

  if (activeShift.status === 'break') {
    const breakDur = now - activeShift.currentBreak.start;
    document.getElementById('timerSub').textContent = `☕ Перерыв: ${activeShift.currentBreak.type} (${formatShortDuration(breakDur)})`;
  } else {
    document.getElementById('timerSub').textContent = `🟢 В работе | Всего: ${formatDuration(totalMs)} | Перерывы: ${formatShortDuration(breakMs)}`;
  }
}

// v9.11: панель смены живёт в src/svelte/work/ActiveShift.svelte.
// Здесь остались только побочные эффекты, которых у компонента нет:
// WORK.render() обновляет классы/видимость/перерывы, а таймер и ассистент
// по-прежнему пишут текст в #timerDisplay / #v8Assist (их хуки не тронуты).
function renderActiveShift() {
  if (!window.WORK) return;          // бандл ещё не загрузился
  WORK.showBreakPicker(false);       // бывший breakTypeSelector.style.display = 'none'
  WORK.render();
  if (!activeShift) {
    const td = document.getElementById('timerDisplay');
    const ts = document.getElementById('timerSub');
    if (td) td.textContent = '00:00:00';
    if (ts) ts.textContent = 'Нажмите «Начать смену»';
  }
}

