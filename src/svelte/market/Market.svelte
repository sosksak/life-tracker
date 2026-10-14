<script>
  /**
   * Market.svelte — вкладка «Биржа» на экране «Деньги».
   * Крипто-тикер + SVG-график + валюты ЦБ РФ.
   */
  import { onMount } from 'svelte';
  import {
    market, COINS, RANGES, load, fetchData, setCoin, setRange, setCur, refresh, setWatch,
    lookup, fmtPrice, fmtDT, toLocalInputValue, coinOf
  } from './store.svelte.js';
  import ChartSVG from './ChartSVG.svelte';
  import FxRates from './FxRates.svelte';

  // Загрузка при монтировании (один раз)
  onMount(() => {
    load();
    fetchData();
    // Авто-обновление раз в минуту
    const timer = setInterval(() => { if (!document.hidden) fetchData(true); }, 60000);
    return () => clearInterval(timer);
  });

  // Локальные вычисления без реактивного цикла
  function getCoin() { return coinOf(market.coin); }
  function getPrice() { return market.ticker[market.coin]?.[market.cur]; }
  function getChange() { return market.ticker[market.coin]?.[market.cur + '_24h_change']; }
  function getUpdAt() {
    const ts = market.ticker[market.coin]?.last_updated_at;
    return ts ? 'обновлено ' + fmtDT(ts * 1000).slice(11) : '';
  }

  // Lookup state
  let whenValue = $state(toLocalInputValue(Date.now() - 3600e3));
  const maxWhen = toLocalInputValue(Date.now()); // фиксированное значение

  function doLookup() {
    const ts = new Date(whenValue).getTime();
    if (!isFinite(ts)) { window.showToast?.('Укажи дату и время', 'error'); return; }
    if (ts > Date.now()) { window.showToast?.('Будущее ещё не торгуется 🙂', 'error'); return; }
    lookup(ts);
  }
  function quick(hoursAgo) {
    whenValue = toLocalInputValue(Date.now() - hoursAgo * 3600e3);
    doLookup();
  }
  function rerun(h) {
    if (h.coin !== market.coin) setCoin(h.coin);
    whenValue = toLocalInputValue(h.ts);
    doLookup();
  }

  // Edit watch list
  function editWatch() {
    const html = '<div class="mk-pick">' + COINS.map(c => {
      const on = market.watch.includes(c.id);
      return '<label class="mk-pick-row"><input type="checkbox" data-coin="' + c.id + '"' + (on ? ' checked' : '') + '><span class="mk-pick-ico">' + c.icon + '</span><span class="mk-pick-sym">' + c.symbol + '</span><span class="mk-pick-name">' + c.name + '</span></label>';
    }).join('') + '</div>';
    window.askConfirm?.(html, { icon: '📋', title: 'Список монет', okText: 'Сохранить', noText: 'Отмена' }).then(ok => {
      if (!ok) return;
      const list = [...document.querySelectorAll('.mk-pick input:checked')].map(i => i.dataset.coin);
      setWatch(list);
    });
  }

  // Stats
  function getStats() {
    const pts = market.chartPts;
    if (!pts || pts.length < 2) return null;
    const ys = pts.map(p => p[1]);
    const first = ys[0], last = ys[ys.length - 1];
    const d = first ? (last - first) / first * 100 : 0;
    const rl = RANGES.find(r => r.id === market.range);
    return { min: Math.min(...ys), max: Math.max(...ys), d, label: rl?.label || '' };
  }

  const chartWidth = 340;
</script>

