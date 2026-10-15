<script>
  // «⚡ ЭФФЕКТИВНОСТЬ» вкладки «Работа». Разметка 1:1 с бывшими
  // src/html/30-tab-live.html (#effCard) + renderEff() из 31-efficiency-analytics.js.
  //
  // #effCard — карточка верхнего уровня: её class/style.order правит V93,
  // поэтому class корня статический, id/классы детей — прежние (CSS eff-*).
  import { eff, effView, setPeriod } from './eff.svelte.js';

  const PERIODS = [['today', 'Сегодня'], ['7', '7 дн'], ['30', '30 дн'], ['90', '90 дн']];
  const v = $derived(effView());
</script>

<div class="eff-card" id="effCard">
  <div class="eff-head">
    <div class="eff-title">⚡ ЭФФЕКТИВНОСТЬ</div>
    <div class="eff-seg" id="effSeg">
      {#each PERIODS as [p, lbl] (p)}
        <button class="eff-seg-btn" class:active={eff.period === p} data-p={p} onclick={() => setPeriod(p)}>{lbl}</button>
      {/each}
    </div>
  </div>
  <div id="effBody">
    {#if v.empty}
      <div class="eff-empty">Нет смен за период. Начните смену — показатели появятся сразу.</div>
    {:else}
      <div class="eff-main"><span class="eff-main-val">{v.rate}</span><span class="eff-main-unit">₽/ч</span>{#if v.delta}<span class="eff-delta {v.delta.cls}">{v.delta.sym} {v.delta.abs} ₽/ч vs {v.delta.vs}</span>{/if}</div>
      <div class="eff-sub">{v.sub}</div>
      <div class="eff-grid">
        <div class="eff-cell"><div class="eff-cell-val">{v.earned}</div><div class="eff-cell-lbl">Доход</div></div>
        <div class="eff-cell"><div class="eff-cell-val" style="color:var(--red)">{v.expenses}</div><div class="eff-cell-lbl">Расходы</div></div>
        <div class="eff-cell"><div class="eff-cell-val net">{v.net}</div><div class="eff-cell-lbl">Чистыми</div></div>
        <div class="eff-cell"><div class="eff-cell-val">{v.units}</div><div class="eff-cell-lbl">Заказов</div></div>
        <div class="eff-cell"><div class="eff-cell-val">{v.uph}</div><div class="eff-cell-lbl">Заказов/ч</div></div>
        <div class="eff-cell"><div class="eff-cell-val">{v.perUnit}</div><div class="eff-cell-lbl">За заказ</div></div>
      </div>
      <div class="eff-bars">{#each v.bars as b}<div class="eff-bar {b.cls} {b.today ? 'today' : ''}" style="height:{b.h}px" title={b.title}></div>{/each}</div>
      <div class="eff-bars-lbl"><span>{v.firstLbl}</span><span>₽/ч по дням · лучший — зелёный</span><span>{v.lastLbl}</span></div>
    {/if}
  </div>
</div>
