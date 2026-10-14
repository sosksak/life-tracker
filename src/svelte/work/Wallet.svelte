<script>
  // Кошелёк вкладки «Работа». Разметка 1:1 с бывшим src/html/30-tab-live.html,
  // данные — из render() в 28-render-goal-chart.js.
  //
  // ВАЖНО: #wallet — карточка верхнего уровня, её class и style.order ставит V93
  // (скрытие/порядок). Поэтому class здесь статический, а свечение золотой рамки —
  // через style: директивы (точечный setProperty, атрибут style целиком не трогаем).
  import { walletView } from './store.svelte.js';

  const W = () => window;
  let totalEl;

  const w = $derived(walletView());

  // Число баланса анимируется countUp (как было в 31-efficiency-analytics.js),
  // поэтому текстом узла владеет анимация, а не реактивное выражение.
  $effect(() => {
    const target = Math.round(w.balance);
    if (!totalEl) return;
    if (typeof W().countUp === 'function') W().countUp(totalEl, target);
    else totalEl.textContent = target.toLocaleString('ru-RU');
  });
</script>

<div class="wallet" id="wallet"
     style:border-color={w.golden ? 'rgba(255,215,0,0.4)' : null}
     style:box-shadow={w.golden ? '0 0 25px rgba(255,215,0,0.1)' : null}>
  <div class="wallet-top">
    <div class="wallet-balance">
      <div class="wallet-label">Баланс · <span class="wallet-edit-link" onclick={() => W().editWalletBalance()}>изменить ✏️</span></div>
      <div class="wallet-total" onclick={() => W().editWalletBalance()} style="cursor:pointer">
        <span id="totalEarned" bind:this={totalEl}>0</span> <span class="currency">₽</span>
      </div>
      <div class="wallet-sub" id="walletSub">{@html w.subHtml}</div>
    </div>
    <div class="wallet-badge">
      <div class="wb-icon" id="walletBadgeIcon">{w.level.icon}</div>
      <div class="wb-text" id="walletBadgeText">LVL {w.level.lvl}</div>
    </div>
  </div>
  <div class="wallet-trend" id="walletTrend">
    {#if w.trend}
      <span class="wallet-trend-tag {w.trend.cls}">{w.trend.symbol} {w.trend.abs} ₽/час</span>
      <span class="wallet-trend-text">vs прошлая смена</span>
    {/if}
  </div>
  <div class="wallet-stats">
    <div class="wallet-stat"><span class="ws-icon">📋</span><span class="ws-val" id="totalShifts">{w.shiftCount}</span><span class="ws-lbl">смен</span></div>
    <div class="wallet-stat"><span class="ws-icon">⏱</span><span class="ws-val" id="totalHours">{w.totalHours.toFixed(1)}</span><span class="ws-lbl">часов</span></div>
    <div class="wallet-stat"><span class="ws-icon">📊</span><span class="ws-val" id="avgRate">{w.avgRate.toLocaleString('ru-RU')}</span><span class="ws-lbl">₽/час</span></div>
  </div>
</div>
