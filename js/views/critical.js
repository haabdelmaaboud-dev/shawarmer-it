/* =====================================================
   views/critical.js — Critical Stores View v5.1
   ===================================================== */
const CriticalView = {
  render() {
    const stores = STATE.myStores().filter(s => STATE.healthLabel(s) === 'critical');
    const devs = STATE.devList();

    if (!stores.length) {
      return `
        <div class="view-header">
          <h2 class="view-title"><i class="ti ti-alert-triangle"></i> Critical Stores</h2>
        </div>
        <div class="empty-state" style="padding:4rem;">
          <i class="ti ti-circle-check" style="color:var(--success);font-size:48px;"></i>
          <p style="font-size:16px;font-weight:600;margin-top:16px;">No critical stores!</p>
          <p class="empty-state-sub">All your stores are healthy. Great work!</p>
        </div>`;
    }

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-alert-triangle"></i> Critical Stores</h2>
        <span class="badge badge-danger"><i class="ti ti-alert-circle"></i> ${stores.length} Critical</span>
      </div>
      <div class="critical-list" style="gap:12px;">
        ${stores.map(s => UI.criticalItem(s)).join('')}
      </div>`;
  }
};