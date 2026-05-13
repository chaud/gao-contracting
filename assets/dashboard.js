/* ============================================================
   Government-Wide Contracting Dashboard — interactions
   ============================================================ */

const COLORS = {
  civ: '#005ea2',
  civLight: '#73b3e7',
  def: '#1a4480',
  defDark: '#162e51',
  accent: '#00bde3',
  ink: '#1b1b1b',
  muted: '#565c65',
  surface: '#f7f9fb',
  line: '#dfe1e2',
};

const fmtB = v => '$' + (v / 1e9).toFixed(1) + 'B';
const fmtM = v => '$' + (v / 1e6).toFixed(0) + 'M';
const fmtSmart = v => v >= 1e9 ? fmtB(v) : (v >= 1e6 ? fmtM(v) : '$' + Math.round(v).toLocaleString());
const fmtPct = v => (v * 100).toFixed(0) + '%';
const fmtPct1 = v => (v * 100).toFixed(1) + '%';

// Civ/def lookup
const dodLU = {};
deptData.forEach(d => dodLU[d.dept] = d.dod_civ);

// ============================================================
// Global filter state
//   filter.kind: 'all' | 'group' | 'dept'
//   filter.value: 'all' | 'Civilian' | 'Defense' | dept name
// ============================================================
const state = { filter: { kind: 'all', value: 'all' } };

function setFilter(kind, value) {
  state.filter = { kind, value };
  syncFilterUI();
  renderAll();
}

function clearFilter() { setFilter('all', 'all'); }

function syncFilterUI() {
  const select = document.getElementById('agency-select');
  const swatch = document.getElementById('agency-swatch');
  const picker = document.querySelector('.agency-picker');

  const f = state.filter;
  let selectValue = 'all';
  let swatchColor = '#a9aeb1';

  if (f.kind === 'group') {
    selectValue = 'group:' + f.value;
    swatchColor = f.value === 'Defense' ? COLORS.def : COLORS.civ;
  } else if (f.kind === 'dept') {
    selectValue = 'dept:' + f.value;
    swatchColor = dodLU[f.value] === 'Defense' ? COLORS.def : COLORS.civ;
  }
  select.value = selectValue;
  swatch.style.background = swatchColor;
  picker.classList.toggle('agency-picker--active', f.kind !== 'all');

  // sync chips
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.classList.toggle('chip--active',
      (state.filter.kind === 'all' && b.dataset.filter === 'all') ||
      (state.filter.kind === 'group' && b.dataset.filter === state.filter.value)
    );
  });
}

// Populate the agency-select dropdown with civilian + defense optgroups
function populateAgencySelect() {
  const civOG = document.getElementById('og-civ');
  const defOG = document.getElementById('og-def');
  const civ = deptData.filter(d => d.dod_civ === 'Civilian').sort((a, b) => b.obs - a.obs);
  const def = deptData.filter(d => d.dod_civ === 'Defense').sort((a, b) => b.obs - a.obs);
  civOG.innerHTML = civ.map(d => `<option value="dept:${d.dept}">${d.dept}</option>`).join('');
  defOG.innerHTML = def.map(d => `<option value="dept:${d.dept}">${d.dept}</option>`).join('');
}

// Handle dropdown changes
function bindAgencySelect() {
  const select = document.getElementById('agency-select');
  select.addEventListener('change', () => {
    const v = select.value;
    if (v === 'all') return clearFilter();
    const [kind, value] = v.split(':');
    setFilter(kind, value);
  });
}

// Helpers for filtering datasets
function matchesFilter(row) {
  const f = state.filter;
  if (f.kind === 'all') return true;
  if (f.kind === 'group') return (row.dod_civ === f.value);
  // dept filter
  if (row.dept === f.value) return true;
  return false;
}

// ============ Banner toggle ============
document.querySelector('.usa-banner__btn').addEventListener('click', e => {
  const btn = e.currentTarget;
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  document.getElementById('banner-detail').hidden = expanded;
});

// ============ Tabs ============
const tabs = document.querySelectorAll('.tab');
const panels = {
  agencies: document.getElementById('panel-agencies'),
  purchases: document.getElementById('panel-purchases'),
  vendors: document.getElementById('panel-vendors'),
  competition: document.getElementById('panel-competition'),
  ota: document.getElementById('panel-ota'),
};
tabs.forEach(t => {
  t.addEventListener('click', () => {
    tabs.forEach(x => x.setAttribute('aria-selected', 'false'));
    t.setAttribute('aria-selected', 'true');
    const key = t.dataset.tab;
    Object.entries(panels).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
    // Re-render current tab so it picks up viewport width correctly
    renderAll();
  });
});

