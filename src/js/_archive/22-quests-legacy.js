// АРХИВ v9.17 — renderQuests() из 23-quests-shop.js и renderLifeStats()/catTag()/renderCategoryHub()/renderLifeQuests()
// из 22-life-quests.js, заменены Svelte (src/svelte/work/ShiftQuests.svelte, LifeQuests.svelte, quests.svelte.js).

function renderQuests() {
  const quests = generateQuests();
  const container = document.getElementById('questList');
  container.innerHTML = quests.map(q => {
    const pct = Math.min((q.progress / q.target) * 100, 100);
    const done = pct >= 100;
    const progressText = q.target <= 1
      ? (done ? '✅ Выполнено' : '⬜ В процессе')
      : (q.target >= 1000 ? `${Math.floor(q.progress).toLocaleString('ru-RU')} / ${q.target.toLocaleString('ru-RU')}` : `${q.progress.toFixed(1)} / ${q.target}`);
    return `<div class="quest-item ${done ? 'completed' : ''}">
      <div class="quest-header">
        <div class="quest-title">${q.icon} ${q.title}</div>
        <div class="quest-reward">${q.reward}</div>
      </div>
      <div class="quest-progress"><div class="quest-fill ${done ? 'done' : 'active'}" style="width:${pct}%"></div></div>
      <div class="quest-text">${q.desc} — ${progressText}</div>
    </div>`;
  }).join('');
}


// Храним последний показанный уровень, чтобы поймать момент level-up.
let _lastShownLvl = null;

function renderLifeStats() {
  const data = getLifeXP();
  const { current, next } = getLQLevel(data.total);
  const container = document.getElementById('lifeStatsPanel');
  if (!container) return;

  // прогресс внутри текущего уровня
  let progressPct = 100;
  let xpNow = data.total, xpNeed = null;
  if (next) {
    progressPct = ((data.total - current.xp) / (next.xp - current.xp)) * 100;
    xpNow = data.total - current.xp;
    xpNeed = next.xp - current.xp;
  }
  progressPct = Math.max(0, Math.min(progressPct, 100));

  // категории: сортируем по убыванию, топ подсвечиваем
  const catEntries = Object.entries(LQ_CATEGORIES).map(([key, cat]) => ({
    key, cat, xp: (data.cats && data.cats[key]) || 0
  })).sort((a, b) => b.xp - a.xp);
  const maxCatXP = Math.max(...catEntries.map(e => e.xp), 1);
  const catBars = catEntries.map((e, i) => {
    const pct = (e.xp / maxCatXP) * 100;
    const cls = e.xp === 0 ? 'is-zero' : (i === 0 ? 'is-top' : '');
    return `<div class="lq-stat-row ${cls}">
      <span class="lq-stat-icon">${e.cat.icon}</span>
      <span class="lq-stat-name">${e.cat.name}</span>
      <div class="lq-stat-bar"><div class="lq-stat-fill" data-target="${pct}" style="width:0%;background:${e.cat.color};color:${e.cat.color}"></div></div>
      <span class="lq-stat-val">${e.xp}</span>
    </div>`;
  }).join('');

  const multiplier = getXpMultiplier();
  const boostBadge = multiplier > 1 ? `<span class="lq-boost-badge">x${multiplier} XP</span>` : '';
  const nextLine = next
    ? `до <b>${next.name}</b> — ещё ${next.xp - data.total} XP`
    : 'максимальный уровень достигнут 🌟';
  const avgPerQuest = data.questsDone > 0 ? Math.round(data.total / data.questsDone) : 0;

  container.innerHTML = `
    <div class="lq-hero">
      <div class="lq-badge" id="lqBadge" style="--p:${(progressPct / 100).toFixed(3)}">
        <span class="lq-badge-inner">
          <span class="lq-badge-icon">${current.icon}</span>
          <span class="lq-badge-lvl">УР. ${current.lvl}</span>
        </span>
      </div>
      <div class="lq-hero-main">
        <div class="lq-rank-row">
          <span class="lq-rank-name">${current.name}</span>
          ${boostBadge}
        </div>
        <div class="lq-next-rank">${nextLine}</div>
        <div class="lq-xp-track">
          <div class="lq-xp-fill" data-target="${progressPct}" style="width:0%"></div>
          <div class="lq-xp-ticks"></div>
        </div>
        <div class="lq-xp-caption">
          <span><span class="lq-xp-now">${xpNow}</span>${xpNeed ? ' / ' + xpNeed + ' XP' : ' XP'}</span>
          <span class="lq-total-chip">✨ ${data.total}</span>
        </div>
      </div>
    </div>
    <div class="lq-stats-grid">
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">⚔️</span>
        <span class="lq-ms-val">${data.questsDone || 0}</span>
        <span class="lq-ms-lbl">заданий</span>
      </div>
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">🔥</span>
        <span class="lq-ms-val">${data.daysDone || 0}</span>
        <span class="lq-ms-lbl">дней</span>
      </div>
      <div class="lq-mini-stat">
        <span class="lq-ms-ico">📈</span>
        <span class="lq-ms-val">${avgPerQuest}</span>
        <span class="lq-ms-lbl">XP/квест</span>
      </div>
    </div>
    <div class="lq-cat-title"><span>Компетенции</span></div>
    <div class="lq-cat-bars">${catBars}</div>
  `;

  // Полоски рисуем с нуля и доводим до цели в следующем кадре —
  // иначе inline-width применяется сразу и анимации не видно.
  requestAnimationFrame(() => {
    const xpFill = container.querySelector('.lq-xp-fill');
    if (xpFill) xpFill.style.width = xpFill.dataset.target + '%';
    container.querySelectorAll('.lq-stat-fill').forEach(el => {
      el.style.width = el.dataset.target + '%';
    });
  });

  // Поймали переход на новый уровень — празднуем.
  if (_lastShownLvl !== null && current.lvl > _lastShownLvl) {
    celebrateLevelUp(current);
  }
  _lastShownLvl = current.lvl;
}


