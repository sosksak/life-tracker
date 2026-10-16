// v9.15: карточки «⚡ ЭФФЕКТИВНОСТЬ» (#effCard) и «📈 АНАЛИТИКА» (#waCard) переехали в Svelte —
// src/svelte/work/Efficiency.svelte, Analytics.svelte, eff.svelte.js. window.EFF с прежним API
// (render/setPeriod/setMetric) регистрирует app/bundle.js (src/svelte/main.js). Старый IIFE — в _archive/31-eff-legacy.js.

function getShiftTotals() {
  if (_shiftCache.len === shifts.length) return _shiftCache;
  const totalEarned = shifts.reduce((s, x) => s + x.earned, 0);
  const totalHours = shifts.reduce((s, x) => s + x.hours, 0);
  _shiftCache = { len: shifts.length, totalEarned, totalHours, avgRate: totalHours > 0 ? Math.round(totalEarned / totalHours) : 0 };
  return _shiftCache;
}
// v9.6.2: баланс кошелька = смены + прочие доходы − расходы смен − записанные расходы (± корректировки)
function getWalletBalance() {
  const { totalEarned } = getShiftTotals();
  const shiftExp = shifts.reduce((a, s) => a + (s.expenses || 0), 0);
  let txInc = 0, txExp = 0, adj = 0;
  try {
    (FINANCE.getTransactions() || []).forEach(t => {
      const a = +t.amount || 0;
      if (t.category === 'adjust') adj += t.type === 'income' ? a : -a;
      else if (t.type === 'income') txInc += a;
      else txExp += a;
    });
  } catch (e) {}
  return { balance: totalEarned + txInc + adj - shiftExp - txExp, totalEarned, shiftExp, txInc, txExp, adj };
}
// v9.6.3: единый расчёт месяца "чистыми": смены + прочие доходы − расходы смен − расходы/корректировки из «Деньги».
// Этим пользуются цель месяца, прогноз, дашборд и FINANCE — чтобы все вкладки сходились в одну цифру.
function getMonthNet(prefix) {
  if (!prefix) { const n = new Date(); prefix = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; }
  const ms = (shifts || []).filter(x => x.date && x.date.startsWith(prefix));
  const shiftEarned = ms.reduce((a, x) => a + (x.earned || 0), 0);
  const shiftExp = ms.reduce((a, x) => a + (x.expenses || 0), 0);
  let txInc = 0, txExp = 0, adj = 0; const byCat = {};
  try {
    (FINANCE.getTransactions() || []).forEach(t => {
      if (!t.date || !t.date.startsWith(prefix)) return;
      const a = +t.amount || 0;
      if (t.category === 'adjust') adj += t.type === 'income' ? a : -a;
      else if (t.type === 'income') txInc += a;
      else { txExp += a; byCat[t.category || 'other'] = (byCat[t.category || 'other'] || 0) + a; }
    });
  } catch (e) {}
  if (!uGet('lt_goal_use_adjust', true)) adj = 0; // настройка: учитывать ли корректировку в цели
  const gross = shiftEarned + txInc;
  const spent = shiftExp + txExp;
  return { n: ms.length, shiftEarned, shiftExp, txInc, txExp, adj, byCat, gross, spent, net: gross - spent + adj,
           avgNetPerShift: ms.length ? (shiftEarned - shiftExp) / ms.length : 0 };
}
async function editWalletBalance() {
  const w = getWalletBalance();
  const res = await askForm([
    { key: 'amount', label: 'Сколько денег есть на самом деле, ₽', type: 'number', placeholder: String(Math.round(w.balance)), value: Math.round(w.balance) },
  ], { icon: '⚖️', title: 'Изменить баланс', okText: 'Сохранить', text: 'Разница запишется корректировкой во вкладке «Деньги». Смены и история не меняются.' });
  if (!res || res.amount === '' || res.amount == null) return;
  const target = Math.round(parseFloat(res.amount));
  if (isNaN(target)) { showToast('Нужно число', 'warn'); return; }
  const diff = target - Math.round(w.balance);
  if (!diff) { showToast('Баланс уже такой', 'info'); return; }
  FINANCE.addAdjustment(diff);
  showToast(`⚖️ Баланс скорректирован: ${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('ru-RU')} ₽`, 'success');
  haptic('light');
  invalidateShiftCache();
  render();
  try { if (typeof renderStats === 'function') renderStats(); } catch (e) {}
}
function invalidateShiftCache() { _shiftCache.len = -1; _streakCache.key = ''; try { STATS.invalidateHeatmap(); } catch (e) {} }

// --- Debounced render to avoid rapid re-renders ---
let _renderTimer = null;
function scheduleRender() {
  if (_renderTimer) return;
  _renderTimer = requestAnimationFrame(() => { _renderTimer = null; render(); });
}

