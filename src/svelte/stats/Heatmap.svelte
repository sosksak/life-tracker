<script>
  // «📊 Карта активности (90 дней)» (#heatmapSection) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderHeatmap() из 30-global-update-v5.js.
  // Ячейки пересобираются только когда меняется heatKey (как раньше _heatmapLastKey):
  // 90+ узлов на каждый render() — лишняя работа. invalidateShiftCache() сбрасывает ключ.
  import { stats, computeHeatmap } from './store.svelte.js';
  // style атрибутом, а не через CSSOM: иначе WebKit пересериализует rgba (0.4733 → 0.475, alpha 1 → rgb)
  function bg(node, c) { node.setAttribute('style', 'background:' + c); }
</script>

<div class="heatmap-section" id="heatmapSection" style:display={stats.heatShown ? 'block' : 'none'}>
  <div class="heatmap-title">📊 Карта активности (90 дней)</div>
  <div class="chart-card">
    <div class="heatmap-grid" id="heatmapGrid">{#key stats.heatV}{#if stats.heatHas}{@const h = computeHeatmap()}{#each h.days as d}<div class="heatmap-weekday">{d}</div>{/each}{#each h.cells as c}<div class="heatmap-cell" use:bg={c.color} title={c.title}></div>{/each}{/if}{/key}</div>
  </div>
</div>
