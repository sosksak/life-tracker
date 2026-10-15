<script>
  // «📈 ДИНАМИКА» (.chart-section) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderChart() из 28-render-goal-chart.js.
  // Корень — карточка верхнего уровня (class/style.order правит V93), ключ V93 — «chart-section».
  import { stats, computeChart, setChartMode, loadChartMode } from './store.svelte.js';
  const W = () => window;
  function pick(d) { setChartMode(d); }
</script>

<div class="chart-section">
  <div class="chart-head">
    <h3>📈 ДИНАМИКА</h3>
    <div class="chart-switch">
      <button id="chartMode7" class:active={stats.chartMode === 7} onclick={() => pick(7)}>7 дней</button>
      <button id="chartMode14" class:active={stats.chartMode === 14} onclick={() => pick(14)}>14 дней</button>
      <button id="chartMode30" class:active={stats.chartMode === 30} onclick={() => pick(30)}>30 дней</button>
    </div>
  </div>
  <div class="chart-card">
    {#key stats.chartV + ':' + stats.chartMode}
      {@const c = computeChart(stats.chartMode)}
      <div class="chart-sub">
        <div><div class="big" id="chartTotal">{c.total}</div><div class="lbl" id="chartPeriodLbl">{c.lbl}</div></div>
        <div style="text-align:right;"><div class="big" id="chartAvg">{c.avg}</div><div class="lbl">в среднем за день</div></div>
      </div>
      <div id="chartBody">
        {#if c.empty}
          <div class="chart-empty">Нет данных за этот период<br>Добавьте смену — появится график</div>
        {:else}
          <div class="chart-bars{c.dense}">{#each c.bars as b}<div class="chart-bar-wrap" title={b.title}>
            {#if b.val}<div class="chart-val">{b.val}</div>{/if}
            <div class="chart-bar {b.cls}" style="height:{b.h}"></div>
          </div>{/each}</div>
          <div class="chart-xaxis{c.dense}">{#each c.labels as l}<div class="chart-xlabel {l.today ? 'today' : ''}">{l.txt}</div>{/each}</div>
          <div class="chart-legend">
            <span><i style="background:var(--green)"></i> цель достигнута</span>
            <span><i style="background:#CBD5E0"></i> ниже цели</span>
          </div>
        {/if}
      </div>
    {/key}
  </div>
</div>