// ============ Filter chips (treemap) ============
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.filter;
    if (v === 'all') clearFilter();
    else setFilter('group', v);
  });
});

// ============ Tooltip ============
const tip = document.getElementById('tooltip');
function showTip(html, ev) {
  tip.innerHTML = html;
  tip.hidden = false;
  tip.style.left = (ev.clientX + 14) + 'px';
  tip.style.top = (ev.clientY + 14) + 'px';
}
function hideTip() { tip.hidden = true; }

// ============================================================
// 01 — Agencies treemap
// ============================================================
function renderTreemap() {
  const el = document.getElementById('treemap');
  el.innerHTML = '';
  const W = el.clientWidth || 880;
  const H = 460;

  const rolled = d3.rollups(
    deptData,
    v => d3.sum(v, d => d.obs),
    d => d.dod_civ,
    d => d.dept
  );

  const root = {
    name: 'Total',
    children: rolled.map(([group, depts]) => ({
      name: group,
      children: depts.map(([dept, obs]) => ({ name: dept, value: obs, group }))
    }))
  };

  const h = d3.hierarchy(root).sum(d => d.value).sort((a, b) => b.value - a.value);
  d3.treemap().size([W, H]).paddingTop(28).paddingInner(2).round(true)(h);

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);

  const f = state.filter;
  const isHighlighted = (leaf) => {
    if (f.kind === 'all') return true;
    if (f.kind === 'group') return leaf.data.group === f.value;
    return leaf.data.name === f.value;
  };

  // Group banners (Civilian / Defense)
  const groupNodes = h.children;
  svg.selectAll('.tm-group-rect')
    .data(groupNodes)
    .join('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0 - 28)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', 28)
    .attr('fill', d => d.data.name === 'Defense' ? COLORS.defDark : COLORS.def)
    .attr('opacity', d => (f.kind === 'all' || (f.kind === 'group' && f.value === d.data.name) || (f.kind === 'dept' && dodLU[f.value] === d.data.name)) ? 1 : 0.45)
    .style('cursor', 'pointer')
    .on('click', (ev, d) => {
      if (f.kind === 'group' && f.value === d.data.name) clearFilter();
      else setFilter('group', d.data.name);
    })
    .on('mousemove', (ev, d) => showTip(`<strong>${d.data.name} agencies</strong> · click to filter<span class="tt-val">${fmtB(d.value)}</span>`, ev))
    .on('mouseleave', hideTip);

  svg.selectAll('.tm-group-label')
    .data(groupNodes)
    .join('text')
    .attr('class', 'tm-group')
    .attr('x', d => d.x0 + 12)
    .attr('y', d => d.y0 - 10)
    .attr('font-size', 12)
    .attr('pointer-events', 'none')
    .text(d => `${d.data.name.toUpperCase()} · ${fmtB(d.value)}`);

  // Leaf tiles
  const leaves = h.leaves();
  const tiles = svg.selectAll('.tm-tile-g')
    .data(leaves)
    .join('g')
    .attr('class', 'tm-tile-g')
    .attr('transform', d => `translate(${d.x0},${d.y0})`);

  tiles.append('rect')
    .attr('class', 'tm-tile')
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => d.data.group === 'Defense' ? COLORS.def : COLORS.civ)
    .attr('opacity', d => isHighlighted(d) ? 1 : 0.22)
    .attr('stroke', d => (f.kind === 'dept' && f.value === d.data.name) ? '#fff' : 'none')
    .attr('stroke-width', d => (f.kind === 'dept' && f.value === d.data.name) ? 3 : 0)
    .style('cursor', 'pointer')
    .on('click', (ev, d) => {
      if (f.kind === 'dept' && f.value === d.data.name) clearFilter();
      else setFilter('dept', d.data.name);
    })
    .on('mousemove', (ev, d) => {
      showTip(`<strong>${d.data.name}</strong> (${d.data.group}) · click to filter<span class="tt-val">${fmtB(d.value)}</span>`, ev);
    })
    .on('mouseleave', hideTip);

  tiles.each(function(d) {
    const w = d.x1 - d.x0;
    const hgt = d.y1 - d.y0;
    if (w < 50 || hgt < 24) return;
    const g = d3.select(this);
    const fill = isHighlighted(d) ? '#fff' : 'rgba(255,255,255,0.55)';
    g.append('text').attr('class', 'tm-label')
      .attr('x', 10).attr('y', 22)
      .attr('font-size', Math.min(15, Math.max(11, w / 9)))
      .attr('fill', fill)
      .attr('pointer-events', 'none')
      .text(d.data.name);
    if (hgt > 44 && w > 60) {
      g.append('text').attr('class', 'tm-value')
        .attr('x', 10).attr('y', 40)
        .attr('font-size', 12)
        .attr('fill', fill)
        .attr('pointer-events', 'none')
        .text(fmtB(d.value));
    }
  });
}

