// SHOP — магазин XP (#contentShop). Данные (SHOP_ITEMS, покупки, Life XP, активная тема)
// остались в легаси; стор — счётчик `v`: SHOP.render() его увеличивает, computeShop()
// пересчитывается. Бывший renderShop() из src/js/24-theme.js (→ _archive/24-shop-legacy.js).
import { legacy } from '../lib/legacy.js';

export const shop = $state({ v: 0 });

const CATEGORIES = { boost: '⚡ Усиления', cosmetic: '🎨 Статусы', reward: '🎁 Награды', theme: '🎨 Темы' };

export function computeShop() {
  shop.v;
  const balance = legacy.lq.lifeXP().total;
  const purchases = legacy.shopPurchases();
  const activeTheme = legacy.getRaw('lt_active_theme');
  const all = legacy.shopItems();
  const groups = [];
  for (const [catKey, title] of Object.entries(CATEGORIES)) {
    const items = all.filter(i => i.cat === catKey).map(item => {
      const owned = !item.consumable && purchases[item.id];
      const canAfford = balance >= item.price;
      const isActiveTheme = item.cat === 'theme' && activeTheme === item.id;
      let btn;
      if (item.cat === 'theme' && owned) {
        btn = isActiveTheme
          ? { cls: 'bought', oc: 'resetTheme();renderShop()', style: 'font-size:11px', text: '🔄 Сброс' }
          : { cls: 'buy', oc: `applyTheme('${item.id}');uSetRaw('lt_active_theme','${item.id}');schedulePushProgress();renderShop()`, style: 'font-size:11px', text: '🎨 Надеть' };
      } else {
        btn = {
          cls: owned ? 'bought' : (canAfford ? 'buy' : 'expensive'),
          oc: `shopBuyItem('${item.id}')`,
          style: owned || !canAfford ? 'pointer-events:none' : '',
          text: owned ? '✅' : `${item.price} XP`,
        };
      }
      return { id: item.id, cls: owned ? 'owned' : (!canAfford ? 'locked' : ''), icon: item.icon, name: item.name, desc: item.desc, btn };
    });
    groups.push({ title, items });
  }
  return { balance, groups };
}
