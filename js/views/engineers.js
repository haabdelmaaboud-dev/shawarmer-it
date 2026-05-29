/* =====================================================
   views/engineers.js — Engineers Management v5.1
   ===================================================== */
const EngineersView = {
  render() {
    const engineers = STATE.db.lists.engineers || [];
    const stores = STATE.db.stores;

    const engData = engineers.map(name => {
      const engStores = stores.filter(s => s.eng === name);
      const checked = engStores.filter(s => STATE.isCheckedToday(s.id)).length;
      const issues = engStores.filter(s => STATE.hasIssue(s)).length;
      const total = engStores.length;
      return { name, total, checked, issues, pct: total ? Math.round(checked/total*100) : 0 };
    }).sort((a, b) => b.issues - a.issues);

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-users"></i> Engineers</h2>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Engineer</th><th>Stores</th><th>Checked Today</th><th>Issues</th><th>Progress</th><th>Health</th></tr>
              </thead>
              <tbody>
                ${engData.length ? engData.map(e => `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;border-radius:50%;background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${UI.initials(e.name)}</div>
                        <div>
                          <div style="font-weight:600">${e.name}</div>
                          <div style="font-size:11px;color:var(--text-ter)">IT Engineer</div>
                        </div>
                      </div>
                    </td>
                    <td>${e.total}</td>
                    <td>${e.checked}/${e.total}</td>
                    <td style="color:${e.issues>0?'var(--danger)':'var(--success)'}">${e.issues || '—'}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:80px;height:6px;background:var(--border);border-radius:99px;overflow:hidden">
                          <div style="width:${e.pct}%;height:100%;background:${e.pct>=80?'var(--success)':e.pct>=50?'var(--warning)':'var(--danger)'};border-radius:99px;transition:width 0.5s"></div>
                        </div>
                        <span style="font-size:12px;font-weight:600">${e.pct}%</span>
                      </div>
                    </td>
                    <td><span class="score-pill ${e.issues===0?'healthy':e.issues<3?'warning':'critical'}">${e.issues===0?'Good':e.issues+' Issues'}</span></td>
                  </tr>
                `).join('') : '<tr><td colspan="6" class="empty-td"><div class="empty-state"><p>No engineers found</p></div></td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }
};