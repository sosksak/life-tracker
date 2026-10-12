// ====== CONSTANTS ======
// Уровни: раньше считались от заработанных РУБЛЕЙ (LVL10 = 5 000 000 ₽ ≈ 1000 смен,
// то есть годы — прогресс-бар стоял на месте и ничего не мотивировал).
// Теперь очки опыта = смены и часы: shifts*100 + hours*10.
// Одна смена (~9ч) ≈ 190 очков, LVL10 = 100 смен — достижимо и ощутимо.
const LEVEL_PER_SHIFT = 100;
const LEVEL_PER_HOUR = 10;
function calcGrindXP(shiftCount, totalHours) {
  return Math.round(shiftCount * LEVEL_PER_SHIFT + totalHours * LEVEL_PER_HOUR);
}

const LEVELS = [
  { lvl:1, name:'Стажёр',          icon:'📋', title:'Начало карьеры',       xp:0 },
  { lvl:2, name:'Специалист',      icon:'📦', title:'Адаптация пройдена',   xp:600 },
  { lvl:3, name:'Ведущий специалист', icon:'📊', title:'Уверенный профессионал', xp:1500 },
  { lvl:4, name:'Старший специалист', icon:'👔', title:'Высокая квалификация',  xp:2900 },
  { lvl:5, name:'Эксперт',         icon:'🏅', title:'Мастер своего дела',   xp:4800 },
  { lvl:6, name:'Менеджер',        icon:'🏢', title:'Управление процессами', xp:7200 },
  { lvl:7, name:'Руководитель',    icon:'💼', title:'Стратегическое мышление', xp:10000 },
  { lvl:8, name:'Директор',        icon:'🎩', title:'Первый миллион',       xp:13300 },
  { lvl:9, name:'Вице-президент', icon:'🏛️', title:'Масштабирование',      xp:16000 },
  { lvl:10,name:'CEO',             icon:'👑', title:'Вершина карьеры',      xp:19000 },
];

const DIFFICULTIES = { easy:{goal:800}, normal:{goal:850}, hard:{goal:900} };

const ACHIEVEMENTS = [
  { id:'first',   icon:'⭐',  name:'Первый рабочий день', check:d=>d.shifts.length>=1 },
  { id:'five',    icon:'🖐️', name:'5 смен',         check:d=>d.shifts.length>=5 },
  { id:'ten',     icon:'🔟',  name:'10 смен',        check:d=>d.shifts.length>=10 },
  { id:'thirty',  icon:'📅',  name:'30 смен',        check:d=>d.shifts.length>=30 },
  { id:'earn10k', icon:'💵',  name:'10К за день',    check:d=>d.shifts.some(s=>s.earned>=10000) },
  { id:'earn50k', icon:'💰',  name:'50К общий доход', check:d=>d.totalEarned>=50000 },
  { id:'earn100k',icon:'🤑',  name:'100К общий доход', check:d=>d.totalEarned>=100000 },
  { id:'earn500k',icon:'🏆',  name:'500К общий доход', check:d=>d.totalEarned>=500000 },
  { id:'rate900', icon:'🚀',  name:'900₽/час',       check:d=>d.shifts.some(s=>s.rate>=900) },
  { id:'rate1000',icon:'👑',  name:'1000₽/час',      check:d=>d.shifts.some(s=>s.rate>=1000) },
  { id:'streak3', icon:'🔥',  name:'3 дня подряд',   check:d=>d.streak>=3 },
  { id:'streak7', icon:'⚡',  name:'7 дней подряд',  check:d=>d.streak>=7 },
];

