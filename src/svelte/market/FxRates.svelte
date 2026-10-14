<script>
  /** FxRates — валюты ЦБ РФ с конвертером. */
  import { onMount } from 'svelte';
  import { market, FX_LIST, fxFetch, fxPick, fxSwap, fxSetAmount, fxConvert, fxDateLabel, fxSpark, fmtRub } from './store.svelte.js';

  onMount(() => { fxFetch(); });

  const conv = $derived(fxConvert());

  function sparkPath(pts) {
    if (pts.length < 2) return '';
    const W = 52, H = 18;
    const min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
    return pts.map((v, i) => (i / (pts.length - 1) * (W - 2) + 1).toFixed(1) + ',' + ((1 - (v - min) / span) * (H - 4) + 2).toFixed(1)).join(' ');
  }
  function sparkCls(pts) {
    if (pts.length < 2) return 'flat';
    return pts[pts.length - 1] > pts[0] ? 'up' : pts[pts.length - 1] < pts[0] ? 'down' : 'flat';
  }
</script>

<div class="mk-section" id="mkFx">
  <div class="mk-fx-head">
    <div class="mk-section-title">💱 Валюты</div>
    <div class="mk-fx-date">{fxDateLabel()}{market.fxErr ? ' · кэш' : ''}</div>
  </div>

  {#if !market.fxRates}
    <div class="mk-section-sub">
      {#if market.fxErr}
        ⚠️ Нет связи с ЦБ РФ
      {:else}
        <span class="mk-skel">загрузка курсов…</span>
      {/if}
    </div>
  {:else}
    <div class="mk-fx-grid">
      {#each FX_LIST as f (f.code)}
        {@const r = market.fxRates[f.code]}
        {#if r}
          {@const d = r.value - r.previous}
          {@const p = r.previous ? d / r.previous * 100 : 0}
          {@const cls = Math.abs(d) < 0.00005 ? 'flat' : d > 0 ? 'up' : 'down'}
          {@const chTxt = cls === 'flat' ? '0,00' : (d > 0 ? '▲ +' : '▼ ') + d.toFixed(2).replace('.', ',') + ' (' + (p > 0 ? '+' : '') + p.toFixed(2).replace('.', ',') + '%)'}
          {@const pts = fxSpark(f.code)}
          <button class="mk-fx" class:on={f.code === market.fxCode} onclick={() => fxPick(f.code)}>
            <div class="mk-fx-top"><span class="mk-fx-flag">{f.flag}</span><span class="mk-fx-code">{f.code}</span></div>
            <div class="mk-fx-name">{f.name}</div>
            <div class="mk-fx-val">{fmtRub(r.value)}</div>
            <div class="mk-fx-row">
              <span class="mk-fx-ch {cls}">{chTxt}</span>
              {#if pts.length >= 2}
                <svg class="mk-fx-spark {sparkCls(pts)}" viewBox="0 0 52 18"><polyline points={sparkPath(pts)}/></svg>
              {/if}
            </div>
          </button>
        {/if}
      {/each}
    </div>

    <!-- Конвертер -->
    <div class="mk-fx-calc">
      <input
        type="number"
        inputmode="decimal"
        min="0"
        step="any"
        value={market.fxAmount}
        oninput={(e) => fxSetAmount(e.target.value)}
      />
      <span class="mk-fx-unit">{market.fxDir === 'to' ? '₽' : market.fxCode}</span>
      <button class="mk-fx-swap" onclick={fxSwap} title="Поменять направление">⇄</button>
    </div>
    {#if conv}
      <div class="mk-fx-out">
        = {conv.fromRub ? conv.result.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + market.fxCode : fmtRub(conv.result)}
        <span>· 1 {market.fxCode} = {fmtRub(conv.rate, 4)}</span>
      </div>
    {/if}
  {/if}
</div>
