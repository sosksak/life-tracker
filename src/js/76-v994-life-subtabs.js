// ====== v9.9.4 — ЖИЗНЬ: подвкладки вместо одной простыни на 12 000 px ======
// Чипсы сверху: Задачи · Привычки · Здоровье · Фокус · Дневник. Каждая карточка
// вкладки приписана к одной подвкладке, остальные прячутся классом .lsub-off.
// Режим редактирования (lt-edit) показывает всё, чтобы можно было переставлять.
// Выбор запоминается в v994_life_sub (локально, не синкается — это не данные).
const V994 = (() => {
  'use strict';
  const KEY = 'v994_life_sub';
  const SUBS = [
    { id: 'tasks',   icon: '✅', label: 'Задачи' },
    { id: 'habits',  icon: '📋', label: 'Привычки' },
    { id: 'health',  icon: '❤️', label: 'Здоровье' },
    { id: 'focus',   icon: '🎯', label: 'Фокус' },
    { id: 'journal', icon: '📓', label: 'Дневник' },
  ];
  let cur = 'tasks';
  try { const s = localStorage.getItem(KEY); if (s && SUBS.some(x => x.id === s)) cur = s; } catch (e) {}

  // Какой подвкладке принадлежит карточка верхнего уровня
  function subOf(el) {
    if (el.dataset.ltUi || el.classList.contains('lt-foot') || el.classList.contains('v95-back')) return null; // служебное — всегда видно
    const id = el.id || '', cls = el.className || '';
    if (id === 'lifeQuestsPanel' || id === 'motivationTip' || id === 'catHub' || /\blq-|life-quests|lq-stats/.test(cls)) return 'tasks';
    if (/\bhab-/.test(cls)) return 'habits';
    if (/\bhealth-/.test(cls)) return 'health';
    if (id === 'v7Journal' || el.querySelector(':scope > .v7-sec-head .v7-sec-title')?.textContent.includes('Дневник')) return 'journal';
    if (/\bv7-sec\b/.test(cls)) return 'focus'; // Фокус-сессии + Колесо жизни
    // Всё, что внутри слотов модулей, но без узнаваемых классов — по родителю
    const p = el.parentElement;
    if (p) { if (p.id === 'habitsContent') return 'habits'; if (p.id === 'healthContent') return 'health'; if (p.id === 'v7LifeExtra') return 'focus'; }
    return 'tasks';
  }
  function* cards(root) {
    for (const k of root.children) {
      if (k.classList.contains('v6-module-slot') || k.id === 'v7LifeExtra') { yield* cards(k); continue; }
      if (k.tagName === 'SCRIPT' || k.tagName === 'STYLE') continue;
      yield k;
    }
  }
  function counts() {
    const c = {};
    try { const q = getResolvedLifeQuests(), st = getLifeQuestState(); c.tasks = q.filter(x => st.checked[x.id]).length + '/' + q.length; } catch (e) {}
    try { const h = HABITS.getTodayProgress(); if (h.total) c.habits = h.done + '/' + h.total; } catch (e) {}
    try { if (getJournal()[todayStr()]) c.journal = '✓'; } catch (e) {}
    return c;
  }
  let _raf = 0;
  function apply() {
    const root = document.getElementById('lifeContent'); if (!root) return;
    root.dataset.lsub = cur;
    const edit = document.body.classList.contains('lt-edit'); // в режиме редактирования — всё видно
    for (const el of cards(root)) { const s = subOf(el); el.classList.toggle('lsub-off', !edit && !!s && s !== cur); }
    const bar = chips(root); const c = counts();
    bar.querySelectorAll('.lsub-chip').forEach(b => {
      b.classList.toggle('on', b.dataset.sub === cur);
      const n = b.querySelector('.n'); const v = c[b.dataset.sub]; n.textContent = v || ''; n.style.display = v ? '' : 'none';
    });
  }
  function schedule() { if (_raf) return; _raf = requestAnimationFrame(() => { _raf = 0; apply(); }); }
  function chips(root) {
    let bar = root.querySelector(':scope > .lsub-bar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'lsub-bar'; bar.dataset.ltUi = '1';
      bar.innerHTML = SUBS.map(s => `<button class="lsub-chip" data-sub="${s.id}"><span class="i">${s.icon}</span>${s.label}<span class="n"></span></button>`).join('');
      bar.addEventListener('click', e => { const b = e.target.closest('.lsub-chip'); if (b) set(b.dataset.sub); });
      root.insertBefore(bar, root.firstChild);
    }
    bar.style.order = '-900'; // после «‹ Меню», до карточек
    return bar;
  }
  function set(id, opts) {
    if (!SUBS.some(s => s.id === id)) return;
    const changed = id !== cur; cur = id;
    try { localStorage.setItem(KEY, id); } catch (e) {}
    apply();
    if (changed && !(opts && opts.silent)) { try { haptic('light'); } catch (e) {} window.scrollTo({ top: 0 }); }
  }
  // Переходы извне (главная → «Вечерний дневник», шестерёнка → здоровье) должны открывать нужную подвкладку
  function routeByTarget(id) {
    const map = { v7Journal: 'journal', healthContent: 'health', habitsContent: 'habits', lifeQuestsPanel: 'tasks', catHub: 'tasks', v7Pomo: 'focus', lwCanvas: 'focus' };
    if (map[id]) set(map[id], { silent: true });
  }
  function boot() {
    const root = document.getElementById('lifeContent'); if (!root || root.dataset.v994) return;
    root.dataset.v994 = '1';
    apply();
    // Любая перерисовка модулей (HABITS/HEALTH/V7) пересобирает карточки — перетегируем
    new MutationObserver(() => schedule()).observe(root, { childList: true, subtree: true });
    let _wasEdit = false;
    new MutationObserver(() => { const e = document.body.classList.contains('lt-edit'); if (e !== _wasEdit) { _wasEdit = e; apply(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // scrollIntoView на скрытую карточку — сначала раскрыть её подвкладку
    const o = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { try { if (this.closest && this.closest('#lifeContent')) { const card = this.closest('.lsub-off'); if (card) { const s = subOf(card); if (s) set(s, { silent: true }); } else routeByTarget(this.id); } } catch (e) {} return o.apply(this, arguments); };
    // openCategoryHub / HEALTH.* из меню шестерёнки идут через switchTab('life') + scrollToModule
    const osm = window.scrollToModule;
    if (typeof osm === 'function') window.scrollToModule = function (m) { routeByTarget(m + 'Content'); return osm.apply(this, arguments); };
    document.body.classList.add('v994');
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 300); return r; };
    document.addEventListener('v7:login', () => setTimeout(boot, 400));
    setTimeout(() => { if (typeof currentUser !== 'undefined' && currentUser) boot(); }, 7800);
  })();
  return { set, apply, SUBS, get current() { return cur; } };
})();
window.V994 = V994;
