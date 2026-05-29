/* =====================================================
   views/auditlog.js — Audit Log Viewer v5.1
   ===================================================== */
const AuditView = {
  data: [],
  loading: false,

  async render() {
    AuditView.loading = true;
    const el = document.getElementById('contentArea');
    if (el) el.innerHTML = `
      <div class="view-header"><h2 class="view-title"><i class="ti ti-history"></i> Audit Log</h2></div>
      <div class="loading-block"><div class="spinner"></div><p>Loading audit log…</p></div>`;

    try {
      const log = await API.getAuditLog({});
      AuditView.data = log;
      AuditView.renderData(log);
    } catch(e) {
      if (el) el.innerHTML += `<div class="error-msg">Failed to load: ${e.message}</div>`;
    }
  },

  renderData(log) {
    const typeColors = {
      STORE_UPDATE:'t-info', STORE_ADD:'t-ok', STORE_DELETE:'t-err',
      USER_ADD:'t-ok', USER_DELETE:'t-err', USER_UPDATE:'t-info',
      PASSWORD_CHANGE:'t-warn', LOGIN:'t-info', LOGOUT:'t-info', SETUP:'t-info',
      ISSUE_UPDATE:'t-warn'
    };
    const typeIcons = {
      STORE_UPDATE:'ti-edit', STORE_ADD:'ti-plus', STORE_DELETE:'ti-trash',
      USER_ADD:'ti-user-plus', USER_DELETE:'ti-user-minus', USER_UPDATE:'ti-user-edit',
      PASSWORD_CHANGE:'ti-key', LOGIN:'ti-login', LOGOUT:'ti-logout',
      ISSUE_UPDATE:'ti-flag', SETUP:'ti-settings'
    };

    const rows = log.length
      ? log.map(entry => `
          <tr>
            <td style="white-space:nowrap;font-size:11px;color:var(--text-ter)">${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}</td>
            <td><span class="audit-badge ${typeColors[entry.type]||'t-info'}">
              <i class="ti ${typeIcons[entry.type]||'ti-info-circle'}"></i>
              ${entry.type||'—'}
            </span></td>
            <td style="font-weight:500">${entry.user||'—'}</td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${entry.detail||''}">${entry.detail||'—'}</td>
            <td style="color:var(--text-ter)">${entry.storeId||'—'}</td>
          </tr>`)
        .join('')
      : `<tr><td colspan="5" class="empty-td"><div class="empty-state"><i class="ti ti-history"></i><p>No audit records yet</p></div></td></tr>`;

    const el = document.getElementById('contentArea');
    if (!el) return;
    el.innerHTML = `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-history"></i> Audit Log</h2>
        <div class="view-actions">
          <button class="btn btn-sm btn-secondary" onclick="AuditView.render()"><i class="ti ti-refresh"></i> Refresh</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap" style="max-height:520px;overflow-y:auto">
          <table>
            <thead><tr>
              <th style="width:150px">Date & Time</th>
              <th style="width:160px">Action</th>
              <th style="width:120px">User</th>
              <th>Details</th>
              <th style="width:80px">Store ID</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }
};