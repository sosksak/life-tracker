<script>
  // Здоровье — вкладка «Жизнь» (бывший render() в 42-v6-health.js).
  //
  // ⚠️ ЭМОДЗИ ВСЕГДА ВНУТРИ СВОЕГО <span>, НИКОГДА В ОДНОМ ТЕКСТЕ С ДАННЫМИ:
  // 96-icon-engine.js подменяет эмодзи на <svg> через replaceChild и выбрасывает
  // текстовый узел, в который Svelte пишет обновления (подробнее — в Habits.svelte).
  // Разметка 1:1 с прежним innerHTML: шесть карточек .health-section идут
  // прямыми детьми #healthContent. V93 адресует их по позиции
  // ('health-section:6' — средние за неделю, скрыта по умолчанию), V994 —
  // по регулярке /\bhealth-/, так что ни порядок, ни первый класс не меняем.
  import {
    getDayData, getWeekStats, getWeightHistory, moodWeek, MOODS,
    setMood, setWater, setSleep, setWeight, setExercise,
  } from './store.svelte.js';

  const d = $derived(getDayData());
  const week = $derived(getWeekStats());
  const weightHist = $derived(getWeightHistory());

  // Тренд веса: разница между первой и последней записью за 30 дней
  const weightTrend = $derived.by(() => {
    if (weightHist.length >= 2) {
      const diff = weightHist[weightHist.length - 1].weight - weightHist[0].weight;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} кг за ${weightHist.length} записей`;
    }
    if (weightHist.length === 1 && !d.weight) return `последний: ${weightHist[0].weight} кг`;
    return '';
  });

  // Иконка отдельно от текста: движок иконок свапает только <span> с эмодзи,
  // а подпись остаётся чистым реактивным узлом (см. предупреждение выше).
  const sleepQuality = (h) => (h >= 7 ? { icon: '✅', text: 'Норма' }
    : h >= 5 ? { icon: '⚠️', text: 'Мало' }
    : { icon: '❌', text: 'Критично мало' });

  // Тап по стакану: по заполненному — снять его (откат до i), по пустому — налить до i+1
  const glassTarget = (i) => (i + 1 <= d.water ? i : i + 1);
</script>

<div class="health-section">
  <div class="health-section-title">😊 Настроение</div>
  <div class="health-mood-picker">
    {#each MOODS as m (m.id)}
      <button class="health-mood-btn" class:selected={d.mood === m.id}
              onclick={() => setMood(m.id)} style="--mood-color:{m.color}">
        <span class="health-mood-emoji"><span>{m.icon}</span></span>
        <span class="health-mood-label">{m.label}</span>
      </button>
    {/each}
  </div>
  <div class="health-mood-week">
    {#each moodWeek() as day}
      <div class="health-mood-day">
        <span class="health-mood-icon">{#if day.has}{#key day.icon}<span>{day.icon}</span>{/key}{:else}·{/if}</span>
        <span class="health-mood-lbl">{day.label}</span>
      </div>
    {/each}
  </div>
</div>

<div class="health-section">
  <div class="health-section-title">💧 Вода</div>
  <div class="health-water-track">
    <div class="health-water-glasses">
      {#each Array(8) as _, i}
        <button class="health-glass" class:filled={i < d.water}
                onclick={() => setWater(glassTarget(i))}>💧</button>
      {/each}
    </div>
    <div class="health-water-label">{d.water}/8 стаканов</div>
  </div>
</div>

<div class="health-section">
  <div class="health-section-title">😴 Сон</div>
  <div class="health-input-row">
    <input type="number" class="health-input" id="healthSleepInput" inputmode="decimal"
           value={d.sleep || ''} min="0" max="24" step="0.5" placeholder="0"
           onchange={(e) => setSleep(e.currentTarget.value)}>
    <span class="health-input-unit">ч</span>
    {#if d.sleep > 0}
      {@const q = sleepQuality(d.sleep)}
      <span class="health-sleep-quality">{#key q.icon}<span>{q.icon}</span>{/key} {q.text}</span>
    {:else}
      <div class="health-exercise-btns">
        <button onclick={() => setSleep(6)}>6</button>
        <button onclick={() => setSleep(7)}>7</button>
        <button onclick={() => setSleep(8)}>8</button>
      </div>
    {/if}
  </div>
</div>

<div class="health-section">
  <div class="health-section-title">🏃 Активность</div>
  <div class="health-input-row">
    <input type="number" class="health-input" id="healthExerciseInput" inputmode="numeric"
           value={d.exercise || ''} min="0" max="600" step="5" placeholder="0"
           onchange={(e) => setExercise(e.currentTarget.value)}>
    <span class="health-input-unit">мин</span>
    <div class="health-exercise-btns">
      <button onclick={() => setExercise((d.exercise || 0) + 15)}>+15</button>
      <button onclick={() => setExercise((d.exercise || 0) + 30)}>+30</button>
      <button onclick={() => setExercise((d.exercise || 0) + 60)}>+60</button>
    </div>
  </div>
</div>

<div class="health-section">
  <div class="health-section-title">⚖️ Вес</div>
  <div class="health-input-row">
    <input type="number" class="health-input" id="healthWeightInput" inputmode="decimal"
           value={d.weight || ''} min="30" max="300" step="0.1"
           placeholder={weightHist.length ? weightHist[weightHist.length - 1].weight : '0'}
           onchange={(e) => setWeight(e.currentTarget.value)}>
    <span class="health-input-unit">кг</span>
    {#if weightTrend}<span class="health-weight-trend">{weightTrend}</span>{/if}
  </div>
</div>

<div class="health-section">
  <div class="health-section-title">📊 Средние за неделю</div>
  <div class="health-week-grid">
    <div class="health-week-card">
      <div class="health-week-val">{week.avgWater}</div>
      <div class="health-week-lbl">💧 стаканов/день</div>
    </div>
    <div class="health-week-card">
      <div class="health-week-val">{week.avgSleep > 0 ? week.avgSleep + 'ч' : '—'}</div>
      <div class="health-week-lbl">😴 сон</div>
    </div>
    <div class="health-week-card">
      <div class="health-week-val">{week.totalExercise}</div>
      <div class="health-week-lbl">🏃 мин активности</div>
    </div>
    <div class="health-week-card">
      <div class="health-week-val">{week.avgMood > 0 ? week.avgMood + '/5' : '—'}</div>
      <div class="health-week-lbl">😊 настроение</div>
    </div>
  </div>
</div>
