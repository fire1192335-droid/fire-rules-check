// 主程式：模組導覽切換與各模組畫面組裝。
import { OCCUPANCY, FLOOR_TYPES } from '../data/constants.js';
import { matchOccupancy, getOccupancy, checkEquipment } from './calc/equipment.js';
import { calcNoOpening } from './calc/opening.js';
import {
  h, numberField, textField, selectField, metricCard, verdictBanner, checkTable,
  errorBox, legalNote, formulaBlock, typeset, num,
  sectionTitle, button, panelGrid,
} from './ui.js';

const MODULES = [
  { id: 'equip', label: '1. 應設設備檢核', render: renderEquipment },
  { id: 'noopening', label: '2. 無開口樓層判定', render: renderNoOpening },
];

function init() {
  const nav = document.getElementById('module-nav');
  const view = document.getElementById('view');
  let current = MODULES[0].id;

  const select = (id) => {
    current = id;
    [...nav.children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
    view.innerHTML = '';
    view.appendChild(MODULES.find((m) => m.id === id).render());
    typeset(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  MODULES.forEach((m) => {
    const btn = h('button', { class: 'nav-btn', 'data-id': m.id, onClick: () => select(m.id) });
    btn.textContent = m.label;
    nav.appendChild(btn);
  });

  select(current);

  // 註冊 Service Worker（離線）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

// ── 模組 1 應設設備檢核 ───────────────────────────────
function renderEquipment() {
  const wrap = h('div', { class: 'module' });
  wrap.appendChild(
    sectionTitle('各類場所應設消防安全設備自動檢核', '輸入場所用途，系統智慧判定類目並套用法規門檻檢討應設設備')
  );

  // 智慧輸入框
  const use = textField('eq-use', '場所用途（智慧判定）', {
    placeholder: '例如：我想開咖啡廳、集合住宅、電子工廠、老人長照中心…',
  });
  const hint = h('div', { class: 'match-hint' });

  // 類目下拉（可手動校正）
  const occSel = selectField(
    'eq-occ', '場所類目（可手動校正）',
    OCCUPANCY.map((o) => ({ value: o.key, label: o.label })),
    'A5'
  );

  const totalA = numberField('eq-total', '總樓地板面積', { unit: 'm²', placeholder: '全棟或該場所合計' });
  const floorA = numberField('eq-floor', '單層樓地板面積', { unit: 'm²', placeholder: '該樓層面積' });
  const floorT = selectField(
    'eq-ft', '樓層別',
    FLOOR_TYPES.map((t) => ({ value: t.key, label: t.label })),
    'f1_2'
  );

  const form = panelGrid([use.node, occSel.node, totalA.node, floorA.node, floorT.node]);

  // 智慧判定：輸入用途時更新提示與下拉預設
  const runMatch = () => {
    const m = matchOccupancy(use.input.value);
    if (m) {
      occSel.select.value = m.key;
      const occ = getOccupancy(m.key);
      hint.className = 'match-hint match-ok';
      hint.textContent = `💡 系統智慧判定成功：本場所對應為「${occ.label}」（命中關鍵字：${m.matched}）`;
    } else if (use.input.value.trim()) {
      hint.className = 'match-hint match-none';
      hint.textContent = '⚠ 無法由關鍵字判定類目，請於下方下拉選單手動選擇正確類目。';
    } else {
      hint.className = 'match-hint';
      hint.textContent = '';
    }
    run();
  };

  const compute = () => {
    const r = checkEquipment({
      occKey: occSel.select.value,
      totalArea: num(totalA.input),
      floorArea: num(floorA.input),
      floorType: floorT.select.value,
    });
    const occ = r.occupancy;
    const ftLabel = (FLOOR_TYPES.find((t) => t.key === floorT.select.value) || {}).label || '';

    const groups = r.groups.map((g) =>
      h('div', { class: 'equip-group' }, [
        h('div', { class: 'equip-group-title', text: g.group }),
        h('div', { class: 'equip-items' }, g.items.map((it) =>
          h('div', { class: `equip-item ${it.required ? 'req-on' : 'req-off'}` }, [
            h('div', { class: 'equip-row1' }, [
              h('span', { class: 'equip-name', text: it.name }),
              h('span', { class: `equip-badge ${it.required ? 'b-on' : 'b-off'}`,
                text: it.required ? '應設' : '免設' }),
            ]),
            h('div', { class: 'equip-note', text: `${it.article}　${it.note}` }),
          ])
        )),
      ])
    );

    return h('div', {}, [
      errorBox(r.errors),
      h('div', { class: 'cards' }, [
        metricCard('判定類目', occ ? occ.label : '—'),
        metricCard('樓層別', ftLabel),
        metricCard('面積（總／單層）', `${f(num(totalA.input) || 0)} / ${f(num(floorA.input) || 0)} <small>m²</small>`),
      ]),
      h('div', { class: 'equip-groups' }, groups),
      legalNote('各類場所消防安全設備設置標準 第14、15、17、19、21、22、24、25、26、27、28 條（本檢核為簡化輔助，實際應逐條核對現行法規）'),
    ]);
  };

  const result = h('div', { class: 'result-zone' });
  const run = () => {
    result.innerHTML = '';
    result.appendChild(compute());
    typeset(result);
  };

  use.input.addEventListener('input', runMatch);
  [occSel.select, totalA.input, floorA.input, floorT.select].forEach((el) => {
    el.addEventListener('input', run);
    el.addEventListener('change', run);
  });

  wrap.appendChild(form);
  wrap.appendChild(hint);
  wrap.appendChild(button('檢核應設設備', run));
  wrap.appendChild(result);
  run();
  return wrap;
}

// ── 模組 2 無開口樓層判定 ─────────────────────────────
function renderNoOpening() {
  const wrap = h('div', { class: 'module' });
  wrap.appendChild(
    sectionTitle('無開口樓層合規性判定（1/30 檢討）', '輸入各開口量測資料，自動判定本層是否屬於無開口樓層')
  );

  const tier = selectField('no-tier', '樓層區劃', [
    { value: 'le10', label: '10 層以下之樓層' },
    { value: 'ge11', label: '11 層以上之樓層' },
  ], 'le10');
  const area = numberField('no-area', '該層總樓地板面積', { unit: 'm²', placeholder: '該層面積' });

  const form = panelGrid([tier.node, area.node]);

  // 開口清單（動態新增）
  let seq = 0;
  const openings = []; // { id, el, get() }
  const listBody = h('div', { class: 'opening-list' });

  const letter = (n) => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? Math.floor(n / 26) : '');

  const addOpening = (preset) => {
    const id = letter(seq++);
    const w = h('input', { type: 'number', class: 'op-in', step: 'any', placeholder: 'cm', inputmode: 'decimal' });
    const ht = h('input', { type: 'number', class: 'op-in', step: 'any', placeholder: 'cm', inputmode: 'decimal' });
    const shape = h('select', { class: 'op-in' }, [
      h('option', { value: 'rect', text: '矩形' }),
      h('option', { value: 'circle', text: '圓形' }),
    ]);
    const c1 = h('input', { type: 'checkbox' });
    const c2 = h('input', { type: 'checkbox' });
    const c3 = h('input', { type: 'checkbox' });
    const c4 = h('input', { type: 'checkbox' });
    const delBtn = h('button', { class: 'op-del', type: 'button', title: '刪除此開口', text: '✕' });

    const card = h('div', { class: 'opening-card', 'data-id': id }, [
      h('div', { class: 'opening-head' }, [
        h('span', { class: 'opening-id', text: `開口 ${id}` }),
        delBtn,
      ]),
      h('div', { class: 'opening-dims' }, [
        h('label', { class: 'op-field' }, [h('span', { text: '寬度' }), w, h('span', { class: 'op-unit', text: 'cm' })]),
        h('label', { class: 'op-field' }, [h('span', { text: '高度／直徑' }), ht, h('span', { class: 'op-unit', text: 'cm' })]),
        h('label', { class: 'op-field' }, [h('span', { text: '形狀' }), shape]),
      ]),
      h('div', { class: 'opening-conds' }, [
        h('label', { class: 'chk' }, [c1, h('span', { text: '① 下端距樓地板面 ≤ 120cm' })]),
        h('label', { class: 'chk' }, [c2, h('span', { text: '② 面臨道路或 ≥1m 通路' })]),
        h('label', { class: 'chk' }, [c3, h('span', { text: '③ 無柵欄且內部無阻礙物' })]),
        h('label', { class: 'chk' }, [c4, h('span', { text: '④ 可自外開啟／易破壞構造（6mm 以下玻璃）' })]),
      ]),
    ]);

    // 圓形時高度欄位停用（以寬度視為直徑）
    const syncShape = () => { ht.disabled = shape.value === 'circle'; };
    shape.addEventListener('change', () => { syncShape(); run(); });
    syncShape();

    const entry = {
      id, card,
      get: () => ({
        id, wCm: parseFloat(w.value) || 0, hCm: parseFloat(ht.value) || 0,
        shape: shape.value, c1: c1.checked, c2: c2.checked, c3: c3.checked, c4: c4.checked,
      }),
    };
    openings.push(entry);
    [w, ht, shape, c1, c2, c3, c4].forEach((el) => {
      el.addEventListener('input', run);
      el.addEventListener('change', run);
    });
    delBtn.addEventListener('click', () => {
      const idx = openings.indexOf(entry);
      if (idx >= 0) openings.splice(idx, 1);
      card.remove();
      run();
    });
    listBody.appendChild(card);
    if (preset) {
      w.value = preset.w; ht.value = preset.h;
    }
  };

  const compute = () => {
    const r = calcNoOpening({
      floorTier: tier.select.value,
      floorArea: num(area.input),
      openings: openings.map((o) => o.get()),
    });

    // 開口彙整表
    const tableRows = r.rows.map((row) =>
      h('tr', { class: row.valid ? '' : 'row-invalid' }, [
        h('td', { text: row.id }),
        h('td', { text: row.shape === 'circle' ? '圓形' : '矩形' }),
        h('td', { class: 'num', text: `${row.wCm}×${row.shape === 'circle' ? '—' : row.hCm}` }),
        h('td', { class: 'num', text: row.valid ? f(row.area) : '0' }),
        h('td', {}, [h('span', { class: `badge ${row.valid ? 'badge-pass' : 'badge-fail'}`,
          text: row.valid ? '有效' : '無效' })]),
        h('td', {}, [row.valid && row.isLarge ? h('span', { class: 'badge badge-pass', text: '大型' }) : h('span', { class: 'muted', text: '—' })]),
      ])
    );
    const table = h('table', { class: 'check-table' }, [
      h('thead', {}, [h('tr', {}, [
        h('th', { text: '開口' }), h('th', { text: '形狀' }),
        h('th', { class: 'num', text: '寬×高(cm)' }), h('th', { class: 'num', text: '有效面積(m²)' }),
        h('th', { text: '有效性' }), h('th', { text: '搶救大型' }),
      ])]),
      h('tbody', {}, tableRows.length ? tableRows : [h('tr', {}, [h('td', { colspan: '6', class: 'muted', text: '尚未新增開口' })])]),
    ]);

    const verdictStatus = r.hasOpening ? 'pass' : 'fail';
    const bigVerdict = h('div', { class: `big-verdict ${r.hasOpening ? 'bv-pass' : 'bv-fail'}` },
      [r.hasOpening ? '【有開口樓層】' : '【無開口樓層】']);

    return h('div', {}, [
      errorBox(r.errors),
      table,
      h('div', { class: 'cards' }, [
        metricCard('有效開口總面積', `${f(r.outputs.totalValidArea)} <small>m²</small>`, `有效開口 ${r.outputs.validCount} 個`),
        metricCard('法定門檻面積（1/30）', `${f(r.outputs.requiredArea)} <small>m²</small>`),
        metricCard('開口率', `${(r.outputs.ratio * 100).toFixed(2)} <small>%</small>`),
        metricCard('搶救用大型開口', `${r.outputs.largeCount} <small>個</small>`, r.is10F ? '10層以下需 ≥ 2' : '11層以上不計'),
      ]),
      formulaBlock(
        [
          '\\text{開口率} = \\dfrac{\\text{有效開口總面積}}{\\text{樓地板面積}} \\ge \\dfrac{1}{30} \\approx 3.33\\%',
          '\\text{圓形開口面積} = \\pi \\times \\left(\\dfrac{D}{2}\\right)^2',
        ],
        '有效開口＝同時符合①②③④之開口；10 層以下另需 ≥ 2 個搶救用大型開口（內切直徑 ≥ 1m，或 寬 ≥ 75cm 且 高 ≥ 120cm）'
      ),
      checkTable(r.checks),
      bigVerdict,
      verdictBanner(verdictStatus, {
        pass: '整體判定：有開口樓層（符合）',
        fail: '整體判定：無開口樓層（不符合，應以無開口樓層檢討設備）',
      }),
      legalNote('各類場所消防安全設備設置標準 第 4 條（無開口樓層之定義與 1/30 檢討）'),
    ]);
  };

  const result = h('div', { class: 'result-zone' });
  const run = () => {
    result.innerHTML = '';
    result.appendChild(compute());
    typeset(result);
  };
  [tier.select, area.input].forEach((el) => {
    el.addEventListener('input', run);
    el.addEventListener('change', run);
  });

  const addBtn = h('button', { class: 'btn-add', type: 'button', text: '＋ 新增開口', onClick: () => { addOpening(); run(); } });

  wrap.appendChild(form);
  wrap.appendChild(h('div', { class: 'opening-toolbar' }, [addBtn]));
  wrap.appendChild(listBody);
  wrap.appendChild(button('核算判定', run));
  wrap.appendChild(result);

  // 預設帶入兩個開口方便操作
  addOpening();
  addOpening();
  run();
  return wrap;
}

// 顯示用數字格式
function f(n) {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : '—';
}

document.addEventListener('DOMContentLoaded', init);
