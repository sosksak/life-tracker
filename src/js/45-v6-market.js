// ============================================================
//  MARKET — Биржа: живой курс, график, курс на момент времени
//  Источник: CoinGecko public API (без ключа). Кэш по диапазону,
//  авто-обновление раз в 60с пока открыта вкладка ДЕНЬГИ.
// ============================================================
const MARKET = (() => {
  'use strict';

  const STATE_KEY = 'v7_market_state';
  const HIST_KEY  = 'v7_market_lookups';
  const LAST_KEY  = 'v7_market_last';
  const API = 'https://api.coingecko.com/api/v3';

  const COINS = [
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
  const DEFAULT_WATCH = ['bitcoin', 'ethereum', 'solana', 'the-open-network'];
  const RANGES = [
    { id: '1',   label: '1Д' },
    { id: '7',   label: '7Д' },
    { id: '30',  label: '1М' },
    { id: '90',  label: '3М' },
    { id: '365', label: '1Г' },
  ];
  const TTL = { '1': 60e3, '7': 5 * 60e3, '30': 15 * 60e3, '90': 30 * 60e3, '365': 60 * 60e3 };
  const REFRESH_MS = 60e3;

  // --- state ---
  function getState() {
    const s = uGet(STATE_KEY, null) || {};
    return {
      coin:  COINS.some(c => c.id === s.coin) ? s.coin : 'bitcoin',
      range: RANGES.some(r => r.id === s.range) ? s.range : '1',
      cur:   s.cur === 'rub' ? 'rub' : 'usd',
      watch: Array.isArray(s.watch) && s.watch.length ? s.watch.filter(id => COINS.some(c => c.id === id)) : DEFAULT_WATCH.slice(),
    };
  }
  function setState(patch) {
    const s = Object.assign(getState(), patch);
    uSet(STATE_KEY, s);
    return s;
  }
  const coinOf = id => COINS.find(c => c.id === id) || { id, symbol: id.toUpperCase().slice(0, 5), name: id, icon: '●' };

  // --- memory cache + persisted last snapshot ---
  const _mem = new Map();
  function cached(key, ttl) {
    const c = _mem.get(key);
    return c && Date.now() - c.ts < ttl ? c.data : null;
  }
  function remember(key, data) { _mem.set(key, { ts: Date.now(), data }); }

  let _rateLimitedUntil = 0;
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
    const last = uGet(LAST_KEY, {}) || {};
    uSet(LAST_KEY, Object.assign(last, data, { _ts: Date.now() }));
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

  // Курс в заданный момент: ближайшая точка в окне ±window
  async function priceAt(coin, cur, tsMs) {
    const ageDays = (Date.now() - tsMs) / 864e5;
    const win = ageDays <= 1 ? 3 * 3600 : ageDays <= 90 ? 12 * 3600 : 3 * 86400; // сек
    const from = Math.floor(tsMs / 1000) - win, to = Math.floor(tsMs / 1000) + win;
    const data = await api('/coins/' + coin + '/market_chart/range?vs_currency=' + cur + '&from=' + from + '&to=' + to);
    const pts = data.prices || [];
    if (!pts.length) return null;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - tsMs) < Math.abs(best[0] - tsMs)) best = p;
    return { ts: best[0], price: best[1], granularity: ageDays <= 1 ? '5 мин' : ageDays <= 90 ? '1 час' : '1 день' };
  }

  // --- format ---
  const SYM = { usd: '$', rub: '₽' };
  function fmtPrice(v, cur) {
    if (v == null || !isFinite(v)) return '—';
    const d = v >= 1000 ? 0 : v >= 1 ? 2 : v >= 0.01 ? 4 : 6;
    const s = v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
    return cur === 'rub' ? s + ' ₽' : '$' + s;
  }
  const pad = n => String(n).padStart(2, '0');
  function fmtDT(ts, withTime = true) {
    const d = new Date(ts);
    const date = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    return withTime ? date + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : date;
  }
  function fmtAxis(ts, range) {
    const d = new Date(ts);
    if (range === '1') return pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (range === '7' || range === '30') return pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
    return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2);
  }
  function toLocalInputValue(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // --- chart (SVG) ---
  let _chartPts = [], _chartMeta = null;
  function buildChartSVG(pts, cur, range, width) {
    const W = Math.max(280, Math.round(width || 340)), H = 188, padL = 6, padR = 6, padT = 14, padB = 32;
    if (!pts || pts.length < 2) return '<div class="mk-empty">Нет данных графика</div>';
    const ys = pts.map(p => p[1]);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (max === min) { max += 1; min -= 1; }
    const x0 = pts[0][0], x1 = pts[pts.length - 1][0];
    const X = t => padL + (t - x0) / (x1 - x0) * (W - padL - padR);
    const Y = v => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
    let d = '';
    for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + X(pts[i][0]).toFixed(1) + ',' + Y(pts[i][1]).toFixed(1);
    const area = d + 'L' + X(x1).toFixed(1) + ',' + (H - padB) + 'L' + X(x0).toFixed(1) + ',' + (H - padB) + 'Z';
    const up = pts[pts.length - 1][1] >= pts[0][1];
    const col = up ? 'var(--green)' : 'var(--red)';
    const iMin = ys.indexOf(min), iMax = ys.indexOf(max);
    const ticks = 4, axis = [];
    for (let i = 0; i <= ticks; i++) {
      const t = x0 + (x1 - x0) * i / ticks;
      axis.push('<text x="' + X(t).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 ? 'start' : i === ticks ? 'end' : 'middle') + '" class="mk-ax">' + fmtAxis(t, range) + '</text>');
    }
    const lbl = (i, anchorUp) => {
      let x = X(pts[i][0]), ta = 'middle';
      if (x < 40) { ta = 'start'; x = Math.max(x, padL); } else if (x > W - 40) { ta = 'end'; x = Math.min(x, W - padR); }
      const y = anchorUp ? Y(pts[i][1]) - 5 : Y(pts[i][1]) + 12;
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + ta + '" class="mk-lbl">' + fmtPrice(pts[i][1], cur) + '</text>';
    };
    _chartPts = pts; _chartMeta = { W, H, padL, padR, X, Y, cur, range };
    return '<svg class="mk-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" id="mkSvg">' +
      '<defs><linearGradient id="mkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".22"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (H - padB) + '" y2="' + (H - padB) + '" class="mk-base"/>' +
      '<path d="' + area + '" fill="url(#mkFill)"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      lbl(iMax, true) + lbl(iMin, false) + axis.join('') +
      '<g id="mkCross" style="display:none"><line id="mkCrossL" y1="' + padT + '" y2="' + (H - padB) + '" class="mk-cross"/><circle id="mkCrossC" r="4" fill="' + col + '" stroke="#fff" stroke-width="2"/></g>' +
      '</svg>';
  }

  function bindCrosshair() {
    const svg = document.getElementById('mkSvg'), tip = document.getElementById('mkTip');
    if (!svg || !tip || !_chartMeta) return;
    const { W, padL, padR, X, Y, cur } = _chartMeta;
    const g = document.getElementById('mkCross'), l = document.getElementById('mkCrossL'), c = document.getElementById('mkCrossC');
    const move = ev => {
      const r = svg.getBoundingClientRect();
      const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      const xv = px / r.width * W;
      const x0 = _chartPts[0][0], x1 = _chartPts[_chartPts.length - 1][0];
      const t = x0 + (Math.min(Math.max(xv, padL), W - padR) - padL) / (W - padL - padR) * (x1 - x0);
      let lo = 0, hi = _chartPts.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (_chartPts[m][0] < t) lo = m; else hi = m; }
      const i = Math.abs(_chartPts[lo][0] - t) < Math.abs(_chartPts[hi][0] - t) ? lo : hi;
      const p = _chartPts[i];
      const sx = X(p[0]), sy = Y(p[1]);
      l.setAttribute('x1', sx); l.setAttribute('x2', sx); c.setAttribute('cx', sx); c.setAttribute('cy', sy);
      g.style.display = '';
      tip.style.display = '';
      tip.textContent = fmtDT(p[0]) + ' · ' + fmtPrice(p[1], cur);
      if (ev.cancelable && ev.touches) ev.preventDefault();
    };
    const leave = () => { g.style.display = 'none'; tip.style.display = 'none'; };
    svg.addEventListener('mousemove', move); svg.addEventListener('mouseleave', leave);
    svg.addEventListener('touchstart', move, { passive: false }); svg.addEventListener('touchmove', move, { passive: false });
    svg.addEventListener('touchend', leave);
  }

  // ===== Валюты ЦБ РФ (USD / EUR / BYN / CNY) =====
  const FX_KEY = 'v8_fx_last';
  const FX_STATE = 'v8_fx_state';
  const FX_API = 'https://www.cbr-xml-daily.ru';
  const FX_LIST = [
    { code: 'USD', flag: '🇺🇸', name: 'Доллар США' },
    { code: 'EUR', flag: '🇪🇺', name: 'Евро' },
    { code: 'BYN', flag: '🇧🇾', name: 'Белорусский рубль' },
    { code: 'CNY', flag: '🇨🇳', name: 'Юань' },
  ];
  let _fx = null, _fxErr = null, _fxHist = null, _fxLoading = null;

  function fxState() {
    const s = uGet(FX_STATE, null) || {};
    return { code: FX_LIST.some(f => f.code === s.code) ? s.code : 'USD', amount: isFinite(+s.amount) && +s.amount > 0 ? +s.amount : 100, dir: s.dir === 'to' ? 'to' : 'from' };
  }
  function fxSet(p) { const s = Object.assign(fxState(), p); uSet(FX_STATE, s); return s; }

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
  // Сегодняшний курс: кэш 2 часа (ЦБ обновляет раз в день)
  async function fxFetch() {
    const c = cached('fx:today', 2 * 3600e3);
    if (c) return c;
    const d = fxNorm(await fxFetchJSON(FX_API + '/daily_json.js'));
    remember('fx:today', d);
    uSet(FX_KEY, Object.assign({}, d, { _ts: Date.now() }));
    return d;
  }
  // История ~10 дат (спарклайн): archive/YYYY/MM/DD. Нет публикации — 404, пропускаем.
  async function fxFetchHist() {
    const c = cached('fx:hist', 6 * 3600e3);
    if (c) return c;
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
    const hist = res.filter(Boolean).reverse(); // старые -> новые
    remember('fx:hist', hist);
    return hist;
  }
  async function fxLoad() {
    if (_fxLoading) return _fxLoading;
    _fxLoading = (async () => {
      try { _fx = await fxFetch(); _fxErr = null; }
      catch (e) { _fxErr = e; _fx = _fx || uGet(FX_KEY, null); }
      try { _fxHist = await fxFetchHist(); } catch (e) { _fxHist = _fxHist || []; }
    })().finally(() => { _fxLoading = null; });
    return _fxLoading;
  }

  const fmtRub = (v, d = 2) => v == null || !isFinite(v) ? '—' : v.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ₽';
  function fxSpark(code) {
    if (!_fx || !_fx.rates[code]) return '';
    const pts = (_fxHist || []).map(h => h.rates[code] && h.rates[code].value).filter(v => v != null);
    pts.push(_fx.rates[code].value);
    if (pts.length < 2) return '';
    const W = 52, H = 18, min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
    const poly = pts.map((v, i) => (i / (pts.length - 1) * (W - 2) + 1).toFixed(1) + ',' + ((1 - (v - min) / span) * (H - 4) + 2).toFixed(1)).join(' ');
    const cls = pts[pts.length - 1] > pts[0] ? 'up' : pts[pts.length - 1] < pts[0] ? 'down' : 'flat';
    return '<svg class="mk-fx-spark ' + cls + '" viewBox="0 0 ' + W + ' ' + H + '"><polyline points="' + poly + '"/></svg>';
  }
  function fxDateLabel() {
    if (!_fx || !_fx.date) return '';
    const d = new Date(_fx.date);
    return 'ЦБ РФ на ' + pad(d.getDate()) + '.' + pad(d.getMonth() + 1);
  }
  function fxOutText(st, r, n) {
    const fromRub = st.dir === 'to', res = fromRub ? n / r.value : n * r.value;
    return '= ' + (fromRub ? res.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + st.code : fmtRub(res)) + ' <span>· 1 ' + st.code + ' = ' + fmtRub(r.value, 4) + '</span>';
  }
  function fxCalcHTML(st) {
    const r = _fx && _fx.rates[st.code];
    if (!r) return '';
    const fromRub = st.dir === 'to';
    return '<div class="mk-fx-calc">' +
        '<input type="number" inputmode="decimal" min="0" step="any" id="mkFxAmt" value="' + st.amount + '" oninput="MARKET.fxAmount(this.value)">' +
        '<span class="mk-fx-unit">' + (fromRub ? '₽' : st.code) + '</span>' +
        '<button class="mk-fx-swap" onclick="MARKET.fxSwap()" title="Поменять направление">⇄</button>' +
      '</div>' +
      '<div class="mk-fx-out" id="mkFxOut">' + fxOutText(st, r, st.amount) + '</div>';
  }
  function fxHTML() {
    const st = fxState();
    if (!_fx) {
      return '<div class="mk-section" id="mkFx"><div class="mk-fx-head"><div class="mk-section-title">💱 Валюты</div></div>' +
        '<div class="mk-section-sub">' + (_fxErr ? '⚠️ Нет связи с ЦБ РФ' : '<span class="mk-skel">загрузка курсов…</span>') + '</div></div>';
    }
    return '<div class="mk-section" id="mkFx">' +
      '<div class="mk-fx-head"><div class="mk-section-title">💱 Валюты</div><div class="mk-fx-date">' + fxDateLabel() + (_fxErr ? ' · кэш' : '') + '</div></div>' +
      '<div class="mk-fx-grid">' + FX_LIST.map(f => {
        const r = _fx.rates[f.code];
        if (!r) return '';
        const d = r.value - r.previous, p = r.previous ? d / r.previous * 100 : 0;
        const cls = Math.abs(d) < 0.00005 ? 'flat' : d > 0 ? 'up' : 'down';
        const chTxt = cls === 'flat' ? '0,00' : (d > 0 ? '▲ +' : '▼ ') + d.toFixed(2).replace('.', ',') + ' (' + (p > 0 ? '+' : '') + p.toFixed(2).replace('.', ',') + '%)';
        return '<button class="mk-fx' + (f.code === st.code ? ' on' : '') + '" onclick="MARKET.fxPick(\'' + f.code + '\')">' +
          '<div class="mk-fx-top"><span class="mk-fx-flag">' + f.flag + '</span><span class="mk-fx-code">' + f.code + '</span></div>' +
          '<div class="mk-fx-name">' + f.name + '</div>' +
          '<div class="mk-fx-val">' + fmtRub(r.value) + '</div>' +
          '<div class="mk-fx-row"><span class="mk-fx-ch ' + cls + '">' + chTxt + '</span>' + fxSpark(f.code) + '</div>' +
        '</button>';
      }).join('') + '</div>' +
      fxCalcHTML(st) +
    '</div>';
  }
  function fxRepaint() {
    const old = document.getElementById('mkFx');
    if (!old) return;
    const focus = document.activeElement && document.activeElement.id === 'mkFxAmt';
    old.outerHTML = fxHTML();
    if (focus) { const i = document.getElementById('mkFxAmt'); if (i) i.focus(); }
  }
  function fxPick(code) { fxSet({ code }); fxRepaint(); }
  function fxSwap() { fxSet({ dir: fxState().dir === 'to' ? 'from' : 'to' }); fxRepaint(); }
  function fxAmount(v) {
    const n = parseFloat(String(v).replace(',', '.'));
    if (!isFinite(n) || n < 0) return;
    const st = fxSet({ amount: n });
    const r = _fx && _fx.rates[st.code], out = document.getElementById('mkFxOut');
    if (r && out) out.innerHTML = fxOutText(st, r, n);
  }

  // --- render ---
  let _rendering = false, _timer = null, _lastTicker = null, _lastErr = null;
  function el() { return document.getElementById('marketContent'); }
  function isVisible() {
    const wrap = document.getElementById('moneyContent');
    return !!(wrap && wrap.classList.contains('active') && !document.hidden);
  }

  async function render(opts = {}) {
    const root = el();
    if (!root) return;
    if (_rendering) return;
    _rendering = true;
    const st = getState();
    const coin = coinOf(st.coin);
    const ids = [...new Set([st.coin, ...st.watch])];

    if (!opts.silent) renderSkeleton(root, st, coin);

    let ticker = _lastTicker, pts = null, err = null;
    try {
      const [t, p] = await Promise.all([fetchTicker(ids), fetchChart(st.coin, st.cur, st.range)]);
      ticker = t; pts = p; _lastTicker = t; _lastErr = null;
    } catch (e) {
      err = e; _lastErr = e;
      ticker = ticker || uGet(LAST_KEY, null) || {};
      pts = cached('chart:' + st.coin + ':' + st.cur + ':' + st.range, Infinity);
    }
    renderFull(root, st, coin, ticker || {}, pts, err);
    _rendering = false;
    if (!_hid('moneyContent', '#mkFx')) fxLoad().then(() => { if (el()) fxRepaint(); });
    ensureTimer();
  }

  function renderSkeleton(root, st, coin) {
    if (root.querySelector('.mk-hero')) return; // уже есть — обновим на месте
    root.innerHTML = '<div class="mk-hero"><div class="mk-hero-top"><div class="mk-hero-coin"><span class="mk-coin-ico">' + coin.icon + '</span><div><div class="mk-coin-sym">' + coin.symbol + '</div><div class="mk-coin-name">' + escapeHtml(coin.name) + '</div></div></div></div><div class="mk-price mk-skel">загрузка…</div></div>';
  }

  function headerHTML(st, coin, ticker) {
    const t = ticker[st.coin] || {};
    const price = t[st.cur], ch = t[st.cur + '_24h_change'];
    const chCls = ch == null ? '' : ch >= 0 ? 'up' : 'down';
    const chTxt = ch == null ? '—' : (ch >= 0 ? '▲ +' : '▼ ') + ch.toFixed(2) + '% за 24ч';
    const upd = t.last_updated_at ? 'обновлено ' + fmtDT(t.last_updated_at * 1000).slice(11) : '';
    return '<div class="mk-hero">' +
      '<div class="mk-hero-top">' +
        '<div class="mk-hero-coin"><span class="mk-coin-ico">' + coin.icon + '</span><div><div class="mk-coin-sym">' + coin.symbol + '</div><div class="mk-coin-name">' + escapeHtml(coin.name) + '</div></div></div>' +
        '<div class="mk-cur" role="tablist"><button class="' + (st.cur === 'usd' ? 'on' : '') + '" onclick="MARKET.setCur(\'usd\')">USD</button><button class="' + (st.cur === 'rub' ? 'on' : '') + '" onclick="MARKET.setCur(\'rub\')">RUB</button></div>' +
      '</div>' +
      '<div class="mk-price">' + fmtPrice(price, st.cur) + '</div>' +
      '<div class="mk-hero-row"><span class="mk-chg ' + chCls + '">' + chTxt + '</span><span class="mk-upd">' + upd + '</span></div>' +
    '</div>';
  }

  function watchHTML(st, ticker) {
    return '<div class="mk-watch">' + st.watch.map(id => {
      const c = coinOf(id), t = ticker[id] || {};
      const ch = t[st.cur + '_24h_change'];
      return '<button class="mk-chip' + (id === st.coin ? ' on' : '') + '" onclick="MARKET.setCoin(\'' + id + '\')">' +
        '<span class="mk-chip-sym">' + c.icon + ' ' + c.symbol + '</span>' +
        '<span class="mk-chip-price">' + fmtPrice(t[st.cur], st.cur) + '</span>' +
        (ch != null ? '<span class="mk-chip-ch ' + (ch >= 0 ? 'up' : 'down') + '">' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%</span>' : '') +
      '</button>';
    }).join('') + '<button class="mk-chip add" onclick="MARKET.editWatch()" title="Настроить список">＋</button></div>';
  }

  function rangeHTML(st) {
    return '<div class="mk-ranges">' + RANGES.map(r => '<button class="' + (r.id === st.range ? 'on' : '') + '" onclick="MARKET.setRange(\'' + r.id + '\')">' + r.label + '</button>').join('') + '</div>';
  }

  function statsHTML(pts, st) {
    if (!pts || pts.length < 2) return '';
    const ys = pts.map(p => p[1]);
    const first = ys[0], last = ys[ys.length - 1];
    const d = first ? (last - first) / first * 100 : 0;
    const rl = RANGES.find(r => r.id === st.range);
    return '<div class="mk-stats">' +
      '<div><div class="k">Мин · ' + rl.label + '</div><div class="v">' + fmtPrice(Math.min(...ys), st.cur) + '</div></div>' +
      '<div><div class="k">Макс · ' + rl.label + '</div><div class="v">' + fmtPrice(Math.max(...ys), st.cur) + '</div></div>' +
      '<div><div class="k">Изменение</div><div class="v ' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '') + d.toFixed(2) + '%</div></div>' +
    '</div>';
  }

  function lookupHTML(st, coin) {
    const hist = uGet(HIST_KEY, []) || [];
    const def = toLocalInputValue(Date.now() - 3600e3);
    return '<div class="mk-section">' +
      '<div class="mk-section-title">🕒 Курс на момент времени</div>' +
      '<div class="mk-section-sub">Выбери дату и время — покажем ближайшую котировку ' + coin.symbol + ' и разницу с текущей</div>' +
      '<div class="mk-lookup-row"><input type="datetime-local" id="mkWhen" value="' + def + '" max="' + toLocalInputValue(Date.now()) + '"><button class="mk-btn" onclick="MARKET.lookup()">Узнать</button></div>' +
      '<div class="mk-quick">' +
        '<button onclick="MARKET.quick(1)">час назад</button><button onclick="MARKET.quick(24)">вчера</button><button onclick="MARKET.quick(24*7)">неделю назад</button><button onclick="MARKET.quick(24*30)">месяц назад</button>' +
      '</div>' +
      '<div id="mkLookupResult"></div>' +
      (hist.length ? '<div class="mk-hist"><div class="mk-hist-title">Недавние запросы</div>' + hist.map(h =>
        '<div class="mk-hist-row" onclick="MARKET.rerun(\'' + h.coin + '\',' + h.ts + ')">' +
          '<span class="mk-hist-coin">' + coinOf(h.coin).symbol + '</span>' +
          '<span class="mk-hist-when">' + fmtDT(h.ts) + '</span>' +
          '<span class="mk-hist-price">' + fmtPrice(h.price, h.cur) + '</span>' +
        '</div>').join('') + '</div>' : '') +
    '</div>';
  }

  function renderFull(root, st, coin, ticker, pts, err) {
    const width = Math.max(280, (root.clientWidth || 360) - 2 * 12 - 2 * 14);
    root.innerHTML =
      '<div class="mk-title">📈 Биржа</div>' +
      headerHTML(st, coin, ticker) +
      watchHTML(st, ticker) +
      '<div class="mk-card">' +
        rangeHTML(st) +
        '<div class="mk-chart-wrap">' + buildChartSVG(pts, st.cur, st.range, width) + '<div class="mk-tip" id="mkTip" style="display:none"></div></div>' +
        statsHTML(pts, st) +
      '</div>' +
      (_hid('moneyContent', 'mk-section') ? '' : lookupHTML(st, coin)) +
      (_hid('moneyContent', '#mkFx') ? '' : fxHTML()) +
      '<div class="mk-foot">' +
        (err ? '<span class="mk-err">' + (err.message === 'rate' ? '⏳ Лимит запросов — показываю кэш, повтор через минуту' : '⚠️ Нет связи с биржей — показываю кэш') + '</span>' : '<span>Крипта: CoinGecko, раз в минуту · Валюты: ЦБ РФ, раз в день</span>') +
        '<button class="mk-link" onclick="MARKET.refresh()">Обновить</button>' +
      '</div>';
    bindCrosshair();
  }

  // --- actions ---
  function setCoin(id) { setState({ coin: id }); render(); }
  function setRange(id) { setState({ range: id }); render(); }
  function setCur(c) { setState({ cur: c }); render(); }
  async function refresh() { _mem.clear(); _rateLimitedUntil = 0; await render({ silent: true }); if (!_lastErr) showToast('✅ Курсы обновлены', 'success'); }

  function editWatch() {
    const st = getState();
    const html = '<div class="mk-pick">' + COINS.map(c => {
      const on = st.watch.includes(c.id);
      return '<label class="mk-pick-row"><input type="checkbox" data-coin="' + c.id + '"' + (on ? ' checked' : '') + '><span class="mk-pick-ico">' + c.icon + '</span><span class="mk-pick-sym">' + c.symbol + '</span><span class="mk-pick-name">' + escapeHtml(c.name) + '</span></label>';
    }).join('') + '</div>';
    askConfirm(html, { icon: '📋', title: 'Список монет', okText: 'Сохранить', noText: 'Отмена' }).then(ok => {
      if (!ok) return;
      const list = [...document.querySelectorAll('.mk-pick input:checked')].map(i => i.dataset.coin);
      if (!list.length) { showToast('Нужна хотя бы одна монета', 'error'); return; }
      const next = { watch: list };
      if (!list.includes(st.coin)) next.coin = list[0];
      setState(next); _mem.clear(); render();
    });
  }

  function quick(hoursAgo) {
    const inp = document.getElementById('mkWhen');
    if (inp) inp.value = toLocalInputValue(Date.now() - hoursAgo * 3600e3);
    lookup();
  }
  function rerun(coin, ts) {
    if (coin !== getState().coin) { setState({ coin }); render().then(() => { const i = document.getElementById('mkWhen'); if (i) i.value = toLocalInputValue(ts); lookup(); }); return; }
    const i = document.getElementById('mkWhen'); if (i) i.value = toLocalInputValue(ts);
    lookup();
  }

  async function lookup() {
    const inp = document.getElementById('mkWhen'), out = document.getElementById('mkLookupResult');
    if (!inp || !out) return;
    const ts = new Date(inp.value).getTime();
    if (!isFinite(ts)) { showToast('Укажи дату и время', 'error'); return; }
    if (ts > Date.now()) { showToast('Будущее ещё не торгуется 🙂', 'error'); return; }
    const st = getState(), coin = coinOf(st.coin);
    out.innerHTML = '<div class="mk-result mk-skel">Ищу котировку…</div>';
    try {
      const r = await priceAt(st.coin, st.cur, ts);
      if (!r) { out.innerHTML = '<div class="mk-result"><div class="mk-res-k">Нет данных на этот момент</div></div>'; return; }
      const now = (_lastTicker && _lastTicker[st.coin] && _lastTicker[st.coin][st.cur]) || null;
      const d = now && r.price ? (now - r.price) / r.price * 100 : null;
      const diffAbs = now ? now - r.price : null;
      out.innerHTML = '<div class="mk-result">' +
        '<div class="mk-res-k">' + coin.symbol + ' · ' + fmtDT(r.ts) + ' <span class="mk-res-g">(шаг ' + r.granularity + ')</span></div>' +
        '<div class="mk-res-v">' + fmtPrice(r.price, st.cur) + '</div>' +
        (d != null ? '<div class="mk-res-d ' + (d >= 0 ? 'up' : 'down') + '">Сейчас ' + fmtPrice(now, st.cur) + ' · ' + (d >= 0 ? '+' : '') + d.toFixed(2) + '% (' + (diffAbs >= 0 ? '+' : '−') + fmtPrice(Math.abs(diffAbs), st.cur) + ')</div>' : '') +
      '</div>';
      const hist = (uGet(HIST_KEY, []) || []).filter(h => !(h.coin === st.coin && Math.abs(h.ts - ts) < 60e3));
      hist.unshift({ coin: st.coin, ts, price: r.price, cur: st.cur });
      uSet(HIST_KEY, hist.slice(0, 5));
    } catch (e) {
      out.innerHTML = '<div class="mk-result"><div class="mk-res-k">' + (e.message === 'rate' ? '⏳ Лимит запросов, попробуй через минуту' : '⚠️ Не удалось получить данные') + '</div></div>';
    }
  }

  // --- auto refresh ---
  function ensureTimer() {
    if (_timer) return;
    _timer = setInterval(() => { if (isVisible() && el()) render({ silent: true }); }, REFRESH_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && isVisible()) render({ silent: true }); });
    window.addEventListener('resize', () => { if (isVisible()) render({ silent: true }); });
  }

  return { render, setCoin, setRange, setCur, refresh, editWatch, lookup, quick, rerun, COINS, fxPick, fxSwap, fxAmount };
})();


