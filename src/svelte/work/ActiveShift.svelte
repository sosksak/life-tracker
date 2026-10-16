<script>
  // Панель активной смены. Разметка 1:1 с бывшим src/html/30-tab-live.html,
  // логика переключений — из renderActiveShift() в 21-active-shift.js.
  //
  // DOM НЕ пересобирается (никаких {#key}): в эту панель дорисовывают свои узлы
  //   • v9.22: #v8Assist после #liveRateDisplay — теперь компонент <Assist/> (src/svelte/v8), якорь статичен
  //   • 31-eff.js  → #btnFocus внутрь .shift-controls
  //   • 21/30-*.js → текст #timerDisplay / #timerSub / #liveRateAmount каждую секунду
  // Поэтому эти узлы остаются «чужими»: Svelte задаёт только классы, видимость
  // и список перерывов — ровно то, что раньше делал renderActiveShift().
  import { work, shiftView } from './store.svelte.js';
  import { live } from './live.svelte.js';
  import Assist from '../v8/Assist.svelte';

  const W = () => window;
  const s = $derived(shiftView());
  // Термины типа работы («смена» → «сессия», «заказы» → «задачи»): подставляем
  // до вставки в DOM, т.к. MutationObserver-локализатор v7 реактивные узлы не держит.
  const L = (t) => { try { return W().V7.localizeText(t); } catch { return t; } };
</script>

<div class="active-shift" id="activeShiftPanel" class:inactive={!s.active}>
  <!-- Каждое состояние — своя ветка: Svelte удаляет и создаёт элемент целиком.
       Обновлять текст на месте нельзя — движок иконок (96-icon-engine.js) заменяет
       узел с эмодзи на <svg>, и запись в уже отсоединённый узел плодила дубли. -->
  {#if !s.active}
    <h3 id="shiftStatusTitle" class="off">{L('🏠 СМЕНА НЕ АКТИВНА')}</h3>
  {:else if s.onBreak}
    <h3 id="shiftStatusTitle" class="live" style="color:var(--orange)">{L('☕ ПЕРЕРЫВ')}</h3>
  {:else}
    <h3 id="shiftStatusTitle" class="live">{L('🟢 СМЕНА АКТИВНА')}</h3>
  {/if}

  <div class="shift-timer">
    <!-- текст пишет легаси updateTimer() -->
    <div class="timer-display" id="timerDisplay" style:color={s.active && s.onBreak ? 'var(--orange)' : null}>00:00:00</div>
    <div class="timer-sub" id="timerSub">Нажмите «Начать смену»</div>
  </div>

  <!-- v9.21: прогноз смены — стор live (бывший updateLiveRate, тикает раз в секунду вместе с таймером).
       Узлы не пересобираются: Svelte меняет только текст/класс, и только когда значение изменилось,
       поэтому мутаций во время смены не больше, чем при прежнем textContent. Эмодзи в подписи
       под {#key} — иначе движок иконок подменит узел на <svg>, а обновлять его на месте нельзя. -->
  <div class="live-rate-display" id="liveRateDisplay" style:display={live.show ? 'block' : 'none'}>
    <div class="live-rate-amount {live.cls}" id="liveRateAmount">{live.amount}</div>
    {#key live.label}<div class="live-rate-label" id="liveRateLabel">{live.label}{#if live.loss}<span class="loss">{live.loss}</span>{/if}</div>{/key}
  </div>
  <Assist />

  <div class="shift-controls">
    <button class="shift-ctrl-btn btn-start" id="btnStart" onclick={() => W().startShift()} style:display={s.active ? 'none' : null}>{L('▶ НАЧАТЬ СМЕНУ')}</button>
    <button class="shift-ctrl-btn btn-break" id="btnBreak" onclick={() => W().startBreak()} style:display={s.active && !s.onBreak && !work.breakPicker ? null : 'none'}>⏸ ПЕРЕРЫВ</button>
    <button class="shift-ctrl-btn btn-resume" id="btnResume" onclick={() => W().endBreak()} style:display={s.active && s.onBreak ? null : 'none'}>▶ ПРОДОЛЖИТЬ</button>
    <button class="shift-ctrl-btn btn-end" id="btnEnd" onclick={() => W().endShift()} style:display={s.active ? null : 'none'}>{L('⏹ ЗАВЕРШИТЬ')}</button>
  </div>

  <!-- Счётчик единиц работы прямо в смене (v7.4). Существительное зависит от типа
       работы: заказы / рейсы / операции / задачи / сделки — берём из V7.wtUnit(). -->
  <div class="units-counter" id="unitsCounter" style:display={s.active ? null : 'none'}>
    <button class="uc-btn" onclick={() => W().bumpUnits(-1)} title="−1">−</button>
    <div class="uc-mid"><div class="uc-val" id="ucVal">{s.units}</div><div class="uc-lbl" id="ucLbl">{s.unitWord} · {s.uph}/ч</div></div>
    <button class="uc-btn uc-plus" onclick={() => W().bumpUnits(1)} title="+1">+</button>
    <button class="uc-btn uc-plus5" onclick={() => W().bumpUnits(5)} title="+5">+5</button>
  </div>

  <div id="breakTypeSelector" style:display={work.breakPicker ? null : 'none'} style="margin-bottom:12px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      {#each [['🍽 Обед', '🍽 Обед'], ['⏸ Личное', '⏸ Личное'], ['📋 Другое', '📋 Другое']] as [label, type]}
        <button class="shift-ctrl-btn" style="background:rgba(255,171,64,0.15);color:var(--orange);font-size:12px;padding:10px" onclick={() => W().confirmBreak(type)}>{label}</button>
      {/each}
    </div>
  </div>

  <div class="break-log" id="breakLog" style:display={s.active && s.breaks.length > 0 ? null : 'none'}>
    <h4>⏸ Перерывы:</h4>
    <div id="breakList">
      {#each s.breaks as b}
        <div class="break-item"><span class="b-type">{b.type}</span><span class="b-dur">{b.dur}</span></div>
      {/each}
    </div>
    <div class="break-total" id="breakTotal">Всего перерывов: {s.breakTotalText}</div>
  </div>
</div>
