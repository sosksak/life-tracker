<script>
  // «🏅 ЛУЧШИЕ ПОКАЗАТЕЛИ» (.chart-section:4, #recordsCard) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderRecords() из 28-render-goal-chart.js.
  import { stats, computeRecords } from './store.svelte.js';
</script>

<div class="chart-section">
  <div class="chart-head"><h3>🏅 ЛУЧШИЕ ПОКАЗАТЕЛИ</h3></div>
  <div class="chart-card" id="recordsCard">
    {#key stats.recV}
      {@const r = computeRecords()}
      {#if !r}<div class="mg-note">Рекорды появятся после первой смены</div>{:else}
    <div class="mg-row"><span>💰 Лучшая смена</span><b>{r.bestEarn} <span class="rec-date">{r.bestEarnD}</span></b></div>
    <div class="mg-row"><span>💎 Лучшая ставка</span><b>{r.bestRate} <span class="rec-date">{r.bestRateD}</span></b></div>
    <div class="mg-row"><span>⏱ Самая долгая смена</span><b>{r.longest} <span class="rec-date">{r.longestD}</span></b></div>
    <div class="mg-row"><span>🔥 Лучший страйк</span><b>{r.streak}</b></div>
    {#if r.bestUnits}<div class="mg-row"><span>📦 Больше всего заказов</span><b>{r.bestUnits.v} <span class="rec-date">{r.bestUnits.d}</span></b></div>{/if}
    {#if r.totalExp}<div class="mg-row"><span>💸 Расходы за всё время</span><b>{r.totalExp.v} <span class="rec-date">{r.totalExp.net}</span></b></div>{/if}
      {/if}
    {/key}
  </div>
</div>