<div class="mk-wrap">
  <div class="mk-title">📈 Биржа</div>

  <!-- Hero: выбранная монета -->
  <div class="mk-hero">
    <div class="mk-hero-top">
      <div class="mk-hero-coin">
        <span class="mk-coin-ico">{getCoin().icon}</span>
        <div>
          <div class="mk-coin-sym">{getCoin().symbol}</div>
          <div class="mk-coin-name">{getCoin().name}</div>
        </div>
      </div>
      <div class="mk-cur" role="tablist">
        <button class:on={market.cur === 'usd'} onclick={() => setCur('usd')}>USD</button>
        <button class:on={market.cur === 'rub'} onclick={() => setCur('rub')}>RUB</button>
      </div>
    </div>
    <div class="mk-price">{fmtPrice(getPrice(), market.cur)}</div>
    <div class="mk-hero-row">
      {#if getChange() != null}
        <span class="mk-chg" class:up={getChange() >= 0} class:down={getChange() < 0}>
          {getChange() >= 0 ? '▲ +' : '▼ '}{getChange().toFixed(2)}% за 24ч
        </span>
      {:else}
        <span class="mk-chg">—</span>
      {/if}
      <span class="mk-upd">{getUpdAt()}</span>
    </div>
  </div>

  <!-- Watch list -->
  <div class="mk-watch">
    {#each market.watch as id (id)}
      {@const c = coinOf(id)}
      {@const wt = market.ticker[id] || {}}
      {@const wch = wt[market.cur + '_24h_change']}
      <button class="mk-chip" class:on={id === market.coin} onclick={() => setCoin(id)}>
        <span class="mk-chip-sym">{c.icon} {c.symbol}</span>
        <span class="mk-chip-price">{fmtPrice(wt[market.cur], market.cur)}</span>
        {#if wch != null}
          <span class="mk-chip-ch" class:up={wch >= 0} class:down={wch < 0}>{wch >= 0 ? '+' : ''}{wch.toFixed(1)}%</span>
        {/if}
      </button>
    {/each}
    <button class="mk-chip add" onclick={editWatch} title="Настроить список">＋</button>
  </div>

  <!-- Chart card -->
  <div class="mk-card">
    <div class="mk-ranges">
      {#each RANGES as r (r.id)}
        <button class:on={r.id === market.range} onclick={() => setRange(r.id)}>{r.label}</button>
      {/each}
    </div>
    <ChartSVG pts={market.chartPts} cur={market.cur} range={market.range} width={chartWidth} />
    {#if getStats()}
      {@const stats = getStats()}
      <div class="mk-stats">
        <div><div class="k">Мин · {stats.label}</div><div class="v">{fmtPrice(stats.min, market.cur)}</div></div>
        <div><div class="k">Макс · {stats.label}</div><div class="v">{fmtPrice(stats.max, market.cur)}</div></div>
        <div><div class="k">Изменение</div><div class="v" class:up={stats.d >= 0} class:down={stats.d < 0}>{stats.d >= 0 ? '+' : ''}{stats.d.toFixed(2)}%</div></div>
      </div>
    {/if}
  </div>

  <!-- Lookup: курс на момент времени -->
  <div class="mk-section">
    <div class="mk-section-title">🕒 Курс на момент времени</div>
    <div class="mk-section-sub">Выбери дату и время — покажем ближайшую котировку {getCoin().symbol} и разницу с текущей</div>
    <div class="mk-lookup-row">
      <input type="datetime-local" bind:value={whenValue} max={maxWhen} />
      <button class="mk-btn" onclick={doLookup}>Узнать</button>
    </div>
    <div class="mk-quick">
      <button onclick={() => quick(1)}>час назад</button>
      <button onclick={() => quick(24)}>вчера</button>
      <button onclick={() => quick(24*7)}>неделю назад</button>
      <button onclick={() => quick(24*30)}>месяц назад</button>
    </div>
    <!-- Result -->
    {#if market.lookupResult}
      <div class="mk-result">
        {#if market.lookupResult.loading}
          <div class="mk-skel">Ищу котировку…</div>
        {:else if market.lookupResult.error}
          <div class="mk-res-k">{market.lookupResult.error}</div>
        {:else}
          {@const r = market.lookupResult}
          <div class="mk-res-k">{getCoin().symbol} · {fmtDT(r.ts)} <span class="mk-res-g">(шаг {r.granularity})</span></div>
          <div class="mk-res-v">{fmtPrice(r.price, r.cur)}</div>
          {#if r.diff != null}
            {@const diffAbs = r.now - r.price}
            <div class="mk-res-d" class:up={r.diff >= 0} class:down={r.diff < 0}>
              Сейчас {fmtPrice(r.now, r.cur)} · {r.diff >= 0 ? '+' : ''}{r.diff.toFixed(2)}%
              ({diffAbs >= 0 ? '+' : '−'}{fmtPrice(Math.abs(diffAbs), r.cur)})
            </div>
          {/if}
        {/if}
      </div>
    {/if}
    <!-- History -->
    {#if market.lookupHist.length}
      <div class="mk-hist">
        <div class="mk-hist-title">Недавние запросы</div>
        {#each market.lookupHist as h (h.coin + ':' + h.ts)}
          <button class="mk-hist-row" onclick={() => rerun(h)}>
            <span class="mk-hist-coin">{coinOf(h.coin).symbol}</span>
            <span class="mk-hist-when">{fmtDT(h.ts)}</span>
            <span class="mk-hist-price">{fmtPrice(h.price, h.cur)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FX Rates -->
  <FxRates />

  <!-- Footer -->
  <div class="mk-foot">
    {#if market.err}
      <span class="mk-err">
        {market.err.message === 'rate' ? '⏳ Лимит запросов — показываю кэш, повтор через минуту' : '⚠️ Нет связи с биржей — показываю кэш'}
      </span>
    {:else}
      <span>Крипта: CoinGecko, раз в минуту · Валюты: ЦБ РФ, раз в день</span>
    {/if}
    <button class="mk-link" onclick={refresh}>Обновить</button>
  </div>
</div>
