<script>
  // Блок «🎯 ЦЕЛИ» (#v8Goals) на Главной. Разметка 1:1 с бывшим renderGoals()/goalsHtml()
  // из 60-v8.js. Корень #v8Goals создаёт main.js (как раньше box; на него вешает класс v8-done
  // celebrate()), компонент рендерит только содержимое; строки целей — строки html, как legacy row(): под {#each (r)}
  // по самой строке, так что пересобираются только изменившиеся. Кнопки — inline onclick
  // (поздняя привязка V8.editGoals, v97-fx по [onclick]).
  import { v8 } from './store.svelte.js';
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

  <div class="v8-goals-head"><span class="t">🎯 ЦЕЛИ</span><button class="acc-mini go" use:oc={'V8.editGoals()'}>Изменить</button></div>
  {#if v8.goals.empty}
    <div class="v8-goals-empty">Цель дня, недели и ₽/ч — прогресс на Главной и подсказки ассистента во время смены.<button class="w92-btn g wide" style="margin-top:10px" use:oc={'V8.editGoals()'}>🎯 Задать цели</button></div>
  {:else}
    {#each v8.goals.rows as r (r)}{@html r}{/each}
  {/if}
