<script>
  // «📊 Текущая неделя vs предыдущая» (#weekCompare) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderWeekCompare() из 30-global-update-v5.js.
  // display правим через style: — V93 пишет в тот же inline style свой order, атрибут не затираем.
  import { stats, computeWeekCompare, wcLastRows } from './store.svelte.js';
  const rows = $derived((stats.wcV, computeWeekCompare()));
</script>

<div class="week-compare" id="weekCompare" style:display={rows ? 'block' : 'none'}>
  <div class="week-compare-title">📊 Текущая неделя vs предыдущая</div>
  <div class="chart-card">
    <div class="week-compare-grid" id="weekCompareGrid">{#key stats.wcV}{#if rows || wcLastRows()}{#each (rows || wcLastRows()) as r}<span class="wc-label">{r.lbl}</span><span class="wc-val">{r.val}</span><span class="wc-prev">{r.prev}</span><span class="wc-delta {r.d.cls}">{r.d.txt}</span>{/each}{/if}{/key}</div>
  </div>
</div>
