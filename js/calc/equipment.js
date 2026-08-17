// 模組 5：各類場所應設消防安全設備自動檢核（含智慧用途判定）
// 純邏輯，不碰 DOM。
//
// ⚠ 本引擎為「行政法規檢討輔助（簡化版）」：依《各類場所消防安全設備設置標準》
//   常見門檻以 if-else 實作，部分條文有例外與細目差異，實際仍應逐條核對現行法規。
import { OCCUPANCY } from '../../data/constants.js';

/**
 * 智慧用途判定：依關鍵字模糊比對，回傳第一個命中的類目 key，找不到回傳 null。
 * @param {string} text 使用者輸入的場所用途描述
 */
export function matchOccupancy(text) {
  if (!text) return null;
  const t = String(text).toUpperCase();
  for (const occ of OCCUPANCY) {
    for (const kw of occ.keywords) {
      if (t.includes(String(kw).toUpperCase())) {
        return { key: occ.key, matched: kw };
      }
    }
  }
  return null;
}

export function getOccupancy(key) {
  return OCCUPANCY.find((o) => o.key === key) || null;
}

/**
 * 應設設備檢核。
 * @param {object} i
 * @param {string} i.occKey     類目 key（如 'A5'）
 * @param {number} i.totalArea  總樓地板面積 (m²)
 * @param {number} i.floorArea  單層樓地板面積 (m²)
 * @param {string} i.floorType  樓層別 key
 */
