// ====== RENDER ======
function render() {
  const goal = DIFFICULTIES[difficulty].goal;
  const { totalEarned, totalHours, avgRate } = getShiftTotals();

  // v9.11: кошелёк (#wallet) рисует src/svelte/work/Wallet.svelte —
  // баланс, подпись, уровень, тренд и три счётчика считаются в его сторе.
  if (window.WORK) WORK.render();

  // Уровень в разделе «Ещё» считается от тех же очков (смены + часы)
  const xp = calcGrindXP(shifts.length, totalHours);
  let currentLevel = LEVELS[0], nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) { currentLevel = LEVELS[i]; nextLevel = LEVELS[i + 1] || null; break; }
  }

  // Title
  const activeTitle = getActiveTitle();
  const subtitleEl = document.querySelector('.header .subtitle');
  if (subtitleEl && activeTitle) {
    subtitleEl.textContent = `${activeTitle} · Трекер продуктивности`;
  }

  // Level
  document.getElementById('levelIcon').textContent = currentLevel.icon;
  document.getElementById('levelName').textContent = `LVL ${currentLevel.lvl} — ${currentLevel.name}`;
  document.getElementById('levelTitle').textContent = currentLevel.title;
  if (nextLevel) {
    const progress = ((xp - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100;
    document.getElementById('xpFill').style.width = Math.min(progress, 100) + '%';
    document.getElementById('xpText').textContent = `${xp.toLocaleString('ru-RU')} / ${nextLevel.xp.toLocaleString('ru-RU')} XP`;
  } else {
    document.getElementById('xpFill').style.width = '100%';
    document.getElementById('xpText').textContent = 'МАКСИМАЛЬНЫЙ УРОВЕНЬ';
  }

  // Streak
  const streak = calcStreak(goal);
  const streakBar = document.getElementById('streakBar');
  if (streak > 0) { streakBar.style.display = 'flex'; document.getElementById('streakCount').textContent = streak; }
  else { streakBar.style.display = 'none'; }

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
  // Chart
  renderChart();
  // Month goal / forecast / dow / records
  renderMonthGoal();
  if (!_hid('contentStats', 'chart-section:3')) renderDowStats();
  if (!_hid('contentStats', 'chart-section:4')) renderRecords();
  // Calendar
  renderCalendar();
}

// ====== ЦЕЛЬ МЕСЯЦА / ПРОГНОЗ / ДНИ НЕДЕЛИ / РЕКОРДЫ ======
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

function renderMonthGoal() {
  const el = document.getElementById('monthGoalCard');
  if (!el) return;
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthShifts = shifts.filter(s => s.date && s.date.startsWith(prefix));
  const earned = monthShifts.reduce((a, s) => a + s.earned, 0);
  const hours = monthShifts.reduce((a, s) => a + s.hours, 0);
  const monthExp = monthShifts.reduce((a, s) => a + (s.expenses || 0), 0);
  const monthUnits = monthShifts.reduce((a, s) => a + (s.units || 0), 0);
  const mn = getMonthNet(prefix);
  const net = Math.round(mn.net);

  // Средняя чистая смена: по этому месяцу, иначе по всей истории.
  const avgPerShift = monthShifts.length
    ? mn.avgNetPerShift
    : (shifts.length ? (getShiftTotals().totalEarned - shifts.reduce((a, s) => a + (s.expenses || 0), 0)) / shifts.length : 0);

  // Прогноз: уже заработано + запланированные в календаре будущие смены.
  const plan = getCalendarPlan();
  const todayS = todayStr();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let plannedAhead = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${prefix}-${String(d).padStart(2, '0')}`;
    // ВАЖНО: календарь хранит запланированную смену как 'planned'
    // (см. calMarkSelected). Раньше здесь сравнивалось с 'shift' — условие
    // никогда не выполнялось и прогноз всегда равнялся уже заработанному.
    if (plan[key] === 'planned' && (key > todayS || (key === todayS && !monthShifts.some(s => s.date === todayS)))) plannedAhead++;
  }
  // Если план не отмечен — прогноз по текущему темпу (смен/день), иначе — по плану
  const daysLeftF = daysInMonth - now.getDate();
  const paceShifts = plannedAhead > 0 ? plannedAhead : Math.round((monthShifts.length / Math.max(1, now.getDate())) * daysLeftF);
  const forecast = Math.round(net + paceShifts * avgPerShift);
  const forecastHow = paceShifts > 0
    ? `${net.toLocaleString('ru-RU')} ₽ чистыми + ${paceShifts} ${pluralShifts(paceShifts)} × ~${Math.round(avgPerShift).toLocaleString('ru-RU')} ₽ ${plannedAhead > 0 ? '(по календарю)' : '(по текущему темпу)'}`
    : 'только факт — отметь смены в календаре 📋 ниже, и прогноз их учтёт';

  const goal = getMonthGoal();
  const pct = goal ? Math.max(0, Math.min(100, (net / goal) * 100)) : 0;
  const left = goal ? Math.max(0, goal - net) : 0;
  const shiftsLeft = (goal && avgPerShift > 0) ? Math.ceil(left / avgPerShift) : 0;

  const goalBlock = goal ? `
    <div class="chart-sub">
      <div><div class="big">${net.toLocaleString('ru-RU')} ₽</div><div class="lbl">чистыми из ${goal.toLocaleString('ru-RU')} ₽</div></div>
      <div style="text-align:right;"><div class="big">${Math.round(pct)}%</div><div class="lbl">${left > 0 ? 'осталось ' + left.toLocaleString('ru-RU') + ' ₽' : 'цель взята! 🎉'}</div></div>
    </div>
    <div class="xp-bar" style="margin:4px 0 10px;"><div class="xp-fill" style="width:${pct}%"></div></div>
    ${left > 0 && shiftsLeft ? `<div class="mg-note">≈ ещё ${shiftsLeft} ${pluralShifts(shiftsLeft)} до цели</div>` : ''}
  ` : `<div class="mg-note">Цель не задана — нажмите «Изменить», чтобы установить план на месяц</div>`;

  el.innerHTML = `
    ${goalBlock}
    <div class="mg-forecast">
      <div class="mg-row"><span>📊 Прогноз к концу месяца</span><b>${forecast.toLocaleString('ru-RU')} ₽</b></div>
      <div class="mg-note" style="margin:-2px 0 6px;opacity:.8">${forecastHow}</div>
      <div class="mg-row"><span>📋 Отработано смен</span><b>${monthShifts.length} · ${hours.toFixed(1)} ч</b></div>
      <div class="mg-row"><span>💰 Доход за месяц</span><b>${Math.round(mn.gross).toLocaleString('ru-RU')} ₽${mn.txInc ? ` <span class="rec-date">смены ${earned.toLocaleString('ru-RU')} + прочее ${Math.round(mn.txInc).toLocaleString('ru-RU')}</span>` : ''}</b></div>
      ${mn.spent ? `<div class="mg-row"><span>💸 Расходы</span><b>−${Math.round(mn.spent).toLocaleString('ru-RU')} ₽${monthExp ? ` <span class="rec-date">в сменах ${monthExp.toLocaleString('ru-RU')}</span>` : ''}</b></div>` : ''}
      ${mn.adj ? `<div class="mg-row"><span>⚖️ Корректировка баланса</span><b>${mn.adj > 0 ? '+' : '−'}${Math.abs(Math.round(mn.adj)).toLocaleString('ru-RU')} ₽</b></div>` : ''}
      ${goalImpactHtml(mn, earned, monthExp)}
      ${monthUnits ? `<div class="mg-row"><span>📦 Заказов за месяц</span><b>${monthUnits} · ${hours > 0 ? Math.round(monthUnits / hours * 10) / 10 : 0}/ч</b></div>` : ''}
      <div class="mg-row"><span>📅 Запланировано впереди</span><b>${plannedAhead ? plannedAhead + ' ' + pluralShifts(plannedAhead) : '<span style="color:var(--accent);cursor:pointer" onclick="document.getElementById(\'calGrid\')?.scrollIntoView({behavior:\'smooth\',block:\'center\'})">отметить в календаре ›</span>'}</b></div>
    </div>`;
}

// v9.7: прозрачность цели — что в неё входит, что нет
function goalImpactHtml(mn, shiftEarned, shiftExp) {
  const f = v => Math.round(Math.abs(v)).toLocaleString('ru-RU');
  const cats = (typeof FINANCE !== 'undefined' && FINANCE.EXPENSE_CATEGORIES) || {};
  const topCats = Object.entries(mn.byCat || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const useAdj = uGet('lt_goal_use_adjust', true);
  const rows = [
    `<div class="gi-row plus"><span>Доход со смен</span><b>+${f(shiftEarned)}</b></div>`,
    mn.txInc ? `<div class="gi-row plus"><span>Прочие доходы (Деньги)</span><b>+${f(mn.txInc)}</b></div>` : '',
    shiftExp ? `<div class="gi-row minus"><span>Расходы в сменах (топливо и т.п.)</span><b>−${f(shiftExp)}</b></div>` : '',
    ...topCats.map(([k, v]) => `<div class="gi-row minus"><span>${(cats[k] || {}).icon || '📋'} ${(cats[k] || {}).name || k}</span><b>−${f(v)}</b></div>`),
    (mn.txExp - topCats.reduce((a, c) => a + c[1], 0)) > 0 ? `<div class="gi-row minus"><span>Остальные расходы</span><b>−${f(mn.txExp - topCats.reduce((a, c) => a + c[1], 0))}</b></div>` : '',
    `<div class="gi-row ${mn.adj >= 0 ? 'plus' : 'minus'}" style="${useAdj ? '' : 'opacity:.5;text-decoration:line-through'}"><span>⚖️ Корректировка баланса</span><b>${mn.adj >= 0 ? '+' : '−'}${f(mn.adj)}</b></div>`,
  ].filter(Boolean).join('');
  const net = Math.round(mn.net);
  return `<details class="gi" ontoggle="haptic('light')">
    <summary>🔍 Что влияет на цель <span class="gi-net">= ${net.toLocaleString('ru-RU')} ₽ чистыми</span></summary>
    <div class="gi-body">
      ${rows}
      <label class="gi-opt"><input type="checkbox" ${useAdj ? 'checked' : ''} onchange="uSet('lt_goal_use_adjust', this.checked); markLocalChange(); render(); try{renderStats()}catch(e){}"> учитывать корректировку баланса в цели</label>
      <div class="gi-no"><b>Не влияют:</b> XP и бонусы квестов, запланированные (ещё не отработанные) смены, крипто-портфель, копилка. Только реальные деньги: пришло − ушло.</div>
      <div class="gi-no">💡 Каждый расход, записанный в «Деньги», отодвигает цель. Хочешь закрыть 100к — считай, сколько тратишь, а не только сколько заработал.</div>
    </div>
  </details>`;
}

function pluralShifts(n) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'смен';
  if (b === 1) return 'смена';
  if (b >= 2 && b <= 4) return 'смены';
  return 'смен';
}

function renderDowStats() {
  const el = document.getElementById('dowCard');
  if (!el) return;
  if (!shifts.length) { el.innerHTML = `<div class="mg-note">Нет данных — добавьте первую смену</div>`; return; }
  const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const buckets = names.map(() => ({ earned: 0, hours: 0, count: 0 }));
  for (const s of shifts) {
    if (!s.date) continue;
    const p = s.date.split('-');
    let dow = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).getDay() - 1;
    if (dow < 0) dow = 6;
    buckets[dow].earned += s.earned;
    buckets[dow].hours += s.hours;
    buckets[dow].count++;
  }
  const rates = buckets.map(b => b.hours > 0 ? Math.round(b.earned / b.hours) : 0);
  const maxRate = Math.max(...rates, 1);
  const bestRate = Math.max(...rates);
  el.innerHTML = names.map((n, i) => {
    const b = buckets[i], r = rates[i];
    const pct = (r / maxRate) * 100;
    const cls = r > 0 && r === bestRate ? 'is-top' : (r === 0 ? 'is-zero' : '');
    return `<div class="dow-row ${cls}">
      <span class="dow-name">${n}</span>
      <div class="dow-bar"><div class="dow-fill" style="width:${pct}%"></div></div>
      <span class="dow-val">${r ? r.toLocaleString('ru-RU') + ' ₽/ч' : '—'}</span>
      <span class="dow-cnt">${b.count || ''}</span>
    </div>`;
  }).join('');
}

function renderRecords() {
  const el = document.getElementById('recordsCard');
  if (!el) return;
  if (!shifts.length) { el.innerHTML = `<div class="mg-note">Рекорды появятся после первой смены</div>`; return; }
  const bestEarn = shifts.reduce((a, s) => s.earned > a.earned ? s : a, shifts[0]);
  const bestRate = shifts.reduce((a, s) => s.rate > a.rate ? s : a, shifts[0]);
  const longest = shifts.reduce((a, s) => s.hours > a.hours ? s : a, shifts[0]);
  const bestStreak = calcBestStreak(DIFFICULTIES[difficulty].goal);
  const withUnits = shifts.filter(s => s.units > 0);
  const bestUnits = withUnits.length ? withUnits.reduce((a, s) => s.units > a.units ? s : a, withUnits[0]) : null;
  const totalExp = shifts.reduce((a, s) => a + (s.expenses || 0), 0);
  const fmtD = d => { const p = d.split('-'); return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2])).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }); };
  el.innerHTML = `
    <div class="mg-row"><span>💰 Лучшая смена</span><b>${bestEarn.earned.toLocaleString('ru-RU')} ₽ <span class="rec-date">${fmtD(bestEarn.date)}</span></b></div>
    <div class="mg-row"><span>💎 Лучшая ставка</span><b>${bestRate.rate.toLocaleString('ru-RU')} ₽/ч <span class="rec-date">${fmtD(bestRate.date)}</span></b></div>
    <div class="mg-row"><span>⏱ Самая долгая смена</span><b>${longest.hours} ч <span class="rec-date">${fmtD(longest.date)}</span></b></div>
    <div class="mg-row"><span>🔥 Лучший страйк</span><b>${bestStreak} ${bestStreak === 1 ? 'день' : 'дней'}</b></div>
    ${bestUnits ? `<div class="mg-row"><span>📦 Больше всего заказов</span><b>${bestUnits.units} <span class="rec-date">${fmtD(bestUnits.date)}</span></b></div>` : ''}
    ${totalExp ? `<div class="mg-row"><span>💸 Расходы за всё время</span><b>${totalExp.toLocaleString('ru-RU')} ₽ <span class="rec-date">чистыми ${(getShiftTotals().totalEarned - totalExp).toLocaleString('ru-RU')} ₽</span></b></div>` : ''}`;
}

// Лучший страйк за всю историю (calcStreak считает только текущий).
function calcBestStreak(goal) {
  const dateMap = {};
  for (const s of shifts) {
    if (!dateMap[s.date] || s.rate > dateMap[s.date]) dateMap[s.date] = s.rate;
  }
  const dates = Object.keys(dateMap).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of dates) {
    const p = d.split('-');
    const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    const consecutive = prev && Math.round((dt - prev) / 86400000) === 1;
    if (dateMap[d] >= goal) {
      cur = consecutive ? cur + 1 : 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
    prev = dt;
  }
  return best;
}

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

// ====== ГРАФИК ЗАРАБОТКА ======
// Сутки группируем по локальной дате (не UTC) — иначе ночные смены
// уезжали бы на соседний столбик.
let chartMode = parseInt(localStorage.getItem(uKey('lt_chart_mode')) || '7', 10);
if (![7, 14, 30].includes(chartMode)) chartMode = 7;

function setChartMode(days) {
  chartMode = days;
  localStorage.setItem(uKey('lt_chart_mode'), String(days));
  [7, 14, 30].forEach(d => {
    const b = document.getElementById('chartMode' + d);
    if (b) b.classList.toggle('active', d === days);
  });
  renderChart();
}

function renderChart() {
  const body = document.getElementById('chartBody');
  if (!body) return;

  // держим подсветку переключателя в соответствии с сохранённым режимом
  [7, 14, 30].forEach(d => {
    const b = document.getElementById('chartMode' + d);
    if (b) b.classList.toggle('active', d === chartMode);
  });

  const goal = DIFFICULTIES[difficulty].goal;
  const days = chartMode;

  // сумма заработка и часов по каждой локальной дате
  const byDate = {};
  for (const s of shifts) {
    if (!byDate[s.date]) byDate[s.date] = { earned: 0, hours: 0 };
    byDate[s.date].earned += s.earned;
    byDate[s.date].hours += s.hours;
  }

  // строим ось: последние N дней, включая сегодня
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    const rec = byDate[key] || { earned: 0, hours: 0 };
    buckets.push({
      date: d,
      key,
      earned: rec.earned,
      hours: rec.hours,
      rate: rec.hours > 0 ? Math.round(rec.earned / rec.hours) : 0,
      isToday: i === 0
    });
  }

  const total = buckets.reduce((s, b) => s + b.earned, 0);
  const workedDays = buckets.filter(b => b.earned > 0).length;
  const avg = workedDays > 0 ? Math.round(total / workedDays) : 0;

  document.getElementById('chartTotal').textContent = total.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('chartAvg').textContent = avg.toLocaleString('ru-RU') + ' ₽';
  document.getElementById('chartPeriodLbl').textContent =
    `за ${days} дн. · смен: ${workedDays}`;

  if (total === 0) {
    body.innerHTML = `<div class="chart-empty">Нет данных за этот период<br>Добавьте смену — появится график</div>`;
    return;
  }

  const max = Math.max(...buckets.map(b => b.earned));
  // на 30 днях подписи над каждым столбиком не влезут — показываем только на 7
  const showVals = days <= 7;
  // подписи оси: на 14/30 днях прореживаем, иначе каша
  const labelEvery = days <= 7 ? 1 : (days <= 14 ? 2 : 5);

  const barsHtml = buckets.map(b => {
    const h = max > 0 ? Math.max((b.earned / max) * 100, b.earned > 0 ? 6 : 0) : 0;
    let cls = 'empty';
    if (b.earned > 0) cls = b.rate >= goal ? 'hit' : 'miss';
    const valTxt = b.earned > 0 ? Math.round(b.earned / 1000) + 'к' : '';
    const valHtml = (showVals && b.earned > 0)
      ? `<div class="chart-val">${valTxt}</div>` : '';
    const title = b.earned > 0
      ? `${b.key}: ${b.earned.toLocaleString('ru-RU')} ₽ / ${b.hours.toFixed(1)} ч / ${b.rate} ₽ в час`
      : `${b.key}: выходной`;
    return `<div class="chart-bar-wrap" title="${title}">
      ${valHtml}
      <div class="chart-bar ${cls}" style="height:${h}%"></div>
    </div>`;
  }).join('');

  const labelsHtml = buckets.map((b, i) => {
    const show = (i % labelEvery === 0) || b.isToday;
    const txt = show
      ? (days <= 7
          ? b.date.toLocaleDateString('ru-RU', { weekday: 'short' })
          : b.date.getDate())
      : '';
    return `<div class="chart-xlabel ${b.isToday ? 'today' : ''}">${txt}</div>`;
  }).join('');

  const dense = days > 7 ? ' dense' : '';
  body.innerHTML = `
    <div class="chart-bars${dense}">${barsHtml}</div>
    <div class="chart-xaxis${dense}">${labelsHtml}</div>
    <div class="chart-legend">
      <span><i style="background:var(--green)"></i> цель достигнута</span>
      <span><i style="background:#CBD5E0"></i> ниже цели</span>
    </div>
  `;
}



// ===== АРХИВ v9.19: хвост render() — Achievements (#achGrid) + History (#shiftList) =====
// Теперь src/svelte/stats/Achievements.svelte, History.svelte + computeAchievements/computeHistory в store.svelte.js.

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

