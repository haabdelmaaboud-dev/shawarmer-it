/* =====================================================
   state.js — Global Application State v5.1
   Enhanced with daily tracking, activity feed, health scoring
   ===================================================== */
const STATE = {
  currentUser: null,
  db: {
    stores: [], users: [],
    lists: { engineers:[], ops:[], areas:[], devices:[] },
    timestamp: 0,
    contacts: {} // branch contacts
  },
  currentTab: 'dashboard',

  // Filters
  filters: { 
    eng:'', ops:'', area:'', store:'', device:'', q:'', 
    view:'all', issueStatus:'', health:'', checkedToday:'' 
  },

  // Daily tracking
  daily: {
    date: new Date().toISOString().split('T')[0],
    checkedStores: [],
    progress: 0,
    started: false,
    startTime: null
  },

  // Activity feed
  activities: JSON.parse(localStorage.getItem('activities') || '[]'),

  // UI state
  pollTimer: null,
  editId: null,
  theme: localStorage.getItem('theme') || 'light',
  notifications: JSON.parse(localStorage.getItem('notifs') || '[]'),
  sidebarOpen: false,

  // ── Helpers ────────────────────────────────────────
  devList() {
    return STATE.db.lists.devices.length
      ? STATE.db.lists.devices
      : ['DMB','Kitchen','POS','Kiosk','Tablet'];
  },

  score(store) {
    return STATE.devList().reduce((s, d) => s + (store[d] ? 1 : 0), 0);
  },

  pct(store) {
    const d = STATE.devList();
    return d.length ? Math.round(STATE.score(store) / d.length * 100) : 0;
  },

  scoreCls(store) {
    const p = STATE.pct(store);
    return p === 100 ? 'healthy' : p >= 70 ? 'warning' : 'critical';
  },

  hasIssue(store) {
    return STATE.score(store) < STATE.devList().length;
  },

  // Health score with history weight
  healthScore(store) {
    const base = STATE.pct(store);
    const repeated = (store.repeatedIssues || 0) * 5;
    const daysUnchecked = store.lastCheck ? 
      Math.floor((Date.now() - new Date(store.lastCheck).getTime()) / 86400000) : 7;
    const uncheckedPenalty = Math.min(daysUnchecked * 3, 30);
    return Math.max(0, Math.min(100, base - repeated - uncheckedPenalty));
  },

  healthLabel(store) {
    const s = STATE.healthScore(store);
    if (s >= 90) return 'healthy';
    if (s >= 70) return 'warning';
    return 'critical';
  },

  myStores() {
    const u = STATE.currentUser;
    if (!u) return [];
    let s = STATE.db.stores;
    if (u.role === 'engineer') s = s.filter(x => x.eng === u.ref);
    if (u.role === 'area')     s = s.filter(x => x.area === u.ref);
    if (u.role === 'ops')      s = s.filter(x => x.ops === u.ref);
    return s;
  },

  applyFilters(stores) {
    const f = STATE.filters;
    return stores.filter(r => {
      if (f.eng    && r.eng    !== f.eng)    return false;
      if (f.ops    && r.ops    !== f.ops)    return false;
      if (f.area   && r.area   !== f.area)   return false;
      if (f.store  && r.branch !== f.store)  return false;
      if (f.device && r[f.device] === 1)     return false;
      if (f.health && STATE.healthLabel(r) !== f.health) return false;
      if (f.checkedToday === 'yes' && !STATE.isCheckedToday(r.id)) return false;
      if (f.checkedToday === 'no'  && STATE.isCheckedToday(r.id)) return false;
      if (f.q) {
        const q = f.q.toLowerCase();
        if (!r.branch.toLowerCase().includes(q) && !String(r.id).includes(q)) return false;
      }
      if (f.view === 'issues' && !STATE.hasIssue(r)) return false;
      if (f.view === 'ok'     &&  STATE.hasIssue(r)) return false;
      return true;
    });
  },

  canEdit(store) {
    const u = STATE.currentUser;
    if (!u) return false;
    if (u.role === 'admin')    return true;
    if (u.role === 'engineer') return u.ref === store.eng;
    if (u.role === 'area')     return u.ref === store.area;
    if (u.role === 'ops')      return u.ref === store.ops;
    return false;
  },

  isAdmin()    { return STATE.currentUser?.role === 'admin'; },
  isEngineer() { return STATE.currentUser?.role === 'engineer'; },
  isAreaMgr()  { return STATE.currentUser?.role === 'area'; },
  isOpsMgr()   { return STATE.currentUser?.role === 'ops'; },

  // Daily tracking
  isCheckedToday(storeId) {
    return STATE.daily.checkedStores.includes(String(storeId));
  },

  markChecked(storeId) {
    if (!STATE.isCheckedToday(storeId)) {
      STATE.daily.checkedStores.push(String(storeId));
      STATE.saveDaily();
    }
  },

  getDailyProgress() {
    const total = STATE.myStores().length;
    if (!total) return 0;
    return Math.round(STATE.daily.checkedStores.length / total * 100);
  },

  saveDaily() {
    localStorage.setItem('daily_' + STATE.daily.date, JSON.stringify(STATE.daily));
  },

  loadDaily() {
    const today = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem('daily_' + today);
    if (saved) {
      STATE.daily = JSON.parse(saved);
    } else {
      // New day - reset daily stats but keep persistent data
      STATE.daily = {
        date: today,
        checkedStores: [],
        progress: 0,
        started: false,
        startTime: null
      };
      STATE.saveDaily();
    }
  },

  startDay() {
    STATE.daily.started = true;
    STATE.daily.startTime = new Date().toISOString();
    STATE.saveDaily();
  },

  // Activity feed
  addActivity(action, store, details = '') {
    const act = {
      id: Date.now(),
      type: action,
      user: STATE.currentUser?.name || 'System',
      userRole: STATE.currentUser?.role || '',
      storeId: store?.id || '',
      branch: store?.branch || '',
      details,
      timestamp: new Date().toISOString()
    };
    STATE.activities.unshift(act);
    if (STATE.activities.length > 100) STATE.activities = STATE.activities.slice(0, 100);
    localStorage.setItem('activities', JSON.stringify(STATE.activities));
    return act;
  },

  getRecentActivities(limit = 20) {
    return STATE.activities.slice(0, limit);
  },

  // Smart insights
  getInsights() {
    const stores = STATE.myStores();
    const insights = [];

    // Repeated issues
    const repeated = stores.filter(s => (s.repeatedIssues || 0) > 2);
    if (repeated.length > 0) {
      insights.push({
        type: 'warning',
        icon: 'ti-alert-triangle',
        text: `<strong>${repeated.length}</strong> store${repeated.length > 1 ? 's have' : ' has'} repeated device issues`
      });
    }

    // Unchecked stores
    const unchecked = stores.filter(s => !STATE.isCheckedToday(s.id));
    if (unchecked.length > 0) {
      insights.push({
        type: 'info',
        icon: 'ti-info-circle',
        text: `<strong>${unchecked.length}</strong> store${unchecked.length > 1 ? 's' : ''} unchecked today`
      });
    }

    // Critical stores
    const critical = stores.filter(s => STATE.healthLabel(s) === 'critical');
    if (critical.length > 0) {
      insights.push({
        type: 'critical',
        icon: 'ti-alert-circle',
        text: `<strong>${critical.length}</strong> store${critical.length > 1 ? 's' : ''} require immediate attention`
      });
    }

    // Performance trend (mock calculation)
    const prevWeek = 75; // Would come from historical data
    const current = Math.round(stores.filter(s => !STATE.hasIssue(s)).length / (stores.length || 1) * 100);
    if (current > prevWeek) {
      insights.push({
        type: 'success',
        icon: 'ti-trending-up',
        text: `Performance improved by <strong>${current - prevWeek}%</strong> from last week`
      });
    }

    return insights;
  },

  // Notifications
  addNotification(msg, type, storeId) {
    const n = { 
      id: Date.now(), msg, type: type||'info', storeId: storeId||'', 
      ts: new Date().toISOString(), read: false 
    };
    STATE.notifications.unshift(n);
    if (STATE.notifications.length > 50) STATE.notifications = STATE.notifications.slice(0, 50);
    localStorage.setItem('notifs', JSON.stringify(STATE.notifications));
    NOTIF?.updateBadge();
    return n;
  },

  unreadCount() {
    return STATE.notifications.filter(n => !n.read).length;
  },

  // Engineer stats
  getEngineerStats() {
    const stores = STATE.myStores();
    const total = stores.length;
    const checked = stores.filter(s => STATE.isCheckedToday(s.id)).length;
    const critical = stores.filter(s => STATE.healthLabel(s) === 'critical').length;
    const remaining = total - checked;

    return { total, checked, critical, remaining, pct: total ? Math.round(checked / total * 100) : 0 };
  },

  // Store contacts
  getStoreContacts(storeId) {
    return STATE.db.contacts[storeId] || [];
  }
};

// Load daily state on init
STATE.loadDaily();