// CAL — модалка «📅 РАСПИСАНИЕ» (#calendarModal). Бывшие calInit/calChangeMonth/calSelectDay/
// renderCalendar из src/js/26-shift-modal-calendar.js (→ _archive/26-calendar-legacy.js).
// Состояние месяца/выбранного дня — здесь (бывшие calYear/calMonth/calSelectedDate);
// план (lt_calendar_plan) и смены — в легаси, читаются через мост.
import { legacy } from '../lib/legacy.js';

export const MONTH_NAMES_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export const cal = $state({ year: new Date().getFullYear(), month: new Date().getMonth(), selected: null, v: 0 });

export function init() {
  const now = new Date();
  cal.year = now.getFullYear();
  cal.month = now.getMonth();
  cal.v++;
}
export function changeMonth(delta) {
  let m = cal.month + delta, y = cal.year;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  cal.month = m; cal.year = y; cal.selected = null;
  cal.v++;
}
export function selectDay(dateStr) {
  cal.selected = cal.selected === dateStr ? null : dateStr;
  cal.v++;
}
export const selectedDate = () => cal.selected;

const p2 = n => String(n).padStart(2, '0');
let _lastInfo = '';

export function computeCalendar() {
  cal.v;
  const calYear = cal.year, calMonth = cal.month, calSelectedDate = cal.selected;
  const plan = legacy.calendarPlan();
  const shifts = legacy.shifts();

  // Локальная дата для «сегодня» (не UTC)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`;
  const monthPrefix = `${calYear}-${p2(calMonth + 1)}`;
  const monthShifts = {};
  for (const s of shifts) {
    if (s.date && s.date.startsWith(monthPrefix)) {
      if (!monthShifts[s.date]) monthShifts[s.date] = { earned: 0, hours: 0, count: 0 };
      monthShifts[s.date].earned += s.earned;
      monthShifts[s.date].hours += s.hours;
      monthShifts[s.date].count++;
    }
  }

  const firstDay = new Date(calYear, calMonth, 1);
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6; // Пн = 0
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push({ empty: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${p2(calMonth + 1)}-${p2(d)}`;
    const hasShift = !!monthShifts[dateStr];
    const planType = plan[dateStr];
    let cls = 'cal-day';
    if (dateStr === todayStr) cls += ' today';
    if (hasShift) cls += ' has-shift';
    else if (planType === 'dayoff') cls += ' is-dayoff';
    else if (planType === 'planned') cls += ' is-planned';
    if (dateStr === calSelectedDate) cls += ' selected';
    let icon = '';
    if (hasShift) icon = '💰'; else if (planType === 'dayoff') icon = '🌴'; else if (planType === 'planned') icon = '📋';
    cells.push({ empty: false, cls, num: d, icon, earned: hasShift ? `${Math.round(monthShifts[dateStr].earned / 1000)}K` : '', oc: `calSelectDay('${dateStr}')` });
  }

  // Выбранный день (дата парсится по частям — без сдвига зоны). Как легаси: без выбора блок
  // прячется, но прежний текст внутри остаётся (innerHTML не очищался) — держим его в _lastInfo.
  let info = { show: false, html: _lastInfo };
  if (calSelectedDate && calSelectedDate.startsWith(monthPrefix)) {
    const sd = monthShifts[calSelectedDate], sp = plan[calSelectedDate];
    const parts = calSelectedDate.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dateLabel = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
    let html;
    if (sd) { const rate = sd.hours > 0 ? Math.round(sd.earned / sd.hours) : 0; html = `<b>${dateLabel}</b><br>💰 ${sd.earned.toLocaleString('ru-RU')} ₽ · ${sd.hours} ч · ${rate} ₽/час`; }
    else if (sp === 'dayoff') html = `<b>${dateLabel}</b><br>🌴 Выходной`;
    else if (sp === 'planned') html = `<b>${dateLabel}</b><br>📋 Запланирована смена`;
    else html = `<b>${dateLabel}</b><br>Пусто — отметь день ниже`;
    info = { show: true, html };
    _lastInfo = html;
  }

  const dates = Object.keys(monthShifts);
  const totalEarnedMonth = dates.reduce((s, d) => s + monthShifts[d].earned, 0);
  const totalHoursMonth = dates.reduce((s, d) => s + monthShifts[d].hours, 0);
  const summary = {
    worked: dates.length,
    planned: Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'planned').length,
    dayoff: Object.entries(plan).filter(([k, v]) => k.startsWith(monthPrefix) && v === 'dayoff').length,
    earned: totalEarnedMonth > 0 ? Math.round(totalEarnedMonth / 1000) + 'K' : '0',
    hours: totalHoursMonth.toFixed(0),
    rate: totalHoursMonth > 0 ? Math.round(totalEarnedMonth / totalHoursMonth) : 0,
  };

  return { title: `${MONTH_NAMES_RU[calMonth]} ${calYear}`, cells, info, summary };
}
