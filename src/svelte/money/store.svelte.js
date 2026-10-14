// CRYPTO — крипто-портфель на вкладке «Деньги» (бывший 44-v6-crypto.js).
// Логика и ключи localStorage прежние (v6_crypto_holdings / v6_crypto_prices),
// наружу торчит тот же API window.CRYPTO.*, который зовут таб-бар (46-v6-nav.js),
// сводка портфеля на главной (legacy.cryptoValue) и onclick в разметке.
//
// Состояние реактивное: $state-объекты читаются компонентом напрямую,
// поэтому новая цена или изменённое количество обновляют экран сами —
// без render() и innerHTML.
import { legacy } from '../lib/legacy.js';

const HOLDINGS_KEY = 'v6_crypto_holdings';
const PRICES_KEY = 'v6_crypto_prices';
const PRICE_TTL = 5 * 60 * 1000; // 5 минут кеш цен

// Популярные монеты для быстрого выбора
export const POPULAR_COINS = [
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

export const crypto = $state({
  holdings: [],
  prices: {},        // { coinId: { usd, change24h } } — только живой (не просроченный) кеш
  pricesTs: 0,       // когда кеш записан: из него считается «N мин назад»
  now: Date.now(),   // тикает по тапу «обновить» — чтобы подпись «N мин назад» пересчиталась
  loaded: false,
});

// Без профиля ключи читались бы без префикса и мы бы «запомнили» пустоту
// чужого аккаунта (как в FINANCE и LIFE) — поэтому грузим лениво.
export function load() {
  if (!legacy.hasUser()) return;
  crypto.holdings = legacy.get(HOLDINGS_KEY, []) || [];
  const cached = legacy.get(PRICES_KEY, null);
  // TTL ровно как в легаси: просроченный кеш не используется вовсе, и
  // стоимость портфеля до ответа сети считается по нулям.
  if (cached && cached.ts && Date.now() - cached.ts < PRICE_TTL) {
    crypto.prices = cached.prices || {};
    crypto.pricesTs = cached.ts;
  } else {
    crypto.prices = {};
    crypto.pricesTs = cached && cached.ts ? cached.ts : 0;
  }
  crypto.loaded = true;
}

function ensure() { if (!crypto.loaded) load(); }

function saveHoldings() {
  legacy.set(HOLDINGS_KEY, crypto.holdings);
  legacy.touch();
}

export function getHoldings() { ensure(); return crypto.holdings; }

// --- Получение цен ---
// coinIds не передали (прогрев на старте из bootV6) → берём монеты портфеля.
export async function fetchPrices(coinIds) {
  ensure();
  const ids = (coinIds && coinIds.length)
    ? coinIds
    : [...new Set(crypto.holdings.map(h => h.coinId))];
  if (!ids.length) return {};

  // Живой кеш покрывает все нужные монеты — сеть не трогаем
  if (crypto.pricesTs && Date.now() - crypto.pricesTs < PRICE_TTL
      && ids.every(id => crypto.prices[id] !== undefined)) {
    return crypto.prices;
  }

  try {
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!resp.ok) throw new Error('API error');
    const data = await resp.json();

    const fresh = {};
    for (const [id, val] of Object.entries(data)) {
      fresh[id] = { usd: val.usd || 0, change24h: val.usd_24h_change || 0 };
    }
    // Объединяем с тем, что уже знали: запрос мог быть по части монет
    const merged = { ...crypto.prices, ...fresh };
    crypto.prices = merged;
    crypto.pricesTs = Date.now();
    legacy.set(PRICES_KEY, { prices: merged, ts: crypto.pricesTs });
    return merged;
  } catch (e) {
    console.warn('CoinGecko fetch error:', e);
    return crypto.prices;   // остаёмся на том, что есть
  }
}

export async function refreshPrices() {
  ensure();
  // Инвалидируем кеш — и в сторе, и в хранилище
  crypto.prices = {};
  crypto.pricesTs = 0;
  legacy.set(PRICES_KEY, null);
  legacy.toast('🔄 Обновление цен...', 'info');
  await fetchPrices();
  crypto.now = Date.now();
  legacy.toast('✅ Цены обновлены', 'success');
}

