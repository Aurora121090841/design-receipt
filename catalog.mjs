const paper = '纸片 / 吧唧 / 亚克力';
const practical = '实用类';
const rows = [
  [paper, '小卡/拍立得/方卡/明信片/票根/工作证', [['单面', 22], ['双面', 30]]],
  [paper, '色纸/海报', 28],
  [paper, '屏风色纸', 50, '腰封选加 ¥5', 'waist'],
  [paper, '手幅/镭射票', [['单面', 28], ['双面', 35]]],
  [paper, '纸袋', [['四面', 45]]],
  [paper, '折页', [['双折', 50], ['三折', 65], ['四折', 75]]],
  [paper, '邮票', [['1p', 10], ['6p', 30], ['9p', 40]], '邮票面积小，精度有限'],
  [paper, '纸夹 CD', [['四面＋CD', 50]]],
  [paper, '吧唧', [['圆形', 20], ['方形', 20], ['长条', 20]]],
  [paper, '异形吧唧', 25, '需自带刀板图，工艺每层 ¥5', 'layer'],
  [paper, '吧唧背卡', [['单面', 10], ['双面', 30]], '10×10 有留白'],
  [paper, '贴纸', [['1 张', 10], ['3 张', 25], ['5 张', 40]], '长贴、封口贴、圆贴、异形'],
  [paper, '透卡/打卡棒/钥匙扣/行李牌', 20],
  [paper, '多插立牌/插卡立牌', 30],
  [paper, '万年历', 40],
  [paper, '封设/长宣图', 50, '¥50 起，按实际报价调整'],
  [paper, '经折页/龙鳞装/年终总结等企划', 80, '¥80 起，需先确认能否接单'],
  [practical, '卡册', [['四面', 60]]],
  [practical, '手帐本', 60],
  [practical, '卡套', 45],
  [practical, '身份证保护套/港澳通行证保护套', 20],
  [practical, '铁盒', [['仅盖', 30]]],
  [practical, '流麻', [['三层', 45]]],
  [practical, '票夹', [['四面', 45]]],
  [practical, '档案袋/文件夹', 40],
  [practical, '档案', [['单面', 25], ['双面', 30]], '需提供具体数据'],
  [practical, '帆布袋/托特/杜邦', [['双面', 50]], '需提供尺寸，侧面选加 ¥10', 'side'],
  [practical, '百贴布/手机壳/鼠标垫/桌垫/印章', 35],
  [practical, '行李飘带', 40],
  [practical, '痛绳', [['一段', 15]]],
  [practical, '护照夹', 50],
  [practical, '磁带盒', 40],
  [practical, '毛毯', 40],
  [practical, '眼镜袋/束口袋', [['单面', 20], ['双面', 30]]],
  [practical, '信封信纸 set', 45],
  [practical, '年历', [['单面', 25], ['双面', 30]]],
  [practical, '月历', [['13 张正反', 80]], '¥80 起，按实际报价调整']
];

export const defaults = rows.flatMap(([category, names, spec, detail, extra]) => {
  const variants = Array.isArray(spec) ? spec : [['', spec]];
  return names.split('/').flatMap(name => variants.map(([variant, price]) => ({
    name: variant ? name + ' · ' + variant : name, price: String(price), category, detail, extra
  })));
});

export const extras = {
  glitter: { name: '双闪', price: '8', unit: '面', craft: true },
  foil: { name: '烫金', price: '5', unit: '面', craft: true },
  reverse: { name: '逆向', price: '12', unit: '面', craft: true },
  waist: { name: '腰封', price: '5', unit: '件' },
  layer: { name: '异形吧唧工艺', price: '5', unit: '层', craft: true },
  side: { name: '侧面', price: '10', unit: '次' }
};

export const terms = {
  commercial: '开团一次（两次补断）／sxp／fys。不可转稿、二改或一稿多用。',
  buyout: '交付 PNG＋PSD，可二改、转稿、一稿多用。后续补断可能已无 PSD。可按约定随机赠制品或免工艺费。'
};
