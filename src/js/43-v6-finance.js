// ============================================================
//  MODULE 4: FINANCE — Личные финансы
// ============================================================
// Доходы / расходы, категории, бюджет, цели накоплений.
// Дополняет данные о заработке из смен. Полностью локальный учёт.

const FINANCE = (() => {
  'use strict';

  const TX_KEY = 'v6_finance_tx';        // массив транзакций
  const BUDGET_KEY = 'v6_finance_budget'; // месячный бюджет
  const GOALS_KEY = 'v6_finance_goals';   // цели накоплений

  const EXPENSE_CATEGORIES = {
    food:      { name: 'Еда',           icon: '🍽', color: '#E53E3E' },
    transport: { name: 'Транспорт',     icon: '🚌', color: '#3182CE' },
    housing:   { name: 'Жильё',         icon: '🏠', color: '#D69E2E' },
    health:    { name: 'Здоровье',       icon: '💊', color: '#38A169' },
    clothes:   { name: 'Одежда',         icon: '👔', color: '#9F7AEA' },
    fun:       { name: 'Развлечения',   icon: '🎬', color: '#ED8936' },
    education: { name: 'Обучение',       icon: '📚', color: '#4299E1' },
    subscr:    { name: 'Подписки',       icon: '📱', color: '#667EEA' },
    other:     { name: 'Прочее',         icon: '📋', color: '#718096' },
    adjust:    { name: 'Корректировка',  icon: '⚖️', color: '#A0AEC0' },
  };

  const INCOME_CATEGORIES = {
    salary:   { name: 'Зарплата / смены', icon: '💼', color: '#38A169' },
    freelance: { name: 'Фриланс',        icon: '💻', color: '#4299E1' },
    gift:      { name: 'Подарки',         icon: '🎁', color: '#D69E2E' },
    invest:    { name: 'Инвестиции',      icon: '📈', color: '#9F7AEA' },
    other_inc: { name: 'Прочее',          icon: '📋', color: '#718096' },
    adjust:    { name: 'Корректировка',   icon: '⚖️', color: '#A0AEC0' },
  };

  function getTransactions() {
    return uGet(TX_KEY, []);
  }

  function saveTransactions(list) {
    uSet(TX_KEY, list);
    markLocalChange();
    schedulePushProgress();
  }

  function getBudget() {
    return uGet(BUDGET_KEY, { monthly: 0, categories: {} });
  }

  function saveBudget(b) {
    uSet(BUDGET_KEY, b);
    markLocalChange();
    schedulePushProgress();
  }

  function getGoals() {
    return uGet(GOALS_KEY, []);
  }

  function saveGoals(g) {
    uSet(GOALS_KEY, g);
    markLocalChange();
    schedulePushProgress();
  }

  // --- Добавление транзакций ---
  async function addTransaction(type) {
    const isExpense = type === 'expense';
    const cats = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const catOptions = Object.entries(cats).filter(([k]) => k !== 'adjust').map(([k, v]) => ({
      value: k, label: v.icon + ' ' + v.name
    }));

    const res = await askForm([
      { key: 'amount', label: 'Сумма ₽', type: 'number', placeholder: '0' },
      { key: 'category', label: 'Категория', type: 'select', options: catOptions },
      { key: 'note', label: 'Комментарий', placeholder: 'необязательно' },
    ], {
      icon: isExpense ? '📝' : '💰',
      title: isExpense ? 'Записать расход' : 'Записать доход',
      okText: 'Сохранить'
    });
    if (!res || !res.amount) return;

    const tx = getTransactions();
    tx.unshift({
      id: 'tx_' + Date.now(),
      type,
      amount: Math.abs(parseFloat(res.amount)),
      category: res.category || (isExpense ? 'other' : 'other_inc'),
      note: res.note || '',
      date: todayStr(),
      ts: Date.now(),
    });
    // Лимит записей
    if (tx.length > 5000) tx.length = 5000;
    saveTransactions(tx);
    const _amt = Math.abs(parseFloat(res.amount));
    if (isExpense) {
      let msg = `📝 Расход записан: ${_amt.toLocaleString('ru-RU')} ₽`;
      try { const g = getMonthGoal(); if (g) { const mn = getMonthNet(); msg += ` · до цели ${Math.max(0, Math.round(g - mn.net)).toLocaleString('ru-RU')} ₽`; } } catch (e) {}
      showToast(msg, _amt >= 5000 ? 'warn' : 'success'); haptic(_amt >= 5000 ? 'heavy' : 'medium');
    } else {
      showToast(`💰 Доход записан: +${_amt.toLocaleString('ru-RU')} ₽`, 'success');
      if (_amt >= 10000) FX.big(25); else haptic('medium');
    }
    render();
    if (typeof DASHBOARD !== 'undefined') DASHBOARD.render();
    if (typeof scheduleRender === 'function') scheduleRender(); // кошелёк, цели и прогнозы
  }

  // v9.6.2: ручная корректировка баланса кошелька (знак = направление)
  function addAdjustment(diff, note) {
    haptic('medium');
    const tx = getTransactions();
    tx.unshift({
      id: 'tx_' + Date.now(), type: diff > 0 ? 'income' : 'expense',
      amount: Math.abs(Math.round(diff)), category: 'adjust',
      note: note || 'Корректировка баланса', date: todayStr(), ts: Date.now(),
    });
    saveTransactions(tx);
    render();
    if (typeof DASHBOARD !== 'undefined') DASHBOARD.render();
  }

  async function quickExpense() {
    await addTransaction('expense');
  }

  async function deleteTransaction(id) {
    const ok = await askConfirm('Удалить эту запись?', {
      icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена'
    });
    if (!ok) return;
    const tx = getTransactions().filter(t => t.id !== id);
    saveTransactions(tx);
    showToast('Запись удалена', 'warn');
    render();
    if (typeof scheduleRender === 'function') scheduleRender();
  }

  // --- Аналитика ---
  function getMonthTransactions(monthOffset = 0) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const d = new Date(year, month, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return getTransactions().filter(t => t.date.startsWith(prefix));
  }

  function getMonthSummary(monthOffset = 0) {
    const txs = getMonthTransactions(monthOffset);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Добавляем заработок со смен за этот месяц
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + monthOffset;
    const d = new Date(year, month, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthShifts = (typeof shifts !== 'undefined' ? shifts : []).filter(s => s.date.startsWith(prefix));
    const shiftIncome = monthShifts.reduce((s, x) => s + x.earned, 0);
    const shiftExpenses = monthShifts.reduce((s, x) => s + (x.expenses || 0), 0);

    const totalIncome = income + shiftIncome;
    expenses += shiftExpenses; // расходы, записанные в сменах, тоже расходы
    const balance = totalIncome - expenses;
    const budget = getBudget();
    const budgetPct = budget.monthly > 0 ? Math.round(expenses / budget.monthly * 100) : 0;

    return { income: totalIncome, shiftIncome, manualIncome: income, expenses, shiftExpenses, balance, budgetPct };
  }

  function getCategoryBreakdown(monthOffset = 0) {
    const txs = getMonthTransactions(monthOffset).filter(t => t.type === 'expense');
    const breakdown = {};
    for (const t of txs) {
      if (!breakdown[t.category]) breakdown[t.category] = 0;
      breakdown[t.category] += t.amount;
    }
    return Object.entries(breakdown)
      .map(([cat, amount]) => ({
        cat,
        ...(EXPENSE_CATEGORIES[cat] || { name: cat, icon: '📋', color: '#718096' }),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // --- Бюджет ---
  async function setupBudget() {
    const current = getBudget();
    const res = await askForm([
      { key: 'monthly', label: 'Месячный бюджет ₽', type: 'number', placeholder: '50000', value: current.monthly || '' },
    ], { icon: '📊', title: 'Установить бюджет', okText: 'Сохранить' });
    if (!res) return;
    const monthly = parseInt(res.monthly) || 0;
    saveBudget({ ...current, monthly });
    showToast(`📊 Бюджет: ${monthly.toLocaleString('ru-RU')} ₽/мес`, 'success');
    render();
  }

  // --- Цели накоплений ---
  async function addGoal() {
    const res = await askForm([
      { key: 'name', label: 'Название цели', placeholder: 'Новый ноутбук' },
      { key: 'target', label: 'Сумма ₽', type: 'number', placeholder: '100000' },
    ], { icon: '🎯', title: 'Новая цель', okText: 'Создать' });
    if (!res || !res.name || !res.target) return;

    const goals = getGoals();
    goals.push({
      id: 'goal_' + Date.now(),
      name: res.name.trim(),
      target: parseInt(res.target),
      saved: 0,
      createdAt: Date.now(),
    });
    saveGoals(goals);
    showToast('🎯 Цель добавлена', 'success');
    render();
  }

  async function addToGoal(goalId) {
    const goals = getGoals();
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const res = await askForm([
      { key: 'amount', label: 'Сумма пополнения ₽', type: 'number', placeholder: '1000' },
    ], { icon: '💰', title: `Пополнить «${escapeHtml(goal.name)}»`, okText: 'Добавить' });
    if (!res || !res.amount) return;
    goal.saved = (goal.saved || 0) + parseInt(res.amount);
    saveGoals(goals);
    showToast(`💰 +${parseInt(res.amount).toLocaleString('ru-RU')} ₽ к цели`, 'success');
    render();
  }

  async function removeGoal(goalId) {
    const ok = await askConfirm('Удалить эту цель?', {
      icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена'
    });
    if (!ok) return;
    saveGoals(getGoals().filter(g => g.id !== goalId));
    showToast('Цель удалена', 'warn');
    render();
  }

  // --- Рендер ---
  function render() {
    const container = document.getElementById('financeContent');
    if (!container) return;

    const summary = getMonthSummary();
    const budget = getBudget();
    const breakdown = getCategoryBreakdown();
    const goals = getGoals();
    const recentTx = getTransactions().slice(0, 15);

    const now = new Date();
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    let html = `
      <div class="fin-month-header">
        <span class="fin-month-title">📊 ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
        <button class="fin-budget-btn" onclick="FINANCE.setupBudget()">
          ${budget.monthly > 0 ? '✏️ Бюджет: ' + budget.monthly.toLocaleString('ru-RU') + ' ₽' : '📌 Установить бюджет'}
        </button>
      </div>

      <div class="fin-summary-cards">
        <div class="fin-card fin-card--income">
          <div class="fin-card-label">Доход</div>
          <div class="fin-card-value">${summary.income.toLocaleString('ru-RU')} ₽</div>
          <div class="fin-card-sub">смены: ${summary.shiftIncome.toLocaleString('ru-RU')} · прочее: ${summary.manualIncome.toLocaleString('ru-RU')}</div>
        </div>
        <div class="fin-card fin-card--expense">
          <div class="fin-card-label">Расходы</div>
          <div class="fin-card-value">${summary.expenses.toLocaleString('ru-RU')} ₽</div>
          ${summary.shiftExpenses ? `<div class="fin-card-sub">в сменах: ${summary.shiftExpenses.toLocaleString('ru-RU')}</div>` : ''}
          ${budget.monthly > 0 ? `<div class="fin-card-bar"><div class="fin-card-fill ${summary.budgetPct > 90 ? 'danger' : summary.budgetPct > 70 ? 'warn' : ''}" style="width:${Math.min(summary.budgetPct, 100)}%"></div></div>
          <div class="fin-card-sub">${summary.budgetPct}% бюджета</div>` : ''}
        </div>
        <div class="fin-card fin-card--balance">
          <div class="fin-card-label">Баланс</div>
          <div class="fin-card-value ${summary.balance >= 0 ? 'positive' : 'negative'}">${summary.balance >= 0 ? '+' : ''}${summary.balance.toLocaleString('ru-RU')} ₽</div>
        </div>
      </div>

      <div class="fin-actions">
        <button class="fin-action-btn fin-action--expense" onclick="FINANCE.addTransaction('expense')">📝 Записать расход</button>
        <button class="fin-action-btn fin-action--income" onclick="FINANCE.addTransaction('income')">💰 Записать доход</button>
      </div>
    `;

    // Разбивка по категориям
    if (breakdown.length > 0) {
      const maxCat = breakdown[0].amount;
      html += `
        <div class="fin-section">
          <div class="fin-section-title">📋 Расходы по категориям</div>
          <div class="fin-breakdown">
            ${breakdown.map(b => {
              const pct = maxCat > 0 ? Math.round(b.amount / maxCat * 100) : 0;
              const totalPct = summary.expenses > 0 ? Math.round(b.amount / summary.expenses * 100) : 0;
              return `<div class="fin-cat-row">
                <span class="fin-cat-icon">${b.icon}</span>
                <span class="fin-cat-name">${b.name}</span>
                <div class="fin-cat-bar"><div class="fin-cat-fill" style="width:${pct}%;background:${b.color}"></div></div>
                <span class="fin-cat-amount">${b.amount.toLocaleString('ru-RU')} ₽</span>
                <span class="fin-cat-pct">${totalPct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Цели накоплений
    html += `
      <div class="fin-section">
        <div class="fin-section-title">🎯 Цели накоплений</div>
        ${goals.length > 0 ? goals.map(g => {
          const pct = g.target > 0 ? Math.min(Math.round(g.saved / g.target * 100), 100) : 0;
          return `<div class="fin-goal">
            <div class="fin-goal-header">
              <span class="fin-goal-name">${escapeHtml(g.name)}</span>
              <span class="fin-goal-amount">${g.saved.toLocaleString('ru-RU')} / ${g.target.toLocaleString('ru-RU')} ₽</span>
            </div>
            <div class="fin-goal-bar"><div class="fin-goal-fill ${pct >= 100 ? 'complete' : ''}" style="width:${pct}%"></div></div>
            <div class="fin-goal-footer">
              <span>${pct}%${pct >= 100 ? ' ✅ Достигнута!' : ''}</span>
              <span>
                <button class="fin-goal-btn" onclick="FINANCE.addToGoal('${g.id}')">+ Пополнить</button>
                <button class="fin-goal-btn fin-goal-btn--del" onclick="FINANCE.removeGoal('${g.id}')">✕</button>
              </span>
            </div>
          </div>`;
        }).join('') : '<div class="fin-empty">Нет целей — добавьте первую</div>'}
        <button class="fin-add-goal-btn" onclick="FINANCE.addGoal()">＋ Новая цель</button>
      </div>
    `;

    // Последние транзакции
    if (recentTx.length > 0) {
      html += `
        <div class="fin-section">
          <div class="fin-section-title">📝 Последние операции</div>
          <div class="fin-tx-list">
            ${recentTx.map(t => {
              const isExp = t.type === 'expense';
              const cats = isExp ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
              const cat = cats[t.category] || { icon: '📋', name: t.category };
              const dp = t.date.split('-');
              const dateObj = new Date(parseInt(dp[0]), parseInt(dp[1]) - 1, parseInt(dp[2]));
              const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
              return `<div class="fin-tx-item">
                <span class="fin-tx-icon">${cat.icon}</span>
                <div class="fin-tx-info">
                  <div class="fin-tx-cat">${cat.name}</div>
                  ${t.note ? `<div class="fin-tx-note">${escapeHtml(t.note)}</div>` : ''}
                </div>
                <div class="fin-tx-right">
                  <div class="fin-tx-amount ${isExp ? 'expense' : 'income'}">${isExp ? '-' : '+'}${t.amount.toLocaleString('ru-RU')} ₽</div>
                  <div class="fin-tx-date">${dateStr}</div>
                </div>
                <button class="fin-tx-del" onclick="FINANCE.deleteTransaction('${t.id}')" title="Удалить">✕</button>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  function openPanel() {
    if (typeof switchV6Tab === 'function') switchV6Tab('finance');
    render();
  }

  return {
    getTransactions, addTransaction, addAdjustment, deleteTransaction, quickExpense, EXPENSE_CATEGORIES,
    getMonthSummary, getCategoryBreakdown, setupBudget,
    addGoal, addToGoal, removeGoal, getGoals,
    render, openPanel,
  };
})();


