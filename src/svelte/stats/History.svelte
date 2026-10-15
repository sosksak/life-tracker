<script>
  // «📋 История смен» (.history, #shiftList) вкладки «Стата» + кнопки экспорта/бэкапа и строка версии.
  // Разметка 1:1 с бывшей src/html/52-tab-stats.html + блок History из render() (28-render-goal-chart.js).
  // Кнопки ✏️/✕ — inline-атрибуты onclick с id смены (как раньше), чтобы поздняя привязка
  // openEditModal/removeShift и v97-fx ([onclick]) работали без изменений; Svelte-обработчик
  // с функцией тут не подходит — у локальных смен id строковый, его кладём в JSON.
  // #versionTag / #cloudSyncTag правит легаси через textContent — они вне {#key}, не пересоздаются.
  import { stats, computeHistory } from './store.svelte.js';
  const W = () => window;
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="history">
  <h3>📋 История смен</h3>
  <div id="shiftList">{#key stats.histV}{@const list = computeHistory()}{#if !list.length}<div class="empty-state"><div class="emoji">📊</div><p>Нет данных — добавьте первую смену</p></div>{:else}{#each list as s}<div class="shift-card {s.cls} slide-up">
        <div class="shift-actions dev-only">
          <button class="shift-action-btn edit" use:oc={s.edit} title="Редактировать">✏️</button>
          <button class="shift-action-btn delete" use:oc={s.del} title="Удалить">✕</button>
        </div>
        <div class="shift-left"><div class="shift-date">{s.date} {#if s.pending}<span class="shift-pending" title="Ждёт загрузки в облако">📱</span>{/if}</div><div class="shift-hours">{s.hours} ч</div>{#if s.brk}<div class="shift-breaks" title={s.brk.title}>{s.brk.txt}</div>{/if}{#if s.extra}<div class="shift-breaks">{s.extra}</div>{/if}{#if s.note}<div class="shift-note">{s.note}</div>{/if}</div>
        <div class="shift-right"><div class="shift-earned">{s.earned} ₽</div><div class="shift-rate {s.rateCls}">{s.icon} {s.rate} ₽/час</div></div>
      </div>{/each}{/if}{/key}</div>
  <div class="data-tools">
    <button class="data-tool-btn" onclick={() => W().exportDataCSV()}>📤 Экспорт CSV</button>
    <button class="data-tool-btn" onclick={() => W().exportDataJSON()}>💾 Резервная копия</button>
    <button class="data-tool-btn dev-only" onclick={() => W().openImportPicker()}>📥 Восстановить</button>
  </div>
  <input type="file" id="importFile" accept="application/json,.json" style="display:none" onchange={(e) => W().handleImportFile(e)}>
  <div class="build-row">
    <span class="build-ver">версия <b id="versionTag">—</b></span>
    <span class="build-sync" id="cloudSyncTag"></span>
  </div>
</div>
