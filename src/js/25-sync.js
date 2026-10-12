// ====== SUPABASE OPS ======
async function loadShifts() {
  setSyncStatus('syncing', '⏳ Загрузка...');
  const login = currentUser ? currentUser.login : '';
  if (sb) {
    try {
      const { data, error } = await sb.from('shifts').select('*').order('date', { ascending: false });
      if (error) throw error;
      // Filter shifts by user: tagged shifts belong to their owner, untagged belong to dev (legacy)
      const myShifts = data.filter(s => {
        const tag = extractUserTag(s.note);
        if (tag) return tag === login;
        // Legacy rows (no tag) belong to the dev account
        return currentUser && currentUser.role === 'dev';
      });
      shifts = myShifts.filter(s => !isProgressRow(s)).map(enrichShift);
      mergePendingIntoShifts();
      backupToLocal();
      setSyncStatus('ok', '☁️ Синхронизировано');
      return;
    } catch (e) {
      console.error('Supabase load error:', e);
      setSyncStatus('error', '❌ Облако недоступно');
    }
  }
  try {
    const local = uGet('lt_tracker', null);
    if (local && Array.isArray(local.shifts)) {
      shifts = local.shifts.filter(s => !isProgressRow(s)).map(enrichShift);
      setSyncStatus('warn', '📱 Локальные данные');
      showToast('Загружены локальные данные', 'warn');
    }
  } catch(e2) { console.error('Local load error:', e2); }
}

// FIX: смены из офлайн-очереди раньше исчезали с экрана после перезагрузки страницы
function mergePendingIntoShifts() {
  const pending = getPendingShifts();
  for (const p of pending) {
    const { _queuedAt, ...payload } = p;
    const dup = shifts.some(s => s.date === payload.date && s.hours == payload.hours && s.earned == payload.earned);
    if (!dup) shifts.push(enrichShift({ ...payload, id: 'local_' + (_queuedAt || Date.now()), _pending: true }));
  }
  shifts.sort((a, b) => b.date.localeCompare(a.date));
}

async function insertShift(shift) {
  setSyncStatus('syncing', '⏳ Сохранение...');
  const login = currentUser ? currentUser.login : '';
  const payload = {
    date: shift.date, hours: shift.hours, earned: shift.earned,
    note: injectUserTag(shift.note || '', login), difficulty: difficulty
  };
  if (sb) {
    try {
      const { data, error } = await sb.from('shifts').insert([payload]).select();
      if (error) throw error;
      const s = enrichShift(data[0]);
      shifts.unshift(s);
      shifts.sort((a, b) => b.date.localeCompare(a.date));
      backupToLocal();
      setSyncStatus('ok', '☁️ Сохранено ✓');
      return true;
    } catch (e) {
      console.error('Insert error:', e);
    }
  }
  // FIX: раньше смена просто ТЕРЯЛАСЬ, если облако недоступно.
  // Теперь кладём в локальную очередь и доливаем в Supabase при следующем запуске.
  queuePendingShift(payload);
  const localShift = enrichShift({ ...payload, id: 'local_' + Date.now(), _pending: true });
  shifts.unshift(localShift);
  shifts.sort((a, b) => b.date.localeCompare(a.date));
  backupToLocal();
  setSyncStatus('warn', '📱 Сохранено локально');
  showToast('Сервер недоступен — смена сохранена локально, синхронизируется позже', 'warn');
  return true;
}

