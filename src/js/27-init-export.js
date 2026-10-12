// ====== INIT ======
async function init() {
  document.getElementById('inputDate').value = todayStr();
  setDifficulty(difficulty, false);

  // Сначала возвращаем потерянный XP локально
  restoreLostXPOnce();

  // ═══ ФАЗА 1: мгновенный рендер из localStorage (0 сетевых запросов) ═══
  try {
    const local = uGet('lt_tracker', null);
    if (local && Array.isArray(local.shifts)) {
      shifts = local.shifts.filter(s => !isProgressRow(s)).map(enrichShift);
    }
  } catch(e) { console.warn('Local load:', e); }

  activeShift = uGet('lt_active_shift', null);
  const savedDiff = uGetRaw('lt_difficulty');
  if (savedDiff && savedDiff !== difficulty) setDifficulty(savedDiff, false);

  if (activeShift) { renderActiveShift(); startTimer(); }
  else { renderActiveShift(); }

  render();
  renderLifeQuests();
  renderLifeStats();
  renderMotivationTip();
  calInit();
  checkAndGrantBonuses();
  loadSavedTheme();
  checkWeeklyFreeChoice();
  renderVersionTag();
  renderCloudSyncTag();
  applyRoleToUI();

  // UI готов — убираем лоадер СРАЗУ
  hideLoading();

  // ═══ ФАЗА 2: фоновая синхронизация с облаком ═══
  syncCloud();
}

async function syncCloud() {
  if (!sb) return;
  try {
    // Загружаем смены из облака
    try {
      const login = currentUser ? currentUser.login : '';
      const { data, error } = await sb.from('shifts').select('*').order('date', { ascending: false });
      if (!error && data) {
        const myShifts = data.filter(s => {
          const tag = extractUserTag(s.note);
          if (tag) return tag === login;
          return currentUser && currentUser.role === 'dev';
        });
        shifts = myShifts.filter(s => !isProgressRow(s)).map(enrichShift);
        mergePendingIntoShifts();
        backupToLocal();
        setSyncStatus('ok', '☁️ Синхронизировано');
        render();
      }
    } catch(e) { console.error('Cloud shifts:', e); setSyncStatus('error', '❌ Облако недоступно'); }

    // Доливаем офлайн-очередь
    try { await flushPendingShifts(); } catch(e) { console.error('Flush:', e); }

    // Подтягиваем прогресс
    try {
      const changed = await pullProgress();
      if (changed) {
        // Перечитываем данные после синка
        activeShift = uGet('lt_active_shift', null);
        const d = uGetRaw('lt_difficulty');
        if (d && d !== difficulty) setDifficulty(d, false);
        if (activeShift) { renderActiveShift(); startTimer(); }
        else { renderActiveShift(); }
        render();
        renderLifeQuests();
        renderLifeStats();
        renderCloudSyncTag();
        window.dispatchEvent(new Event('lt:data-changed')); // Svelte-модули перечитают localStorage
        applyRoleToUI();
      }
    } catch(e) { console.error('Progress pull:', e); }

    pushProgress();
  } catch(e) { console.error('syncCloud:', e); }
}

// Честно говорим, работает ли облако. Если таблица app_state не создана,
// прогресс остаётся только на этом устройстве — и в установленной PWA
// (у неё отдельное хранилище) XP будет отличаться от браузера.
function renderCloudSyncTag() {
  const el = document.getElementById('cloudSyncTag');
  if (!el) return;
  if (cloudStateOk) {
    el.className = 'build-sync ok';
    el.textContent = progressBackend === 'shifts'
      ? '☁️ прогресс в облаке (shifts)'
      : '☁️ прогресс в облаке';
  } else {
    el.className = 'build-sync warn';
    el.textContent = '⚠️ только на устройстве';
  }
}

// FIX: бесплатный выбор категории раз в неделю никто не показывал — теперь напоминаем.
// v9.9.3: один раз за неделю, а не при каждом запуске — тост на каждом старте только раздражал.
function checkWeeklyFreeChoice() {
  const wc = getWeeklyCategoryChoice();
  if (wc.used) return;
  try { if (uGet('lt_weekly_cat_hint', '') === wc.week) return; uSet('lt_weekly_cat_hint', wc.week); } catch (e) {}
  setTimeout(() => showToast('🎁 ЖИЗНЬ → Направление заданий: бесплатный выбор на этой неделе', 'success'), 1800);
}

