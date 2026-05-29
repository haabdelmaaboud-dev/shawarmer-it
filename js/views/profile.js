/* =====================================================
   views/profile.js — Profile & Password v5.1
   ===================================================== */
const ProfileView = {
  render() {
    const u = STATE.currentUser || APP.user || {};
    return `
      <div class="view-header">
        <h2 class="view-title"><i class="ti ti-user"></i> My Profile</h2>
      </div>
      <div class="profile-grid">
        <div class="profile-card">
          <div class="profile-avatar">${UI.initials(u.name)}</div>
          <div class="profile-name">${u.name}</div>
          <div class="profile-username">@${u.username}</div>
          <span class="role-chip ${UI.roleCls(u.role)}" style="margin-top:8px">${UI.roleLabel(u.role)}</span>
          ${u.ref ? `<div class="profile-ref muted" style="margin-top:8px">Linked to: ${u.ref}</div>` : ''}
        </div>

        <div class="profile-form-card">
          <div class="profile-section-title"><i class="ti ti-key"></i> Change password</div>
          <div class="form-group">
            <label class="form-label">Current password</label>
            <input class="form-input" type="password" id="pw-old" placeholder="Enter current password">
          </div>
          <div class="form-group">
            <label class="form-label">New password</label>
            <input class="form-input" type="password" id="pw-new" placeholder="Enter new password">
          </div>
          <div class="form-group">
            <label class="form-label">Confirm new password</label>
            <input class="form-input" type="password" id="pw-confirm" placeholder="Repeat new password">
          </div>
          <div id="pw-err" class="login-error"></div>
          <button class="btn btn-brand" onclick="ProfileView.changePassword()">
            <i class="ti ti-check"></i> Update password
          </button>
        </div>
      </div>`;
  },

  async changePassword() {
    const u       = STATE.currentUser;
    const oldPass = document.getElementById('pw-old')?.value;
    const newPass = document.getElementById('pw-new')?.value;
    const confirm = document.getElementById('pw-confirm')?.value;
    const errEl   = document.getElementById('pw-err');

    if (!oldPass || !newPass || !confirm) { if (errEl) errEl.textContent = 'All fields are required'; return; }
    if (newPass !== confirm) { if (errEl) errEl.textContent = 'New passwords do not match'; return; }
    if (newPass.length < 6) { if (errEl) errEl.textContent = 'Password must be at least 6 characters'; return; }
    if (errEl) errEl.textContent = '';

    UI.setSync('busy');
    try {
      await API.changePassword(u.id, oldPass, newPass, u.name);
      u.password = newPass;
      const dbUser = STATE.db.users.find(x => x.id === u.id);
      if (dbUser) dbUser.password = newPass;
      UI.setSync('live');
      UI.toast('Password updated successfully', 'ok');
      document.getElementById('pw-old').value     = '';
      document.getElementById('pw-new').value     = '';
      document.getElementById('pw-confirm').value = '';
    } catch(e) {
      UI.setSync('offline','Failed');
      if (errEl) errEl.textContent = e.message;
      UI.toast('Failed: ' + e.message, 'err');
    }
  }
};

const PasswordView = {
  render() { return ProfileView.render(); }
};