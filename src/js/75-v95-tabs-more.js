// ====== v9.5 — ТРИ ВКЛАДКИ + ЭКРАН «ЕЩЁ» ======
// Таб-бар: Главная · Работа · Деньги · Ещё. На «Ещё» лежат разделы: Жизнь, Стата,
// и допы (карточки, скрытые с основных вкладок — V93 в режиме инверсии).
// Свайп влево/вправо по экрану листает всё подряд: Главная → Работа → Деньги → Жизнь → Стата → допы.
const V95 = (() => {
  'use strict';
  const MAIN = ['dashboard', 'live', 'money'];
  const SECTIONS = [
    { id: 'life',       tab: 'life',      icon: '🎯', label: 'Жизнь',   sub: 'Привычки, здоровье, личные задачи' },
    { id: 'stats',      tab: 'stats',     icon: '📊', label: 'Стата',   sub: 'Отчёты, графики, история смен' },
    { id: 'x-dash',     tab: 'dashboard', icon: '🏠', label: 'Главная · скрытые карточки', sub: 'Убранные с вкладки Главная', inv: 'dashboardContent' },
    { id: 'x-live',     tab: 'live',      icon: '💼', label: 'Работа · скрытые карточки',  sub: 'Убранные с вкладки Работа',  inv: 'contentLive' },
    { id: 'x-money',    tab: 'money',     icon: '💰', label: 'Деньги · скрытые карточки',  sub: 'Убранные с вкладки Деньги',  inv: 'moneyContent' },
  ];
  // v9.6: свайп листает только основные экраны и меню «Ещё»; разделы открываются из меню
  const ORDER = MAIN.concat(['more']);
  let cur = null;          // текущий экран: 'dashboard' | 'live' | 'money' | 'more' | id секции
  let _switching = false;

  const contentOf = tab => document.getElementById('content' + tab.charAt(0).toUpperCase() + tab.slice(1)) || document.getElementById(tab + 'Content');
  function clearInverted() { for (const s of SECTIONS) if (s.inv) V93.setInverted(s.inv, false); }

  // Сколько скрытых карточек на вкладке (для бейджа в меню)
  function hiddenCount(sec) {
    try {
      const el = document.getElementById(sec.inv); if (!el) return 0;
      let n = 0;
      for (const k of el.children) { if (k.dataset.ltUi) continue; if (k.classList.contains('lt-card-hidden')) n++; else for (const kk of k.children) if (kk.classList && kk.classList.contains('lt-card-hidden')) n++; }
      return n;
    } catch (e) { return 0; }
  }
  function setActiveBtn(id) { document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.id === id)); }
  function activate(el) { document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); el.classList.add('active'); }

  // Меню «Ещё»
  function renderMenu() {
    const box = document.getElementById('v95Menu'); if (!box) return;
    const tile = (ic, t, s, on, badge) => `<button class="v95-tile" onclick="${on}"><span class="ic">${ic}</span><span><div class="tt">${t}</div><div class="ss">${s}</div></span>${badge ? `<span class="bd">${badge}</span>` : '<span class="ar">›</span>'}</button>`;
    const xs = SECTIONS.filter(s => s.inv).map(s => ({ s, n: hiddenCount(s) })).filter(x => x.n > 0);
    box.innerHTML = `<div class="v95-h">Ещё</div>`
      + `<div class="v95-grp">Разделы</div>`
      + SECTIONS.filter(s => !s.inv).map(s => tile(s.icon, s.label, s.sub, `V95.open('${s.id}',1)`)).join('')
      + `<div class="v95-grp">Инструменты</div>`
      + tile('🎯', 'Цель и копилка', 'Сумма, срок, ежедневный план', "setupKopilka()")
      + tile('🎡', 'Колесо бонусов', 'Крутить за выполненные квесты', "openWheelModal()")
      + tile('💼', 'Тип работы', 'Курьер, фриланс, разработчик', "openWorkTypePicker()")
      + `<div class="v95-grp">Профиль</div>`
      + tile('🏪', 'Магазин', 'Бусты, темы, награды за XP', "switchTab('shop')")
      + tile('👤', 'Профиль и доступ', 'Оформление, подсказки, аккаунт', "openAccountModal()")
      + (xs.length ? `<div class="v95-grp">Скрытые карточки</div>` + xs.map(x => tile(x.s.icon, x.s.label.split(' · ')[0], x.s.sub, `V95.open('${x.s.id}',1)`, x.n)).join('') + `<div class="hint" style="margin:4px 4px 0">Карточки, выключенные на вкладках. Вернуть на место — в режиме «Настроить экран».</div>` : '');
  }
  function more(dir) {
    clearInverted();
    cur = 'more';
    try { uSet('active_tab', 'more'); } catch (e) {}
    document.body.classList.remove('v95-more');
    const el = contentOf('more'); if (!el) return;
    renderMenu();
    setActiveBtn('tabMore');
    activate(el);
    window.scrollTo({ top: 0 });
    slide(el, dir);
  }
  // Кнопка «← Меню» внутри раздела
  function backBtn(el) {
    let b = el.querySelector(':scope > .v95-back');
    if (!b) { b = document.createElement('button'); b.className = 'v95-back'; b.dataset.ltUi = '1'; b.innerHTML = '‹ Меню «Ещё»'; b.onclick = () => more(-1); el.insertBefore(b, el.firstChild); }
    el.insertBefore(b, el.firstChild); b.style.order = '-1000';
  }
  // Открыть раздел
  function open(secId, dir) {
    const sec = SECTIONS.find(s => s.id === secId); if (!sec) return;
    clearInverted();
    if (sec.inv) V93.setInverted(sec.inv, true);
    cur = sec.id;
    try { uSet('active_tab', 'more'); } catch (e) {}
    _switching = true;
    try { _base(sec.tab); } finally { _switching = false; }
    setActiveBtn('tabMore');
    document.body.classList.add('v95-more');
    const el = contentOf(sec.tab);
    if (el) {
      if (sec.inv) { V93.apply(sec.inv); V93.rerender(sec.inv); V93.apply(sec.inv); }
      else { const id = el.id; if (V93.TABS && V93.TABS[id]) V93.apply(id); }
      backBtn(el);
      slide(el, dir);
    }
  }
  // Основная вкладка
  function main(tab, dir) {
    const prev = SECTIONS.find(s => s.id === cur);
    const needRerender = !!(prev && prev.inv && prev.tab === tab);
    clearInverted();
    cur = tab;
    _switching = true;
    try { _base(tab); } finally { _switching = false; }
    document.body.classList.remove('v95-more');
    const el = contentOf(tab);
    if (el) { const id = el.id; if (V93.TABS && V93.TABS[id]) { if (needRerender) V93.rerender(id); V93.apply(id); } slide(el, dir); }
  }
  function slide(el, dir) {
    if (!dir) return;
    el.classList.remove('v95-in-l', 'v95-in-r'); void el.offsetWidth;
    el.classList.add(dir > 0 ? 'v95-in-l' : 'v95-in-r');
    setTimeout(() => el.classList.remove('v95-in-l', 'v95-in-r'), 400);
  }
  function go(step) {
    // внутри раздела свайп вправо = назад в меню
    if (SECTIONS.some(s => s.id === cur)) { if (step < 0) { try { haptic('light'); } catch (e) {} more(-1); } return; }
    const i = ORDER.indexOf(cur); if (i < 0) return;
    const j = i + step; if (j < 0 || j >= ORDER.length) { try { haptic('light'); } catch (e) {} return; }
    const next = ORDER[j];
    try { haptic('light'); } catch (e) {}
    if (next === 'more') more(step); else main(next, step);
  }

  // Единая точка: switchTab('more') → меню; switchTab('life'|'stats') → раздел; остальное — основная
  let _base = null;
  function install() {
    if (_base) return;
    _base = window.switchTab;
    window.switchTab = function (tab) {
      if (_switching) return _base.apply(this, arguments);
      if (tab === 'more') { more(0); return; }
      if (tab === 'life' || tab === 'stats') { open(tab, 0); return; }
      if (MAIN.includes(tab)) { main(tab, 0); return; }
      // shop и прочее — кнопка «Ещё» остаётся активной
      const r = _base.apply(this, arguments);
      if (tab === 'shop') { cur = 'shop'; setActiveBtn('tabMore'); document.body.classList.remove('v95-more'); const el = contentOf('shop'); if (el) { let b = el.querySelector(':scope > .v95-back'); if (!b) { b = document.createElement('button'); b.className = 'v95-back'; b.style.display = 'inline-flex'; b.innerHTML = '‹ Меню «Ещё»'; b.onclick = () => more(-1); el.insertBefore(b, el.firstChild); } } }
      return r;
    };
    window.switchTab._v95 = 1;
  }

  // Свайп по экрану
  function bindSwipe() {
    let sx = 0, sy = 0, t0 = 0, ok = false;
    const SKIP = 'input,textarea,select,[contenteditable],.tab-nav,.fab-container,.modal-overlay,.v95-chips,.mk-chart,.w92-ticker,.lt-editbar';
    const hscroll = n => { for (let e = n; e && e !== document.body; e = e.parentElement) { if (e.scrollWidth > e.clientWidth + 4) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll') return true; } } return false; };
    document.addEventListener('touchstart', e => {
      ok = false;
      if (e.touches.length !== 1) return;
      if (document.body.classList.contains('modal-open') || document.body.classList.contains('lt-edit')) return;
      const t = e.target;
      if (!t.closest || (t.closest('.tab-content') && !t.closest('.tab-content.active'))) return;
      if (t.closest(SKIP) || hscroll(t)) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); ok = true;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (!ok) return; ok = false;
      const c = e.changedTouches[0]; const dx = c.clientX - sx, dy = c.clientY - sy, dt = Date.now() - t0;
      if (dt > 700 || Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  let _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    try {
      install();
      bindSwipe();
      const act = document.querySelector('.tab-content.active');
      let tab = 'dashboard';
      try { tab = uGet('active_tab', null) || 'dashboard'; } catch (e) {}
      if (act) { const m = act.id.match(/^content(\w+)$/) || act.id.match(/^(\w+)Content$/); if (m) tab = m[1].toLowerCase(); }
      if (tab === 'more' || tab === 'life' || tab === 'stats') more(0); else if (MAIN.includes(tab)) main(tab, 0); else cur = tab;
      console.log('[v9.6] 3 tabs + more menu ready');
    } catch (e) { console.error('[v95] boot', e); _booted = false; }
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') { window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 950); return r; }; }
    document.addEventListener('v7:login', () => setTimeout(boot, 650));
    setTimeout(() => { if (!_booted && typeof currentUser !== 'undefined' && currentUser) boot(); }, 7600);
  })();
  return { boot, open, go, more, SECTIONS };
})();
window.V95 = V95;


