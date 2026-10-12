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
let calYear, calMonth, calSelectedDate = null;
const MONTH_NAMES_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function getCalendarPlan() {
  try { return JSON.parse(localStorage.getItem(uKey('lt_calendar_plan')) || '{}'); } catch(e) { return {}; }
}
function saveCalendarPlan(plan) {
  localStorage.setItem(uKey('lt_calendar_plan'), JSON.stringify(plan));
  schedulePushProgress();
}

function calInit() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  renderCalendar();
}

function calChangeMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0; calYear++; }
  calSelectedDate = null;
  renderCalendar();
}

function calSelectDay(dateStr) {
  calSelectedDate = calSelectedDate === dateStr ? null : dateStr;
  renderCalendar();
}

function calMarkSelected(type) {
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

function renderCalendar() {
  const titleEl = document.getElementById('calMonthTitle');
  const gridEl = document.getElementById('calGrid');
  const summaryEl = document.getElementById('calSummary');
  const infoEl = document.getElementById('calSelectedInfo');
  if (!titleEl || !gridEl) return;

  titleEl.textContent = `${MONTH_NAMES_RU[calMonth]} ${calYear}`;

  const plan = getCalendarPlan();

  // FIX: Use local date for today comparison to avoid timezone issues
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Build shift map for this month
  const monthPrefix = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  const monthShifts = {};
  for (const s of shifts) {
    if (s.date && s.date.startsWith(monthPrefix)) {
      if (!monthShifts[s.date]) monthShifts[s.date] = { earned: 0, hours: 0, count: 0 };
      monthShifts[s.date].earned += s.earned;
      monthShifts[s.date].hours += s.hours;
      monthShifts[s.date].count++;
    }
  }

  // First day of month (Monday = 0)
  const firstDay = new Date(calYear, calMonth, 1);
  let startDow = firstDay.getDay() - 1; // Mon=0
  if (startDow < 0) startDow = 6; // Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = '';
  // Empty cells before first day
  for (let i = 0; i < startDow; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const hasShift = !!monthShifts[dateStr];
    const planType = plan[dateStr];
    const isSelected = dateStr === calSelectedDate;

    let classes = 'cal-day';
    if (isToday) classes += ' today';
    if (hasShift) classes += ' has-shift';
    else if (planType === 'dayoff') classes += ' is-dayoff';
    else if (planType === 'planned') classes += ' is-planned';
    if (isSelected) classes += ' selected';

    let icon = '';
    if (hasShift) icon = '💰';
    else if (planType === 'dayoff') icon = '🌴';
    else if (planType === 'planned') icon = '📋';

    let earnedLabel = '';
    if (hasShift) {
      const k = Math.round(monthShifts[dateStr].earned / 1000);
      earnedLabel = `<div class="cal-day-earned">${k}K</div>`;
    }

    html += `<div class="${classes}" onclick="calSelectDay('${dateStr}')">
      <div class="cal-day-num">${d}</div>
      ${icon ? `<div class="cal-day-icon">${icon}</div>` : ''}
      ${earnedLabel}
    </div>`;
  }

  gridEl.innerHTML = html;

  // Selected info
  if (calSelectedDate && calSelectedDate.startsWith(monthPrefix)) {
    infoEl.style.display = '';
    const sd = monthShifts[calSelectedDate];
    const sp = plan[calSelectedDate];

    // FIX: Parse date parts manually to avoid timezone shift
    const parts = calSelectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dateLabel = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });

    if (sd) {
      const rate = sd.hours > 0 ? Math.round(sd.earned / sd.hours) : 0;
      infoEl.innerHTML = `<b>${dateLabel}</b><br>💰 ${sd.earned.toLocaleString('ru-RU')} ₽ · ${sd.hours} ч · ${rate} ₽/час`;
    } else if (sp === 'dayoff') {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>🌴 Выходной`;
    } else if (sp === 'planned') {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>📋 Запланирована смена`;
    } else {
      infoEl.innerHTML = `<b>${dateLabel}</b><br>Пусто — отметь день ниже`;
    }
  } else {
    infoEl.style.display = 'none';
  }

  // Summary for month
  const monthShiftDates = Object.keys(monthShifts);
  const totalEarnedMonth = monthShiftDates.reduce((s, d) => s + monthShifts[d].earned, 0);
  const totalHoursMonth = monthShiftDates.reduce((s, d) => s + monthShifts[d].hours, 0);
  const plannedCount = Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'planned').length;
  const dayoffCount = Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'dayoff').length;
  const workedCount = monthShiftDates.length;

  summaryEl.innerHTML = `
    <div class="cal-sum-card"><div class="cal-sum-val">${workedCount}</div><div class="cal-sum-lbl">отработано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${plannedCount}</div><div class="cal-sum-lbl">запланировано</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${dayoffCount}</div><div class="cal-sum-lbl">выходных 🌴</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalEarnedMonth > 0 ? Math.round(totalEarnedMonth / 1000) + 'K' : '0'}</div><div class="cal-sum-lbl">₽ за месяц</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalHoursMonth.toFixed(0)}</div><div class="cal-sum-lbl">часов</div></div>
    <div class="cal-sum-card"><div class="cal-sum-val">${totalHoursMonth > 0 ? Math.round(totalEarnedMonth / totalHoursMonth) : 0}</div><div class="cal-sum-lbl">₽/час сред.</div></div>
  `;
}

