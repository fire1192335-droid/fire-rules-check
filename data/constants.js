// 法規常數、類目與判定門檻集中管理。
// 修法時只改本檔；每一項都標註法規依據，方便日後查核更新。
// 依據：各類場所消防安全設備設置標準。

// ── 模組 1 各類場所應設消防安全設備 ────────────────────
// 場所用途類目與智慧判定關鍵字。比對時依序尋找第一個命中的類目。
// 依據：各類場所消防安全設備設置標準 第 12 條場所分類。
export const OCCUPANCY = [
  { key: 'A1', label: '甲類第1目（KTV、酒吧、戲院、電影院、理容、按摩等）', cls: '甲',
    keywords: ['KTV', '歌廳', '舞廳', '夜總會', '酒吧', '酒店', '戲院', '電影院', '理容', '按摩'] },
  { key: 'A5', label: '甲類第5目（餐廳、咖啡廳、飲食店等）', cls: '甲',
    keywords: ['餐廳', '咖啡', '餐館', '飲食', '茶藝'] },
  { key: 'A6', label: '甲類第6目（醫院、長照、護理機構、托嬰中心等）', cls: '甲',
    keywords: ['醫院', '長照', '護理', '療養', '安養', '產後護理', '托嬰', '身心障礙'] },
  { key: 'B6', label: '乙類第6目（辦公室、診所、金融機構、證券等）', cls: '乙', alarmGround: 500,
    keywords: ['辦公', '診所', '金融', '證券'] },
  { key: 'B7', label: '乙類第7目（集合住宅、公寓、宿舍等）', cls: '乙', isResidential: true, alarmGround: 1000,
    keywords: ['住宅', '公寓', '宿舍'] },
  { key: 'C', label: '丙類（工廠、製造場所、倉庫等）', cls: '丙', alarmGround: 500,
    keywords: ['工廠', '製造', '倉庫'] },
  { key: 'D', label: '丁類（公共危險物品、高壓氣體、石化等）', cls: '丁', alarmGround: 500,
    keywords: ['危險', '高壓氣體', '石化'] },
];

// 樓層別
export const FLOOR_TYPES = [
  { key: 'basement', label: '地下層' },
  { key: 'noOpening', label: '無開口樓層' },
  { key: 'f1_2', label: '地上 1 至 2 層' },
  { key: 'f3_10', label: '地上 3 至 10 層' },
  { key: 'f11up', label: '地上 11 層以上' },
];

// ── 模組 2 無開口樓層 1/30 檢討 ───────────────────────
// 依據：各類場所消防安全設備設置標準 第 4 條「無開口樓層」定義。
export const NO_OPENING = {
  ratioThreshold: 1 / 30, // 有效開口面積 / 樓地板面積 之下限
  largeInscribeCm: 100, // 可內切直徑 1 公尺（100 cm）以上圓孔
  largeWidthCm: 75, // 或 寬 ≥ 75 cm
  largeHeightCm: 120, // 且 高 ≥ 120 cm
  minLargeCount10F: 2, // 10 層以下另需至少 2 個搶救用大型開口
};
