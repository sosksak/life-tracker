// QUESTS — панели «📋 ЗАДАЧИ СМЕНЫ» (#questsPanel) и «📌 ЛИЧНЫЕ ЗАДАЧИ» (#lifeQuestsPanel).
// Бывшие renderQuests() из 23-quests-shop.js, renderLifeQuests() / renderLifeStats() /
// renderCategoryHub() / catTag() из 22-life-quests.js (→ _archive/22-quests-legacy.js).
//
// Данные (пул заданий, состояние дня, Life XP, бонусы, категории) живут в легаси —
// расчёт зовёт его функции через мост, а готовую view-модель кладёт в $state.
// Как и раньше, пересчёт происходит по вызову renderQuests()/renderLifeQuests()/
// renderLifeStats() из легаси, а не по собственной реактивности: источники
// (localStorage, глобальные shifts/activeShift) Svelte не видит.
import { legacy } from '../lib/legacy.js';

export const quests = $state({
  shift: [],     // задания смены
  life: null,    // личные задания + хаб направлений + счётчик замен (null → ещё не считали)
  stats: null,   // блок Life XP (уровень, компетенции); пересобирается целиком — см. LifeQuests.svelte
});

// ---------- 📋 ЗАДАЧИ СМЕНЫ ----------
export function computeShift() {
  return legacy.lq.generateQuests().map(q => {
    const pct = Math.min((q.progress / q.target) * 100, 100);
    const done = pct >= 100;
    const progressText = q.target <= 1
      ? (done ? '✅ Выполнено' : '⬜ В процессе')
      : (q.target >= 1000 ? `${Math.floor(q.progress).toLocaleString('ru-RU')} / ${q.target.toLocaleString('ru-RU')}` : `${q.progress.toFixed(1)} / ${q.target}`);
    return { id: q.id, icon: q.icon, title: q.title, reward: q.reward, pct, done, text: `${q.desc} — ${progressText}` };
  });
}

// ---------- 🎯 НАПРАВЛЕНИЕ ЗАДАНИЙ (хаб) ----------
function computeHub() {
  const C = legacy.lq.categories();
  const today = legacy.lq.chosenCategory();
  const tomorrow = legacy.lq.chosenCategoryFor(legacy.lq.tomorrowStr());
  const src = legacy.lq.categoryChoiceSource();
  const lifeXP = legacy.lq.lifeXP().cats || {};
  const card = (lbl, key) => {
    const c = key && C[key];
    return c ? { lbl, name: c.name, color: c.color, tc: legacy.lq.catTextColor(key) } : { lbl };
  };
  const btn = tomorrow ? 'done' : src === 'weekly' ? 'free' : src === 'bonus' ? 'bonus' : 'paid';
  const legend = Object.entries(C).map(([k, c]) => ({ k, icon: c.icon, name: c.name, tc: legacy.lq.catTextColor(k), focus: today === k, n: lifeXP[k] || 0 }));
  return { cards: [card('Сегодня', today), card('Завтра', tomorrow)], btn, legend };
}

// ---------- 📌 ЛИЧНЫЕ ЗАДАЧИ ----------
export function computeLife() {
  const C = legacy.lq.categories();
  const list = legacy.lq.resolvedLifeQuests();
  const state = legacy.lq.lifeQuestState();
  const checked = state.checked;
  const total = legacy.lq.totalRerolls();
  const left = total - state.rerolls;
  const bonus = legacy.lq.shiftBonuses().bonusRerolls || 0;
  const shop = legacy.lq.shopExtraRerolls();
  const doneCount = list.filter(q => checked[q.id]).length;
  let hub = null;
  try { hub = computeHub(); } catch (e) { console.warn('catHub:', e); }
  const items = list.map(q => {
    const done = !!checked[q.id];
    const c = C[q.cat];
    return { id: q.id, icon: q.icon, title: q.title, desc: q.desc, reward: q.reward, done, canReroll: !done && left > 0,
      tag: c ? { name: c.name, color: c.color, tc: legacy.lq.catTextColor(q.cat) } : null };
  });
  return { items, left, total, bonus, shop, doneCount, n: list.length, hub, allDone: doneCount === list.length && list.length > 0 };
}

// ---------- ✨ LIFE XP: уровень и компетенции ----------
let statsV = 0;
export function computeStats() {
  const data = legacy.lq.lifeXP();
  const { current, next } = legacy.lq.level(data.total);
  let progressPct = 100;
  let xpNow = data.total, xpNeed = null;
  if (next) {
    progressPct = ((data.total - current.xp) / (next.xp - current.xp)) * 100;
    xpNow = data.total - current.xp;
    xpNeed = next.xp - current.xp;
  }
  progressPct = Math.max(0, Math.min(progressPct, 100));
  const C = legacy.lq.categories();
  const catEntries = Object.entries(C).map(([key, cat]) => ({ key, cat, xp: (data.cats && data.cats[key]) || 0 })).sort((a, b) => b.xp - a.xp);
  const maxCatXP = Math.max(...catEntries.map(e => e.xp), 1);
  const cats = catEntries.map((e, i) => ({ key: e.key, icon: e.cat.icon, name: e.cat.name, color: e.cat.color, xp: e.xp,
    pct: (e.xp / maxCatXP) * 100, cls: e.xp === 0 ? 'is-zero' : (i === 0 ? 'is-top' : '') }));
  const multiplier = legacy.lq.xpMultiplier();
  return {
    v: ++statsV,
    level: current, lvl: current.lvl, icon: current.icon, name: current.name,
    p: (progressPct / 100).toFixed(3), progressPct,
    boost: multiplier > 1 ? multiplier : 0,
    next: next ? { name: next.name, left: next.xp - data.total } : null,
    xpNow, xpNeed, total: data.total,
    questsDone: data.questsDone || 0, daysDone: data.daysDone || 0,
    avg: data.questsDone > 0 ? Math.round(data.total / data.questsDone) : 0,
    cats,
  };
}

// Храним последний показанный уровень, чтобы поймать момент level-up (как в легаси).
let _lastShownLvl = null;
export function afterStats(st) {
  if (_lastShownLvl !== null && st.lvl > _lastShownLvl) legacy.lq.celebrateLevelUp(st.level);
  _lastShownLvl = st.lvl;
}
