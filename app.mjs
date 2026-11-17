import { cents, money, quote } from './pricing.mjs';

const $ = id => document.getElementById(id);
const defaults = [
  ['派单卡', '30'], ['小卡', '30'], ['明信片', '40'], ['单插立牌', '50'],
  ['色纸', '50'], ['宣图', '80']
].map(([name, price]) => ({ name, price }));
const orderFields = ['client', 'deadline', 'note', 'usage', 'multiplier'];
const brandFields = ['title', 'designer'];
const key = 'design-receipt-v1';
const newOrder = () => ({
  code: crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase(),
  items: [], client: '', deadline: '', note: '', usage: 'personal', multiplier: '1'
});
let saved;
try {
  saved = JSON.parse(localStorage.getItem(key));
} catch {
  saved = null;
}
let catalog = saved?.catalog ?? defaults;
let customCatalog = saved?.customCatalog ?? false;
let order = saved?.order ?? newOrder();
let brand = saved?.brand ?? { title: '', designer: '', logo: '' };
let logoImage;
let logoRequest = 0;

function save() {
  try {
    localStorage.setItem(key, JSON.stringify({ catalog, customCatalog, order, brand }));
    return true;
  } catch {
    $('status').textContent = '浏览器存储不可用或已满，本次修改可能无法保留。';
    return false;
  }
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
function button(label, action, className = 'quiet') {
  const element = node('button', className, label);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}
function field(label, value, change, options = {}) {
  const wrapper = node('label', '', label);
  const input = node('input');
  Object.assign(input, options);
  input.value = value;
  if (change) input.addEventListener('input', () => {
    change(input.value);
    refresh();
    save();
  });
  wrapper.append(input);
  return wrapper;
}
const amountOptions = { type: 'number', min: 0, max: 999999, step: '0.01', inputMode: 'decimal', required: true };
const textOptions = { maxLength: 60, required: true };

function addItem(template = { name: '', price: '0' }) {
  order.items.push({ ...template, quantity: '1', group: '', note: '', extras: [] });
  renderItems();
  $('items').lastElementChild.querySelector('input').focus();
  save();
}
function renderCatalog() {
  $('price-hint').hidden = customCatalog;
  $('catalog').replaceChildren(...catalog.map(template => {
    const chip = button(template.name, () => addItem(template));
    chip.append(node('small', '', money(cents(template.price))));
    return chip;
  }));
}
function renderItems() {
  $('items').replaceChildren(...order.items.map((item, index) => {
    const card = node('article', 'item');
    const update = key => value => { item[key] = value; };
    const header = node('div', 'item-title');
    header.append(
      field('项目名称', item.name, update('name'), textOptions),
      field('单价（元）', item.price, update('price'), amountOptions),
      button('删除', () => {
        order.items.splice(index, 1);
        renderItems();
        save();
      })
    );
    const fields = node('div', 'fields');
    fields.append(
      field('数量', item.quantity, update('quantity'), { type: 'number', min: 1, max: 999, step: 1, required: true }),
      field('同模组', item.group, update('group'), { placeholder: '同模填相同组号', maxLength: 16 })
    );
    card.append(header, fields, field('项目备注', item.note, update('note'), { maxLength: 150, placeholder: '单面 / 双面、尺寸等' }));
    item.extras.forEach((extra, extraIndex) => {
      const row = node('div', 'item-title');
      row.append(
        field('加项名称', extra.name, value => { extra.name = value; }, { ...textOptions, placeholder: '烫色、改稿、衍生等' }),
        field('加项费用（元）', extra.price, value => { extra.price = value; }, amountOptions),
        button('移除', () => {
          item.extras.splice(extraIndex, 1);
          renderItems();
          save();
        })
      );
      card.append(row);
    });
    const footer = node('footer');
    footer.append(button('＋ 工艺 / 增项', () => {
      item.extras.push({ name: '', price: '0' });
      renderItems();
      $('items').children[index].querySelectorAll('.item-title:last-of-type input')[0]?.focus();
      save();
    }, 'add'), node('output'));
    card.append(footer);
    return card;
  }));
  refresh();
}
function syncFields() {
  for (const id of orderFields) $(id).value = order[id];
  for (const id of brandFields) $(id).value = brand[id];
  $('multiplier').readOnly = order.usage !== 'custom';
}
for (const id of [...orderFields, ...brandFields]) {
  $(id).addEventListener('input', () => {
    const target = brandFields.includes(id) ? brand : order;
    target[id] = $(id).value;
    if (id === 'usage') {
      if (order.usage === 'personal') order.multiplier = '1';
      if (order.usage === 'commercial') order.multiplier = '2';
      syncFields();
    }
    refresh();
    save();
  });
}
$('reset').onclick = () => {
  if (order.items.length || order.client || order.deadline || order.note) {
    if (!confirm('清空当前委托和项目，开始一张新小票？')) return;
  }
  order = newOrder();
  syncFields();
  renderItems();
  save();
  $('client').focus();
};
$('custom').onclick = () => addItem();

function priceRow(entry = { name: '', price: '' }) {
  const row = node('div', 'price-row');
  row.append(
    field('项目名称', entry.name, null, textOptions),
    field('单价（元）', entry.price, null, amountOptions),
    button('移除', () => row.remove())
  );
  $('price-rows').append(row);
  return row;
}
$('settings').onclick = () => {
  $('price-rows').replaceChildren();
  catalog.forEach(priceRow);
  $('price-status').textContent = '';
  $('price-dialog').showModal();
};
$('add-price').onclick = () => priceRow().querySelector('input').focus();
$('close').onclick = () => $('price-dialog').close();
$('price-form').onsubmit = event => {
  event.preventDefault();
  const next = [...$('price-rows').children].map(row => {
    const [name, price] = row.querySelectorAll('input');
    return { name: name.value.trim(), price: price.value };
  });
  if (next.some(entry => !entry.name)) {
    $('price-status').textContent = '请输入每个项目的名称。';
    return;
  }
  const previous = catalog;
  const wasCustom = customCatalog;
  catalog = next;
  customCatalog = true;
  if (!save()) {
    catalog = previous;
    customCatalog = wasCustom;
    $('price-status').textContent = '保存失败，请检查浏览器存储。';
    return;
  }
  renderCatalog();
  $('price-dialog').close();
};

const loadImage = src => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = reject;
  image.src = src;
});
$('logo').onchange = async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const request = ++logoRequest;
  const url = URL.createObjectURL(file);
  try {
    const source = await loadImage(url);
    if (request !== logoRequest) return;
    const scale = Math.min(1, 720 / source.width, 420 / source.height);
    const image = document.createElement('canvas');
    image.width = Math.max(1, Math.round(source.width * scale));
    image.height = Math.max(1, Math.round(source.height * scale));
    image.getContext('2d').drawImage(source, 0, 0, image.width, image.height);
    const data = image.toDataURL('image/png');
    const decoded = await loadImage(data);
    if (request !== logoRequest) return;
    brand.logo = data;
    logoImage = decoded;
    $('remove-logo').hidden = false;
    $('logo-status').textContent = save() ? '抬头图案已保存。' : '图案已应用到当前小票，浏览器存储失败。';
    refresh();
  } catch {
    if (request === logoRequest) $('logo-status').textContent = '无法读取图案，请换一张 PNG、JPG 或 WebP 图片。';
  } finally {
    URL.revokeObjectURL(url);
  }
};
$('remove-logo').onclick = () => {
  logoRequest++;
  brand.logo = '';
  logoImage = undefined;
  $('remove-logo').hidden = true;
  $('logo-status').textContent = '';
  refresh();
  save();
};

