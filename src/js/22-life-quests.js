// ====== LIFE QUESTS ======
const LIFE_QUESTS = [
  // 💬 Знакомства и первый контакт
  { id: 'say_hi', icon: '👋', title: 'Поздороваться с незнакомкой', desc: 'Просто «привет» — уже победа', reward: '+15 XP', xp: 15, cat: 'social' },
  { id: 'ask_name', icon: '💫', title: 'Узнать чьё-то имя', desc: 'Спроси и запомни', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'start_convo', icon: '🗣', title: 'Завести разговор первым', desc: 'В очереди, в кафе, где угодно', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'ask_direction', icon: '🧭', title: 'Спросить дорогу у девушки', desc: 'Лёгкий заход без давления', reward: '+15 XP', xp: 15, cat: 'social' },
  { id: 'talk_queue', icon: '🧾', title: 'Поболтать в очереди', desc: 'Пара фраз пока стоите — и уже контакт', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'three_hellos', icon: '🙌', title: 'Поздороваться с 3 людьми', desc: 'Разогрев социальной мышцы', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'remember_detail', icon: '🧠', title: 'Запомнить деталь о новой знакомой', desc: 'Имя, работа, увлечение — пригодится', reward: '+20 XP', xp: 20, cat: 'social' },
  { id: 'cold_approach', icon: '🔥', title: 'Подойти к незнакомой девушке', desc: 'Страшно? Значит нужно. Просто подойди', reward: '+30 XP', xp: 30, cat: 'approach' },
  { id: 'get_contact', icon: '📱', title: 'Взять номер / соцсеть', desc: 'Не бойся попросить контакт', reward: '+30 XP', xp: 30, cat: 'approach' },
  { id: 'invite_out', icon: '☕', title: 'Пригласить на кофе/прогулку', desc: 'Не откладывай — предложи встречу', reward: '+25 XP', xp: 25, cat: 'approach' },
  { id: 'approach_daytime', icon: '☀️', title: 'Подход днём на улице', desc: 'Без алкоголя и музыки — чистый скилл', reward: '+35 XP', xp: 35, cat: 'approach' },
  { id: 'two_approaches', icon: '⚡', title: 'Сделать 2 подхода за день', desc: 'Второй всегда легче первого', reward: '+40 XP', xp: 40, cat: 'approach' },
  { id: 'approach_after_no', icon: '🛡', title: 'Подойти снова после отказа', desc: 'Отказ — не стоп, а статистика', reward: '+40 XP', xp: 40, cat: 'approach' },
  { id: 'approach_group', icon: '👯', title: 'Подойти к девушке в компании', desc: 'Высшая сложность — максимум роста', reward: '+45 XP', xp: 45, cat: 'approach' },

  // 😎 Уверенность и харизма
  { id: 'eye_contact_girl', icon: '👀', title: 'Держать зрительный контакт 3 сек', desc: 'Смотри уверенно, не отводи первым', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'smile_strangers', icon: '😊', title: 'Улыбнуться 5 незнакомым людям', desc: 'Улыбка открывает двери', reward: '+10 XP', xp: 10, cat: 'confidence' },
  { id: 'posture_day', icon: '🧍', title: 'Держать осанку весь день', desc: 'Расправь плечи — выгляди как босс', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'loud_voice', icon: '📢', title: 'Говорить громко и чётко', desc: 'Тихий голос = неуверенность', reward: '+15 XP', xp: 15, cat: 'confidence' },
  { id: 'no_phone_social', icon: '📵', title: 'Убрать телефон при общении', desc: 'Полное внимание = уважение', reward: '+10 XP', xp: 10, cat: 'confidence' },
  { id: 'mirror_hype', icon: '🪞', title: 'Сказать себе «я красавчик»', desc: 'Аффирмация перед зеркалом', reward: '+10 XP', xp: 10, cat: 'confidence' },

  // 💬 Навыки общения
  { id: 'compliment_girl', icon: '💐', title: 'Сделать комплимент девушке', desc: 'Искренний, не шаблонный', reward: '+20 XP', xp: 20, cat: 'skills' },
  { id: 'make_laugh', icon: '😂', title: 'Рассмешить девушку', desc: 'Юмор — лучшее оружие', reward: '+20 XP', xp: 20, cat: 'skills' },
  { id: 'listen_deep', icon: '👂', title: 'Внимательно выслушать', desc: 'Без перебиваний, с вопросами', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'ask_deep_q', icon: '🤔', title: 'Задать интересный вопрос', desc: 'Не «как дела», а что-то цепляющее', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'storytell', icon: '📖', title: 'Рассказать историю из жизни', desc: 'Интересная история = внимание', reward: '+15 XP', xp: 15, cat: 'skills' },
  { id: 'tease_playful', icon: '😏', title: 'Легко подшутить / подразнить', desc: 'Игривый юмор, без обид', reward: '+20 XP', xp: 20, cat: 'skills' },

  // 📲 Переписка и соцсети
  { id: 'text_first', icon: '✉️', title: 'Написать первым', desc: 'Не жди — пиши сам', reward: '+15 XP', xp: 15, cat: 'digital' },
  { id: 'voice_msg', icon: '🎤', title: 'Отправить голосовое', desc: 'Голос создаёт связь сильнее текста', reward: '+10 XP', xp: 10, cat: 'digital' },
  { id: 'funny_meme', icon: '🖼', title: 'Отправить смешной мем', desc: 'Общий юмор сближает', reward: '+10 XP', xp: 10, cat: 'digital' },
  { id: 'react_story', icon: '📸', title: 'Ответить на сторис', desc: 'Естественный повод начать общение', reward: '+15 XP', xp: 15, cat: 'digital' },
  { id: 'plan_date', icon: '📅', title: 'Договориться о встрече', desc: 'Из переписки — в реал', reward: '+25 XP', xp: 25, cat: 'digital' },
  { id: 'call_not_text', icon: '📞', title: 'Позвонить вместо текста', desc: 'Звонок > 100 сообщений', reward: '+20 XP', xp: 20, cat: 'digital' },

  // 🌟 Внешность и стиль
  { id: 'dress_nice', icon: '👔', title: 'Одеться стильно', desc: 'Первое впечатление — одежда', reward: '+15 XP', xp: 15, cat: 'style' },
  { id: 'smell_good', icon: '✨', title: 'Парфюм / ухоженность', desc: 'Запах — мощный триггер', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'haircut', icon: '💇', title: 'Привести причёску в порядок', desc: 'Аккуратность = привлекательность', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'workout', icon: '🏋️', title: 'Потренироваться', desc: 'Тело — твоя визитка', reward: '+20 XP', xp: 20, cat: 'style' },
  { id: 'skincare', icon: '🧴', title: 'Уход за кожей', desc: 'Чистое лицо = уверенность', reward: '+10 XP', xp: 10, cat: 'style' },
  { id: 'new_look', icon: '🎨', title: 'Попробовать новый стиль', desc: 'Выйди из зоны комфорта во внешности', reward: '+15 XP', xp: 15, cat: 'style' },

  // 🎯 Челленджи и вызовы
  { id: 'reject_proof', icon: '🛡', title: 'Получить отказ и не расстроиться', desc: 'Каждый отказ = +1 к опыту', reward: '+25 XP', xp: 25, cat: 'challenge' },
  { id: 'talk_3girls', icon: '🎲', title: 'Поговорить с 3 девушками за день', desc: 'Количество → качество', reward: '+30 XP', xp: 30, cat: 'challenge' },
  { id: 'no_excuses', icon: '🚫', title: 'Не придумывать отговорки', desc: 'Увидел возможность — действуй', reward: '+20 XP', xp: 20, cat: 'challenge' },
  { id: 'comfort_zone', icon: '🌊', title: 'Выйти из зоны комфорта', desc: 'Сделай то, что обычно не делаешь', reward: '+25 XP', xp: 25, cat: 'challenge' },
  { id: 'ask_opinion', icon: '💭', title: 'Спросить мнение у девушки', desc: 'О чём угодно — заход в разговор', reward: '+15 XP', xp: 15, cat: 'challenge' },
  { id: 'dance_public', icon: '💃', title: 'Потанцевать / подвигаться на людях', desc: 'Не бойся быть заметным', reward: '+20 XP', xp: 20, cat: 'challenge' },

  // 💜 Отношения и забота
  { id: 'remember_detail_care', icon: '🧠', title: 'Запомнить деталь о человеке', desc: 'Имя кота, любимый цвет — это важно', reward: '+15 XP', xp: 15, cat: 'care' },
  { id: 'surprise_small', icon: '🎁', title: 'Сделать маленький сюрприз', desc: 'Кофе, шоколадка, записка', reward: '+20 XP', xp: 20, cat: 'care' },
  { id: 'be_gentleman', icon: '🚪', title: 'Придержать дверь / помочь', desc: 'Маленькие жесты = большое впечатление', reward: '+10 XP', xp: 10, cat: 'care' },
  { id: 'share_food_girl', icon: '🍕', title: 'Угостить чем-то вкусным', desc: 'Еда = путь к сердцу', reward: '+15 XP', xp: 15, cat: 'care' },
  { id: 'morning_msg', icon: '🌅', title: 'Написать «доброе утро»', desc: 'Первая мысль дня — о ней', reward: '+10 XP', xp: 10, cat: 'care' },
  { id: 'be_honest', icon: '💎', title: 'Быть честным и открытым', desc: 'Искренность > идеальный образ', reward: '+15 XP', xp: 15, cat: 'care' },

  // 🧘 Внутренняя прокачка
  { id: 'no_needy', icon: '🧊', title: 'Не быть навязчивым', desc: 'Дай пространство, не дави', reward: '+15 XP', xp: 15, cat: 'mindset' },
  { id: 'self_worth', icon: '👑', title: 'Напомнить себе свою ценность', desc: 'Ты — приз, а не проситель', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'learn_social', icon: '📚', title: 'Изучить что-то про общение', desc: 'Видео, книга, статья про соц. навыки', reward: '+15 XP', xp: 15, cat: 'mindset' },
  { id: 'visualize', icon: '🎬', title: 'Визуализировать успех', desc: 'Представь идеальный разговор', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'gratitude_social', icon: '🙏', title: 'Поблагодарить за общение', desc: 'Скажи спасибо тем, кто рядом', reward: '+10 XP', xp: 10, cat: 'mindset' },
  { id: 'journal_social', icon: '📓', title: 'Записать что узнал сегодня', desc: 'Рефлексия социального опыта', reward: '+15 XP', xp: 15, cat: 'mindset' },
];

