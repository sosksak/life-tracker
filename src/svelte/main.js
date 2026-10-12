import { mount, unmount } from 'svelte';
import Finance from './finance/Finance.svelte';
import * as F from './finance/store.svelte.js';
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

// Смены / профиль поменялись снаружи (синк, смена аккаунта) → перечитать.
// Без профиля не грузим: uGet читал бы ключи без префикса и «запомнил» пустоту.
window.addEventListener('lt:data-changed', () => { if (legacy.hasUser()) { F.load(); loaded = true; } });
