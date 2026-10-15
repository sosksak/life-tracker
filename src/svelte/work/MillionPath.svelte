<script>
  // «📈 ПЛАН ДОХОДА» (#millionPath) вкладки «Работа». Разметка 1:1 с бывшей
  // src/html/30-tab-live.html + renderMillionPath() из 30-global-update-v5.js.
  // Корень — карточка верхнего уровня: class/style.order правит V93, поэтому
  // display ставим директивой style: (setProperty), атрибут style целиком не трогаем.
  import { cards } from './cards.svelte.js';
  const m = $derived(cards.million);
</script>

<div class="million-path" id="millionPath" style:display={m ? 'block' : 'none'}>
  <div class="million-path-title">📈 ПЛАН ДОХОДА</div>
  <div class="million-bar-wrap"><div class="million-bar-fill" id="millionFill" style="width:{m ? m.pct : '0%'}"></div></div>
  <div class="million-milestones" id="millionMilestones">{#if m}{#each m.milestones as ms}<span class={ms.reached ? 'reached' : ''}>{ms.lbl}</span>{/each}{/if}</div>
  <div class="million-current" id="millionCurrent">{m ? m.current : '0 ₽ / 1 000 000 ₽'}</div>
</div>
