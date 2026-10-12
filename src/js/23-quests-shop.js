// ====== QUESTS ======
const SHIFT_QUEST_POOL = [
  // === ВРЕМЯ / ЧАСЫ ===
  {
    id: 'start_shift', icon: '🚀', title: 'Выйти на смену',
    desc: 'Начни свою смену сегодня',
    calc: (ctx) => ({ progress: (ctx.isOnShift || ctx.todayShifts.length > 0) ? 1 : 0, target: 1 }),
    reward: '🏅 Присутствие — основа результата', bonus: null
  },
  {
    id: 'work_2h', icon: '⏳', title: 'Разогрев: 2 часа',
    desc: 'Набей 2 часа чистой работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 2), target: 2 }),
    reward: '🔥 +50 XP к прогрессу', bonus: null
  },
  {
    id: 'work_4h', icon: '⏱', title: 'Отработать 4 часа',
    desc: 'Набей 4 часа чистой работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 4), target: 4 }),
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'work_6h', icon: '⚡', title: 'Рабочий ритм: 6 часов',
    desc: '6 часов чистой продуктивности',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 6), target: 6 }),
    reward: '💪 Уровень дисциплины +1', bonus: null
  },
  {
    id: 'work_8h', icon: '💪', title: 'Марафон: 8 часов',
    desc: 'Полная смена — 8 часов работы',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 8), target: 8 }),
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'work_10h', icon: '🦾', title: 'Железный человек: 10 часов',
    desc: 'Сверхсмена — 10 часов чистой работы!',
    calc: (ctx) => ({ progress: Math.min(ctx.totalHours, 10), target: 10 }),
    reward: '🎲 +2 замены заданий', bonus: { type: 'reroll', amount: 2 }
  },

  // === ЗАРАБОТОК ===
  {
    id: 'earn_2k', icon: '💵', title: 'Первые 2000₽',
    desc: 'Заработай первые 2К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 2000), target: 2000 }),
    reward: '🪙 Каждый рубль на счету', bonus: null
  },
  {
    id: 'earn_5k', icon: '💰', title: 'Заработать 5000₽',
    desc: 'Сегодняшний заработок ≥ 5000₽',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 5000), target: 5000 }),
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'earn_8k', icon: '🤑', title: 'Заработать 8000₽',
    desc: 'Цель дня — 8 000₽',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 8000), target: 8000 }),
    reward: '🎯 Выбор категории квестов!', bonus: { type: 'category_choice' }
  },
  {
    id: 'earn_10k', icon: '💎', title: 'Десятка! 10 000₽',
    desc: 'Пробей планку в 10К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 10000), target: 10000 }),
    reward: '🎲 +2 замены + 🏆 достижение', bonus: { type: 'reroll', amount: 2 }
  },
  {
    id: 'earn_12k', icon: '👑', title: 'Король дня: 12 000₽',
    desc: 'Элитный заработок — 12К за день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayEarned, 12000), target: 12000 }),
    reward: '🎯 Выбор категории + 🎲 +1 замена', bonus: { type: 'category_choice' }
  },

  // === RATE / ЭФФЕКТИВНОСТЬ ===
  {
    id: 'hit_goal', icon: '🎯', title: () => `Выбить ${DIFFICULTIES[difficulty].goal}₽/час`,
    desc: () => `Средний rate за день ≥ ${DIFFICULTIES[difficulty].goal}₽/час`,
    calc: (ctx) => ({ progress: ctx.todayRate >= ctx.goal ? 1 : 0, target: 1 }),
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'rate_1200', icon: '🚀', title: 'Турборежим: 1200₽/час',
    desc: 'Средний rate за день ≥ 1200₽/час',
    calc: (ctx) => ({ progress: ctx.todayRate >= 1200 ? 1 : 0, target: 1 }),
    reward: '⚡ Высокая эффективность', bonus: null
  },
  {
    id: 'rate_1500', icon: '🔥', title: 'На максималках: 1500₽/час',
    desc: 'Средний rate за день ≥ 1500₽/час',
    calc: (ctx) => ({ progress: ctx.todayRate >= 1500 ? 1 : 0, target: 1 }),
    reward: '🎲 +2 замены заданий', bonus: { type: 'reroll', amount: 2 }
  },

  // === ПЕРЕРЫВЫ / ДИСЦИПЛИНА ===
  {
    id: 'no_long_break', icon: '⚔️', title: 'Без длинных перерывов',
    desc: 'Ни один перерыв не длиннее 15 минут',
    calc: (ctx) => {
      if (!ctx.isOnShift && ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const breaks = activeShift ? activeShift.breaks : [];
      const longBreak = breaks.some(b => ((b.end || Date.now()) - b.start) > 15 * 60000);
      return { progress: longBreak ? 0 : 1, target: 1 };
    },
    reward: '🧘 Мастер концентрации', bonus: null
  },
  {
    id: 'max_2_breaks', icon: '🎖️', title: 'Минимум перерывов',
    desc: 'Не более 2 перерывов за смену',
    calc: (ctx) => {
      if (!ctx.isOnShift && ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const breakCount = activeShift ? activeShift.breaks.length + (activeShift.currentBreak ? 1 : 0) : 0;
      return { progress: breakCount <= 2 ? 1 : 0, target: 1 };
    },
    reward: '🏆 Железная дисциплина', bonus: null
  },

  // === СМЕНЫ / СЕРИИ ===
  {
    id: 'two_shifts', icon: '🔄', title: 'Двойная смена',
    desc: 'Закрой 2 смены за один день',
    calc: (ctx) => ({ progress: Math.min(ctx.todayShifts.length, 2), target: 2 }),
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
  {
    id: 'early_bird', icon: '🌅', title: 'Ранняя пташка',
    desc: 'Начни смену до 9:00',
    calc: (ctx) => {
      const startedEarly = ctx.isOnShift && activeShift && new Date(activeShift.startTime).getHours() < 9;
      const hadEarly = ctx.todayShifts.some(s => s.note && s.note.includes('Начало:') && parseInt(s.note.split('Начало:')[1]) < 9);
      return { progress: (startedEarly || hadEarly) ? 1 : 0, target: 1 };
    },
    reward: '☀️ Ранний старт — результат', bonus: null
  },
  {
    id: 'quick_start', icon: '⚡', title: 'Быстрый старт',
    desc: 'Заработай 1000₽ за первые 1.5 часа',
    calc: (ctx) => {
      if (ctx.totalHours <= 1.5 && ctx.todayEarned >= 1000) return { progress: 1, target: 1 };
      if (ctx.totalHours > 1.5) return { progress: 0, target: 1 }; // опоздал — квест провален
      return { progress: Math.min(ctx.todayEarned, 1000), target: 1000 };
    },
    reward: '⚡ Быстрый старт взят', bonus: null
  },
  {
    id: 'consistent_rate', icon: '📊', title: 'Стабильная эффективность',
    desc: 'Все смены сегодня с rate ≥ 900₽/час',
    calc: (ctx) => {
      if (ctx.todayShifts.length === 0) return { progress: 0, target: 1 };
      const allGood = ctx.todayShifts.every(s => s.hours > 0 && (s.earned / s.hours) >= 900);
      return { progress: allGood ? 1 : 0, target: 1 };
    },
    reward: '🎲 +1 замена задания', bonus: { type: 'reroll', amount: 1 }
  },
];

function generateQuests() {
  const goal = DIFFICULTIES[difficulty].goal;
  const today = todayStr();
  const todayShifts = shifts.filter(s => s.date === today);
  const todayEarned = todayShifts.reduce((s, x) => s + x.earned, 0);
  const todayHours = todayShifts.reduce((s, x) => s + x.hours, 0);
  const todayRate = todayHours > 0 ? Math.round(todayEarned / todayHours) : 0;

  const isOnShift = !!activeShift;
  const workMs = isOnShift ? getWorkMs() : 0;
  const workHours = workMs / 3600000;
  const totalHours = todayHours + workHours;

  const ctx = { isOnShift, todayShifts, todayEarned, todayHours, todayRate, totalHours, goal, workHours };

  let hash = 0;
  for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
  const shuffled = [...SHIFT_QUEST_POOL].sort((a, b) => {
    let ha = hash, hb = hash;
    for (let i = 0; i < a.id.length; i++) { ha = ((ha << 5) - ha) + a.id.charCodeAt(i); ha |= 0; }
    for (let i = 0; i < b.id.length; i++) { hb = ((hb << 5) - hb) + b.id.charCodeAt(i); hb |= 0; }
    return (ha % 10000) - (hb % 10000);
  });

  const startQuest = SHIFT_QUEST_POOL.find(q => q.id === 'start_shift');
  const others = shuffled.filter(q => q.id !== 'start_shift').slice(0, 5);
  const selectedPool = [startQuest, ...others];

  return selectedPool.map(q => {
    const { progress, target } = q.calc(ctx);
    return {
      id: q.id,
      icon: q.icon,
      title: typeof q.title === 'function' ? q.title() : q.title,
      desc: typeof q.desc === 'function' ? q.desc() : q.desc,
      progress, target,
      reward: q.reward,
      bonus: q.bonus
    };
  });
}

function getWorkMs() {
  if (!activeShift) return 0;
  const now = Date.now();
  const totalMs = now - activeShift.startTime;
  const breakMs = activeShift.breaks.reduce((sum, b) => sum + ((b.end || now) - b.start), 0)
    + (activeShift.currentBreak ? (now - activeShift.currentBreak.start) : 0);
  return totalMs - breakMs;
}

function renderQuests() {
  const quests = generateQuests();
  const container = document.getElementById('questList');
  container.innerHTML = quests.map(q => {
    const pct = Math.min((q.progress / q.target) * 100, 100);
    const done = pct >= 100;
    const progressText = q.target <= 1
      ? (done ? '✅ Выполнено' : '⬜ В процессе')
      : (q.target >= 1000 ? `${Math.floor(q.progress).toLocaleString('ru-RU')} / ${q.target.toLocaleString('ru-RU')}` : `${q.progress.toFixed(1)} / ${q.target}`);
    return `<div class="quest-item ${done ? 'completed' : ''}">
      <div class="quest-header">
        <div class="quest-title">${q.icon} ${q.title}</div>
        <div class="quest-reward">${q.reward}</div>
      </div>
      <div class="quest-progress"><div class="quest-fill ${done ? 'done' : 'active'}" style="width:${pct}%"></div></div>
      <div class="quest-text">${q.desc} — ${progressText}</div>
    </div>`;
  }).join('');
}

// ====== SHOP SYSTEM ======
function getShopPurchases() {
  return _cachedGet('lt_shop_purchases', {});
}
function saveShopPurchases(data) {
  _invalidateCache('lt_shop_purchases');
  uSet('lt_shop_purchases', data);
  schedulePushProgress();
}

function getShopOwned(itemId) {
  const p = getShopPurchases();
  return !!p[itemId];
}

// Мистери-бокс: случайный приз. Записывает эффект прямо в boosts
// (вызывающий сам сохраняет объект в localStorage).
function rollMysteryBox(boosts, today) {
  const roll = Math.random();
  if (roll < 0.35) {
    const amount = Math.random() < 0.5 ? 1 : 2;
    if (boosts.extra_reroll_date !== today) { boosts.extra_reroll_date = today; boosts.extra_reroll_count = 0; }
    boosts.extra_reroll_count = (boosts.extra_reroll_count || 0) + amount;
    return `+${amount} замена заданий!`;
  }
  if (roll < 0.60) {
    const bonus = [30, 50, 80][Math.floor(Math.random() * 3)];
    const xpData = getLifeXP();
    xpData.total += bonus;
    saveLifeXP(xpData);
    return `+${bonus} XP!`;
  }
  if (roll < 0.80) {
    boosts.double_xp = today;
    return 'Двойной XP на сегодня!';
  }
  if (roll < 0.95) {
    if (boosts.shift_reroll_date !== today) { boosts.shift_reroll_date = today; boosts.shift_reroll_count = 0; }
    boosts.shift_reroll_count = (boosts.shift_reroll_count || 0) + 1;
    return '+1 замена задания смены!';
  }
  const shields = Array.isArray(boosts.streak_shields) ? boosts.streak_shields : [];
  if (!shields.includes(today)) shields.push(today);
  boosts.streak_shields = shields;
  return 'ДЖЕКПОТ: защита серии! 🛡';
}

function getShopExtraRerolls() {
  const today = todayStr();
  try {
    const boosts = uGet('lt_shop_boosts', {});
    if (boosts.extra_reroll_date === today) return boosts.extra_reroll_count || 0;
  } catch(e) {}
  return 0;
}

function shopBuyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;

  const xpData = getLifeXP();
  if (xpData.total < item.price) {
    showToast('❌ Недостаточно XP', 'error');
    return;
  }

  // Non-consumable: check if already owned
  if (!item.consumable) {
    const purchases = getShopPurchases();
    if (purchases[itemId]) {
      showToast('Уже куплено!', 'warn');
      return;
    }
    purchases[itemId] = true;
    saveShopPurchases(purchases);
    // Apply theme if purchased
    if (item.cat === 'theme') {
      applyTheme(itemId);
      uSetRaw('lt_active_theme', itemId);
      schedulePushProgress();
    }
  }

  // Deduct XP
  xpData.total -= item.price;
  saveLifeXP(xpData);

  // Apply consumable effects
  if (item.consumable) {
    const today = todayStr();
    const boosts = uGet('lt_shop_boosts', {});

    if (item.id === 'extra_reroll_1' || item.id === 'extra_reroll_3') {
      const amount = item.id === 'extra_reroll_1' ? 1 : 3;
      if (boosts.extra_reroll_date !== today) {
        boosts.extra_reroll_date = today;
        boosts.extra_reroll_count = 0;
      }
      boosts.extra_reroll_count = (boosts.extra_reroll_count || 0) + amount;
      showToast(`🎲 +${amount} замена! Используйте сегодня`, 'success');
    } else if (item.id === 'double_xp') {
      boosts.double_xp = today;
      showToast('⚡ Двойной XP активирован на сегодня', 'success');
    } else if (item.id === 'cat_choice') {
      openCategoryPicker(false);
    } else if (item.id === 'streak_shield') {
      // Щит ставим на сегодня: calcStreak учитывает защищённые дни.
      const shields = Array.isArray(boosts.streak_shields) ? boosts.streak_shields : [];
      if (!shields.includes(today)) shields.push(today);
      boosts.streak_shields = shields;
      showToast('🛡 Серия защищена — пропуск не прервёт её', 'success');
    } else if (item.id === 'shift_reroll') {
      if (boosts.shift_reroll_date !== today) {
        boosts.shift_reroll_date = today;
        boosts.shift_reroll_count = 0;
      }
      boosts.shift_reroll_count = (boosts.shift_reroll_count || 0) + 1;
      showToast('🔄 +1 замена задания смены на сегодня', 'success');
    } else if (item.id === 'mystery_box') {
      const prize = rollMysteryBox(boosts, today);
      showToast(`🎁 ${prize}`, 'success');
    }

    uSet('lt_shop_boosts', boosts);
  schedulePushProgress();
  } else {
    showToast(`✅ ${item.icon} ${item.name} куплено!`, 'success');
  }

  rainCoins(5);
  renderShop();
  renderLifeStats();
  renderLifeQuests();
  // Update wallet badge if title purchased
  render();
}

function getActiveTitle() {
  const purchases = getShopPurchases();
  if (purchases.title_sigma) return '🐺 Элита';
  if (purchases.title_legend) return '👑 Легенда';
  if (purchases.title_beast) return '🦁 Топ-перформер';
  if (purchases.title_grinder) return '💎 Профессионал';
  return null;
}

