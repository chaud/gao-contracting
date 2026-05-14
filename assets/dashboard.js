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
  updateHash();
  if (tip) tip.hidden = true;
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

// Handle dropdown changes and delegate clicks from non-select parts of
// the field (the swatch and caret) to the native picker.
function bindAgencySelect() {
  const select = document.getElementById('agency-select');
  const field = document.querySelector('.agency-picker__field');
  select.addEventListener('change', () => {
    const v = select.value;
    if (v === 'all') return clearFilter();
    const [kind, value] = v.split(':');
    setFilter(kind, value);
  });
  if (field) {
    // mousedown (not click) — native selects open on mousedown, so
    // matching it makes a tap on the swatch feel as instant as a tap
    // on the select itself.
    field.addEventListener('mousedown', (e) => {
      if (e.target === select) return; // native handler runs
      e.preventDefault(); // keep focus from jumping to field first
      if (typeof select.showPicker === 'function') {
        try { select.showPicker(); } catch (_) { select.focus(); }
      } else {
        select.focus();
      }
    });
  }
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
const navPrev = document.getElementById('nav-prev');
const navNext = document.getElementById('nav-next');
function updateNavArrows() {
  const idx = Array.from(tabs).findIndex(t => t.getAttribute('aria-selected') === 'true');
  navPrev.hidden = idx <= 0;
  navNext.hidden = idx >= tabs.length - 1;
}

// Read/write URL hash without growing history. Format:
//   #<tab>[&agency=<kind>:<value>]
// e.g. #purchases, #vendors&agency=group:Defense, #ota&agency=dept:Navy
function getHashState() {
  const raw = location.hash.slice(1);
  if (!raw) return {};
  const parts = raw.split('&');
  const tab = parts[0] || null;
  let agency = null;
  for (let i = 1; i < parts.length; i++) {
    const [k, v] = parts[i].split('=');
    if (k === 'agency' && v) agency = decodeURIComponent(v);
  }
  return { tab, agency };
}
function updateHash() {
  const sel = Array.from(tabs).find(t => t.getAttribute('aria-selected') === 'true');
  if (!sel) return;
  let hash = '#' + sel.dataset.tab;
  const f = state.filter;
  if (f.kind !== 'all') {
    hash += '&agency=' + encodeURIComponent(f.kind + ':' + f.value);
  }
  if (location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

function applyTabKey(key) {
  const target = Array.from(tabs).find(t => t.dataset.tab === key);
  if (!target) return false;
  tabs.forEach(x => x.setAttribute('aria-selected', 'false'));
  target.setAttribute('aria-selected', 'true');
  Object.entries(panels).forEach(([k, el]) => el.classList.toggle('hidden', k !== key));
  updateNavArrows();
  return true;
}

function selectTab(t) {
  applyTabKey(t.dataset.tab);
  updateHash();
  renderAll();
}
tabs.forEach(t => t.addEventListener('click', () => selectTab(t)));
navPrev.addEventListener('click', () => {
  const idx = Array.from(tabs).findIndex(t => t.getAttribute('aria-selected') === 'true');
  if (idx > 0) selectTab(tabs[idx - 1]);
});
navNext.addEventListener('click', () => {
  const idx = Array.from(tabs).findIndex(t => t.getAttribute('aria-selected') === 'true');
  if (idx < tabs.length - 1) selectTab(tabs[idx + 1]);
});

// Sync state from URL hash (initial load + manual hash edit). Avoids
// calling selectTab/setFilter to keep this idempotent and prevent
// repeated history writes.
function selectFromHash() {
  const { tab, agency } = getHashState();
  if (tab) applyTabKey(tab);
  if (agency) {
    const idx = agency.indexOf(':');
    if (idx > 0) {
      state.filter = { kind: agency.slice(0, idx), value: agency.slice(idx + 1) };
    }
  } else {
    state.filter = { kind: 'all', value: 'all' };
  }
  syncFilterUI();
  renderAll();
}
window.addEventListener('hashchange', selectFromHash);
updateNavArrows();

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
// Touch-only devices synthesize a mousemove on tap but never fire
// mouseleave — that's why tooltips stuck open on mobile. Skip the
// tooltip entirely when the device lacks real hover capability.
const HAS_HOVER = typeof window.matchMedia === 'function'
  && window.matchMedia('(hover: hover)').matches;
function showTip(html, ev) {
  if (!HAS_HOVER) return;
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
    .text(d => {
      // If the band is too narrow to fit both, drop the dollar value.
      const bandW = d.x1 - d.x0;
      const full = `${d.data.name.toUpperCase()} · ${fmtB(d.value)}`;
      return bandW < 160 ? d.data.name.toUpperCase() : full;
    });

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
  const colors = isCiv
    ? { svc: '#005ea2', prod: '#73b3e7' }
    : { svc: '#1a4480', prod: '#162e51' };
  const renderList = (items, color) => {
    if (items.length === 0) {
      return '<li class="top5__empty">No data available</li>';
    }
    const max = d3.max(items, d => d.obs) || 1;
    return items.map((d, i) => {
      const pct = (d.obs / max * 100).toFixed(1);
      return `
        <li>
          <span class="rank">${i+1}</span>
          <span class="desc">${titlecase(d.psc_desc)}</span>
          <span class="top5__bar"><span style="width:${pct}%; background:${color}"></span></span>
          <span class="val">${fmtSmart(d.obs)}</span>
        </li>`;
    }).join('');
  };
  svcEl.innerHTML = renderList(svcList, colors.svc);
  prodEl.innerHTML = renderList(prodList, colors.prod);
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
  const f = state.filter;

  // Build group rows based on filter
  let groups;
  if (f.kind === 'dept') {
    const rows = coSizeData.filter(d => d.dept === f.value && (d.co_size === 'SMALL BUSINESS' || d.co_size === 'OTHER THAN SMALL BUSINESS'));
    const sb = d3.sum(rows.filter(r => r.co_size === 'SMALL BUSINESS'), r => r.obs);
    const other = d3.sum(rows.filter(r => r.co_size === 'OTHER THAN SMALL BUSINESS'), r => r.obs);
    const grp = dodLU[f.value];
    groups = [{
      name: f.value,
      color: grp === 'Defense' ? COLORS.def : COLORS.civ,
      lightColor: grp === 'Defense' ? '#73b3e7' : COLORS.civLight,
      sb, other, total: sb + other,
    }];
  } else {
    const filterGroup = f.kind === 'group' ? f.value : null;
    const buckets = { Civilian: { sb: 0, other: 0 }, Defense: { sb: 0, other: 0 } };
    coSizeData.forEach(d => {
      if (filterGroup && d.dod_civ !== filterGroup) return;
      if (d.co_size === 'SMALL BUSINESS') buckets[d.dod_civ].sb += d.obs;
      else if (d.co_size === 'OTHER THAN SMALL BUSINESS') buckets[d.dod_civ].other += d.obs;
    });
    const groupList = filterGroup ? [filterGroup] : ['Civilian', 'Defense'];
    groups = groupList.map(grp => ({
      name: grp,
      color: grp === 'Defense' ? COLORS.def : COLORS.civ,
      lightColor: grp === 'Defense' ? '#73b3e7' : COLORS.civLight,
      sb: buckets[grp].sb,
      other: buckets[grp].other,
      total: buckets[grp].sb + buckets[grp].other,
    }));
  }
  groups = groups.filter(g => g.total > 0);
  if (groups.length === 0) return;

  // Layout — on narrow widths, fold the +/- pp delta into the header
  // line and drop the right-side gutter so the bar can use full width.
  const isNarrow = W < 480;
  const barH = isNarrow ? 64 : 72;
  const rowGap = isNarrow ? 64 : 72;
  const margin = isNarrow
    ? { top: 32, right: 16, bottom: 28, left: 12 }
    : { top: 32, right: 150, bottom: 28, left: 24 };
  const innerW = W - margin.left - margin.right;
  const H = margin.top + margin.bottom + groups.length * barH + (groups.length - 1) * rowGap;

  const maxTotal = d3.max(groups, g => g.total) || 1;
  const xScale = d3.scaleLinear().domain([0, maxTotal]).range([0, innerW]);
  const GOAL = 0.23;

  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);
  const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  groups.forEach((grp, i) => {
    const y = i * (barH + rowGap);
    const sbW = xScale(grp.sb);
    const otherW = xScale(grp.other);
    const sbPct = grp.sb / grp.total;
    const otherPct = grp.other / grp.total;
    const delta = (sbPct - GOAL) * 100;
    const aboveGoal = delta >= 0;

    // Section header (group name) on left, total + (mobile only) delta on right
    root.append('text').attr('x', 0).attr('y', y - 10)
      .attr('font-size', 12).attr('font-weight', 700)
      .attr('letter-spacing', '0.08em').attr('fill', grp.color)
      .text(grp.name.toUpperCase());
    const totalText = isNarrow
      ? `${fmtSmart(grp.total)}  ·  ${(aboveGoal ? '+' : '')}${delta.toFixed(1)} pp`
      : fmtSmart(grp.total) + ' total';
    const totalEl = root.append('text').attr('x', innerW).attr('y', y - 10)
      .attr('text-anchor', 'end').attr('font-family', "'Roboto Mono', monospace")
      .attr('font-size', 13).attr('font-weight', 500).attr('fill', COLORS.ink);
    if (isNarrow) {
      // Render total + colored delta in one line via tspans
      totalEl.append('tspan').text(fmtSmart(grp.total) + '  ·  ');
      totalEl.append('tspan').attr('fill', aboveGoal ? '#1a8a55' : '#b5483b')
        .attr('font-weight', 700)
        .text((aboveGoal ? '+' : '') + delta.toFixed(1) + ' pp');
    } else {
      totalEl.text(totalText);
    }

    // Bar segments
    root.append('rect').attr('x', 0).attr('y', y).attr('width', sbW).attr('height', barH)
      .attr('fill', grp.lightColor)
      .on('mousemove', ev => showTip(`<strong>${grp.name} · Small business</strong><span class="tt-val">${fmtSmart(grp.sb)} · ${fmtPct1(sbPct)}</span>`, ev))
      .on('mouseleave', hideTip);
    root.append('rect').attr('x', sbW).attr('y', y).attr('width', otherW).attr('height', barH)
      .attr('fill', grp.color)
      .on('mousemove', ev => showTip(`<strong>${grp.name} · Other than small</strong><span class="tt-val">${fmtSmart(grp.other)} · ${fmtPct1(otherPct)}</span>`, ev))
      .on('mouseleave', hideTip);

    // In-segment percentage labels (only if the segment is wide enough)
    if (sbW > 56) {
      root.append('text').attr('x', sbW / 2).attr('y', y + barH/2 - 4)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', COLORS.ink).attr('font-weight', 700).attr('font-size', 20)
        .attr('font-family', "'Merriweather', Georgia, serif")
        .text(fmtPct1(sbPct));
      root.append('text').attr('x', sbW / 2).attr('y', y + barH/2 + 18)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', COLORS.ink).attr('font-size', 11)
        .text(fmtSmart(grp.sb));
    }
    if (otherW > 80) {
      root.append('text').attr('x', sbW + otherW/2).attr('y', y + barH/2 - 4)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', '#fff').attr('font-weight', 700).attr('font-size', 22)
        .attr('font-family', "'Merriweather', Georgia, serif")
        .text(fmtPct1(otherPct));
      root.append('text').attr('x', sbW + otherW/2).attr('y', y + barH/2 + 20)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', 'rgba(255,255,255,0.85)').attr('font-size', 11)
        .text(fmtSmart(grp.other));
    }

    // 25% goal marker — dashed line spanning the bar height plus a small tag
    const goalX = xScale(grp.total * GOAL);
    root.append('line').attr('x1', goalX).attr('x2', goalX)
      .attr('y1', y - 8).attr('y2', y + barH + 8)
      .attr('stroke', COLORS.ink).attr('stroke-width', 1.5).attr('stroke-dasharray', '4,3');
    root.append('text').attr('x', goalX).attr('y', y + barH + 22)
      .attr('text-anchor', 'middle').attr('font-size', 10)
      .attr('fill', COLORS.muted).attr('letter-spacing', '0.05em')
      .text('23% GOAL');

    // Performance indicator — how this sector compares to the goal.
    // On narrow widths it's folded into the header line above instead.
    if (!isNarrow) {
      const indicator = root.append('text').attr('x', sbW + otherW + 14).attr('y', y + barH/2)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 13).attr('font-weight', 600);
      indicator.append('tspan').attr('fill', aboveGoal ? '#1a8a55' : '#b5483b')
        .text((aboveGoal ? '+' : '') + delta.toFixed(1) + ' pp');
      root.append('text').attr('x', sbW + otherW + 14).attr('y', y + barH/2 + 16)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10).attr('fill', COLORS.muted)
        .attr('letter-spacing', '0.05em').text('vs. goal');
    }
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
  let H = 460;
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

  // On narrow widths, stack the two columns vertically — each section
  // (Competed / Not competed) gets the full width.
  const isNarrow = W < 500;
  const compKeys = ['COMPETED', 'NOT COMPETED'];
  const colTitles = ['Competed', 'Not competed'];

  // bubble size scale based on max in filtered data
  let maxV = 0;
  groups.forEach(g => compKeys.forEach(c => pricings.forEach(p => { if (data[g][c][p] > maxV) maxV = data[g][c][p]; })));
  if (maxV === 0) maxV = 1;
  // Cap bubble radius so two adjacent bubbles in a row never collide,
  // and on mobile reserve room on the left for the pricing row label.
  const padding = isNarrow ? 12 : 40;
  const labelGutter = isNarrow ? 76 : 0;
  const bubbleAreaW = isNarrow ? (W - padding * 2 - labelGutter) : (W - padding * 2);
  const colW = isNarrow ? bubbleAreaW : bubbleAreaW / 2;
  const subOffset = isNarrow ? Math.min(colW / 4, 60) : colW / 4 - 8;
  const maxR = Math.max(14, Math.min(42, subOffset - 6));
  const rScale = d3.scaleSqrt().domain([0, maxV]).range([0, maxR]);

  // Recompute H based on layout: stacked sections are taller than side-by-side
  const sectionHeader = isNarrow ? 60 : 0;     // title + sub on each section in narrow
  const groupSubLabel = 24;
  const rowGap = isNarrow ? Math.max(maxR * 2 + 18, 70) : 92;
  const sectionH = (isNarrow ? sectionHeader : 86) + groupSubLabel + rowGap * 3 + 24;
  H = isNarrow ? sectionH * 2 + 40 : 460;
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H);

  if (!isNarrow) {
    // Side-by-side columns
    const colCenters = [padding + colW / 2, padding + colW * 1.5];

    // Column titles + totals
    colTitles.forEach((t, i) => {
      svg.append('text').attr('x', colCenters[i]).attr('y', 26).attr('text-anchor', 'middle')
        .attr('font-family', "'Merriweather', Georgia, serif").attr('font-size', 15).attr('font-weight', 700)
        .attr('fill', COLORS.ink).text(t);
      const compKey = compKeys[i];
      const tot = groups.reduce((s, g) => s + pricings.reduce((ss, p) => ss + data[g][compKey][p], 0), 0);
      const grandTot = groups.reduce((s, g) => s + compKeys.reduce((ss, c) => ss + pricings.reduce((sss, p) => sss + data[g][c][p], 0), 0), 0);
      svg.append('text').attr('x', colCenters[i]).attr('y', 44).attr('text-anchor', 'middle')
        .attr('font-family', "'Roboto Mono', monospace").attr('font-size', 12).attr('fill', COLORS.muted)
        .text(`${fmtSmart(tot)} · ${grandTot > 0 ? fmtPct(tot/grandTot) : '—'}`);
    });

    // Vertical divider
    svg.append('line').attr('x1', W/2).attr('x2', W/2).attr('y1', 56).attr('y2', H - 60)
      .attr('stroke', COLORS.line).attr('stroke-dasharray', '3,3');
  }

  const yRow = (rowIdx, sectionTop) => sectionTop + rowGap / 2 + rowIdx * rowGap;
  const singleGroup = groups.length === 1;

  compKeys.forEach((compKey, colIdx) => {
    let cx, sectionTop, sublabelY;
    if (isNarrow) {
      // Each section stacks vertically, full width
      sectionTop = colIdx * sectionH + 26 + groupSubLabel;
      cx = padding + labelGutter + colW / 2;
      sublabelY = colIdx * sectionH + 26 + groupSubLabel - 8;
      // Section header
      const compTot = groups.reduce((s, g) => s + pricings.reduce((ss, p) => ss + data[g][compKey][p], 0), 0);
      const grandTot = groups.reduce((s, g) => s + compKeys.reduce((ss, c) => ss + pricings.reduce((sss, p) => sss + data[g][c][p], 0), 0), 0);
      svg.append('text').attr('x', padding).attr('y', colIdx * sectionH + 22)
        .attr('font-family', "'Merriweather', Georgia, serif").attr('font-size', 15).attr('font-weight', 700)
        .attr('fill', COLORS.ink).text(colTitles[colIdx]);
      svg.append('text').attr('x', W - padding).attr('y', colIdx * sectionH + 22)
        .attr('text-anchor', 'end').attr('font-family', "'Roboto Mono', monospace")
        .attr('font-size', 12).attr('fill', COLORS.muted)
        .text(`${fmtSmart(compTot)} · ${grandTot > 0 ? fmtPct(compTot/grandTot) : '—'}`);
      if (colIdx === 1) {
        // Divider line between sections
        svg.append('line').attr('x1', padding).attr('x2', W - padding)
          .attr('y1', colIdx * sectionH - 4).attr('y2', colIdx * sectionH - 4)
          .attr('stroke', COLORS.line).attr('stroke-dasharray', '3,3');
      }
    } else {
      const colCenters = [padding + colW / 2, padding + colW * 1.5];
      cx = colCenters[colIdx];
      sectionTop = 86;
      sublabelY = 86;
    }

    // group sublabels
    if (!singleGroup) {
      svg.append('text').attr('x', cx - subOffset).attr('y', sublabelY).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', COLORS.civ)
        .attr('letter-spacing', '0.08em').text('CIVILIAN');
      svg.append('text').attr('x', cx + subOffset).attr('y', sublabelY).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', COLORS.def)
        .attr('letter-spacing', '0.08em').text('DEFENSE');
    } else {
      const gColor = groups[0] === 'Defense' ? COLORS.def : COLORS.civ;
      const lbl = deptFilter ? `${deptFilter.toUpperCase()} · ${groups[0].toUpperCase()}` : groups[0].toUpperCase();
      svg.append('text').attr('x', cx).attr('y', sublabelY).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 700).attr('fill', gColor)
        .attr('letter-spacing', '0.08em').text(lbl);
    }

    pricings.forEach((p, rowIdx) => {
      const y = isNarrow
        ? sectionTop + rowIdx * rowGap + rowGap / 2
        : (150 + rowIdx * 92);
      if (colIdx === 0) {
        const labelText = isNarrow && p === 'TIME AND MATERIAL AND LABOR HOUR' ? 'T&M' : pricingLabel[p];
        const labelX = isNarrow ? padding : 12;
        svg.append('text').attr('x', labelX).attr('y', y).attr('dominant-baseline', 'middle')
          .attr('font-size', 12).attr('fill', COLORS.ink).attr('font-weight', 500).text(labelText);
      }
      groups.forEach((grp, gIdx) => {
        const val = data[grp][compKey][p];
        // Sums can be negative (deobligations/corrections); clamp so the
        // radius doesn't go negative and break SVG parsing.
        const r = rScale(Math.max(0, val));
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

// Competition rate by pricing type — what share of dollars in each
// pricing bucket was awarded competitively. Respects global filter.
const PRICING_LABEL = {
  'FIXED PRICE': 'Fixed price',
  'COST TYPE': 'Cost type',
  'TIME AND MATERIAL AND LABOR HOUR': 'T&M / labor hour',
};
function renderPricingCompetition() {
  const list = document.getElementById('pricing-comp-rank');
  if (!list) return;
  const f = state.filter;
  let rows = compData.filter(d => PRICING_LABEL[d.pricing]);
  if (f.kind === 'group') rows = rows.filter(d => d.dod_civ === f.value);
  if (f.kind === 'dept') rows = rows.filter(d => d.dept === f.value);

  const stats = Object.keys(PRICING_LABEL).map(p => {
    const competed = d3.sum(rows.filter(d => d.pricing === p && d.competed === 'COMPETED'), d => d.obs);
    const notc = d3.sum(rows.filter(d => d.pricing === p && d.competed === 'NOT COMPETED'), d => d.obs);
    const total = competed + notc;
    return { pricing: p, label: PRICING_LABEL[p], competed, total, rate: total > 0 ? competed / total : 0 };
  }).filter(s => s.total > 0).sort((a, b) => b.rate - a.rate);

  if (stats.length === 0) {
    list.innerHTML = '<li style="color:var(--c-ink-faint); font-style:italic; padding:14px 16px">No data for this filter.</li>';
    return;
  }
  list.innerHTML = stats.map((s, i) => `
    <li>
      <span class="rank">${String(i+1).padStart(2, '0')}</span>
      <span class="name">${s.label}</span>
      <span class="val">${(s.rate * 100).toFixed(1)}%</span>
      <span class="bar-fill"><span style="width:${(s.rate * 100).toFixed(1)}%; background:${COLORS.civ}"></span></span>
    </li>
  `).join('');
}

// When a single dept is selected, the gov-wide aside content
// (rankings, gov-wide callout) collapses to be useless. Swap in
// dept-specific OTA facts instead.
function renderOTAAside() {
  const defaultEl = document.getElementById('ota-aside-default');
  const deptEl = document.getElementById('ota-aside-dept');
  if (!defaultEl || !deptEl) return;
  const f = state.filter;

  if (f.kind !== 'dept') {
    defaultEl.hidden = false;
    deptEl.hidden = true;
    deptEl.innerHTML = '';
    return;
  }

  defaultEl.hidden = true;
  deptEl.hidden = false;

  const dept = f.value;
  const grp = dodLU[dept];
  const tagColor = grp === 'Defense' ? COLORS.def : COLORS.civ;
  const tagHtml = `<span class="name__tag" style="background:${tagColor}"></span>`;

  const deptOTA = otaData.filter(d => d.dept === dept).sort((a, b) => a.fy - b.fy);
  if (deptOTA.length === 0 || d3.sum(deptOTA, d => d.obs) === 0) {
    deptEl.innerHTML = `
      <div class="dept-facts">
        <div class="dept-facts__head">
          ${tagHtml}<span class="dept-facts__name">${dept}</span>
          <span class="dept-facts__kicker">OTA</span>
        </div>
        <div class="dept-facts__empty">
          No OTA spending reported for <strong>${dept}</strong> in FY21–FY25. OTA usage is concentrated in DoD R&D-focused services (Army, Air Force).
        </div>
      </div>`;
    return;
  }

  const total5y = d3.sum(deptOTA, d => d.obs);
  const fy25 = (deptOTA.find(d => d.fy === 2025) || { obs: 0 }).obs;
  const fy24 = (deptOTA.find(d => d.fy === 2024) || { obs: 0 }).obs;
  const yoy = fy25 - fy24;
  const yoyPct = fy24 !== 0 ? (yoy / fy24) * 100 : null;
  const peak = deptOTA.reduce((a, b) => b.obs > a.obs ? b : a);
  const deptTotal = (deptData.find(d => d.dept === dept) || { obs: 0 }).obs;
  const sharePct = deptTotal > 0 ? (fy25 / deptTotal) * 100 : null;

  const yoyClass = yoy >= 0 ? 'dept-facts__delta--up' : 'dept-facts__delta--down';
  const yoySign = yoy >= 0 ? '+' : '−';
  const yoyAbs = Math.abs(yoy);
  const yoyPctText = yoyPct !== null ? ` (${yoy >= 0 ? '+' : '−'}${Math.abs(yoyPct).toFixed(1)}%)` : '';

  deptEl.innerHTML = `
    <div class="dept-facts">
      <div class="dept-facts__head">
        ${tagHtml}<span class="dept-facts__name">${dept}</span>
        <span class="dept-facts__kicker">OTA</span>
      </div>
      <div class="dept-facts__row">
        <div>
          <div class="dept-facts__lbl">FY25 OTA obligations</div>
        </div>
        <div class="dept-facts__val">${fmtSmart(fy25)}</div>
      </div>
      <div class="dept-facts__row">
        <div>
          <div class="dept-facts__lbl">FY25 vs FY24</div>
        </div>
        <div>
          <div class="dept-facts__val ${yoyClass}">${yoySign}${fmtSmart(yoyAbs)}</div>
          <div class="dept-facts__sub">${yoyPctText.trim() || '—'}</div>
        </div>
      </div>
      <div class="dept-facts__row">
        <div>
          <div class="dept-facts__lbl">5-year total (FY21–25)</div>
        </div>
        <div class="dept-facts__val">${fmtSmart(total5y)}</div>
      </div>
      <div class="dept-facts__row">
        <div>
          <div class="dept-facts__lbl">Peak year</div>
        </div>
        <div>
          <div class="dept-facts__val">FY${peak.fy}</div>
          <div class="dept-facts__sub">${fmtSmart(peak.obs)}</div>
        </div>
      </div>
      <div class="dept-facts__row">
        <div>
          <div class="dept-facts__lbl">OTA / total, FY25</div>
        </div>
        <div class="dept-facts__val">${sharePct !== null ? sharePct.toFixed(1) + '%' : '—'}</div>
      </div>
    </div>`;
}

// OTA share of each department's total contracting (FY2025). Surfaces
// who *leans on* OTAs the most, not just absolute dollar size.
function renderOTAShare() {
  const list = document.getElementById('ota-share-rank');
  if (!list) return;
  const f = state.filter;
  let otaRows = otaData.filter(d => d.fy === 2025);
  if (f.kind === 'group') otaRows = otaRows.filter(d => dodLU[d.dept] === f.value);
  if (f.kind === 'dept') otaRows = otaRows.filter(d => d.dept === f.value);

  const rows = otaRows.map(r => {
    const dept = deptData.find(x => x.dept === r.dept);
    const total = dept ? dept.obs : 0;
    return { dept: r.dept, ota: r.obs, total, share: total > 0 ? r.obs / total : 0 };
  }).filter(d => d.total > 0).sort((a, b) => b.share - a.share);

  if (rows.length === 0) {
    list.innerHTML = '<li style="color:var(--c-ink-faint); font-style:italic; padding:14px 16px">No OTA data for this filter.</li>';
    return;
  }
  const maxShare = rows[0].share || 1;
  list.innerHTML = rows.map((d, i) => `
    <li>
      <span class="rank">${String(i+1).padStart(2, '0')}</span>
      <span class="name"><span class="name__tag" style="background:${dodLU[d.dept] === 'Defense' ? COLORS.def : COLORS.civ}"></span>${d.dept}</span>
      <span class="val">${(d.share * 100).toFixed(1)}%</span>
      <span class="bar-fill"><span style="width:${(d.share / maxShare * 100).toFixed(1)}%; background:${dodLU[d.dept] === 'Defense' ? COLORS.def : COLORS.civ}"></span></span>
    </li>
  `).join('');
}

// ============================================================
// Hero KPI strip — currently only the small-business rate is computed
// from data; other KPIs in the strip are static markup.
// ============================================================
const SB_GOAL = 0.23;
function renderHeroKPIs() {
  const sb = d3.sum(coSizeData.filter(d => d.co_size === 'SMALL BUSINESS'), d => d.obs);
  const other = d3.sum(coSizeData.filter(d => d.co_size === 'OTHER THAN SMALL BUSINESS'), d => d.obs);
  const total = sb + other;
  const rate = total > 0 ? sb / total : 0;

  const valueEl = document.getElementById('kpi-sb-value');
  const subEl = document.getElementById('kpi-sb-sub');
  if (valueEl) {
    valueEl.innerHTML = (rate * 100).toFixed(0) + '<span class="kpi__unit">%</span>';
  }
  if (subEl) {
    const deltaPp = (rate - SB_GOAL) * 100;
    if (deltaPp >= 0) {
      subEl.textContent = `Met ${(SB_GOAL * 100).toFixed(0)}% government-wide goal`;
    } else {
      subEl.textContent = `${Math.abs(deltaPp).toFixed(1)} pp below ${(SB_GOAL * 100).toFixed(0)}% goal`;
    }
  }
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
  renderPricingCompetition();
  renderOTA();
  renderOTARank();
  renderOTAShare();
  renderOTAAside();
}

populateAgencySelect();
bindAgencySelect();
renderHeroKPIs();
// Initial render. selectFromHash handles syncing UI + rendering when a
// hash is present; otherwise we render once with default state. Both
// paths run after the file's `let` declarations (e.g. otaMode) so
// render callbacks won't hit a temporal-dead-zone reference.
if (location.hash) {
  selectFromHash();
} else {
  syncFilterUI();
  renderAll();
}
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(renderAll, 200);
});
