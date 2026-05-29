/* =====================================================
   modals.js — All Modal Dialogs v5.1
   ===================================================== */
const MODALS = {

  // ── View store (read-only) ───────────────────────────
  openView(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) return;
    const devs = STATE.devList();
    UI.openModal(
      r.branch,
      `<div class="store-info-block">
        <div class="store-info-meta">Engineer: ${r.eng} &nbsp;|&nbsp; Area: ${r.area} &nbsp;|&nbsp; Ops: ${r.ops||'—'}</div>
      </div>
      <div class="toggle-grid">${devs.map(d => `
        <div class="toggle-item ${r[d] ? 'active' : ''}">
          <div class="toggle-label"><i class="ti ${r[d] ? 'ti-check' : 'ti-x'}"></i>${d}</div>
          <span class="score-pill ${r[d] ? 'healthy' : 'critical'}">${r[d] ? 'Working' : 'Issue'}</span>
        </div>`).join('')}
      </div>
      <div style="margin-top:16px">
        <div class="form-label">Notes</div>
        <div class="notes-block">${r.notes||'<span class="muted">No notes</span>'}</div>
      </div>`,
      `<button class="btn btn-secondary" onclick="HistoryView.renderForStore(${r.id},'${r.branch.replace(/'/g,"\'")}')"><i class="ti ti-history"></i> View history</button>
       <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
  },

  // ── Edit store ───────────────────────────────────────
  openEdit(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) { UI.toast('Store not found','err'); return; }
    STATE.editId = id;
    const devs = STATE.devList();
    const statusOpts = ['open','in-progress','resolved','closed'].map(s =>
      `<option value="${s}" ${(r.issueStatus||'open')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
    ).join('');

    UI.openModal(
      'Edit Store',
      `<div class="store-info-block">
        <div class="store-info-name">${r.branch}</div>
        <div class="store-info-meta">Engineer: ${r.eng} &nbsp;|&nbsp; Area: ${r.area}</div>
      </div>
      <div class="section-divider">Device Status</div>
      <div class="toggle-grid">${devs.map(d => UI.deviceToggle(d, !!r[d], 'ed')).join('')}</div>
      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Issue Status</label>
        <select class="form-input" id="ed-status"><option value="">— none —</option>${statusOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Daily Notes</label>
        ${UI.formTextarea('ed-daily-notes','Notes for today…', r.dailyNotes||'')}
      </div>
      <div class="form-group">
        <label class="form-label">Persistent Notes</label>
        ${UI.formTextarea('ed-persistent-notes','Permanent operational notes…', r.persistentNotes||'')}
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-sm btn-ghost" onclick="HistoryView.renderForStore(${r.id},'${r.branch.replace(/'/g,"\'")}')">
          <i class="ti ti-history"></i> History
        </button>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="saveEditBtn" onclick="MODALS.saveEdit()">
         <i class="ti ti-check"></i> Save Changes
       </button>`
    );
  },

  async saveEdit() {
    const r = STATE.db.stores.find(x => String(x.id) === String(STATE.editId));
    if (!r) return;
    const btn  = document.getElementById('saveEditBtn');
    const devs = STATE.devList();
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Saving…'; }

    const upd = { 
      id: r.id, branch: r.branch, eng: r.eng, ops: r.ops, area: r.area,
      issueStatus: document.getElementById('ed-status')?.value || '',
      notes: document.getElementById('ed-daily-notes')?.value || '',
      dailyNotes: document.getElementById('ed-daily-notes')?.value || '',
      persistentNotes: document.getElementById('ed-persistent-notes')?.value || ''
    };
    devs.forEach(d => { upd[d] = document.getElementById('ed-'+d)?.checked ? 1 : 0; });

    UI.setSync('busy');
    try {
      await API.updateStore(upd);
      Object.assign(r, upd);
      STATE.db.timestamp = Date.now();
      STATE.markChecked(r.id);
      STATE.addActivity('check', r, `Updated ${r.branch} device status`);
      NOTIF.checkIssues([{...r, ...Object.fromEntries(devs.map(d => [d, r[d]]))}], [upd]);
      UI.setSync('live');
      UI.closeModal();
      APP.refreshTab();
      UI.toast('Saved successfully','ok');
      STATE.addNotification(`Store updated: ${r.branch}`, 'info', r.id);
    } catch(e) {
      UI.setSync('offline','Save failed');
      UI.toast('Save failed: '+e.message,'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Save Changes'; }
    }
  },

  // ── Issue status ─────────────────────────────────────
  openIssueStatus(id) {
    const r = STATE.db.stores.find(x => String(x.id) === String(id));
    if (!r) return;
    STATE.editId = id;
    const statusOpts = ['open','in-progress','resolved','closed'].map(s =>
      `<option value="${s}" ${(r.issueStatus||'open')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
    ).join('');

    UI.openModal(
      'Update Issue Status',
      `<div class="store-info-block">
        <div class="store-info-name">${r.branch}</div>
        <div class="store-info-meta">Score: ${STATE.pct(r)}% · Current: <span class="issue-badge ib-${r.issueStatus||'open'}">${r.issueStatus||'open'}</span></div>
      </div>
      <div class="form-group">
        <label class="form-label">New Status</label>
        <select class="form-input" id="is-status">${statusOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Resolution Notes</label>
        ${UI.formTextarea('is-notes','Describe resolution steps…', r.resolutionNotes||'')}
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="issueBtn" onclick="MODALS.saveIssueStatus()">
         <i class="ti ti-flag"></i> Update Status
       </button>`
    );
  },

  async saveIssueStatus() {
    const r      = STATE.db.stores.find(x => String(x.id) === String(STATE.editId));
    if (!r) return;
    const btn    = document.getElementById('issueBtn');
    const status = document.getElementById('is-status')?.value;
    const notes  = document.getElementById('is-notes')?.value || '';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    UI.setSync('busy');
    try {
      await API.updateIssue({ storeId: r.id, branch: r.branch, issueStatus: status, resolutionNotes: notes, user: STATE.currentUser.name });
      r.issueStatus = status;
      r.resolutionNotes = notes;
      UI.setSync('live'); UI.closeModal(); APP.refreshTab();
      UI.toast(`Issue marked as ${status}`,'ok');
    } catch(e) {
      UI.setSync('offline','Failed'); UI.toast('Failed: '+e.message,'err');
      if (btn) { btn.disabled = false; btn.textContent = 'Update Status'; }
    }
  },

  // ── Add store ────────────────────────────────────────
  openAddStore() {
    const devs = STATE.devList();
    const eO   = STATE.db.lists.engineers.map(e=>`<option>${e}</option>`).join('');
    const oO   = STATE.db.lists.ops.map(e=>`<option>${e}</option>`).join('');
    const aO   = STATE.db.lists.areas.map(e=>`<option>${e}</option>`).join('');

    UI.openModal(
      'Add New Store',
      `<div class="form-group">${UI.formGroup('Branch Name', UI.formInput('ns-branch','text','e.g. 310-AlNakheel'))}</div>
       <div class="form-grid">
         ${UI.formGroup('Engineer',    `<select class="form-input" id="ns-eng">${eO}</select>`)}
         ${UI.formGroup('Ops Manager', `<select class="form-input" id="ns-ops">${oO}</select>`)}
       </div>
       ${UI.formGroup('Area Manager', `<select class="form-input" id="ns-area">${aO}</select>`)}
       <div class="section-divider">Device Status (toggle off if issue)</div>
       <div class="toggle-grid">${devs.map(d => UI.deviceToggle(d, true, 'ns')).join('')}</div>
       ${UI.formGroup('Notes', UI.formTextarea('ns-notes','Any known issues…'))}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="addStoreBtn" onclick="MODALS.saveAddStore()">
         <i class="ti ti-plus"></i> Add Store
       </button>`
    );
  },

  async saveAddStore() {
    const branch = document.getElementById('ns-branch')?.value.trim();
    if (!branch) { UI.toast('Branch name required','err'); return; }
    const btn  = document.getElementById('addStoreBtn');
    const devs = STATE.devList();
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Adding…'; }
    const s = {
      branch,
      eng:   document.getElementById('ns-eng')?.value  || '',
      ops:   document.getElementById('ns-ops')?.value  || '',
      area:  document.getElementById('ns-area')?.value || '',
      notes: document.getElementById('ns-notes')?.value || ''
    };
    devs.forEach(d => { s[d] = document.getElementById('ns-'+d)?.checked ? 1 : 0; });
    UI.setSync('busy');
    try {
      const res = await API.addStore(s);
      s.id = res.id;
      STATE.db.stores.push(s);
      UI.setSync('live'); UI.closeModal(); APP.showTab('stores');
      UI.toast('Store added successfully','ok');
    } catch(e) {
      UI.setSync('offline','Failed'); UI.toast('Failed: '+e.message,'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-plus"></i> Add Store'; }
    }
  },

  // ── Add user ─────────────────────────────────────────
  openAddUser() {
    const eO = STATE.db.lists.engineers.map(e=>`<option>${e}</option>`).join('');
    UI.openModal(
      'Create User Account',
      `${UI.formGroup('Full Name',  UI.formInput('nu-name','text','Full name'))}
       <div class="form-grid">
         ${UI.formGroup('Username', UI.formInput('nu-user','text','e.g. eng.ahmed'))}
         ${UI.formGroup('Password', UI.formInput('nu-pass','password','Set password'))}
       </div>
       ${UI.formGroup('Role', `<select class="form-input" id="nu-role" onchange="MODALS._updateRoleRef()">
         <option value="engineer">Engineer</option>
         <option value="area">Area Manager</option>
         <option value="ops">Ops Manager</option>
         <option value="admin">Admin</option>
       </select>`)}
       <div class="form-group" id="nu-ref-wrap">
         <label class="form-label" id="nu-ref-lbl">Link to engineer</label>
         <select class="form-input" id="nu-ref">${eO}</select>
       </div>
       ${UI.formGroup('Status', `<select class="form-input" id="nu-status"><option value="active">Active</option><option value="disabled">Disabled</option></select>`)}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="addUserBtn" onclick="MODALS.saveAddUser()">
         <i class="ti ti-user-plus"></i> Create Account
       </button>`
    );
  },

  _updateRoleRef() {
    const role = document.getElementById('nu-role')?.value;
    const map  = { engineer: STATE.db.lists.engineers, area: STATE.db.lists.areas, ops: STATE.db.lists.ops, admin: [] };
    const lbl  = document.getElementById('nu-ref-lbl');
    const sel  = document.getElementById('nu-ref');
    const wrap = document.getElementById('nu-ref-wrap');
    if (lbl) lbl.textContent = role === 'admin' ? 'No link required' : `Link to ${UI.roleLabel(role).toLowerCase()}`;
    if (sel) sel.innerHTML = (map[role]||[]).map(e=>`<option>${e}</option>`).join('');
    if (wrap) wrap.style.opacity = role === 'admin' ? '0.4' : '1';
  },

  async saveAddUser() {
    const name     = document.getElementById('nu-name')?.value.trim();
    const username = document.getElementById('nu-user')?.value.trim();
    const password = document.getElementById('nu-pass')?.value;
    const role     = document.getElementById('nu-role')?.value;
    const ref      = document.getElementById('nu-ref')?.value || '';
    const status   = document.getElementById('nu-status')?.value || 'active';
    if (!name||!username||!password) { UI.toast('All fields required','err'); return; }
    if (STATE.db.users.find(u=>u.username===username)) { UI.toast('Username already taken','err'); return; }
    const btn = document.getElementById('addUserBtn');
    if (btn) { btn.disabled=true; btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .6s linear infinite"></i> Creating…'; }
    UI.setSync('busy');
    try {
      const res = await API.addUser({ username,password,role,name,ref,status });
      STATE.db.users.push({ id:res.id, username,password,role,name,ref,status });
      UI.setSync('live'); UI.closeModal(); APP.showTab('admin');
      UI.toast('User account created','ok');
    } catch(e) {
      UI.setSync('offline','Failed'); UI.toast('Failed: '+e.message,'err');
      if (btn) { btn.disabled=false; btn.innerHTML='<i class="ti ti-user-plus"></i> Create Account'; }
    }
  },

  // ── Edit user (admin) ────────────────────────────────
  openEditUser(id) {
    const u = STATE.db.users.find(x=>x.id===id);
    if (!u) return;
    UI.openModal(
      'Edit User',
      `${UI.formGroup('Full Name', UI.formInput('eu-name','text','Full name', u.name))}
       ${UI.formGroup('Role', `<select class="form-input" id="eu-role">
         <option value="engineer" ${u.role==='engineer'?'selected':''}>Engineer</option>
         <option value="area"     ${u.role==='area'?'selected':''}>Area Manager</option>
         <option value="ops"      ${u.role==='ops'?'selected':''}>Ops Manager</option>
         <option value="admin"    ${u.role==='admin'?'selected':''}>Admin</option>
       </select>`)}
       ${UI.formGroup('Status', `<select class="form-input" id="eu-status">
         <option value="active"   ${(u.status||'active')==='active'?'selected':''}>Active</option>
         <option value="disabled" ${u.status==='disabled'?'selected':''}>Disabled</option>
       </select>`)}`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="euBtn" onclick="MODALS.saveEditUser('${id}')">
         <i class="ti ti-check"></i> Save Changes
       </button>`
    );
  },

  async saveEditUser(id) {
    const name   = document.getElementById('eu-name')?.value.trim();
    const role   = document.getElementById('eu-role')?.value;
    const status = document.getElementById('eu-status')?.value;
    const btn    = document.getElementById('euBtn');
    if (btn) { btn.disabled=true; btn.textContent='Saving…'; }
    UI.setSync('busy');
    try {
      await API.updateUser({ id,name,role,status });
      const u = STATE.db.users.find(x=>x.id===id);
      if (u) { u.name=name; u.role=role; u.status=status; }
      UI.setSync('live'); UI.closeModal(); APP.refreshTab();
      UI.toast('User updated','ok');
    } catch(e) {
      UI.setSync('offline','Failed'); UI.toast('Failed: '+e.message,'err');
      if (btn) { btn.disabled=false; btn.textContent='Save Changes'; }
    }
  },

  // ── Admin reset password ─────────────────────────────
  openResetPassword(id) {
    const u = STATE.db.users.find(x=>x.id===id);
    if (!u) return;
    UI.openModal(
      `Reset Password — ${u.name}`,
      `<div class="store-info-block" style="margin-bottom:14px">
        <div class="store-info-meta">Username: ${u.username} · Role: ${UI.roleLabel(u.role)}</div>
      </div>
      ${UI.formGroup('New Password', UI.formInput('rp-new','password','Enter new password'))}
      ${UI.formGroup('Confirm Password', UI.formInput('rp-confirm','password','Repeat new password'))}
      <div id="rp-err" class="login-error"></div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Cancel</button>
       <button class="btn btn-brand" id="rpBtn" onclick="MODALS.saveResetPassword('${id}')">
         <i class="ti ti-key"></i> Reset Password
       </button>`
    );
  },

  async saveResetPassword(id) {
    const newPass = document.getElementById('rp-new')?.value;
    const confirm = document.getElementById('rp-confirm')?.value;
    const errEl   = document.getElementById('rp-err');
    if (!newPass||!confirm) { if(errEl) errEl.textContent='Both fields required'; return; }
    if (newPass!==confirm)  { if(errEl) errEl.textContent='Passwords do not match'; return; }
    if (newPass.length<6)   { if(errEl) errEl.textContent='Min 6 characters'; return; }
    const btn = document.getElementById('rpBtn');
    if (btn) { btn.disabled=true; btn.textContent='Saving…'; }
    UI.setSync('busy');
    try {
      await API.changePassword(id, '', newPass);
      const u = STATE.db.users.find(x=>x.id===id);
      if (u) u.password = newPass;
      UI.setSync('live'); UI.closeModal();
      UI.toast('Password reset successfully','ok');
    } catch(e) {
      UI.setSync('offline','Failed'); UI.toast('Failed: '+e.message,'err');
      if (btn) { btn.disabled=false; btn.textContent='Reset Password'; }
    }
  }
};