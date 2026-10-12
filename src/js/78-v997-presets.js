// ====== v9.9.7 — РЕЖИМ ПРИЛОЖЕНИЯ: три пресета раскладки ======
// Минимум — только главное (смена, кошелёк, задачи). Рабочий — + аналитика смен,
// челлендж, цели. Всё — все карточки. Пресет = набор скрытых карточек V93 на каждой
// вкладке; поверх него работает ручная настройка (долгое нажатие). Выбор хранится
// в v93_layout._mode, уезжает в облако вместе с раскладкой.
const V997 = (() => {
  'use strict';
  const PRESETS = {
    min: {
      icon: '🪶', name: 'Минимум', sub: 'Смена, кошелёк, задачи дня — и всё',
      hidden: {
        dashboardContent: ['v7-reward-strip', 'lr-days', 'v7-score', 'v7-brief', 'jr-cta', '#v8Goals', 'dash-alerts', 'dash-cards'],
        contentLive: ['#v9Trader', '#effCard', '#waCard', '#millionPath', '#kopilkaCard', '#weeklyChallenge', '#insightCard'],
        moneyContent: ['fin-section', 'fin-section:2', 'crypto-summary', 'crypto-section', 'crypto-refresh', 'mk-title', 'mk-hero', 'mk-watch', 'mk-card', 'mk-foot', 'mk-section', '#mkFx'],
        lifeContent: ['hab-inactive-section', 'hab-analytics', 'health-section:4', 'health-section:5', 'health-section:6', '#motivationTip', '#v7Wheel'],
        contentStats: ['#streakBar', 'chart-section:3', 'chart-section:4', '#weekCompare', '#heatmapSection', '#diarySection'],
      },
    },
    work: {
      icon: '💼', name: 'Рабочий', sub: 'Плюс аналитика смен, челлендж, цели',
      hidden: {
        dashboardContent: ['dash-alerts', 'dash-cards'],
        contentLive: ['#v9Trader', '#millionPath', '#kopilkaCard', '#insightCard'],
        moneyContent: ['crypto-summary', 'crypto-section', 'crypto-refresh', 'mk-title', 'mk-hero', 'mk-watch', 'mk-card', 'mk-foot', 'mk-section', '#mkFx'],
        lifeContent: ['hab-inactive-section', 'hab-analytics', 'health-section:6', '#motivationTip'],
        contentStats: ['#weekCompare', '#heatmapSection', '#diarySection'],
      },
    },
    all: {
      icon: '🧩', name: 'Всё', sub: 'Все карточки, биржа, портфель, трейдер',
      hidden: { dashboardContent: [], contentLive: [], moneyContent: [], lifeContent: [], contentStats: [] },
    },
  };
  const ORDER = ['min', 'work', 'all'];
  const KEY = 'v93_layout';
  function cfg() { try { const c = uGet(KEY, null); return (c && typeof c === 'object') ? c : {}; } catch (e) { return {}; } }
  function current() { const m = cfg()._mode; return PRESETS[m] ? m : null; }
  // Трейдеру биржа и панель трейдера нужны даже в «Рабочем»
  function hiddenFor(id) {
    const h = JSON.parse(JSON.stringify(PRESETS[id].hidden));
    try { if (V7.getWorkType().id === 'trader' && id !== 'min') { h.contentLive = h.contentLive.filter(k => k !== '#v9Trader'); h.moneyContent = []; } } catch (e) {}
    return h;
  }
  function apply(id, opts) {
    if (!PRESETS[id]) return;
    const c = cfg(); const h = hiddenFor(id);
    for (const tab of Object.keys(h)) c[tab] = { hidden: h[tab].slice(), order: [] };
    c._mode = id; c._d = c._d || 'd94';
    uSet(KEY, c);
    try { markLocalChange(); schedulePushProgress(); } catch (e) {}
    try { for (const tab of Object.keys(h)) { V93.rerender(tab); V93.apply(tab); } } catch (e) {}
    if (!(opts && opts.silent)) { try { haptic('medium'); } catch (e) {} try { showToast(PRESETS[id].icon + ' Режим «' + PRESETS[id].name + '»', 'success'); } catch (e) {} }
  }
  // Ручная настройка поверх пресета — режим становится «свой»
  function markCustom() { try { const c = cfg(); if (c._mode && c._mode !== 'custom') { c._mode = 'custom'; uSet(KEY, c); } } catch (e) {}
  }
  function label() { const m = current(); if (m) return PRESETS[m].icon + ' ' + PRESETS[m].name; return cfg()._mode === 'custom' ? '🛠 Свой' : '— не выбран'; }
  // Какой пресет предложить новичку по типу работы
  function suggest() { try { const t = V7.getWorkType().id; if (t === 'trader' || t === 'business') return 'all'; if (['delivery', 'taxi', 'warehouse', 'fitness'].includes(t)) return 'work'; } catch (e) {} return 'min'; }

  function sheetHtml(sel) {
    return ORDER.map(id => { const p = PRESETS[id]; return `<button class="v997-opt ${sel === id ? 'on' : ''}" data-m="${id}"><span class="ic">${p.icon}</span><span class="t">${p.name}<span class="s">${p.sub}</span></span><span class="ck">${sel === id ? '✓' : ''}</span></button>`; }).join('');
  }
  function open() {
    let m = document.getElementById('v997Modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'v997Modal'; m.className = 'modal-overlay';
      m.innerHTML = '<div class="modal-content" style="max-width:400px"><div class="modal-title">🧭 Режим приложения</div><div class="modal-info">Что показывать на экранах. Любую карточку потом можно вернуть или убрать долгим нажатием — режим станет «свой».</div><div class="v997-list"></div><button class="modal-close-btn" onclick="V997.close()">Закрыть</button></div>';
      m.addEventListener('click', e => { if (e.target === m) close(); const b = e.target.closest('.v997-opt'); if (b) { apply(b.dataset.m); m.querySelector('.v997-list').innerHTML = sheetHtml(b.dataset.m); } });
      document.body.appendChild(m);
    }
    m.querySelector('.v997-list').innerHTML = sheetHtml(current());
    m.classList.add('show'); document.body.classList.add('modal-open');
  }
  function close() { const m = document.getElementById('v997Modal'); if (m) m.classList.remove('show'); document.body.classList.remove('modal-open'); }

  (function hook() {
    // Ручные hide/show/move → режим «свой»
    try {
      for (const fn of ['hide', 'show', 'move', 'resetTab', 'showAll']) {
        const o = V93[fn]; if (typeof o !== 'function' || o._v997) continue;
        V93[fn] = function () { const r = o.apply(this, arguments); markCustom(); return r; }; V93[fn]._v997 = 1;
      }
    } catch (e) {}
  })();
  return { PRESETS, ORDER, apply, current, label, suggest, open, close, sheetHtml };
})();
window.V997 = V997;
