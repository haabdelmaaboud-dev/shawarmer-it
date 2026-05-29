/* =====================================================
   views/stores.js — My Stores / Store List v5.1
   Modern card-based store list with quick actions & communication
   ===================================================== */
const StoresView = {
  render() {
    const base = STATE.myStores();
    const fl = STATE.applyFilters(base);
    const f = STATE.filters;
    const u = STATE.currentUser;
    const devs = STATE.devList();

    // Filter chips
    const filterChips = [
      { key: 'all', label: 'All Stores', icon: 'ti-building-store', active: f.view === 'all' },
      { key: 'issues', label: 'Issues', icon: 'ti-alert-triangle', active: f.view === 'issues' },
      { key: 'ok', label: 'Healthy', icon: 'ti-circle-check', active: f.view === 'ok' },
      { key: 'critical', label: 'Critical', icon: 'ti-alert-circle', active: f.health === 'critical' },
      { key: 'unchecked', label: 'Unchecked', icon: 'ti-clock', active: f.checkedToday === 'no' },
    ];

    const filtersHtml = `
      <div class="filter-bar">
        ${filterChips.map(chip => `
          <button class="filter-chip ${chip.active ? 'active' : ''}" onclick="StoresView.setFilter('${chip.key}')">
            <i class="ti ${chip.icon}"></i> ${chip.label}
          </button>
        `).join('')}
        <div class="search-wrap" style="flex:1;max-width:300px;">
          <i class="ti ti-search search-ico"></i>
          <input class="filter-inp" type="text" placeholder="Search stores..." 
            value="${f.q}" oninput="STATE.filters.q=this.value;APP.refreshTab()">
        </div>
      </div>`;

    // Store cards
    const storeCards = fl.length 
      ? fl.map(s => UI.branchRow(s)).join('')
      : `<div class="empty-state"><i class="ti ti-search-off"></i><p>No stores match your filters</p></div>`;

    const addBtn = STATE.isAdmin() 
      ? `<button class="btn btn-brand btn-sm" onclick="MODALS.openAddStore()"><i class="ti ti-plus"></i> Add Store</button>`
      : '';

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-building-store"></i> My Stores</h2>
        <div class="view-actions">${addBtn}</div>
      </div>
      ${filtersHtml}
      <div style="margin-bottom:12px;font-size:13px;color:var(--text-sec);">
        Showing <strong>${fl.length}</strong> of <strong>${base.length}</strong> stores
      </div>
      <div class="stores-list">${storeCards}</div>`;
  },

  setFilter(key) {
    const f = STATE.filters;
    f.view = 'all';
    f.health = '';
    f.checkedToday = '';

    switch(key) {
      case 'issues': f.view = 'issues'; break;
      case 'ok': f.view = 'ok'; break;
      case 'critical': f.health = 'critical'; break;
      case 'unchecked': f.checkedToday = 'no'; break;
    }
    APP.refreshTab();
  }
};