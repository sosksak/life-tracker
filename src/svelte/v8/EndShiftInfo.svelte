<script>
  // Инфо-блок модалки завершения смены (#endShiftInfo): «⏱ Чистая работа … ☕ Перерывов …».
  // Бывший innerHTML в endShift() (21-active-shift.js). Под {#key} — пересобирается целиком при
  // каждом открытии, как innerHTML (эмодзи подменяет движок иконок — обновлять узлы на месте нельзя).
  import { esi } from './store.svelte.js';
</script>

<div class="modal-info" id="endShiftInfo">{#key esi.info}{#if esi.info}⏱ Чистая работа: <b>{esi.info.hours} ч</b><br>🕐 Всего на смене: {esi.info.total}<br>{esi.info.breaks}{/if}{/key}</div>
