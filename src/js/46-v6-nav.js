// ============================================================
//  V6 NAVIGATION — интеграция с реальной структурой v5.3
// ============================================================
// Реальная разметка: .tab-nav с .tab-btn, .tab-content как прямые
// дети body, FAB-меню (#fabMenu), switchTab(name) по схеме
// tab<Name> / content<Name>. Контейнеров .container/.tab-bar НЕТ.
//
// Новая структура — 5 вкладок:
//   🏠 ГЛАВНАЯ  → dashboard (v6)
//   💼 РАБОТА   → live      (v5, смена)
//   🎯 ЖИЗНЬ    → life      (v6: привычки + здоровье)
//   💰 ДЕНЬГИ   → money     (v6: финансы + портфель)
//   📊 АНАЛИТИКА→ stats     (v5)
// Магазин уезжает в FAB-меню.

const V6_TABS = {
  dashboard: { icon: '🏠', label: 'Главная',  render: () => DASHBOARD.render() },
  habits:    { icon: '📋', label: 'Привычки', render: () => HABITS.render() },
  health:    { icon: '❤️', label: 'Здоровье', render: () => HEALTH.render() },
  finance:   { icon: '📊', label: 'Финансы',  render: () => FINANCE.render() },
  crypto:    { icon: '📈', label: 'Портфель', render: () => CRYPTO.render() },
  market:    { icon: '📉', label: 'Биржа',    render: () => MARKET.render() },
};

// Составные вкладки: один таб — несколько модулей подряд
const V6_COMPOSITE = {
  dashboard: ['dashboard'],
  life:      ['habits', 'health'],
  money:     ['market', 'finance', 'crypto'],
};

const V5_TABS = ['live', 'shop', 'stats'];

let _v6Built = false;

// --- Создание DOM-контейнеров модулей ---
function buildV6Containers() {
  const anchor = document.getElementById('fabContainer');
  const mk = (id, cls) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = cls;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
      else document.body.appendChild(el);
    }
    return el;
  };

  // Вкладка-обёртка + внутренние слоты модулей
  for (const [tab, mods] of Object.entries(V6_COMPOSITE)) {
    const wrap = mk(tab + 'Content', 'tab-content v6-tab-content');
    for (const m of mods) {
      if (!document.getElementById(m + 'Content')) {
        const slot = document.createElement('div');
        slot.id = m + 'Content';
        slot.className = 'v6-module-slot';
        wrap.appendChild(slot);
      }
    }
  }
}