function catTag(key) {
  const c = LQ_CATEGORIES[key]; if (!c) return '';
  const tc = catTextColor(key);
  return `<span class="lq-cat-tag" style="color:${tc};border-color:${tc}33;background:${tc}0F"><span class="cat-dot" style="background:${c.color}"></span>${c.name}</span>`;
}

function renderCategoryHub() {
  const today = getChosenCategory();
  const tomorrow = getChosenCategoryFor(tomorrowStr());
  const src = getCategoryChoiceSource();
  const lifeXP = (typeof getLifeXP === 'function') ? (getLifeXP().cats || {}) : {};
  const card = (lbl, key) => {
    const c = key && LQ_CATEGORIES[key];
    return c
      ? `<div class="cat-hub-card"><div class="lbl">${lbl}</div><div class="val" style="color:${catTextColor(key)}"><span class="cat-dot" style="background:${c.color}"></span><span class="tx">${c.name}</span></div></div>`
      : `<div class="cat-hub-card is-random"><div class="lbl">${lbl}</div><div class="val">🎲 Случайные</div></div>`;
  };
  let btn;
  if (tomorrow) {
    btn = `<button class="cat-hub-btn done" onclick="openCategoryHub()"><span>✓ Направление на завтра выбрано</span><span class="sub">изменить ›</span></button>`;
  } else if (src === 'weekly') {
    btn = `<button class="cat-hub-btn free" onclick="openCategoryPicker(true)"><span>🎁 Выбрать направление на завтра</span><span class="sub">бесплатно · 1 раз в неделю</span></button>`;
  } else if (src === 'bonus') {
    btn = `<button class="cat-hub-btn bonus" onclick="openCategoryPicker(false)"><span>🏅 Выбрать направление на завтра</span><span class="sub">награда за задачу смены</span></button>`;
  } else {
    btn = `<button class="cat-hub-btn paid" onclick="openCategoryPicker(false, 'paid')"><span>🎯 Выбрать направление на завтра</span><span class="sub">150 XP · или бесплатно с понедельника</span></button>`;
  }
  const legend = Object.entries(LQ_CATEGORIES).map(([k, c]) => {
    const tc = catTextColor(k);
    return `<button class="cat-chip ${today === k ? 'is-focus' : ''}" style="color:${tc};border-color:${tc}55" onclick="openCategoryHub()" title="${c.name}">${c.icon} ${c.name}<span class="n">${lifeXP[k] || 0}</span></button>`;
  }).join('');
  return `<div class="cat-hub" id="catHub">
    <div class="cat-hub-head">
      <div class="cat-hub-title">🎯 Направление заданий</div>
      <button class="cat-hub-help" onclick="showCategoryHelp()" title="Как это работает">?</button>
    </div>
    <div class="cat-hub-row">${card('Сегодня', today)}${card('Завтра', tomorrow)}</div>
    ${btn}
    <div class="cat-hub-legend">${legend}</div>
  </div>`;
}

function renderLifeQuests() {
  const quests = getResolvedLifeQuests();
  const state = getLifeQuestState();
  const checked = state.checked;
  const totalRerolls = getTotalRerolls();
  const rerollsLeft = totalRerolls - state.rerolls;
  const bonusRerolls = getShiftBonuses().bonusRerolls || 0;
  const shopExtra = getShopExtraRerolls();
  const chosenCat = getChosenCategory();
  const container = document.getElementById('lifeQuestList');
  const doneCount = quests.filter(q => checked[q.id]).length;

  const headerHtml = '';

  let hubHtml = '';
  try { hubHtml = renderCategoryHub(); } catch (e) { console.warn('catHub:', e); }
  container.innerHTML = hubHtml + headerHtml + quests.map(q => {
    const isDone = !!checked[q.id];
    const canReroll = !isDone && rerollsLeft > 0;
    return `<div class="life-quest-item ${isDone ? 'checked' : ''}" onclick="toggleLifeQuest('${q.id}')">
      <div class="life-quest-check">${isDone ? '✅' : ''}</div>
      <div class="lq-content">
        <div class="lq-title">${q.icon} ${q.title}</div>
        <div class="lq-desc">${q.desc}</div>
        ${catTag(q.cat)}
      </div>
      <div class="lq-reward">${q.reward}</div>
      <button class="lq-reroll" onclick="rerollLifeQuest('${q.id}', event)" ${canReroll ? '' : 'disabled'} title="Заменить квест">🔄</button>
    </div>`;
  }).join('') +
    `<div class="lq-reroll-counter">🎲 Замен: ${rerollsLeft}/${totalRerolls}${bonusRerolls > 0 ? ` <span style="color:var(--gold)">(+${bonusRerolls} бонус)</span>` : ''}${shopExtra > 0 ? ` <span style="color:var(--purple)">(+${shopExtra} магазин)</span>` : ''}</div>` +
    (doneCount === quests.length && quests.length > 0
    ? '<div style="text-align:center;padding:10px;font-size:14px;color:var(--green);font-weight:700">🏆 ВСЕ ЗАДАНИЯ ВЫПОЛНЕНЫ! 🎉</div>'
    : `<div style="text-align:center;padding:6px;font-size:11px;color:var(--text-dim)">${doneCount}/${quests.length} выполнено · обновляются каждый день</div>`);
}

