import { cents, money, quote, usageLabels } from './pricing.mjs?v=6';
import { defaults, extras } from './catalog.mjs?v=8';

const $ = id => document.getElementById(id);
const orderFields = ['client', 'deadline', 'note', 'usage', 'multiplier', 'visibility', 'rush'];
const orderChecks = ['waiveCraft', 'gift'];
const defaultColors = { paper: '#fffdf8', ink: '#322b36', accent: '#000000' };
const brandFields = ['title', 'designer', ...Object.keys(defaultColors)];
const key = 'design-receipt-v1';
const newOrder = () => ({
  code: crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase(),
  items: [], client: '', deadline: '', note: '', usage: 'personal', multiplier: '1', visibility: 'public', rush: 'normal',
  waiveCraft: false, gift: false
});
let saved;
try {
  saved = JSON.parse(localStorage.getItem(key));
} catch {
  saved = null;
}
function loadCatalog(snapshot) {
  if (snapshot?.menuVersion) return snapshot.catalog ?? defaults;
  if (!snapshot?.customCatalog) return defaults;
  const customPrices = new Map(snapshot.catalog.map(entry => [entry.name, entry]));
  const menu = defaults.map(entry => {
    const custom = customPrices.get(entry.name);
    customPrices.delete(entry.name);
    return custom ? { ...entry, price: custom.price } : entry;
  });
  return menu.concat([...customPrices.values()]);
}
let catalog = loadCatalog(saved);
let order = { ...newOrder(), ...saved?.order };
let brand = { title: '', designer: '', logo: '', ...defaultColors, ...saved?.brand };
let logoImage;
let logoRequest = 0;

