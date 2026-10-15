<script>
  // «📓 Дневник общения» (#diarySection) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + renderDiary() из 30-global-update-v5.js.
  // Модалка (#diaryModal), getDiary/saveDiary/setDiaryStar/saveDiaryEntry остались в легаси —
  // после сохранения легаси зовёт renderDiary() → STATS.renderDiary().
  // Звёзды — CSS-спаны .rs (не эмодзи: движок иконок подменял ⭐ и ☆ одним SVG).
  import { stats, computeDiary } from './store.svelte.js';
  const W = () => window;
</script>

<div class="diary-section" id="diarySection">
  <div class="diary-title">📓 Дневник общения</div>
  {#key stats.diaryV}
    {@const d = computeDiary()}
  <div class="diary-stats-grid" id="diaryStatsGrid">
    <div class="diary-stat-card"><div class="diary-stat-val">{d.total}</div><div class="diary-stat-lbl">всего записей</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">{d.thisWeek}</div><div class="diary-stat-lbl">за неделю</div></div>
    <div class="diary-stat-card"><div class="diary-stat-val">{d.avgRating}</div><div class="diary-stat-lbl">ср. оценка</div></div>
  </div>
  <div id="diaryList">
    {#if !d.list.length}<div style="text-align:center;color:var(--text-dim);font-size:12px;padding:16px;">Пока пусто — добавь первую запись!</div>{:else}
    {#each d.list as e}<div class="diary-card">
      <div class="diary-card-top"><span class="diary-place">{e.place}</span><span class="diary-date">{e.date}</span></div>
      {#if e.desc}<div class="diary-desc">{e.desc}</div>{/if}
      <div class="diary-rating"><span class="rate-stars no-ico" aria-label="{e.stars} из 5">{#each [0, 1, 2, 3, 4] as i}<span class="rs{i < e.stars ? ' on' : ''}"></span>{/each}</span></div>
      {#if e.lesson}<div class="diary-lesson">💡 {e.lesson}</div>{/if}
    </div>{/each}
    {/if}
  </div>
  {/key}
  <button class="diary-add-btn" onclick={() => W().openDiaryModal()}>+ Новая запись</button>
</div>