// ====== SHOP ITEMS ======
const SHOP_ITEMS = [
  // Бусты
  { id:'extra_reroll_1', icon:'🎲', name:'+1 замена задания', desc:'Замена 1 задания на новое сегодня', price:40, cat:'boost', consumable:true },
  { id:'extra_reroll_3', icon:'🎰', name:'+3 замены заданий', desc:'Пакет из 3 замен заданий на сегодня', price:100, cat:'boost', consumable:true },
  { id:'double_xp', icon:'⚡', name:'Двойной XP (1 день)', desc:'Все задания дают x2 XP сегодня', price:200, cat:'boost', consumable:true },
  { id:'cat_choice', icon:'🎯', name:'Направление заданий', desc:'Завтра 5 из 7 личных заданий — из выбранного направления (то же, что в разделе ЖИЗНЬ)', price:150, cat:'boost', consumable:true },
  // Расходники: покупаются многократно, чтобы XP не обесценивался после
  // выкупа всех тем и титулов (весь остальной магазин — разовый).
  { id:'streak_shield', icon:'🛡', name:'Защита серии', desc:'Серия не прервётся за пропущенный день', price:250, cat:'boost', consumable:true },
  { id:'mystery_box', icon:'🎁', name:'Бонусный пакет', desc:'Случайный бонус: XP, замены или усиление', price:120, cat:'boost', consumable:true },
  { id:'shift_reroll', icon:'🔄', name:'Замена задания смены', desc:'Заменить одно задание смены сегодня', price:80, cat:'boost', consumable:true },
  // Косметика
  { id:'title_grinder', icon:'💎', name:'Статус: Профессионал', desc:'Отображается в заголовке', price:300, cat:'cosmetic', consumable:false },
  { id:'title_legend', icon:'👑', name:'Статус: Легенда', desc:'Отображается в заголовке', price:500, cat:'cosmetic', consumable:false },
  { id:'title_beast', icon:'🦁', name:'Статус: Топ-перформер', desc:'Отображается в заголовке', price:400, cat:'cosmetic', consumable:false },
  { id:'title_sigma', icon:'🐺', name:'Статус: Элита', desc:'Отображается в заголовке', price:600, cat:'cosmetic', consumable:false },
  // Награды
  { id:'golden_border', icon:'✨', name:'Золотая рамка кошелька', desc:'Красивое свечение кошелька', price:250, cat:'reward', consumable:false },
  { id:'rain_upgrade', icon:'🌧️', name:'Усиленный дождь монет', desc:'Больше монет при сохранении смены', price:350, cat:'reward', consumable:false },
  { id:'custom_tip', icon:'📝', name:'Своя мотивация', desc:'Добавь свой совет в ротацию', price:200, cat:'reward', consumable:false },
  // Темы
  { id:'theme_neon', icon:'🌈', name:'Тема: Неон', desc:'Яркие неоновые акценты', price:150, cat:'theme', consumable:false },
  { id:'theme_ocean', icon:'🌊', name:'Тема: Океан', desc:'Глубокий синий с бирюзой', price:150, cat:'theme', consumable:false },
  { id:'theme_fire', icon:'🔥', name:'Тема: Пламя', desc:'Красно-оранжевые тона', price:150, cat:'theme', consumable:false },
  { id:'theme_forest', icon:'🌲', name:'Тема: Лес', desc:'Зелёные природные оттенки', price:150, cat:'theme', consumable:false },
  { id:'theme_sakura', icon:'🌸', name:'Тема: Сакура', desc:'Розовые тона и нежность', price:200, cat:'theme', consumable:false },
  { id:'theme_cyber', icon:'🤖', name:'Тема: Кибер', desc:'Матрица и кислотный зелёный', price:200, cat:'theme', consumable:false },
  { id:'theme_royal', icon:'👸', name:'Тема: Королевская', desc:'Фиолетово-золотая роскошь', price:250, cat:'theme', consumable:false },
  { id:'theme_midnight', icon:'🌙', name:'Тема: Полночь', desc:'Глубокий индиго с серебром', price:200, cat:'theme', consumable:false },
  { id:'theme_sunset', icon:'🌅', name:'Тема: Закат', desc:'От оранжевого к фиолетовому', price:200, cat:'theme', consumable:false },
  { id:'theme_hacker', icon:'💚', name:'Тема: Хакер', desc:'Зелёный терминал на чёрном', price:300, cat:'theme', consumable:false },
];

// ====== STATE ======
let shifts = [];
let difficulty = uGetRaw('lt_difficulty') || 'normal';

// Active shift state (stored in localStorage)
let activeShift = uGet('lt_active_shift', null);
let pendingEndShift = null; // data for end-shift modal

let timerInterval = null;

// ====== TAB SWITCHING ======
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
  if (tab === 'shop') renderShop();
  if (tab === 'stats') scheduleRender();
}