// --- Перестройка нижнего таб-бара ---
function buildV6TabBar() {
  const nav = document.querySelector('.tab-nav');
  if (!nav) return;

  // v9.5: три основных вкладки; Жизнь, Стата и второстепенные карточки — на экране «Ещё» (свайп влево)
  const TABS = [
    { id: 'dashboard', icon: '🏠', label: 'ГЛАВНАЯ' },
    { id: 'live',      icon: '💼', label: 'РАБОТА' },
    { id: 'money',     icon: '💰', label: 'ДЕНЬГИ' },
    { id: 'more',      icon: '⋯',  label: 'ЕЩЁ' },
  ];

  nav.innerHTML = TABS.map(t => `
    <button class="tab-btn" id="tab${t.id.charAt(0).toUpperCase() + t.id.slice(1)}"
            data-tab="${t.id}">
      <span class="tab-ico">${t.icon}</span>
      <span class="tab-lbl">${t.label}</span>
    </button>`).join('');

  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// --- Магазин + модули в FAB-меню ---
function buildV6FabItems() {
  const fab = document.getElementById('fabMenu');
  if (!fab || fab.dataset.v6 === '1') return;
  fab.dataset.v6 = '1';
  return; // v9.9.2: разделы живут в меню «Ещё», шестерёнка — только быстрые действия

  const items = [
    { icon: '🏪', label: 'Магазин',  fn: () => switchTab('shop') },
    { icon: '📉', label: 'Биржа',    fn: () => { switchTab('money'); scrollToModule('market'); } },
    { icon: '📈', label: 'Портфель', fn: () => { switchTab('money'); scrollToModule('crypto'); } },
    { icon: '❤️', label: 'Здоровье', fn: () => { switchTab('life'); scrollToModule('health'); } },
  ];

  for (const it of items) {
    if ([...fab.querySelectorAll('.fab-item')].some(b => b.textContent.includes(it.label))) continue;
    const btn = document.createElement('button');
    btn.className = 'fab-item';
    btn.innerHTML = `<span>${it.icon}</span> ${it.label}`;
    btn.addEventListener('click', () => { if (typeof toggleFab === 'function') toggleFab(); it.fn(); });
    fab.insertBefore(btn, fab.firstChild);
  }
}

function scrollToModule(mod) {
  const el = document.getElementById(mod + 'Content');
  if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

// --- Единый switchTab: обслуживает и v5, и v6 ---
let _v6PrevSwitchTab = null;

function installV6SwitchTab() {
  if (_v6PrevSwitchTab) return;
  _v6PrevSwitchTab = typeof switchTab === 'function' ? switchTab : null;

  window.switchTab = function(tab) {
    // Сброс активности у всех вкладок и кнопок
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const cap = tab.charAt(0).toUpperCase() + tab.slice(1);
    const btn = document.getElementById('tab' + cap) || document.getElementById('tabMore');
    const content = document.getElementById('content' + cap) || document.getElementById(tab + 'Content');
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');

    try {
      if (V6_COMPOSITE[tab]) {
        // v6: рендерим все модули вкладки
        for (const m of V6_COMPOSITE[tab]) {
          if (V6_TABS[m]) V6_TABS[m].render();
        }
      } else {
        // v5: прежнее поведение
        if (tab === 'shop' && typeof renderShop === 'function') renderShop();
        if (tab === 'stats' && typeof scheduleRender === 'function') scheduleRender();
      }
    } catch (e) {
      console.error('[v6] switchTab render error:', tab, e);
    }

    try { uSet('active_tab', tab); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// Совместимость: модули зовут switchV6Tab('crypto') и т.п.
function switchV6Tab(mod) {
  const parent = Object.keys(V6_COMPOSITE).find(t => V6_COMPOSITE[t].includes(mod));
  if (parent) { switchTab(parent); if (V6_COMPOSITE[parent].length > 1) scrollToModule(mod); }
}
function switchToV5Tab(tab) { switchTab(tab); }

// --- Синхронизация новых ключей в Supabase ---
function extendProgressKeys() {
  if (typeof PROGRESS_KEYS === 'undefined' || !Array.isArray(PROGRESS_KEYS)) return;
  const v6Keys = [
    'v6_habits', 'v6_habits_log',
    'v6_health',
    'v6_finance_tx', 'v6_finance_budget', 'v6_finance_goals',
    'v6_crypto_holdings',
    'water_goal', 'active_tab',
  ];
  for (const k of v6Keys) if (!PROGRESS_KEYS.includes(k)) PROGRESS_KEYS.push(k);
}

// --- BOOT ---
function bootV6() {
  if (_v6Built) return;
  _v6Built = true;
  try {
    extendProgressKeys();
    buildV6Containers();
    buildV6TabBar();
    buildV6FabItems();
    installV6SwitchTab();

    // Прогрев данных (создаёт дефолтные привычки при первом входе)
    try { HABITS.getHabits(); } catch (e) {}
    try { HEALTH.getTodayData(); } catch (e) {}

    // Восстанавливаем последнюю вкладку, по умолчанию — дашборд
    let start = 'dashboard';
    try {
      const saved = uGet('active_tab', null);
      if (saved && (V6_COMPOSITE[saved] || V5_TABS.includes(saved))) start = saved;
    } catch (e) {}
    switchTab(start);

    // Фоновая подгрузка курсов — не блокирует интерфейс
    setTimeout(() => { try { CRYPTO.fetchPrices(); } catch (e) {} }, 1500);

    console.log('[v6] Life & Work Tracker modules ready');
  } catch (e) {
    console.error('[v6] Boot error:', e);
    _v6Built = false;
  }
}

// Ранний каркас: таб-бар, контейнеры и switchTab ставим СРАЗУ при парсинге
// скрипта (DOM выше уже есть), чтобы до завершения init() не мелькал старый
// 3-вкладочный интерфейс. Данные модулей подтянет bootV6() после init().
(function earlyV6Skeleton() {
  try {
    buildV6Containers();
    buildV6TabBar();
    installV6SwitchTab();
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    let start = 'dashboard';
    try { const s = uGet('active_tab', null); if (s && (V6_COMPOSITE[s] || V5_TABS.includes(s))) start = s; } catch (e) {}
    const cap = start.charAt(0).toUpperCase() + start.slice(1);
    const btn = document.getElementById('tab' + cap) || document.getElementById('tabMore');
    const content = document.getElementById('content' + cap) || document.getElementById(start + 'Content');
    if (btn) btn.classList.add('active');
    if (content) content.classList.add('active');
  } catch (e) { console.warn('[v6] early skeleton:', e); }
})();

// Хук на init(): дожидаемся основной инициализации, затем строим v6.
(function hookV6Init() {
  if (typeof init === 'function') {
    const _origInit = init;
    window.init = async function() {
      await _origInit.apply(this, arguments);
      bootV6();
    };
  } else {
    // init ещё не объявлена — пробуем после загрузки
    if (document.readyState === 'complete') setTimeout(bootV6, 800);
    else window.addEventListener('load', () => setTimeout(bootV6, 800));
  }
  // Страховка: если init не вызвался (например, вход уже выполнен)
  setTimeout(() => { if (!_v6Built) bootV6(); }, 5000);
})();

// Глобальные алиасы для onclick в разметке модулей
window.DASHBOARD = DASHBOARD;
window.HABITS = HABITS;
window.HEALTH = HEALTH;
// FINANCE живёт в Svelte-бандле (app/bundle.js) и сам регистрируется на window.
window.CRYPTO = CRYPTO;
window.switchV6Tab = switchV6Tab;
window.bootV6 = bootV6;

