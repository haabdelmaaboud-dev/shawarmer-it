/* =====================================================
   views/alerts.js — Alerts & Activity Feed v5.1
   ===================================================== */
const AlertsView = {
  render() {
    const activities = STATE.getRecentActivities(50);
    const unread = STATE.notifications.filter(n => !n.read);

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-bell"></i> Alerts & Activity</h2>
        <div class="view-actions">
          <button class="btn btn-sm btn-secondary" onclick="NOTIF.clearAll();APP.refreshTab()">
            <i class="ti ti-trash"></i> Clear All
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-activity"></i> Activity Timeline</h3>
        </div>
        <div class="card-body">
          <div class="activity-list">
            ${activities.length 
              ? activities.map(a => UI.activityItem(a)).join('') 
              : '<div class="empty-state"><i class="ti ti-clock-off"></i><p>No activity recorded yet</p></div>'}
          </div>
        </div>
      </div>`;
  }
};