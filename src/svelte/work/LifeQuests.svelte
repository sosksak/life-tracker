<script>
  // «📌 ЛИЧНЫЕ ЗАДАЧИ» (#lifeQuestsPanel). Разметка 1:1 с бывшими
  // src/html/30-tab-live.html + 40-modal-add-shift.html (каркас), renderLifeStats() /
  // renderCategoryHub() / catTag() / renderLifeQuests() из 22-life-quests.js.
  //
  // Оба внутренних блока (#lifeStatsPanel и #lifeQuestList) пересобираются целиком
  // под {#key} при каждом renderLifeStats()/renderLifeQuests() — ровно как innerHTML
  // в легаси. Так движок иконок (96-icon-engine.js), подменяющий текстовые узлы с
  // эмодзи на <svg>, никогда не встречает узел, который Svelte потом обновит на месте,
  // а MutationObserver-локализатор v7 видит новые узлы и правит термины как раньше.
  //
  // Сама панель живёт на вкладке «Работа», но V7.moveLifePanels() переносит её
  // в #lifeContent — поэтому корень #lifeQuestsPanel один и не перемонтируется.
  //
  // Полоски XP: как в легаси, стартуют с width:0% и доводятся до data-target в
  // следующем кадре (иначе inline-width применяется сразу и анимации не видно).
  import { quests } from './quests.svelte.js';
  const W = () => window;
  const st = $derived(quests.stats);
  const lq = $derived(quests.life);

  function animFills(container) {
    requestAnimationFrame(() => {
      const xpFill = container.querySelector('.lq-xp-fill');
      if (xpFill) xpFill.style.width = xpFill.dataset.target + '%';
      container.querySelectorAll('.lq-stat-fill').forEach(el => { el.style.width = el.dataset.target + '%'; });
    });
  }
  const BTN = {
    done:  { cls: 'done',  act: () => W().openCategoryHub(),                 t: '✓ Направление на завтра выбрано', sub: 'изменить ›' },
    free:  { cls: 'free',  act: () => W().openCategoryPicker(true),          t: '🎁 Выбрать направление на завтра', sub: 'бесплатно · 1 раз в неделю' },
    bonus: { cls: 'bonus', act: () => W().openCategoryPicker(false),         t: '🏅 Выбрать направление на завтра', sub: 'награда за задачу смены' },
    paid:  { cls: 'paid',  act: () => W().openCategoryPicker(false, 'paid'), t: '🎯 Выбрать направление на завтра', sub: '150 XP · или бесплатно с понедельника' },
  };
</script>