// Life quest categories
const LQ_CATEGORIES = {
  social:     { name: 'Знакомства',  icon: '👋', color: '#ab47bc' },
  approach:   { name: 'Подходы',     icon: '🔥', color: '#ef5350' },
  confidence: { name: 'Уверенность', icon: '😎', color: '#42a5f5' },
  skills:     { name: 'Общение',     icon: '💬', color: '#66bb6a' },
  digital:    { name: 'Переписка',   icon: '📲', color: '#26c6da' },
  style:      { name: 'Стиль',       icon: '✨', color: '#ffa726' },
  challenge:  { name: 'Челленджи',   icon: '🎯', color: '#ec407a' },
  care:       { name: 'Забота',      icon: '💜', color: '#ce93d8' },
  mindset:    { name: 'Майндсет',    icon: '🧠', color: '#ffee58' },
};

window.LQ_CATEGORIES = LQ_CATEGORIES; // v9.17: нужен Svelte-слою (quests.svelte.js)

// Life XP levels
const LQ_LEVELS = [
  { lvl: 1,  xp: 0,    name: 'Начинающий',    icon: '🌱' },
  { lvl: 2,  xp: 100,  name: 'Практик',        icon: '🌿' },
  { lvl: 3,  xp: 300,  name: 'Стабильный',     icon: '🌳' },
  { lvl: 4,  xp: 600,  name: 'Дисциплинированный', icon: '⚡' },
  { lvl: 5,  xp: 1000, name: 'Привычка',       icon: '🔥' },
  { lvl: 6,  xp: 1500, name: 'Мастер привычек', icon: '🏆' },
  { lvl: 7,  xp: 2200, name: 'Лидер развития', icon: '💎' },
  { lvl: 8,  xp: 3000, name: 'Высший уровень', icon: '🦸' },
  { lvl: 9,  xp: 4000, name: 'Легенда',        icon: '👑' },
  { lvl: 10, xp: 5500, name: 'Абсолют',        icon: '🌟' },
];