// Agency rank list (no longer used — kept as no-op for safety)
function renderAgencyRank() {
  const list = document.getElementById('agency-rank');
  if (!list) return;
}

// ============================================================
// 02 — Purchases panel
// ============================================================
function renderPurchases() {
  const f = state.filter;

  // Figure out which "columns" to show based on filter
  // We always keep two columns (Civ | Def), but if filter is set, we show
  // the filtered side normally and gray out the other (or show as comparison).
  // For specific dept filter: show that dept on its civ/def side, comparison group on other side.
  const showCiv = (f.kind === 'all') || (f.kind === 'group' && f.value === 'Civilian') ||
                  (f.kind === 'dept' && dodLU[f.value] === 'Civilian');
  const showDef = (f.kind === 'all') || (f.kind === 'group' && f.value === 'Defense') ||
                  (f.kind === 'dept' && dodLU[f.value] === 'Defense');

  const civCol = document.querySelector('.purchases__col--civ');
  const defCol = document.querySelector('.purchases__col--def');
  civCol.classList.toggle('purchases__col--dim', !showCiv);
  defCol.classList.toggle('purchases__col--dim', !showDef);

  // For each side, decide the dept-key for totals + top5
  const civDept = (f.kind === 'dept' && dodLU[f.value] === 'Civilian') ? f.value : 'Civilian';
  const defDept = (f.kind === 'dept' && dodLU[f.value] === 'Defense') ? f.value : 'Defense';

  fillPurchasesSide('civ', civDept, showCiv);
  fillPurchasesSide('def', defDept, showDef);
}

function fillPurchasesSide(side, deptKey, active) {
  const isCiv = side === 'civ';
  const isAggregate = deptKey === 'Civilian' || deptKey === 'Defense';

  const totals = pscTotalsData.filter(d => d.dept === deptKey);
  const svc = (totals.find(d => d.psc_type === 'SERVICE') || { obs: 0 }).obs;
  const prod = (totals.find(d => d.psc_type === 'PRODUCT') || { obs: 0 }).obs;
  const total = svc + prod;
  const svcPct = total > 0 ? svc / total : 0;
  const prodPct = total > 0 ? prod / total : 0;

  const col = document.querySelector(`.purchases__col--${side}`);
  col.querySelector('h2').textContent = isAggregate ? `${deptKey} agencies` : `${deptKey} (${dodLU[deptKey] || ''})`;
  col.querySelector('.purchases__total').textContent = `${fmtB(total)} total`;

  // Update split blocks
  const items = col.querySelectorAll('.split__item');
  if (items.length >= 2) {
    // services first
    items[0].querySelector('.split__value').textContent = fmtB(svc);
    items[0].querySelector('.split__bar span').style.width = (svcPct * 100).toFixed(1) + '%';
    items[0].querySelector('.split__pct').textContent = (svcPct * 100).toFixed(0) + '%';
    items[1].querySelector('.split__value').textContent = fmtB(prod);
    items[1].querySelector('.split__bar span').style.width = (prodPct * 100).toFixed(1) + '%';
    items[1].querySelector('.split__pct').textContent = (prodPct * 100).toFixed(0) + '%';
  }

  // Update top5 lists
  const svcKey = `${side}-services`;
  const prodKey = `${side}-products`;
  const svcList = pscTop5Data.filter(d => d.dept === deptKey && d.psc_type === 'SERVICE').slice(0, 5);
  const prodList = pscTop5Data.filter(d => d.dept === deptKey && d.psc_type === 'PRODUCT').slice(0, 5);

  const svcEl = document.querySelector(`[data-list="${svcKey}"]`);
  const prodEl = document.querySelector(`[data-list="${prodKey}"]`);
  const renderList = items => items.length === 0
    ? '<li style="color:var(--c-ink-faint); font-style:italic">No data available</li>'
    : items.map((d, i) => `
      <li>
        <span class="rank">${i+1}</span>
        <span class="desc">${titlecase(d.psc_desc)}</span>
        <span class="val">${fmtSmart(d.obs)}</span>
      </li>
    `).join('');
  svcEl.innerHTML = renderList(svcList);
  prodEl.innerHTML = renderList(prodList);
}

