/* =====================================================
   notifications.js — In-App Notification System v5.1
   ===================================================== */
const NOTIF = {
  updateBadge() {
    const cnt   = STATE.unreadCount();
    const badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = cnt > 9 ? '9+' : cnt;
      badge.classList.toggle('hidden', cnt === 0);
    }
  },

  add(msg, type, storeId) {
    const n = STATE.addNotification(msg, type, storeId);
    NOTIF.updateBadge();
    const toastType = type === 'critical' ? 'err' : type === 'warn' ? 'warn' : 'info';
    UI.toast(msg, toastType);
    return n;
  },

  renderPanel() {
    const list = document.getElementById('notifList');
    if (!list) return;
    const notifs = STATE.notifications;
    if (!notifs.length) {
      list.innerHTML = '<div class="notif-empty"><i class="ti ti-bell-off"></i><p>No notifications</p></div>';
      return;
    }
    list.innerHTML = notifs.slice(0, 20).map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="NOTIF.markRead(${n.id})">
        <div class="notif-icon ${n.type}"><i class="ti ${n.type==='critical'?'ti-alert-triangle':n.type==='warn'?'ti-alert-circle':'ti-info-circle'}"></i></div>
        <div class="notif-content">
          <div class="notif-msg">${n.msg}</div>
          <div class="notif-time">${new Date(n.ts).toLocaleString()}</div>
        </div>
      </div>`).join('');
  },

  markRead(id) {
    const n = STATE.notifications.find(x => x.id === id);
    if (n) { n.read = true; localStorage.setItem('notifs', JSON.stringify(STATE.notifications)); }
    NOTIF.updateBadge();
    NOTIF.renderPanel();
  },

  clearAll() {
    STATE.notifications = [];
    localStorage.setItem('notifs', '[]');
    NOTIF.updateBadge();
    NOTIF.renderPanel();
  },

  // Check for new issues and notify
  checkIssues(oldStores, newStores) {
    if (!oldStores.length) return;
    const devs = STATE.devList();
    newStores.forEach(ns => {
      const os = oldStores.find(s => String(s.id) === String(ns.id));
      if (!os) return;
      devs.forEach(d => {
        if (os[d] === 1 && ns[d] === 0) {
          const msg = `⚠️ ${d} issue at ${ns.branch}`;
          const isCritical = CONFIG.CRITICAL_DEVICES.includes(d);
          NOTIF.add(msg, isCritical ? 'critical' : 'warn', ns.id);
        }
      });
    });
  }
};