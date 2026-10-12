// ====== v9.7 FX — тактильный слой: звёздочки на тап, вибрация, пульс чисел, контекстные фразы ======
const FX = (() => {
  let layer = null, lastTap = 0;
  const on = () => uGet('lt_fx', true) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function getLayer() { if (!layer) { layer = document.createElement('div'); layer.className = 'fx-layer'; document.body.appendChild(layer); } return layer; }
  function burst(x, y, n = 6, chars = ['✦', '✧', '★', '·']) {
    if (!on()) return;
    const l = getLayer();
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'fx-star';
      el.textContent = chars[i % chars.length];
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6, r = 18 + Math.random() * 22;
      el.style.setProperty('--x0', x + 'px'); el.style.setProperty('--y0', y + 'px');
      el.style.setProperty('--x1', (x + Math.cos(a) * r) + 'px'); el.style.setProperty('--y1', (y + Math.sin(a) * r - 8) + 'px');
      el.style.color = ['#F6C343', '#48BB78', '#4299E1', '#9F7AEA'][i % 4];
      l.appendChild(el); setTimeout(() => el.remove(), 600);
    }
  }
  function pulse(el) { if (!el || !on()) return; el.classList.remove('fx-pulse'); void el.offsetWidth; el.classList.add('fx-pulse'); }
  function flash() { if (!on()) return; const f = document.createElement('div'); f.className = 'fx-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 800); }
  // Большое событие: вспышка + дождь + сильная вибрация
  function big(coins = 20) { flash(); try { rainCoins(coins); } catch (e) {} haptic('success'); }
  // Фраза по контексту смены
  function shiftPhrase(earned, hours) {
    const rate = hours > 0 ? earned / hours : 0;
    const today = todayStr(), yd = localDateStr(new Date(Date.now() - 864e5));
    const last = (shifts || []).find(s => s.date !== today);
    const gap = last ? Math.round((parseLocalDate(today) - parseLocalDate(last.date)) / 864e5) : 0;
    if (earned >= 10000) return `ДЕСЯТКА! 💰💰💰 +${earned.toLocaleString('ru-RU')} ₽ — красавчик`;
    if (rate >= 1200) return `Монстр! 🔥 ${Math.round(rate)} ₽/ч — ты в топ-форме`;
    if (gap >= 4) return `С возвращением, воин! 💪 +${earned.toLocaleString('ru-RU')} ₽`;
    if (earned >= 5000) return `Пятёрка закрыта 💪 +${earned.toLocaleString('ru-RU')} ₽`;
    return `✅ Смена сохранена. +${earned.toLocaleString('ru-RU')} ₽`;
  }
  // Тап по любому кликабельному — звёздочки + лёгкая вибрация (не чаще 1/80мс)
  document.addEventListener('pointerdown', e => {
    const t = e.target.closest('button, [onclick], .hab-check, .tab-btn, .nav-item, .chip, summary, input[type=checkbox], .shop-item, .quest-item, a');
    if (!t || e.pointerType === 'mouse' && e.button !== 0) return;
    const now = Date.now(); if (now - lastTap < 80) return; lastTap = now;
    t.classList.add('fx-press'); setTimeout(() => t.classList.remove('fx-press'), 120);
    haptic('light');
    burst(e.clientX, e.clientY, 5);
  }, { passive: true });
  // Пульс баланса/XP при изменении
  const watched = {};
  function watch(id) {
    const el = document.getElementById(id); if (!el) return;
    const v = el.textContent; if (watched[id] !== undefined && watched[id] !== v) { pulse(el); const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 8, ['₽', '✦', '★']); }
    watched[id] = v;
  }
  new MutationObserver(() => { ['totalEarned', 'xpText', 'shopXpBalance'].forEach(watch); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  // Цель месяца закрыта — один раз в месяц салют
  function checkGoal() {
    try {
      const g = getMonthGoal(); if (!g) return;
      const mn = getMonthNet(); const key = 'lt_goal_fired_' + new Date().toISOString().slice(0, 7);
      if (mn.net >= g && !uGet(key, false)) { uSet(key, true); big(40); showToast(`🏆 ЦЕЛЬ МЕСЯЦА ЗАКРЫТА: ${g.toLocaleString('ru-RU')} ₽ чистыми!`, 'success'); }
    } catch (e) {}
  }
  const _render = window.render; if (typeof _render === 'function') window.render = function () { const r = _render.apply(this, arguments); setTimeout(checkGoal, 300); return r; };
  return { burst, pulse, flash, big, shiftPhrase, checkGoal };
})();