function titlecase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bIt\b/g, 'IT').replace(/\bR&d\b/g, 'R&D').replace(/\bRdt&e\b/gi, 'RDT&E');
}

// ============================================================
// 03 — Vendors donut
// ============================================================
function renderDonut() {
  const el = document.getElementById('donut');
  el.innerHTML = '';
  const W = el.clientWidth || 700;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const f = state.filter;

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  if (f.kind === 'dept') {
    // Single-ring donut for one dept
    const rows = coSizeData.filter(d => d.dept === f.value && (d.co_size === 'SMALL BUSINESS' || d.co_size === 'OTHER THAN SMALL BUSINESS'));
    const sb = d3.sum(rows.filter(r => r.co_size === 'SMALL BUSINESS'), r => r.obs);
    const other = d3.sum(rows.filter(r => r.co_size === 'OTHER THAN SMALL BUSINESS'), r => r.obs);
    const total = sb + other;
    const ringColor = dodLU[f.value] === 'Defense' ? COLORS.def : COLORS.civ;
    const lightColor = dodLU[f.value] === 'Defense' ? '#4a7eb3' : COLORS.civLight;

    const arc = d3.arc().innerRadius(90).outerRadius(160);
    const pie = d3.pie().value(d => d.value).sort(null).startAngle(-Math.PI/2).endAngle(Math.PI*3/2);
    const data = [
      { name: 'Small business', value: sb, color: lightColor },
      { name: 'Other than small', value: other, color: ringColor }
    ];

    g.selectAll('arc').data(pie(data)).join('path')
      .attr('d', arc).attr('fill', d => d.data.color)
      .on('mousemove', (ev, d) => showTip(`<strong>${d.data.name}</strong><span class="tt-val">${fmtSmart(d.data.value)} · ${fmtPct1(d.data.value/total)}</span>`, ev))
      .on('mouseleave', hideTip);

    g.append('text').attr('text-anchor', 'middle').attr('y', -10)
      .attr('font-family', "'Merriweather', Georgia, serif")
      .attr('font-size', 18).attr('font-weight', 700).attr('fill', COLORS.ink)
      .text(f.value);
    g.append('text').attr('text-anchor', 'middle').attr('y', 14)
      .attr('font-family', "'Merriweather', Georgia, serif")
      .attr('font-size', 22).attr('font-weight', 700).attr('fill', COLORS.ink)
      .text(fmtB(total));
    g.append('text').attr('text-anchor', 'middle').attr('y', 32)
      .attr('font-size', 11).attr('fill', COLORS.muted)
      .attr('letter-spacing', '0.08em').text('TOTAL · ' + fmtPct1(sb/total) + ' SMALL BIZ');

    return;
  }

  // Aggregate (all or group)
  const filterGroup = f.kind === 'group' ? f.value : null;
  const buckets = { Civilian: { sb: 0, other: 0 }, Defense: { sb: 0, other: 0 } };
  coSizeData.forEach(d => {
    if (filterGroup && d.dod_civ !== filterGroup) return;
    if (d.co_size === 'SMALL BUSINESS') buckets[d.dod_civ].sb += d.obs;
    else if (d.co_size === 'OTHER THAN SMALL BUSINESS') buckets[d.dod_civ].other += d.obs;
  });
  const civTotal = buckets.Civilian.sb + buckets.Civilian.other;
  const defTotal = buckets.Defense.sb + buckets.Defense.other;
  const grand = civTotal + defTotal;

  const innerR = 70, midR = 115, outerR = 170;
  const innerArc = d3.arc().innerRadius(innerR).outerRadius(midR);
  const outerArc = d3.arc().innerRadius(midR + 4).outerRadius(outerR);
  const pie = d3.pie().value(d => d.value).sort(null).startAngle(-Math.PI/2).endAngle(Math.PI*3/2);

  let innerData;
  if (filterGroup === 'Civilian') {
    innerData = [{ name: 'Civilian', value: civTotal, color: COLORS.civ }];
  } else if (filterGroup === 'Defense') {
    innerData = [{ name: 'Defense', value: defTotal, color: COLORS.def }];
  } else {
    innerData = [
      { name: 'Civilian', value: civTotal, color: COLORS.civ },
      { name: 'Defense', value: defTotal, color: COLORS.def },
    ];
  }

  let outerData;
  if (filterGroup === 'Civilian') {
    outerData = [
      { group: 'Civilian', name: 'Small business', value: buckets.Civilian.sb, color: COLORS.civLight },
      { group: 'Civilian', name: 'Other than small', value: buckets.Civilian.other, color: COLORS.civ },
    ];
  } else if (filterGroup === 'Defense') {
    outerData = [
      { group: 'Defense', name: 'Small business', value: buckets.Defense.sb, color: '#4a7eb3' },
      { group: 'Defense', name: 'Other than small', value: buckets.Defense.other, color: COLORS.def },
    ];
  } else {
    outerData = [
      { group: 'Civilian', name: 'Small business', value: buckets.Civilian.sb, color: COLORS.civLight },
      { group: 'Civilian', name: 'Other than small', value: buckets.Civilian.other, color: COLORS.civ },
      { group: 'Defense', name: 'Other than small', value: buckets.Defense.other, color: COLORS.def },
      { group: 'Defense', name: 'Small business', value: buckets.Defense.sb, color: '#4a7eb3' },
    ];
  }

  g.selectAll('.inner-arc').data(pie(innerData)).join('path')
    .attr('d', innerArc).attr('fill', d => d.data.color)
    .on('mousemove', (ev, d) => showTip(`<strong>${d.data.name}</strong><span class="tt-val">${fmtB(d.data.value)} · ${fmtPct1(d.data.value/grand)}</span>`, ev))
    .on('mouseleave', hideTip);

  g.selectAll('.outer-arc').data(pie(outerData)).join('path')
    .attr('d', outerArc).attr('fill', d => d.data.color)
    .on('mousemove', (ev, d) => showTip(`<strong>${d.data.group} · ${d.data.name}</strong><span class="tt-val">${fmtB(d.data.value)} · ${fmtPct1(d.data.value/grand)}</span>`, ev))
    .on('mouseleave', hideTip);

  g.append('text').attr('text-anchor', 'middle').attr('y', -6)
    .attr('font-family', "'Merriweather', Georgia, serif")
    .attr('font-size', 24).attr('font-weight', 700).attr('fill', COLORS.ink)
    .text(fmtB(grand));
  g.append('text').attr('text-anchor', 'middle').attr('y', 14)
    .attr('font-size', 11).attr('fill', COLORS.muted)
    .attr('letter-spacing', '0.08em').text(filterGroup ? filterGroup.toUpperCase() : 'TOTAL OBLIGATIONS');

  // Group labels
  pie(innerData).forEach(d => {
    const ang = (d.startAngle + d.endAngle) / 2;
    const r = outerR + 22;
    const x = Math.sin(ang) * r;
    const y = -Math.cos(ang) * r;
    g.append('text').attr('text-anchor', 'middle').attr('x', x).attr('y', y)
      .attr('font-size', 13).attr('font-weight', 600).attr('fill', COLORS.ink)
      .text(d.data.name);
    g.append('text').attr('text-anchor', 'middle').attr('x', x).attr('y', y + 14)
      .attr('font-size', 11).attr('fill', COLORS.muted)
      .text(fmtPct1(d.data.value/grand));
  });
}