// ====== OFFLINE QUEUE ======
function getPendingShifts() {
  try { return uGet('lt_pending_shifts', []); } catch(e) { return []; }
}
function queuePendingShift(payload) {
  const q = getPendingShifts();
  q.push({ ...payload, _queuedAt: Date.now() });
  uSet('lt_pending_shifts', q);
}
async function flushPendingShifts() {
  const q = getPendingShifts();
  if (!q.length || !sb) return;
  const login = currentUser ? currentUser.login : '';
  const stillPending = [];
  let synced = 0;
  for (const item of q) {
    const { _queuedAt, ...payload } = item;
    // Ensure user tag in note for pending shifts
    if (login && !extractUserTag(payload.note)) {
      payload.note = injectUserTag(payload.note, login);
    }
    try {
      // Защита от дублей: смена могла уйти в облако, а ответ потеряться
      // по дороге (обрыв сети) — тогда повторная заливка создала бы копию.
      const { data: exist } = await sb.from('shifts').select('id')
        .eq('date', payload.date).eq('hours', payload.hours).eq('earned', payload.earned).limit(1);
      if (exist && exist.length) { synced++; continue; }

      const { error } = await sb.from('shifts').insert([payload]);
      if (error) throw error;
      synced++;
    } catch (e) {
      console.error('Flush error:', e);
      stillPending.push(item);
    }
  }
  uSet('lt_pending_shifts', stillPending);
  if (synced > 0) {
    showToast(`☁️ Синхронизировано: ${synced} ${synced === 1 ? 'смена' : 'смен'}`, 'success');
    await loadShifts();
    render();
  }
}


async function updateShift(id, updates) {
  if (typeof id === 'string' && id.startsWith('local_')) {
    showToast('Смена ещё не в облаке — дождись синхронизации', 'warn');
    return false;
  }
  setSyncStatus('syncing', '⏳ Обновление...');
  if (!sb) { setSyncStatus('error', '❌ Нет соединения'); showToast('Supabase недоступен', 'error'); return false; }
  try {
    const { data, error } = await sb.from('shifts').update(updates).eq('id', id).select();
    if (error) throw error;
    const idx = shifts.findIndex(s => s.id === id);
    if (idx >= 0) {
      shifts[idx] = enrichShift(data[0]);
    }
    shifts.sort((a, b) => b.date.localeCompare(a.date));
    backupToLocal();
    setSyncStatus('ok', '☁️ Обновлено ✓');
    return true;
  } catch (e) {
    console.error('Update error:', e);
    setSyncStatus('error', '❌ Ошибка обновления');
    showToast('Ошибка обновления', 'error');
    return false;
  }
}

async function removeShift(id) {
  if (!requirePerm('deleteShifts', '🔒 Удалять смены может только разработчик')) return;
  if (!await askConfirm('Удалить эту смену?', { icon: '🗑️', title: 'Удаление смены' })) return;
  // FIX: локальную (не синхронизированную) смену удаляем из очереди, а не из облака
  if (typeof id === 'string' && id.startsWith('local_')) {
    const target = shifts.find(s => s.id === id);
    if (target) {
      const q = getPendingShifts().filter(p =>
        !(p.date === target.date && p.hours == target.hours && p.earned == target.earned));
      uSet('lt_pending_shifts', q);
    }
    shifts = shifts.filter(s => s.id !== id);
    backupToLocal();
    showToast('Смена удалена', 'success');
    render();
    return;
  }
  setSyncStatus('syncing', '⏳ Удаление...');
  if (!sb) { setSyncStatus('error', '❌ Нет соединения'); return; }
  try {
    const { error } = await sb.from('shifts').delete().eq('id', id);
    if (error) throw error;
    shifts = shifts.filter(s => s.id !== id);
    backupToLocal();
    setSyncStatus('ok', '☁️ Удалено ✓');
    showToast('Смена удалена', 'success');
    render();
  } catch (e) {
    console.error('Delete error:', e);
    setSyncStatus('error', '❌ Ошибка удаления');
    showToast('Ошибка удаления', 'error');
  }
}

function backupToLocal() {
  invalidateShiftCache();
  try { uSet('lt_tracker', { shifts, difficulty }); } catch(e) {}
}

// ====== PROGRESS SYNC (v4.1) ======
// ПРИЧИНА БАГА: весь прогресс (лайф-XP, покупки, темы, планы) жил ТОЛЬКО в
// localStorage. localStorage привязан к конкретному браузеру/контейнеру, поэтому
// запуск как отдельное приложение (или другой браузер / переустановка) открывал
// ПУСТОЕ хранилище — XP и уровень выглядели «сброшенными».
// Лечение: прогресс уезжает в облако и подтягивается на любом устройстве.

