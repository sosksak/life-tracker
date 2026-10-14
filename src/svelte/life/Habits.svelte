<script>
  // Привычки — вкладка «Жизнь» (бывший render() в 41-v6-habits.js).
  //
  // ⚠️ ЭМОДЗИ ВСЕГДА ВНУТРИ СВОЕГО ЭЛЕМЕНТА, НИКОГДА В ОДНОМ ТЕКСТЕ С ДАННЫМИ.
  // 96-icon-engine.js заменяет эмодзи на <svg> через replaceChild, то есть
  // ВЫБРАСЫВАЕТ текстовый узел. Если в этом узле было реактивное значение,
  // Svelte продолжает писать в открепившийся узел и текст залипает навсегда;
  // {#key} тут не спасает — наоборот, Svelte не находит подменённые узлы и
  // старое содержимое накапливается («Норма Норма Критично мало»).
  // Рабочее правило: эмодзи кладём в <span>, которым владеет Svelte. Движок
  // меняет только НАЧИНКУ этого span, а сам span Svelte создаёт и удаляет сам,
  // поэтому {#if}/{#each}/{#key} работают штатно. Реактивный текст рядом живёт
  // отдельным узлом без эмодзи — движок его вообще не трогает.
  // (Легаси проблемы не знал: он каждый раз пересобирал innerHTML целиком.)
  // Разметка 1:1 с прежним innerHTML: классы hab-* держат и CSS, и две системы
  // раскладки — V93 (скрыть/переставить карточку верхнего уровня по её первому
  // классу: hab-summary, hab-list, hab-inactive-section, hab-add-row,
  // hab-analytics) и V994 (подвкладка определяется регуляркой /\bhab-/).
  // Поэтому корневые div'ы остаются прямыми детьми #habitsContent, а первый
  // класс каждого менять нельзя.
  import {
    life, CATEGORIES, getTodayProgress, getStreak, getCompletionRate,
    miniHeat, isChecked, toggle, addHabit, removeHabit, toggleActive,
    habitAnalytics,
  } from './store.svelte.js';
  import { legacy } from '../lib/legacy.js';

  const active = $derived(life.habits.filter(h => h.active));
  const inactive = $derived(life.habits.filter(h => !h.active));
  const progress = $derived(getTodayProgress());
  const pct = $derived(progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0);

  // Аналитика — 30 дней × все привычки. Если карточка скрыта раскладкой,
  // не считаем вовсе (так же, как легаси пропускал блок через _hid()).
  const analytics = $derived.by(() => {
    life.version; // зависимость: HABITS.render() из V93 после «вернуть карточку»
    if (active.length === 0 || legacy.cardHidden('lifeContent', 'hab-analytics')) return null;
    return habitAnalytics();
  });
</script>

<div class="hab-summary">
  <div class="hab-summary-left">
    <div class="hab-summary-title">📋 Привычки на сегодня</div>
    <div class="hab-summary-count">{progress.done} из {progress.total}</div>
  </div>
  <div class="hab-summary-ring" style="--pct:{pct}">
    <span>{pct}%</span>
  </div>
</div>

{#if active.length > 0}
  <div class="hab-list">
    {#each active as h (h.id)}
      {@const checked = isChecked(h.id)}
      {@const streak = getStreak(h.id)}
      {@const cat = CATEGORIES[h.category] || CATEGORIES.productivity}
      <div class="hab-item" class:hab-checked={checked} data-id={h.id}>
        <button class="hab-check" onclick={() => toggle(h.id)}>
          {#if checked}<span>✅</span>{:else}<span>⬜</span>{/if}
        </button>
        <div class="hab-info">
          <div class="hab-name"><span>{h.icon}</span> {h.name}</div>
          <div class="hab-meta">
            <span class="hab-cat" style="color:{cat.color}"><span>{cat.icon}</span> {cat.name}</span>
            {#if streak > 0}<span class="hab-streak"><span>📈</span> {streak} дн.</span>{/if}
            <span class="hab-rate">{getCompletionRate(h.id)}% за 30д</span>
          </div>
          <div class="hab-mini-heat">
            {#each miniHeat(h.id) as d}
              <span class="hab-dot" class:done={d.done} title={d.date}></span>
            {/each}
          </div>
        </div>
        <button class="hab-menu-btn" onclick={() => removeHabit(h.id)} title="Удалить">✕</button>
      </div>
    {/each}
  </div>
{/if}

{#if inactive.length > 0}
  <details class="hab-inactive-section">
    <summary class="hab-section-title"><span>📁</span> Неактивные ({inactive.length})</summary>
    <div class="hab-list hab-inactive-list">
      {#each inactive as h (h.id)}
        <div class="hab-item hab-inactive">
          <span class="hab-icon">{h.icon}</span>
          <span class="hab-name-sm">{h.name}</span>
          <button class="hab-activate-btn" onclick={() => toggleActive(h.id)}>Включить</button>
        </div>
      {/each}
    </div>
  </details>
{/if}

<div class="hab-add-row">
  <button class="hab-add-btn" onclick={addHabit}>＋ Добавить привычку</button>
</div>

{#if analytics}
  <div class="hab-analytics">
    <div class="hab-section-title">📊 Аналитика за 30 дней</div>
    <div class="hab-analytics-grid">
      {#if analytics.best}
        <div class="hab-analytic-card">
          <div class="hab-analytic-label">Лучшая привычка</div>
          <div class="hab-analytic-val">{#key analytics.best.habit.id}<span>{analytics.best.habit.icon}</span>{/key} {analytics.best.habit.name}</div>
          <div class="hab-analytic-sub">{analytics.best.rate}% выполнения</div>
        </div>
      {/if}
      {#if analytics.worst}
        <div class="hab-analytic-card">
          <div class="hab-analytic-label">Требует внимания</div>
          <div class="hab-analytic-val">{#key analytics.worst.habit.id}<span>{analytics.worst.habit.icon}</span>{/key} {analytics.worst.habit.name}</div>
          <div class="hab-analytic-sub">{analytics.worst.rate}% выполнения</div>
        </div>
      {/if}
    </div>
  </div>
{/if}
