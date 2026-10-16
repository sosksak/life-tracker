<script>
  // Магазин XP (#contentShop → .shop-section). Разметка 1:1 с бывшей src/html/52-tab-stats.html
  // + renderShop() из 24-theme.js. Кнопки — inline onclick (как раньше): shopBuyItem/applyTheme/
  // resetTheme/renderShop — легаси (поздняя привязка), v97-fx ловит тап по [onclick]/.shop-item.
  // Сетка целиком под {#key} — пересобирается на каждый render, как innerHTML (движок иконок
  // подменяет текстовые узлы с эмодзи на <svg>, обновлять их на месте нельзя).
  // #shopXpBalance — простой текст без эмодзи, обновляется на месте (v97-fx следит за ним через
  // MutationObserver characterData/childList — пульс при изменении, как раньше).
  import { shop, computeShop } from './store.svelte.js';
  const s = $derived(computeShop());
  function oc(node, v) { node.setAttribute('onclick', v); }
</script>

<div class="shop-section">
  <div class="shop-header">
    <div class="shop-balance">
      <div class="shop-balance-label">⭐ Баланс баллов</div>
      <div class="shop-balance-val"><span id="shopXpBalance">{s.balance}</span> <span class="xp-unit">XP</span></div>
    </div>
  </div>
  <div class="shop-grid" id="shopGrid">{#key shop.v}{#each s.groups as g}<div class="shop-category-title">{g.title}</div>{#each g.items as it}<div class="shop-item {it.cls}">
        <div class="shop-item-icon">{it.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">{it.name}</div>
          <div class="shop-item-desc">{it.desc}</div>
        </div>
        <button class="shop-item-price {it.btn.cls}" use:oc={it.btn.oc} style={it.btn.style || null}>{it.btn.text}</button>
      </div>{/each}{/each}{/key}</div>
</div>
