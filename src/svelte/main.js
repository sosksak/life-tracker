import { mount, unmount } from 'svelte';
import Finance from './finance/Finance.svelte';
import * as F from './finance/store.svelte.js';

// ------------------------------------------------------------
//  FINANCE — совместимая обёртка над Svelte-модулем.
//  Старый код зовёт FINANCE.render() / FINANCE.addAdjustment() и т.п. —
//  всё работает как прежде, но внутри живёт реактивный компонент.
// ------------------------------------------------------------
let financeApp = null;

function render() {
  const el = document.getElementById('financeContent');
  if (!el) return;
  F.load(); // перечитать localStorage: синк из облака мог обновить данные
  if (financeApp) return; // компонент уже живёт — реактивность сама всё обновит
  el.innerHTML = '';
  financeApp = mount(Finance, { target: el });
}

window.FINANCE = {
  render,
  openPanel() { window.switchV6Tab?.('finance'); render(); },
  // данные
  getTransactions: () => F.fin.tx,
  getGoals: () => F.fin.goals,
  getMonthSummary: F.getMonthSummary,
  getCategoryBreakdown: F.getCategoryBreakdown,
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
window.addEventListener('lt:data-changed', () => { F.load(); });
