/* =====================================================
   views/stores.js — Stores List & Management v6.1
   Full implementation with device checking, filters,
   WhatsApp communication, and store editing
   ===================================================== */
const StoresView = {
  render() {
    const stores = STATE.myStores();
    const areas = [...new Set(stores.map(s => s.area).filter(Boolean))].sort();
    const engineers = [...new Set(stores.map(s => s.eng).filter(Boolean))].sort();

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-building-store"></i> Stores</h2>
        <div class="view-actions">
          ${STATE.isAdmin() ? `<button class="btn btn-sm btn-brand" onclick="StoresView.showAddModal()">
            <i class="ti ti-plus"></i> Add Store
          </button>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="filter-bar" style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="search-bar" style="flex:1;min-width:200px">
              <i class="ti ti-search"></i>
              <input type="text" id="storeSearch" placeholder="Search stores..." oninput="StoresView.filter()">
            </div>
            <select class="form-input" id="filterArea" onchange="StoresView.filter()" style="width:160px">
              <option value="">All Areas</option>
              ${areas.map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
            <select class="form-input" id="filterEng" onchange="StoresView.filter()" style="width:160px">
              <option value="">All Engineers</option>
              ${engineers.map(e => `<option value="${e}">${e}</option>`).join('')}
            </select>
            <select class="form-input" id="filterStatus" onchange="StoresView.filter()" style="width:140px">
              <option value="">All Status</option>
              <option value="checked">Checked Today</option>
              <option value="unchecked">Not Checked</option>
              <option value="critical">Critical</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
            </select>
          </div>
          <div id="storesList">
            ${StoresView.renderList(stores)}
          </div>
        </div>
      </div>`;
  },

  renderList(stores) {
    if (!stores.length) {
      return `<div class="empty-state" style="padding:3rem">
        <i class="ti ti-building-store" style="font-size:48px;color:var(--text-ter)"></i>
        <p style="margin-top:16px;font-weight:600">No stores found</p>
        <p class="empty-state-sub">Try adjusting your filters</p>
      </div>`;
    }

    return `<div class="branch-list">${stores.map(s => UI.branchRow(s)).join('')}</div>`;
  },

  filter() {
    const query = document.getElementById('storeSearch')?.value.toLowerCase() || '';
    const area = document.getElementById('filterArea')?.value || '';
    const eng = document.getElementById('filterEng')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    let filtered = STATE.myStores();

    if (query) {
      filtered = filtered.filter(s => 
        (s.branch || '').toLowerCase().includes(query) ||
        (s.eng || '').toLowerCase().includes(query) ||
        (s.area || '').toLowerCase().includes(query) ||
        (s.ops || '').toLowerCase().includes(query)
      );
    }
    if (area) filtered = filtered.filter(s => s.area === area);
    if (eng) filtered = filtered.filter(s => s.eng === eng);
    if (status === 'checked') filtered = filtered.filter(s => STATE.isCheckedToday(s.id));
    if (status === 'unchecked') filtered = filtered.filter(s => !STATE.isCheckedToday(s.id));
    if (status === 'critical') filtered = filtered.filter(s => STATE.healthLabel(s) === 'critical');
    if (status === 'healthy') filtered = filtered.filter(s => STATE.healthLabel(s) === 'healthy');
    if (status === 'warning') filtered = filtered.filter(s => STATE.healthLabel(s) === 'warning');

    const list = document.getElementById('storesList');
    if (list) list.innerHTML = StoresView.renderList(filtered);
  },

  renderSearchResults(results) {
    const list = document.getElementById('storesList');
    if (list) list.innerHTML = StoresView.renderList(results);
  },

  showAddModal() {
    UI.toast('Add store feature - use Admin panel', 'info');
  },

  showCheckModal() {
    UI.toast('Select a store to check devices', 'info');
  },

  // Check store devices
  async checkStore(storeId) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;

    const devs = STATE.devList();
    const devicesHtml = devs.map(d => UI.deviceToggle(d, store[d] === 1, 'check')).join('');

    UI.openModal(
      `Check Store — ${store.branch}`,
      `<div class="check-store">
        <div class="store-info" style="margin-bottom:16px">
          <div><strong>Engineer:</strong> ${store.eng || '—'}</div>
          <div><strong>Area:</strong> ${store.area || '—'}</div>
          <div><strong>Ops:</strong> ${store.ops || '—'}</div>
        </div>
        <div class="device-toggles">${devicesHtml}</div>
        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Notes</label>
          <textarea class="form-input form-textarea" id="checkNotes" placeholder="Any issues or notes...">${store.notes || ''}</textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" onclick="StoresView.saveCheck(${storeId})">
         <i class="ti ti-check"></i> Save Check
       </button>`
    );
  },

  async saveCheck(storeId) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;

    const devs = STATE.devList();
    const updates = { id: storeId };

    devs.forEach(d => {
      const chk = document.getElementById(`check-${d}`);
      updates[d] = chk?.checked ? 1 : 0;
    });

    updates.notes = document.getElementById('checkNotes')?.value || '';

    UI.setSync('busy');
    try {
      await API.updateStore(updates);

      // Update local state
      devs.forEach(d => {
        store[d] = updates[d];
      });
      store.notes = updates.notes;
      store.lastCheckAt = new Date().toISOString();
      store.lastCheckBy = STATE.currentUser?.name || 'system';

      STATE.markChecked(storeId);
      STATE.addActivity('check', store, 'Daily check completed');

      UI.setSync('live');
      UI.closeModal();
      UI.toast('Store checked successfully', 'ok');
      APP.refreshTab();
    } catch(e) {
      UI.setSync('offline', 'Failed');
      UI.toast('Failed to save: ' + e.message, 'err');
    }
  },

  // View store details
  viewStore(storeId) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;

    const devs = STATE.devList();
    const health = STATE.healthLabel(store);
    const issues = devs.filter(d => !store[d]);

    UI.openModal(
      store.branch,
      `<div class="store-detail">
        <div class="store-detail-header">
          <div class="score-pill ${health}">${STATE.pct(store)}%</div>
          <div class="store-detail-meta">
            <div><i class="ti ti-user"></i> ${store.eng || '—'}</div>
            <div><i class="ti ti-map-pin"></i> ${store.area || '—'}</div>
            <div><i class="ti ti-briefcase"></i> ${store.ops || '—'}</div>
          </div>
        </div>
        <div class="device-list" style="margin:16px 0">
          ${devs.map(d => `
            <div class="device-item ${store[d] ? 'ok' : 'issue'}">
              <i class="ti ${store[d] ? 'ti-check' : 'ti-x'}"></i>
              <span>${d}</span>
            </div>
          `).join('')}
        </div>
        ${issues.length ? `<div class="alert alert-warning"><i class="ti ti-alert-triangle"></i> Issues: ${issues.join(', ')}</div>` : ''}
        ${store.notes ? `<div class="store-notes"><strong>Notes:</strong> ${store.notes}</div>` : ''}
        ${store.lastCheckAt ? `<div class="store-last-check">Last checked: ${new Date(store.lastCheckAt).toLocaleString()} by ${store.lastCheckBy || '—'}</div>` : ''}
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
       ${STATE.canEdit(store) ? `<button class="btn btn-brand" onclick="UI.closeModal();StoresView.checkStore(${storeId})"><i class="ti ti-edit"></i> Check</button>` : ''}
       <button class="btn btn-ghost" onclick="COMM.openStoreCommunication(${storeId})"><i class="ti ti-message-circle"></i> Contact</button>`
    );
  }
};

// Alias for backward compatibility
const STORES = StoresView;
