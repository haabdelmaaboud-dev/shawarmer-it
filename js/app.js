// Shawarmer IT — Main Application Controller
const APP = {
 user: null,
 token: null,
 data: { stores: [], users: [], lists: {}, stats: null },
 currentTab: "dashboard",
 sidebarOpen: false,
 theme: "light",
 notifications: [],
 isOnline: true,
 syncQueue: [],

 init() {
 this.checkAuth();
 this.setupEventListeners();
 this.updateDate();
 this.loadTheme();

 if (this.user) {
 this.showScreen("app");
 this.renderSidebar();
 this.updateUserDisplay();
 this.loadData().then(() => {
 this.showTab(APP_CONFIG.LAST_TAB || "dashboard");
 this.startPolling();
 });
 } else {
 this.showScreen("login");
 }
 },

 checkAuth() {
 const storedUser = localStorage.getItem("shawarmer_user");
 const storedToken = localStorage.getItem("shawarmer_token");

 if (storedUser && storedToken) {
 try {
 this.user = JSON.parse(storedUser);
 this.token = storedToken;
 } catch (e) {
 this.logout();
 }
 }
 },

 showScreen(name) {
 document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
 const screenEl = document.getElementById("screen" + name.charAt(0).toUpperCase() + name.slice(1));
 if (screenEl) screenEl.classList.remove("hidden");

 if (name === "loading") {
 this.animateLoader();
 }
 },

 animateLoader() {
 const fill = document.getElementById("loaderFill");
 const msg = document.getElementById("loaderMsg");
 const messages = ["Connecting to server…", "Loading stores…", "Syncing data…", "Ready!"];
 let step = 0;

 const interval = setInterval(() => {
 step++;
 if (fill) fill.style.width = (step * 25) + "%";
 if (msg && messages[step - 1]) msg.textContent = messages[step - 1];

 if (step >= 4) {
 clearInterval(interval);
 setTimeout(() => {
    if (this.user) {
      this.showScreen("app");
      this.renderSidebar();
      this.updateUserDisplay();
      this.showTab(APP_CONFIG.LAST_TAB || "dashboard");
    } else {
      this.showScreen("login");
    }
 }, 300);
 }
 }, 400);
 },

 async login() {
 const username = document.getElementById("liUser").value.trim();
 const password = document.getElementById("liPass").value;
 const errEl = document.getElementById("liErr");
 const btn = document.getElementById("loginBtn");

 if (errEl) errEl.textContent = "";

 if (!username || !password) {
 if (errEl) errEl.textContent = "Please enter username and password";
 return;
 }

 if (btn) {
 btn.disabled = true;
 btn.innerHTML = '<i class="ti ti-spinner spin"></i> Signing in…';
 }

 try {
 const result = await API.verifyLogin(username, password);

 if (btn) {
 btn.disabled = false;
 btn.innerHTML = '<i class="ti ti-login"></i> Sign in';
 }

 if (result.ok && result.user) {
 this.user = result.user;
 this.token = result.token;
 localStorage.setItem("shawarmer_user", JSON.stringify(result.user));
 localStorage.setItem("shawarmer_token", result.token);

 this.showScreen("loading");
 } else {
 if (errEl) errEl.textContent = result.error || "Incorrect username or password";
 }
 } catch (err) {
 if (btn) {
 btn.disabled = false;
 btn.innerHTML = '<i class="ti ti-login"></i> Sign in';
 }
 if (errEl) errEl.textContent = "Network error. Please try again.";
 console.error("Login error:", err);
 }
 },

 logout() {
 this.user = null;
 this.token = null;
 localStorage.removeItem("shawarmer_user");
 localStorage.removeItem("shawarmer_token");
 this.showScreen("login");
 
 const uField = document.getElementById("liUser");
 const pField = document.getElementById("liPass");
 const eField = document.getElementById("liErr");
 
 if (uField) uField.value = "";
 if (pField) pField.value = "";
 if (eField) eField.textContent = "";
 },

 showTab(tabId) {
 if (!this.canAccessTab(tabId)) {
 this.toast("You don't have access to this section", "error");
 return;
 }

 this.currentTab = tabId;
 APP_CONFIG.LAST_TAB = tabId;

 document.querySelectorAll(".nav-item, .mobile-nav-item").forEach(el => {
 el.classList.toggle("active", el.dataset.tab === tabId);
 });

 const contentArea = document.getElementById("contentArea");
 if (contentArea) {
 contentArea.innerHTML = "";

 switch(tabId) {
 case "dashboard": DashboardView.render(); break;
 case "stores": StoresView.render(); break;
 case "critical": CriticalView.render(); break;
 case "reports": ReportsView.render(); break;
 case "engineers": EngineersView.render(); break;
 case "alerts": AlertsView.render(); break;
 case "auditlog": AuditView.render(); break;
 case "history": HistoryView.render(); break;
 case "admin": AdminView.render(); break;
 case "profile": ProfileView.render(); break;
 default: DashboardView.render();
 }
 }

 if (window.innerWidth < 1024) {
 this.sidebarOpen = false;
 const sidebar = document.getElementById("sidebar");
 const overlay = document.getElementById("sidebarOverlay");
 if (sidebar) sidebar.classList.remove("open");
 if (overlay) overlay.classList.add("hidden");
 }
 },

 canAccessTab(tabId) {
 if (!this.user) return false;
 const item = NAV_ITEMS.find(n => n.id === tabId);
 return item ? item.roles.includes(this.user.role) : false;
 },

 renderSidebar() {
 const navEl = document.getElementById("navItems");
 if (!navEl) return;

 const filtered = NAV_ITEMS.filter(n => n.roles.includes(this.user?.role));

 navEl.innerHTML = filtered.map(item => `
 <button class="nav-item" data-tab="${item.id}" onclick="APP.showTab('${item.id}')">
 <i class="${item.icon}"></i>
 <span>${item.label}</span>
 </button>
 `).join("");
 },

 refreshTab() {
 this.showTab(this.currentTab);
 },

 toggleSidebar() {
 this.sidebarOpen = !this.sidebarOpen;
 const sidebar = document.getElementById("sidebar");
 const overlay = document.getElementById("sidebarOverlay");
 if (sidebar) sidebar.classList.toggle("open", this.sidebarOpen);
 if (overlay) overlay.classList.toggle("hidden", !this.sidebarOpen);
 },

 updateUserDisplay() {
 if (!this.user) return;

 const nameEl = document.getElementById("sidebarUserName");
 const roleEl = document.getElementById("sidebarUserRole");
 const avatarEl = document.getElementById("sidebarAvatar");
 const greetingEl = document.getElementById("greetingText");

 if (nameEl) nameEl.textContent = this.user.name || this.user.username;
 if (roleEl) roleEl.textContent = ROLE_LABELS[this.user.role] || this.user.role;
 if (avatarEl) avatarEl.textContent = (this.user.name || this.user.username || "U").charAt(0).toUpperCase();

 if (greetingEl && typeof UI !== 'undefined') {
 const greeting = UI.greeting(this.user.name || this.user.username);
 greetingEl.innerHTML = `
 <div class="greeting-title">${greeting}</div>
 <div class="greeting-subtitle">Here's what's happening with your stores today.</div>
 `;
 }
 },

 toggleTheme() {
 this.theme = this.theme === "light" ? "dark" : "light";
 document.documentElement.setAttribute("data-theme", this.theme);
 localStorage.setItem("shawarmer_theme", this.theme);

 const btn = document.getElementById("themeBtn");
 if (btn) btn.innerHTML = `<i class="ti ti-${this.theme === "light" ? "moon" : "sun"}"></i>`;
 },

 loadTheme() {
 const saved = localStorage.getItem("shawarmer_theme") || "light";
 this.theme = saved;
 document.documentElement.setAttribute("data-theme", saved);
 },

 updateDate() {
 if (typeof UI !== 'undefined') {
 const dateInfo = UI.formatDate();
 const dayEl = document.getElementById("dateDay");
 const weekdayEl = document.getElementById("dateWeekday");

 if (dayEl) dayEl.textContent = dateInfo.day;
 if (weekdayEl) weekdayEl.textContent = dateInfo.weekday;
 }
 },

 handleGlobalSearch(query) {
 if (!query || query.length < 2) return;

 const results = this.data.stores.filter(s =>
 s.branch?.toLowerCase().includes(query.toLowerCase()) ||
 s.eng?.toLowerCase().includes(query.toLowerCase()) ||
 s.area?.toLowerCase().includes(query.toLowerCase())
 );

 if (results.length > 0) {
 this.showTab("stores");
 if (typeof STORES !== 'undefined') STORES.renderSearchResults(results);
 }
 },

 async showNotifications() {
 const panel = document.getElementById("notifPanel");
 if (!panel) return;
 panel.classList.toggle("hidden");

 if (!panel.classList.contains("hidden")) {
 try {
 const data = await API.getNotifications({ status: "pending", limit: 20 });
 if (typeof NOTIF !== 'undefined') NOTIF.renderPanel();
 } catch (e) {
 console.error("Failed to load notifications", e);
 }
 }
 },

 startPolling() {
 this.pollData();
 setInterval(() => this.pollData(), 30000);
 },

 async pollData() {
 try {
 const [stats, issues, notifications] = await Promise.all([
 API.getDashboardSummary(),
 API.getIssues({ issueStatus: "open", limit: 5 }),
 API.getNotifications({ status: "pending", limit: 5 })
 ]);

 this.updateBadges(stats.summary, issues.issues || []);
 } catch (e) {
 console.log("Poll failed (offline?)", e);
 }
 },

 updateBadges(summary, issues) {
 const criticalCount = summary?.stats?.critical || 0;
 const alertCount = issues?.length || 0;

 const notifBadge = document.getElementById("notifBadge");
 if (notifBadge) {
 notifBadge.textContent = alertCount;
 notifBadge.classList.toggle("hidden", alertCount === 0);
 }

 const mobileCritical = document.getElementById("mobileCriticalBadge");
 const mobileAlert = document.getElementById("mobileAlertBadge");

 if (mobileCritical) {
 mobileCritical.textContent = criticalCount;
 mobileCritical.classList.toggle("hidden", criticalCount === 0);
 }
 if (mobileAlert) {
 mobileAlert.textContent = alertCount;
 mobileAlert.classList.toggle("hidden", alertCount === 0);
 }
 },

 quickAction() {
 if (this.user?.role === "engineer") {
 this.showTab("stores");
 if (typeof STORES !== 'undefined') setTimeout(() => STORES.showCheckModal(), 100);
 } else {
 this.showTab("stores");
 }
 },

 startDay() {
 const btn = document.getElementById("startDayBtn");
 if (btn) {
 btn.innerHTML = '<i class="ti ti-check"></i> Day Started';
 btn.disabled = true;
 btn.classList.add("btn-success");
 }

 API.logAction("DAY_START", "Engineer started daily rounds");
 this.toast("Day started! Good luck with your rounds.", "success");
 },

 installPWA() {
 if (window.APP_INSTALL_PROMPT) {
 window.APP_INSTALL_PROMPT();
 }
 },

 toast(message, type = "info") {
 const stack = document.getElementById("toastStack");
 if (!stack) return;
 const toast = document.createElement("div");
 toast.className = `toast toast-${type}`;
 toast.innerHTML = `
 <i class="ti ti-${type === 'success' ? 'check' : type === 'error' ? 'alert-triangle' : 'info-circle'}"></i>
 <span>${message}</span>
 `;

 stack.appendChild(toast);

 requestAnimationFrame(() => {
 toast.classList.add("show");
 setTimeout(() => {
 toast.classList.remove("show");
 setTimeout(() => toast.remove(), 300);
 }, 3000);
 });
 },

 async loadData() {
 try {
 const res = await API.getDashboardSummary();
 this.data.stores = res.stores || [];
 } catch(e) { console.log("Data load warning", e); }
 },

 setupEventListeners() {
 const passField = document.getElementById("liPass");
 if (passField) {
 passField.addEventListener("keypress", (e) => {
 if (e.key === "Enter") this.login();
 });
 }

 window.addEventListener("resize", () => {
 if (window.innerWidth >= 1024) {
 document.getElementById("sidebarOverlay")?.classList.add("hidden");
 }
 });

 window.addEventListener("online", () => {
 this.isOnline = true;
 this.toast("Back online", "success");
 });

 window.addEventListener("offline", () => {
 this.isOnline = false;
 this.toast("You are offline", "warning");
 });
 }
};

function closeModal() {
 const overlay = document.getElementById("modalOverlay");
 const box = document.getElementById("modalBox");
 if (overlay) overlay.classList.add("hidden");
 if (box) box.classList.remove("modal-show");
}

function handleOverlayClick(e) {
 const overlay = document.getElementById("modalOverlay");
 if (overlay && e.target === overlay) {
   closeModal();
 }
}

document.addEventListener("DOMContentLoaded", () => {
 APP.showScreen("loading");
});