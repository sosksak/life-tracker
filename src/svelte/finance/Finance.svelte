<script>
  import { fin, getMonthSummary, getCategoryBreakdown, EXPENSE_CATEGORIES, INCOME_CATEGORIES,
           addTransaction, deleteTransaction, setupBudget, addGoal, addToGoal, removeGoal } from './store.svelte.js';
  import { fmt } from '../lib/legacy.js';

  // всё ниже пересчитывается само, когда меняются tx / budget / goals / shiftsVersion
  const summary   = $derived.by(() => { fin.shiftsVersion; return getMonthSummary(); });
  const breakdown = $derived(getCategoryBreakdown());
  const recentTx  = $derived(fin.tx.slice(0, 15));
  const monthName = $derived.by(() => {
    const s = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  function txDate(t) {
    const [y, m, d] = (t.date || '').split('-').map(Number);
    if (!y) return '';
    return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
  const cat = (t) => (t.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[t.category] || { icon: '📋', name: t.category };
  const barClass = (pct) => (pct > 90 ? 'danger' : pct > 70 ? 'warn' : '');
</script>

<div class="fin-month-header">
  <span class="fin-month-title">📊 {monthName}</span>
  <button class="fin-budget-btn" onclick={setupBudget}>
    {fin.budget.monthly > 0 ? `✏️ Бюджет: ${fmt(fin.budget.monthly)} ₽` : '📌 Установить бюджет'}
  </button>
</div>

<div class="fin-summary-cards">
  <div class="fin-card fin-card--income">
    <div class="fin-card-label">Доход</div>
    <div class="fin-card-value">{fmt(summary.income)} ₽</div>
    <div class="fin-card-sub">смены: {fmt(summary.shiftIncome)} · прочее: {fmt(summary.manualIncome)}</div>
  </div>
  <div class="fin-card fin-card--expense">
    <div class="fin-card-label">Расходы</div>
    <div class="fin-card-value">{fmt(summary.expenses)} ₽</div>
    {#if summary.shiftExpenses}
      <div class="fin-card-sub">в сменах: {fmt(summary.shiftExpenses)}</div>
    {/if}
    {#if fin.budget.monthly > 0}
      <div class="fin-card-bar"><div class="fin-card-fill {barClass(summary.budgetPct)}" style="width:{Math.min(summary.budgetPct, 100)}%"></div></div>
      <div class="fin-card-sub">{summary.budgetPct}% бюджета</div>
    {/if}
  </div>
  <div class="fin-card fin-card--balance">
    <div class="fin-card-label">Баланс</div>
    <div class="fin-card-value {summary.balance >= 0 ? 'positive' : 'negative'}">{summary.balance >= 0 ? '+' : ''}{fmt(summary.balance)} ₽</div>
  </div>
</div>

<div class="fin-actions">
  <button class="fin-action-btn fin-action--expense" onclick={() => addTransaction('expense')}>📝 Записать расход</button>
  <button class="fin-action-btn fin-action--income" onclick={() => addTransaction('income')}>💰 Записать доход</button>
</div>

{#if breakdown.length > 0}
  {@const maxCat = breakdown[0].amount}
  <div class="fin-section">
    <div class="fin-section-title">📋 Расходы по категориям</div>
    <div class="fin-breakdown">
      {#each breakdown as b (b.cat)}
        <div class="fin-cat-row">
          <span class="fin-cat-icon">{b.icon}</span>
          <span class="fin-cat-name">{b.name}</span>
          <div class="fin-cat-bar"><div class="fin-cat-fill" style="width:{maxCat > 0 ? Math.round(b.amount / maxCat * 100) : 0}%;background:{b.color}"></div></div>
          <span class="fin-cat-amount">{fmt(b.amount)} ₽</span>
          <span class="fin-cat-pct">{summary.expenses > 0 ? Math.round(b.amount / summary.expenses * 100) : 0}%</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<div class="fin-section">
  <div class="fin-section-title">🎯 Цели накоплений</div>
  {#each fin.goals as g (g.id)}
    {@const pct = g.target > 0 ? Math.min(Math.round(g.saved / g.target * 100), 100) : 0}
    <div class="fin-goal">
      <div class="fin-goal-header">
        <span class="fin-goal-name">{g.name}</span>
        <span class="fin-goal-amount">{fmt(g.saved)} / {fmt(g.target)} ₽</span>
      </div>
      <div class="fin-goal-bar"><div class="fin-goal-fill" class:complete={pct >= 100} style="width:{pct}%"></div></div>
      <div class="fin-goal-footer">
        <span>{pct}%{pct >= 100 ? ' ✅ Достигнута!' : ''}</span>
        <span>
          <button class="fin-goal-btn" onclick={() => addToGoal(g.id)}>+ Пополнить</button>
          <button class="fin-goal-btn fin-goal-btn--del" onclick={() => removeGoal(g.id)}>✕</button>
        </span>
      </div>
    </div>
  {:else}
    <div class="fin-empty">Нет целей — добавьте первую</div>
  {/each}
  <button class="fin-add-goal-btn" onclick={addGoal}>＋ Новая цель</button>
</div>

{#if recentTx.length > 0}
  <div class="fin-section">
    <div class="fin-section-title">📝 Последние операции</div>
    <div class="fin-tx-list">
      {#each recentTx as t (t.id)}
        {@const c = cat(t)}
        {@const isExp = t.type === 'expense'}
        <div class="fin-tx-item">
          <span class="fin-tx-icon">{c.icon}</span>
          <div class="fin-tx-info">
            <div class="fin-tx-cat">{c.name}</div>
            {#if t.note}<div class="fin-tx-note">{t.note}</div>{/if}
          </div>
          <div class="fin-tx-right">
            <div class="fin-tx-amount {isExp ? 'expense' : 'income'}">{isExp ? '-' : '+'}{fmt(t.amount)} ₽</div>
            <div class="fin-tx-date">{txDate(t)}</div>
          </div>
          <button class="fin-tx-del" onclick={() => deleteTransaction(t.id)} title="Удалить">✕</button>
        </div>
      {/each}
    </div>
  </div>
{/if}
