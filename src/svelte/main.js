import { mount, unmount, flushSync } from 'svelte';
import Finance from './finance/Finance.svelte';
import * as F from './finance/store.svelte.js';
import Dashboard from './dashboard/Dashboard.svelte';
import * as D from './dashboard/store.svelte.js';
import Wallet from './work/Wallet.svelte';
import ActiveShift from './work/ActiveShift.svelte';
import * as Wk from './work/store.svelte.js';
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

// Смены / профиль поменялись снаружи (синк, смена аккаунта) → перечитать.
// Без профиля не грузим: uGet читал бы ключи без префикса и «запомнил» пустоту.
window.addEventListener('lt:data-changed', () => { if (legacy.hasUser()) { F.load(); loaded = true; } });
