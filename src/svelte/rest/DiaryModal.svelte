<script>
  // Модалка «📓 Новая запись» (#diaryModal). Разметка 1:1 с бывшей src/html/70-overlays-modals.html;
  // setDiaryStar/openDiaryModal/closeDiaryModal/saveDiaryEntry — в store.svelte.js (на window через main.js).
  // Поля через bind:value — легаси читало .value при сохранении, теперь стор; id те же.
  // Звёзды до первого открытия все пустые (как в статической разметке), после — по стору.
  import { rest } from './store.svelte.js';
  const d = $derived(rest.diary);
  // Звёзды и кнопки — inline onclick как раньше (легаси-обёртки setDiaryStar/saveDiaryEntry/closeDiaryModal
  // зовут REST.*), v97-fx ловит тап по [onclick].
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="modal-overlay" id="diaryModal" class:show={d.show}>
  <div class="modal-content" style="max-width:340px">
    <div class="modal-title">📓 Новая запись</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <input type="text" id="diaryPlace" placeholder="Место/ситуация" class="manual-input" style="width:100%" bind:value={rest.diary.place}>
      <textarea id="diaryDesc" placeholder="Что произошло?" class="manual-input" rows="3" style="width:100%;resize:vertical;" bind:value={rest.diary.desc}></textarea>
      <div style="text-align:center;">
        <span style="font-size:12px;color:var(--text-dim);">Оценка:</span>
        <span id="diaryStars" class="rate-stars rate-stars-lg no-ico">
                  {#each [1, 2, 3, 4, 5] as n}<span class="rs" class:on={d.opened && n <= d.star} use:oc={`setDiaryStar(${n})`}></span>{/each}
        </span>
      </div>
      <input type="text" id="diaryLesson" placeholder="Чему научился?" class="manual-input" style="width:100%" bind:value={rest.diary.lesson}>
      <button class="modal-save-btn" use:oc={"saveDiaryEntry()"}>💾 Сохранить</button>
    </div>
    <button class="modal-close-btn" use:oc={"closeDiaryModal()"}>Отмена</button>
  </div>
</div>
