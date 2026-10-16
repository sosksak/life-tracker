<script>
  // «📑 Отчёт за месяц» (#v8Reports) во вкладке «Стата». Разметка 1:1 с бывшим
  // renderReports()/reportsHtml() из 60-v8.js. Корень #v8Reports (.v7-sec) создаёт main.js, как раньше box;
  // компонент рендерит только содержимое. Отчёт под {#key} — пересобирается целиком,
  // как innerHTML (select/кнопки — inline-атрибуты, поздняя привязка V8.*).
  import { v8 } from './store.svelte.js';
  function attr(node, [k, v]) { node.setAttribute(k, v); }
</script>

  <div class="v7-sec-head"><div class="v7-sec-title">📑 Отчёт за месяц</div><span style="font-size:11px;color:var(--text-dim)">сравнение с прошлым</span></div>
  {#key v8.rep}
    {#if v8.rep}
      {@const r = v8.rep}
      <div class="v8-rep-ctl"><select use:attr={['onchange', 'V8.setRepMonth(this.value)']}>{#each r.months as m}<option value={m.k} selected={m.sel}>{m.label}</option>{/each}</select></div>
      {#if r.hasShifts}
        <div class="v8-rep-kpi">
          {#each r.kpi as c}<div class="v8-rep-cell"><div class="v">{c.v}</div><div class="l">{c.l}</div>{#if c.d}<div class="d {c.d.cls}">{c.d.text}</div>{/if}</div>{/each}
        </div>
        <div class="v8-tax"><div>Налог <select use:attr={['onchange', 'V8.setTax(this.value)']}>{#each r.taxOpts as t}<option value={t.v} selected={t.sel}>{t.l}</option>{/each}</select><div style="margin-top:4px;color:var(--text-secondary)">{@html r.taxText}</div></div><div style="text-align:right"><div style="font-size:10.5px;color:var(--text-dim);font-weight:700">на руки после налога</div><b>{r.after}</b></div></div>
      {:else}
        <div class="eff-empty">В этом месяце смен нет.</div>
      {/if}
      <div class="v8-bars">{#each r.bars as b}<div class="col {b.cur ? 'cur' : ''}" use:attr={['onclick', `V8.setRepMonth('${b.k}')`]} title={b.title}>{#if b.small}<small>{b.small}</small>{/if}<div class="stack"><div class="t" style="height:{b.ht}px"></div><div class="x" style="height:{b.hx}px"></div><div class="e" style="height:{b.he}px"></div></div><b>{b.mon}</b></div>{/each}</div>
      <div class="v8-legend"><span><i style="background:var(--primary)"></i>чистыми</span><span><i style="background:var(--red)"></i>расходы</span>{#if r.tr}<span><i style="background:var(--orange)"></i>налог</span>{/if}</div>
      <div class="v8-rep-ctl" style="margin:10px 0 0"><button class="v8-rep-btn p" use:attr={['onclick', 'V8.exportPdf()']}>🖨 PDF / печать</button><button class="v8-rep-btn" use:attr={['onclick', 'V8.exportCsv(false)']}>📄 CSV месяц</button><button class="v8-rep-btn" use:attr={['onclick', 'V8.exportCsv(true)']}>📚 CSV всё</button></div>
    {/if}
  {/key}
