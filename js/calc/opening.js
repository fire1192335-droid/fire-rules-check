// 模組 6：無開口樓層合規性判定（1/30 檢討）
// 純計算，不碰 DOM。
// 依據：各類場所消防安全設備設置標準 第 4 條「無開口樓層」定義。
import { NO_OPENING } from '../../data/constants.js';

/**
 * @param {object} i
 * @param {string} i.floorTier  'le10'（10 層以下）| 'ge11'（11 層以上）
 * @param {number} i.floorArea  該層總樓地板面積 (m²)
 * @param {Array}  i.openings   開口清單，每筆：
 *   { id, wCm, hCm, shape:'rect'|'circle', c1, c2, c3, c4 }
 *   c1 下端距地板 ≤120cm；c2 面臨道路/≥1m通路；c3 無柵欄且內部無阻礙；c4 可自外開啟或易破壞構造
 */
export function calcNoOpening(i) {
  const errors = [];
  if (!(i.floorArea > 0)) errors.push('該層樓地板面積須大於 0。');

  const rows = (i.openings || []).map((o) => {
    const wCm = Number(o.wCm) || 0;
    const hCm = Number(o.hCm) || 0;
    const valid = !!(o.c1 && o.c2 && o.c3 && o.c4); // 四條件全數符合才為有效開口
    let area = 0; // m²
    if (valid) {
      if (o.shape === 'circle') {
        const r = wCm / 100 / 2; // 寬度視為直徑 D
        area = Math.PI * r * r;
      } else {
        area = (wCm / 100) * (hCm / 100);
      }
    }
    // 搶救用大型開口：可內切直徑≥100cm 圓孔，或 寬≥75 且 高≥120
    let isLarge = false;
    if (valid) {
      const inscribe =
        o.shape === 'circle'
          ? wCm >= NO_OPENING.largeInscribeCm
          : Math.min(wCm, hCm) >= NO_OPENING.largeInscribeCm;
      const byWH = wCm >= NO_OPENING.largeWidthCm && hCm >= NO_OPENING.largeHeightCm;
      isLarge = inscribe || byWH;
    }
    return { id: o.id, wCm, hCm, shape: o.shape, valid, area, isLarge };
  });

  const validRows = rows.filter((r) => r.valid);
  const totalValidArea = validRows.reduce((s, r) => s + r.area, 0);
  const largeCount = validRows.filter((r) => r.isLarge).length;
  const ratio = i.floorArea > 0 ? totalValidArea / i.floorArea : 0;
  const requiredArea = i.floorArea * NO_OPENING.ratioThreshold;

  const is10F = i.floorTier === 'le10';

  const meetsRatio = ratio >= NO_OPENING.ratioThreshold;
  const meetsLarge = is10F ? largeCount >= NO_OPENING.minLargeCount10F : true;

  // 條件全數滿足 → 有開口樓層（綠）；否則 → 無開口樓層（紅）
  const hasOpening = !errors.length && meetsRatio && meetsLarge;

  const checks = [
    {
      name: `有效開口面積比（≥ 1/30 ≈ ${(NO_OPENING.ratioThreshold * 100).toFixed(2)}%）`,
      value: `${(ratio * 100).toFixed(2)}%`,
      criteria: `≥ ${(NO_OPENING.ratioThreshold * 100).toFixed(2)}%`,
      status: meetsRatio ? 'pass' : 'fail',
    },
  ];
  if (is10F) {
    checks.push({
      name: '搶救用大型開口數量（10 層以下需 ≥ 2）',
      value: `${largeCount} 個`,
      criteria: `≥ ${NO_OPENING.minLargeCount10F} 個`,
      status: meetsLarge ? 'pass' : 'fail',
    });
  }

  return {
    errors,
    rows,
    outputs: {
      totalValidArea,
      requiredArea,
      ratio,
      largeCount,
      validCount: validRows.length,
    },
    checks,
    is10F,
    hasOpening, // true=有開口樓層(綠) / false=無開口樓層(紅)
  };
}
