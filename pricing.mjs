export const cents = value => Math.round((Number(value) || 0) * 100);
export const money = amount => '¥' + (amount / 100).toFixed(2);

export function quote(items, multiplier) {
  const groups = new Set();
  const lines = items.map(item => {
    const group = item.group.trim();
    const half = group !== '' && groups.has(group);
    if (group) groups.add(group);
    const base = Math.round(cents(item.price) * Number(item.quantity) / (half ? 2 : 1));
    const extras = item.extras.reduce((sum, extra) => sum + cents(extra.price), 0);
    return { ...item, half, base, amount: base + extras };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  return { lines, subtotal, total: Math.round(subtotal * cents(multiplier) / 100) };
}
