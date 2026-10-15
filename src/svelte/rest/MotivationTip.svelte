<script>
  // «Мотивация дня» (#motivationTip). Разметка 1:1 с бывшей src/html/40-modal-add-shift.html,
  // текст — бывший renderMotivationTip() из 22-life-quests.js. Корень не пересоздаётся:
  // его переносит в #lifeContent V7.moveLifePanels() и прячет/переставляет V93.
  // Текст и автор (с эмодзи) — элементы целиком под {#key}: движок иконок подменяет текстовый
  // узел на фрагмент, и голый {text} под key оставлял бы сирот — пересоздаём сами div'ы, как textContent.
  import { rest } from './store.svelte.js';
</script>

<div class="motivation-tip" id="motivationTip">
  <div class="tip-icon">📋</div>
  {#key rest.tipV}<div class="tip-text" id="tipText">{rest.tip ? rest.tip.text : ''}</div>
  <div class="tip-author" id="tipAuthor">{rest.tip ? rest.tip.author : ''}</div>{/key}
</div>