// Pick 7 random life quests for today (seeded by date, from pool of 48)
function getTodayLifeQuests() {
  const today = todayStr();
  const chosenCat = getChosenCategory();

  if (chosenCat) {
    const catQuests = LIFE_QUESTS.filter(q => q.cat === chosenCat);
    let hash = 0;
    for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
    const shuffledCat = [...catQuests].sort((a, b) => {
      let ha = hash, hb = hash;
      for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
      for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
      return (ha % 10000) - (hb % 10000);
    });
    const fromCat = shuffledCat.slice(0, 5);
    const otherQuests = LIFE_QUESTS.filter(q => q.cat !== chosenCat);
    const shuffledOther = [...otherQuests].sort((a, b) => {
      let ha = hash + 99, hb = hash + 99;
      for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
      for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
      return (ha % 10000) - (hb % 10000);
    });
    const fromOther = shuffledOther.slice(0, 7 - fromCat.length);
    return [...fromCat, ...fromOther];
  }

  // Default: random from full pool
  let hash = 0;
  for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const shuffled = [...LIFE_QUESTS].sort((a, b) => {
    let ha = hash, hb = hash;
    for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
    for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
    return (ha % 10000) - (hb % 10000);
  });
  return shuffled.slice(0, 7);
}

// ====== LIFE QUEST XP SYSTEM ======

