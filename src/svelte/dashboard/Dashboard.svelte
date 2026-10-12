<script>
  // Вкладка «Главная». Разметка 1:1 с бывшим 40-v6-dashboard.js: те же классы,
  // порядок и тексты — CSS, V93-раскладка, локализатор терминов и движок иконок
  // ничего не замечают. Расширения v7/v8/v9/v92 по-прежнему вставляют свои блоки
  // после .dash-greeting через insertAdjacentElement.
  //
  // {#key dash.version}: DASHBOARD.render() бросает версию → блок пересобирается
  // целиком, как раньше innerHTML (чужие вставки тоже сносятся и дорисовываются хуками).
  import { dash, collectMetrics, getGreeting, getAlerts, getUserDisplayName } from './store.svelte.js';

  const W = () => window;
  const dateStr = () => new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
</script>

{#key dash.version}
  {@const m = collectMetrics()}
  {@const greet = getGreeting()}
  {@const alerts = getAlerts()}
  <div class="dash-greeting">
    <span class="dash-greeting-icon">{greet.icon}</span>
    <div>
      <div class="dash-greeting-text">{greet.text}, <b>{getUserDisplayName()}</b></div>
      <div class="dash-greeting-date">{dateStr()}</div>
    </div>
  </div>

  {#if alerts.length > 0}
    <div class="dash-alerts">
      {#each alerts as a}
        <div class="dash-alert dash-alert--{a.type}"><span class="dash-alert-icon">{a.icon}</span><span>{a.text}</span></div>
      {/each}
    </div>
  {/if}

  <div class="dash-cards">
    <div class="dash-card" onclick={() => W().switchTab('shift')}>
      <div class="dash-card-header">
        <span class="dash-card-icon">💼</span>
        <span class="dash-card-title">Работа</span>
      </div>
      <div class="dash-card-value">{m.totalEarned.toLocaleString('ru-RU')} ₽</div>
      <div class="dash-card-sub">{m.shiftCount} смен · {m.avgRate} ₽/ч{m.streak > 0 ? ' · 📈 ' + m.streak + ' дн.' : ''}</div>
      <div class="dash-card-status {m.shiftActive ? 'active' : ''}">{m.shiftActive ? '▶ Смена активна' : '⏸ Нет активной смены'}</div>
    </div>

    <div class="dash-card" onclick={() => W().HABITS.openPanel()}>
      <div class="dash-card-header">
        <span class="dash-card-icon">📋</span>
        <span class="dash-card-title">Привычки</span>
      </div>
      <div class="dash-card-value">{m.habitsToday.done}/{m.habitsToday.total}</div>
      <div class="dash-card-sub">выполнено сегодня</div>
      <div class="dash-card-bar"><div class="dash-card-fill" style="width:{m.habitsToday.total > 0 ? Math.round(m.habitsToday.done / m.habitsToday.total * 100) : 0}%"></div></div>
    </div>

    <div class="dash-card" onclick={() => W().HEALTH.openPanel()}>
      <div class="dash-card-header">
        <span class="dash-card-icon">❤️</span>
        <span class="dash-card-title">Здоровье</span>
      </div>
      <div class="dash-card-value">{m.healthToday.mood ? m.healthToday.mood : '—'}</div>
      <div class="dash-card-sub">💧 {m.healthToday.water}/8 · 😴 {m.healthToday.sleep > 0 ? m.healthToday.sleep + 'ч' : '—'}</div>
    </div>

    <div class="dash-card" onclick={() => W().FINANCE.openPanel()}>
      <div class="dash-card-header">
        <span class="dash-card-icon">📊</span>
        <span class="dash-card-title">Финансы</span>
      </div>
      <div class="dash-card-value">{m.finToday.balance.toLocaleString('ru-RU')} ₽</div>
      <div class="dash-card-sub">расход: {m.finToday.expenses.toLocaleString('ru-RU')} ₽ / мес</div>
    </div>

    <div class="dash-card" onclick={() => W().CRYPTO.openPanel()}>
      <div class="dash-card-header">
        <span class="dash-card-icon">📈</span>
        <span class="dash-card-title">Портфель</span>
      </div>
      <div class="dash-card-value">{m.cryptoTotal.totalUSD > 0 ? '$' + m.cryptoTotal.totalUSD.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>
      <div class="dash-card-sub">{m.cryptoTotal.assets} активов{m.cryptoTotal.changePct !== 0 ? ' · ' + (m.cryptoTotal.changePct > 0 ? '+' : '') + m.cryptoTotal.changePct.toFixed(1) + '%' : ''}</div>
    </div>
  </div>

  <div class="dash-quick-actions">
    <div class="dash-section-title">📌 Быстрые действия</div>
    <div class="dash-actions-grid">
      {#if !m.shiftActive}
        <button class="dash-action-btn" onclick={() => { W().startShift(); W().DASHBOARD.render(); }}>▶ Начать смену</button>
      {:else}
        <button class="dash-action-btn" onclick={() => W().endShift()}>⏹ Завершить смену</button>
      {/if}
      <button class="dash-action-btn" onclick={() => W().HABITS.quickCheck()}>✅ Отметить привычку</button>
      <button class="dash-action-btn" onclick={() => W().HEALTH.quickWater()}>💧 +1 стакан воды</button>
      <button class="dash-action-btn" onclick={() => W().FINANCE.quickExpense()}>📝 Записать расход</button>
    </div>
  </div>
{/key}
