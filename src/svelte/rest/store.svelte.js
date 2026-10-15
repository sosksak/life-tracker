// REST — остатки innerHTML-рендера (v9.20): мотивация дня (#motivationTip),
// модалка направлений (#categoryPickerModal), модалка дневника (#diaryModal),
// попап «🏆 ДОСТИЖЕНИЕ!» (.ach-unlock-overlay).
// Бывшие TIPS/renderMotivationTip/openCategoryPicker/closeCategoryPicker из 22-life-quests.js
// и showAchUnlock/setDiaryStar/openDiaryModal/closeDiaryModal/saveDiaryEntry из
// 30-global-update-v5.js (→ _archive/22-rest-legacy.js).
// Данные (категории, Life XP, дневник) живут в легаси; расчёт — по вызову, как раньше.
import { legacy } from '../lib/legacy.js';

export const rest = $state({
  tip: null,                          // { text, author } — null до первого renderMotivationTip()
  tipV: 0,
  cp: { show: false, state: 'bonus', stateHtml: '', note: '', items: [], paid: false, source: 'bonus' },
  diary: { show: false, opened: false, star: 3, place: '', desc: '', lesson: '' },
  achs: [],                           // [{ key, icon, name, hiding }] — попапы достижений
});

// ---------- 💡 МОТИВАЦИЯ ДНЯ ----------
export const TIPS = [
  { text: 'Дисциплина — это делать то, что нужно, когда не хочется.', author: '📖 Принцип продуктивности' },
  { text: 'Маленькие шаги каждый день дают большие результаты.', author: '📈 Закон прогресса' },
  { text: 'Деньги любят тех, кто их уважает и считает.', author: '💰 Правило богатства' },
  { text: 'Лучший момент начать — вчера. Второй лучший — сейчас.', author: '⏰ Мудрость' },
  { text: 'Не сравнивай себя с другими. Сравнивай себя с собой вчерашним.', author: '🪞 Рост' },
  { text: 'Каждая смена — это кирпич в фундаменте твоего будущего.', author: '🏗 Строитель жизни' },
  { text: 'Усталость временна, результат — навсегда.', author: '💪 Философия успеха' },
  { text: 'Пока другие откладывают — ты строишь своё будущее.', author: '🌙 Вечерняя продуктивность' },
  { text: 'Тело — твой главный инструмент. Заботься о нём.', author: '❤️ Здоровье' },
  { text: '100 смен — и ты уже другой человек.', author: '🔄 Трансформация' },
  { text: 'Состояния создаются не везением, а ежедневной работой.', author: '📈 Закон накопления' },
  { text: 'Перерыв — не слабость, а стратегия.', author: '♟ Тактика' },
  { text: 'Твой rate сегодня — это твоя цена завтра.', author: '📊 Аналитика' },
  { text: 'Обед с собой = +300₽ в день = +9000₽ в месяц!', author: '🧮 Математика экономии' },
  { text: 'Главное — не останавливаться. Серия не должна прерваться.', author: '🔥 Принцип непрерывности' },
];
export function computeTip() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  return { text: `«${tip.text}»`, author: `— ${tip.author}` };
}

// ---------- 🎯 НАПРАВЛЕНИЕ ЗАДАНИЙ (модалка) ----------
export function openCategoryPicker(isWeeklyFree = false, mode = '') {
  const paid = mode === 'paid';
  const source = isWeeklyFree ? 'weekly' : 'bonus';
  const C = legacy.lq.categories();
  const tomorrow = legacy.lq.chosenCategoryFor(legacy.lq.tomorrowStr());
  const lifeXP = legacy.lq.lifeXP().cats || {};
  const pool = legacy.lq.lifeQuests();
  const items = Object.entries(C).map(([key, cat]) => ({
    key, icon: cat.icon, name: cat.name, color: cat.color, tc: legacy.lq.catTextColor(key),
    selected: tomorrow === key, cnt: `${pool.filter(q => q.cat === key).length} заданий`, xp: `${lifeXP[key] || 0} XP набрано`,
  }));
  let state, stateHtml;
  if (isWeeklyFree) { state = 'free'; stateHtml = '🎁 <span>Бесплатный выбор недели — доступен</span>'; }
  else if (paid) { state = 'paid'; stateHtml = '🪙 <span>Бесплатный выбор уже использован. Выбор сейчас — <b>150 XP</b> с баланса</span>'; }
  else { state = 'bonus'; stateHtml = '🏅 <span>Выбор заработан задачей смены</span>'; }
  const note = tomorrow
    ? `Сейчас на завтра выбрано: ${C[tomorrow].icon} ${C[tomorrow].name}. Нажми на другое, чтобы заменить.`
    : 'Нажми на направление — оно применится к заданиям завтрашнего дня.';
  rest.cp = { show: true, state, stateHtml, note, items, paid, source };
  document.body.classList.add('modal-open');
}
export function closeCategoryPicker() {
  rest.cp.show = false;
  document.body.classList.remove('modal-open');
}

// ---------- 📓 МОДАЛКА ДНЕВНИКА ----------
export function setDiaryStar(n) { rest.diary.star = n; }
export function openDiaryModal() {
  rest.diary = { show: true, opened: true, star: 3, place: '', desc: '', lesson: '' };
  document.body.classList.add('modal-open');
}
export function closeDiaryModal() {
  rest.diary.show = false;
  document.body.classList.remove('modal-open');
}
export function saveDiaryEntry() {
  // Читаем DOM, как легаси: значение могли выставить через .value без события input (bind не увидит)
  const v = id => (document.getElementById(id)?.value ?? '').trim();
  const place = v('diaryPlace'), desc = v('diaryDesc'), lesson = v('diaryLesson');
  if (!place && !desc) { legacy.toast('❌ Напиши хотя бы место или описание', 'error'); return; }
  const diary = legacy.get('social_diary', []) || [];
  diary.unshift({ id: Date.now(), date: legacy.todayStr(), place, desc, lesson, rating: rest.diary.star, ts: Date.now() });
  legacy.set('social_diary', diary);
  closeDiaryModal();
  try { window.renderDiary(); } catch (e) {}
  legacy.toast('📓 Запись сохранена!', 'success');
  legacy.haptic('success');
}

// ---------- 🏆 ПОПАП ДОСТИЖЕНИЯ ----------
let achSeq = 0;
export function showAchUnlock(ach) {
  legacy.haptic('success');
  const item = { key: ++achSeq, icon: ach.icon, name: ach.name, hiding: false };
  rest.achs.push(item);
  setTimeout(() => hideAch(item.key), 3000);
}
export function hideAch(key) {
  const it = rest.achs.find(a => a.key === key);
  if (!it) return;
  it.hiding = true;
  setTimeout(() => { const i = rest.achs.findIndex(a => a.key === key); if (i >= 0) rest.achs.splice(i, 1); }, 300);
}