const PROGRESS_KEYS = [
  'lt_shift_meta',
  'lt_month_goal',
  'lt_life_xp',
  'lt_shop_purchases',
  'lt_shop_boosts',
  'lt_active_theme',
  'lt_calendar_plan',
  'lt_shift_bonuses',
  'lt_weekly_cat',
  'lt_chosen_category',
  'lt_difficulty',
  'lt_active_shift',
  'lt_life_quests',
  // Профили доступа: должны быть в облаке, иначе на новом телефоне экран
  // входа покажет пустой список и войти будет некуда.
  'lt_auth_accounts'
];

// Ключи, где значение — накопительный набор: объединяем, а не перетираем.
// Покупки в магазине нельзя терять: купил тему на телефоне, зашёл с ноута —
// обе покупки должны остаться.
const PROGRESS_UNION_KEYS = ['lt_shop_purchases', 'lt_shift_meta'];

// Когда локальное значение последний раз менялось (на этом устройстве).
// Без этого облако умеет только «залить, если локально пусто», и любое
// изменение на втором устройстве молча терялось.
function markLocalChange() {
  try { localStorage.setItem('lt_progress_ts', String(Date.now())); } catch (e) {}
}
function getLocalTs() {
  return parseInt(localStorage.getItem('lt_progress_ts') || '0', 10) || 0;
}

// Где хранится прогресс в облаке:
//   1) таблица app_state — правильный вариант (нужен один раз применённый SQL);
//   2) если её нет — служебная строка в уже существующей таблице shifts.
// Второй путь нужен потому, что создать таблицу анонимным ключом нельзя, а
// прогресс обязан быть общим для установленного приложения и сайта: у PWA
// отдельный localStorage, и без облака XP расходится.
// Служебная строка: date = PROGRESS_ROW_DATE, note = JSON прогресса.
// Она отфильтрована из истории, статистики и календаря (см. isProgressRow).
const PROGRESS_ROW_DATE = '1970-01-01';
const PROGRESS_ROW_TAG = '__PROGRESS__';

let cloudStateOk = false;
let progressBackend = null;   // 'app_state' | 'shifts' | null
let progressRowId = null;

function isProgressRow(s) {
  return !!s && (s.date === PROGRESS_ROW_DATE ||
                 (typeof s.note === 'string' && s.note.startsWith(PROGRESS_ROW_TAG)));
}

function collectProgress() {
  const out = {};
  for (const k of PROGRESS_KEYS) {
    const v = localStorage.getItem(k);
    // null отправляем ЯВНО — это значит «ключ удалён». Иначе облако хранило бы
    // старое значение и, например, завершённая смена возвращалась бы из облака.
    out[k] = v;
  }
  out.__ts = getLocalTs();
  return out;
}

// Объединение словарей-наборов (покупки): true побеждает отсутствие.
function mergeUnion(localRaw, cloudRaw) {
  let a = {}, b = {};
  try { a = JSON.parse(localRaw || '{}'); } catch (e) {}
  try { b = JSON.parse(cloudRaw || '{}'); } catch (e) {}
  if (typeof a !== 'object' || a === null) a = {};
  if (typeof b !== 'object' || b === null) b = {};
  return JSON.stringify(Object.assign({}, b, a));
}

// Слияние XP. По умолчанию берём максимум — чтобы устройство с пустым
// localStorage не затёрло накопленный прогресс.
// НО если это устройство заведомо свежее облака (preferLocal), доверяем его
// total: иначе снятая галочка квеста возвращала бы XP назад из облака.
function mergeLifeXP(localRaw, cloudRaw, preferLocal = false) {
  let a = {}, b = {};
  try { a = JSON.parse(localRaw || '{}'); } catch(e) {}
  try { b = JSON.parse(cloudRaw || '{}'); } catch(e) {}

  const hist = Array.from(new Set([...(a.history || []), ...(b.history || [])]));
  const cats = {};
  for (const src of [a.cats || {}, b.cats || {}]) {
    for (const [k, v] of Object.entries(src)) cats[k] = Math.max(cats[k] || 0, v || 0);
  }

  const hasLocal = localRaw !== null && localRaw !== undefined && a && typeof a.total === 'number';
  const total = (preferLocal && hasLocal) ? a.total : Math.max(a.total || 0, b.total || 0);

  return JSON.stringify({
    total,
    cats: (preferLocal && hasLocal && a.cats) ? a.cats : cats,
    history: hist.slice(-500),
    questsDone: (preferLocal && hasLocal) ? (a.questsDone || 0) : Math.max(a.questsDone || 0, b.questsDone || 0),
    daysDone: Math.max(a.daysDone || 0, b.daysDone || 0),
    lastDay: (a.lastDay || '') > (b.lastDay || '') ? a.lastDay : b.lastDay
  });
}

