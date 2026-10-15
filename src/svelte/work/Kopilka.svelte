<script>
  // «Копилка» (#kopilkaCard) вкладки «Работа». Разметка 1:1 с бывшей
  // src/html/30-tab-live.html + renderKopilka() из 30-global-update-v5.js.
  // Элементы с эмодзи (🎯 имя, 🎉 в подписи) — под {#key}: движок иконок
  // подменяет текстовый узел на <svg>, и Svelte иначе пишет в отцепившийся узел.
  import { cards } from './cards.svelte.js';
  const k = $derived(cards.kopilka);
  const W = () => window;
</script>

<div class="kopilka-card" id="kopilkaCard" style:display={k ? 'block' : 'none'}>
  <button class="kopilka-edit" onclick={() => W().setupKopilka()}>✏️</button>
  <div class="kopilka-row">{#key k?.name}<span class="kopilka-name" id="kopilkaName">{k ? k.name : '📌 Цель'}</span>{/key}<span class="kopilka-amount" id="kopilkaAmount">{k ? k.amount : '0 / 0 ₽'}</span></div>
  <div class="kopilka-bar"><div class="kopilka-fill" id="kopilkaFill" style="width:{k ? k.pct : '0%'}"></div></div>
  {#key k?.sub}<div class="kopilka-sub" id="kopilkaSub">{k ? k.sub : ''}</div>{/key}
</div>
