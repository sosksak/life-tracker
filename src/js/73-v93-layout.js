// ====== v9.3 — LAYOUT: любая карточка на любой вкладке — скрыть / вернуть / переставить ======
// Долгое нажатие на карточку → режим редактирования (как виджеты iPhone): дрожание,
// «−» на каждой карточке, ▲▼ для порядка, панель «Добавить / Готово» снизу.
// Настройка в v93_layout: { tab: { hidden:[key], order:[key] } }, уезжает в облако.
const V93 = (() => {
  'use strict';
  const KEY = 'v93_layout';
  const TABS = { dashboardContent: 'Главная', contentLive: 'Работа', lifeContent: 'Жизнь', moneyContent: 'Деньги', contentStats: 'Стата' };
  const WRAP = el => el.classList.contains('v6-module-slot') || /^v7(Dash|Life|Stats)Extra$/.test(el.id);
  const NAMES = {
    'dash-greeting': 'Приветствие', 'v7-reward-strip': 'Награды дня', 'lr-days': 'Серия дней', 'v7-brief': 'Сводка дня',
    'dash-alerts': 'Уведомления', 'dash-cards': 'Плитки модулей', 'dash-quick-actions': 'Быстрые действия', 'v8Goals': 'Цели',
    'v92Widgets': 'Виджеты (смена, цель, неделя…)', 'wallet': 'Кошелёк', 'v9Trader': 'Панель трейдера', 'activeShiftPanel': 'Активная смена',
    'millionPath': 'План дохода', 'kopilkaCard': 'Копилка', 'weeklyChallenge': 'Недельный челлендж', 'insightCard': 'Рекомендация',
    'questsPanel': 'Задачи смены', 'lifeQuestsPanel': 'Личные задачи', 'hab-summary': 'Привычки: сводка', 'hab-list': 'Привычки: список',
    'hab-inactive-section': 'Привычки: неактивные', 'hab-add-row': 'Привычки: добавить', 'hab-analytics': 'Привычки: аналитика',
    'motivationTip': 'Мотивация', 'mk-title': 'Биржа: заголовок', 'mk-hero': 'Биржа: главный курс', 'mk-watch': 'Биржа: монеты',
    'mk-card': 'Биржа: график', 'mk-foot': 'Биржа: подпись', 'fin-month-header': 'Финансы: месяц', 'fin-summary-cards': 'Финансы: итоги',
    'fin-actions': 'Финансы: кнопки', 'crypto-summary': 'Портфель: стоимость', 'crypto-section': 'Портфель: активы', 'crypto-refresh': 'Портфель: обновить',
    'v8Reports': 'Отчёт за месяц', 'streakBar': 'Серия смен', 'level-section': 'Уровень', 'weekCompare': 'Неделя vs неделя',
    'heatmapSection': 'Карта активности', 'diarySection': 'Дневник общения', 'achievements': 'Достижения', 'history': 'История смен'
  };
  const TITLE_SEL = 'h1,h2,h3,h4,.eff-title,.section-title,.chart-title,.v7-sec-title,.health-title,.hab-section-title,.fin-section-title,.mk-sec-title,.w92-head .t,[class*="-title"]';

  // v9.4: второстепенные карточки спрятаны по умолчанию (один раз, флаг в cfg._d).
  // Всё возвращается через «＋ Добавить» в режиме редактирования — данные не теряются.
  const DEFAULT_HIDDEN = {
    dashboardContent: ['dash-alerts', 'dash-cards'],
    contentLive: ['#millionPath', '#kopilkaCard', '#weeklyChallenge', '#insightCard'],
    lifeContent: ['hab-inactive-section', 'hab-analytics', 'health-section:6', '#motivationTip', 'v7-sec:2'],
    moneyContent: ['mk-section', '#mkFx'],
    contentStats: ['chart-section:3', '#weekCompare', '#heatmapSection', '#diarySection']
  };
  const DEFAULTS_FLAG = 'd94';
  // Конфиг читается на каждый apply/isHidden — парсим JSON только когда строка изменилась
  function getCfg() { const c = _cachedGet(KEY, null); return (c && typeof c === 'object') ? c : {}; }
  function tabCfg(tabId) { const c = getCfg()[tabId] || {}; return { hidden: Array.isArray(c.hidden) ? c.hidden : [], order: Array.isArray(c.order) ? c.order : [] }; }
  function saveTab(tabId, tc) { const c = getCfg(); c[tabId] = tc; uSet(KEY, c); try { markLocalChange(); schedulePushProgress(); } catch (e) {} }
  function applyDefaults() {
    const c = getCfg(); if (c._d === DEFAULTS_FLAG) return;
    for (const [tab, keys] of Object.entries(DEFAULT_HIDDEN)) {
      const tc = tabCfg(tab);
      for (const k of keys) if (!tc.hidden.includes(k)) tc.hidden.push(k);
      c[tab] = tc;
    }
    c._d = DEFAULTS_FLAG; uSet(KEY, c);
    try { markLocalChange(); schedulePushProgress(); } catch (e) {}
  }
  // v9.5: «инверсия» — на экране «Ещё» вкладка показывает ТОЛЬКО скрытые карточки (допы)
  let inverted = {};
  function setInverted(tabId, on) { inverted[tabId] = !!on; }
  function isInverted(tabId) { return !!inverted[tabId]; }
  // Для модулей: скрытую карточку можно не рендерить вовсе
  function isHidden(tabId, key) { try { const h = tabCfg(tabId).hidden.includes(key); return inverted[tabId] ? !h : h; } catch (e) { return false; } }
  // После «показать» карточку нужно дорисовать — модули её пропускали
  function rerender(tabId) {
    try {
      if (tabId === 'dashboardContent') DASHBOARD.render();
      else if (tabId === 'contentLive') render();
      else if (tabId === 'lifeContent') { HABITS.render(); HEALTH.render(); try { V7.renderLifeExtras(); } catch (e) {} try { renderMotivationTip(); } catch (e) {} }
      else if (tabId === 'moneyContent') { MARKET.render({ silent: true }); }
      else if (tabId === 'contentStats') { invalidateShiftCache(); render(); try { V7.renderStatsExtras(); } catch (e) {} }
    } catch (e) { console.warn('[v93] rerender', e); }
  }

  // Карточки верхнего уровня (сквозь обёртки модулей)
  function cards(tabEl) {
    const out = [];
    const walk = (el) => { for (const k of el.children) { if (k.dataset.ltUi) continue; if (WRAP(k)) walk(k); else if (k.tagName !== 'SCRIPT' && k.tagName !== 'STYLE' && !k.classList.contains('modal-overlay')) out.push(k); } };
    walk(tabEl);
    const seen = {};
    for (const el of out) {
      let base = el.id ? '#' + el.id : (el.classList[0] || el.tagName.toLowerCase());
      if (!el.id) { seen[base] = (seen[base] || 0) + 1; if (seen[base] > 1) base += ':' + seen[base]; }
      el.dataset.ltCard = base;
    }
    return out;
  }
  function labelOf(el) {
    const k0 = el.id || el.classList[0] || '';
    if (NAMES[k0]) return NAMES[k0];
    const t = el.querySelector(TITLE_SEL);
    let s = t ? t.textContent.trim().replace(/\s+/g, ' ') : '';
    s = s.replace(/(Изменить|Работа ›|Биржа ›|vs прошлая|сравнение с прошлым)$/i, '').trim();
    if (s.length > 2 && s.length < 40) return s;
    const k = el.id || el.classList[0] || '';
    return NAMES[k] || s.slice(0, 36) || k || 'Карточка';
  }

  let _applying = false;
  function apply(tabId) {
    const tabEl = document.getElementById(tabId); if (!tabEl) return;
    _applying = true;
    try {
      const tc = tabCfg(tabId), list = cards(tabEl);
      const pos = k => { const i = tc.order.indexOf(k); return i < 0 ? 500 + list.findIndex(e => e.dataset.ltCard === k) : i; };
      const inv = !!inverted[tabId];
      let shown = 0;
      for (const el of list) {
        const k = el.dataset.ltCard;
        const h = tc.hidden.includes(k);
        const hide = inv ? !h : h;
        el.classList.toggle('lt-card-hidden', hide);
        if (!hide) shown++;
        el.style.order = String(pos(k));
      }
      // Подвал «Настроить экран»
      let f = tabEl.querySelector('.lt-foot');
      if (!f) {
        f = document.createElement('div'); f.className = 'lt-foot'; f.dataset.ltUi = '1';
        tabEl.appendChild(f);
      }
      f.innerHTML = inv
        ? (shown ? `<button onclick="V93.sheet()">⚙ Что показывать здесь, а что на основной вкладке</button>` : `<div class="lt-empty">Здесь появляются карточки, убранные с основной вкладки.<br><button onclick="V93.sheet()">⚙ Настроить</button></div>`)
        : `<button onclick="V93.edit('${tabId}')">⚙ Настроить экран · зажми карточку</button>`;
      if (editing === tabId) decorate(tabEl);
    } finally { _applying = false; }
  }
  function applyAll() { for (const t of Object.keys(TABS)) apply(t); }

  // ---------- Режим редактирования ----------
  let editing = null;
  function decorate(tabEl) {
    tabEl.querySelectorAll('.lt-ctl').forEach(n => n.remove());
    const tc = tabCfg(tabEl.id);
    const vis = cards(tabEl).filter(e => !tc.hidden.includes(e.dataset.ltCard)).sort((a, b) => (+a.style.order || 0) - (+b.style.order || 0));
    vis.forEach((el, i) => {
      const k = el.dataset.ltCard;
      const l = document.createElement('div'); l.className = 'lt-ctl l'; l.dataset.ltUi = '1';
      l.innerHTML = `<button class="minus" aria-label="Скрыть" onclick="V93.hide('${tabEl.id}','${k}')">−</button>`;
      const r = document.createElement('div'); r.className = 'lt-ctl r'; r.dataset.ltUi = '1';
      r.innerHTML = `<button ${i === 0 ? 'disabled' : ''} onclick="V93.move('${tabEl.id}','${k}',-1)">▲</button><button ${i === vis.length - 1 ? 'disabled' : ''} onclick="V93.move('${tabEl.id}','${k}',1)">▼</button>`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(l); el.appendChild(r);
    });
  }
  function bar() {
    let b = document.getElementById('ltEditBar');
    if (!b) {
      b = document.createElement('div'); b.id = 'ltEditBar'; b.className = 'lt-editbar';
      b.innerHTML = `<button onclick="V93.sheet()">＋ Добавить</button><button class="p" onclick="V93.done()">Готово</button>`;
      document.body.appendChild(b);
    }
    return b;
  }
  function edit(tabId) {
    const tabEl = document.getElementById(tabId); if (!tabEl) return;
    if (!tabEl.classList.contains('active')) { try { switchTab(tabId.replace(/Content$|^content/, '').toLowerCase()); } catch (e) {} }
    editing = tabId;
    document.body.classList.add('lt-edit');
    apply(tabId); bar().classList.add('show');
    try { haptic('medium'); } catch (e) {}
  }
  function done() {
    if (!editing) return;
    const tabEl = document.getElementById(editing);
    editing = null;
    document.body.classList.remove('lt-edit');
    if (tabEl) tabEl.querySelectorAll('.lt-ctl').forEach(n => n.remove());
    bar().classList.remove('show');
    try { haptic('light'); } catch (e) {}
  }
  function hide(tabId, k) { const tc = tabCfg(tabId); if (!tc.hidden.includes(k)) tc.hidden.push(k); saveTab(tabId, tc); apply(tabId); try { haptic('light'); } catch (e) {} }
  function show(tabId, k) { const tc = tabCfg(tabId); tc.hidden = tc.hidden.filter(x => x !== k); saveTab(tabId, tc); rerender(tabId); apply(tabId); sheet(); try { haptic('light'); } catch (e) {} }
  function currentOrder(tabId) {
    const tabEl = document.getElementById(tabId); const tc = tabCfg(tabId);
    const list = cards(tabEl); const pos = k => { const i = tc.order.indexOf(k); return i < 0 ? 500 + list.findIndex(e => e.dataset.ltCard === k) : i; };
    return list.map(e => e.dataset.ltCard).sort((a, b) => pos(a) - pos(b));
  }
  function move(tabId, k, d) {
    const tc = tabCfg(tabId); const ord = currentOrder(tabId).filter(x => !tc.hidden.includes(x));
    const i = ord.indexOf(k), j = i + d; if (i < 0 || j < 0 || j >= ord.length) return;
    ord.splice(i, 1); ord.splice(j, 0, k);
    tc.order = ord.concat(tc.hidden.filter(x => !ord.includes(x)));
    saveTab(tabId, tc); apply(tabId); try { haptic('light'); } catch (e) {}
  }
  function resetTab(tabId) { saveTab(tabId, { hidden: (DEFAULT_HIDDEN[tabId] || []).slice(), order: [] }); rerender(tabId); apply(tabId); sheet(); showToast('Экран по умолчанию', 'success'); }
  function showAll(tabId) { saveTab(tabId, { hidden: [], order: [] }); rerender(tabId); apply(tabId); sheet(); showToast('Показаны все карточки', 'success'); }

  // Лист «Добавить»: скрытые карточки + полный список с переключателями
  function sheet() {
    const tabId = editing || document.querySelector('.tab-content.active')?.id; if (!tabId || !TABS[tabId]) return;
    const tabEl = document.getElementById(tabId); const tc = tabCfg(tabId);
    const list = cards(tabEl); const byKey = {}; list.forEach(e => byKey[e.dataset.ltCard] = e);
    const ord = currentOrder(tabId);
    const rows = ord.map(k => { const el = byKey[k]; const on = !tc.hidden.includes(k); return `<div class="row"><div class="n">${escapeHtml(labelOf(el))}</div><button class="w92-sw ${on ? 'on' : ''}" onclick="V93.${on ? 'hide' : 'show'}('${tabId}','${k}');V93.sheet()" aria-label="${on ? 'скрыть' : 'показать'}"></button></div>`; }).join('');
    let m = document.getElementById('v93Sheet');
    if (!m) {
      m = document.createElement('div'); m.id = 'v93Sheet'; m.className = 'modal-overlay';
      m.innerHTML = `<div class="modal-content" style="max-width:420px"><div class="modal-title" id="v93SheetTitle"></div><div class="w92-set lt-sheet" id="v93SheetBody"></div><div style="margin-top:14px;display:flex;gap:8px"><button class="modal-close-btn" style="margin-top:0;flex:1" id="v93Reset">По умолчанию</button><button class="modal-close-btn" style="margin-top:0;flex:1" id="v93All">Показать все</button><button class="modal-save-btn" style="flex:1" onclick="V93.closeSheet()">Готово</button></div></div>`;
      m.addEventListener('click', e => { if (e.target === m) closeSheet(); });
      document.body.appendChild(m);
    }
    document.getElementById('v93SheetTitle').textContent = '🧩 Карточки · ' + TABS[tabId];
    document.getElementById('v93SheetBody').innerHTML = `<div class="hint">${inverted[tabId] ? 'Включено — на основной вкладке. Выключено — здесь, на экране «Ещё». Данные не теряются.' : 'Выключенные карточки уезжают на экран «Ещё» (свайп влево) и не считаются — данные не теряются. Порядок — стрелками в режиме редактирования.'}</div>` + rows;
    document.getElementById('v93Reset').onclick = () => resetTab(tabId);
    document.getElementById('v93All').onclick = () => showAll(tabId);
    m.classList.add('show'); document.body.classList.add('modal-open');
  }
  function closeSheet() { const m = document.getElementById('v93Sheet'); if (m) m.classList.remove('show'); if (!document.querySelector('.modal-overlay.show')) document.body.classList.remove('modal-open'); }

  // ---------- Долгое нажатие ----------
  function bindLongPress() {
    let timer = null, sx = 0, sy = 0, target = null;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } target = null; };
    document.addEventListener('pointerdown', e => {
      if (editing || document.body.classList.contains('modal-open')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('input,textarea,select,button,a,canvas,svg,[contenteditable],.tab-nav,.fab-container,[data-lt-ui]')) return;
      const tab = e.target.closest('.tab-content.active'); if (!tab || !TABS[tab.id] || inverted[tab.id]) return;
      sx = e.clientX; sy = e.clientY; target = tab;
      timer = setTimeout(() => { timer = null; if (target) { edit(target.id); target = null; } }, 550);
    }, { passive: true });
    document.addEventListener('pointermove', e => { if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) cancel(); }, { passive: true });
    document.addEventListener('pointerup', cancel, { passive: true });
    document.addEventListener('pointercancel', cancel, { passive: true });
    window.addEventListener('scroll', cancel, { passive: true });
    document.addEventListener('contextmenu', e => { if (e.target.closest('.tab-content') && !e.target.closest('input,textarea,[contenteditable],.lt-copy')) e.preventDefault(); });
    // В режиме редактирования тап по карточке ничего не открывает
    document.addEventListener('click', e => { if (editing && e.target.closest('[data-lt-card]') && !e.target.closest('.lt-ctl')) { e.stopPropagation(); e.preventDefault(); } }, true);
  }

  // ---------- BOOT ----------
  let _booted = false, _raf = {};
  function schedule(tabId) { if (_raf[tabId]) return; _raf[tabId] = requestAnimationFrame(() => { _raf[tabId] = 0; try { apply(tabId); } catch (e) { console.warn('[v93]', e); } }); }
  function boot() {
    if (_booted) return; _booted = true;
    try {
      try { if (!PROGRESS_KEYS.includes(KEY)) PROGRESS_KEYS.push(KEY); } catch (e) {}
      applyDefaults();
      for (const t of Object.keys(TABS)) {
        const el = document.getElementById(t); if (!el) continue;
        // v9.5.1: правки внутри собственных элементов раскладки (подвал .lt-foot, кнопки .lt-ctl) не считаются —
        // раньше apply() переписывал innerHTML подвала → observer → apply() → … бесконечный цикл на 60 fps
        // по всем пяти вкладкам. На iPhone это съедало главный поток, и тапы по вкладкам не обрабатывались.
        const ownUi = n => !!(n && (n.nodeType === 1 ? n : n.parentElement) && (n.nodeType === 1 ? n : n.parentElement).closest('[data-lt-ui]'));
        new MutationObserver(recs => {
          if (_applying) return;
          if (recs.every(r => ownUi(r.target) || [...r.addedNodes].every(n => n.dataset && n.dataset.ltUi))) return;
          schedule(t);
        }).observe(el, { childList: true, subtree: true });
        apply(t);
      }
      // прокрутка к модулю: обёртка стала display:contents — скроллим к первому ребёнку
      const oScroll = window.scrollToModule;
      if (typeof oScroll === 'function' && !oScroll._v93) { window.scrollToModule = function (mod) { const el = document.getElementById(mod + 'Content'); const first = el && (el.firstElementChild || el); if (first) setTimeout(() => first.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120); }; window.scrollToModule._v93 = 1; }
      const oSw = window.switchTab;
      if (typeof oSw === 'function' && !oSw._v93) { window.switchTab = function (tab) { if (editing) done(); const r = oSw.apply(this, arguments); return r; }; window.switchTab._v93 = 1; }
      bindLongPress();
      console.log('[v9.3] layout ready');
    } catch (e) { console.error('[v93] boot', e); _booted = false; }
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') { window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 900); return r; }; }
    document.addEventListener('v7:login', () => setTimeout(boot, 600));
    setTimeout(() => { if (!_booted && typeof currentUser !== 'undefined' && currentUser) boot(); }, 7500);
  })();
  return { boot, apply, applyAll, edit, done, hide, show, move, sheet, closeSheet, resetTab, showAll, isHidden, setInverted, isInverted, rerender, DEFAULT_HIDDEN, TABS };
})();
window.V93 = V93;

