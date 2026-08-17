// 共用 UI 元件（純建構 DOM，不含業務邏輯）

export function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v != null && v !== false) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// 數字輸入欄位
export function numberField(id, label, opts = {}) {
  const input = h('input', {
    type: 'number',
    id,
    class: 'field-input',
    step: opts.step ?? 'any',
    value: opts.value ?? '',
    placeholder: opts.placeholder ?? '',
    inputmode: 'decimal',
  });
  const unit = opts.unit ? h('span', { class: 'field-unit', text: opts.unit }) : null;
  return {
    input,
    node: h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: label }),
      h('span', { class: 'field-control' }, [input, unit]),
    ]),
  };
}

// 文字輸入欄位
export function textField(id, label, opts = {}) {
  const input = h('input', {
    type: 'text',
    id,
    class: 'field-input',
    value: opts.value ?? '',
    placeholder: opts.placeholder ?? '',
  });
  return {
    input,
    node: h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: label }),
      h('span', { class: 'field-control' }, [input]),
    ]),
  };
}

// 核取方塊
export function checkbox(id, label, checked) {
  const input = h('input', { type: 'checkbox', id, class: 'chk-input' });
  input.checked = !!checked;
  return {
    input,
    node: h('label', { class: 'chk' }, [input, h('span', { text: label })]),
  };
}

// 下拉選單欄位
export function selectField(id, label, options, selected) {
  const select = h('select', { id, class: 'field-input' });
  for (const o of options) {
    const opt = h('option', { value: o.value, text: o.label });
    if (o.value === selected) opt.selected = true;
    select.appendChild(opt);
  }
  return {
    select,
    node: h('label', { class: 'field' }, [
      h('span', { class: 'field-label', text: label }),
      h('span', { class: 'field-control' }, [select]),
    ]),
  };
}

// 數據卡片
export function metricCard(title, value, sub) {
  return h('div', { class: 'metric-card' }, [
    h('div', { class: 'metric-title', html: title }),
    h('div', { class: 'metric-value', html: value }),
    sub ? h('div', { class: 'metric-sub', text: sub }) : null,
  ]);
}

// 燈號徽章 status: 'pass' | 'fail' | 'warn'
export function lightBadge(status) {
  const map = {
    pass: { cls: 'badge-pass', text: '✓ 合格' },
    fail: { cls: 'badge-fail', text: '✕ 不合格' },
    warn: { cls: 'badge-warn', text: '⚠ 警告' },
  };
  const m = map[status] || map.fail;
  return h('span', { class: `badge ${m.cls}`, text: m.text });
}

// 整體判定橫幅
export function verdictBanner(status, textMap = {}) {
  const map = {
    pass: { cls: 'verdict-pass', text: textMap.pass ?? '整體判定：合格' },
    fail: { cls: 'verdict-fail', text: textMap.fail ?? '整體判定：不合格' },
    warn: { cls: 'verdict-warn', text: textMap.warn ?? '整體判定：警告' },
  };
  const m = map[status] || map.fail;
  return h('div', { class: `verdict ${m.cls}` }, [
    h('span', { class: 'verdict-light' }),
    h('span', { text: m.text }),
  ]);
}

// 判定明細表
export function checkTable(checks) {
  const rows = checks.map((c) =>
    h('tr', {}, [
      h('td', { text: c.name }),
      h('td', { class: 'num', text: c.value }),
      h('td', { class: 'num', text: c.criteria }),
      h('td', {}, [lightBadge(c.status)]),
    ])
  );
  return h('table', { class: 'check-table' }, [
    h('thead', {}, [
      h('tr', {}, [
        h('th', { text: '判定項目' }),
        h('th', { class: 'num', text: '實測／核算' }),
        h('th', { class: 'num', text: '合格基準' }),
        h('th', { text: '判定' }),
      ]),
    ]),
    h('tbody', {}, rows),
  ]);
}

// 錯誤提示
export function errorBox(errors) {
  if (!errors || !errors.length) return null;
  return h(
    'div',
    { class: 'error-box' },
    errors.map((e) => h('div', { text: '⚠ ' + e }))
  );
}

// 警告訊息框（黃）
export function warnBox(msg) {
  if (!msg) return null;
  return h('div', { class: 'warn-box', text: '⚠ ' + msg });
}

// 法規依據小字
export function legalNote(text) {
  return h('div', { class: 'legal-note', text: '法規依據：' + text });
}

// 公式區塊（LaTeX，交給 MathJax 渲染）
export function formulaBlock(latexLines, note) {
  const box = h('div', { class: 'formula-box' });
  for (const line of [].concat(latexLines)) {
    box.appendChild(h('div', { class: 'formula-line', text: `$$${line}$$` }));
  }
  if (note) box.appendChild(h('div', { class: 'formula-note', text: note }));
  return box;
}

// 觸發 MathJax 重新排版。
// 串接在 startup.promise 之後並序列化，確保字型度量就緒且僅對已掛載節點排版，
// 避免 MathJax SVG 量測未就緒／detached 節點產生 NaN。
export function typeset(node) {
  const MJ = window.MathJax;
  if (!(MJ && MJ.startup && MJ.startup.promise)) return;
  MJ.startup.promise = MJ.startup.promise
    .then(() => {
      if (node && !node.isConnected) return null;
      return MJ.typesetPromise(node ? [node] : undefined);
    })
    .catch(() => {});
}

// Tab 分頁容器
export function tabs(items) {
  const nav = h('div', { class: 'tab-nav' });
  const body = h('div', { class: 'tab-body' });
  const buttons = [];
  const show = (idx) => {
    buttons.forEach((b, i) => b.classList.toggle('active', i === idx));
    body.innerHTML = '';
    body.appendChild(items[idx].render());
    typeset(body);
  };
  items.forEach((it, idx) => {
    const btn = h('button', { class: 'tab-btn', type: 'button', onClick: () => show(idx) });
    btn.textContent = it.label;
    buttons.push(btn);
    nav.appendChild(btn);
  });
  const wrap = h('div', { class: 'tabs' }, [nav, body]);
  show(0);
  return wrap;
}

// 讀取數字輸入（空值回傳 NaN）
export function num(input) {
  const v = parseFloat(input.value);
  return Number.isFinite(v) ? v : NaN;
}

// 區塊標題
export function sectionTitle(text, sub) {
  return h('div', { class: 'section-head' }, [
    h('h2', { class: 'section-title', text }),
    sub ? h('p', { class: 'section-sub', text: sub }) : null,
  ]);
}

export function button(text, onClick) {
  return h('button', { class: 'btn-primary', type: 'button', onClick }, [text]);
}

export function panelGrid(children) {
  return h('div', { class: 'panel-grid' }, children);
}
