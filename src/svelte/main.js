import { mount, unmount, flushSync } from 'svelte';
import Finance from './finance/Finance.svelte';
import * as F from './finance/store.svelte.js';
import Dashboard from './dashboard/Dashboard.svelte';
import * as D from './dashboard/store.svelte.js';
import Wallet from './work/Wallet.svelte';
import ActiveShift from './work/ActiveShift.svelte';
import * as Wk from './work/store.svelte.js';
import Efficiency from './work/Efficiency.svelte';
import Analytics from './work/Analytics.svelte';
import * as Ef from './work/eff.svelte.js';
import MillionPath from './work/MillionPath.svelte';
import Kopilka from './work/Kopilka.svelte';
import WeeklyChallenge from './work/WeeklyChallenge.svelte';
import Insight from './work/Insight.svelte';
import * as Cd from './work/cards.svelte.js';
import ShiftQuests from './work/ShiftQuests.svelte';
import LifeQuests from './work/LifeQuests.svelte';
import * as Q from './work/quests.svelte.js';
import Habits from './life/Habits.svelte';
import Health from './life/Health.svelte';
import * as Lf from './life/store.svelte.js';
import Crypto from './money/Crypto.svelte';
import * as Cr from './money/store.svelte.js';
import Market from './market/Market.svelte';
import * as Mk from './market/store.svelte.js';
import { legacy } from './lib/legacy.js';

// ------------------------------------------------------------
//  FINANCE — совместимая обёртка над Svelte-модулем.
//  Старый код зовёт FINANCE.render() / FINANCE.addAdjustment() и т.п. —
//  всё работает как прежде, но внутри живёт реактивный компонент.
// ------------------------------------------------------------
let financeApp = null;

// БАГ v9.8.0: стор заполнялся только при открытии вкладки «Деньги» или по
// событию lt:data-changed (которое синк шлёт лишь когда облако что-то поменяло).
// До этого getTransactions() отдавал [] → кошелёк/цель считались без
// корректировок и расходов, и после перезагрузки баланс «откатывался».
// Теперь первый же запрос к данным лениво читает localStorage.
let loaded = false;
function ensureLoaded() {
  if (loaded) return;
  // uGet зависит от currentUser — без профиля префикс ключей неверный, ждём.
  if (!legacy.hasUser()) return;
  F.load();
  loaded = true;
}

function render() {
  const el = document.getElementById('financeContent');
  if (!el) return;
  F.load(); loaded = true; // перечитать localStorage: синк из облака мог обновить данные
  if (financeApp) return; // компонент уже живёт — реактивность сама всё обновит
  el.innerHTML = '';
  financeApp = mount(Finance, { target: el });
}

window.FINANCE = {
  render,
  openPanel() { window.switchV6Tab?.('finance'); render(); },
  // данные
  getTransactions: () => { ensureLoaded(); return F.fin.tx; },
  getGoals: () => { ensureLoaded(); return F.fin.goals; },
  getMonthSummary: (o) => { ensureLoaded(); return F.getMonthSummary(o); },
  getCategoryBreakdown: (o) => { ensureLoaded(); return F.getCategoryBreakdown(o); },
  EXPENSE_CATEGORIES: F.EXPENSE_CATEGORIES,
  // операции
  addTransaction: F.addTransaction,
  quickExpense: () => F.addTransaction('expense'),
  addAdjustment: F.addAdjustment,
  deleteTransaction: F.deleteTransaction,
  setupBudget: F.setupBudget,
  addGoal: F.addGoal,
  addToGoal: F.addToGoal,
  removeGoal: F.removeGoal,
  // служебное: смены изменились снаружи — пересчитать сводку
  refresh: () => { F.fin.shiftsVersion++; },
  _unmount() { if (financeApp) { unmount(financeApp); financeApp = null; } },
};

// ------------------------------------------------------------
//  DASHBOARD — вкладка «Главная» (бывший src/js/40-v6-dashboard.js).
//  API прежний: DASHBOARD.render() / collectMetrics() / getAlerts().
//  Расширения v7/v8/v9/v92 оборачивают render() и сразу после него ищут
//  .dash-greeting, чтобы вставить свои блоки, — поэтому flushSync(): DOM
//  должен быть пересобран синхронно, как раньше при innerHTML.
// ------------------------------------------------------------
let dashApp = null;

