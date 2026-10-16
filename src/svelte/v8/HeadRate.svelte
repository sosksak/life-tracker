<script>
  // Чип темпа в шапке (#v8HeadRate, бывший headRate() из 60-v8.js). Хост в #headerIdent создаёт
  // и убирает main.js ровно тогда, когда легаси создавал/удалял кнопку (есть смена / нет).
  // onclick — свойство, как раньше (chip.onclick = () => switchTab('live')).
  import { v8 } from './store.svelte.js';
  const W = () => window;
</script>

{#if v8.head}
  <button id="v8HeadRate" class="v8-head-rate" class:brk={v8.head.brk} onclick={() => W().switchTab('live')}><i></i>{v8.head.text}</button>
{/if}