// FIX: возврат в приложение после сна телефона — досинхронизируем и обновляем экран
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    flushPendingShifts().catch(e => console.error(e));
    // Досинхронизируем прогресс: в установленной PWA страница живёт долго,
    // без этого XP, заработанный в браузере, тут бы не появился.
    pullProgress().then(changed => {
      if (changed) { renderLifeQuests(); renderLifeStats(); render(); window.dispatchEvent(new Event('lt:data-changed')); }
      renderCloudSyncTag();
    }).catch(e => console.error(e));
    if (activeShift) { updateTimer(); renderQuests(); }
  }
});
window.addEventListener('online', () => {
  showToast('🌐 Соединение восстановлено — синхронизация', 'success');
  setSyncStatus('syncing', '⏳ Синхронизация...');
  flushPendingShifts().catch(e => console.error(e));
});
window.addEventListener('offline', () => {
  showToast('📴 Нет подключения — автономный режим', 'warn');
  setSyncStatus('warn', '📴 Офлайн');
});

// Старт БЕЗ сети: события 'offline' не будет (оно уже случилось до загрузки),
// и индикатор остался бы на статическом «☁️ Облако». Выставляем явно.
if (!navigator.onLine) setSyncStatus('warn', '📴 Офлайн');

// ====== DIFFICULTY ======
function setDifficulty(diff, doRender = true) {
  difficulty = diff;
  uSetRaw('lt_difficulty', diff);
  schedulePushProgress();
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('active', b.dataset.diff === diff));
  if (doRender) render();
}

// ====== ADD SHIFT ======
async function addShift() {
  const date = document.getElementById('inputDate').value;
  const hours = parseFloat(document.getElementById('inputHours').value);
  const earned = parseFloat(document.getElementById('inputEarned').value);
  const note = document.getElementById('inputNote').value.trim();

  if (!date || !hours || !earned || hours <= 0 || earned <= 0) {
    document.querySelector('.btn-add').style.animation = 'shake 0.4s ease';
    setTimeout(() => document.querySelector('.btn-add').style.animation = '', 400);
    showToast('Заполните дату, часы и заработок', 'error');
    return;
  }

  if (shifts.some(s => s.date === date)) {
    if (!await askConfirm(`Смена на ${date} уже есть. Добавить ещё одну?`, { icon: '📋', title: 'Дубль смены' })) return;
  }

  const btn = document.getElementById('btnAdd');
  btn.disabled = true;
  btn.textContent = '⏳ Сохраняю...';

  const extra = readMetaInputs('input');
  const ok = await insertShift({ date, hours, earned, note });

  btn.disabled = false;
  btn.textContent = '➕ ДОБАВИТЬ';

  if (ok) {
    if (extra.expenses || extra.units) {
      mergeShiftMeta({ date, hours, earned }, extra);
      const saved = shifts.find(x => x.date === date && x.hours === hours && x.earned === earned);
      if (saved) enrichShift(saved);
    }
    document.getElementById('inputExpenses').value = '';
    document.getElementById('inputUnits').value = '';
    document.getElementById('inputHours').value = '';
    document.getElementById('inputEarned').value = '';
    document.getElementById('inputNote').value = '';
    const coinCount = getShopOwned('rain_upgrade') ? Math.min(Math.floor(earned / 300), 50) : Math.min(Math.floor(earned / 500), 30);
    rainCoins(coinCount);
    render();
    closeManualAdd();
    switchTab('live');
    setTimeout(() => checkAndGrantBonuses(), 800);
  }
}

// ====== COIN RAIN ======
function rainCoins(count) {
  const container = document.getElementById('coinRain');
  const coins = ['🪙', '💰', '💵', '✨'];
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const coin = document.createElement('div');
      coin.className = 'coin';
      coin.textContent = coins[Math.floor(Math.random() * coins.length)];
      coin.style.left = Math.random() * 100 + '%';
      coin.style.animationDuration = (1 + Math.random() * 1.5) + 's';
      coin.style.fontSize = (20 + Math.random() * 20) + 'px';
      container.appendChild(coin);
      setTimeout(() => coin.remove(), 3000);
    }, i * 80);
  }
}

