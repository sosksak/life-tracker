// LIFE — данные вкладки «Жизнь»: привычки (бывший 41-v6-habits.js) и
// здоровье (бывший 42-v6-health.js). Логика и ключи localStorage прежние
// (v6_habits / v6_habits_log / v6_health), наружу торчит тот же API
// HABITS.* / HEALTH.*, который зовут дашборд, v7-сводка, V994-счётчики.
//
// Состояние реактивное: $state-объекты читаются компонентами напрямую,
// поэтому отметка привычки или стакан воды обновляют экран сами —
// без render() и innerHTML.
import { legacy } from '../lib/legacy.js';

const HABITS_KEY = 'v6_habits';
const LOG_KEY = 'v6_habits_log';
const HEALTH_KEY = 'v6_health';

// Дефолтный набор: createdAt проставляется в момент первой записи, а не при
// загрузке скрипта — иначе у всех привычек одинаковый «возраст» времени сборки.
const DEFAULT_HABITS = () => [
  { id: 'h_water',    name: 'Выпить 8 стаканов воды', icon: '💧', freq: 'daily', category: 'health',       active: true },
  { id: 'h_exercise', name: 'Тренировка 30+ мин',     icon: '🏃', freq: 'daily', category: 'health',       active: true },
  { id: 'h_read',     name: 'Читать 20 минут',        icon: '📖', freq: 'daily', category: 'learning',     active: true },
  { id: 'h_meditate', name: 'Медитация 10 мин',       icon: '🧘', freq: 'daily', category: 'health',       active: true },
  { id: 'h_nosugar',  name: 'День без сахара',        icon: '🚫', freq: 'daily', category: 'health',       active: false },
  { id: 'h_journal',  name: 'Дневник / рефлексия',    icon: '📓', freq: 'daily', category: 'productivity', active: false },
  { id: 'h_sleep8',   name: 'Лечь до 23:00',          icon: '😴', freq: 'daily', category: 'health',       active: true },
  { id: 'h_budget',   name: 'Записать расходы',       icon: '📊', freq: 'daily', category: 'finance',      active: false },
].map(h => ({ ...h, createdAt: Date.now() }));

export const CATEGORIES = {
  health:       { name: 'Здоровье',       icon: '❤️', color: '#38A169' },
  productivity: { name: 'Продуктивность', icon: '⚡', color: '#3182CE' },
  learning:     { name: 'Обучение',       icon: '📖', color: '#D69E2E' },
  social:       { name: 'Социальное',     icon: '👥', color: '#9F7AEA' },
  finance:      { name: 'Финансы',        icon: '📊', color: '#E53E3E' },
};

export const MOODS = [
  { id: 'great',   icon: '😄', label: 'Отлично',   value: 5, color: '#38A169' },
  { id: 'good',    icon: '🙂', label: 'Хорошо',    value: 4, color: '#68D391' },
  { id: 'neutral', icon: '😐', label: 'Нормально', value: 3, color: '#ECC94B' },
  { id: 'bad',     icon: '😕', label: 'Не очень',  value: 2, color: '#ED8936' },
  { id: 'awful',   icon: '😫', label: 'Плохо',     value: 1, color: '#E53E3E' },
];

export const life = $state({
  habits: [],
  log: {},
  health: {},
  loaded: false,
  // V93 («скрыть/вернуть карточку») не реактивен: он правит свой конфиг и зовёт
  // HABITS.render(). Счётчик — та самая зависимость, по которой пересчитываются
  // выражения с legacy.cardHidden(), иначе возвращённая аналитика не появится.
  version: 0,
});

export function bump() { life.version++; }

// Как в FINANCE: без профиля ключи читались бы без префикса и мы бы
// «запомнили» пустоту чужого аккаунта. Поэтому грузим лениво.
export function load() {
  if (!legacy.hasUser()) return;
  const saved = legacy.get(HABITS_KEY, null);
  if (saved && Array.isArray(saved)) {
    life.habits = saved;
  } else {
    life.habits = DEFAULT_HABITS();
    legacy.set(HABITS_KEY, life.habits);
  }
  life.log = legacy.get(LOG_KEY, {}) || {};
  life.health = legacy.get(HEALTH_KEY, {}) || {};
  life.loaded = true;
}

function ensure() { if (!life.loaded) load(); }