function save() {
  try {
    localStorage.setItem(key, JSON.stringify({ menuVersion: 1, catalog: catalog === defaults ? null : catalog, order, brand }));
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
  const groups = new Map();
  const select = $('catalog');
  const placeholder = new Option('选择品项与规格', '', true, true);
  placeholder.disabled = true;
  select.replaceChildren(placeholder);
  catalog.forEach((template, index) => {
    const category = template.category || '自定义';
    if (!groups.has(category)) {
      const group = node('optgroup');
      group.label = category;
      groups.set(category, group);
      select.append(group);
    }
    const suffix = template.detail?.startsWith('¥') ? ' 起' : '';
    groups.get(category).append(new Option(template.name + '  ' + money(cents(template.price)) + suffix, index));
  });
  $('add-catalog').disabled = true;
}
$('catalog').onchange = () => { $('add-catalog').disabled = !$('catalog').value; };
$('add-catalog').onclick = () => {
  const template = catalog[$('catalog').value];
  if (template) addItem(template);
};

function addExtra(item, extra) {
  item.extras.push({ ...extra });
  renderItems();
  const fields = $('items').children[order.items.indexOf(item)].querySelectorAll('.extra:last-of-type input');
  fields[extra.unit ? 2 : 0]?.focus();
  save();
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
      field('同模组号', item.group, update('group'), { placeholder: '同模填同一组号，折扣合计 1 件', maxLength: 16 })
    );
    const usageField = node('label', '', '制品用途');
    const usageSelect = node('select');
    usageSelect.append(new Option('跟随默认用途', ''));
    for (const id of ['personal', 'commercial', 'buyout']) {
      usageSelect.append(new Option(usageLabels[id], id));
    }
    usageSelect.value = item.usage || '';
    usageSelect.onchange = () => {
      item.usage = usageSelect.value;
      refresh();
      save();
    };
    usageField.append(usageSelect);
    fields.append(usageField);
    card.append(header, fields, field('项目备注', item.note, update('note'), { maxLength: 150, placeholder: '单面 / 双面、尺寸等' }));
    if (item.detail) card.append(node('small', '', item.detail));
    item.extras.forEach((extra, extraIndex) => {
      const row = node('div', 'item-title extra');
      row.append(
        field('加项名称', extra.name, value => { extra.name = value; }, { ...textOptions, placeholder: '烫色、改稿、衍生等' }),
        field('加项费用（元）', extra.price, value => { extra.price = value; }, amountOptions),
        button('移除', () => {
          item.extras.splice(extraIndex, 1);
          renderItems();
          save();
        })
      );
      if (extra.unit) {
        row.append(field('计费数量（' + extra.unit + '）', extra.quantity, value => { extra.quantity = value; },
          { type: 'number', min: 1, max: 999, step: 1, required: true }));
      }
      card.append(row);
    });
    const footer = node('footer');
    const craftOptions = node('select');
    craftOptions.setAttribute('aria-label', '添加工艺或加项');
    const placeholder = new Option('＋ 工艺 / 加项', '', true, true);
    placeholder.disabled = true;
    craftOptions.append(placeholder);
    for (const id of ['glitter', 'foil', 'reverse', item.extra].filter(Boolean)) {
      const extra = extras[id];
      craftOptions.append(new Option(extra.name + ' ' + money(cents(extra.price)) + '/' + extra.unit, id));
    }
    craftOptions.append(new Option('自定义加项', 'custom'));
    craftOptions.onchange = () => {
      const extra = extras[craftOptions.value];
      addExtra(item, extra ? { ...extra, quantity: '1' } : { name: '', price: '0' });
    };
    footer.append(craftOptions, node('output'));
    card.append(footer);
    return card;
  }));
  refresh();
}
function syncFields() {
  for (const id of orderFields) $(id).value = order[id];
  for (const id of brandFields) $(id).value = brand[id];
  for (const id of orderChecks) $(id).checked = order[id];
  $('custom-rate').hidden = order.usage !== 'custom';
}
for (const id of [...orderFields, ...brandFields]) {
  $(id).addEventListener('input', () => {
    const target = brandFields.includes(id) ? brand : order;
    target[id] = $(id).value;
    if (id === 'usage') syncFields();
    refresh();
    save();
  });
}
for (const id of orderChecks) {
  $(id).onchange = () => {
    order[id] = $(id).checked;
    refresh();
    save();
  };
}
$('reset-colors').onclick = () => {
  Object.assign(brand, defaultColors);
  syncFields();
  refresh();
  save();
};

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
  row.original = entry;
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
    return { ...row.original, name: name.value.trim(), price: price.value };
  });
  if (next.some(entry => !entry.name)) {
    $('price-status').textContent = '请输入每个项目的名称。';
    return;
  }
  const previous = catalog;
  catalog = next;
  if (!save()) {
    catalog = previous;
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
function drawTicket({ lines, subtotal, rush, pieces, discount, total }) {
  let y = 35;
  const { paper, ink, accent } = brand;
  const defaultInk = ink === defaultColors.ink && paper === defaultColors.paper;
  const detailInk = defaultInk ? '#67586f' : ink;
  const [red, green, blue] = [1, 3, 5].map(index => {
    const channel = parseInt(accent.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const tagInk = red * 0.2126 + green * 0.7152 + blue * 0.0722 > 0.179 ? '#000' : '#fff';
  const draw = [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh') : null;
  function write(text, { size = 15, bold = false, align = 'left', color = ink, max = end - edge, tag = '' } = {}) {
    const type = (bold ? '700 ' : '400 ') + size + 'px ' + font;
    const tagFont = '400 16px ' + font;
    ctx.font = tagFont;
    const tagWidth = tag ? Math.ceil(ctx.measureText(tag).width) + 24 : 0;
    const tagGap = 7;
    ctx.font = type;
    for (const paragraph of String(text).split('\n')) {
      let line = '';
      const queue = (value, withTag = false) => {
        const baseline = y;
        const tagX = edge + Math.ceil(ctx.measureText(value).width) + tagGap;
        draw.push(() => {
          ctx.font = type;
          ctx.textAlign = align;
          ctx.textBaseline = 'top';
          ctx.fillStyle = color;
          ctx.fillText(value, align === 'center' ? width / 2 : align === 'right' ? end : edge, baseline);
          if (withTag) {
            ctx.fillStyle = accent;
            ctx.fillRect(tagX, baseline + 1, tagWidth, 20);
            ctx.font = tagFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = tagInk;
            ctx.fillText(tag, tagX + tagWidth / 2, baseline + 11);
          }
        });
        y += size * 1.47;
      };
      const characters = segmenter ? Array.from(segmenter.segment(paragraph), part => part.segment) : Array.from(paragraph);
      for (const segment of characters) {
        if (line && ctx.measureText(line + segment).width > max - (tag ? tagWidth + tagGap : 0)) {
          queue(line);
          line = '';
        }
        line += segment;
      }
      queue(line, Boolean(tag));
    }
  }
  function rule(kind) {
    y += 7;
    const at = y;
    draw.push(() => {
      ctx.strokeStyle = kind === 'double' || !defaultInk ? ink : '#a599ad';
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
    write(brand.title.trim() || '定 制 票 据', { size: 30, bold: true, align: 'center', color: defaultColors.ink });
  }
  rule('double');
  const start = y;
  write('委托人  ' + (order.client.trim() || '—'), { max: 255 });
  const after = y;
  y = start;
  write('#' + order.code, { align: 'right', size: 13, color: detailInk });
  y = Math.max(after, y);
  write('交稿日期  ' + (order.deadline || '—'));
  rule('dashed');
  if (!lines.length) write('添加设计项目后，费用明细会显示在这里。', { size: 13, color: detailInk });
  for (const line of lines) {
    const tag = line.usage === 'personal' ? '自用' : usageLabels[line.usage];
    write(line.name.trim() || '自定义项目', { size: 18, bold: true, tag });
    const group = line.group.trim() ? ' · 同模组 ' + line.group.trim() : '';
    write(money(cents(line.price)) + ' × ' + (line.quantity || '0') + group, { size: 13, color: detailInk });
    if (line.note.trim()) write(line.note.trim(), { size: 13, color: detailInk });
    for (const extra of line.extras) {
      const quantity = extra.unit ? ' × ' + extra.quantity + extra.unit : '';
      write('＋ ' + (extra.name.trim() || '增项') + quantity + '  ' + (extra.waived ? '已免' : money(extra.amount)), { size: 13, color: detailInk });
    }
    write(money(line.total), { size: 19, bold: true, align: 'right' });
    rule('solid');
  }
  write('项目小计  ' + money(subtotal), { size: 14 });
  if (rush > 1) write('加急  ' + $('rush').selectedOptions[0].textContent, { size: 14 });
  if (discount < 1) write('Set 折扣  ' + pieces + ' 件 · ' + (discount * 10) + ' 折', { size: 14 });
  rule('double');
  write('合计', { size: 17, bold: true });
  y -= 25;
  write(money(total), { size: 24, bold: true, align: 'right' });
  const gift = order.gift && lines.some(line => line.usage === 'buyout');
  if (gift || order.note.trim() || brand.designer.trim()) {
    rule('dashed');
    if (gift) write('本单随机赠制品', { size: 13 });
    if (order.note.trim()) write('备注  ' + order.note.trim(), { size: 13 });
    if (brand.designer.trim()) write('受托人  ' + brand.designer.trim(), { size: 13 });
  }
  y += 25;
  // ponytail: cap the printable height to fit mobile Safari's canvas limits.
  if (y > 3900) return false;
  canvas.width = width * 2;
  canvas.height = Math.ceil(y) * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = paper;
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
  const result = quote(order.items, order);
  $('buyout-options').hidden = !result.lines.some(line => line.usage === 'buyout');
  result.lines.forEach((line, index) => {
    $('items').children[index].querySelector('output').textContent = money(line.total);
  });
  const fits = drawTicket(result);
  canvas.hidden = !fits;
  $('download').disabled = !fits || !result.lines.length;
  $('status').textContent = fits ? '' : '内容过长，请拆成两张小票。';
}
$('download').onclick = () => {
  const controls = [...document.querySelectorAll('#items input, #custom-rate:not([hidden]) input')];
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