// --- CRUD ---
export async function addHolding() {
  const coinOptions = POPULAR_COINS.map(c => ({
    value: c.id, label: `${c.icon} ${c.symbol} — ${c.name}`,
  }));
  coinOptions.push({ value: '_custom', label: '📝 Другая монета...' });

  const res = await legacy.askForm([
    { key: 'coin', label: 'Монета', type: 'select', options: coinOptions },
    { key: 'amount', label: 'Количество', type: 'number', placeholder: '0.5' },
    { key: 'buyPrice', label: 'Цена покупки (USD)', type: 'number', placeholder: '45000' },
  ], { icon: '📈', title: 'Добавить актив', okText: 'Добавить' });
  if (!res || !res.coin || !res.amount) return;

  let coinId = res.coin;
  let coinSymbol = '';
  let coinName = '';

  if (coinId === '_custom') {
    const custom = await legacy.askForm([
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

  ensure();
  crypto.holdings.push({
    id: 'hold_' + Date.now(),
    coinId,
    symbol: coinSymbol,
    name: coinName,
    amount: parseFloat(res.amount),
    buyPrice: parseFloat(res.buyPrice) || 0,
    addedAt: Date.now(),
  });
  saveHoldings();
  legacy.toast(`📈 ${coinSymbol} добавлен в портфель`, 'success');
  await fetchPrices();   // новая монета — её цены в кеше ещё нет
}

export async function removeHolding(id) {
  const ok = await legacy.askConfirm('Удалить этот актив из портфеля?', {
    icon: '🗑', title: 'Удаление', okText: 'Удалить', noText: 'Отмена',
  });
  if (!ok) return;
  ensure();
  crypto.holdings = crypto.holdings.filter(h => h.id !== id);
  saveHoldings();
  legacy.toast('Актив удалён', 'warn');
}

export async function editHolding(id) {
  ensure();
  const h = crypto.holdings.find(x => x.id === id);
  if (!h) return;
  const res = await legacy.askForm([
    { key: 'amount', label: 'Количество', type: 'number', placeholder: '0', value: h.amount },
    { key: 'buyPrice', label: 'Цена покупки (USD)', type: 'number', placeholder: '0', value: h.buyPrice },
  ], { icon: '✏️', title: `Редактировать ${h.symbol}`, okText: 'Сохранить' });
  if (!res) return;
  h.amount = parseFloat(res.amount) || h.amount;
  h.buyPrice = parseFloat(res.buyPrice) || h.buyPrice;
  saveHoldings();
  legacy.toast('✅ Обновлено', 'success');
}

// --- Агрегация ---
export function getPortfolioValue() {
  ensure();
  let totalUSD = 0;
  let totalCost = 0;
  for (const h of crypto.holdings) {
    const p = crypto.prices[h.coinId];
    totalUSD += h.amount * (p ? p.usd : 0);
    totalCost += h.amount * (h.buyPrice || 0);
  }
  return {
    totalUSD,
    totalCost,
    pnl: totalUSD - totalCost,
    changePct: totalCost > 0 ? ((totalUSD - totalCost) / totalCost) * 100 : 0,
    assets: crypto.holdings.length,
  };
}

// Строки активов для компонента: цена, стоимость, P&L и иконка
export function rows() {
  ensure();
  return crypto.holdings.map(h => {
    const p = crypto.prices[h.coinId];
    const price = p ? p.usd : 0;
    const value = h.amount * price;
    const cost = h.amount * (h.buyPrice || 0);
    const popular = POPULAR_COINS.find(c => c.id === h.coinId);
    return {
      ...h,
      price,
      value,
      pnl: value - cost,
      pnlPct: cost > 0 ? ((value - cost) / cost * 100) : 0,
      change24: p ? p.change24h : 0,
      icon: popular ? popular.icon : '●',
    };
  });
}

// Распределение портфеля: доля от общей стоимости и длина полоски от максимума
export function allocation() {
  const pv = getPortfolioValue();
  const sorted = rows().sort((a, b) => b.value - a.value);
  const maxVal = sorted[0]?.value || 1;
  return sorted.map(s => ({
    symbol: s.symbol,
    pct: pv.totalUSD > 0 ? (s.value / pv.totalUSD * 100) : 0,
    barPct: maxVal > 0 ? (s.value / maxVal * 100) : 0,
  }));
}

// «только что» / «N мин назад» — по времени записи кеша цен
export function pricesAge() {
  ensure();
  if (!crypto.pricesTs) {
    // кеш мог быть просрочен: тогда время записи всё равно известно
    const cached = legacy.get(PRICES_KEY, null);
    if (!cached || !cached.ts) return 'нет данных';
    const ago = Math.round((crypto.now - cached.ts) / 60000);
    return ago < 1 ? 'только что' : `${ago} мин назад`;
  }
  const ago = Math.round((crypto.now - crypto.pricesTs) / 60000);
  return ago < 1 ? 'только что' : `${ago} мин назад`;
}

// Формат как в легаси: $12,345.67 / $12,345 (без лишних нулей у цен)
export const usd2 = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const usdMax = (n, max = 2) => (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: max });
