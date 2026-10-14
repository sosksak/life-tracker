<script>
  import { crypto, rows, allocation, getPortfolioValue, pricesAge,
           addHolding, editHolding, removeHolding, refreshPrices,
           fetchPrices, load, usd2, usdMax } from './store.svelte.js';

  // Загрузка данных и цен при монтировании
  $effect(() => {
    load();
    fetchPrices();
  });

  const pv = $derived(getPortfolioValue());
  const assets = $derived(rows());
  const alloc = $derived(allocation());
  const age = $derived(pricesAge());
</script>

<div class="crypto-summary">
  <div class="crypto-total-label">📈 Стоимость портфеля</div>
  <div class="crypto-total-value">${usd2(pv.totalUSD)}</div>
  <div class="crypto-total-pnl" class:positive={pv.pnl >= 0} class:negative={pv.pnl < 0}>
    P&L: {pv.pnl >= 0 ? '+' : ''}${usd2(pv.pnl)}
    ({pv.changePct >= 0 ? '+' : ''}{pv.changePct.toFixed(2)}%)
  </div>
  <div class="crypto-total-cost">Вложено: ${usd2(pv.totalCost)}</div>
</div>

{#if alloc.length > 1}
  <div class="crypto-section">
    <div class="crypto-section-title">📊 Распределение</div>
    <div class="crypto-alloc">
      {#each alloc as a (a.symbol)}
        <div class="crypto-alloc-row">
          <span class="crypto-alloc-sym">{a.symbol}</span>
          <div class="crypto-alloc-bar"><div class="crypto-alloc-fill" style="width:{a.barPct}%"></div></div>
          <span class="crypto-alloc-pct">{a.pct.toFixed(1)}%</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<div class="crypto-section">
  <div class="crypto-section-title">💼 Активы</div>

  {#if assets.length === 0}
    <div class="crypto-empty">Портфель пуст — добавьте первый актив</div>
  {:else}
    <div class="crypto-holdings">
      {#each assets as h (h.id)}
        <div class="crypto-holding">
          <div class="crypto-hold-top">
            <div class="crypto-hold-left">
              <span class="crypto-hold-icon">{h.icon}</span>
              <div>
                <div class="crypto-hold-symbol">{h.symbol}</div>
                <div class="crypto-hold-name">{h.name}</div>
              </div>
            </div>
            <div class="crypto-hold-right">
              <div class="crypto-hold-value">${usdMax(h.value)}</div>
              <div class="crypto-hold-change" class:positive={h.change24 >= 0} class:negative={h.change24 < 0}>
                {h.change24 >= 0 ? '▲' : '▼'} {Math.abs(h.change24).toFixed(2)}% (24ч)
              </div>
            </div>
          </div>
          <div class="crypto-hold-details">
            <span>Кол-во: {h.amount}</span>
            <span>Цена: ${usdMax(h.price, 6)}</span>
            <span>Покупка: ${usdMax(h.buyPrice)}</span>
            <span class:positive={h.pnl >= 0} class:negative={h.pnl < 0}>
              P&L: {h.pnl >= 0 ? '+' : ''}${h.pnl.toFixed(2)} ({h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%)
            </span>
          </div>
          <div class="crypto-hold-actions">
            <button onclick={() => editHolding(h.id)}>✏️ Изменить</button>
            <button onclick={() => removeHolding(h.id)}>✕ Удалить</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <button class="crypto-add-btn" onclick={addHolding}>＋ Добавить актив</button>
</div>

<div class="crypto-refresh">
  <button class="crypto-refresh-btn" onclick={refreshPrices}>🔄 Обновить цены</button>
  <span class="crypto-refresh-info">{age}</span>
</div>
