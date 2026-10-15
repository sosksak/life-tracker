// АРХИВ v9.20 — TIPS/renderMotivationTip(), openCategoryPicker()/closeCategoryPicker() из 22-life-quests.js и
// showAchUnlock(), setDiaryStar()/openDiaryModal()/closeDiaryModal()/saveDiaryEntry() из 30-global-update-v5.js,
// заменены Svelte (src/svelte/rest/*.svelte, store.svelte.js).

function openCategoryPicker(isWeeklyFree = false, mode = '') {
  const container = document.getElementById('categoryPickerList');
  const paid = mode === 'paid';
  const source = isWeeklyFree ? 'weekly' : 'bonus';
  const tomorrow = getChosenCategoryFor(tomorrowStr());
  const lifeXP = (typeof getLifeXP === 'function') ? (getLifeXP().cats || {}) : {};
  container.innerHTML = Object.entries(LQ_CATEGORIES).map(([key, cat]) =>
    `<button class="cat-pick-btn ${tomorrow === key ? 'is-selected' : ''}" onclick="${paid ? `buyCategoryChoice('${key}')` : `pickCategory('${key}', '${source}')`}" style="border-color:${cat.color}">
      <div class="ico">${cat.icon}</div>
      <div class="nm" style="color:${catTextColor(key)}">${cat.name}</div>
      <div class="cnt">${LIFE_QUESTS.filter(q => q.cat === key).length} заданий</div>
      <div class="xp" style="color:${catTextColor(key)}">${lifeXP[key] || 0} XP набрано</div>
    </button>`
  ).join('');
  const st = document.getElementById('cpState');
  if (st) {
    if (isWeeklyFree) { st.className = 'cp-state free'; st.innerHTML = '🎁 <span>Бесплатный выбор недели — доступен</span>'; }
    else if (paid) { st.className = 'cp-state paid'; st.innerHTML = '🪙 <span>Бесплатный выбор уже использован. Выбор сейчас — <b>150 XP</b> с баланса</span>'; }
    else { st.className = 'cp-state bonus'; st.innerHTML = '🏅 <span>Выбор заработан задачей смены</span>'; }
  }
  const note = document.getElementById('cpNote');
  if (note) note.textContent = tomorrow
    ? `Сейчас на завтра выбрано: ${LQ_CATEGORIES[tomorrow].icon} ${LQ_CATEGORIES[tomorrow].name}. Нажми на другое, чтобы заменить.`
    : 'Нажми на направление — оно применится к заданиям завтрашнего дня.';
  document.getElementById('categoryPickerModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeCategoryPicker() {
  document.getElementById('categoryPickerModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

// ====== MOTIVATION TIPS ======
const TIPS = [
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

function renderMotivationTip() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];
  document.getElementById('tipText').textContent = `«${tip.text}»`;
  document.getElementById('tipAuthor').textContent = `— ${tip.author}`;
}
function showAchUnlock(ach) {
  haptic('success');
  const ov = document.createElement('div');
  ov.className = 'ach-unlock-overlay';
  ov.innerHTML = `
    <div class="ach-unlock-glow"></div>
    <div class="ach-unlock-icon">${ach.icon}</div>
    <div class="ach-unlock-title">🏆 ДОСТИЖЕНИЕ!</div>
    <div class="ach-unlock-name">${ach.name}</div>
  `;
  ov.onclick = () => { ov.style.opacity='0'; setTimeout(()=>ov.remove(), 300); };
  document.body.appendChild(ov);
  setTimeout(() => { ov.style.opacity='0'; setTimeout(()=>ov.remove(), 300); }, 3000);
}

let _diaryStar = 3;
function setDiaryStar(n) {
  _diaryStar = n;
  const stars = document.getElementById('diaryStars');
  if (stars) {
    const spans = stars.querySelectorAll('span');
    spans.forEach((s, i) => { s.classList.toggle('on', i < n); });
  }
}
function openDiaryModal() {
  _diaryStar = 3;
  document.getElementById('diaryPlace').value = '';
  document.getElementById('diaryDesc').value = '';
  document.getElementById('diaryLesson').value = '';
  setDiaryStar(3);
  document.getElementById('diaryModal').classList.add('show');
  document.body.classList.add('modal-open');
}
function closeDiaryModal() {
  document.getElementById('diaryModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}
function saveDiaryEntry() {
  const place = document.getElementById('diaryPlace').value.trim();
  const desc = document.getElementById('diaryDesc').value.trim();
  const lesson = document.getElementById('diaryLesson').value.trim();
  if (!place && !desc) { showToast('❌ Напиши хотя бы место или описание', 'error'); return; }
  const diary = getDiary();
  diary.unshift({
    id: Date.now(),
    date: todayStr(),
    place, desc, lesson,
    rating: _diaryStar,
    ts: Date.now()
  });
  saveDiary(diary);
  closeDiaryModal();
  renderDiary();
  showToast('📓 Запись сохранена!', 'success');
  haptic('success');
}
