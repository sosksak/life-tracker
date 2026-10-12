// Финансы: данные + операции. Реактивный стор на Svelte 5 runes.
// Ключи localStorage те же, что в старом 43-v6-finance.js — данные
// пользователя переезжают без миграции.
import { legacy, fmt } from '../lib/legacy.js';

const TX_KEY = 'v6_finance_tx';
const BUDGET_KEY = 'v6_finance_budget';
const GOALS_KEY = 'v6_finance_goals';

export const EXPENSE_CATEGORIES = {
  food:      { name: 'Еда',           icon: '🍽', color: '#E53E3E' },
  transport: { name: 'Транспорт',     icon: '🚌', color: '#3182CE' },
  housing:   { name: 'Жильё',         icon: '🏠', color: '#D69E2E' },
  health:    { name: 'Здоровье',      icon: '💊', color: '#38A169' },
  clothes:   { name: 'Одежда',        icon: '👔', color: '#9F7AEA' },
  fun:       { name: 'Развлечения',   icon: '🎬', color: '#ED8936' },
  education: { name: 'Обучение',      icon: '📚', color: '#4299E1' },
  subscr:    { name: 'Подписки',      icon: '📱', color: '#667EEA' },
  other:     { name: 'Прочее',        icon: '📋', color: '#718096' },
  adjust:    { name: 'Корректировка', icon: '⚖️', color: '#A0AEC0' },
};

export const INCOME_CATEGORIES = {
  salary:    { name: 'Зарплата / смены', icon: '💼', color: '#38A169' },
  freelance: { name: 'Фриланс',          icon: '💻', color: '#4299E1' },
  gift:      { name: 'Подарки',          icon: '🎁', color: '#D69E2E' },
  invest:    { name: 'Инвестиции',       icon: '📈', color: '#9F7AEA' },
  other_inc: { name: 'Прочее',           icon: '📋', color: '#718096' },
  adjust:    { name: 'Корректировка',    icon: '⚖️', color: '#A0AEC0' },
};

// --- состояние ---
export const fin = $state({
  tx: [],
  budget: { monthly: 0, categories: {} },
  goals: [],
  shiftsVersion: 0, // инкремент → пересчёт сводки, когда меняются смены снаружи
});

export function load() {
  fin.tx = legacy.get(TX_KEY, []);
  fin.budget = legacy.get(BUDGET_KEY, { monthly: 0, categories: {} });
  fin.goals = legacy.get(GOALS_KEY, []);
  fin.shiftsVersion++;
}

function persistTx()     { legacy.set(TX_KEY, fin.tx); legacy.touch(); }
function persistBudget() { legacy.set(BUDGET_KEY, fin.budget); legacy.touch(); }
function persistGoals()  { legacy.set(GOALS_KEY, fin.goals); legacy.touch(); }

