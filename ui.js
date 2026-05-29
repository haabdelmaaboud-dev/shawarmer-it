/* =====================================================
   ui.js — Enterprise UI Components & Helpers v5.1
   ===================================================== */
const UI = {

  setSync(state, label) {
    const dot = document.getElementById('syncDot');
    const lbl = document.getElementById('syncLabel');
    if (!dot) return;
    dot.className = 'sync-dot' + (state === 'busy' ? ' busy' : state === 'offline' ? ' offline' : '');
    if (lbl) lbl.textContent = label || (state === 'live' ? 'Live' : state === 'busy' ? 'Syncing…' : 'Offline');
  },

  setLoader(pct, msg) {
    const f = document.getElementById('loaderFill');
    const m = document.getElementById('loaderMsg');
    if (f) f.style.width = pct + '%';
    if (m) m.textContent = msg;
  },

  showContentLoader(show) {
    const el = document.getElementById('contentLoader');
    if (el) el.classList.toggle('hidden', !show);
  },

  toast(msg, type = 'info', duration = 4000) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const icons = { ok:'ti-circle-check', err:'ti-alert-circle', info:'ti-info-circle', warn:'ti-alert-triangle' };
    const cls   = { ok:'toast-ok', err:'toast-err', info:'toast-info', warn:'toast-warn' };
    const el    = document.createElement('div');
    el.className = `toast-item ${cls[type] || 'toast-info'}`;
    el.innerHTML = `<i class="ti ${icons[type] || 'ti-info-circle'}"></i><span>${msg}</span><button onclick="this.parentElement.remove()"><i class="ti ti-x"></i></button>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 300); }, duration);
  },

  openModal(title, body, footer) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML   = body;
    document.getElementById('modalFooter').innerHTML = footer || '';
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = '';
    STATE.editId = null;
  },

  confirm(msg, onConfirm, danger = true) {
    UI.openModal(
      'Confirm Action',
      `<div class="confirm-msg"><i class="ti ti-alert-triangle" style="color:var(--warning);font-size:32px"></i><p>${msg}</p></div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn ${danger ? 'btn-danger' : 'btn-brand'}" onclick="(${onConfirm.toString()})();UI.closeModal()">Confirm</button>`
    );
  },

  initials(name) {
    return (name || '').split(' ').map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
  },

  roleLabel(r) { return { admin:'Admin', engineer:'Engineer', area:'Area Manager', ops:'Ops Manager' }[r] || r; },
  roleCls(r)   { return { admin:'rc-admin', engineer:'rc-eng', area:'rc-area', ops:'rc-ops' }[r] || ''; },

  greeting(name) {
    const h = new Date().getHours();
    let text = 'Good Evening';
    if (h < 12) text = 'Good Morning';
    else if (h < 17) text = 'Good Afternoon';
    return name ? `${text}, ${name.split(' ')[0]}` : text;
  },

  formatDate() {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return {
      day: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
      weekday: days[d.getDay()]
    };
  },

  kpiCard({ icon, iconClass, label, value, sub, trend, trendDir }) {
    const trendHtml = trend ? `<span class="kpi-trend ${trendDir}">${trend}</span>` : '';
    return `
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon-wrap ${iconClass}"><i class="ti ${icon}"></i></div>
          ${trendHtml}
        </div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-label">${label}</div>
        ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
      </div>`;
  },

  progressRing(pct, size = 140) {
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return `
      <div class="progress-ring-wrap">
        <svg class="progress-ring-svg" width="${size}" height="${size}">
          <circle class="progress-ring-bg" cx="${size/2}" cy="${size/2}" r="${radius}"/>
          <circle class="progress-ring-fill" cx="${size/2}" cy="${size/2}" r="${radius}" 
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="progress-ring-text">
          <div class="progress-ring-pct">${pct}%</div>
          <div class="progress-ring-label">Completed Today</div>
        </div>
      </div>`;
  },

  heatGrid(stores) {
    const cells = stores.map(s => {
      const health = STATE.healthLabel(s);
      const title = `${s.branch} — ${STATE.pct(s)}%`;
      return `<div class="heat-cell ${health}" title="${title}" onclick="MODALS.openEdit(${s.id})"></div>`;
    }).join('');
    return `
      <div class="heat-grid">${cells}</div>
      <div class="heat-legend">
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--success)"></div>Healthy</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--warning)"></div>Warning</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--danger)"></div>Critical</div>
        <div class="heat-legend-item"><div class="heat-legend-dot" style="background:var(--border)"></div>Not Checked</div>
      </div>`;
  },

  activityItem(act) {
    const time = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let icon = 'ti-check';
    let cls = 'success';
    let status = 'Completed';

    if (act.type === 'issue') { icon = 'ti-alert-triangle'; cls = 'warning'; status = 'Warning'; }
    else if (act.type === 'critical') { icon = 'ti-alert-circle'; cls = 'danger'; status = 'Critical'; }
    else if (act.type === 'check') { icon = 'ti-circle-check'; cls = 'success'; status = 'Completed'; }
    else if (act.type === 'communication') { icon = 'ti-message-circle'; cls = 'info'; status = 'Sent'; }

    return `
      <div class="activity-item">
        <div class="activity-time">${time}</div>
        <div class="activity-icon-wrap ${cls}"><i class="ti ${icon}"></i></div>
        <div class="activity-content">
          <div class="activity-text">${act.details || act.type}</div>
        </div>
        <span class="activity-status ${cls}">${status}</span>
      </div>`;
  },

  criticalItem(store) {
    const issues = STATE.devList().filter(d => !store[d]);
    return `
      <div class="critical-item" onclick="MODALS.openEdit(${store.id})">
        <div class="critical-indicator"></div>
        <div class="critical-info">
          <div class="critical-name">${store.branch}</div>
          <div class="critical-meta">${store.area || '—'} · ${store.eng || '—'}</div>
        </div>
        <div class="critical-issues"><i class="ti ti-alert-circle"></i> ${issues.length} Issues</div>
        <div class="critical-time">${store.lastUpdate || '—'}</div>
        <i class="ti ti-chevron-right critical-arrow"></i>
      </div>`;
  },

  deviceToggle(device, checked, idPrefix) {
    const id = `${idPrefix}-${device}`;
    const iconMap = { DMB:'ti-device-tv', Kitchen:'ti-tools-kitchen', POS:'ti-cash-register', Kiosk:'ti-device-tablet', Tablet:'ti-device-mobile' };
    const icon = iconMap[device] || 'ti-device-laptop';
    return `
      <div class="toggle-item ${checked ? 'active' : ''}">
        <div class="toggle-label"><i class="ti ${icon}"></i>${device}</div>
        <label class="toggle-sw">
          <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="UI.refreshDeviceToggle('${id}')">
          <span class="tog-track"></span>
        </label>
      </div>`;
  },

  refreshDeviceToggle(id) {
    const chk = document.getElementById(id)?.checked;
    const item = document.getElementById(id)?.closest('.toggle-item');
    if (item) item.classList.toggle('active', chk);
  },

  branchRow(store) {
    const devs = STATE.devList();
    const health = STATE.healthLabel(store);
    const issues = devs.filter(d => !store[d]);
    const checked = STATE.isCheckedToday(store.id);

    return `
      <div class="branch-row">
        <div class="branch-avatar">${UI.initials(store.branch)}</div>
        <div class="branch-info">
          <div class="branch-name">${store.branch}</div>
          <div class="branch-meta">${store.eng || '—'} · ${store.area || '—'}</div>
        </div>
        <div class="branch-devices">
          ${devs.map(d => `<span class="dev-status ${store[d] ? 'ok' : 'issue'}"><i class="ti ${store[d] ? 'ti-check' : 'ti-x'}"></i> ${d}</span>`).join('')}
        </div>
        <div class="branch-actions">
          <span class="score-pill ${health}">${STATE.pct(store)}%</span>
          <button class="btn btn-sm btn-ghost" onclick="COMM.openStoreCommunication(${store.id})" title="Contact">
            <i class="ti ti-message-circle"></i>
          </button>
          ${STATE.canEdit(store) ? 
            `<button class="btn btn-sm btn-secondary" onclick="MODALS.openEdit(${store.id})"><i class="ti ti-edit"></i></button>` :
            `<button class="btn btn-sm btn-ghost" onclick="MODALS.openView(${store.id})"><i class="ti ti-eye"></i></button>`}
        </div>
      </div>`;
  },

  filterChips(filters, onChange) {
    return filters.map(f => `
      <button class="filter-chip ${f.active ? 'active' : ''}" onclick="${onChange}('${f.key}')">
        <i class="ti ${f.icon}"></i> ${f.label}
      </button>
    `).join('');
  },

  card(title, icon, body, footer = '') {
    return `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ${icon}"></i> ${title}</h3>
          ${footer ? `<span class="view-all">${footer}</span>` : ''}
        </div>
        <div class="card-body">${body}</div>
      </div>`;
  },

  table(headers, rows, emptyMsg = 'No data available') {
    if (!rows.length) return `<div class="empty-state"><i class="ti ti-inbox"></i><p>${emptyMsg}</p></div>`;
    return `
      <div class="table-wrap">
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>`;
  },

  formGroup(label, inputHTML) {
    return `<div class="form-group"><label class="form-label">${label}</label>${inputHTML}</div>`;
  },

  formInput(id, type = 'text', placeholder = '', value = '') {
    return `<input class="form-input" type="${type}" id="${id}" placeholder="${placeholder}" value="${value}">`;
  },

  formSelect(id, options, selected = '') {
    return `<select class="form-input" id="${id}">${options.map(o =>
      typeof o === 'string'
        ? `<option ${o===selected?'selected':''}>${o}</option>`
        : `<option value="${o.v}" ${o.v===selected?'selected':''}>${o.l}</option>`
    ).join('')}</select>`;
  },

  formTextarea(id, placeholder = '', value = '') {
    return `<textarea class="form-input form-textarea" id="${id}" placeholder="${placeholder}">${value}</textarea>`;
  },

  sparkline(data, color = 'var(--brand)', width = 80, height = 30) {
    if (!data.length) return '';
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    return `<svg class="kpi-sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  },

  paginate(items, page, perPage = 25) {
    const total = items.length;
    const pages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const slice = items.slice(start, start + perPage);
    return { slice, pages, total, page };
  }
};

function closeModal() { UI.closeModal(); }
function handleOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) UI.closeModal(); }