function renderDashboard() {
  const el = document.getElementById('dashboardContent');
  if (!el) return;
  if (!dashApp) { el.innerHTML = ''; dashApp = mount(Dashboard, { target: el }); }
  else D.dash.version++;
  flushSync();
}

window.DASHBOARD = {
  render: renderDashboard,
  collectMetrics: D.collectMetrics,
  getAlerts: D.getAlerts,
  _unmount() { if (dashApp) { unmount(dashApp); dashApp = null; } },
};

// ------------------------------------------------------------
//  WORK — вкладка «Работа»: кошелёк (#wallet) и панель смены (#activeShiftPanel).
//  Разметка жила в src/html/30-tab-live.html, обновлялась из render()
//  (28-render-goal-chart.js) и renderActiveShift() (21-active-shift.js).
//  Теперь это два Svelte-компонента, смонтированных в пустые хосты
//  #wallet-host / #shift-host на том же месте вкладки.
//
//  Почему монтируем «в точку», а не перерисовываем вкладку целиком: карточками
//  верхнего уровня владеет V93 (скрытие .lt-card-hidden + style.order), а внутрь
//  панели смены дорисовывают узлы v8-ассистент и кнопка «Фокус». Поэтому компоненты
//  отдают ровно те же корневые элементы с теми же id, и чужие вставки живут как раньше.
// ------------------------------------------------------------
let walletApp = null, shiftApp = null;

function mountWork() {
  const wh = document.getElementById('wallet-host');
  if (wh && !walletApp) { wh.innerHTML = ''; walletApp = mount(Wallet, { target: wh }); }
  const sh = document.getElementById('shift-host');
  if (sh && !shiftApp) { sh.innerHTML = ''; shiftApp = mount(ActiveShift, { target: sh }); }
}

// Легаси зовёт WORK.render() там, где раньше правил DOM кошелька/панели.
// flushSync: вызывающий код сразу после этого ищет #v8Assist, .shift-controls,
// #totalEarned — DOM должен быть готов синхронно, как было при innerHTML.
function renderWork() {
  mountWork();
  Wk.bump();
  flushSync();
}

window.WORK = {
  render: renderWork,
  mount: mountWork,
  // бывший breakTypeSelector.style.display — теперь состояние стора
  showBreakPicker(on) { Wk.work.breakPicker = !!on; flushSync(); },
  isBreakPickerOpen: () => Wk.work.breakPicker,
  _unmount() {
    if (walletApp) { unmount(walletApp); walletApp = null; }
    if (shiftApp) { unmount(shiftApp); shiftApp = null; }
  },
};

// ------------------------------------------------------------
//  EFF — карточки «⚡ ЭФФЕКТИВНОСТЬ» (#effCard) и «📈 АНАЛИТИКА» (#waCard)
//  вкладки «Работа» (бывший IIFE EFF в src/js/31-efficiency-analytics.js).
//  API прежний: EFF.render() / setPeriod(p) / setMetric(m); ключи
//  localStorage v7_eff_period / v7_wa_metric те же.
//  Монтируются в хосты #eff-host / #wa-host (display:contents) — корни
//  #effCard/#waCard остаются прямыми детьми вкладки для V93-раскладки.
//  Скрытую V93 карточку не пересчитываем (как раньше через _hid()).
// ------------------------------------------------------------
let effApp = null, waApp = null;

function mountEff() {
  const eh = document.getElementById('eff-host');
  if (eh && !effApp) { eh.innerHTML = ''; effApp = mount(Efficiency, { target: eh }); }
  const wh = document.getElementById('wa-host');
  if (wh && !waApp) { wh.innerHTML = ''; waApp = mount(Analytics, { target: wh }); }
}

function renderEff() {
  mountEff();
  if (!legacy.cardHidden('contentLive', '#effCard')) Ef.eff.effV++;
  if (!legacy.cardHidden('contentLive', '#waCard')) Ef.eff.waV++;
  flushSync();
}