// Объединение списков профилей по логину. Побеждает запись с более поздним
// createdAt/updatedAt — чтобы смена пароля на одном устройстве не откатывалась
// старой копией из облака.
function mergeAccounts(localRaw, cloudRaw) {
  let a = [], b = [];
  try { a = JSON.parse(localRaw || '[]'); } catch (e) {}
  try { b = JSON.parse(cloudRaw || '[]'); } catch (e) {}
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];

  const byLogin = {};
  for (const acc of [...b, ...a]) {
    if (!acc || !acc.login) continue;
    const key = String(acc.login).toLowerCase();
    const prev = byLogin[key];
    if (!prev) { byLogin[key] = acc; continue; }
    // Побеждает более поздняя версия записи. Надгробие (deleted) — такая же
    // версия со своим временем, поэтому удаление корректно разъезжается по
    // устройствам, а повторное создание логина его перебивает.
    const tPrev = prev.updatedAt || prev.createdAt || 0;
    const tCur  = acc.updatedAt  || acc.createdAt  || 0;
    if (tCur >= tPrev) byLogin[key] = acc;
  }
  return JSON.stringify(Object.values(byLogin));
}

function applyProgress(cloud) {
  if (!cloud || typeof cloud !== 'object') return false;
  let changed = false;

  // Кто свежее: это устройство или облако. PROGRESS_KEYS без своей стратегии
  // слияния разруливаются по времени последнего изменения.
  const cloudTs = parseInt(cloud.__ts || 0, 10) || 0;
  const cloudIsNewer = cloudTs > getLocalTs();

  for (const k of PROGRESS_KEYS) {
    const cloudVal = cloud[k];
    if (cloudVal === undefined) continue;
    const localVal = localStorage.getItem(k);

    // Облако говорит «удалено» и оно свежее — убираем и у себя.
    if (cloudVal === null) {
      // ИСКЛЮЧЕНИЕ: профили доступа никогда не удаляем по команде облака.
      // Иначе старый клиент без профилей мог бы снести список аккаунтов и
      // запереть вход на всех устройствах.
      if (k === AUTH_KEYS.accounts) continue;
      if (cloudIsNewer && localVal !== null) { localStorage.removeItem(k); changed = true; }
      continue;
    }

    // Профили объединяем по логину: аккаунт, созданный на другом устройстве,
    // должен появиться здесь, а локальный (возможно со свежим паролем) — выжить.
    if (k === AUTH_KEYS.accounts) {
      const merged = mergeAccounts(localVal, cloudVal);
      if (merged !== localVal) { localStorage.setItem(k, merged); changed = true; }
      continue;
    }

    if (k === 'lt_life_xp') {
      // Локальное свежее облака → доверяем ему (снятие галочки = минус XP).
      const merged = mergeLifeXP(localVal, cloudVal, !cloudIsNewer);
      if (merged !== localVal) { localStorage.setItem(k, merged); changed = true; }
      continue;
    }

    if (PROGRESS_UNION_KEYS.includes(k)) {
      const merged = mergeUnion(localVal, cloudVal);
      if (merged !== localVal) { localStorage.setItem(k, merged); changed = true; }
      continue;
    }

    // Пусто локально — всегда берём облако. Иначе — только если облако свежее.
    if (localVal === null || (cloudIsNewer && cloudVal !== localVal)) {
      localStorage.setItem(k, cloudVal);
      changed = true;
    }
  }

  if (cloudIsNewer && cloudTs) {
    try { localStorage.setItem('lt_progress_ts', String(cloudTs)); } catch (e) {}
  }
  return changed;
}

