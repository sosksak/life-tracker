<script>
  // Попап «🏆 ДОСТИЖЕНИЕ!» (.ach-unlock-overlay) — бывший showAchUnlock() из 30-global-update-v5.js.
  // Как раньше: несколько ачивок → несколько оверлеев друг над другом; тап или 3 с → opacity 0 → через 300 мс удаление.
  // Монтируется в #ach-host (display:contents) в конце body.
  import { rest, hideAch } from './store.svelte.js';
</script>

{#each rest.achs as a (a.key)}
  <div class="ach-unlock-overlay" style={a.hiding ? 'opacity: 0;' : ''} onclick={() => hideAch(a.key)}>
    <div class="ach-unlock-glow"></div>
    <div class="ach-unlock-icon">{a.icon}</div>
    <div class="ach-unlock-title">🏆 ДОСТИЖЕНИЕ!</div>
    <div class="ach-unlock-name">{a.name}</div>
  </div>
{/each}