// ВОССТАНОВЛЕНИЕ: реальный Life XP был ~200 (LVL 2), а 20400 — это рубли из
// кошелька, я их спутал. Накатываем один раз: только если XP ещё пустой,
// чтобы не затереть живой прогресс при повторных заходах.
const XP_RESTORE_VALUE = 200;
function restoreLostXPOnce() {
  try {
    if (uGetRaw('lt_xp_restored_v42')) return;
    // v9.9: «ремонт» касался только исторических данных разработчика.
    // Новый профиль должен стартовать с честного нуля.
    if (!currentUser || currentUser.role !== 'dev') { uSetRaw('lt_xp_restored_v42', '1'); return; }
    const raw = uGetRaw('lt_life_xp');
    let cur = null;
    try { cur = raw ? JSON.parse(raw) : null; } catch (e) { cur = null; }
    if (!cur || !cur.total) {
      const seeded = cur || { total: 0, cats: {}, history: [], questsDone: 0, daysDone: 0, lastDay: '' };
      seeded.total = XP_RESTORE_VALUE;
      uSet('lt_life_xp', seeded);
    }
    uSetRaw('lt_xp_restored_v42', '1');
  } catch (e) { console.warn('XP restore skipped:', e); }
}

// --- localStorage parse cache ---
const _lsCache = {};
function _cachedGet(key, fallback) {
  const raw = localStorage.getItem(uKey(key));
  if (raw === null) return typeof fallback === 'object' ? JSON.parse(JSON.stringify(fallback)) : fallback;
  if (_lsCache[key] && _lsCache[key].raw === raw) return JSON.parse(JSON.stringify(_lsCache[key].val));
  try { const val = JSON.parse(raw); _lsCache[key] = { raw, val }; return JSON.parse(JSON.stringify(val)); } catch(e) { return fallback; }
}
function _invalidateCache(key) { delete _lsCache[key]; }
// v9.4: карточка скрыта пользователем (V93) — тяжёлые рендеры её пропускают
const _hid = (t, k) => { try { return window.V93 && V93.isHidden(t, k); } catch (e) { return false; } };

function getLifeXP() {
  return _cachedGet('lt_life_xp', {"total":0,"cats":{},"history":[],"questsDone":0,"daysDone":0,"lastDay":""});
}

function saveLifeXP(data) {
  _invalidateCache('lt_life_xp');
  uSet('lt_life_xp', data);
  schedulePushProgress();
}

function getXpMultiplier() {
  // Check if double XP is active
  const today = todayStr();
  try {
    const boosts = uGet('lt_shop_boosts', {});
    if (boosts.double_xp === today) return 2;
  } catch(e) {}
  return 1;
}