async function pullProgress() {
  if (!sb) return false;

  // 1) штатный путь — таблица app_state
  try {
    const { data, error } = await sb.from('app_state').select('value').eq('key', 'progress').maybeSingle();
    if (error) throw error;
    cloudStateOk = true;
    progressBackend = 'app_state';
    if (data && data.value) return applyProgress(data.value);
    return false;
  } catch (e) {
    console.warn('app_state unavailable, using shifts row:', e.message || e);
  }

  // 2) фолбэк — служебная строка в shifts
  try {
    const { data, error } = await sb.from('shifts')
      .select('id,note').eq('date', PROGRESS_ROW_DATE)
      .eq('difficulty', currentUser ? currentUser.login : 'dev')
      .order('id', { ascending: true });
    if (error) throw error;
    cloudStateOk = true;
    progressBackend = 'shifts';

    const rows = data || [];
    if (!rows.length) { progressRowId = null; return false; }

    // если из-за гонки записей строк несколько — оставляем первую, лишние убираем
    progressRowId = rows[0].id;
    if (rows.length > 1) {
      const extra = rows.slice(1).map(r => r.id);
      sb.from('shifts').delete().in('id', extra).then(() => {}, () => {});
    }

    const raw = String(rows[0].note || '');
    if (!raw.startsWith(PROGRESS_ROW_TAG)) return false;
    return applyProgress(JSON.parse(raw.slice(PROGRESS_ROW_TAG.length)));
  } catch (e) {
    cloudStateOk = false;
    progressBackend = null;
    console.warn('Progress pull skipped:', e.message || e);
    return false;
  }
}

let pushTimer = null;
function schedulePushProgress() {
  markLocalChange();   // штамп ставим всегда, даже если облака нет
  if (!sb) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushProgress, 1200);
}

async function pushProgress() {
  if (!sb) return;
  const payload = collectProgress();

  // 1) штатный путь
  if (progressBackend !== 'shifts') {
    try {
      const { error } = await sb.from('app_state')
        .upsert({ key: 'progress', value: payload, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      cloudStateOk = true;
      progressBackend = 'app_state';
      renderCloudSyncTag();
      return;
    } catch (e) {
      console.warn('app_state push failed, using shifts row:', e.message || e);
    }
  }

  // 2) фолбэк в shifts
  try {
    const note = PROGRESS_ROW_TAG + JSON.stringify(payload);
    const userDiff = currentUser ? currentUser.login : 'dev';
    const row = { date: PROGRESS_ROW_DATE, hours: 0, earned: 0, note, difficulty: userDiff };

    if (progressRowId == null) {
      // не затираем чужую строку: сначала ищем существующую
      const { data: found } = await sb.from('shifts').select('id').eq('date', PROGRESS_ROW_DATE).eq('difficulty', userDiff).limit(1);
      if (found && found.length) progressRowId = found[0].id;
    }

    if (progressRowId != null) {
      const { error } = await sb.from('shifts').update({ note }).eq('id', progressRowId);
      if (error) throw error;
    } else {
      const { data, error } = await sb.from('shifts').insert(row).select('id').single();
      if (error) throw error;
      progressRowId = data.id;
    }
    cloudStateOk = true;
    progressBackend = 'shifts';
    renderCloudSyncTag();
  } catch (e) {
    cloudStateOk = false;
    console.warn('Progress push skipped:', e.message || e);
    renderCloudSyncTag();
  }
}

function setSyncStatus(type, text) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status ' + type;
  el.textContent = text;
  clearTimeout(setSyncStatus._t);
  if (type === 'ok') setSyncStatus._t = setTimeout(() => { if (el.classList.contains('ok')) el.classList.add('mini'); }, 4000);
}

// v7.2.0: свежесть сборки гарантирует сам воркер до отдачи страницы (sw.js),
// versionGate оставлен как точка расширения и резолвится сразу.
let uiShown = false;
function hideLoading() {
  const go = () => {
    if (uiShown) return;
    uiShown = true;
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.style.display = 'none', 500); }
    // v7.1.2: навигация становится видимой только вместе с интерфейсом (см. CSS body.splash)
    document.body.classList.remove('splash');
  };
  (window.versionGate || Promise.resolve()).then(go, go);
}

