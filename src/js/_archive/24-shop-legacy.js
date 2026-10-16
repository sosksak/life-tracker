// АРХИВ (не собирается). renderShop() из 24-theme.js до v9.21 — теперь src/svelte/shop/.
function renderShop() {
  const xpData = getLifeXP();
  const balance = xpData.total;
  const purchases = getShopPurchases();

  document.getElementById('shopXpBalance').textContent = balance;

  const container = document.getElementById('shopGrid');
  const categories = { boost: '⚡ Усиления', cosmetic: '🎨 Статусы', reward: '🎁 Награды', theme: '🎨 Темы' };
  let html = '';

  for (const [catKey, catName] of Object.entries(categories)) {
    const items = SHOP_ITEMS.filter(i => i.cat === catKey);
    html += `<div class="shop-category-title">${catName}</div>`;

    for (const item of items) {
      const owned = !item.consumable && purchases[item.id];
      const canAfford = balance >= item.price;
      const activeTheme = uGetRaw('lt_active_theme');
      const isActiveTheme = item.cat === 'theme' && activeTheme === item.id;
      const itemClass = owned ? 'owned' : (!canAfford ? 'locked' : '');

      let btnHtml;
      if (item.cat === 'theme' && owned) {
        if (isActiveTheme) {
          btnHtml = `<button class="shop-item-price bought" onclick="resetTheme();renderShop()" style="font-size:11px">🔄 Сброс</button>`;
        } else {
          btnHtml = `<button class="shop-item-price buy" onclick="applyTheme('${item.id}');uSetRaw('lt_active_theme','${item.id}');schedulePushProgress();renderShop()" style="font-size:11px">🎨 Надеть</button>`;
        }
      } else {
        const btnClass = owned ? 'bought' : (canAfford ? 'buy' : 'expensive');
        const btnText = owned ? '✅' : `${item.price} XP`;
        const btnDisabled = owned || !canAfford ? 'pointer-events:none' : '';
        btnHtml = `<button class="shop-item-price ${btnClass}" onclick="shopBuyItem('${item.id}')" style="${btnDisabled}">${btnText}</button>`;
      }

      html += `<div class="shop-item ${itemClass}">
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-info">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        ${btnHtml}
      </div>`;
    }
  }

  container.innerHTML = html;
}