function saveHabits() {
  legacy.set(HABITS_KEY, life.habits);
  legacy.touch();
}
function saveLog() {
  legacy.set(LOG_KEY, life.log);
  legacy.touch();
}
function saveHealth() {
  legacy.set(HEALTH_KEY, life.health);
  legacy.touch();
}

// ======================= ПРИВЫЧКИ =======================

const logKey = (habitId, dateStr) => `${dateStr || legacy.todayStr()}_${habitId}`;

export function getHabits() { ensure(); return life.habits; }

export function isChecked(habitId, dateStr) {
  ensure();
  return !!life.log[logKey(habitId, dateStr)];
}

export function toggle(habitId) {
  ensure();
  const key = logKey(habitId);
  if (life.log[key]) delete life.log[key];
  else life.log[key] = { ts: Date.now(), date: legacy.todayStr() };
  saveLog();
  legacy.haptic('light');
  // Дашборд живёт в своём сторе — его счётчик привычек надо толкнуть.
  if (window.DASHBOARD) window.DASHBOARD.render();
}

export function getStreak(habitId) {
  ensure();
  let streak = 0;
  const d = new Date();
  // Сегодня не отмечено — серия считается от вчера (как в легаси).
  if (!life.log[logKey(habitId, legacy.dateStr(d))]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (!life.log[logKey(habitId, legacy.dateStr(d))]) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function getCompletionRate(habitId, days = 30) {
  ensure();
  let done = 0;
  const d = new Date();
  for (let i = 0; i < days; i++) {
    if (life.log[logKey(habitId, legacy.dateStr(d))]) done++;
    d.setDate(d.getDate() - 1);
  }
  return days > 0 ? Math.round((done / days) * 100) : 0;
}

export function getTodayProgress() {
  ensure();
  const active = life.habits.filter(h => h.active);
  return { done: active.filter(h => isChecked(h.id)).length, total: active.length };
}

// Хитмап за 7 дней для одной привычки
export function miniHeat(habitId) {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = legacy.dateStr(d);
    out.push({ date: key, done: isChecked(habitId, key) });
  }
  return out;
}

export async function addHabit() {
  const res = await legacy.askForm([
    { key: 'name', label: 'Название', placeholder: 'Например: Утренняя зарядка' },
    { key: 'icon', label: 'Иконка (эмодзи)', placeholder: '🏃' },
    { key: 'category', label: 'Категория', type: 'select',
      options: Object.entries(CATEGORIES).map(([k, v]) => ({ value: k, label: v.icon + ' ' + v.name })) },
  ], { icon: '📋', title: 'Новая привычка', okText: 'Создать' });
  if (!res || !res.name) return;
  ensure();
  life.habits.push({
    id: 'h_' + Date.now(),
    name: res.name.trim(),
    icon: res.icon || '📌',
    freq: 'daily',
    category: res.category || 'productivity',
    active: true,
    createdAt: Date.now(),
  });
  saveHabits();
  legacy.toast('✅ Привычка добавлена', 'success');
}

export async function removeHabit(id) {
  ensure();
  const h = life.habits.find(x => x.id === id);
  if (!h) return;
  const ok = await legacy.askConfirm(`Удалить привычку «${legacy.escapeHtml(h.name)}»?`,
    { icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена' });
  if (!ok) return;
  life.habits = life.habits.filter(x => x.id !== id);
  saveHabits();
  legacy.toast('Привычка удалена', 'warn');
}

export function toggleActive(id) {
  ensure();
  const h = life.habits.find(x => x.id === id);
  if (h) h.active = !h.active;
  saveHabits();
}

// Быстрая отметка с дашборда: первая невыполненная активная привычка
export function quickCheck() {
  ensure();
  const pending = life.habits.filter(h => h.active && !isChecked(h.id));
  if (pending.length === 0) { legacy.toast('✅ Все привычки отмечены', 'success'); return; }
  toggle(pending[0].id);
  legacy.toast(`✅ ${pending[0].icon} ${pending[0].name}`, 'success');
}

// Аналитика за 30 дней: лучшая и худшая активные привычки
export function habitAnalytics() {
  ensure();
  const active = life.habits.filter(h => h.active);
  if (!active.length) return null;
  let best = null, worst = null;
  for (const h of active) {
    const rate = getCompletionRate(h.id);
    if (!best || rate > best.rate) best = { habit: h, rate };
    if (!worst || rate < worst.rate) worst = { habit: h, rate };
  }
  return { best, worst };
}

// ======================= ЗДОРОВЬЕ =======================

const EMPTY_DAY = { water: 0, sleep: 0, mood: null, weight: null, exercise: 0, notes: '' };

export function getDayData(dateStr) {
  ensure();
  return life.health[dateStr || legacy.todayStr()] || { ...EMPTY_DAY };
}

function saveDay(dateStr, data) {
  ensure();
  const key = dateStr || legacy.todayStr();
  life.health[key] = { ...data, updatedAt: Date.now() };
  // Чистка записей старше 180 дней — иначе объект растёт и уезжает в облако целиком
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 180);
  const cutoffStr = legacy.dateStr(cutoff);
  for (const k of Object.keys(life.health)) {
    if (k < cutoffStr && /^\d{4}-\d{2}-\d{2}$/.test(k)) delete life.health[k];
  }
  saveHealth();
}

// API для дашборда и v7: mood отдаётся эмодзи, как было в легаси
export function getTodayData() {
  const d = getDayData();
  return {
    water: d.water || 0,
    sleep: d.sleep || 0,
    mood: d.mood ? (MOODS.find(m => m.id === d.mood)?.icon || '—') : null,
    moodId: d.mood,
    weight: d.weight,
    exercise: d.exercise || 0,
  };
}

export function quickWater() {
  const d = getDayData();
  d.water = (d.water || 0) + 1;
  saveDay(null, d);
  legacy.toast(`💧 Вода: ${d.water}/8 стаканов`, 'success');
  legacy.haptic('light');
  if (window.DASHBOARD) window.DASHBOARD.render();
}

export function setWater(amount) {
  const d = getDayData();
  d.water = Math.max(0, Math.min(20, amount));
  saveDay(null, d);
}

export function setMood(moodId) {
  const d = getDayData();
  d.mood = moodId;
  saveDay(null, d);
  legacy.toast(`Настроение: ${MOODS.find(m => m.id === moodId)?.icon || ''}`, 'success');
  legacy.haptic('light');
}

export function setSleep(hours) {
  const d = getDayData();
  d.sleep = Math.max(0, Math.min(24, parseFloat(hours) || 0));
  saveDay(null, d);
}

export function setWeight(kg) {
  const d = getDayData();
  d.weight = parseFloat(kg) || null;
  saveDay(null, d);
}

export function setExercise(minutes) {
  const d = getDayData();
  d.exercise = Math.max(0, parseInt(minutes, 10) || 0);
  saveDay(null, d);
}

export function getWeekStats() {
  ensure();
  let water = 0, sleepTotal = 0, sleepDays = 0, exercise = 0, moodSum = 0, moodDays = 0;
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const dd = getDayData(legacy.dateStr(d));
    water += dd.water || 0;
    if (dd.sleep > 0) { sleepTotal += dd.sleep; sleepDays++; }
    exercise += dd.exercise || 0;
    if (dd.mood) {
      const m = MOODS.find(x => x.id === dd.mood);
      if (m) { moodSum += m.value; moodDays++; }
    }
    d.setDate(d.getDate() - 1);
  }
  return {
    avgWater: Math.round(water / 7 * 10) / 10,
    avgSleep: sleepDays > 0 ? Math.round(sleepTotal / sleepDays * 10) / 10 : 0,
    totalExercise: exercise,
    avgMood: moodDays > 0 ? Math.round(moodSum / moodDays * 10) / 10 : 0,
  };
}

export function getWeightHistory(days = 30) {
  ensure();
  const points = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = legacy.dateStr(d);
    const rec = life.health[key];
    if (rec && rec.weight) points.push({ date: key, weight: rec.weight });
  }
  return points;
}

// Настроение за 7 дней для полоски под выбором
export function moodWeek() {
  const out = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = getDayData(legacy.dateStr(d));
    const m = day.mood ? MOODS.find(x => x.id === day.mood) : null;
    out.push({
      has: !!m,                                  // есть ли отметка: заглушку «·» в <span> не кутаем
      icon: m ? m.icon : '·',
      label: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
    });
  }
  return out;
}
