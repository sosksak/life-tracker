// ====== v9.9.5 — ОНБОРДИНГ: три шага при первом запуске ======
// 1) чем занимаешься (тип работы) → 2) сколько хочешь в месяц → 3) «Начать смену».
// Раньше новичка встречала голая модалка «Тип работы» без объяснений, а цель месяца
// он находил сам (или не находил). Флаг v995_onb в профиле; «Профиль → Подсказки →
// Показать» не трогает онбординг — он только для первого входа.
const V995 = (() => {
  'use strict';
  const KEY = 'v995_onb';
  const GOALS = [50000, 100000, 150000];
  let step = 0, wt = null, goal = 100000, mode = null;
  const fmt = n => n.toLocaleString('ru-RU');

  function el() {
    let m = document.getElementById('onbModal');
    if (m) return m;
    m = document.createElement('div'); m.className = 'modal-overlay onb'; m.id = 'onbModal';
    m.innerHTML = '<div class="modal-content onb-box"><div class="onb-dots"><i></i><i></i><i></i></div><div class="onb-body"></div></div>';
    document.body.appendChild(m);
    return m;
  }
  function dots() { el().querySelectorAll('.onb-dots i').forEach((d, i) => { d.classList.toggle('on', i === step); d.classList.toggle('done', i < step); }); }
  function body(html) { el().querySelector('.onb-body').innerHTML = html; dots(); el().querySelector('.onb-box').scrollTop = 0; }

  function s1() {
    step = 0;
    const cur = (typeof V7 !== 'undefined') ? V7.getWorkType() : null;
    if (!wt) wt = cur && uGet('v7_work_type', null) ? cur.id : null;
    const grid = V7.WORK_TYPES.map(w => { const t = V7.THEMES[w.theme] || V7.THEMES.blue; return '<button class="wt-card ' + (wt === w.id ? 'sel' : '') + '" style="--wt-c:' + t.accent + '" data-id="' + w.id + '"><div class="wt-ico" style="background:' + t.primary + '">' + w.icon + '</div><div class="wt-name">' + w.name + '</div><div class="wt-sub">' + w.sub + '</div></button>'; }).join('');
    body('<div class="onb-h">👋 Привет!</div><div class="onb-p">Life Tracker считает смены, деньги и привычки. Чтобы всё было в твоих словах и цветах — скажи, чем занимаешься.</div>' +
      '<div class="wt-grid onb-grid">' + grid + '</div>' +
      '<div class="onb-foot"><button class="modal-btn primary onb-next" ' + (wt ? '' : 'disabled') + '>Дальше ›</button></div>');
    el().querySelectorAll('.wt-card').forEach(b => b.onclick = () => { wt = b.dataset.id; el().querySelectorAll('.wt-card').forEach(x => x.classList.toggle('sel', x.dataset.id === wt)); el().querySelector('.onb-next').disabled = false; try { haptic('light'); } catch (e) {} });
    el().querySelector('.onb-next').onclick = () => { applyWt(); s2(); };
  }
  function applyWt() {
    try {
      const base = V7.WORK_TYPES.find(w => w.id === wt) || V7.WORK_TYPES[0];
      const prev = uGet('v7_work_type', null);
      if (!prev || prev.id !== base.id) { uSet('v7_work_type', Object.assign({}, base)); V7.applyWorkType(); }
    } catch (e) { console.warn('[onb] wt', e); }
  }
  function s2() {
    step = 1;
    try { const g = getMonthGoal(); if (g) goal = g; } catch (e) {}
    const noun = (() => { try { return V7.getWorkType().noun; } catch (e) { return 'shift'; } })();
    const unit = { shift: 'смен', day: 'дней', session: 'сессий', trading: 'торговых дней', lesson: 'занятий', workout: 'тренировок' }[noun] || 'смен';
    const chips = GOALS.map(g => '<button class="onb-chip ' + (goal === g ? 'on' : '') + '" data-g="' + g + '">' + fmt(g) + ' ₽</button>').join('');
    body('<div class="onb-h">🎯 Сколько хочешь в месяц?</div><div class="onb-p">Чистыми — после расходов. От этой цифры считаются прогноз, план и сколько ' + unit + ' осталось. Поменять можно в любой момент тапом по цели.</div>' +
      '<div class="onb-chips">' + chips + '</div>' +
      '<div class="form-group"><label>Своя сумма, ₽</label><input type="number" id="onbGoal" inputmode="numeric" min="0" step="5000" value="' + goal + '"></div>' +
      '<div class="onb-foot"><button class="modal-btn secondary onb-back">‹ Назад</button><button class="modal-btn primary onb-next">Дальше ›</button></div>');
    const inp = el().querySelector('#onbGoal');
    el().querySelectorAll('.onb-chip').forEach(b => b.onclick = () => { goal = +b.dataset.g; inp.value = goal; el().querySelectorAll('.onb-chip').forEach(x => x.classList.toggle('on', +x.dataset.g === goal)); try { haptic('light'); } catch (e) {} });
    inp.oninput = () => { goal = parseInt(inp.value, 10) || 0; el().querySelectorAll('.onb-chip').forEach(x => x.classList.toggle('on', +x.dataset.g === goal)); };
    el().querySelector('.onb-back').onclick = s1;
    el().querySelector('.onb-next').onclick = () => { if (!goal || goal <= 0) { showToast('❌ Введи сумму больше нуля', 'error'); return; } saveGoal(); s3(); };
  }
  function saveGoal() {
    try { localStorage.setItem(uKey('lt_month_goal'), String(goal)); markLocalChange(); schedulePushProgress(); } catch (e) {}
  }
  function s3() {
    step = 2;
    let w = null; try { w = V7.getWorkType(); } catch (e) {}
    const noun = (w && w.noun) || 'shift';
    if (!mode) mode = V997.suggest();
    const act = { shift: 'Начать смену', day: 'Начать день', session: 'Начать сессию', trading: 'Открыть торговый день', lesson: 'Начать занятие', workout: 'Начать тренировку' }[noun] || 'Начать смену';
    body('<div class="onb-h">' + (w ? w.icon : '🚀') + ' Готово</div><div class="onb-p"><b>' + (w ? w.name : '') + '</b> · цель <b>' + fmt(goal) + ' ₽</b> в месяц.</div>' +
      '<div class="onb-sub">Вид приложения</div><div class="onb-modes">' + V997.ORDER.map(id => { const p = V997.PRESETS[id]; return '<button class="onb-chip ' + (mode === id ? 'on' : '') + '" data-m="' + id + '">' + p.icon + ' ' + p.name + '</button>'; }).join('') + '</div><div class="onb-p" id="onbModeSub">' + V997.PRESETS[mode].sub + '</div>' +
      '<div class="onb-list"><div><span>🏠</span>Главная — кошелёк, план месяца, привычки</div><div><span>💼</span>Работа — таймер смены, доход в реальном времени</div><div><span>💰</span>Деньги — расходы и баланс</div><div><span>⋯</span>Ещё — Жизнь, Стата и скрытые карточки · свайп влево</div></div>' +
      '<div class="onb-foot col"><button class="modal-btn primary onb-start">🚀 ' + act + '</button><button class="modal-btn secondary onb-skip">Сначала осмотреться</button></div>');
    el().querySelectorAll('.onb-modes .onb-chip').forEach(b => b.onclick = () => { mode = b.dataset.m; el().querySelectorAll('.onb-modes .onb-chip').forEach(x => x.classList.toggle('on', x.dataset.m === mode)); el().querySelector('#onbModeSub').textContent = V997.PRESETS[mode].sub; try { haptic('light'); } catch (e) {} });
    el().querySelector('.onb-start').onclick = () => { finish(); try { switchTab('live'); setTimeout(() => { if (typeof activeShift !== 'undefined' && !activeShift) startShift(); }, 350); } catch (e) {} };
    el().querySelector('.onb-skip').onclick = () => { finish(); try { switchTab('dashboard'); } catch (e) {} };
  }
  function finish() {
    try { V997.apply(mode || V997.suggest(), { silent: true }); } catch (e) {}
    try { uSet(KEY, 1); markLocalChange(); schedulePushProgress(); } catch (e) {}
    const m = el(); m.classList.remove('show'); document.body.classList.remove('modal-open');
    try { haptic('medium'); } catch (e) {}
    try { if (typeof scheduleHint === 'function') scheduleHint(1500); } catch (e) {}
  }
  function open() {
    if (document.querySelector('#wtModal.show')) { try { closeWorkTypePicker(); } catch (e) {} }
    const m = el(); s1(); m.classList.add('show'); document.body.classList.add('modal-open');
  }
  function needed() {
    try { if (!currentUser) return false; if (uGet(KEY, 0)) return false; return !uGet('v7_work_type', null); } catch (e) { return false; }
  }
  function maybe() { if (needed() && !document.querySelector('#onbModal.show')) open(); }
  // Перехват: автопоказ «Тип работы» при первом входе → онбординг. Ручной вызов из профиля не трогаем.
  (function hook() {
    try { if (typeof PROGRESS_KEYS !== 'undefined' && !PROGRESS_KEYS.includes(KEY)) PROGRESS_KEYS.push(KEY); } catch (e) {}
    const o = window.openWorkTypePicker;
    if (typeof o === 'function' && !o._onb) {
      window.openWorkTypePicker = function () { if (needed()) { open(); return; } return o.apply(this, arguments); };
      window.openWorkTypePicker._onb = 1;
      if (window.V7) V7.openWorkTypePicker = window.openWorkTypePicker;
    }
    document.addEventListener('v7:login', () => setTimeout(maybe, 1200));
    setTimeout(maybe, 7000);
  })();
  return { open, maybe, needed };
})();
window.V995 = V995;