// Small biz rank
function renderSBRank() {
  const list = document.getElementById('sb-rank');
  const f = state.filter;
  let rows = coSizeData.filter(d => d.co_size === 'SMALL BUSINESS' || d.co_size === 'OTHER THAN SMALL BUSINESS');
  if (f.kind === 'group') rows = rows.filter(d => d.dod_civ === f.value);
  if (f.kind === 'dept') rows = rows.filter(d => d.dept === f.value);

  const byDept = d3.rollups(rows, v => ({
    total: d3.sum(v, x => x.obs),
    sb: d3.sum(v.filter(x => x.co_size === 'SMALL BUSINESS'), x => x.obs),
    group: v[0].dod_civ,
  }), d => d.dept)
    .map(([dept, vals]) => ({ dept, ...vals, pct: vals.sb / vals.total }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10);
  list.innerHTML = byDept.map((d, i) => `
    <li>
      <span class="rank">${String(i+1).padStart(2, '0')}</span>
      <span class="name"><span class="name__tag" style="background:${d.group === 'Defense' ? COLORS.def : COLORS.civ}"></span>${d.dept}</span>
      <span class="val">${fmtPct1(d.pct)}</span>
      <span class="bar-fill"><span style="width:${(d.pct*100).toFixed(1)}%; background:${d.group === 'Defense' ? COLORS.def : COLORS.civ}"></span></span>
    </li>
  `).join('');
}

// ============================================================
// 04 — Competition
// ============================================================
function renderCompetition() {
  const el = document.getElementById('competition');
  el.innerHTML = '';
  const W = el.clientWidth || 800;
  const H = 420;
  const f = state.filter;

  const pricings = ['FIXED PRICE', 'COST TYPE', 'TIME AND MATERIAL AND LABOR HOUR'];
  const pricingLabel = { 'FIXED PRICE': 'Fixed price', 'COST TYPE': 'Cost type', 'TIME AND MATERIAL AND LABOR HOUR': 'T&M / labor hour' };

  let groups = ['Civilian', 'Defense'];
  if (f.kind === 'group') groups = [f.value];
  let deptFilter = null;
  if (f.kind === 'dept') {
    deptFilter = f.value;
    groups = [dodLU[f.value]];
  }

  const data = {};
  groups.forEach(g => {
    data[g] = {};
    ['COMPETED', 'NOT COMPETED'].forEach(c => {
      data[g][c] = {};
      pricings.forEach(p => {
        data[g][c][p] = d3.sum(
          compData.filter(d => d.dod_civ === g && d.competed === c && d.pricing === p && (!deptFilter || d.dept === deptFilter)),
          d => d.obs
        );
      });
    });
  });

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const padding = 40;
  const colW = (W - padding * 2) / 2;
  const colCenters = [padding + colW / 2, padding + colW * 1.5];
  const colTitles = ['Competed', 'Not competed'];

  // bubble size scale based on max in filtered data
  let maxV = 0;
  groups.forEach(g => ['COMPETED','NOT COMPETED'].forEach(c => pricings.forEach(p => { if (data[g][c][p] > maxV) maxV = data[g][c][p]; })));
  if (maxV === 0) maxV = 1;
  const rScale = d3.scaleSqrt().domain([0, maxV]).range([0, 56]);

  // Column titles + totals
  colTitles.forEach((t, i) => {
    svg.append('text').attr('x', colCenters[i]).attr('y', 26).attr('text-anchor', 'middle')
      .attr('font-family', "'Merriweather', Georgia, serif").attr('font-size', 15).attr('font-weight', 700)
      .attr('fill', COLORS.ink).text(t);
    const compKey = i === 0 ? 'COMPETED' : 'NOT COMPETED';
    const tot = groups.reduce((s, g) => s + pricings.reduce((ss, p) => ss + data[g][compKey][p], 0), 0);
    const grandTot = groups.reduce((s, g) => s + ['COMPETED','NOT COMPETED'].reduce((ss, c) => ss + pricings.reduce((sss, p) => sss + data[g][c][p], 0), 0), 0);
    svg.append('text').attr('x', colCenters[i]).attr('y', 44).attr('text-anchor', 'middle')
      .attr('font-family', "'Roboto Mono', monospace").attr('font-size', 12).attr('fill', COLORS.muted)
      .text(`${fmtSmart(tot)} · ${grandTot > 0 ? fmtPct(tot/grandTot) : '—'}`);
  });

  // Vertical divider
  svg.append('line').attr('x1', W/2).attr('x2', W/2).attr('y1', 56).attr('y2', H - 60)
    .attr('stroke', COLORS.line).attr('stroke-dasharray', '3,3');

  const yRow = (i) => 110 + i * 80;
  const subOffset = colW / 4 - 8;
  const singleGroup = groups.length === 1;

  ['COMPETED', 'NOT COMPETED'].forEach((compKey, colIdx) => {
    const cx = colCenters[colIdx];

    // group sublabels
    if (!singleGroup) {
      svg.append('text').attr('x', cx - subOffset).attr('y', 72).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', COLORS.civ)
        .attr('letter-spacing', '0.08em').text('CIVILIAN');
      svg.append('text').attr('x', cx + subOffset).attr('y', 72).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', COLORS.def)
        .attr('letter-spacing', '0.08em').text('DEFENSE');
    } else {
      const gColor = groups[0] === 'Defense' ? COLORS.def : COLORS.civ;
      const lbl = deptFilter ? `${deptFilter.toUpperCase()} · ${groups[0].toUpperCase()}` : groups[0].toUpperCase();
      svg.append('text').attr('x', cx).attr('y', 72).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', gColor)
        .attr('letter-spacing', '0.08em').text(lbl);
    }

    pricings.forEach((p, rowIdx) => {
      const y = yRow(rowIdx);
      if (colIdx === 0) {
        svg.append('text').attr('x', 12).attr('y', y).attr('dominant-baseline', 'middle')
          .attr('font-size', 12).attr('fill', COLORS.ink).attr('font-weight', 500).text(pricingLabel[p]);
      }
      groups.forEach((grp, gIdx) => {
        const val = data[grp][compKey][p];
        const r = rScale(val);
        const bx = singleGroup ? cx : (cx + (gIdx === 0 ? -subOffset : subOffset));
        svg.append('circle').attr('cx', bx).attr('cy', y).attr('r', r)
          .attr('fill', grp === 'Defense' ? COLORS.def : COLORS.civ)
          .attr('opacity', 0.85)
          .on('mousemove', (ev) => showTip(`<strong>${grp} · ${compKey === 'COMPETED' ? 'Competed' : 'Not competed'} · ${pricingLabel[p]}</strong><span class="tt-val">${fmtSmart(val)}</span>`, ev))
          .on('mouseleave', hideTip);

        if (r > 16) {
          svg.append('text').attr('x', bx).attr('y', y + 4).attr('text-anchor', 'middle')
            .attr('font-family', "'Roboto Mono', monospace").attr('font-size', 11)
            .attr('fill', '#fff').attr('font-weight', 500)
            .text(fmtSmart(val));
        } else if (val > 1e8) {
          svg.append('text').attr('x', bx).attr('y', y + r + 12).attr('text-anchor', 'middle')
            .attr('font-family', "'Roboto Mono', monospace").attr('font-size', 10)
            .attr('fill', COLORS.muted).text(fmtSmart(val));
        }
      });
    });
  });

  svg.append('text').attr('x', 12).attr('y', H - 36)
    .attr('font-size', 11).attr('fill', COLORS.muted)
    .text('Bubble area is proportional to dollars obligated.');
}

// ============================================================
// 05 — OTA trend
// ============================================================
let otaMode = 'total';
function renderOTA() {
  const el = document.getElementById('ota');
  el.innerHTML = '';
  const W = el.clientWidth || 800;
  const H = 400;
  const margin = { top: 24, right: 24, bottom: 56, left: 56 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;
  const f = state.filter;

  // Filter ota data based on global filter
  let filteredOTA = otaData.slice();
  if (f.kind === 'group') filteredOTA = filteredOTA.filter(d => dodLU[d.dept] === f.value);
  if (f.kind === 'dept') filteredOTA = filteredOTA.filter(d => d.dept === f.value);

  // If filter has no data, show message
  if (filteredOTA.length === 0) {
    const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
    svg.append('text').attr('x', W/2).attr('y', H/2).attr('text-anchor', 'middle')
      .attr('font-size', 14).attr('fill', COLORS.muted)
      .text(`No OTA spending reported for ${f.value}.`);
    return;
  }

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const years = [...new Set(filteredOTA.map(d => d.fy))].sort();
  const depts = [...new Set(filteredOTA.map(d => d.dept))];

  const totals = years.map(y => ({
    fy: y,
    obs: d3.sum(filteredOTA.filter(d => d.fy === y), d => d.obs)
  }));
  const byDept = years.map(y => {
    const o = { fy: y };
    depts.forEach(dp => {
      o[dp] = (filteredOTA.find(d => d.fy === y && d.dept === dp) || { obs: 0 }).obs;
    });
    return o;
  });

  const x = d3.scaleLinear().domain([d3.min(years), d3.max(years)]).range([0, innerW]);
  const yMax = d3.max(totals, d => d.obs) * 1.15 || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([innerH, 0]);

  // Gridlines
  const ticks = y.ticks(5);
  g.selectAll('.gridline').data(ticks).join('line')
    .attr('x1', 0).attr('x2', innerW)
    .attr('y1', d => y(d)).attr('y2', d => y(d))
    .attr('stroke', COLORS.line).attr('stroke-dasharray', '2,3');

  g.append('g').attr('transform', `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues(years).tickFormat(d3.format('d')).tickSize(0).tickPadding(10))
    .call(s => s.selectAll('text').attr('font-size', 12).attr('fill', COLORS.ink))
    .call(s => s.select('.domain').attr('stroke', COLORS.line));

  g.append('g')
    .call(d3.axisLeft(y).tickValues(ticks).tickFormat(d => '$' + (d/1e9).toFixed(1) + 'B').tickSize(0).tickPadding(8))
    .call(s => s.selectAll('text').attr('font-size', 12).attr('fill', COLORS.muted))
    .call(s => s.select('.domain').remove());

  g.append('text').attr('x', -40).attr('y', -8)
    .attr('font-size', 11).attr('fill', COLORS.muted)
    .attr('letter-spacing', '0.06em').text('OBLIGATIONS');

  const useStacked = otaMode === 'stacked' && depts.length > 1;

  if (!useStacked) {
    const area = d3.area().x(d => x(d.fy)).y0(innerH).y1(d => y(d.obs)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d => x(d.fy)).y(d => y(d.obs)).curve(d3.curveMonotoneX);
    const lineColor = f.kind === 'group' ? (f.value === 'Defense' ? COLORS.def : COLORS.civ) :
                      f.kind === 'dept' ? (dodLU[f.value] === 'Defense' ? COLORS.def : COLORS.civ) :
                      COLORS.civ;

    g.append('path').datum(totals).attr('d', area).attr('fill', lineColor).attr('opacity', 0.12);
    g.append('path').datum(totals).attr('d', line).attr('fill', 'none').attr('stroke', lineColor).attr('stroke-width', 2.5);

    g.selectAll('.dot').data(totals).join('circle')
      .attr('cx', d => x(d.fy)).attr('cy', d => y(d.obs)).attr('r', 5)
      .attr('fill', '#fff').attr('stroke', lineColor).attr('stroke-width', 2)
      .on('mousemove', (ev, d) => showTip(`<strong>FY${d.fy}</strong><span class="tt-val">${fmtSmart(d.obs)}</span>`, ev))
      .on('mouseleave', hideTip);

    g.selectAll('.lbl').data(totals).join('text')
      .attr('x', d => x(d.fy)).attr('y', d => y(d.obs) - 14).attr('text-anchor', 'middle')
      .attr('font-family', "'Roboto Mono', monospace").attr('font-size', 12).attr('font-weight', 600)
      .attr('fill', lineColor).text(d => fmtSmart(d.obs));
  } else {
    const deptTotals = depts.map(dp => ({ dp, t: d3.sum(filteredOTA.filter(d => d.dept === dp), d => d.obs) }))
      .sort((a, b) => b.t - a.t);
    const order = deptTotals.map(d => d.dp);
    const stack = d3.stack().keys(order)(byDept);
    const palette = [COLORS.def, COLORS.civ, COLORS.civLight, COLORS.accent, COLORS.defDark, '#4a7eb3'];
    const colorScale = d3.scaleOrdinal().domain(order).range(palette);

    const area = d3.area()
      .x(d => x(d.data.fy))
      .y0(d => y(d[0])).y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    g.selectAll('.layer').data(stack).join('path')
      .attr('d', area).attr('fill', d => colorScale(d.key)).attr('opacity', 0.85)
      .on('mousemove', (ev, d) => {
        const totalAll = d3.sum(d, x => x[1]-x[0]);
        showTip(`<strong>${d.key}</strong> · 5-yr cumulative<span class="tt-val">${fmtSmart(totalAll)}</span>`, ev);
      })
      .on('mouseleave', hideTip);

    // legend
    const lg = svg.append('g').attr('transform', `translate(${margin.left}, ${H - 18})`);
    let lx = 0;
    order.forEach(k => {
      const item = lg.append('g').attr('transform', `translate(${lx}, 0)`);
      item.append('rect').attr('width', 10).attr('height', 10).attr('y', -8).attr('fill', colorScale(k));
      item.append('text').attr('x', 14).attr('y', 0).attr('font-size', 11).attr('fill', COLORS.ink).text(k);
      lx += 14 + k.length * 6.5 + 16;
    });
  }
}

document.querySelectorAll('[data-ota]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-ota]').forEach(b => b.classList.remove('chip--active'));
    btn.classList.add('chip--active');
    otaMode = btn.dataset.ota;
    renderOTA();
  });
});

function renderOTARank() {
  const list = document.getElementById('ota-rank');
  const f = state.filter;
  let rows = otaData.filter(d => d.fy === 2025);
  if (f.kind === 'group') rows = rows.filter(d => dodLU[d.dept] === f.value);
  if (f.kind === 'dept') rows = rows.filter(d => d.dept === f.value);
  const fy2025 = rows.sort((a, b) => b.obs - a.obs);
  if (fy2025.length === 0) {
    list.innerHTML = '<li style="color:var(--c-ink-faint); font-style:italic; padding:14px 16px">No OTA data for this filter.</li>';
    return;
  }
  list.innerHTML = fy2025.map((d, i) => `
    <li>
      <span class="rank">${String(i+1).padStart(2, '0')}</span>
      <span class="name">${d.dept}</span>
      <span class="val">${fmtSmart(d.obs)}</span>
      <span class="bar-fill"><span style="width:${(d.obs/fy2025[0].obs*100).toFixed(1)}%; background:${dodLU[d.dept] === 'Defense' ? COLORS.def : COLORS.civ}"></span></span>
    </li>
  `).join('');
}

// ============================================================
// Render orchestration
// ============================================================
function renderAll() {
  renderTreemap();
  renderAgencyRank();
  renderPurchases();
  renderDonut();
  renderSBRank();
  renderCompetition();
  renderOTA();
  renderOTARank();
}

populateAgencySelect();
bindAgencySelect();
syncFilterUI();
renderAll();
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderAll, 200);
});
