// ====== EDIT SHIFT MODAL ======
function openEditModal(id) {
  // Правка истории — только с устройства разработчика.
  if (!requirePerm('editShifts', '🔒 Редактировать смены может только разработчик')) return;
  const shift = shifts.find(s => s.id === id);
  if (!shift) return;
  document.getElementById('editShiftId').value = id;
  document.getElementById('editDate').value = shift.date;
  document.getElementById('editHours').value = shift.hours;
  document.getElementById('editEarned').value = shift.earned;
  document.getElementById('editNote').value = shift.displayNote || stripUserTag(shift.note) || '';
  document.getElementById('editExpenses').value = shift.expenses || '';
  document.getElementById('editUnits').value = shift.units || '';
  document.getElementById('editShiftModal').classList.add('show');
  document.body.classList.add('modal-open');
}

function closeEditModal() {
  document.getElementById('editShiftModal').classList.remove('show');
  document.body.classList.remove('modal-open');
}

async function saveEditShift() {
  if (!requirePerm('editShifts', '🔒 Редактировать смены может только разработчик')) return;
  const id = parseInt(document.getElementById('editShiftId').value);
  const date = document.getElementById('editDate').value;
  const hours = parseFloat(document.getElementById('editHours').value);
  const earned = parseFloat(document.getElementById('editEarned').value);
  const note = document.getElementById('editNote').value.trim();

  if (!date || !hours || !earned || hours <= 0 || earned <= 0) {
    showToast('Заполни все поля!', 'error');
    return;
  }

  const btn = document.getElementById('btnSaveEdit');
  btn.disabled = true;
  btn.textContent = '⏳...';

  const login = currentUser ? currentUser.login : '';
  const taggedNote = injectUserTag(note, login);

  const before = shifts.find(x => x.id === id);
  const oldKey = before ? shiftMetaKey(before) : null;
  const oldMeta = oldKey ? (getShiftMeta()[oldKey] || null) : null;
  const extra = readMetaInputs('edit');
  const ok = await updateShift(id, { date, hours, earned, note: taggedNote });

  btn.disabled = false;
  btn.textContent = '💾 СОХРАНИТЬ';

  if (ok) {
    // Ключ меты = дата|часы|доход: при правке переносим перерывы на новый ключ.
    const all = getShiftMeta();
    if (oldKey) delete all[oldKey];
    all[shiftMetaKey({ date, hours, earned })] = Object.assign({}, oldMeta || {}, extra);
    saveShiftMeta(all);
    const after = shifts.find(x => x.id === id);
    if (after) enrichShift(after);
    closeEditModal();
    showToast('✏️ Смена обновлена!', 'success');
    render();
  }
}

async function deleteFromEdit() {
  if (!requirePerm('deleteShifts', '🔒 Удалять смены может только разработчик')) return;
  const id = parseInt(document.getElementById('editShiftId').value);
  closeEditModal();
  await removeShift(id);
}

// ====== CALENDAR ======
// v9.21: состояние месяца/дня и отрисовка → Svelte (src/svelte/calendar/, window.CAL).
// Здесь — план (lt_calendar_plan), отметки дней и обёртки с прежними именами для inline onclick / init() / render().
// Старый код — в src/js/_archive/26-calendar-legacy.js.
function getCalendarPlan() {
  try { return JSON.parse(localStorage.getItem(uKey('lt_calendar_plan')) || '{}'); } catch(e) { return {}; }
}
function saveCalendarPlan(plan) {
  localStorage.setItem(uKey('lt_calendar_plan'), JSON.stringify(plan));
  schedulePushProgress();
}

function calInit() { if (window.CAL) CAL.init(); }
function calChangeMonth(delta) { if (window.CAL) CAL.changeMonth(delta); }
function calSelectDay(dateStr) { if (window.CAL) CAL.selectDay(dateStr); }

function calMarkSelected(type) {
  const calSelectedDate = window.CAL ? CAL.selectedDate() : null;
  if (!calSelectedDate) {
    showToast('Сначала выбери дату на календаре', 'warn');
    return;
  }
  const plan = getCalendarPlan();
  if (type === 'clear') {
    delete plan[calSelectedDate];
    showToast('✕ Отметка убрана', 'success');
  } else if (type === 'dayoff') {
    plan[calSelectedDate] = 'dayoff';
    showToast('🌴 Выходной отмечен', 'success');
  } else if (type === 'planned') {
    plan[calSelectedDate] = 'planned';
    showToast('📋 Смена запланирована', 'success');
  }
  saveCalendarPlan(plan);
  renderCalendar();
  // v9.6: прогноз месяца пересчитывается сразу, а не при следующем входе на вкладку
  try { renderMonthGoal(); } catch (e) {}
  try { if (typeof V92 !== 'undefined' && V92.render) V92.render(); } catch (e) {}
  try { if (typeof V9 !== 'undefined' && V9.renderDashCard) V9.renderDashCard(); } catch (e) {}
}

function renderCalendar() { if (window.CAL) CAL.render(); }

