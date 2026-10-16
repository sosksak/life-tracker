// АРХИВ (не собирается). updateLiveRate() и showDailySummary() из 30-global-update-v5.js до v9.21 — теперь src/svelte/work/live.svelte.js + Summary.svelte.
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