// Во время смены ₽/ч и заказы тикают — обновляем раз в 30с, только когда вкладка активна.
setInterval(() => { if (legacy.activeShift() && document.getElementById('contentLive')?.classList.contains('active')) renderEff(); }, 30000);

window.EFF = {
  render: renderEff,
  mount: mountEff,
  setPeriod(p) { mountEff(); Ef.setPeriod(p); renderEff(); },
  setMetric(m) { mountEff(); Ef.setMetric(m); Ef.eff.waV++; flushSync(); },
  _unmount() {
    if (effApp) { unmount(effApp); effApp = null; }
    if (waApp) { unmount(waApp); waApp = null; }
  },
};

// ------------------------------------------------------------
//  CARDS — четыре карточки вкладки «Работа»: «📈 ПЛАН ДОХОДА» (#millionPath),
//  «Копилка» (#kopilkaCard), «Задача недели» (#weeklyChallenge), «Рекомендация»
//  (#insightCard). Бывшие renderMillionPath/renderKopilka/renderWeeklyChallenge/
//  renderInsight из src/js/30-global-update-v5.js (→ _archive/30-cards-legacy.js).
//  Ключи localStorage kopilka / weekly_challenge те же. Монтируются в хосты
//  #million-host и т.д. (display:contents) — корни остаются прямыми детьми вкладки (V93).
//  Скрытую V93 карточку не пересчитываем (как раньше через _hid()).
//  Модалка копилки (#kopilkaModal) осталась в src/html/70-overlays-modals.html,
//  её onclick-обработчики setupKopilka/saveKopilka/closeKopilkaModal — ниже, на window.
// ------------------------------------------------------------
const cardApps = {};
const CARD_DEFS = [['million', 'million-host', MillionPath, '#millionPath'], ['kopilka', 'kopilka-host', Kopilka, '#kopilkaCard'],
  ['weekly', 'weekly-host', WeeklyChallenge, '#weeklyChallenge'], ['insight', 'insight-host', Insight, '#insightCard']];

function mountCards() {
  for (const [k, host, Cmp] of CARD_DEFS) {
    const h = document.getElementById(host);
    if (h && !cardApps[k]) { h.innerHTML = ''; cardApps[k] = mount(Cmp, { target: h }); }
  }
}

function renderCards() {
  mountCards();
  const which = {};
  for (const [k, , , sel] of CARD_DEFS) which[k] = !legacy.cardHidden('contentLive', sel);
  Cd.refresh(which);
  flushSync();
}

