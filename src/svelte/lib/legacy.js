// Мост к легаси-коду. Пока вся база (auth, смены, синк, модалки, тосты)
// живёт в src/js/*, Svelte-модули ходят к ней только через этот файл.
// Когда очередной кусок переедет в Svelte — меняется одна строка здесь.

const g = () => window;

export const legacy = {
  // хранилище с префиксом профиля (uGet/uSet в 10-auth.js)
  get: (k, fallback) => (typeof g().uGet === 'function' ? g().uGet(k, fallback) : fallback),
  set: (k, v) => { if (typeof g().uSet === 'function') g().uSet(k, v); },

  // облачная синхронизация прогресса (25-sync.js)
  touch() {
    if (typeof g().markLocalChange === 'function') g().markLocalChange();
    if (typeof g().schedulePushProgress === 'function') g().schedulePushProgress();
  },

  // смены — глобальный массив `shifts`
  shifts: () => (Array.isArray(g().shifts) ? g().shifts : []),

  // UI-примитивы
  toast: (msg, type = 'success') => { if (typeof g().showToast === 'function') g().showToast(msg, type); },
  haptic: (kind = 'medium') => { if (typeof g().haptic === 'function') g().haptic(kind); },
  fxBig: (n) => { if (g().FX && typeof g().FX.big === 'function') g().FX.big(n); else legacy.haptic('medium'); },
  askForm: (fields, opts) => (typeof g().askForm === 'function' ? g().askForm(fields, opts) : Promise.resolve(null)),
  askConfirm: (msg, opts) => (typeof g().askConfirm === 'function' ? g().askConfirm(msg, opts) : Promise.resolve(window.confirm(msg))),
  todayStr: () => (typeof g().todayStr === 'function' ? g().todayStr() : new Date().toISOString().slice(0, 10)),

  // цель месяца (28-render-goal-chart.js)
  monthGoal: () => { try { return g().getMonthGoal ? g().getMonthGoal() : 0; } catch { return 0; } },
  monthNet: () => { try { return g().getMonthNet ? g().getMonthNet() : null; } catch { return null; } },

  // попросить остальные вкладки перерисоваться (кошелёк, прогноз, главная)
  rerenderOthers() {
    if (g().DASHBOARD && typeof g().DASHBOARD.render === 'function') g().DASHBOARD.render();
    if (typeof g().scheduleRender === 'function') g().scheduleRender();
  },

  switchV6Tab: (mod) => { if (typeof g().switchV6Tab === 'function') g().switchV6Tab(mod); },
};

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU');
