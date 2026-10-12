// ====== v7.0.2: подсказки «где что» — показываются по одному разу на профиль ======
const UI_HINTS = [
  { id: 'wt', target: '#wtChip', title: '💼 Тип работы', text: 'Здесь меняется тип работы: цвета, термины и целевая ставка подстроятся. Это же есть в «Профиль → Режим приложения».', when: () => true },
  { id: 'cat', target: '#catHub', title: '🎯 Направление заданий', text: 'Тут выбираешь, из какого направления будут завтрашние личные задания. Цветная метка под каждым заданием — его направление.', when: () => document.getElementById('lifeContent')?.classList.contains('active') },
  { id: 'trader', target: '#v9Trader .v9-nav', title: '📈 Режим трейдера', text: 'Обзор, журнал сделок с расчётом риска и R, стратегии со статистикой, цели, риск-контроль, слежение за активами и база знаний. Начни с «⚙ Настроить депозит».', when: () => { try { return V7.getWorkType().id === 'trader' && document.getElementById('contentLive')?.classList.contains('active'); } catch (e) { return false; } } },
  { id: 'more96', target: '#tabMore', title: '⋯ Ещё', text: 'Меню разделов: Жизнь, Стата, Магазин, Профиль и скрытые карточки. Свайп влево/вправо листает Главная → Работа → Деньги → Ещё.', when: () => true },
  { id: 'shop', target: '#tabMoney', title: '💰 Деньги', text: 'Биржа с живым курсом крипты, финансы и портфель — здесь. Бусты (замены, двойной XP, направление заданий) покупаются за Life XP.', when: () => true }
];
function getHintsSeen() { try { return uGet('v7_hints_seen', {}) || {}; } catch (e) { return {}; } }
function markHintSeen(id) { try { const s = getHintsSeen(); s[id] = 1; uSet('v7_hints_seen', s); } catch (e) {} }
let _hintOpen = false;
let _hintTimer = null;
// Один планировщик: любые повторные вызовы схлопываются в один — раньше каждый тап по вкладке
// плодил параллельные цепочки setTimeout, и подсказка «троила»: мигала, прыгала, скроллила страницу.
function scheduleHint(ms) { clearTimeout(_hintTimer); _hintTimer = setTimeout(() => { try { showNextHint(); } catch (e) {} }, ms); }
function showNextHint() {
  if (_hintOpen || !currentUser) return;
  if (document.querySelector('.ui-hint')) return;
  if (document.querySelector('.modal-overlay.show, .ask-overlay.show') || document.body.classList.contains('modal-open')) return;
  if (window.V995 && V995.needed()) return; // онбординг ещё не пройден — подсказки потом
  const seen = getHintsSeen();
  const h = UI_HINTS.find(x => !seen[x.id] && x.when() && document.querySelector(x.target));
  if (!h) return;
  const el = document.querySelector(h.target);
  const r = el.getBoundingClientRect();
  // Цель не в кадре — не скроллим страницу за пользователя и не крутим циклы: покажем при следующей смене вкладки
  if (r.width === 0 || r.top < 60 || r.bottom > innerHeight - 20) return;
  _hintOpen = true;
  el.classList.add('ui-hint-target');
  const box = document.createElement('div');
  box.className = 'ui-hint';
  const left = Math.max(10, Math.min(r.left, innerWidth - 270));
  const below = r.bottom + 160 > innerHeight;   // не влезает снизу — рисуем над элементом
  box.classList.toggle('below', below);
  box.style.left = left + 'px';
  box.style.setProperty('--ax', Math.max(12, Math.min(r.left + r.width / 2 - left - 6, 230)) + 'px');
  const idx = UI_HINTS.indexOf(h) + 1;
  box.innerHTML = `<div class="h-t">${h.title}</div><div>${h.text}</div><div class="h-row"><span class="h-step">подсказка ${idx} из ${UI_HINTS.length}</span><button>Понятно</button></div>`;
  document.body.appendChild(box);
  if (below) box.style.top = (r.top - box.offsetHeight - 12) + 'px';
  else box.style.top = (r.bottom + 10) + 'px';
  const close = () => {
    box.remove(); el.classList.remove('ui-hint-target'); markHintSeen(h.id); _hintOpen = false;
    scheduleHint(600);
  };
  box.querySelector('button').onclick = close;
  // Пользователь начал скроллить — убираем, чтобы подсказка не висела поверх контента
  window.addEventListener('scroll', close, { once: true, passive: true });
}
function resetHints() { try { uSet('v7_hints_seen', {}); } catch (e) {} showToast('💡 Подсказки включены заново', 'success'); scheduleHint(400); }
window.showNextHint = showNextHint; window.resetHints = resetHints;
// Запуск: после полной загрузки и при смене вкладки (через единый планировщик)
scheduleHint(3500);
document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('.v6-tab, [data-tab]')) scheduleHint(900);
});


