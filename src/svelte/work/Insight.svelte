<script>
  // «Рекомендация» (#insightCard) вкладки «Работа». Разметка 1:1 с бывшей
  // src/html/30-tab-live.html + renderInsight() из 30-global-update-v5.js.
  // Текст содержит <b> — как и раньше, вставляется как HTML. Иконка — под {#key}.
  import { cards } from './cards.svelte.js';
  const i = $derived(cards.insight);
</script>

<div class="insight-card" id="insightCard" style:display={i ? 'block' : 'none'}>
  {#key i?.icon}<span class="insight-icon" id="insightIcon">{i ? i.icon : '📋'}</span>{/key}
  <div class="insight-text" id="insightText">{#key i?.html}{@html i ? i.html : ''}{/key}</div>
  <div class="insight-label">📋 Рекомендация</div>
</div>