function openManualAdd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  document.getElementById('inputDate').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('manualAddModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeManualAdd() {
  document.getElementById('manualAddModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

function toggleFab() {
  document.getElementById('fabContainer').classList.toggle('open');
}

function openCalendarModal() {
  calInit();
  document.getElementById('calendarModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeCalendarModal() {
  document.getElementById('calendarModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

// Close FAB when clicking outside
document.addEventListener('click', function(e) {
  const fab = document.getElementById('fabContainer');
  if (fab && fab.classList.contains('open') && !fab.contains(e.target)) {
    fab.classList.remove('open');
  }
});

// ====== TOAST ======
function showToast(msg, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 2500);
}

// ====== HELPERS ======
// FIX: локальная дата вместо toISOString() — тот давал UTC и с 00:00 до 03:00 (МСК)
// приложение считало, что ещё «вчера»: квесты/реролы/бусты не сбрасывались вовремя.
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayStr() { return localDateStr(); }

function parseLocalDate(str) {
  const p = String(str).split('-');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

// ====== USER TAG IN NOTE ======
// We encode user_login as [user:xxx] at the END of the note field
// so each user sees only their shifts without needing a DB schema change.
function extractUserTag(note) {
  if (!note) return null;
  const m = note.match(/\[user:([^\]]+)\]$/);
  return m ? m[1] : null;
}
function injectUserTag(note, login) {
  if (!login) return note || '';
  // Remove any existing tag first
  const clean = (note || '').replace(/\s*\[user:[^\]]+\]$/, '');
  return clean ? clean + ' [user:' + login + ']' : '[user:' + login + ']';
}
function stripUserTag(note) {
  if (!note) return '';
  return note.replace(/\s*\[user:[^\]]+\]$/, '');
}

function enrichShift(s) {
  s.hours = parseFloat(s.hours) || 0;
  s.earned = parseFloat(s.earned) || 0;
  s.rate = s.hours > 0 ? Math.round(s.earned / s.hours) : 0;
  // Strip user tag from note for display purposes
  s.displayNote = stripUserTag(s.note);
  // Метаданные перерывов живут отдельно: в таблице Supabase нет под них колонок,
  // а DDL анонимным ключом не сделать. Ключ — дата+часы+заработок, т.к. id
  // локальной смены меняется после заливки в облако.
  const meta = getShiftMeta()[shiftMetaKey(s)];
  if (meta) {
    s.totalMs = meta.totalMs;
    s.breakMs = meta.breakMs;
    s.breakCount = meta.breakCount;
    s.breakSummary = meta.breakSummary;
    s.expenses = parseFloat(meta.expenses) || 0;
    s.units = parseInt(meta.units, 10) || 0;
  }
  s.expenses = s.expenses || 0;
  s.units = s.units || 0;
  s.net = s.earned - s.expenses;
  return s;
}

// Обновить часть метаданных смены (расходы/заказы), не трогая перерывы.
function mergeShiftMeta(shift, patch) {
  const all = getShiftMeta();
  const k = shiftMetaKey(shift);
  all[k] = Object.assign({}, all[k] || {}, patch);
  saveShiftMeta(all);
}
function readMetaInputs(prefix) {
  const ex = parseFloat((document.getElementById(prefix + 'Expenses') || {}).value) || 0;
  const un = parseInt((document.getElementById(prefix + 'Units') || {}).value, 10) || 0;
  return { expenses: Math.max(0, ex), units: Math.max(0, un) };
}

// ====== МЕТАДАННЫЕ СМЕН (перерывы) ======
function shiftMetaKey(s) {
  return `${s.date}|${s.hours}|${s.earned}`;
}
function getShiftMeta() {
  try { return uGet('lt_shift_meta', {}); } catch (e) { return {}; }
}
function saveShiftMeta(map) {
  uSet('lt_shift_meta', map);
  markLocalChange();
  schedulePushProgress();
}
function putShiftMeta(shift, meta) {
  const all = getShiftMeta();
  all[shiftMetaKey(shift)] = meta;
  saveShiftMeta(all);
}

function escapeHtml(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function formatShortDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return mins + ' мин';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h + 'ч ' + (m > 0 ? m + 'м' : '');
}

function saveActiveShift() {
  if (activeShift) {
    uSet('lt_active_shift', activeShift);
  } else {
    uRemove('lt_active_shift');
  }
  // Активная смена теперь тоже в облаке: начал смену на телефоне —
  // таймер виден и на сайте, а не «потерялся».
  schedulePushProgress();
}

