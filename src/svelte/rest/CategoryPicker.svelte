<script>
  // Модалка «🎯 НАПРАВЛЕНИЕ ЗАДАНИЙ» (#categoryPickerModal). Разметка 1:1 с бывшей
  // src/html/63-modal-category-picker.html + openCategoryPicker() из 22-life-quests.js.
  // Кнопки — inline onclick (как раньше): pickCategory/buyCategoryChoice/closeCategoryPicker —
  // легаси (поздняя привязка), v97-fx ловит тап по [onclick]. Список, статус и заметка —
  // элементы целиком под {#key}, пересобираются на каждое открытие, как innerHTML
  // (движок иконок подменяет текстовые узлы с эмодзи на <svg>).
  import { rest } from './store.svelte.js';
  const cp = $derived(rest.cp);
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="modal-overlay" id="categoryPickerModal" class:show={cp.show}>
  <div class="modal">
    <h3>🎯 НАПРАВЛЕНИЕ ЗАДАНИЙ</h3>
    {#key cp.stateHtml}<div class="cp-state {cp.stateHtml ? cp.state : ''}" id="cpState">{@html cp.stateHtml}</div>{/key}
    <div class="cp-steps">
      <div class="cp-step"><b>1</b>Выбираешь направление</div>
      <div class="cp-step"><b>2</b>Завтра 5 из 7 заданий — из него</div>
      <div class="cp-step"><b>3</b>Ещё 2 — случайные, для разнообразия</div>
    </div>
    <div id="categoryPickerList" class="cp-grid">{#key cp}{#each cp.items as c}<button class="cat-pick-btn {c.selected ? 'is-selected' : ''}" use:oc={cp.paid ? `buyCategoryChoice('${c.key}')` : `pickCategory('${c.key}', '${cp.source}')`} style="border-color:{c.color}">
      <div class="ico">{c.icon}</div>
      <div class="nm" style="color:{c.tc}">{c.name}</div>
      <div class="cnt">{c.cnt}</div>
      <div class="xp" style="color:{c.tc}">{c.xp}</div>
    </button>{/each}{/key}</div>
    {#key cp.note}<div class="cp-note" id="cpNote">{cp.note}</div>{/key}
    <div class="modal-buttons" style="margin-top:12px">
      <button class="modal-btn secondary" use:oc={"closeCategoryPicker()"}>Закрыть</button>
    </div>
  </div>
</div>
