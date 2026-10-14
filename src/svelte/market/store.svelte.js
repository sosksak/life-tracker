// MARKET — биржа крипты и валют ЦБ на вкладке «Деньги».
// Бывший src/js/45-v6-market.js, логика и ключи localStorage прежние.
// Состояние реактивное: $state-объекты обновляют компонент без render().
import { legacy } from '../lib/legacy.js';

const STATE_KEY = 'v7_market_state';
const HIST_KEY  = 'v7_market_lookups';
const LAST_KEY  = 'v7_market_last';
const FX_KEY    = 'v8_fx_last';
const FX_STATE  = 'v8_fx_state';
const API       = 'https://api.coingecko.com/api/v3';
const FX_API    = 'https://www.cbr-xml-daily.ru';

export const COINS = [
  { id: 'bitcoin',          symbol: 'BTC',  name: 'Bitcoin',   icon: '₿' },
  { id: 'ethereum',         symbol: 'ETH',  name: 'Ethereum',  icon: 'Ξ' },
  { id: 'solana',           symbol: 'SOL',  name: 'Solana',    icon: '◎' },
  { id: 'the-open-network', symbol: 'TON',  name: 'Toncoin',   icon: '◆' },
  { id: 'binancecoin',      symbol: 'BNB',  name: 'BNB',       icon: '◈' },
  { id: 'ripple',           symbol: 'XRP',  name: 'XRP',       icon: '✕' },
  { id: 'dogecoin',         symbol: 'DOGE', name: 'Dogecoin',  icon: 'Ð' },
  { id: 'cardano',          symbol: 'ADA',  name: 'Cardano',   icon: '₳' },
  { id: 'tron',             symbol: 'TRX',  name: 'TRON',      icon: '⬡' },
  { id: 'avalanche-2',      symbol: 'AVAX', name: 'Avalanche', icon: '▲' },
  { id: 'polkadot',         symbol: 'DOT',  name: 'Polkadot',  icon: '●' },
  { id: 'litecoin',         symbol: 'LTC',  name: 'Litecoin',  icon: 'Ł' },
  { id: 'chainlink',        symbol: 'LINK', name: 'Chainlink', icon: '⬢' },
  { id: 'tether',           symbol: 'USDT', name: 'Tether',    icon: '₮' },
];

export const RANGES = [
  { id: '1',   label: '1Д' },
  { id: '7',   label: '7Д' },
  { id: '30',  label: '1М' },
  { id: '90',  label: '3М' },
  { id: '365', label: '1Г' },
];

export const FX_LIST = [
  { code: 'USD', flag: '🇺🇸', name: 'Доллар США' },
  { code: 'EUR', flag: '🇪🇺', name: 'Евро' },
  { code: 'BYN', flag: '🇧🇾', name: 'Белорусский рубль' },
  { code: 'CNY', flag: '🇨🇳', name: 'Юань' },
];

const DEFAULT_WATCH = ['bitcoin', 'ethereum', 'solana', 'the-open-network'];
const TTL = { '1': 60e3, '7': 5*60e3, '30': 15*60e3, '90': 30*60e3, '365': 60*60e3 };

// ─────────────────────────────────────────────────────────────────────────────
//  Реактивное состояние
// ─────────────────────────────────────────────────────────────────────────────
export const market = $state({
  coin: 'bitcoin',
  range: '1',
  cur: 'usd',
  watch: DEFAULT_WATCH.slice(),
  ticker: {},        // { coinId: { usd, rub, usd_24h_change, last_updated_at } }
  chartPts: [],      // [[ts, price], ...]
  err: null,
  loading: false,
  lookupHist: [],
  lookupResult: null,
  loaded: false,
  // FX (валюты ЦБ)
  fxCode: 'USD',
  fxDir: 'from',     // from = валюта→рубли, to = рубли→валюта
  fxAmount: 100,
  fxRates: null,     // { USD: {value, previous}, ... }
  fxDate: null,
  fxHist: [],        // [{date, rates},...] для спарклайна
  fxErr: null,
});

// ─────────────────────────────────────────────────────────────────────────────
//  localStorage (профиль-изоляция через legacy.get/set)
// ─────────────────────────────────────────────────────────────────────────────
export function load() {
  if (!legacy.hasUser()) return;
  const s = legacy.get(STATE_KEY, null) || {};
  market.coin  = COINS.some(c => c.id === s.coin) ? s.coin : 'bitcoin';
  market.range = RANGES.some(r => r.id === s.range) ? s.range : '1';
  market.cur   = s.cur === 'rub' ? 'rub' : 'usd';
  market.watch = Array.isArray(s.watch) && s.watch.length
    ? s.watch.filter(id => COINS.some(c => c.id === id))
    : DEFAULT_WATCH.slice();
  market.lookupHist = legacy.get(HIST_KEY, []) || [];
  // Кешированный тикер
  const last = legacy.get(LAST_KEY, null);
  if (last && last._ts && Date.now() - last._ts < 2*60e3) {
    delete last._ts;
    market.ticker = last;
  }
  // FX
  const fxs = legacy.get(FX_STATE, null) || {};
  market.fxCode = FX_LIST.some(f => f.code === fxs.code) ? fxs.code : 'USD';
  market.fxDir = fxs.dir === 'to' ? 'to' : 'from';
  market.fxAmount = isFinite(+fxs.amount) && +fxs.amount > 0 ? +fxs.amount : 100;
  const fxl = legacy.get(FX_KEY, null);
  if (fxl && fxl.rates) {
    market.fxRates = fxl.rates;
    market.fxDate = fxl.date;
  }
  market.loaded = true;
}

