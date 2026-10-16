<script>
  // Оверлей «🏁 ИТОГИ СМЕНЫ» (#summaryOverlay). Разметка 1:1 с бывшей src/html/70-overlays-modals.html
  // + сетка из showDailySummary() (30-global-update-v5.js). Показ/скрытие — как раньше, легаси
  // style.display (showDailySummary/closeSummary); сетка и строка серии под {#key} — пересобираются
  // целиком, как innerHTML (движок иконок подменяет текстовые узлы с эмодзи на <svg>).
  import { live } from './live.svelte.js';
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="summary-overlay" id="summaryOverlay" style="display:none">
  <div class="summary-card">
    <div class="summary-title">🏁 ИТОГИ СМЕНЫ</div>
    <div class="summary-grid" id="summaryGrid">{#key live.summary}{#each live.summary.items as it}<div class="summary-item"><div class="summary-item-val">{it.val}</div><div class="summary-item-lbl">{it.lbl}</div></div>{/each}{/key}</div>
    {#key live.summary}<div class="summary-streak" id="summaryStreak">{live.summary.streak}</div>{/key}
    <button class="summary-close-btn" use:oc={'closeSummary()'}>Отличная работа! ✅</button>
  </div>
</div>
