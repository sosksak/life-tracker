<script>
  // «📅 ПО ДНЯМ НЕДЕЛИ» (.chart-section:3, #dowCard) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderDowStats() из 28-render-goal-chart.js.
  import { stats, computeDow } from './store.svelte.js';
</script>

<div class="chart-section">
  <div class="chart-head"><h3>📅 ПО ДНЯМ НЕДЕЛИ</h3></div>
  <div class="chart-card" id="dowCard">
    {#key stats.dowV}
      {@const rows = computeDow()}
      {#if !rows}<div class="mg-note">Нет данных — добавьте первую смену</div>{:else}{#each rows as r}<div class="dow-row {r.cls}">
      <span class="dow-name">{r.n}</span>
      <div class="dow-bar"><div class="dow-fill" style="width:{r.pct}"></div></div>
      <span class="dow-val">{r.val}</span>
      <span class="dow-cnt">{r.cnt}</span>
    </div>{/each}{/if}
    {/key}
  </div>
</div>
