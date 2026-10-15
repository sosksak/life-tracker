<script>
  // «Серия смен» (#streakBar) и «Уровень» (.level-section) вкладки «Стата».
  // Разметка 1:1 с бывшей src/html/52-tab-stats.html + блок Level/Streak из render()
  // (28-render-goal-chart.js). Два корня верхнего уровня в одном хосте (display:contents) —
  // для V93/V994 они остаются прямыми карточками вкладки.
  // Тексты обновляются на месте (как раньше textContent): v97-fx следит за #xpText
  // через MutationObserver и вешает на него .fx-pulse — элемент должен жить, а не пересоздаваться.
  // Иконка уровня — под {#key}: движок иконок подменяет её текстовый узел на <svg>.
  import { stats, computeLevel, computeStreak } from './store.svelte.js';
  const streak = $derived((stats.v, computeStreak()));
  const lvl = $derived((stats.v, computeLevel()));
</script>

<div class="streak-bar" id="streakBar" style:display={streak > 0 ? 'flex' : 'none'}>
  <div class="streak-icon">📈</div>
  <div class="streak-text"><span id="streakCount">{streak > 0 ? streak : stats.lastStreak}</span> дней подряд в плане!</div>
</div>

<div class="level-section">
  <div class="level-header">
    <div class="level-badge">
      {#key lvl.icon}<div class="icon" id="levelIcon">{lvl.icon}</div>{/key}
      <div class="info">
        <div class="lvl" id="levelName">{lvl.name}</div>
        <div class="title" id="levelTitle">{lvl.title}</div>
      </div>
    </div>
    <div class="level-xp-text" id="xpText">{lvl.xpText}</div>
  </div>
  <div class="xp-bar"><div class="xp-fill" id="xpFill" style="width:{lvl.fill}"></div></div>
</div>
