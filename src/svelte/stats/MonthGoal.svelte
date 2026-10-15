<script>
  // «📌 ПЛАН МЕСЯЦА» (.chart-section:2, #monthGoalCard) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderMonthGoal()/goalImpactHtml() из 28-render-goal-chart.js.
  // {#key stats.goalV}: карточка пересобирается целиком, как innerHTML — <details> при этом
  // закрывается, как и раньше.
  import { stats, computeMonthGoal, pluralShifts, toggleUseAdjust, scrollToCalendar } from './store.svelte.js';
  import { legacy } from '../lib/legacy.js';
  const W = () => window;
</script>

<div class="chart-section">
  <div class="chart-head">
    <h3>📌 ПЛАН МЕСЯЦА</h3>
    <button class="data-tool-btn" style="padding:6px 12px" onclick={() => W().openMonthGoalPrompt()}>✏️ Изменить</button>
  </div>
  <div class="chart-card" id="monthGoalCard">
    {#key stats.goalV}
      {@const m = computeMonthGoal()}
      {#if m.goal}
    <div class="chart-sub">
      <div><div class="big">{m.net} ₽</div><div class="lbl">чистыми из {m.goalFmt} ₽</div></div>
      <div style="text-align:right;"><div class="big">{m.pctRound}%</div><div class="lbl">{m.left > 0 ? 'осталось ' + m.leftFmt + ' ₽' : 'цель взята! 🎉'}</div></div>
    </div>
    <div class="xp-bar" style="margin:4px 0 10px;"><div class="xp-fill" style="width:{m.pct}%"></div></div>
    {#if m.left > 0 && m.shiftsLeft}<div class="mg-note">≈ ещё {m.shiftsLeft} {pluralShifts(m.shiftsLeft)} до цели</div>{/if}
      {:else}<div class="mg-note">Цель не задана — нажмите «Изменить», чтобы установить план на месяц</div>{/if}
    <div class="mg-forecast">
      <div class="mg-row"><span>📊 Прогноз к концу месяца</span><b>{m.forecast} ₽</b></div>
      <div class="mg-note" style="margin:-2px 0 6px;opacity:.8">{m.forecastHow}</div>
      <div class="mg-row"><span>📋 Отработано смен</span><b>{m.shiftsRow}</b></div>
      <div class="mg-row"><span>💰 Доход за месяц</span><b>{m.gross} ₽{#if m.txInc}{' '}<span class="rec-date">{m.grossNote}</span>{/if}</b></div>
      {#if m.spent}<div class="mg-row"><span>💸 Расходы</span><b>−{m.spentFmt} ₽{#if m.monthExp}{' '}<span class="rec-date">в сменах {m.monthExpFmt}</span>{/if}</b></div>{/if}
      {#if m.adj}<div class="mg-row"><span>⚖️ Корректировка баланса</span><b>{m.adjFmt} ₽</b></div>{/if}
      <details class="gi" ontoggle={() => legacy.haptic('light')}>
    <summary>🔍 Что влияет на цель <span class="gi-net">= {m.giNet} ₽ чистыми</span></summary>
    <div class="gi-body">
      {#each m.giRows as r}<div class="gi-row {r.cls}" style={r.adj ? (m.useAdj ? '' : 'opacity:.5;text-decoration:line-through') : undefined}><span>{r.lbl}</span><b>{r.val}</b></div>{/each}
      <label class="gi-opt"><input type="checkbox" checked={m.useAdj} onchange={(e) => toggleUseAdjust(e.currentTarget.checked)}> учитывать корректировку баланса в цели</label>
      <div class="gi-no"><b>Не влияют:</b> XP и бонусы квестов, запланированные (ещё не отработанные) смены, крипто-портфель, копилка. Только реальные деньги: пришло − ушло.</div>
      <div class="gi-no">💡 Каждый расход, записанный в «Деньги», отодвигает цель. Хочешь закрыть 100к — считай, сколько тратишь, а не только сколько заработал.</div>
    </div>
  </details>
      {#if m.monthUnits}<div class="mg-row"><span>📦 Заказов за месяц</span><b>{m.unitsRow}</b></div>{/if}
      <div class="mg-row"><span>📅 Запланировано впереди</span><b>{#if m.plannedAhead}{m.plannedText}{:else}<span style="color:var(--accent);cursor:pointer" onclick={scrollToCalendar}>отметить в календаре ›</span>{/if}</b></div>
    </div>
    {/key}
  </div>
</div>
