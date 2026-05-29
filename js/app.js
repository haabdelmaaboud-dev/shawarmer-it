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
 document.getElementById("screen" + name.charAt(0).toUpperCase() + name.slice(1)).classList.remove("hidden");

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
 fill.style.width = (step * 25) + "%";
 if (msg && messages[step - 1]) msg.textContent = messages[step - 1];

 if (step >= 4) {
 clearInterval(interval);
 setTimeout(() => this.init(), 300);
 }
 }, 400);
 },

 async login() {
 const username = document.getElementById("liUser").value.trim();
 const password = document.getElementById("liPass").value;
 const errEl = document.getElementById("liErr");
 const btn = document.getElementById("loginBtn");

 errEl.textContent = "";

 if (!username || !password) {
 errEl.textContent = "Please enter username and password";
 return;
 }

 btn.disabled = true;
 btn.innerHTML = '<i class="icon-spinner spin"></i> Signing in…';

 try {
 const result = await API.verifyLogin(username, password);

 btn.disabled = false;
 btn.innerHTML = '<i class="icon-login"></i> Sign in';

 if (result.ok && result.user) {
 this.user = result.user;
 this.token = result.token;
 localStorage.setItem("shawarmer_user", JSON.stringify(result.user));
 localStorage.setItem("shawarmer_token", result.token);

 this.showScreen("loading");
 } else {
 errEl.textContent = result.error || "Incorrect username or password";
 }
 } catch (err) {
 btn.disabled = false;
 btn.innerHTML = '<i class="icon-login"></i> Sign in';
 errEl.textContent = "Network error. Please try again.";
 console.error("Login error:", err);
 }
 },

 logout() {
 this.user = null;
 this.token = null;
 localStorage.removeItem("shawarmer_user");
 localStorage.removeItem("shawarmer_token");
 this.showScreen("login");
 document.getElementById("liUser").value = "";
 document.getElementById("liPass").value = "";
 document.getElementById("liErr").textContent = "";
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

 document.querySelectorAll(".mobile-nav-item").forEach(el => {
 el.classList.toggle("active", el.dataset.tab === tabId);
 });

 const contentArea = document.getElementById("contentArea");
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

 if (window.innerWidth < 1024) {
 this.sidebarOpen = false;
 document.getElementById("sidebar").classList.remove("open");
 document.getElementById("sidebarOverlay").classList.add("hidden");
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
 <i class="icon-${item.icon}"></i>
 <span>${item.label}</span>
 </button>
 `).join("");
 },

 refreshTab() {
 this.showTab(this.currentTab);
 },

 toggleSidebar() {
 this.sidebarOpen = !this.sidebarOpen;
 document.getElementById("sidebar").classList.toggle("open", this.sidebarOpen);
 document.getElementById("sidebarOverlay").classList.toggle("hidden", !this.sidebarOpen);
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

 if (greetingEl) {
 const hour = new Date().getHours();
 let greeting = "Good Morning";
 if (hour >= 12) greeting = "Good Afternoon";
 if (hour >= 17) greeting = "Good Evening";

 greetingEl.innerHTML = `
 <div class="greeting-title">${greeting}, ${this.user.name || this.user.username}</div>
 <div class="greeting-subtitle">Here's what's happening with your stores today.</div>
 `;
 }
 },

 toggleTheme() {
 this.theme = this.theme === "light" ? "dark" : "light";
 document.documentElement.setAttribute("data-theme", this.theme);
 localStorage.setItem("shawarmer_theme", this.theme);

 const btn = document.getElementById("themeBtn");
 if (btn) btn.innerHTML = `<i class="icon-${this.theme === "light" ? "moon" : "sun"}"></i>`;
 },

 loadTheme() {
 const saved = localStorage.getItem("shawarmer_theme") || "light";
 this.theme = saved;
 document.documentElement.setAttribute("data-theme", saved);
 },

 updateDate() {
 const now = new Date();
 const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
 const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

 const dayEl = document.getElementById("dateDay");
 const weekdayEl = document.getElementById("dateWeekday");

 if (dayEl) dayEl.textContent = `${now.getDate()} ${months[now.getMonth()]}`;
 if (weekdayEl) weekdayEl.textContent = days[now.getDay()];
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
 STORES.renderSearchResults(results);
 }
 },

 async showNotifications() {
 const panel = document.getElementById("notifPanel");
 panel.classList.toggle("hidden");

 if (!panel.classList.contains("hidden")) {
 try {
 const data = await API.getNotifications({ status: "pending", limit: 20 });
 NOTIF.renderPanel();
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
 setTimeout(() => STORES.showCheckModal(), 100);
 } else {
 this.showTab("stores");
 }
 },

 startDay() {
 const btn = document.getElementById("startDayBtn");
 btn.innerHTML = '<i class="icon-check"></i> Day Started';
 btn.disabled = true;
 btn.classList.add("btn-success");

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
 const toast = document.createElement("div");
 toast.className = `toast toast-${type}`;
 toast.innerHTML = `
 <i class="icon-${type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info'}"></i>
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
 document.getElementById("modalOverlay").classList.add("hidden");
 document.getElementById("modalBox").classList.remove("modal-show");
}

function handleOverlayClick(e) {
 if (e.target === document.getElementById("modalOverlay")) {
 closeModal();
 }
}

document.addEventListener("DOMContentLoaded", () => {
 APP.showScreen("loading");
});
