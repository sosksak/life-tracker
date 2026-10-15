// Мост к легаси-коду. Пока вся база (auth, смены, синк, модалки, тосты)
// живёт в src/js/*, Svelte-модули ходят к ней только через этот файл.
// Когда очередной кусок переедет в Svelte — меняется одна строка здесь.

const g = () => window;

export const legacy = {
  // хранилище с префиксом профиля (uGet/uSet в 10-auth.js)
  get: (k, fallback) => (typeof g().uGet === 'function' ? g().uGet(k, fallback) : fallback),
  set: (k, v) => { if (typeof g().uSet === 'function') g().uSet(k, v); },
  // вошёл ли кто-то: `let currentUser` в легаси не виден через window,
  // поэтому смотрим на префикс ключей — он пустой, пока профиля нет
  hasUser: () => typeof g().uKey === 'function' && g().uKey('') !== '',

  // облачная синхронизация прогресса (25-sync.js)
  touch() {
    if (typeof g().markLocalChange === 'function') g().markLocalChange();
    if (typeof g().schedulePushProgress === 'function') g().schedulePushProgress();
  },

  // смены — глобальный `let shifts` (не виден через window → читаем через мост LT_STATE в 20-core.js)
  shifts: () => { const s = g().LT_STATE ? g().LT_STATE.shifts : g().shifts; return Array.isArray(s) ? s : []; },
  activeShift: () => (g().LT_STATE ? g().LT_STATE.activeShift : null) || null,
  currentUser: () => (g().LT_STATE ? g().LT_STATE.currentUser : null) || null,
  // цель ₽/ч текущей сложности (для серии дней)
  streakGoal: () => { try { const S = g().LT_STATE; return S.DIFFICULTIES[S.difficulty].goal; } catch { return 0; } },
  // метаданные смен (20-core.js): перерывы, заказы, расходы, startTime — ключ date|hours|earned
  shiftMeta: () => { try { return g().getShiftMeta() || {}; } catch { return {}; } },
  shiftMetaKey: (s) => (typeof g().shiftMetaKey === 'function' ? g().shiftMetaKey(s) : `${s.date}|${s.hours}|${s.earned}`),
  shiftTotals: () => { try { return g().getShiftTotals(); } catch { return { totalEarned: 0, totalHours: 0, avgRate: 0 }; } },
  // кошелёк и уровни (31-efficiency-analytics.js / 20-core.js)
  walletBalance: () => { try { return g().getWalletBalance(); } catch { return { balance: 0, totalEarned: 0, shiftExp: 0, txInc: 0, txExp: 0, adj: 0 }; } },
  grindXP: (n, h) => { try { return g().LT_STATE.calcGrindXP(n, h); } catch { return 0; } },
  levels: () => { try { return g().LT_STATE.LEVELS || []; } catch { return []; } },
  shopOwned: (id) => { try { return !!g().getShopOwned(id); } catch { return false; } },
  fmtShort: (ms) => { try { return g().formatShortDuration(ms); } catch { return ''; } },
  // существительное единиц работы в род. мн.: заказов / рейсов / задач / сделок (50-v7.js)
  unitWord: () => { try { return g().V7.wtUnit()[2]; } catch { return 'заказов'; } },
  // Life XP за выполненный вызов недели (22-life-quests.js)
  addLifeXP: (id, xp, cat) => { try { if (typeof g().addLifeXP === 'function') g().addLifeXP(id, xp, cat); } catch (e) {} },
  calcStreak: (goal) => { try { return typeof g().calcStreak === 'function' ? g().calcStreak(goal) : 0; } catch { return 0; } },
  escapeHtml: (t) => (typeof g().escapeHtml === 'function' ? g().escapeHtml(t) : String(t)),

  // v9.17: панели заданий (22-life-quests.js / 23-quests-shop.js) — данные остались в легаси
  lq: {
    generateQuests: () => { try { return g().generateQuests() || []; } catch { return []; } },
    categories: () => g().LQ_CATEGORIES || {},
    catTextColor: (k) => { try { return g().catTextColor(k); } catch { return 'var(--text)'; } },
    chosenCategory: () => { try { return g().getChosenCategory(); } catch { return null; } },
    chosenCategoryFor: (d) => { try { return g().getChosenCategoryFor(d); } catch { return null; } },
    tomorrowStr: () => g().tomorrowStr(),
    categoryChoiceSource: () => { try { return g().getCategoryChoiceSource(); } catch { return null; } },
    lifeXP: () => { try { return g().getLifeXP(); } catch { return { total: 0, cats: {} }; } },
    level: (xp) => g().getLQLevel(xp),
    xpMultiplier: () => { try { return g().getXpMultiplier(); } catch { return 1; } },
    resolvedLifeQuests: () => { try { return g().getResolvedLifeQuests() || []; } catch { return []; } },
    lifeQuestState: () => { try { return g().getLifeQuestState(); } catch { return { checked: {}, rerolls: 0, replacements: {} }; } },
    totalRerolls: () => { try { return g().getTotalRerolls(); } catch { return 3; } },
    shiftBonuses: () => { try { return g().getShiftBonuses(); } catch { return {}; } },
    shopExtraRerolls: () => { try { return g().getShopExtraRerolls(); } catch { return 0; } },
    celebrateLevelUp: (lvl) => { try { g().celebrateLevelUp(lvl); } catch (e) {} },
  },

  // соседние модули (пока живут в легаси)
  habitsToday: () => { try { return g().HABITS.getTodayProgress(); } catch { return { done: 0, total: 0 }; } },
  healthToday: () => { try { return g().HEALTH.getTodayData(); } catch { return { water: 0, sleep: 0, mood: 0 }; } },
  cryptoValue: () => { try { return g().CRYPTO.getPortfolioValue(); } catch { return { totalUSD: 0, assets: 0, changePct: 0 }; } },
  financeMonth: () => { try { return g().FINANCE.getMonthSummary(); } catch { return { balance: 0, expenses: 0, budgetPct: 0 }; } },

  // UI-примитивы
  toast: (msg, type = 'success') => { if (typeof g().showToast === 'function') g().showToast(msg, type); },
  haptic: (kind = 'medium') => { if (typeof g().haptic === 'function') g().haptic(kind); },
  fxBig: (n) => { if (g().FX && typeof g().FX.big === 'function') g().FX.big(n); else legacy.haptic('medium'); },
  askForm: (fields, opts) => (typeof g().askForm === 'function' ? g().askForm(fields, opts) : Promise.resolve(null)),
  askConfirm: (msg, opts) => (typeof g().askConfirm === 'function' ? g().askConfirm(msg, opts) : Promise.resolve(window.confirm(msg))),
  todayStr: () => (typeof g().todayStr === 'function' ? g().todayStr() : new Date().toISOString().slice(0, 10)),
  // дата в местной зоне (20-core.js) — НЕ toISOString: тот сдвигает день на UTC
  dateStr: (d) => (typeof g().localDateStr === 'function' ? g().localDateStr(d) : (d || new Date()).toISOString().slice(0, 10)),

  // карточка скрыта раскладкой V93 (73-v93-layout.js) — тяжёлые блоки не считаем
  cardHidden: (tab, key) => { try { return !!(g().V93 && g().V93.isHidden(tab, key)); } catch { return false; } },

  // цель месяца (28-render-goal-chart.js)
  monthGoal: () => { try { return g().getMonthGoal ? g().getMonthGoal() : 0; } catch { return 0; } },
  monthNet: () => { try { return g().getMonthNet ? g().getMonthNet() : null; } catch { return null; } },

  // попросить остальные вкладки перерисоваться (кошелёк, прогноз, главная)
  rerenderOthers() {
    if (g().DASHBOARD && typeof g().DASHBOARD.render === 'function') g().DASHBOARD.render();
    if (typeof g().scheduleRender === 'function') g().scheduleRender();
  },

  switchV6Tab: (mod) => { if (typeof g().switchV6Tab === 'function') g().switchV6Tab(mod); },
};

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU');
