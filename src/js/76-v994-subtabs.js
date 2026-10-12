// ====== v9.9.4 — ПОДВКЛАДКИ: Жизнь и Стата вместо одной простыни на 10 000 px ======
// Чипсы сверху. Каждая карточка вкладки приписана к одной подвкладке, остальные
// прячутся классом .lsub-off. Режим редактирования (lt-edit) показывает всё.
// Выбор запоминается локально (v994_sub_<tab>) — это не данные, синк не нужен.
//   Жизнь: Задачи · Привычки · Здоровье · Фокус · Дневник
//   Стата: Обзор · Доход · Смены · Достижения   (v9.9.6)
const V994 = (() => {
  'use strict';
  const CFG = {
    lifeContent: {
      subs: [
        { id: 'tasks',   icon: '✅', label: 'Задачи' },
        { id: 'habits',  icon: '📋', label: 'Привычки' },
        { id: 'health',  icon: '❤️', label: 'Здоровье' },
        { id: 'focus',   icon: '🎯', label: 'Фокус' },
        { id: 'journal', icon: '📓', label: 'Дневник' },
      ],
      wrap: el => el.classList.contains('v6-module-slot') || el.id === 'v7LifeExtra',
      subOf(el) {
        const id = el.id || '', cls = el.className || '';
        if (id === 'lifeQuestsPanel' || id === 'motivationTip' || id === 'catHub' || /\blq-|life-quests|lq-stats/.test(cls)) return 'tasks';
        if (/\bhab-/.test(cls)) return 'habits';
        if (/\bhealth-/.test(cls)) return 'health';
        if (id === 'v7Journal') return 'journal';
        if (/\bv7-sec\b/.test(cls)) return 'focus';
        const p = el.parentElement;
        if (p) { if (p.id === 'habitsContent') return 'habits'; if (p.id === 'healthContent') return 'health'; if (p.id === 'v7LifeExtra') return 'focus'; }
        return 'tasks';
      },
      counts() {
        const c = {};
        try { const q = getResolvedLifeQuests(), st = getLifeQuestState(); c.tasks = q.filter(x => st.checked[x.id]).length + '/' + q.length; } catch (e) {}
        try { const h = HABITS.getTodayProgress(); if (h.total) c.habits = h.done + '/' + h.total; } catch (e) {}
        try { if (getJournal()[todayStr()]) c.journal = '✓'; } catch (e) {}
        return c;
      },
      route: { v7Journal: 'journal', healthContent: 'health', habitsContent: 'habits', lifeQuestsPanel: 'tasks', catHub: 'tasks', v7Pomo: 'focus', lwCanvas: 'focus' },
    },
    contentStats: {
      subs: [
        { id: 'overview', icon: '📊', label: 'Обзор' },
        { id: 'income',   icon: '📈', label: 'Доход' },
        { id: 'shifts',   icon: '📋', label: 'Смены' },
        { id: 'awards',   icon: '🏅', label: 'Достижения' },
      ],
      wrap: el => el.id === 'v7StatsExtra',
      subOf(el) {
        const id = el.id || '', cls = el.className || '';
        if (/\bv7-sec\b/.test(cls) || id === 'v8Reports') return 'overview'; // итоги недели + отчёт месяца
        if (id === 'streakBar' || /\blevel-section\b/.test(cls) || /\bachievements\b/.test(cls)) return 'awards';
        if (/\bchart-section\b/.test(cls)) { const h = el.querySelector('h3')?.textContent || ''; return /ПЛАН МЕСЯЦА/.test(h) ? 'overview' : 'income'; }
        if (id === 'weekCompare' || id === 'heatmapSection') return 'income';
        if (id === 'diarySection' || /\bhistory\b/.test(cls)) return 'shifts';
        return 'overview';
      },
      counts() {
        const c = {};
        try { const g = getMonthGoal(); const m = getMonthNet(); if (g) c.overview = Math.round(m.net / g * 100) + '%'; if (m.n) c.shifts = String(m.n); } catch (e) {}
        return c;
      },
      route: { monthGoalCard: 'overview', v8Reports: 'overview', chartBody: 'income', shiftList: 'shifts', achGrid: 'awards', diarySection: 'shifts', history: 'shifts' },
    },
  };
  const cur = {};
  for (const t of Object.keys(CFG)) { cur[t] = CFG[t].subs[0].id; try { const s = localStorage.getItem('v994_sub_' + t); if (s && CFG[t].subs.some(x => x.id === s)) cur[t] = s; } catch (e) {} }

  const skip = el => el.dataset.ltUi || el.classList.contains('lt-foot') || el.classList.contains('v95-back') || el.classList.contains('lsub-bar') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
  function* cards(tab, root) { for (const k of root.children) { if (CFG[tab].wrap(k)) { yield* cards(tab, k); continue; } if (!skip(k)) yield k; } }
  let _raf = {};
  function apply(tab) {
    const cfg = CFG[tab], root = document.getElementById(tab); if (!cfg || !root) return;
    const c = cur[tab]; root.dataset.lsub = c;
    const edit = document.body.classList.contains('lt-edit');
    for (const el of cards(tab, root)) { const s = cfg.subOf(el); el.classList.toggle('lsub-off', !edit && !!s && s !== c); }
    const bar = chips(tab, root); const n = cfg.counts();
    bar.querySelectorAll('.lsub-chip').forEach(b => { b.classList.toggle('on', b.dataset.sub === c); const e = b.querySelector('.n'); const v = n[b.dataset.sub]; e.textContent = v || ''; e.style.display = v ? '' : 'none'; });
  }
  function applyAll() { for (const t of Object.keys(CFG)) apply(t); }
  function schedule(tab) { if (_raf[tab]) return; _raf[tab] = requestAnimationFrame(() => { _raf[tab] = 0; apply(tab); }); }
  function chips(tab, root) {
    let bar = root.querySelector(':scope > .lsub-bar');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'lsub-bar'; bar.dataset.ltUi = '1';
      bar.innerHTML = CFG[tab].subs.map(s => `<button class="lsub-chip" data-sub="${s.id}"><span class="i">${s.icon}</span>${s.label}<span class="n"></span></button>`).join('');
      bar.addEventListener('click', e => { const b = e.target.closest('.lsub-chip'); if (b) set(tab, b.dataset.sub); });
      root.insertBefore(bar, root.firstChild);
    }
    bar.style.order = '-900';
    return bar;
  }
  function set(tab, id, opts) {
    const cfg = CFG[tab]; if (!cfg || !cfg.subs.some(s => s.id === id)) return;
    const changed = id !== cur[tab]; cur[tab] = id;
    try { localStorage.setItem('v994_sub_' + tab, id); } catch (e) {}
    apply(tab);
    if (changed && !(opts && opts.silent)) { try { haptic('light'); } catch (e) {} window.scrollTo({ top: 0 }); }
  }
  // Переходы извне (главная → дневник, план месяца → Стата) открывают нужную подвкладку
  function routeByTarget(tab, id) { const r = CFG[tab].route[id]; if (r) set(tab, r, { silent: true }); }
  function tabOf(node) { for (const t of Object.keys(CFG)) if (node.closest && node.closest('#' + t)) return t; return null; }
  function reveal(node) {
    const t = tabOf(node); if (!t) return;
    const card = node.closest('.lsub-off'); if (card) { const s = CFG[t].subOf(card); if (s) set(t, s, { silent: true }); } else routeByTarget(t, node.id);
  }
  let _booted = false;
  function boot() {
    if (_booted) return; _booted = true;
    for (const t of Object.keys(CFG)) {
      const root = document.getElementById(t); if (!root) continue;
      apply(t);
      new MutationObserver(() => schedule(t)).observe(root, { childList: true, subtree: true });
    }
    let _wasEdit = false;
    new MutationObserver(() => { const e = document.body.classList.contains('lt-edit'); if (e !== _wasEdit) { _wasEdit = e; applyAll(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const o = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { try { reveal(this); } catch (e) {} return o.apply(this, arguments); };
    const osm = window.scrollToModule;
    if (typeof osm === 'function') window.scrollToModule = function (m) { try { const el = document.getElementById(m + 'Content'); if (el) reveal(el); } catch (e) {} return osm.apply(this, arguments); };
    document.body.classList.add('v994');
  }
  (function hook() {
    const ob = window.bootV6;
    if (typeof ob === 'function') window.bootV6 = function () { const r = ob.apply(this, arguments); setTimeout(boot, 300); return r; };
    document.addEventListener('v7:login', () => setTimeout(boot, 400));
    setTimeout(() => { if (typeof currentUser !== 'undefined' && currentUser) boot(); }, 7800);
  })();
  return { set, apply, applyAll, reveal, CFG, current: tab => cur[tab] };
})();
window.V994 = V994;
