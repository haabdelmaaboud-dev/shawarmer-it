/* =====================================================
   views/reports.js — Export Reports v5.1
   ===================================================== */
const ReportsView = {
  render() {
    const base = STATE.myStores();
    const devs = STATE.devList();
    const tot  = base.length;
    const iss  = base.filter(s => STATE.hasIssue(s)).length;

    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-file-report"></i> Reports</h2>
      </div>

      <div class="reports-grid">
        <div class="card">
          <div class="card-body" style="padding:24px;">
            <div class="report-card-icon" style="background:var(--brand-light);color:var(--brand)"><i class="ti ti-chart-pie"></i></div>
            <div class="report-card-title">Summary Report</div>
            <div class="report-card-desc">All branches with device status, scores and notes</div>
            <div class="report-filters">
              <div class="form-group">
                <label class="form-label">Filter by engineer</label>
                <select class="form-input" id="rep-eng">
                  <option value="">All engineers</option>
                  ${STATE.db.lists.engineers.map(e => `<option>${e}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Filter by area</label>
                <select class="form-input" id="rep-area">
                  <option value="">All areas</option>
                  ${STATE.db.lists.areas.map(a => `<option>${a}</option>`).join('')}
                </select>
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px">
              <button class="btn btn-brand" onclick="ReportsView.exportExcel()">
                <i class="ti ti-file-spreadsheet"></i> Export Excel
              </button>
              <button class="btn btn-secondary" onclick="ReportsView.exportPDF()">
                <i class="ti ti-file-type-pdf"></i> Export PDF
              </button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body" style="padding:24px;">
            <div class="report-card-icon" style="background:var(--danger-bg);color:var(--danger)"><i class="ti ti-alert-triangle"></i></div>
            <div class="report-card-title">Issues Report</div>
            <div class="report-card-desc">Branches with device problems and resolution status</div>
            <div class="report-stats">
              <div class="rep-stat"><span class="rep-stat-val">${iss}</span><span class="rep-stat-lbl">Open issues</span></div>
              <div class="rep-stat"><span class="rep-stat-val">${tot}</span><span class="rep-stat-lbl">Total branches</span></div>
              <div class="rep-stat"><span class="rep-stat-val">${tot ? Math.round(iss/tot*100) : 0}%</span><span class="rep-stat-lbl">Issue rate</span></div>
            </div>
            <div style="display:flex;gap:10px;margin-top:16px">
              <button class="btn btn-brand" onclick="ReportsView.exportIssuesExcel()">
                <i class="ti ti-file-spreadsheet"></i> Issues Excel
              </button>
              <button class="btn btn-secondary" onclick="ReportsView.exportIssuesPDF()">
                <i class="ti ti-file-type-pdf"></i> Issues PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <h3><i class="ti ti-eye"></i> Preview</h3>
          <span class="muted" style="font-size:12px">${tot} branches · ${iss} with issues</span>
        </div>
        <div class="card-body">
          ${UI.table(
            ['Branch', 'Engineer', 'Area', ...devs, 'Score', 'Status'],
            base.slice(0,10).map(s => `
              <tr>
                <td style="font-weight:600">${s.branch}</td>
                <td>${s.eng||'—'}</td>
                <td>${s.area||'—'}</td>
                ${devs.map(d => `<td style="text-align:center">${UI.devChip(s[d])}</td>`).join('')}
                <td>${UI.scorePill(s)}</td>
                <td>${s.issueStatus || '—'}</td>
              </tr>
            `),
            'No stores to preview'
          )}
          ${tot > 10 ? `<div style="padding:12px 16px;font-size:12px;color:var(--text-ter)">Showing 10 of ${tot} — export to see all</div>` : ''}
        </div>
      </div>`;
  },

  getFiltered() {
    const eng  = document.getElementById('rep-eng')?.value  || '';
    const area = document.getElementById('rep-area')?.value || '';
    const devs = STATE.devList();
    return STATE.myStores().filter(s => {
      if (eng  && s.eng  !== eng)  return false;
      if (area && s.area !== area) return false;
      return true;
    });
  },

  exportExcel() {
    const stores = ReportsView.getFiltered();
    const devs   = STATE.devList();
    const headers = ['ID','Engineer','Branch','Ops Manager','Area Manager',...devs,'Score %','Issue Status','Notes'];
    const rows = stores.map(s => [
      s.id, s.eng, s.branch, s.ops, s.area,
      ...devs.map(d => s[d] ? 'OK' : 'Issue'),
      STATE.pct(s) + '%',
      s.issueStatus || 'open',
      s.notes || ''
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')
    ).join('\n');
    ReportsView.download('Shawarmer_IT_Report.csv', csv, 'text/csv');
    UI.toast('Excel (CSV) exported — open with Excel or Google Sheets', 'ok');
  },

  exportIssuesExcel() {
    const devs   = STATE.devList();
    const stores = STATE.myStores().filter(s => STATE.hasIssue(s));
    const headers = ['ID','Engineer','Branch','Area Manager',...devs,'Score %','Issue Status','Notes'];
    const rows = stores.map(s => [
      s.id, s.eng, s.branch, s.area,
      ...devs.map(d => s[d] ? 'OK' : '⚠️ Issue'),
      STATE.pct(s) + '%',
      s.issueStatus || 'open',
      s.notes || ''
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')
    ).join('\n');
    ReportsView.download('Shawarmer_Issues_Report.csv', csv, 'text/csv');
    UI.toast('Issues Excel (CSV) exported', 'ok');
  },

  exportPDF() {
    const stores = ReportsView.getFiltered();
    const devs   = STATE.devList();
    const date   = new Date().toLocaleDateString();
    const ok     = stores.filter(s => !STATE.hasIssue(s)).length;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Shawarmer IT Report</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111827;margin:24px}
      h1{font-size:18px;color:#6E0F1F;margin-bottom:4px;font-weight:700}
      .meta{color:#6B7280;font-size:11px;margin-bottom:20px}
      .kpi-row{display:flex;gap:12px;margin-bottom:20px}
      .kpi{padding:10px 16px;border:1px solid #E5E7EB;border-radius:10px;text-align:center;min-width:80px}
      .kpi-v{font-size:22px;font-weight:700;color:#6E0F1F}
      .kpi-l{font-size:10px;color:#6B7280}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#F5F7FB;padding:8px 10px;text-align:left;border:1px solid #E5E7EB;font-weight:600;color:#6B7280}
      td{padding:6px 10px;border:1px solid #E5E7EB;vertical-align:middle}
      tr:nth-child(even){background:#FAFAFA}
      .ok{color:#22C55E;font-weight:600} .bad{color:#C62828;font-weight:600}
      .score-ok{background:#EAF3DE;color:#16A34A;padding:2px 8px;border-radius:99px;font-weight:600}
      .score-bad{background:#FCEBEB;color:#991B1B;padding:2px 8px;border-radius:99px;font-weight:600}
    </style></head><body>
    <h1>Shawarmer IT Operations Report</h1>
    <div class="meta">Generated: ${date} · ${stores.length} branches · ${ok} healthy · ${stores.length-ok} with issues</div>
    <div class="kpi-row">
      <div class="kpi"><div class="kpi-v">${stores.length}</div><div class="kpi-l">Total</div></div>
      <div class="kpi"><div class="kpi-v" style="color:#22C55E">${ok}</div><div class="kpi-l">OK</div></div>
      <div class="kpi"><div class="kpi-v" style="color:#C62828">${stores.length-ok}</div><div class="kpi-l">Issues</div></div>
    </div>
    <table><thead><tr><th>Branch</th><th>Engineer</th><th>Area Manager</th>
      ${devs.map(d=>`<th>${d}</th>`).join('')}<<th>Score</th><th>Notes</th>
    </tr></thead><tbody>
    ${stores.map(s => `<tr>
      <td><b>${s.branch}</b></td><td>${s.eng}</td><td>${s.area}</td>
      ${devs.map(d=>`<td class="${s[d]?'ok':'bad'}">${s[d]?'✓':'✗'}</td>`).join('')}
      <td><span class="${STATE.pct(s)===100?'score-ok':'score-bad'}">${STATE.pct(s)}%</span></td>
      <td>${s.notes||''}</td>
    </tr>`).join('')}
    </tbody></table></body></html>`;

    const win = window.open('','_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
    UI.toast('PDF print dialog opened', 'ok');
  },

  exportIssuesPDF() {
    const stores = STATE.myStores().filter(s => STATE.hasIssue(s));
    const devs   = STATE.devList();
    const date   = new Date().toLocaleDateString();

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Shawarmer Issues Report</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:11px;color:#111827;margin:24px}
      h1{font-size:18px;color:#C62828;margin-bottom:4px;font-weight:700}
      .meta{color:#6B7280;font-size:11px;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{background:#FCEBEB;padding:8px 10px;text-align:left;border:1px solid #FECACA;font-weight:600;color:#991B1B}
      td{padding:6px 10px;border:1px solid #E5E7EB;vertical-align:middle}
      tr:nth-child(even){background:#FFFBFB}
      .ok{color:#22C55E;font-weight:600} .bad{color:#C62828;font-weight:600}
    </style></head><body>
    <h1>⚠️ Shawarmer IT Issues Report</h1>
    <div class="meta">Generated: ${date} · ${stores.length} branches with issues</div>
    <table><thead><tr><th>Branch</th><th>Engineer</th><th>Area Manager</th>
      ${devs.map(d=>`<th>${d}</th>`).join('')}<<th>Score</th><th>Status</th><th>Notes</th>
    </tr></thead><tbody>
    ${stores.map(s=>`<tr>
      <td><b>${s.branch}</b></td><td>${s.eng}</td><td>${s.area}</td>
      ${devs.map(d=>`<td class="${s[d]?'ok':'bad'}">${s[d]?'✓':'✗'}</td>`).join('')}
      <td class="bad">${STATE.pct(s)}%</td>
      <td>${s.issueStatus||'open'}</td>
      <td>${s.notes||''}</td>
    </tr>`).join('')}
    </tbody></table></body></html>`;

    const win = window.open('','_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  },

  download(filename, content, type) {
    const blob = new Blob(['\ufeff' + content], { type: type + ';charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
};