function addLifeXP(questId, xpAmount, category) {
  const data = getLifeXP();
  const today = todayStr();

  const todayKey = `${today}_${questId}`;
  if (!data.history) data.history = [];
  if (data.history.includes(todayKey)) return data;

  const multiplier = getXpMultiplier();
  const finalXP = xpAmount * multiplier;

  data.total = (data.total || 0) + finalXP;
  if (!data.cats) data.cats = {};
  data.cats[category] = (data.cats[category] || 0) + finalXP;
  data.questsDone = (data.questsDone || 0) + 1;
  data.history.push(todayKey);

  if (data.lastDay !== today) {
    data.daysDone = (data.daysDone || 0) + 1;
    data.lastDay = today;
  }

  if (data.history.length > 500) data.history = data.history.slice(-500);

  saveLifeXP(data);
  return data;
}

function removeLifeXP(questId, xpAmount, category) {
  const data = getLifeXP();
  const today = todayStr();
  const todayKey = `${today}_${questId}`;

  const idx = data.history.indexOf(todayKey);
  if (idx === -1) return data;

  const multiplier = getXpMultiplier();
  const finalXP = xpAmount * multiplier;

  data.total = Math.max(0, (data.total || 0) - finalXP);
  if (data.cats) data.cats[category] = Math.max(0, (data.cats[category] || 0) - finalXP);
  data.questsDone = Math.max(0, (data.questsDone || 0) - 1);
  data.history.splice(idx, 1);

  saveLifeXP(data);
  return data;
}

function getLQLevel(xp) {
  let current = LQ_LEVELS[0], next = LQ_LEVELS[1];
  for (let i = LQ_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LQ_LEVELS[i].xp) { current = LQ_LEVELS[i]; next = LQ_LEVELS[i + 1] || null; break; }
  }
  return { current, next };
}

// v9.17: блок Life XP (#lifeStatsPanel) → Svelte (src/svelte/work/LifeQuests.svelte, quests.svelte.js).
function renderLifeStats() { if (window.QUESTS) QUESTS.renderStats(); }