export function checkEquipment(i) {
  const occ = getOccupancy(i.occKey);
  const errors = [];
  if (!occ) errors.push('請先選擇或判定場所類目。');
  if (!(i.totalArea >= 0)) errors.push('總樓地板面積須為非負數。');
  if (!(i.floorArea >= 0)) errors.push('單層樓地板面積須為非負數。');

  const total = i.totalArea || 0;
  const floor = i.floorArea || 0;
  const ft = i.floorType;
  const cls = occ ? occ.cls : '';

  const isBasementOrNoOpening = ft === 'basement' || ft === 'noOpening';
  const isNoOpening = ft === 'noOpening';
  const isBasement = ft === 'basement';
  const is11up = ft === 'f11up';
  const is3up = ft === 'f3_10' || ft === 'f11up'; // 地上 3 層以上
  const isGround = ft === 'f1_2' || ft === 'f3_10' || ft === 'f11up';
  const residential = occ && occ.isResidential;

  const R = (required, note, article) => ({ required: !!required, note: note || '', article });

  // 【滅火器】第14條：一律應設
  const fireExt = R(true, '各類場所應設置滅火器', '第14條');

  // 【室內消防栓】第15條
  let hydrant;
  if (cls === '甲') {
    hydrant = R(total >= 150, '甲類場所總樓地板面積 ≥ 150 m² 應設', '第15條');
  } else if (cls === '乙') {
    if (residential) {
      hydrant = R(total >= 500, '集合住宅類總樓地板面積 ≥ 500 m² 應設', '第15條');
    } else if (isBasementOrNoOpening) {
      hydrant = R(floor >= 150, '乙類地下層／無開口樓層該層 ≥ 150 m² 應設', '第15條');
    } else {
      hydrant = R(total >= 300, '乙類地上層總樓地板面積 ≥ 300 m² 應設', '第15條');
    }
  } else if (cls === '丙') {
    hydrant = R(total >= 1000, '丙類場所總樓地板面積 ≥ 1000 m² 應設', '第15條');
  } else if (cls === '丁') {
    hydrant = R(total >= 700, '丁類場所總樓地板面積 ≥ 700 m² 應設', '第15條');
  } else {
    hydrant = R(false, '', '第15條');
  }

  // 【自動撒水設備】第17條
  let sprinkler;
  if (is11up) {
    sprinkler = R(true, '位於地上 11 層以上之樓層一律應設', '第17條');
  } else if (cls === '甲') {
    sprinkler = R(
      total >= 1000 || (isBasementOrNoOpening && floor >= 1000),
      '甲類總面積 ≥ 1000 m²，或地下層／無開口該層 ≥ 1000 m² 應設', '第17條'
    );
  } else {
    sprinkler = R(
      total >= 1500 || (isBasementOrNoOpening && floor >= 1500),
      '乙丙丁類總面積 ≥ 1500 m²，或地下層／無開口該層 ≥ 1500 m² 應設', '第17條'
    );
  }

  // 【火警自動警報設備】第19條
  let alarm;
  if (isBasementOrNoOpening && floor >= 100) {
    alarm = R(true, '地下層／無開口樓層該層 ≥ 100 m² 應設', '第19條');
  } else if (cls === '甲') {
    alarm = R(total >= 300, '甲類場所總樓地板面積 ≥ 300 m² 應設', '第19條');
  } else {
    const th = occ ? occ.alarmGround || 500 : 500;
    alarm = R(total >= th, `本類目地上層總樓地板面積 ≥ ${th} m² 應設（診所類等以 300 m² 檢討）`, '第19條');
  }

  // 【手動報警設備】第21條：3層以上或地下層且每層 ≥ 200 m²；已設火警自動警報之部分免設
  let manualAlarm;
  const manualBase = (is3up || isBasement) && floor >= 200;
  if (manualBase && alarm.required) {
    manualAlarm = R(false, '雖達設置規模，惟已設火警自動警報設備之部分免設', '第21條');
  } else {
    manualAlarm = R(manualBase, '3 層以上或地下層，且每層樓地板面積 ≥ 200 m² 應設', '第21條');
  }

  // 【緊急廣播設備】第22條：應設火警自動警報之場所一律檢討設置
  const broadcast = R(alarm.required, '應設火警自動警報設備之場所應檢討設置', '第22條');

  // 【標示設備】第24、25條：一律應設
  const sign = R(true, '各類場所之出口標示燈、避難方向指示燈一律應設', '第24、25條');

  // 【避難器具】第26條：地上 3 層以上或地下層
  const escape = R(
    (ft === 'f3_10' || ft === 'f11up') || isBasement,
    '位於地上 3 層以上或地下層者應設', '第26條'
  );

  // 【緊急照明設備】第27條：供甲乙丙類使用之居室、避難通道等，指定規模以上應設
  const emgLight = R(
    cls === '甲' || cls === '乙' || cls === '丙',
    '供甲、乙、丙類場所使用之居室及避難通道，指定規模以上應設', '第27條'
  );

  // 【排煙設備】第28條
  let smokeVent;
  if (cls === '甲' && total >= 500) {
    smokeVent = R(true, '甲類（或戊類複合）總樓地板面積合計 ≥ 500 m² 應設', '第28條');
  } else if (isNoOpening && floor >= 1000) {
    smokeVent = R(true, '無開口樓層該層 ≥ 1000 m² 應設', '第28條');
  } else {
    smokeVent = R(false, '另：面積 ≥ 100 m² 之居室，有效通風未達 2% 者應設（需個案量測）', '第28條');
  }

  const groups = [
    { group: '滅火設備', items: [
      { name: '滅火器', ...fireExt },
      { name: '室內消防栓', ...hydrant },
      { name: '自動撒水設備', ...sprinkler },
    ]},
    { group: '警報設備', items: [
      { name: '火警自動警報設備', ...alarm },
      { name: '手動報警設備', ...manualAlarm },
      { name: '緊急廣播設備', ...broadcast },
    ]},
    { group: '避難逃生設備', items: [
      { name: '標示設備（出口燈／方向燈）', ...sign },
      { name: '避難器具', ...escape },
      { name: '緊急照明設備', ...emgLight },
    ]},
    { group: '消防搶救上之必要設備', items: [
      { name: '排煙設備', ...smokeVent },
    ]},
  ];

  return { errors, occupancy: occ, groups };
}
