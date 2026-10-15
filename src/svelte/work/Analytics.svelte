<script>
  // «📈 АНАЛИТИКА» вкладки «Работа». Разметка 1:1 с бывшими
  // src/html/30-tab-live.html (#waCard) + renderWA()/lineChart()/dowSection()/
  // startHourSection()/forecastSection()/recordsSection() из 31-efficiency-analytics.js.
  // Корень #waCard — карточка верхнего уровня (V93), class статический, CSS wa-*/eff-* прежние.
  //
  // ⚠️ Эмодзи (📦/📊 в рекордах) и «✓» — только внутри элемента под {#key}:
  // 96-icon-engine.js подменяет текстовый узел на <svg> (replaceChild), и Svelte
  // иначе пишет в отцепившийся узел — иконка залипает (см. Habits.svelte).
  import { eff, waView, setMetric } from './eff.svelte.js';

  const METRIC_BTNS = [['rate', '₽/ч'], ['earned', 'Доход'], ['hours', 'Часы'], ['units', 'Заказы']];
  const v = $derived(waView());
</script>

<div class="eff-card" id="waCard">
  <div class="eff-head">
    <div class="eff-title">📈 АНАЛИТИКА</div>
    <div class="eff-seg" id="waMetricSeg">
      {#each METRIC_BTNS as [m, lbl] (m)}
        <button class="eff-seg-btn" class:active={eff.metric === m} data-m={m} onclick={() => setMetric(m)}>{lbl}</button>
      {/each}
    </div>
  </div>
  <div id="waBody">
    {#if v.empty}
      <div class="eff-empty">Пока нет смен — графики появятся после первой.</div>
    {:else}
      {#if !v.chart}
        <div class="eff-empty">Нет данных для графика.</div>
      {:else}
        {@const c = v.chart}
        <div class="wa-chart"><svg viewBox="0 0 {c.W} {c.H}" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="waGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".22"/><stop offset="1" stop-color="var(--primary)" stop-opacity="0"/></linearGradient></defs>
          {#each c.grid as g}<line class="wa-grid" x1={c.L} x2={c.xr} y1={g.y} y2={g.y}/><text class="wa-ytxt" x={c.L - 4} y={g.ty} text-anchor="end">{g.txt}</text>{/each}{#if c.area}<path class="wa-area" d={c.area}/>{/if}<path class="wa-line" d={c.path}/><line class="wa-avg" x1={c.L} x2={c.xr} y1={c.avgY} y2={c.avgY}/>{#if c.goalY}<line class="wa-goal" x1={c.L} x2={c.xr} y1={c.goalY} y2={c.goalY}/>{/if}{#each c.dots as d}<circle class="wa-dot {d.cls}" cx={d.cx} cy={d.cy} r={d.r}><title>{d.title}</title></circle>{/each}{#each c.xl as t}<text class="wa-xtxt" x={t.x} y={c.yb}>{t.txt}</text>{/each}</svg></div>
        <div class="wa-legend"><span><i style="border-color:var(--primary)"></i>{c.lbl}</span><span><i class="d" style="border-color:var(--accent)"></i>{c.legendAvg}</span>{#if c.legendGoal}<span><i class="d" style="border-color:var(--green)"></i>{c.legendGoal}</span>{/if}</div>
      {/if}
      <div class="eff-sub" style="margin:6px 0 0">{v.span} дн · точки — смены, зелёная — лучший день</div>

      {#if v.forecast}
        {@const f = v.forecast}
        <div class="wa-sec"><div class="wa-sec-t"><span>Прогноз месяца</span><span>осталось {f.left} дн</span></div>
          <div class="wa-fc"><div class="wa-ring"><svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="27"/>{#if f.dash}<circle class="fg" cx="32" cy="32" r="27" stroke-dasharray={f.dash}/>{/if}</svg><div class="pct">{f.pctTxt}</div></div><div class="wa-fc-txt"><b>{f.proj}</b> прогноз на месяц<br>{f.line2}<br>{#if f.kind === 'done'}{#key f.doneTxt}<span class="g">{f.doneTxt}</span>{/key}{:else if f.kind === 'need'}до цели <span class={f.needCls}>{f.need}</span>{f.needTail}{:else}Цель месяца не задана — задайте в календаре{/if}</div></div></div>
      {/if}

      {#if v.dow}
        <div class="wa-sec"><div class="wa-sec-t"><span>По дням недели</span><span>лучший — {v.dow.best}</span></div><div class="wa-rows">{#each v.dow.rows as r}<div class="wa-row {r.cls}">
          <span class="l">{r.lbl}</span><span class="b"><i style="width:{r.w}"></i></span>
          <span class="v">{#if r.n}{r.rate} <small>₽/ч · {r.n}</small>{:else}<small>—</small>{/if}</span></div>{/each}</div></div>
      {/if}

      {#if v.hours}
        <div class="wa-sec"><div class="wa-sec-t"><span>₽/ч по времени старта</span><span>лучше стартовать {v.hours.best}</span></div><div class="wa-hist">{#each v.hours.cols as col}<div class="wa-hist-col {col.hi ? 'hi' : ''}"><small>{col.small}</small><i style="height:{col.h}"></i><b>{col.lbl}</b></div>{/each}</div></div>
      {/if}

      {#if v.records}
        {@const r = v.records}
        <div class="wa-sec"><div class="wa-sec-t"><span>Рекорды и стабильность</span><span>{r.count}</span></div>
          <div class="wa-kpi">
            {#each r.cells as k}<div class="wa-kpi-cell">{#key k.ico}<div class="wa-kpi-ico">{k.ico}</div>{/key}<div><div class="wa-kpi-val">{k.val}</div><div class="wa-kpi-lbl">{k.lbl}</div></div></div>{/each}
          </div>
          <div class="wa-chips" style="margin-top:8px">
            <span class="wa-chip {r.sdCls}">{r.sdTxt}</span>
            {#if r.goalChip}<span class="wa-chip {r.goalChip.cls}">{r.goalChip.txt}</span>{/if}
            <span class="wa-chip">{r.median}</span>
          </div></div>
      {/if}
    {/if}
  </div>
</div>
