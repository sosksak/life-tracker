<script>
  // «Задача недели» (#weeklyChallenge) вкладки «Работа». Разметка 1:1 с бывшей
  // src/html/30-tab-live.html + renderWeeklyChallenge() из 30-global-update-v5.js.
  // Элементы с эмодзи (заголовок, таймер, награда) — под {#key} из-за движка иконок.
  // Карточка в легаси показывалась всегда (display:block после первого render()).
  import { cards } from './cards.svelte.js';
  const w = $derived(cards.weekly);
</script>

<div class="weekly-challenge" id="weeklyChallenge" style:display={w ? 'block' : 'none'}>
  <div class="wchallenge-head">
    {#key w?.title}<span class="wchallenge-title" id="wcTitle">{w ? w.title : '📌 Задача недели'}</span>{/key}
    {#key w?.timer}<span class="wchallenge-timer" id="wcTimer">{w ? w.timer : ''}</span>{/key}
  </div>
  <div class="wchallenge-desc" id="wcDesc">{w ? w.desc : ''}</div>
  <div class="wchallenge-bar"><div class="wchallenge-fill" id="wcFill" style="width:{w ? w.pct : '0%'}"></div></div>
  <div class="wchallenge-progress" id="wcProgress">{w ? w.progress : ''}</div>
  {#key w?.reward}<div class="wchallenge-reward" id="wcReward">{w ? w.reward : ''}</div>{/key}
</div>