function setupKopilka() {
  const k = Cd.getKopilka() || {};
  document.getElementById('kopilkaNameInput').value = k.name || '';
  document.getElementById('kopilkaGoalInput').value = k.goal || '';
  document.getElementById('kopilkaModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeKopilkaModal() {
  document.getElementById('kopilkaModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}
function saveKopilka() {
  const name = document.getElementById('kopilkaNameInput').value.trim();
  const goal = parseInt(document.getElementById('kopilkaGoalInput').value) || 0;
  if (goal <= 0) { legacy.toast('❌ Укажи сумму цели', 'error'); return; }
  Cd.saveKopilkaData({ name: name || 'Цель', goal });
  closeKopilkaModal();
  mountCards(); Cd.refresh({ kopilka: true }); flushSync();
  legacy.toast(`🎯 Цель «${name || 'Цель'}» установлена`, 'success');
}

window.CARDS = {
  render: renderCards,
  mount: mountCards,
  getKopilka: Cd.getKopilka,
  getWeeklyChallenge: Cd.getWeeklyChallenge,
  WEEKLY_CHALLENGES: Cd.WEEKLY_CHALLENGES,
  _unmount() { for (const k in cardApps) { unmount(cardApps[k]); delete cardApps[k]; } },
};
window.setupKopilka = setupKopilka;
window.closeKopilkaModal = closeKopilkaModal;
window.saveKopilka = saveKopilka;

// ------------------------------------------------------------
//  QUESTS — «📋 ЗАДАЧИ СМЕНЫ» (#questsPanel) и «📌 ЛИЧНЫЕ ЗАДАЧИ» (#lifeQuestsPanel).
//  Бывшие renderQuests() (23-quests-shop.js), renderLifeQuests()/renderLifeStats()
//  (22-life-quests.js) → _archive/22-quests-legacy.js. Легаси-обёртки с теми же
//  именами остались и зовут QUESTS.renderShift/renderLife/renderStats.
//  Хосты #quests-host / #life-quests-host (display:contents) — панели остаются
//  прямыми детьми вкладки для V93; #lifeQuestsPanel потом уносит в #lifeContent
//  V7.moveLifePanels() — корень один, компонент не перемонтируется.
//  Монтируем сразу при загрузке бандла (хосты уже в DOM): раньше панели были
//  статической разметкой и существовали до init(), на это рассчитывает moveLifePanels().
// ------------------------------------------------------------
let shiftQApp = null, lifeQApp = null;

function mountQuests() {
  const qh = document.getElementById('quests-host');
  if (qh && !shiftQApp) { qh.innerHTML = ''; shiftQApp = mount(ShiftQuests, { target: qh }); }
  const lh = document.getElementById('life-quests-host');
  if (lh && !lifeQApp) { lh.innerHTML = ''; lifeQApp = mount(LifeQuests, { target: lh }); }
}

function renderShiftQuests() {
  mountQuests();
  Q.quests.shift = Q.computeShift();
  flushSync();
}
function renderLifeQuests() {
  mountQuests();
  Q.quests.life = Q.computeLife();
  flushSync();
}
function renderLifeStats() {
  mountQuests();
  const st = Q.computeStats();
  Q.quests.stats = st;
  flushSync();
  Q.afterStats(st); // level-up: бейдж #lqBadge уже в DOM
}

window.QUESTS = {
  renderShift: renderShiftQuests,
  renderLife: renderLifeQuests,
  renderStats: renderLifeStats,
  mount: mountQuests,
  _unmount() {
    if (shiftQApp) { unmount(shiftQApp); shiftQApp = null; }
    if (lifeQApp) { unmount(lifeQApp); lifeQApp = null; }
  },
};
mountQuests();

// ------------------------------------------------------------
//  LIFE — вкладка «Жизнь»: привычки (бывший src/js/41-v6-habits.js)
//  и здоровье (бывший src/js/42-v6-health.js).
//  API прежний: HABITS.* и HEALTH.* — их зовут дашборд, v7-сводка,
//  счётчики подвкладок V994 и кнопка «показать» из V93.
//
//  Два отдельных монтирования в #habitsContent / #healthContent: слоты
//  создаёт buildV6Containers() (46-v6-nav.js), а V93 считает карточками
//  не сами слоты, а их детей (.v6-module-slot — обёртка). Поэтому
//  компоненты отдают те же корневые .hab-* / .health-section прямыми
//  детьми слотов, иначе скрытие и перестановка карточек сломаются.
//
//  flushSync: сразу после HABITS.render() хук v7 зовёт moveLifePanels() и
//  renderLifeExtras(), которые ищут узлы внутри #lifeContent, — DOM должен
//  быть готов синхронно, как было при innerHTML.
// ------------------------------------------------------------
let habitsApp = null, healthApp = null;

function renderHabits() {
  const el = document.getElementById('habitsContent');
  if (!el) return;
  Lf.load();
  if (!habitsApp) { el.innerHTML = ''; habitsApp = mount(Habits, { target: el }); }
  else Lf.bump();   // повторный вызов (V93 вернул карточку, синк) — пересчитать
  flushSync();
}

function renderHealth() {
  const el = document.getElementById('healthContent');
  if (!el) return;
  Lf.load();
  if (!healthApp) { el.innerHTML = ''; healthApp = mount(Health, { target: el }); }
  else Lf.bump();
  flushSync();
}

window.HABITS = {
  render: renderHabits,
  openPanel() { window.switchV6Tab?.('habits'); renderHabits(); },
  // данные
  getHabits: Lf.getHabits,
  isChecked: Lf.isChecked,
  getStreak: Lf.getStreak,
  getCompletionRate: Lf.getCompletionRate,
  getTodayProgress: Lf.getTodayProgress,
  // операции
  toggle: Lf.toggle,
  addHabit: Lf.addHabit,
  removeHabit: Lf.removeHabit,
  toggleActive: Lf.toggleActive,
  quickCheck: Lf.quickCheck,
  saveHabits: (list) => { Lf.life.habits = list; legacy.set('v6_habits', list); legacy.touch(); },
  _unmount() { if (habitsApp) { unmount(habitsApp); habitsApp = null; } },
};

window.HEALTH = {
  render: renderHealth,
  openPanel() { window.switchV6Tab?.('health'); renderHealth(); },
  MOODS: Lf.MOODS,
  // данные
  getTodayData: Lf.getTodayData,
  getDayData: Lf.getDayData,
  getWeekStats: Lf.getWeekStats,
  getWeightHistory: Lf.getWeightHistory,
  // операции
  quickWater: Lf.quickWater,
  setWater: Lf.setWater,
  setMood: Lf.setMood,
  setSleep: Lf.setSleep,
  setWeight: Lf.setWeight,
  setExercise: Lf.setExercise,
  _unmount() { if (healthApp) { unmount(healthApp); healthApp = null; } },
};

// Смены / профиль поменялись снаружи (синк, смена аккаунта) → перечитать.
// Без профиля не грузим: uGet читал бы ключи без префикса и «запомнил» пустоту.
window.addEventListener('lt:data-changed', () => {
  if (!legacy.hasUser()) return;
  F.load(); loaded = true;
  Lf.load();
  Cr.load();
});

// ------------------------------------------------------------
//  CRYPTO — крипто-портфель (бывший src/js/44-v6-crypto.js).
//  API прежний: CRYPTO.render() / getHoldings() / getPortfolioValue() и т.д.
// ------------------------------------------------------------
let cryptoApp = null;

function renderCrypto() {
  const el = document.getElementById('cryptoContent');
  if (!el) return;
  Cr.load();
  if (!cryptoApp) { el.innerHTML = ''; cryptoApp = mount(Crypto, { target: el }); }
  else Cr.crypto.now = Date.now();  // обновить возраст цен
  flushSync();
}

window.CRYPTO = {
  render: renderCrypto,
  openPanel() { window.switchV6Tab?.('crypto'); renderCrypto(); },
  // данные
  getHoldings: Cr.getHoldings,
  getPortfolioValue: Cr.getPortfolioValue,
  POPULAR_COINS: Cr.POPULAR_COINS,
  // операции
  addHolding: Cr.addHolding,
  editHolding: Cr.editHolding,
  removeHolding: Cr.removeHolding,
  fetchPrices: Cr.fetchPrices,
  refreshPrices: Cr.refreshPrices,
  _unmount() { if (cryptoApp) { unmount(cryptoApp); cryptoApp = null; } },
};

// ------------------------------------------------------------
//  MARKET — биржа крипты и валют ЦБ (бывший src/js/45-v6-market.js).
//  API прежний: MARKET.render() / setCoin() / refresh() и т.д.
// ------------------------------------------------------------
let marketApp = null;

function renderMarket() {
  const el = document.getElementById('marketContent');
  if (!el) return;
  if (!marketApp) {
    el.innerHTML = '';
    marketApp = mount(Market, { target: el });
  }
  // flushSync убран — он вызывал зависание
}

window.MARKET = {
  render: renderMarket,
  openPanel() { window.switchV6Tab?.('market'); renderMarket(); },
  // действия
  setCoin: Mk.setCoin,
  setRange: Mk.setRange,
  setCur: Mk.setCur,
  refresh: Mk.refresh,
  editWatch() { window.askConfirm && renderMarket(); },  // откроет диалог из компонента
  lookup: Mk.lookup,
  quick(hoursAgo) { Mk.lookup(Date.now() - hoursAgo * 3600e3); },
  rerun(coin, ts) { if (coin !== Mk.market.coin) Mk.setCoin(coin); Mk.lookup(ts); },
  COINS: Mk.COINS,
  // FX
  fxPick: Mk.fxPick,
  fxSwap: Mk.fxSwap,
  fxAmount: Mk.fxSetAmount,
  _unmount() { if (marketApp) { unmount(marketApp); marketApp = null; } },
};
