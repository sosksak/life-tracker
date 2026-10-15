<script>
  // «🏅 ДОСТИЖЕНИЯ» (.achievements, #achGrid) вкладки «Стата». Разметка 1:1 с бывшей
  // src/html/52-tab-stats.html + блок Achievements из render() (28-render-goal-chart.js).
  // Таблица ACHIEVEMENTS и checkNewAchievements() (оверлей «новое достижение») остались в легаси.
  import { stats, computeAchievements } from './store.svelte.js';
</script>

<div class="achievements">
  <h3>🏅 ДОСТИЖЕНИЯ</h3>
  <div class="ach-grid" id="achGrid">{#key stats.achV}{#each computeAchievements() as a}<div class="ach-item {a.unlocked ? 'unlocked' : 'locked'}"><div class="ach-icon">{a.icon}</div><div class="ach-name">{a.name}</div></div>{/each}{/key}</div>
</div>