// ====== DATA EXPORT ======
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportDataCSV() {
  if (!shifts.length) { showToast('Нет смен для экспорта', 'warn'); return; }
  const rows = [['Дата', 'Часы', 'Заработок', 'Ставка', 'Заметка']];
  for (const s of [...shifts].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([s.date, s.hours, s.earned, s.rate, (s.displayNote || stripUserTag(s.note) || '').replace(/"/g, '""')]);
  }
  const { totalEarned: totalE, totalHours: totalH } = getShiftTotals();
  rows.push(['ИТОГО', totalH.toFixed(1), totalE, totalH > 0 ? Math.round(totalE / totalH) : 0, '']);
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n');
  downloadFile(`life_tracker_shifts_${todayStr()}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('📤 CSV-файл скачан', 'success');
}

function exportDataJSON() {
  const dump = {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    shifts,
    pending: getPendingShifts(),
    difficulty,
    lifeXP: getLifeXP(),
    shopPurchases: getShopPurchases(),
    calendarPlan: getCalendarPlan(),
    activeTheme: uGetRaw('lt_active_theme') || null,
    shiftBonuses: uGet('lt_shift_bonuses', {}),
    chosenCategory: uGet('lt_chosen_category', {}),
    weeklyCat: uGet('lt_weekly_cat', {}),
    shopBoosts: uGet('lt_shop_boosts', {}),
    monthGoal: getMonthGoal(),
    chartMode: chartMode
  };
  downloadFile(`life_tracker_backup_${todayStr()}.json`, JSON.stringify(dump, null, 2), 'application/json');
  showToast('💾 Резервная копия скачана', 'success');
}

// FIX: бэкап можно было СКАЧАТЬ, но нельзя было ЗАГРУЗИТЬ обратно —
// при потере localStorage файл был бесполезен. Теперь есть импорт.
function openImportPicker() {
  // Импорт перезатирает прогресс целиком — только разработчик.
  if (!requirePerm('importData', '🔒 Восстановление из бэкапа — только с устройства разработчика')) return;
  const inp = document.getElementById('importFile');
  if (inp) { inp.value = ''; inp.click(); }
}

async function handleImportFile(ev) {
  if (!requirePerm('importData', '🔒 Восстановление из бэкапа — только с устройства разработчика')) return;
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  try {
    const dump = JSON.parse(await file.text());

    if (dump.lifeXP) {
      const merged = mergeLifeXP(uGetRaw('lt_life_xp'), JSON.stringify(dump.lifeXP));
      uSetRaw('lt_life_xp', merged);
    }
    if (dump.shopPurchases) uSet('lt_shop_purchases', dump.shopPurchases);
    if (dump.calendarPlan) localStorage.setItem(uKey('lt_calendar_plan'), JSON.stringify(dump.calendarPlan));
    if (dump.activeTheme) uSetRaw('lt_active_theme', dump.activeTheme);
    if (dump.difficulty) uSetRaw('lt_difficulty', dump.difficulty);
    if (dump.shiftBonuses) uSet('lt_shift_bonuses', dump.shiftBonuses);
    if (dump.chosenCategory) uSet('lt_chosen_category', dump.chosenCategory);
    if (dump.weeklyCat) uSet('lt_weekly_cat', dump.weeklyCat);
    if (dump.shopBoosts) uSet('lt_shop_boosts', dump.shopBoosts);
    if (dump.monthGoal) localStorage.setItem(uKey('lt_month_goal'), String(dump.monthGoal));
    if (dump.chartMode) localStorage.setItem(uKey('lt_chart_mode'), String(dump.chartMode));

    // смены доливаем в облако только те, которых ещё нет
    let added = 0;
    if (Array.isArray(dump.shifts)) {
      for (const s of dump.shifts) {
        const dup = shifts.some(x => x.date === s.date && x.hours == s.hours && x.earned == s.earned);
        if (!dup) { await insertShift(s); added++; }
      }
    }

    await pushProgress();
    loadSavedTheme();
    render();
    renderLifeQuests();
    renderLifeStats();
    renderChart();
    showToast(`✅ Восстановлено: XP ${getLifeXP().total}, смен +${added}`, 'success');
  } catch (e) {
    console.error('Import error:', e);
    showToast('❌ Не смог прочитать файл бэкапа', 'error');
  }
}

// Ручное восстановление XP было кнопкой в UI — убрал: в готовом приложении
// читерская «задать XP» ломает смысл прогресса. Оставляю функцию доступной
// из консоли на случай аварийного восстановления.
async function manualRestoreXP(value) {
  const cur = getLifeXP();
  if (value === undefined) {
    const result = await askForm([
      { key: 'xp', label: 'Сколько всего Life XP?', type: 'number', value: String(cur.total || 0) }
    ], { icon: '⚡', title: 'Восстановить XP', okText: 'Установить' });
    if (!result) return;
    value = result.xp;
  }
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) { showToast('Нужно число', 'warn'); return;  }
  const data = getLifeXP();
  data.total = n;
  saveLifeXP(data);
  renderLifeStats();
  render();
  showToast(`✅ Life XP восстановлен: ${n}`, 'success');
}

