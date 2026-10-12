// ====== THEME SYSTEM ======
function applyTheme(themeId) {
  // Магазинные темы = светлые палитры дизайн-системы (хедер/акценты), фон всегда светлый
  const themes = {
    theme_neon:     { primary:'#5B21B6', light:'#7C3AED', dark:'#3B0764', accent:'#D946EF', soft:'#FAF5FF', soft2:'#F3E8FF' },
    theme_ocean:    { primary:'#0C4A6E', light:'#0369A1', dark:'#082F49', accent:'#06B6D4', soft:'#ECFEFF', soft2:'#CFFAFE' },
    theme_fire:     { primary:'#7C2D12', light:'#C2410C', dark:'#431407', accent:'#F97316', soft:'#FFF7ED', soft2:'#FFEDD5' },
    theme_forest:   { primary:'#14532D', light:'#15803D', dark:'#052E16', accent:'#22C55E', soft:'#F0FDF4', soft2:'#DCFCE7' },
    theme_sakura:   { primary:'#9D174D', light:'#DB2777', dark:'#500724', accent:'#F472B6', soft:'#FDF2F8', soft2:'#FCE7F3' },
    theme_cyber:    { primary:'#1F2937', light:'#374151', dark:'#111827', accent:'#10B981', soft:'#ECFDF5', soft2:'#D1FAE5' },
    theme_royal:    { primary:'#4C1D95', light:'#6D28D9', dark:'#2E1065', accent:'#D4A017', soft:'#FFFBEB', soft2:'#FEF3C7' },
    theme_midnight: { primary:'#1E1B4B', light:'#3730A3', dark:'#0F0E2E', accent:'#818CF8', soft:'#EEF2FF', soft2:'#E0E7FF' },
    theme_sunset:   { primary:'#9A3412', light:'#C2410C', dark:'#7C2D12', accent:'#A855F7', soft:'#FFF7ED', soft2:'#FFEDD5' },
    theme_hacker:   { primary:'#052E16', light:'#166534', dark:'#021F0F', accent:'#4ADE80', soft:'#F0FDF4', soft2:'#DCFCE7' },
  };
  const t = themes[themeId];
  if (!t) return;
  const r = document.documentElement.style;
  ['--gold','--gold-dark','--purple','--cyan','--bg-dark'].forEach(k => r.removeProperty(k));
  document.body.style.background = '';
  r.setProperty('--primary', t.primary);
  r.setProperty('--primary-light', t.light);
  r.setProperty('--primary-dark', t.dark);
  r.setProperty('--bg-sidebar', t.primary);
  r.setProperty('--accent', t.accent);
  r.setProperty('--wt-c', t.accent);
  r.setProperty('--accent-hover', t.light);
  r.setProperty('--accent-soft', t.soft);
  r.setProperty('--accent-soft-2', t.soft2);
  r.setProperty('--hero', 'linear-gradient(135deg, ' + t.primary + ' 0%, ' + t.light + ' 100%)');
  r.setProperty('--wt-c', t.accent);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.primary);
}

function resetTheme() {
  const r = document.documentElement.style;
  r.removeProperty('--gold'); r.removeProperty('--gold-dark');
  r.removeProperty('--purple'); r.removeProperty('--cyan');
  r.removeProperty('--bg-dark');
  document.body.style.background = '';
  uRemove('lt_active_theme');
  if (typeof applyWorkTheme === 'function' && typeof getWorkType === 'function') applyWorkTheme(getWorkType());
  markLocalChange();
  schedulePushProgress();
}

function loadSavedTheme() {
  const saved = uGetRaw('lt_active_theme');
  if (saved) applyTheme(saved);
}

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

