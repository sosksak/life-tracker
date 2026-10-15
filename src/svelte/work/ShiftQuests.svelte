<script>
  // «📋 ЗАДАЧИ СМЕНЫ» (#questsPanel) вкладки «Работа». Разметка 1:1 с бывшей
  // src/html/30-tab-live.html + renderQuests() из 23-quests-shop.js.
  //
  // Каждое задание — под {#key} по его содержимому: при изменении прогресса
  // элемент пересоздаётся целиком, как при innerHTML в легаси. Это нужно
  // движку иконок (96-icon-engine.js): он подменяет текстовый узел «🎯 Заголовок»
  // на <svg> + текст, и обновлять такой узел на месте Svelte уже не может.
  // Локализацию терминов («смену» → «сессию») делает, как и раньше, MutationObserver
  // v7 — он видит новые узлы, потому что мы их пересоздаём, а не правим.
  import { quests } from './quests.svelte.js';
</script>

<div class="quests" id="questsPanel">
  <h3>📋 ЗАДАЧИ СМЕНЫ</h3>
  <div id="questList">
    {#each quests.shift as q (q.id)}
      {#key q.title + '|' + q.reward + '|' + q.text + '|' + q.pct}
        <div class="quest-item {q.done ? 'completed' : ''}">
          <div class="quest-header">
            <div class="quest-title">{q.icon} {q.title}</div>
            <div class="quest-reward">{q.reward}</div>
          </div>
          <div class="quest-progress"><div class="quest-fill {q.done ? 'done' : 'active'}" style="width:{q.pct}%"></div></div>
          <div class="quest-text">{q.text}</div>
        </div>
      {/key}
    {/each}
  </div>
</div>
