// Shawarmer IT — Global Config
const APP_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbw35cOVDQ7wjM2a93PceK9sDWw6ZVWAeVtCuYZKMz5dxXbgOwjExDzUkubF1oUNVJ69/exec",
  VERSION: "6.1",
  BUILD: "2025.05.28",
  CACHE_SECONDS: 120,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  THEME: "light",
  SIDEBAR_COLLAPSED: false,
  LAST_TAB: "dashboard"
};

// Hash function (must match backend exactly)
function hashPassword(password) {
  const raw = password + "_shawarmer_salt_2025";
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return "sha_" + Math.abs(hash).toString(16).padStart(16, "0");
}

// Device configuration
const DEVICES = ["DMB", "Kitchen", "POS", "Kiosk", "Tablet"];

// Role labels
const ROLE_LABELS = {
  admin: "Administrator",
  engineer: "IT Engineer",
  area: "Area Manager",
  ops: "Ops Manager"
};

// Status config
const STATUS_CONFIG = {
  healthy:  { label: "Healthy",  icon: "ti-check",      color: "#10b981", bg: "#ecfdf5" },
  warning:  { label: "Warning",  icon: "ti-alert-triangle", color: "#f59e0b", bg: "#fffbeb" },
  critical: { label: "Critical", icon: "ti-x",          color: "#ef4444", bg: "#fef2f2" },
  offline:  { label: "Offline",  icon: "ti-wifi-off",   color: "#6b7280", bg: "#f3f4f6" },
  open:     { label: "Open",     icon: "ti-circle-dot", color: "#3b82f6", bg: "#eff6ff" }
};

// Navigation
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard", roles: ["admin","engineer","area","ops"] },
  { id: "stores",    label: "Stores",    icon: "ti-building-store",   roles: ["admin","engineer","area","ops"] },
  { id: "critical",  label: "Critical",  icon: "ti-alert-triangle",   roles: ["admin","engineer","area","ops"] },
  { id: "reports",   label: "Reports",   icon: "ti-chart-bar",        roles: ["admin","ops","area"] },
  { id: "engineers", label: "Engineers", icon: "ti-users",            roles: ["admin","ops","area"] },
  { id: "alerts",    label: "Alerts",    icon: "ti-bell",             roles: ["admin","engineer","area","ops"] },
  { id: "auditlog",  label: "Audit Log", icon: "ti-file-text",        roles: ["admin"] },
  { id: "history",   label: "History",   icon: "ti-history",          roles: ["admin"] },
  { id: "admin",     label: "Admin",     icon: "ti-settings",         roles: ["admin"] },
  { id: "profile",   label: "Profile",   icon: "ti-user",             roles: ["admin","engineer","area","ops"] }
];