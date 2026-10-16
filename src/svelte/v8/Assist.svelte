<script>
  // Ассистент смены (#v8Assist) — внутри панели смены после #liveRateDisplay (бывший
  // renderAssist()/assistHtml() из 60-v8.js). Нет смены → элемента нет (как раньше box.remove()).
  // Обновляется каждые 5 с из хука updateTimer: темп — текстовый узел (меняется только при
  // смене строки), чипы и строки — под {#each (ключ = строка)}: пересобираются только изменившиеся,
  // а не весь блок innerHTML, как раньше.
  import { v8 } from './store.svelte.js';
</script>

{#if v8.assist}
  {@const a = v8.assist}
  <div id="v8Assist" class="v8-assist">
    <div class="v8-assist-top"><span class="v8-assist-rate">{a.rate}<small>₽/ч</small></span>{#each a.chips as c (c.cls + '|' + c.text)}<span class={c.cls ? "v8-assist-chip " + c.cls : "v8-assist-chip"}>{c.text}</span>{/each}</div>
    <div class="v8-assist-rows">{#each a.rows as r (r)}{@html r}{/each}</div>
  </div>
{/if}
