/* =====================================================
   views/history.js — Store History Viewer v5.1
   ===================================================== */
const HistoryView = {
  async renderForStore(storeId, branchName) {
    UI.openModal(`Store history — ${branchName}`,
      `<div class="loading-block"><div class="spinner"></div><p>Loading history…</p></div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
    try {
      const history = await API.getStoreHistory(storeId);
      const rows = history.length
        ? history.map(h => `
            <tr>
              <td style="white-space:nowrap;font-size:11px">${h.timestamp ? new Date(h.timestamp).toLocaleString() : '—'}</td>
              <td style="font-weight:500">${h.changedBy||'—'}</td>
              <td>
                ${(h.deviceSnapshot||'').split(',').map((s,i) => {
                  const devs = ['DMB','Kitchen','POS','Kiosk','Tablet'];
                  const ok   = s.trim() === 'OK';
                  return `<span class="dev-tag ${ok?'dev-tag-ok':'dev-tag-bad'}">${devs[i]||i}: ${s.trim()}</span>`;
                }).join('')}
              </td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h.notes||''}">${h.notes||'—'}</td>
            </tr>`)
          .join('')
        : `<tr><td colspan="4" class="empty-td"><div class="empty-state" style="padding:1rem"><i class="ti ti-clock-off"></i><p>No history recorded yet</p></div></td></tr>`;

      document.getElementById('modalBody').innerHTML = `
        <div class="table-wrap" style="max-height:380px;overflow-y:auto">
          <table>
            <thead><tr>
              <th style="width:140px">Date & Time</th>
              <th style="width:110px">Changed by</th>
              <th>Device snapshot</th>
              <th style="width:160px">Notes</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } catch(e) {
      document.getElementById('modalBody').innerHTML = `<div class="error-msg">Failed to load history: ${e.message}</div>`;
    }
  }
};