<div class="life-quests" id="lifeQuestsPanel">
  <h3>📌 ЛИЧНЫЕ ЗАДАЧИ</h3>
  <div id="lifeStatsPanel" class="life-stats-panel">
    {#if st}
      {#key st.v}
        <div class="lq-hero" use:animFills>
          <div class="lq-badge" id="lqBadge" style="--p:{st.p}">
            <span class="lq-badge-inner">
              <span class="lq-badge-icon">{st.icon}</span>
              <span class="lq-badge-lvl">УР. {st.lvl}</span>
            </span>
          </div>
          <div class="lq-hero-main">
            <div class="lq-rank-row">
              <span class="lq-rank-name">{st.name}</span>
              {#if st.boost}<span class="lq-boost-badge">x{st.boost} XP</span>{/if}
            </div>
            <div class="lq-next-rank">{#if st.next}до <b>{st.next.name}</b> — ещё {st.next.left} XP{:else}максимальный уровень достигнут 🌟{/if}</div>
            <div class="lq-xp-track">
              <div class="lq-xp-fill" data-target={st.progressPct} style="width:0%"></div>
              <div class="lq-xp-ticks"></div>
            </div>
            <div class="lq-xp-caption">
              <span><span class="lq-xp-now">{st.xpNow}</span>{st.xpNeed ? ' / ' + st.xpNeed + ' XP' : ' XP'}</span>
              <span class="lq-total-chip">✨ {st.total}</span>
            </div>
          </div>
        </div>
        <div class="lq-stats-grid">
          <div class="lq-mini-stat">
            <span class="lq-ms-ico">⚔️</span>
            <span class="lq-ms-val">{st.questsDone}</span>
            <span class="lq-ms-lbl">заданий</span>
          </div>
          <div class="lq-mini-stat">
            <span class="lq-ms-ico">🔥</span>
            <span class="lq-ms-val">{st.daysDone}</span>
            <span class="lq-ms-lbl">дней</span>
          </div>
          <div class="lq-mini-stat">
            <span class="lq-ms-ico">📈</span>
            <span class="lq-ms-val">{st.avg}</span>
            <span class="lq-ms-lbl">XP/квест</span>
          </div>
        </div>
        <div class="lq-cat-title"><span>Компетенции</span></div>
        <div class="lq-cat-bars" use:animFills>
          {#each st.cats as c (c.key)}
            <div class="lq-stat-row {c.cls}">
              <span class="lq-stat-icon">{c.icon}</span>
              <span class="lq-stat-name">{c.name}</span>
              <div class="lq-stat-bar"><div class="lq-stat-fill" data-target={c.pct} style="width:0%;background:{c.color};color:{c.color}"></div></div>
              <span class="lq-stat-val">{c.xp}</span>
            </div>
          {/each}
        </div>
      {/key}
    {/if}
  </div>
  <div id="lifeQuestList">
    {#if lq}
      {#key lq}
        {#if lq.hub}
          {@const b = BTN[lq.hub.btn]}
          <div class="cat-hub" id="catHub">
            <div class="cat-hub-head">
              <div class="cat-hub-title">🎯 Направление заданий</div>
              <button class="cat-hub-help" onclick={() => W().showCategoryHelp()} title="Как это работает">?</button>
            </div>
            <div class="cat-hub-row">
              {#each lq.hub.cards as c}
                {#if c.name}
                  <div class="cat-hub-card"><div class="lbl">{c.lbl}</div><div class="val" style="color:{c.tc}"><span class="cat-dot" style="background:{c.color}"></span><span class="tx">{c.name}</span></div></div>
                {:else}
                  <div class="cat-hub-card is-random"><div class="lbl">{c.lbl}</div><div class="val">🎲 Случайные</div></div>
                {/if}
              {/each}
            </div>
            <button class="cat-hub-btn {b.cls}" onclick={b.act}><span>{b.t}</span><span class="sub">{b.sub}</span></button>
            <div class="cat-hub-legend">
              {#each lq.hub.legend as c (c.k)}
                <button class="cat-chip {c.focus ? 'is-focus' : ''}" style="color:{c.tc};border-color:{c.tc}55" onclick={() => W().openCategoryHub()} title={c.name}>{c.icon} {c.name}<span class="n">{c.n}</span></button>
              {/each}
            </div>
          </div>
        {/if}
        {#each lq.items as q (q.id)}
          <div class="life-quest-item {q.done ? 'checked' : ''}" onclick={() => W().toggleLifeQuest(q.id)}>
            <div class="life-quest-check">{q.done ? '✅' : ''}</div>
            <div class="lq-content">
              <div class="lq-title">{q.icon} {q.title}</div>
              <div class="lq-desc">{q.desc}</div>
              {#if q.tag}<span class="lq-cat-tag" style="color:{q.tag.tc};border-color:{q.tag.tc}33;background:{q.tag.tc}0F"><span class="cat-dot" style="background:{q.tag.color}"></span>{q.tag.name}</span>{/if}
            </div>
            <div class="lq-reward">{q.reward}</div>
            <button class="lq-reroll" onclick={(e) => W().rerollLifeQuest(q.id, e)} disabled={!q.canReroll} title="Заменить квест">🔄</button>
          </div>
        {/each}
        <div class="lq-reroll-counter">🎲 Замен: {lq.left}/{lq.total}{#if lq.bonus > 0}{' '}<span style="color:var(--gold)">(+{lq.bonus} бонус)</span>{/if}{#if lq.shop > 0}{' '}<span style="color:var(--purple)">(+{lq.shop} магазин)</span>{/if}</div>
        {#if lq.allDone}
          <div style="text-align:center;padding:10px;font-size:14px;color:var(--green);font-weight:700">🏆 ВСЕ ЗАДАНИЯ ВЫПОЛНЕНЫ! 🎉</div>
        {:else}
          <div style="text-align:center;padding:6px;font-size:11px;color:var(--text-dim)">{lq.doneCount}/{lq.n} выполнено · обновляются каждый день</div>
        {/if}
      {/key}
    {/if}
  </div>
</div>