function saveState() {
  legacy.set(STATE_KEY, {
    coin: market.coin,
    range: market.range,
    cur: market.cur,
    watch: market.watch,
  });
}

function saveFxState() {
  legacy.set(FX_STATE, { code: market.fxCode, dir: market.fxDir, amount: market.fxAmount });
}

// ─────────────────────────────────────────────────────────────────────────────
//  API CoinGecko
// ─────────────────────────────────────────────────────────────────────────────
const _mem = new Map();
let _rateLimitedUntil = 0;

function cached(key, ttl) {
  const c = _mem.get(key);
  return c && Date.now() - c.ts < ttl ? c.data : null;
}
function remember(key, data) { _mem.set(key, { ts: Date.now(), data }); }

async function api(path) {
  if (Date.now() < _rateLimitedUntil) throw new Error('rate');
  const resp = await fetch(API + path, { headers: { accept: 'application/json' } });
  if (resp.status === 429) { _rateLimitedUntil = Date.now() + 60e3; throw new Error('rate'); }
  if (!resp.ok) throw new Error('http ' + resp.status);
  return resp.json();
}

async function fetchTicker(ids) {
  const key = 'ticker:' + ids.slice().sort().join(',');
  const c = cached(key, 45e3);
  if (c) return c;
  const data = await api('/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd,rub&include_24hr_change=true&include_last_updated_at=true');
  remember(key, data);
  legacy.set(LAST_KEY, Object.assign({}, data, { _ts: Date.now() }));
  return data;
}