// --- Enhanced render with countUp ---
const _origRender = render;
render = function() {
  _origRender();
  try { EFF.render(); } catch (e) { console.warn('EFF', e); }
  // countUp баланса делает сам Wallet.svelte ($effect) — здесь повтор не нужен (v9.11)
  // Only render heavy stats widgets when stats tab is active
  const statsActive = document.getElementById('contentStats')?.classList.contains('active');
  const liveActive = document.getElementById('contentLive')?.classList.contains('active');
  // v9.4: скрытые пользователем карточки не считаем вовсе
  if (liveActive || statsActive) {
    try { CARDS.render(); } catch (e) { console.warn('CARDS', e); }  // v9.16: Svelte; скрытые V93 карточки не считает сам
  }
  if (statsActive) {
    if (!_hid('contentStats', '#weekCompare')) renderWeekCompare();
    if (!_hid('contentStats', '#heatmapSection')) renderHeatmap();
    if (!_hid('contentStats', '#diarySection')) renderDiary();
  }
  checkNewAchievements();
};

// --- Add Focus button to shift controls ---
const _origRenderActiveShift = renderActiveShift;
renderActiveShift = function() {
  _origRenderActiveShift();
  if (activeShift) {
    // Add focus button if not exists
    const controls = document.querySelector('.shift-controls');
    if (controls && !document.getElementById('btnFocus')) {
      const btn = document.createElement('button');
      btn.id = 'btnFocus';
      btn.className = 'shift-ctrl-btn';
      btn.style.cssText = 'background:var(--primary);color:#fff;border:none;';
      btn.textContent = '🎯 ФОКУС';
      btn.onclick = openFocusMode;
      controls.appendChild(btn);
    }
    updateLiveRate();
  } else {
    updateLiveRate(); // v9.21: без смены стор LIVE прячет #liveRateDisplay (раньше — style.display='none' напрямую)
  }
};

// --- Enhanced endShift to show summary ---
const _origSaveEndShift = saveEndShift;
saveEndShift = async function() {
  const earnedInput = document.getElementById('endShiftEarned');
  const earned = parseInt(earnedInput.value) || 0;
  const workHours = pendingEndShift ? pendingEndShift.hours : 0;
  const rate = workHours > 0 ? Math.round(earned / workHours) : 0;
  await _origSaveEndShift();
  // Show summary if shift was saved
  if (!activeShift && earned > 0) {
    setTimeout(() => showDailySummary(earned, workHours, rate), 500);
  }
};

// --- Add Kopilka setup to FAB menu ---
setTimeout(() => {
  const fabMenu = document.querySelector('.fab-menu');
  if (fabMenu) {
    // v9.9.2: «Цель» и «Колесо» переехали в меню «Ещё»
    const focusBtn = document.createElement('button');
    focusBtn.className = 'fab-item';
    focusBtn.onclick = openFocusMode;
    focusBtn.innerHTML = '<span class="fab-icon">🎯</span><span class="fab-label">Режим фокуса</span>';
    fabMenu.appendChild(focusBtn);
  }
}, 100);

// --- Add haptic to buttons ---
document.addEventListener('click', function(e) {
  const btn = e.target.closest('button');
  if (btn) haptic('light');
});

// --- Pull-to-Refresh (PWA) ---
{
  let ptrStartY = 0, ptrActive = false;
  const PTR_THRESHOLD = 80;
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0 && !document.body.classList.contains('modal-open')) {
      ptrStartY = e.touches[0].clientY;
      ptrActive = true;
    }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!ptrActive) return;
    const dy = e.touches[0].clientY - ptrStartY;
    if (dy > PTR_THRESHOLD && window.scrollY === 0) {
      document.getElementById('ptrIndicator').classList.add('show');
    }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!ptrActive) return;
    ptrActive = false;
    const ind = document.getElementById('ptrIndicator');
    if (ind.classList.contains('show')) {
      syncCloud().then(() => {
        render(); renderLifeQuests(); renderLifeStats();
        showToast('☁️ Данные обновлены', 'success');
      }).catch(() => {}).finally(() => {
        ind.classList.remove('show');
      });
    }
  }, { passive: true });
}

// Update quests every 30 seconds (for timer-based ones)
setInterval(() => { if (activeShift) renderQuests(); }, 30000);


// ╔══════════════════════════════════════════════════════════════════════╗
// ║  LIFE & WORK TRACKER v6.0 — PART 1: NEW MODULES                   ║
// ║  Dashboard · Habits · Health · Finance · Crypto                    ║
// ║                                                                    ║
// ║  Интеграция: uGet/uSet (профиль-изоляция), schedulePushProgress,  ║
// ║  markLocalChange, showToast, haptic, escapeHtml, todayStr,         ║
// ║  localDateStr, parseLocalDate, askConfirm, askForm, countUp        ║
// ╚══════════════════════════════════════════════════════════════════════╝

