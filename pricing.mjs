export const cents = value => Math.round((Number(value) || 0) * 100);
export const money = amount => '¥' + (amount / 100).toFixed(2);
export const usageRates = { personal: 1, commercial: 2, buyout: 3 };
export const rushRates = { normal: 1, days: 2, day: 2.5 };

export function quote(items, order) {
  const groups = new Set();
  let pieces = 0;
  const lines = items.map(item => {
    const group = item.group.trim();
    const quantity = Number(item.quantity);
    if (quantity > 0) {
      if (group) groups.add(group);
      else pieces += quantity;
    }
    const base = cents(item.price) * quantity;
    const extras = item.extras.map(extra => {
      const waived = order.usage === 'buyout' && order.waiveCraft && extra.craft;
      return { ...extra, waived, amount: waived ? 0 : cents(extra.price) * Number(extra.quantity ?? 1) };
    });
    const amount = extras.reduce((sum, extra) => sum + extra.amount, base);
    return { ...item, extras, amount };
  });
  pieces += groups.size;
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const usage = usageRates[order.usage] ?? cents(order.multiplier) / 100;
  const rush = rushRates[order.rush];
  const visibility = order.visibility === 'private' && order.usage === 'personal' ? 1.5 : 1;
  const setEligible = order.usage === 'commercial' || order.usage === 'buyout';
  const discount = setEligible && pieces > 5 ? (pieces > 8 ? 0.8 : 0.9) : 1;
  const factor = Math.round(usage * rush * visibility * discount * 100000);
  const total = Math.round(subtotal * factor / 100000);
  return { lines, subtotal, usage, rush, visibility, pieces, discount, total };
}