async function fetchChart(coin, cur, range) {
  const key = 'chart:' + coin + ':' + cur + ':' + range;
  const c = cached(key, TTL[range] || 60e3);
  if (c) return c;
  const data = await api('/coins/' + coin + '/market_chart?vs_currency=' + cur + '&days=' + range + (range === '1' ? '' : (Number(range) > 90 ? '&interval=daily' : '')));
  const pts = (data.prices || []).map(p => [p[0], p[1]]);
  remember(key, pts);
  return pts;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Публичные действия
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchData(silent = false) {
  if (market.loading) return;
  market.loading = true;
  if (!silent) market.err = null;
  const ids = [...new Set([market.coin, ...market.watch])];
  try {
    const [ticker, pts] = await Promise.all([
      fetchTicker(ids),
      fetchChart(market.coin, market.cur, market.range),
    ]);
    market.ticker = ticker;
    market.chartPts = pts;
    market.err = null;
  } catch (e) {
    market.err = e;
    // fallback to cache
    market.chartPts = cached('chart:' + market.coin + ':' + market.cur + ':' + market.range, Infinity) || [];
  }
  market.loading = false;
}

export function setCoin(id) {
  market.coin = id;
  saveState();
  fetchData();
}

export function setRange(id) {
  market.range = id;
  saveState();
  fetchData();
}

export function setCur(c) {
  market.cur = c;
  saveState();
  fetchData();
}

export async function refresh() {
  _mem.clear();
  _rateLimitedUntil = 0;
  await fetchData(true);
  if (!market.err) window.showToast?.('✅ Курсы обновлены', 'success');
}

export function setWatch(list) {
  if (!list.length) { window.showToast?.('Нужна хотя бы одна монета', 'error'); return; }
  market.watch = list;
  if (!list.includes(market.coin)) market.coin = list[0];
  saveState();
  _mem.clear();
  fetchData();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lookup — курс на момент времени
// ─────────────────────────────────────────────────────────────────────────────
export async function lookup(tsMs) {
  market.lookupResult = { loading: true };
  const coin = market.coin, cur = market.cur;
  const ageDays = (Date.now() - tsMs) / 864e5;
  const win = ageDays <= 1 ? 3*3600 : ageDays <= 90 ? 12*3600 : 3*86400;
  const from = Math.floor(tsMs / 1000) - win;
  const to = Math.floor(tsMs / 1000) + win;
  try {
    const data = await api('/coins/' + coin + '/market_chart/range?vs_currency=' + cur + '&from=' + from + '&to=' + to);
    const pts = data.prices || [];
    if (!pts.length) { market.lookupResult = { error: 'Нет данных на этот момент' }; return; }
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - tsMs) < Math.abs(best[0] - tsMs)) best = p;
    const granularity = ageDays <= 1 ? '5 мин' : ageDays <= 90 ? '1 час' : '1 день';
    const t = market.ticker[coin];
    const now = t ? t[cur] : null;
    const diff = now && best[1] ? (now - best[1]) / best[1] * 100 : null;
    market.lookupResult = { ts: best[0], price: best[1], granularity, now, diff, cur };
    // Сохранить историю
    const hist = market.lookupHist.filter(h => !(h.coin === coin && Math.abs(h.ts - tsMs) < 60e3));
    hist.unshift({ coin, ts: tsMs, price: best[1], cur });
    market.lookupHist = hist.slice(0, 5);
    legacy.set(HIST_KEY, market.lookupHist);
  } catch (e) {
    market.lookupResult = { error: e.message === 'rate' ? '⏳ Лимит запросов, попробуй через минуту' : '⚠️ Не удалось получить данные' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Форматирование
// ─────────────────────────────────────────────────────────────────────────────
export function fmtPrice(v, cur) {
  if (v == null || !isFinite(v)) return '—';
  const d = v >= 1000 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
  const s = v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
  return cur === 'rub' ? s + ' ₽' : '$' + s;
}

const pad = n => String(n).padStart(2, '0');
export function fmtDT(ts, withTime = true) {
  const d = new Date(ts);
  const date = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  return withTime ? date + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : date;
}

export function fmtAxis(ts, range) {
  const d = new Date(ts);
  if (range === '1') return pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (range === '7' || range === '30') return pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
}

export function toLocalInputValue(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function coinOf(id) {
  return COINS.find(c => c.id === id) || { id, symbol: id.toUpperCase().slice(0, 5), name: id, icon: '●' };
}

// ─────────────────────────────────────────────────────────────────────────────
//  FX — валюты ЦБ РФ
// ─────────────────────────────────────────────────────────────────────────────
async function fxFetchJSON(url) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

function fxNorm(d) {
  const out = { date: d.Date, prev: d.PreviousDate, rates: {} };
  for (const f of FX_LIST) {
    const v = d.Valute && d.Valute[f.code];
    if (v) out.rates[f.code] = { value: v.Value / v.Nominal, previous: v.Previous / v.Nominal };
  }
  return out;
}

export async function fxFetch() {
  const c = cached('fx:today', 2*3600e3);
  if (c) { market.fxRates = c.rates; market.fxDate = c.date; market.fxErr = null; return; }
  try {
    const d = fxNorm(await fxFetchJSON(FX_API + '/daily_json.js'));
    remember('fx:today', d);
    legacy.set(FX_KEY, { ...d, _ts: Date.now() });
    market.fxRates = d.rates;
    market.fxDate = d.date;
    market.fxErr = null;
    // История для спарклайнов
    fxFetchHist();
  } catch (e) {
    market.fxErr = e;
    // fallback к кешу
    const fxl = legacy.get(FX_KEY, null);
    if (fxl && fxl.rates) {
      market.fxRates = fxl.rates;
      market.fxDate = fxl.date;
    }
  }
}

async function fxFetchHist() {
  const c = cached('fx:hist', 6*3600e3);
  if (c) { market.fxHist = c; return; }
  const days = [];
  for (let i = 1; i <= 12 && days.length < 10; i++) {
    const d = new Date(Date.now() - i * 864e5);
    if (d.getDay() === 0) continue;
    days.push(d);
  }
  const res = await Promise.all(days.map(d => {
    const u = FX_API + '/archive/' + d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/daily_json.js';
    return fxFetchJSON(u).then(fxNorm).catch(() => null);
  }));
  const hist = res.filter(Boolean).reverse();
  remember('fx:hist', hist);
  market.fxHist = hist;
}

export function fxPick(code) {
  market.fxCode = code;
  saveFxState();
}

export function fxSwap() {
  market.fxDir = market.fxDir === 'to' ? 'from' : 'to';
  saveFxState();
}

export function fxSetAmount(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  if (!isFinite(n) || n < 0) return;
  market.fxAmount = n;
  saveFxState();
}

export function fxConvert() {
  const r = market.fxRates?.[market.fxCode];
  if (!r) return null;
  const fromRub = market.fxDir === 'to';
  const result = fromRub ? market.fxAmount / r.value : market.fxAmount * r.value;
  return { result, rate: r.value, fromRub };
}

export function fxDateLabel() {
  if (!market.fxDate) return '';
  const d = new Date(market.fxDate);
  return 'ЦБ РФ на ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
}

export function fxSpark(code) {
  if (!market.fxRates?.[code]) return [];
  const pts = (market.fxHist || []).map(h => h.rates[code]?.value).filter(v => v != null);
  if (market.fxRates[code]) pts.push(market.fxRates[code].value);
  return pts;
}

// Форматирование рублей
export function fmtRub(v, d = 2) {
  if (v == null || !isFinite(v)) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ₽';
}