// Тост + поп бейджа при новом уровне.
function celebrateLevelUp(level) {
  const badge = document.getElementById('lqBadge');
  if (badge) {
    badge.classList.remove('pop');
    void badge.offsetWidth; // перезапуск анимации
    badge.classList.add('pop');
  }
  let toast = document.getElementById('lqLevelUpToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lqLevelUpToast';
    toast.className = 'lq-levelup-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div class="lq-lu-title">${level.icon} НОВЫЙ УРОВЕНЬ!</div>
    <div class="lq-lu-sub">LVL ${level.lvl} — ${level.name}</div>`;
  requestAnimationFrame(() => toast.classList.add('show'));
  try { FX.big(30); } catch (e) {}
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function getLifeQuestState() {
  const today = todayStr();
  try {
    const saved = uGet('lt_life_quests', {});
    if (saved.date === today) return { checked: saved.checked || {}, rerolls: saved.rerolls || 0, replacements: saved.replacements || {} };
    return { checked: {}, rerolls: 0, replacements: {} };
  } catch(e) { return { checked: {}, rerolls: 0, replacements: {} }; }
}

function saveLifeQuestState(state) {
  const today = todayStr();
  uSet('lt_life_quests', { date: today, ...state });
}

function toggleLifeQuest(id) {
  const state = getLifeQuestState();
  const quest = LIFE_QUESTS.find(q => q.id === id);
  state.checked[id] = !state.checked[id];
  saveLifeQuestState(state);

  if (state.checked[id] && quest) {
    const mult = getXpMultiplier();
    addLifeXP(id, quest.xp, quest.cat);
    const xpGained = quest.xp * mult;
    showToast(`✅ +${xpGained} XP! ${mult > 1 ? '(x' + mult + '!) ' : ''}Отлично!`, 'success');
    rainCoins(3);
  } else if (!state.checked[id] && quest) {
    removeLifeXP(id, quest.xp, quest.cat);
  }

  renderLifeQuests();
  renderLifeStats();
}

const MAX_REROLLS = 3;

// ====== BONUS SYSTEM ======
function getShiftBonuses() {
  const today = todayStr();
  const saved = _cachedGet('lt_shift_bonuses', null);
  if (saved && saved.date === today) return saved;
  return { date: today, bonusRerolls: 0, categoryChoice: false, claimedQuests: [] };
}

function saveShiftBonuses(data) {
  _invalidateCache('lt_shift_bonuses');
  uSet('lt_shift_bonuses', data);
  schedulePushProgress();
}

function getChosenCategory() {
  try {
    const saved = uGet('lt_chosen_category', {});
    const today = todayStr();
    if (saved.forDate === today) return saved.category;
    return null;
  } catch(e) { return null; }
}

function saveChosenCategory(cat, forDate) {
  uSet('lt_chosen_category', { category: cat, forDate: forDate });
  schedulePushProgress();
}

function checkAndGrantBonuses() {
  const quests = generateQuests();
  const bonuses = getShiftBonuses();
  let newRerolls = 0;
  let newCategoryChoice = false;
  const messages = [];

  for (const q of quests) {
    if (!q.bonus) continue;
    const done = (q.progress / q.target) >= 1;
    if (!done) continue;
    if (bonuses.claimedQuests.includes(q.id)) continue;

    bonuses.claimedQuests.push(q.id);

    if (q.bonus.type === 'reroll') {
      newRerolls += q.bonus.amount;
      messages.push(`🎲 +${q.bonus.amount} замена за «${q.title}»`);
    } else if (q.bonus.type === 'category_choice') {
      newCategoryChoice = true;
      messages.push(`🎯 Выбор категории за «${q.title}»`);
    }
  }

  if (newRerolls > 0) {
    bonuses.bonusRerolls = (bonuses.bonusRerolls || 0) + newRerolls;
  }
  if (newCategoryChoice) {
    bonuses.categoryChoice = true;
  }

  saveShiftBonuses(bonuses);

  for (const msg of messages) {
    showToast(msg, 'success');
  }

  renderLifeQuests();

  if (newCategoryChoice) {
    setTimeout(() => openCategoryPicker(), 500);
  }

  return { newRerolls, newCategoryChoice, messages };
}

// ====== v7.0.2: НАПРАВЛЕНИЕ ЗАДАНИЙ — один понятный блок вместо спрятанной кнопки ======
// Яркие цвета категорий (жёлтый, сиреневый) не читаются как текст — тёмные варианты.
const LQ_CAT_TEXT = { mindset: '#B7791F', care: '#8E44AD', style: '#DD6B20', digital: '#0E7490', skills: '#2F855A', social: '#8E24AA', approach: '#C53030', confidence: '#2B6CB0', challenge: '#B83280' };
function catTextColor(key) { return LQ_CAT_TEXT[key] || (LQ_CATEGORIES[key] || {}).color || 'var(--text)'; }
function tomorrowStr() { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d); }
function getChosenCategoryFor(dateStr) {
  try { const s = uGet('lt_chosen_category', {}); return s.forDate === dateStr ? s.category : null; } catch (e) { return null; }
}
// Откуда у пользователя право выбрать направление: weekly (бесплатно раз в неделю),
// bonus (заработано задачей смены), либо никак — тогда ведём в магазин.
function getCategoryChoiceSource() {
  if (!getWeeklyCategoryChoice().used) return 'weekly';
  if (getShiftBonuses().categoryChoice) return 'bonus';
  return null;
}
function openCategoryHub() {
  const src = getCategoryChoiceSource();
  if (src === 'weekly') return openCategoryPicker(true);
  if (src === 'bonus') return openCategoryPicker(false);
  openCategoryPicker(false, 'paid');
}
function showCategoryHelp() {
  const fn = (typeof askConfirm === 'function') ? askConfirm : null;
  const html = '<div style="text-align:left;line-height:1.5">'
    + '<p style="margin:0 0 8px">Каждый день приложение даёт <b>7 личных заданий</b>. Если выбрать направление — <b>5 из 7</b> завтрашних заданий будут из него, ещё 2 останутся случайными.</p>'
    + '<p style="margin:0 0 6px"><b>Как получить выбор:</b></p>'
    + '<ul style="margin:0 0 8px 18px;padding:0"><li>🎁 бесплатно — 1 раз в неделю (с понедельника)</li><li>🏅 награда за задачи смены («Заработать 8000₽», «12 000₽»)</li><li>🪙 за 150 XP — прямо здесь или в ДЕНЬГИ → Бусты</li></ul>'
    + '<p style="margin:0">Цифры в цветных метках — сколько XP набрано в каждом направлении.</p></div>';
  if (fn) fn(html, { icon: '🎯', title: 'Как работает направление', okText: 'Понятно', noText: '' });
  else alert(html.replace(/<[^>]+>/g, ''));
}

function openCategoryPicker(isWeeklyFree = false, mode = '') {
  const container = document.getElementById('categoryPickerList');
  const paid = mode === 'paid';
  const source = isWeeklyFree ? 'weekly' : 'bonus';
  const tomorrow = getChosenCategoryFor(tomorrowStr());
  const lifeXP = (typeof getLifeXP === 'function') ? (getLifeXP().cats || {}) : {};
  container.innerHTML = Object.entries(LQ_CATEGORIES).map(([key, cat]) =>
    `<button class="cat-pick-btn ${tomorrow === key ? 'is-selected' : ''}" onclick="${paid ? `buyCategoryChoice('${key}')` : `pickCategory('${key}', '${source}')`}" style="border-color:${cat.color}">
      <div class="ico">${cat.icon}</div>
      <div class="nm" style="color:${catTextColor(key)}">${cat.name}</div>
      <div class="cnt">${LIFE_QUESTS.filter(q => q.cat === key).length} заданий</div>
      <div class="xp" style="color:${catTextColor(key)}">${lifeXP[key] || 0} XP набрано</div>
    </button>`
  ).join('');
  const st = document.getElementById('cpState');
  if (st) {
    if (isWeeklyFree) { st.className = 'cp-state free'; st.innerHTML = '🎁 <span>Бесплатный выбор недели — доступен</span>'; }
    else if (paid) { st.className = 'cp-state paid'; st.innerHTML = '🪙 <span>Бесплатный выбор уже использован. Выбор сейчас — <b>150 XP</b> с баланса</span>'; }
    else { st.className = 'cp-state bonus'; st.innerHTML = '🏅 <span>Выбор заработан задачей смены</span>'; }
  }
  const note = document.getElementById('cpNote');
  if (note) note.textContent = tomorrow
    ? `Сейчас на завтра выбрано: ${LQ_CATEGORIES[tomorrow].icon} ${LQ_CATEGORIES[tomorrow].name}. Нажми на другое, чтобы заменить.`
    : 'Нажми на направление — оно применится к заданиям завтрашнего дня.';
  document.getElementById('categoryPickerModal').classList.add('show');
  document.body.classList.add('modal-open');
}
// Выбор за XP прямо из хаба (без похода в магазин)
function buyCategoryChoice(key) {
  const PRICE = 150;
  const data = getLifeXP();
  if (data.total < PRICE) {
    showToast(`🪙 Нужно ${PRICE} XP, на балансе ${data.total}. Бесплатный выбор вернётся в понедельник`, 'warn');
    return;
  }
  // Та же логика, что в shopBuyItem('cat_choice'): списываем с Life XP
  data.total -= PRICE;
  saveLifeXP(data);
  if (typeof renderLifeStats === 'function') renderLifeStats();
  pickCategory(key, 'paid');
}

function closeCategoryPicker() {
  document.getElementById('categoryPickerModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

function pickCategory(cat, source = 'bonus') {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const forDate = localDateStr(tomorrow);
  saveChosenCategory(cat, forDate);
  closeCategoryPicker();
  const catInfo = LQ_CATEGORIES[cat];

  if (source === 'weekly') {
    const wc = getWeeklyCategoryChoice();
    wc.used = true;
    saveWeeklyCategoryChoice(wc);
    showToast(`🎁 ${catInfo.icon} Завтра 5 из 7 заданий — ${catInfo.name} (бесплатно)`, 'success');
  } else if (source === 'paid') {
    showToast(`🪙 ${catInfo.icon} Завтра 5 из 7 заданий — ${catInfo.name} (−150 XP)`, 'success');
  } else {
    const b = getShiftBonuses(); if (b.categoryChoice) { b.categoryChoice = false; saveShiftBonuses(b); }
    showToast(`${catInfo.icon} Завтра 5 из 7 заданий — ${catInfo.name}`, 'success');
  }
  rainCoins(5);
  renderLifeQuests();
}

function getTotalRerolls() {
  const bonuses = getShiftBonuses();
  const shopExtra = getShopExtraRerolls();
  return MAX_REROLLS + (bonuses.bonusRerolls || 0) + shopExtra;
}

// Weekly free category choice — 1 per week (resets Monday)
function getWeeklyCategoryChoice() {
  try {
    const saved = uGet('lt_weekly_cat', {});
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const weekKey = localDateStr(monday);
    if (saved.week === weekKey) return saved;
    return { week: weekKey, used: false };
  } catch(e) { return { week: '', used: false }; }
}

function saveWeeklyCategoryChoice(data) {
  uSet('lt_weekly_cat', data);
  schedulePushProgress();
}

function useWeeklyCategoryChoice() {
  const wc = getWeeklyCategoryChoice();
  if (wc.used) {
    showToast('🎯 Бесплатный выбор уже использован на этой неделе', 'warn');
    return;
  }
  openCategoryPicker(true);
}

function rerollLifeQuest(oldId, event) {
  event.stopPropagation();
  const state = getLifeQuestState();
  const totalRerolls = getTotalRerolls();
  if (state.rerolls >= totalRerolls) {
    showToast('🎲 Замены заданий исчерпаны на сегодня', 'warn');
    return;
  }

  const baseQuests = getTodayLifeQuests();
  const currentIds = baseQuests.map(q => state.replacements[q.id] || q.id);

  const available = LIFE_QUESTS.filter(q => !currentIds.includes(q.id));
  if (available.length === 0) {
    showToast('Нет доступных квестов для замены', 'warn');
    return;
  }

  const newQuest = available[Math.floor(Math.random() * available.length)];

  const baseSlot = baseQuests.find(q => (state.replacements[q.id] || q.id) === oldId);
  if (baseSlot) {
    state.replacements[baseSlot.id] = newQuest.id;
  }

  delete state.checked[oldId];

  state.rerolls++;
  saveLifeQuestState(state);
  renderLifeQuests();
  showToast(`🔄 Задание заменено (${totalRerolls - state.rerolls} замен осталось)`, 'success');
}

function getResolvedLifeQuests() {
  const baseQuests = getTodayLifeQuests();
  const state = getLifeQuestState();
  return baseQuests.map(base => {
    const replacementId = state.replacements[base.id];
    if (replacementId) {
      const found = LIFE_QUESTS.find(q => q.id === replacementId);
      if (found) return found;
    }
    return base;
  });
}

// v9.17: список личных заданий и хаб направлений → Svelte (LifeQuests.svelte). Разметка 1:1, обработчики те же.
function renderLifeQuests() { if (window.QUESTS) QUESTS.renderLife(); }

// ====== MOTIVATION TIPS ======
const TIPS = [
  { text: 'Дисциплина — это делать то, что нужно, когда не хочется.', author: '📖 Принцип продуктивности' },
  { text: 'Маленькие шаги каждый день дают большие результаты.', author: '📈 Закон прогресса' },
  { text: 'Деньги любят тех, кто их уважает и считает.', author: '💰 Правило богатства' },
  { text: 'Лучший момент начать — вчера. Второй лучший — сейчас.', author: '⏰ Мудрость' },
  { text: 'Не сравнивай себя с другими. Сравнивай себя с собой вчерашним.', author: '🪞 Рост' },
  { text: 'Каждая смена — это кирпич в фундаменте твоего будущего.', author: '🏗 Строитель жизни' },
  { text: 'Усталость временна, результат — навсегда.', author: '💪 Философия успеха' },
  { text: 'Пока другие откладывают — ты строишь своё будущее.', author: '🌙 Вечерняя продуктивность' },
  { text: 'Тело — твой главный инструмент. Заботься о нём.', author: '❤️ Здоровье' },
  { text: '100 смен — и ты уже другой человек.', author: '🔄 Трансформация' },
  { text: 'Состояния создаются не везением, а ежедневной работой.', author: '📈 Закон накопления' },
  { text: 'Перерыв — не слабость, а стратегия.', author: '♟ Тактика' },
  { text: 'Твой rate сегодня — это твоя цена завтра.', author: '📊 Аналитика' },
  { text: 'Обед с собой = +300₽ в день = +9000₽ в месяц!', author: '🧮 Математика экономии' },
  { text: 'Главное — не останавливаться. Серия не должна прерваться.', author: '🔥 Принцип непрерывности' },
];

function renderMotivationTip() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  document.getElementById('tipText').textContent = `«${tip.text}»`;
  document.getElementById('tipAuthor').textContent = `— ${tip.author}`;
}

