<script>
  // Модалка «📅 РАСПИСАНИЕ» (#calendarModal). Разметка 1:1 с бывшей src/html/41-modal-calendar.html
  // (+ хвост в 51-tab-shop.html) и renderCalendar() из 26-shift-modal-calendar.js.
  // Открытие/закрытие — как раньше, легаси classList 'show' (openCalendarModal/closeCalendarModal).
  // Кнопки — inline onclick (как раньше): calChangeMonth/calSelectDay/calMarkSelected/closeCalendarModal —
  // легаси-обёртки (поздняя привязка), v97-fx ловит тап по [onclick].
  // Сетка дней, текст выбранного дня и сводка — под {#key}: пересобираются целиком, как innerHTML
  // (движок иконок подменяет текстовые узлы с эмодзи на <svg>, обновлять их на месте нельзя).
  import { cal, computeCalendar } from './store.svelte.js';
  const c = $derived(computeCalendar());
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="modal-overlay" id="calendarModal">
  <div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto">
  <div class="cal-header">
    <button class="cal-nav-btn" use:oc={'calChangeMonth(-1)'}>◀</button>
    <div>
      <h3 style="text-align:center">📅 РАСПИСАНИЕ</h3>
      <div class="cal-month-title" id="calMonthTitle">{c.title}</div>
    </div>
    <button class="cal-nav-btn" use:oc={'calChangeMonth(1)'}>▶</button>
  </div>

  <div class="cal-weekdays">
    <div class="cal-weekday">ПН</div>
    <div class="cal-weekday">ВТ</div>
    <div class="cal-weekday">СР</div>
    <div class="cal-weekday">ЧТ</div>
    <div class="cal-weekday">ПТ</div>
    <div class="cal-weekday">СБ</div>
    <div class="cal-weekday">ВС</div>
  </div>

  <div class="cal-grid" id="calGrid">{#key cal.v}{#each c.cells as d}{#if d.empty}<div class="cal-day empty"></div>{:else}<div class={d.cls} use:oc={d.oc}>
      <div class="cal-day-num">{d.num}</div>
      {#if d.icon}<div class="cal-day-icon">{d.icon}</div>{/if}
      {#if d.earned}<div class="cal-day-earned">{d.earned}</div>{/if}
    </div>{/if}{/each}{/key}</div>

  <div class="cal-legend">
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--green)"></div> Отработано</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--orange)"></div> Запланировано</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--purple)"></div> Выходной</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:var(--gold)"></div> Сегодня</div>
  </div>

  {#key c.info.html}<div id="calSelectedInfo" class="cal-selected-info" style:display={c.info.show ? null : 'none'}>{@html c.info.html}</div>{/key}

  <div class="cal-actions">
    <button class="cal-action-btn dayoff" use:oc={"calMarkSelected('dayoff')"}>🌴 Выходной</button>
    <button class="cal-action-btn planned" use:oc={"calMarkSelected('planned')"}>📋 Смена</button>
    <button class="cal-action-btn clear" use:oc={"calMarkSelected('clear')"}>✕ Убрать</button>
  </div>

  <div class="cal-summary" id="calSummary">{#key cal.v}
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.worked}</div><div class="cal-sum-lbl">отработано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.planned}</div><div class="cal-sum-lbl">запланировано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.dayoff}</div><div class="cal-sum-lbl">выходных 🌴</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.earned}</div><div class="cal-sum-lbl">₽ за месяц</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.hours}</div><div class="cal-sum-lbl">часов</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">{c.summary.rate}</div><div class="cal-sum-lbl">₽/час сред.</div></div>
  {/key}</div>
    <button class="modal-btn secondary" use:oc={'closeCalendarModal()'} style="width:100%;margin-top:12px">✕ Закрыть</button>
  </div>
</div>
