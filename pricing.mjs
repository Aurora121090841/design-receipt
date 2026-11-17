export const cents = value => Math.round((Number(value) || 0) * 100);
export const money = amount => '¥' + (amount / 100).toFixed(2);
export const usageRates = { personal: 1, commercial: 2, buyout: 3, gift: 0 };
export const usageLabels = { personal: '个人自用', commercial: '商用', buyout: '买断', custom: '自定义', gift: '赠品' };
export const rushRates = { normal: 1, days: 2, day: 2.5 };

export function quote(items, order) {
  const groups = new Set();
  let pieces = 0;
  const lines = items.map(item => {
    const usage = item.usage || order.usage;
    const setEligible = usage === 'commercial' || usage === 'buyout';
    const group = item.group.trim();
    const quantity = Number(item.quantity);
    if (setEligible && quantity > 0) {
      if (group) groups.add(group);
      else pieces += 1;
    }
    const base = usage === 'gift' ? 0 : cents(item.price) * quantity;
    const extras = item.extras.map(extra => {
      const waived = usage === 'gift' || (usage === 'buyout' && order.waiveCraft && extra.craft);
      return { ...extra, waived, amount: waived ? 0 : cents(extra.price) * Number(extra.quantity ?? 1) };
    });
    const amount = extras.reduce((sum, extra) => sum + extra.amount, base);
    return { ...item, usage, setEligible, extras, amount };
  });
  pieces += groups.size;
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const rush = rushRates[order.rush];
  const privacy = order.visibility === 'private' ? 0.5 : 0;
  const discount = pieces > 8 ? 0.8 : pieces > 5 ? 0.9 : 1;
  let running = 0;
  let total = 0;
  for (const line of lines) {
    line.rate = line.usage === 'gift' ? 0 : (usageRates[line.usage] ?? cents(order.multiplier) / 100) + privacy;
    line.discount = line.setEligible ? discount : 1;
    const factor = Math.round(line.rate * rush * line.discount * 100000);
    running += line.amount * factor / 100000;
    const nextTotal = Math.round(running + 1e-9);
    line.total = nextTotal - total;
    total = nextTotal;
  }
  return { lines, subtotal, rush, privacy, pieces, discount, total };
}
