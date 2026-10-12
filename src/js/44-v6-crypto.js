// ============================================================
//  MODULE 5: CRYPTO — Крипто-портфель
// ============================================================
// Учёт криптовалютных активов, отслеживание цен (CoinGecko API),
// P&L, распределение портфеля. Полностью клиентский.

const CRYPTO = (() => {
  'use strict';

  const HOLDINGS_KEY = 'v6_crypto_holdings';
  const PRICES_KEY = 'v6_crypto_prices';
  const PRICE_TTL = 5 * 60 * 1000; // 5 минут кеш цен

  // Популярные монеты для быстрого выбора
  const POPULAR_COINS = [
    { id: 'bitcoin',  symbol: 'BTC',  name: 'Bitcoin',  icon: '₿' },
    { id: 'ethereum', symbol: 'ETH',  name: 'Ethereum', icon: 'Ξ' },
    { id: 'tether',   symbol: 'USDT', name: 'Tether',   icon: '₮' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB',    icon: '◈' },
    { id: 'solana',   symbol: 'SOL',  name: 'Solana',   icon: '◎' },
    { id: 'ripple',   symbol: 'XRP',  name: 'XRP',      icon: '✕' },
    { id: 'cardano',  symbol: 'ADA',  name: 'Cardano',  icon: '₳' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
    { id: 'polkadot', symbol: 'DOT',  name: 'Polkadot', icon: '●' },
    { id: 'the-open-network', symbol: 'TON', name: 'Toncoin', icon: '◆' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', icon: '▲' },
    { id: 'tron',     symbol: 'TRX',  name: 'TRON',     icon: '⬡' },
  ];

  function getHoldings() {
    return uGet(HOLDINGS_KEY, []);
  }

  function saveHoldings(list) {
    uSet(HOLDINGS_KEY, list);
    markLocalChange();
    schedulePushProgress();
  }

  function getCachedPrices() {
    const cached = uGet(PRICES_KEY, null);
    if (cached && cached.ts && Date.now() - cached.ts < PRICE_TTL) {
      return cached.prices;
    }
    return null;
  }

  function savePricesCache(prices) {
    uSet(PRICES_KEY, { prices, ts: Date.now() });
  }

  // --- Получение цен ---
  async function fetchPrices(coinIds) {
    if (!coinIds || coinIds.length === 0) return {};

    // Проверяем кеш
    const cached = getCachedPrices();
    if (cached) {
      const allCached = coinIds.every(id => cached[id] !== undefined);
      if (allCached) return cached;
    }

    try {
      const ids = coinIds.join(',');
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!resp.ok) throw new Error('API error');
      const data = await resp.json();

      const prices = {};
      for (const [id, val] of Object.entries(data)) {
        prices[id] = {
          usd: val.usd || 0,
          change24h: val.usd_24h_change || 0,
        };
      }

      // Объединяем с кешем
      const merged = { ...(cached || {}), ...prices };
      savePricesCache(merged);
      return merged;
    } catch (e) {
      console.warn('CoinGecko fetch error:', e);
      // Возвращаем кеш если есть
      return cached || {};
    }
  }

  // --- CRUD ---
  async function addHolding() {
    const coinOptions = POPULAR_COINS.map(c => ({
      value: c.id, label: `${c.icon} ${c.symbol} — ${c.name}`
    }));
    coinOptions.push({ value: '_custom', label: '📝 Другая монета...' });

    const res = await askForm([
      { key: 'coin', label: 'Монета', type: 'select', options: coinOptions },
      { key: 'amount', label: 'Количество', type: 'number', placeholder: '0.5' },
      { key: 'buyPrice', label: 'Цена покупки (USD)', type: 'number', placeholder: '45000' },
    ], { icon: '📈', title: 'Добавить актив', okText: 'Добавить' });
    if (!res || !res.coin || !res.amount) return;

    let coinId = res.coin;
    let coinSymbol = '';
    let coinName = '';

    if (coinId === '_custom') {
      const custom = await askForm([
        { key: 'id', label: 'CoinGecko ID', placeholder: 'например: sui' },
        { key: 'symbol', label: 'Тикер', placeholder: 'SUI' },
        { key: 'name', label: 'Название', placeholder: 'Sui' },
      ], { icon: '📝', title: 'Ручной ввод', okText: 'OK' });
      if (!custom || !custom.id) return;
      coinId = custom.id.toLowerCase().trim();
      coinSymbol = (custom.symbol || coinId).toUpperCase();
      coinName = custom.name || coinSymbol;
    } else {
      const popular = POPULAR_COINS.find(c => c.id === coinId);
      coinSymbol = popular ? popular.symbol : coinId.toUpperCase();
      coinName = popular ? popular.name : coinId;
    }

    const holdings = getHoldings();
    holdings.push({
      id: 'hold_' + Date.now(),
      coinId,
      symbol: coinSymbol,
      name: coinName,
      amount: parseFloat(res.amount),
      buyPrice: parseFloat(res.buyPrice) || 0,
      addedAt: Date.now(),
    });
    saveHoldings(holdings);
    showToast(`📈 ${coinSymbol} добавлен в портфель`, 'success');
    render();
  }

  async function removeHolding(id) {
    const ok = await askConfirm('Удалить этот актив из портфеля?', {
      icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена'
    });
    if (!ok) return;
    saveHoldings(getHoldings().filter(h => h.id !== id));
    showToast('Актив удалён', 'warn');
    render();
  }

  async function editHolding(id) {
    const holdings = getHoldings();
    const h = holdings.find(x => x.id === id);
    if (!h) return;
    const res = await askForm([
      { key: 'amount', label: 'Количество', type: 'number', placeholder: '0', value: h.amount },
      { key: 'buyPrice', label: 'Цена покупки (USD)', type: 'number', placeholder: '0', value: h.buyPrice },
    ], { icon: '✏️', title: `Редактировать ${h.symbol}`, okText: 'Сохранить' });
    if (!res) return;
    h.amount = parseFloat(res.amount) || h.amount;
    h.buyPrice = parseFloat(res.buyPrice) || h.buyPrice;
    saveHoldings(holdings);
    showToast('✅ Обновлено', 'success');
    render();
  }

  // --- Агрегация ---
  function getPortfolioValue() {
    const holdings = getHoldings();
    const prices = getCachedPrices() || {};

    let totalUSD = 0;
    let totalCost = 0;
    for (const h of holdings) {
      const p = prices[h.coinId];
      const currentPrice = p ? p.usd : 0;
      totalUSD += h.amount * currentPrice;
      totalCost += h.amount * (h.buyPrice || 0);
    }

    const pnl = totalUSD - totalCost;
    const changePct = totalCost > 0 ? ((totalUSD - totalCost) / totalCost) * 100 : 0;

    return {
      totalUSD,
      totalCost,
      pnl,
      changePct,
      assets: holdings.length,
    };
  }

  // --- Рендер ---
  let _rendering = false;
  async function render() {
    const container = document.getElementById('cryptoContent');
    if (!container || _rendering) return;
    _rendering = true;

    const holdings = getHoldings();

    // Загружаем цены если есть активы
    let prices = getCachedPrices() || {};
    if (holdings.length > 0) {
      const coinIds = [...new Set(holdings.map(h => h.coinId))];
      prices = await fetchPrices(coinIds);
    }

    const pv = getPortfolioValue();

    let html = `
      <div class="crypto-summary">
        <div class="crypto-total-label">📈 Стоимость портфеля</div>
        <div class="crypto-total-value">$${pv.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="crypto-total-pnl ${pv.pnl >= 0 ? 'positive' : 'negative'}">
          P&L: ${pv.pnl >= 0 ? '+' : ''}$${pv.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          (${pv.changePct >= 0 ? '+' : ''}${pv.changePct.toFixed(2)}%)
        </div>
        <div class="crypto-total-cost">Вложено: $${pv.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    `;

    // Распределение (пирог текстом)
    if (holdings.length > 1) {
      const sorted = holdings
        .map(h => {
          const p = prices[h.coinId];
          const val = h.amount * (p ? p.usd : 0);
          return { ...h, value: val };
        })
        .sort((a, b) => b.value - a.value);
      const maxVal = sorted[0]?.value || 1;

      html += `
        <div class="crypto-section">
          <div class="crypto-section-title">📊 Распределение</div>
          <div class="crypto-alloc">
            ${sorted.map(s => {
              const pct = pv.totalUSD > 0 ? (s.value / pv.totalUSD * 100) : 0;
              const barPct = maxVal > 0 ? (s.value / maxVal * 100) : 0;
              return `<div class="crypto-alloc-row">
                <span class="crypto-alloc-sym">${s.symbol}</span>
                <div class="crypto-alloc-bar"><div class="crypto-alloc-fill" style="width:${barPct}%"></div></div>
                <span class="crypto-alloc-pct">${pct.toFixed(1)}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Список активов
    html += `<div class="crypto-section"><div class="crypto-section-title">💼 Активы</div>`;

    if (holdings.length === 0) {
      html += `<div class="crypto-empty">Портфель пуст — добавьте первый актив</div>`;
    } else {
      html += `<div class="crypto-holdings">`;
      for (const h of holdings) {
        const p = prices[h.coinId];
        const currentPrice = p ? p.usd : 0;
        const value = h.amount * currentPrice;
        const cost = h.amount * (h.buyPrice || 0);
        const pnl = value - cost;
        const pnlPct = cost > 0 ? ((value - cost) / cost * 100) : 0;
        const change24 = p ? p.change24h : 0;

        const popular = POPULAR_COINS.find(c => c.id === h.coinId);
        const icon = popular ? popular.icon : '●';

        html += `
          <div class="crypto-holding">
            <div class="crypto-hold-top">
              <div class="crypto-hold-left">
                <span class="crypto-hold-icon">${icon}</span>
                <div>
                  <div class="crypto-hold-symbol">${h.symbol}</div>
                  <div class="crypto-hold-name">${escapeHtml(h.name)}</div>
                </div>
              </div>
              <div class="crypto-hold-right">
                <div class="crypto-hold-value">$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                <div class="crypto-hold-change ${change24 >= 0 ? 'positive' : 'negative'}">${change24 >= 0 ? '▲' : '▼'} ${Math.abs(change24).toFixed(2)}% (24ч)</div>
              </div>
            </div>
            <div class="crypto-hold-details">
              <span>Кол-во: ${h.amount}</span>
              <span>Цена: $${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 6 })}</span>
              <span>Покупка: $${h.buyPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
              <span class="${pnl >= 0 ? 'positive' : 'negative'}">P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%)</span>
            </div>
            <div class="crypto-hold-actions">
              <button onclick="CRYPTO.editHolding('${h.id}')">✏️ Изменить</button>
              <button onclick="CRYPTO.removeHolding('${h.id}')">✕ Удалить</button>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    html += `
        <button class="crypto-add-btn" onclick="CRYPTO.addHolding()">＋ Добавить актив</button>
      </div>
    `;

    // Кнопка обновления цен
    html += `
      <div class="crypto-refresh">
        <button class="crypto-refresh-btn" onclick="CRYPTO.refreshPrices()">🔄 Обновить цены</button>
        <span class="crypto-refresh-info">${(() => {
          const cached = uGet(PRICES_KEY, null);
          if (cached && cached.ts) {
            const ago = Math.round((Date.now() - cached.ts) / 60000);
            return ago < 1 ? 'только что' : `${ago} мин назад`;
          }
          return 'нет данных';
        })()}</span>
      </div>
    `;

    container.innerHTML = html;
    _rendering = false;
  }

  async function refreshPrices() {
    // Инвалидируем кеш
    uSet(PRICES_KEY, null);
    showToast('🔄 Обновление цен...', 'info');
    await render();
    showToast('✅ Цены обновлены', 'success');
  }

  function openPanel() {
    if (typeof switchV6Tab === 'function') switchV6Tab('crypto');
    render();
  }

  return {
    getHoldings, addHolding, removeHolding, editHolding,
    getPortfolioValue, fetchPrices, refreshPrices,
    render, openPanel, POPULAR_COINS,
  };
})();