// --- аналитика ---
function monthPrefix(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthTransactions(offset = 0) {
  const p = monthPrefix(offset);
  return fin.tx.filter((t) => t.date && t.date.startsWith(p));
}

export function getMonthSummary(offset = 0) {
  const txs = getMonthTransactions(offset);
  const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  let expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const p = monthPrefix(offset);
  const monthShifts = legacy.shifts().filter((s) => s.date && s.date.startsWith(p));
  const shiftIncome = monthShifts.reduce((s, x) => s + (x.earned || 0), 0);
  const shiftExpenses = monthShifts.reduce((s, x) => s + (x.expenses || 0), 0);

  const totalIncome = income + shiftIncome;
  expenses += shiftExpenses;
  const balance = totalIncome - expenses;
  const budgetPct = fin.budget.monthly > 0 ? Math.round((expenses / fin.budget.monthly) * 100) : 0;
  return { income: totalIncome, shiftIncome, manualIncome: income, expenses, shiftExpenses, balance, budgetPct };
}

export function getCategoryBreakdown(offset = 0) {
  const acc = {};
  for (const t of getMonthTransactions(offset)) {
    if (t.type !== 'expense') continue;
    acc[t.category] = (acc[t.category] || 0) + t.amount;
  }
  return Object.entries(acc)
    .map(([cat, amount]) => ({ cat, ...(EXPENSE_CATEGORIES[cat] || { name: cat, icon: '📋', color: '#718096' }), amount }))
    .sort((a, b) => b.amount - a.amount);
}

// --- операции ---
export async function addTransaction(type) {
  const isExpense = type === 'expense';
  const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const catOptions = Object.entries(cats)
    .filter(([k]) => k !== 'adjust')
    .map(([k, v]) => ({ value: k, label: v.icon + ' ' + v.name }));

  const res = await legacy.askForm(
    [
      { key: 'amount', label: 'Сумма ₽', type: 'number', placeholder: '0' },
      { key: 'category', label: 'Категория', type: 'select', options: catOptions },
      { key: 'note', label: 'Комментарий', placeholder: 'необязательно' },
    ],
    { icon: isExpense ? '📝' : '💰', title: isExpense ? 'Записать расход' : 'Записать доход', okText: 'Сохранить' },
  );
  if (!res || !res.amount) return;

  const amt = Math.abs(parseFloat(res.amount));
  if (!amt) return;
  fin.tx.unshift({
    id: 'tx_' + Date.now(), type, amount: amt,
    category: res.category || (isExpense ? 'other' : 'other_inc'),
    note: res.note || '', date: legacy.todayStr(), ts: Date.now(),
  });
  if (fin.tx.length > 5000) fin.tx.length = 5000;
  persistTx();

  if (isExpense) {
    let msg = `📝 Расход записан: ${fmt(amt)} ₽`;
    const g = legacy.monthGoal(); const mn = legacy.monthNet();
    if (g && mn) msg += ` · до цели ${fmt(Math.max(0, g - mn.net))} ₽`;
    legacy.toast(msg, amt >= 5000 ? 'warn' : 'success');
    legacy.haptic(amt >= 5000 ? 'heavy' : 'medium');
  } else {
    legacy.toast(`💰 Доход записан: +${fmt(amt)} ₽`, 'success');
    if (amt >= 10000) legacy.fxBig(25); else legacy.haptic('medium');
  }
  legacy.rerenderOthers();
}

export function addAdjustment(diff, note) {
  legacy.haptic('medium');
  fin.tx.unshift({
    id: 'tx_' + Date.now(), type: diff > 0 ? 'income' : 'expense',
    amount: Math.abs(Math.round(diff)), category: 'adjust',
    note: note || 'Корректировка баланса', date: legacy.todayStr(), ts: Date.now(),
  });
  persistTx();
  legacy.rerenderOthers();
}

export async function deleteTransaction(id) {
  const ok = await legacy.askConfirm('Удалить эту запись?', { icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена' });
  if (!ok) return;
  fin.tx = fin.tx.filter((t) => t.id !== id);
  persistTx();
  legacy.toast('Запись удалена', 'warn');
  legacy.rerenderOthers();
}

export async function setupBudget() {
  const res = await legacy.askForm(
    [{ key: 'monthly', label: 'Месячный бюджет ₽', type: 'number', placeholder: '50000', value: fin.budget.monthly || '' }],
    { icon: '📊', title: 'Установить бюджет', okText: 'Сохранить' },
  );
  if (!res) return;
  fin.budget = { ...fin.budget, monthly: parseInt(res.monthly) || 0 };
  persistBudget();
  legacy.toast(`📊 Бюджет: ${fmt(fin.budget.monthly)} ₽/мес`, 'success');
}

export async function addGoal() {
  const res = await legacy.askForm(
    [
      { key: 'name', label: 'Название цели', placeholder: 'Новый ноутбук' },
      { key: 'target', label: 'Сумма ₽', type: 'number', placeholder: '100000' },
    ],
    { icon: '🎯', title: 'Новая цель', okText: 'Создать' },
  );
  if (!res || !res.name || !res.target) return;
  fin.goals.push({ id: 'goal_' + Date.now(), name: res.name.trim(), target: parseInt(res.target), saved: 0, createdAt: Date.now() });
  persistGoals();
  legacy.toast('🎯 Цель добавлена', 'success');
}

export async function addToGoal(goalId) {
  const goal = fin.goals.find((g) => g.id === goalId);
  if (!goal) return;
  const res = await legacy.askForm(
    [{ key: 'amount', label: 'Сумма пополнения ₽', type: 'number', placeholder: '1000' }],
    { icon: '💰', title: `Пополнить «${goal.name}»`, okText: 'Добавить' },
  );
  if (!res || !res.amount) return;
  goal.saved = (goal.saved || 0) + parseInt(res.amount);
  persistGoals();
  legacy.toast(`💰 +${fmt(parseInt(res.amount))} ₽ к цели`, 'success');
}

export async function removeGoal(goalId) {
  const ok = await legacy.askConfirm('Удалить эту цель?', { icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена' });
  if (!ok) return;
  fin.goals = fin.goals.filter((g) => g.id !== goalId);
  persistGoals();
  legacy.toast('Цель удалена', 'warn');
}