const canvas = $('ticket');
const ctx = canvas.getContext('2d');
const width = 420;
const edge = 27;
const end = width - edge;
const font = getComputedStyle(document.documentElement).getPropertyValue('--serif');
function drawTicket({ lines, subtotal, total }) {
  let y = 35;
  const draw = [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh') : null;
  function write(text, { size = 15, bold = false, align = 'left', color = '#322b36', max = end - edge } = {}) {
    const type = (bold ? '700 ' : '400 ') + size + 'px ' + font;
    ctx.font = type;
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      const queue = value => {
        const baseline = y;
        draw.push(() => {
          ctx.font = type;
          ctx.textAlign = align;
          ctx.textBaseline = 'top';
          ctx.fillStyle = color;
          ctx.fillText(value, align === 'center' ? width / 2 : align === 'right' ? end : edge, baseline);
        });
        y += size * 1.47;
      };
      const characters = segmenter ? Array.from(segmenter.segment(paragraph), part => part.segment) : Array.from(paragraph);
      for (const segment of characters) {
        if (line && ctx.measureText(line + segment).width > max) {
          queue(line);
          line = '';
        }
        line += segment;
      }
      queue(line);
    }
  }
  function rule(kind) {
    y += 7;
    const at = y;
    draw.push(() => {
      ctx.strokeStyle = kind === 'double' ? '#322b36' : '#a599ad';
      ctx.setLineDash(kind === 'dashed' ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(edge, at);
      ctx.lineTo(end, at);
      if (kind === 'double') {
        ctx.moveTo(edge, at + 4);
        ctx.lineTo(end, at + 4);
      }
      ctx.stroke();
    });
    y += kind === 'double' ? 16 : 12;
  }

  if (logoImage) {
    const scale = Math.min(270 / logoImage.width, 116 / logoImage.height);
    const w = logoImage.width * scale;
    const h = logoImage.height * scale;
    const top = y;
    draw.push(() => ctx.drawImage(logoImage, (width - w) / 2, top, w, h));
    y += h + 3;
  } else {
    write(brand.title.trim() || '定 制 票 据', { size: 30, bold: true, align: 'center' });
  }
  rule('double');
  const start = y;
  write('委托人  ' + (order.client.trim() || '—'), { max: 255 });
  const after = y;
  y = start;
  write('#' + order.code, { align: 'right', size: 13, color: '#67586f' });
  y = Math.max(after, y);
  write('截稿日期  ' + (order.deadline || '—'));
  rule('dashed');
  if (!lines.length) write('添加设计项目后，费用明细会显示在这里。', { size: 13, color: '#67586f' });
  for (const line of lines) {
    write(line.name.trim() || '自定义项目', { size: 18, bold: true });
    const group = line.group.trim() ? ' · 同模组 ' + line.group.trim() + (line.half ? '（半价）' : '（全价）') : '';
    write(money(cents(line.price)) + ' × ' + (line.quantity || '0') + group, { size: 13, color: '#67586f' });
    if (line.note.trim()) write(line.note.trim(), { size: 13, color: '#67586f' });
    for (const extra of line.extras) {
      write('＋ ' + (extra.name.trim() || '增项') + '  ' + money(cents(extra.price)), { size: 13, color: '#67586f' });
    }
    write(money(line.amount), { size: 19, bold: true, align: 'right' });
    rule('solid');
  }
  write('设计小计  ' + money(subtotal), { size: 14 });
  write('用途倍率  ' + $('usage').selectedOptions[0].textContent + ' × ' + (order.multiplier || '0'), { size: 14 });
  rule('double');
  write('合计', { size: 17, bold: true });
  y -= 25;
  write(money(total), { size: 24, bold: true, align: 'right' });
  if (order.note.trim() || brand.designer.trim()) {
    rule('dashed');
    if (order.note.trim()) write('备注  ' + order.note.trim(), { size: 13 });
    if (brand.designer.trim()) write('受托人  ' + brand.designer.trim(), { size: 13 });
  }
  y += 25;
  // ponytail: cap the printable height to fit mobile Safari's canvas limits.
  if (y > 3900) return false;
  canvas.width = width * 2;
  canvas.height = Math.ceil(y) * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = '#fffdf8';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width, 0);
  for (let x = width; x >= 0; x -= 7) ctx.lineTo(x, x % 14 ? y : y - 6);
  ctx.closePath();
  ctx.fill();
  draw.forEach(paint => paint());
  canvas.setAttribute('aria-label', '美工约稿小票，' + lines.length + ' 项，合计 ' + money(total));
  return true;
}
function refresh() {
  const result = quote(order.items, order.multiplier);
  result.lines.forEach((line, index) => {
    $('items').children[index].querySelector('output').textContent = (line.half ? '半价 · ' : '') + money(line.amount);
  });
  const fits = drawTicket(result);
  canvas.hidden = !fits;
  $('download').disabled = !fits || !result.lines.length;
  $('status').textContent = fits ? '' : '内容过长，请拆成两张小票。';
}
$('download').onclick = () => {
  const controls = [...document.querySelectorAll('#items input, #multiplier')];
  const invalid = controls.find(input => !input.checkValidity() || (input.required && !input.value.trim()));
  if (invalid) {
    invalid.focus();
    invalid.reportValidity();
    $('status').textContent = '请补全项目名称与费用，或检查数量和用途倍率。';
    return;
  }
  const link = node('a');
  link.download = '约稿小票-' + order.code + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  $('status').textContent = 'PNG 小票已生成。';
};

syncFields();
renderCatalog();
renderItems();
if (brand.logo) {
  const request = logoRequest;
  loadImage(brand.logo).then(image => {
    if (request !== logoRequest) return;
    logoImage = image;
    $('remove-logo').hidden = false;
    refresh();
  }).catch(() => { $('logo-status').textContent = '已保存的抬头图案无法读取，请重新上传。'; });
}
