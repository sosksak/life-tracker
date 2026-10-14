import { mount, unmount, flushSync } from 'svelte';
import Finance from './finance/Finance.svelte';
import * as F from './finance/store.svelte.js';
import Dashboard from './dashboard/Dashboard.svelte';
import * as D from './dashboard/store.svelte.js';
import Wallet from './work/Wallet.svelte';
import ActiveShift from './work/ActiveShift.svelte';
import * as Wk from './work/store.svelte.js';
import Habits from './life/Habits.svelte';
import Health from './life/Health.svelte';
import * as Lf from './life/store.svelte.js';
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
});
