// АРХИВ v9.19: renderWeekCompare/renderHeatmap/renderDiary из 30-global-update-v5.js —
// теперь src/svelte/stats/WeekCompare.svelte, Heatmap.svelte, Diary.svelte + store.svelte.js. Не подключается.

// --- Week Comparison ---
function renderWeekCompare() {
  const el = document.getElementById('weekCompare');
  if (shifts.length < 2) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0,0,0,0);
  const prevMonday = new Date(monday); prevMonday.setDate(monday.getDate() - 7);

  function weekData(from, to) {
    const ws = shifts.filter(s => {
      const dp = s.date.split('-');
      const d = new Date(parseInt(dp[0]), parseInt(dp[1])-1, parseInt(dp[2]));
      return d >= from && d < to;
    });
    return {
      shifts: ws.length,
      earned: ws.reduce((s, x) => s + x.earned, 0),
      hours: Math.round(ws.reduce((s, x) => s + x.hours, 0) * 10) / 10,
      rate: ws.reduce((s, x) => s + x.hours, 0) > 0
        ? Math.round(ws.reduce((s, x) => s + x.earned, 0) / ws.reduce((s, x) => s + x.hours, 0)) : 0
    };
  }

  const curr = weekData(monday, new Date(monday.getTime() + 7*86400000));
  const prev = weekData(prevMonday, monday);

  function deltaHtml(curr, prev, suffix = '') {
    const diff = curr - prev;
    if (diff === 0) return `<span class="wc-delta same">—</span>`;
    const cls = diff > 0 ? 'up' : 'down';
    const sign = diff > 0 ? '+' : '';
    return `<span class="wc-delta ${cls}">${sign}${typeof diff === 'number' && diff % 1 !== 0 ? diff.toFixed(1) : diff}${suffix}</span>`;
  }

  document.getElementById('weekCompareGrid').innerHTML = `
    <span class="wc-label">Смен</span><span class="wc-val">${curr.shifts}</span><span class="wc-prev">${prev.shifts}</span>${deltaHtml(curr.shifts, prev.shifts)}
    <span class="wc-label">Заработок</span><span class="wc-val">${curr.earned.toLocaleString('ru-RU')} ₽</span><span class="wc-prev">${prev.earned.toLocaleString('ru-RU')}</span>${deltaHtml(curr.earned, prev.earned)}
    <span class="wc-label">Часов</span><span class="wc-val">${curr.hours}</span><span class="wc-prev">${prev.hours}</span>${deltaHtml(curr.hours, prev.hours)}
    <span class="wc-label">Rate</span><span class="wc-val">${curr.rate} ₽/ч</span><span class="wc-prev">${prev.rate}</span>${deltaHtml(curr.rate, prev.rate)}
  `;
}

// --- Heatmap ---
let _heatmapLastKey = '';
function renderHeatmap() {
  const el = document.getElementById('heatmapSection');
  if (shifts.length < 1) { el.style.display = 'none'; return; }
  const hKey = shifts.length + ':' + (shifts[0]?.id || '') + ':' + (shifts[shifts.length-1]?.id || '');
  if (_heatmapLastKey === hKey) return;
  _heatmapLastKey = hKey;
  el.style.display = 'block';

  const grid = document.getElementById('heatmapGrid');
  const now = new Date(); now.setHours(0,0,0,0);
  const start = new Date(now); start.setDate(start.getDate() - 89);
  // Align to Monday
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

  // Build date->earned map
  const earnMap = {};
  shifts.forEach(s => { earnMap[s.date] = (earnMap[s.date] || 0) + s.earned; });
  const maxEarn = Math.max(...Object.values(earnMap), 1);

  // Weekday headers
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html = days.map(d => `<div class="heatmap-weekday">${d}</div>`).join('');

  const cur = new Date(start);
  while (cur <= now) {
    const key = localDateStr(cur);
    const earned = earnMap[key] || 0;
    const intensity = earned > 0 ? 0.2 + (earned / maxEarn) * 0.8 : 0;
    const color = earned > 0
      ? `rgba(56, 161, 105, ${intensity})`
      : '#F0F2F5';
    const title = earned > 0 ? `${key}: ${earned.toLocaleString('ru-RU')} ₽` : key;
    html += `<div class="heatmap-cell" style="background:${color}" title="${title}"></div>`;
    cur.setDate(cur.getDate() + 1);
  }
  grid.innerHTML = html;
}

function renderDiary() {
  const diary = getDiary();
  const list = document.getElementById('diaryList');
  const stats = document.getElementById('diaryStatsGrid');

  // Stats
  const total = diary.length;
  const thisWeek = diary.filter(d => {
    const now = new Date(); const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay()+6)%7)); mon.setHours(0,0,0,0);
    return d.ts >= mon.getTime();
  }).length;
  const avgRating = total > 0 ? (diary.reduce((s, d) => s + d.rating, 0) / total).toFixed(1) : '—';
  stats.innerHTML = `
    <div class="diary-stat-card"><div class="diary-stat-val">${total}</div><div class="diary-stat-lbl">всего записей</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">${thisWeek}</div><div class="diary-stat-lbl">за неделю</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">${avgRating}</div><div class="diary-stat-lbl">ср. оценка</div></div>
  `;

  // List (last 10)
  if (diary.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:16px;">Пока пусто — добавь первую запись!</div>';
    return;
  }
  list.innerHTML = diary.slice(0, 10).map(d => {
    const stars = renderStars(d.rating);
    const dp = d.date.split('-');
    const dateObj = new Date(parseInt(dp[0]), parseInt(dp[1])-1, parseInt(dp[2]));
    const dateStr = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    return `<div class="diary-card">
      <div class="diary-card-top"><span class="diary-place">${escapeHtml(d.place || '—')}</span><span class="diary-date">${dateStr}</span></div>
      ${d.desc ? `<div class="diary-desc">${escapeHtml(d.desc)}</div>` : ''}
      <div class="diary-rating">${stars}</div>
      ${d.lesson ? `<div class="diary-lesson">💡 ${escapeHtml(d.lesson)}</div>` : ''}
    </div>`;
  }).join('');
}

