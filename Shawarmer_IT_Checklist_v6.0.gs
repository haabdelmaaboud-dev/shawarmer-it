// ============================================================
//  Shawarmer IT Checklist — Apps Script v6.1 PRODUCTION
//  Complete backend with verifyLogin integrated
//  Full backend for IT Operations Dashboard + Mobile PWA
//  148 stores | WhatsApp-first | Health Scores | Escalation
//  Cache | Notifications | Security | Engineer Tracking
// ============================================================

// ── Configuration ──────────────────────────────────────────

const SHEETS = {
  stores:         "Stores",
  users:          "Users",
  engineers:      "Engineers",
  ops:            "OpsManagers",
  areas:          "AreaManagers",
  devices:        "Devices",
  log:            "AuditLog",
  history:        "StoreHistory",
  issues:         "IssueTracker",
  notifications:  "Notifications"
};

const CONFIG = {
  deviceFields:     ["DMB","Kitchen","POS","Kiosk","Tablet"],
  devicePoints:     20,
  cacheSeconds:     120,
  maxAuditLogRows:  500,
  maxHistoryRows:   200,
  defaultStatus:    "active",
  storeStatusOpen:  "open",
  escalationHours:  48,
  tokenKey:         "API_TOKEN",
  statusRules: {
    healthy:     { minDevices: 5, label: "healthy" },
    warning:     { minDevices: 3, label: "warning" },
    critical:    { minDevices: 1, label: "critical" },
    offline:     { minDevices: 0, label: "offline" }
  }
};

// ── Security ───────────────────────────────────────────────

function getToken() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty(CONFIG.tokenKey);
  if (!token) {
    token = generateSecureToken();
    props.setProperty(CONFIG.tokenKey, token);
  }
  return token;
}

function generateSecureToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "sw_" + token;
}

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

function verifyPassword(stored, provided) {
  return stored === hashPassword(provided);
}

function requireToken(token) {
  if (token !== getToken()) {
    throw new Error("Unauthorized");
  }
}

function sanitizeInput(val) {
  if (typeof val !== "string") return val;
  if (/^[\=\+\-\@]/.test(val)) return "'" + val;
  return val.trim();
}

function parseBool(v) {
  if (v === true || v === 1) return 1;
  if (typeof v === "string" && (v === "1" || v.toLowerCase() === "true")) return 1;
  return 0;
}

// ── Cache Helpers ──────────────────────────────────────────

function cacheGet(key) {
  try {
    const cache = CacheService.getScriptCache();
    const data = cache.get(key);
    return data ? JSON.parse(data) : null;
  } catch(e) { return null; }
}

function cachePut(key, data, seconds) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(key, JSON.stringify(data), seconds || CONFIG.cacheSeconds);
  } catch(e) {}
}

function cacheRemove(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch(e) {}
}

function invalidateStoreCache() {
  cacheRemove("stores");
  cacheRemove("stores_lite");
  cacheRemove("stats");
  cacheRemove("dashboard");
  cacheRemove("lists");
}

// ── Response Helpers ────────────────────────────────────────

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  return jsonResponse({ ok: false, error: message });
}

function successResponse(data) {
  return jsonResponse(Object.assign({ ok: true }, data));
}

// ── Main Router ────────────────────────────────────────────

function doGet(e) {
  try {
    const p      = e.parameter || {};
    const action = p.action    || "ping";
    const token  = p.token     || "";

    // Public reads (no token required)
    switch (action) {
      case "ping":                return successResponse({ ts: Date.now(), version: "6.1" });
      case "verifyLogin":         return successResponse(handleVerifyLogin(p));
      case "getAll":              return successResponse({ data: getAllData() });
      case "getStores":           return successResponse({ stores: getStores() });
      case "getStoresLite":       return successResponse({ stores: getStoresLite() });
      case "getLists":            return successResponse({ lists: getLists() });
      case "getAuditLog":         return successResponse({ log: getAuditLog(p) });
      case "getHistory":          return successResponse({ history: getStoreHistory(p.storeId) });
      case "getStats":            return successResponse({ stats: getStats() });
      case "getIssues":           return successResponse({ issues: getIssues(p) });
      case "getDashboardSummary": return successResponse({ summary: getDashboardSummary() });
      case "getEngineerStats":    return successResponse({ engineers: getEngineerStats() });
      case "getNotifications":    return successResponse({ notifications: getNotifications(p) });
      case "generateWhatsapp":    return successResponse({ link: generateWhatsappLink(p) });
    }

    // Token-protected writes
    requireToken(token);

    switch (action) {
      case "setupInitialData":      return successResponse(handleSetupInitialData());
      case "updateStore":           return successResponse(handleUpdateStore(p));
      case "addStore":              return successResponse(handleAddStore(p));
      case "deleteStore":           return successResponse(handleDeleteStore(p));
      case "addUser":               return successResponse(handleAddUser(p));
      case "removeUser":            return successResponse(handleRemoveUser(p));
      case "updateUser":            return successResponse(handleUpdateUser(p));
      case "changePassword":        return successResponse(handleChangePassword(p));
      case "addListItem":           return successResponse(addListItem(p.list, p.value));
      case "removeListItem":        return successResponse(removeListItem(p.list, p.value));
      case "logAction":             return successResponse(logAudit(p.type, p.user, p.detail, p.storeId));
      case "updateIssue":           return successResponse(handleUpdateIssue(p));
      case "bulkUpdateStores":      return successResponse(handleBulkUpdateStores(p));
      case "createNotification":    return successResponse(createNotification(p));
      case "markNotificationRead":  return successResponse(markNotificationRead(p.id));
      case "regenerateToken":       return successResponse({ token: regenerateToken() });
    }

    return errorResponse("Unknown action: " + action);
  } catch (err) {
    return errorResponse(err.message);
  }
}

function doPost(e) {
  return errorResponse("Use GET requests only.");
}

// ============================================================
//  LOGIN / AUTH
// ============================================================

function handleVerifyLogin(p) {
  if (!p.username || !p.password) throw new Error("Missing username or password");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.users);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const userCol = headers.indexOf("username");
  const passCol = headers.indexOf("password");
  const statusCol = headers.indexOf("status");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][userCol]) === String(p.username)) {
      if (statusCol >= 0 && String(rows[i][statusCol]) !== "active") {
        throw new Error("Account is inactive");
      }

      const storedHash = String(rows[i][passCol]);
      if (storedHash === p.password) {
        const user = {};
        headers.forEach((h, j) => { 
          user[String(h).trim()] = rows[i][j] !== undefined ? rows[i][j] : ""; 
        });
        delete user.password;

        logAudit("LOGIN", p.username, "Successful login");
        return { user, token: getToken() };
      }
      throw new Error("Incorrect username or password");
    }
  }
  throw new Error("Incorrect username or password");
}

// ============================================================
//  SETUP
// ============================================================

function handleSetupInitialData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Engineers
    const engSheet = getOrCreateSheet(ss, SHEETS.engineers);
    engSheet.clearContents();
    engSheet.appendRow(["Value"]);
    ["Waled Gaber","Karim Maklad","Marvin","Husien"].forEach(v => engSheet.appendRow([v]));

    // Ops Managers
    const opsSheet = getOrCreateSheet(ss, SHEETS.ops);
    opsSheet.clearContents();
    opsSheet.appendRow(["Value"]);
    ["Asif Shaikh","Hany Sharshr","Crishan Moses","Melad Akwan","Mustafa Abbas"].forEach(v => opsSheet.appendRow([v]));

    // Area Managers
    const areaSheet = getOrCreateSheet(ss, SHEETS.areas);
    areaSheet.clearContents();
    areaSheet.appendRow(["Value"]);
    ["Ismaeil Saad","Pathan Inthiaz","Saddam Hussain","Islam Hamza","SHERIF KHALED",
     "Imran Madki","Imtiaz Gani","Mohammed Balhas","Pradeep Kumar Sahu","Bassam Yaiya",
     "Mohammed Salman","Md Emmamuddin","Mantesh Gavandi","Saddik Ali Mohammed",
     "Saeed Dessouky","Jayson Pastoral","Felix Anora","Ahmed Salaheldin",
     "Hosam Salama","Asad Abu Rayyash","Mustafa Abdulaziz"].forEach(v => areaSheet.appendRow([v]));

    // Devices
    const devSheet = getOrCreateSheet(ss, SHEETS.devices);
    devSheet.clearContents();
    devSheet.appendRow(["Value"]);
    ["DMB","Kitchen","POS","Kiosk","Tablet"].forEach(v => devSheet.appendRow([v]));

    // Users with hashed passwords
    const usersSheet = getOrCreateSheet(ss, SHEETS.users);
    usersSheet.clearContents();
    usersSheet.appendRow(["id","username","password","role","name","ref","status"]);
    [
      ["u1","admin",hashPassword("Shawarmer@2025"),"admin","Admin","",CONFIG.defaultStatus],
      ["u2","eng.waled",hashPassword("pass123"),"engineer","Waled Gaber","Waled Gaber",CONFIG.defaultStatus],
      ["u3","eng.karim",hashPassword("pass123"),"engineer","Karim Maklad","Karim Maklad",CONFIG.defaultStatus],
      ["u4","eng.marvin",hashPassword("pass123"),"engineer","Marvin","Marvin",CONFIG.defaultStatus],
      ["u5","eng.husien",hashPassword("pass123"),"engineer","Husien","Husien",CONFIG.defaultStatus],
      ["u6","area.ismaeil",hashPassword("pass123"),"area","Ismaeil Saad","Ismaeil Saad",CONFIG.defaultStatus],
      ["u7","area.imran",hashPassword("pass123"),"area","Imran Madki","Imran Madki",CONFIG.defaultStatus],
      ["u8","ops.asif",hashPassword("pass123"),"ops","Asif Shaikh","Asif Shaikh",CONFIG.defaultStatus],
      ["u9","ops.mustafa",hashPassword("pass123"),"ops","Mustafa Abbas","Mustafa Abbas",CONFIG.defaultStatus]
    ].forEach(u => usersSheet.appendRow(u));

    // Stores sheet
    const storesSheet = getOrCreateSheet(ss, SHEETS.stores);
    if (storesSheet.getLastRow() <= 1) {
      storesSheet.clearContents();
      storesSheet.appendRow(getStoreHeaders());
    } else {
      migrateStoresSheet(storesSheet);
    }

    // Auxiliary sheets
    getOrCreateSheet(ss, SHEETS.log);
    getOrCreateSheet(ss, SHEETS.history);
    getOrCreateSheet(ss, SHEETS.issues);
    getOrCreateSheet(ss, SHEETS.notifications);

    logAudit("SETUP", "system", "v6.1 setup completed.");

    return {
      message: "Setup complete",
      sheets: Object.values(SHEETS),
      users_loaded: 9,
      note: "All sheets created. Passwords are hashed."
    };
  } catch(err) {
    throw new Error("Setup failed: " + err.message);
  }
}

function getStoreHeaders() {
  return [
    "id","eng","branch","ops","area",
    "DMB","Kitchen","POS","Kiosk","Tablet",
    "notes","status","healthScore",
    "branchManagerName","branchManagerPhone",
    "supervisorName","supervisorPhone",
    "areaManagerName","areaManagerPhone",
    "extraContacts",
    "lastCheckAt","lastCheckBy",
    "escalationLevel","escalationReason",
    "createdBy","createdAt","updatedBy","updatedAt"
  ];
}

function migrateStoresSheet(storesSheet) {
  const currentHeaders = storesSheet.getRange(1,1,1,storesSheet.getLastColumn()).getValues()[0];
  const requiredHeaders = getStoreHeaders();
  const missing = requiredHeaders.filter(h => !currentHeaders.includes(h));

  if (missing.length > 0) {
    const lastCol = storesSheet.getLastColumn();
    const lastRow = storesSheet.getLastRow();
    storesSheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);

    const defaults = {};
    missing.forEach(h => {
      if (h === "status") defaults[h] = "healthy";
      else if (h === "healthScore") defaults[h] = 100;
      else if (h === "escalationLevel") defaults[h] = "none";
      else defaults[h] = "";
    });

    for (let r = 2; r <= lastRow; r++) {
      const rowValues = missing.map(h => defaults[h]);
      storesSheet.getRange(r, lastCol + 1, 1, missing.length).setValues([rowValues]);
    }
  }
}

// ============================================================
//  STORE HANDLERS
// ============================================================

function handleUpdateStore(p) {
  const data = buildStoreData(p);
  if (!data.id) throw new Error("Missing id");

  data.lastCheckAt = new Date().toISOString();
  data.lastCheckBy = sanitizeInput(p.user || "");
  data.healthScore = calculateHealthScore(data);
  data.status = determineStoreStatus(data);

  const escalation = checkEscalation(data);
  data.escalationLevel = escalation.level;
  data.escalationReason = escalation.reason;

  data.updatedBy = sanitizeInput(p.user || "");
  data.updatedAt = new Date().toISOString();

  const result = updateStore(data, p.user);
  if (result.ok) {
    logAudit("STORE_UPDATE", p.user, "Updated store: " + data.branch, data.id);
    saveStoreHistory(data, p.user);
    invalidateStoreCache();

    if (data.escalationLevel !== "none") {
      createNotification({
        type: "escalation",
        target: data.eng,
        message: "Store " + data.branch + " escalated to " + data.escalationLevel + ": " + data.escalationReason
      });
    }
  }
  return result;
}

function handleAddStore(p) {
  const data = buildStoreData(p);
  if (!data.branch) throw new Error("Missing branch");

  data.status = CONFIG.storeStatusOpen;
  data.healthScore = calculateHealthScore(data);
  data.status = determineStoreStatus(data);
  data.escalationLevel = "none";
  data.escalationReason = "";
  data.lastCheckAt = new Date().toISOString();
  data.lastCheckBy = sanitizeInput(p.user || "");
  data.createdBy = sanitizeInput(p.user || "");
  data.createdAt = new Date().toISOString();
  data.updatedBy = sanitizeInput(p.user || "");
  data.updatedAt = new Date().toISOString();

  const result = addStore(data, p.user);
  if (result.ok) {
    logAudit("STORE_ADD", p.user, "Added store: " + data.branch, result.id);
    invalidateStoreCache();
  }
  return result;
}

function handleDeleteStore(p) {
  if (!p.id) throw new Error("Missing id");
  const stores = getStores();
  const store  = stores.find(s => String(s.id) === String(p.id));
  const branch = store ? store.branch : p.id;

  const result = deleteStore(p.id, p.user);
  if (result.ok) {
    logAudit("STORE_DELETE", p.user, "Deleted store: " + branch, p.id);
    invalidateStoreCache();
  }
  return result;
}

function handleBulkUpdateStores(p) {
  if (!p.stores) throw new Error("Missing stores array");
  let updated = 0, failed = 0;
  const stores = JSON.parse(p.stores);

  stores.forEach(s => {
    try {
      s.user = p.user;
      handleUpdateStore(s);
      updated++;
    } catch(e) {
      failed++;
    }
  });

  logAudit("BULK_UPDATE", p.user, "Bulk updated " + updated + " stores, " + failed + " failed");
  invalidateStoreCache();
  return { updated, failed };
}

function buildStoreData(p) {
  return {
    id: p.id,
    branch: sanitizeInput(p.branch || ""),
    eng: sanitizeInput(p.eng || ""),
    ops: sanitizeInput(p.ops || ""),
    area: sanitizeInput(p.area || ""),
    DMB: parseBool(p.DMB),
    Kitchen: parseBool(p.Kitchen),
    POS: parseBool(p.POS),
    Kiosk: parseBool(p.Kiosk),
    Tablet: parseBool(p.Tablet),
    notes: sanitizeInput(p.notes || ""),
    status: sanitizeInput(p.status || ""),
    branchManagerName: sanitizeInput(p.branchManagerName || ""),
    branchManagerPhone: sanitizeInput(p.branchManagerPhone || ""),
    supervisorName: sanitizeInput(p.supervisorName || ""),
    supervisorPhone: sanitizeInput(p.supervisorPhone || ""),
    areaManagerName: sanitizeInput(p.areaManagerName || ""),
    areaManagerPhone: sanitizeInput(p.areaManagerPhone || ""),
    extraContacts: sanitizeInput(p.extraContacts || "")
  };
}

// ============================================================
//  HEALTH & STATUS LOGIC
// ============================================================

function calculateHealthScore(data) {
  const working = CONFIG.deviceFields.filter(d => data[d] === 1).length;
  return working * CONFIG.devicePoints;
}

function determineStoreStatus(data) {
  const working = CONFIG.deviceFields.filter(d => data[d] === 1).length;
  if (working === 5) return "healthy";
  if (working >= 3) return "warning";
  if (working >= 1) return "critical";
  return "offline";
}

function checkEscalation(data) {
  const result = { level: "none", reason: "" };

  if (data.POS === 0) {
    result.level = "high";
    result.reason = "POS offline - payment system down";
    return result;
  }

  if (data.Kiosk === 0) {
    result.level = "medium";
    result.reason = "Kiosk offline - self-service unavailable";
    return result;
  }

  const offline = CONFIG.deviceFields.filter(d => data[d] === 0);
  if (offline.length >= 3) {
    result.level = "high";
    result.reason = offline.length + " devices offline: " + offline.join(", ");
    return result;
  }

  if (data.lastCheckAt) {
    const hoursSince = (Date.now() - new Date(data.lastCheckAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince > CONFIG.escalationHours) {
      result.level = "low";
      result.reason = "Not checked for " + Math.floor(hoursSince) + " hours";
      return result;
    }
  }

  return result;
}

// ============================================================
//  WHATSAPP HELPERS
// ============================================================

function generateWhatsappLink(p) {
  const type = p.type || "branch";
  const stores = getStores();
  const store = stores.find(s => String(s.id) === String(p.storeId));
  if (!store) throw new Error("Store not found");

  let phone = "";
  let message = "";

  switch(type) {
    case "branch":
      phone = store.branchManagerPhone || store.supervisorPhone;
      message = generateBranchWhatsappMessage(store, p.user);
      break;
    case "area":
      phone = store.areaManagerPhone;
      message = generateAreaManagerSingleBranchMessage(store, p.user);
      break;
    case "areaSummary":
      phone = store.areaManagerPhone;
      message = generateAreaManagerFullSummaryMessage(store.area, p.user);
      break;
  }

  if (!phone) throw new Error("No phone number available");

  phone = phone.replace(/[^0-9]/g, "");
  if (!phone.startsWith("+")) phone = "+" + phone;

  const encodedMsg = encodeURIComponent(message);
  return "https://wa.me/" + phone + "?text=" + encodedMsg;
}

function generateBranchWhatsappMessage(store, engineerName) {
  const devs = CONFIG.deviceFields;
  const statusLines = devs.map(d => {
    const icon = store[d] === 1 ? "✅" : "❌";
    return icon + " " + d;
  }).join("\n");

  return "*Shawarmer IT Check - " + store.branch + "*\n\n" +
    "Engineer: " + (engineerName || store.eng) + "\n" +
    "Date: " + new Date().toLocaleString() + "\n\n" +
    "*Device Status:*\n" + statusLines + "\n\n" +
    "Health Score: " + store.healthScore + "%\n" +
    "Status: " + store.status.toUpperCase() + "\n\n" +
    (store.notes ? "*Notes:*\n" + store.notes : "");
}

function generateAreaManagerSingleBranchMessage(store, engineerName) {
  const offline = CONFIG.deviceFields.filter(d => store[d] === 0);
  return "*Shawarmer IT Alert - " + store.branch + "*\n\n" +
    "Area Manager: " + store.areaManagerName + "\n" +
    "Engineer: " + (engineerName || store.eng) + "\n\n" +
    "*Issue:* " + (offline.length > 0 ? offline.join(", ") + " offline" : "All devices working") + "\n" +
    "Health: " + store.healthScore + "% | Status: " + store.status.toUpperCase() + "\n\n" +
    (store.notes ? "Notes: " + store.notes : "");
}

function generateAreaManagerFullSummaryMessage(areaName, engineerName) {
  const stores = getStores().filter(s => s.area === areaName);
  const total = stores.length;
  const healthy = stores.filter(s => s.status === "healthy").length;
  const warning = stores.filter(s => s.status === "warning").length;
  const critical = stores.filter(s => s.status === "critical" || s.status === "offline").length;

  const issueStores = stores.filter(s => s.status !== "healthy").map(s => {
    const offline = CONFIG.deviceFields.filter(d => s[d] === 0);
    return "• " + s.branch + " (" + offline.join(", ") + " offline)";
  }).join("\n");

  return "*Shawarmer Area Summary - " + areaName + "*\n\n" +
    "Total Branches: " + total + "\n" +
    "✅ Healthy: " + healthy + "\n" +
    "⚠️ Warning: " + warning + "\n" +
    "❌ Critical: " + critical + "\n\n" +
    (issueStores ? "*Branches with Issues:*\n" + issueStores : "All branches healthy! ✅") + "\n\n" +
    "Reported by: " + (engineerName || "System");
}

// ============================================================
//  USER HANDLERS
// ============================================================

function handleUpdateUser(p) {
  if (!p.id) throw new Error("Missing id");
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.users);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(p.id)) {
      if (p.name)     sheet.getRange(i+1, headers.indexOf("name")+1).setValue(sanitizeInput(p.name));
      if (p.role)     sheet.getRange(i+1, headers.indexOf("role")+1).setValue(sanitizeInput(p.role));
      if (p.ref)      sheet.getRange(i+1, headers.indexOf("ref")+1).setValue(sanitizeInput(p.ref));
      if (p.status)   sheet.getRange(i+1, headers.indexOf("status")+1).setValue(sanitizeInput(p.status));
      logAudit("USER_UPDATE", p.by || "admin", "Updated user: " + (p.name || p.id));
      return { id: p.id };
    }
  }
  throw new Error("User not found");
}

function handleChangePassword(p) {
  if (!p.id || !p.newPassword) throw new Error("Missing id or newPassword");
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.users);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf("id");
  const passCol = headers.indexOf("password");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(p.id)) {
      if (p.oldPassword && !verifyPassword(String(rows[i][passCol]), p.oldPassword)) {
        throw new Error("Current password is incorrect");
      }
      sheet.getRange(i+1, passCol+1).setValue(hashPassword(p.newPassword));
      logAudit("PASSWORD_CHANGE", p.by || p.id, "Password changed for user: " + rows[i][headers.indexOf("username")]);
      return { id: p.id };
    }
  }
  throw new Error("User not found");
}

function handleAddUser(p) {
  const data = {
    username: sanitizeInput(p.username || ""),
    password: hashPassword(p.password || ""),
    role: sanitizeInput(p.role || "engineer"),
    name: sanitizeInput(p.name || ""),
    ref: sanitizeInput(p.ref || ""),
    status: sanitizeInput(p.status || CONFIG.defaultStatus)
  };
  if (!data.username || !p.password || !data.name)
    throw new Error("Missing username, password or name");

  const result = addUser(data);
  if (result.ok) logAudit("USER_ADD", p.by || "admin", "Created user: " + data.username);
  return result;
}

function handleRemoveUser(p) {
  if (!p.id) throw new Error("Missing id");
  return removeUser(p.id, p.user);
}

// ============================================================
//  ISSUE HANDLER
// ============================================================

function handleUpdateIssue(p) {
  if (!p.storeId) throw new Error("Missing storeId");
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.issues);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf("storeId");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(p.storeId)) {
      if (p.issueStatus)      sheet.getRange(i+1, headers.indexOf("issueStatus")+1).setValue(sanitizeInput(p.issueStatus));
      if (p.resolutionNotes)  sheet.getRange(i+1, headers.indexOf("resolutionNotes")+1).setValue(sanitizeInput(p.resolutionNotes));
      if (p.issueStatus === "resolved" || p.issueStatus === "closed") {
        sheet.getRange(i+1, headers.indexOf("resolvedAt")+1).setValue(new Date().toISOString());
        sheet.getRange(i+1, headers.indexOf("resolvedBy")+1).setValue(sanitizeInput(p.user || ""));
      }
      logAudit("ISSUE_UPDATE", p.user, "Issue " + p.issueStatus + " for store: " + p.storeId);
      return { storeId: p.storeId };
    }
  }

  const newRow = headers.map(h => {
    const map = {
      storeId: p.storeId,
      branch: sanitizeInput(p.branch || ""),
      issueStatus: sanitizeInput(p.issueStatus || "open"),
      resolutionNotes: sanitizeInput(p.resolutionNotes || ""),
      createdAt: new Date().toISOString(),
      createdBy: sanitizeInput(p.user || ""),
      resolvedAt: "",
      resolvedBy: ""
    };
    return map[h] !== undefined ? map[h] : "";
  });
  sheet.appendRow(newRow);
  logAudit("ISSUE_CREATE", p.user, "New issue for store: " + p.storeId);
  return { storeId: p.storeId, created: true };
}

// ============================================================
//  NOTIFICATIONS
// ============================================================

function createNotification(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.notifications);
  const id = "n" + Date.now();

  sheet.appendRow([
    id,
    p.type || "info",
    p.target || "",
    sanitizeInput(p.message || ""),
    "pending",
    new Date().toISOString()
  ]);

  return { id, status: "pending" };
}

function markNotificationRead(id) {
  if (!id) throw new Error("Missing id");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.notifications);
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol = headers.indexOf("id");
  const statusCol = headers.indexOf("status");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      sheet.getRange(i+1, statusCol+1).setValue("read");
      return { id, status: "read" };
    }
  }
  throw new Error("Notification not found");
}

function getNotifications(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.notifications);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];

  let notifs = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i] !== undefined ? String(row[i]) : ""; });
    return obj;
  });

  if (p.target) notifs = notifs.filter(r => r.target === p.target);
  if (p.status) notifs = notifs.filter(r => r.status === p.status);
  if (p.type) notifs = notifs.filter(r => r.type === p.type);
  if (p.limit) notifs = notifs.slice(-parseInt(p.limit));

  return notifs.reverse();
}

// ============================================================
//  READ FUNCTIONS (with caching)
// ============================================================

function getAllData() {
  return {
    stores:    getStores(),
    users:     getUsers(),
    lists:     getLists(),
    stats:     getStats(),
    timestamp: Date.now()
  };
}

function getStores() {
  const cached = cacheGet("stores");
  if (cached) return cached;

  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.stores);
  const rows    = sheet.getDataRange().getValues();
  if (rows.length < 2) { cachePut("stores", []); return []; }
  const headers = rows[0];

  const stores = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      const key = String(h).trim();
      const val = row[i];
      if (CONFIG.deviceFields.includes(key)) {
        obj[key] = (val === true || val === "TRUE" || val === 1 || val === "1") ? 1 : 0;
      } else if (key === "healthScore") {
        obj[key] = parseInt(val) || calculateHealthScoreFromRow(row, headers);
      } else {
        obj[key] = val !== undefined && val !== null ? val : "";
      }
    });
    return obj;
  }).filter(r => r.id !== "" && r.id !== undefined && r.branch !== "");

  cachePut("stores", stores);
  return stores;
}

function getStoresLite() {
  const cached = cacheGet("stores_lite");
  if (cached) return cached;

  const stores = getStores();
  const lite = stores.map(s => ({
    id: s.id,
    branch: s.branch,
    eng: s.eng,
    area: s.area,
    status: s.status,
    healthScore: s.healthScore,
    DMB: s.DMB, Kitchen: s.Kitchen, POS: s.POS, Kiosk: s.Kiosk, Tablet: s.Tablet,
    lastCheckAt: s.lastCheckAt,
    escalationLevel: s.escalationLevel
  }));

  cachePut("stores_lite", lite);
  return lite;
}

function calculateHealthScoreFromRow(row, headers) {
  const working = CONFIG.deviceFields.filter(d => {
    const idx = headers.indexOf(d);
    const val = row[idx];
    return val === true || val === "TRUE" || val === 1 || val === "1";
  }).length;
  return working * CONFIG.devicePoints;
}

function getUsers() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.users);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];

  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i] !== undefined ? row[i] : ""; });
    delete obj.password;
    return obj;
  }).filter(r => r.id !== "" && r.id !== undefined);
}

function getLists() {
  const cached = cacheGet("lists");
  if (cached) return cached;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lists = {
    engineers: getColumnValues(ss, SHEETS.engineers),
    ops:       getColumnValues(ss, SHEETS.ops),
    areas:     getColumnValues(ss, SHEETS.areas),
    devices:   getColumnValues(ss, SHEETS.devices)
  };

  cachePut("lists", lists);
  return lists;
}

function getColumnValues(ss, sheetName) {
  const sheet = getOrCreateSheet(ss, sheetName);
  return sheet.getDataRange().getValues().flat()
    .map(v => String(v).trim()).filter(v => v && v !== "Value");
}

function getAuditLog(p) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.log);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];

  let log = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i] !== undefined ? String(row[i]) : ""; });
    return obj;
  });

  if (p.user) log = log.filter(r => r.user === p.user);
  if (p.type) log = log.filter(r => r.type === p.type);
  if (p.storeId) log = log.filter(r => r.storeId === p.storeId);
  if (p.limit) log = log.slice(-parseInt(p.limit));
  else log = log.slice(-CONFIG.maxAuditLogRows);

  return log.reverse();
}

function getStoreHistory(storeId) {
  if (!storeId) return [];
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.history);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  const idCol   = headers.indexOf("storeId");

  return rows.slice(1)
    .filter(row => String(row[idCol]) === String(storeId))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[String(h).trim()] = row[i] !== undefined ? String(row[i]) : ""; });
      return obj;
    }).reverse().slice(0, CONFIG.maxHistoryRows);
}

function getIssues(p) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.issues);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];

  let issues = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[String(h).trim()] = row[i] !== undefined ? String(row[i]) : ""; });
    return obj;
  });

  if (p.storeId) issues = issues.filter(r => r.storeId === p.storeId);
  if (p.issueStatus) issues = issues.filter(r => r.issueStatus === p.issueStatus);
  if (p.limit) issues = issues.slice(-parseInt(p.limit));

  return issues.reverse();
}

// ============================================================
//  STATS & DASHBOARD
// ============================================================

function getStats() {
  const cached = cacheGet("stats");
  if (cached) return cached;

  const stores = getStores();
  const devs   = CONFIG.deviceFields;
  const total  = stores.length;
  const healthy = stores.filter(s => s.status === "healthy").length;
  const warning = stores.filter(s => s.status === "warning").length;
  const critical = stores.filter(s => s.status === "critical").length;
  const offline = stores.filter(s => s.status === "offline").length;
  const withIssues = total - healthy;

  const byDevice = {};
  devs.forEach(d => { byDevice[d] = stores.filter(s => s[d] === 0).length; });

  const byEngineer = {};
  stores.forEach(s => {
    if (!byEngineer[s.eng]) byEngineer[s.eng] = { total:0, healthy:0, warning:0, critical:0, offline:0 };
    byEngineer[s.eng].total++;
    byEngineer[s.eng][s.status]++;
  });

  const byArea = {};
  stores.forEach(s => {
    if (!byArea[s.area]) byArea[s.area] = { total:0, healthy:0, warning:0, critical:0, offline:0 };
    byArea[s.area].total++;
    byArea[s.area][s.status]++;
  });

  const byOps = {};
  stores.forEach(s => {
    if (!byOps[s.ops]) byOps[s.ops] = { total:0, healthy:0, warning:0, critical:0, offline:0 };
    byOps[s.ops].total++;
    byOps[s.ops][s.status]++;
  });

  const avgHealth = total > 0 ? Math.round(stores.reduce((sum, s) => sum + (s.healthScore || 0), 0) / total) : 0;

  const result = {
    total, healthy, warning, critical, offline, withIssues, avgHealth,
    byDevice, byEngineer, byArea, byOps,
    timestamp: Date.now()
  };

  cachePut("stats", result);
  return result;
}

function getDashboardSummary() {
  const cached = cacheGet("dashboard");
  if (cached) return cached;

  const stores = getStoresLite();
  const stats = getStats();
  const issues = getIssues({ issueStatus: "open", limit: 10 });
  const notifications = getNotifications({ status: "pending", limit: 5 });

  const urgentStores = stores.filter(s => s.escalationLevel === "high").slice(0, 5);
  const unchecked = stores.filter(s => {
    if (!s.lastCheckAt) return true;
    const hours = (Date.now() - new Date(s.lastCheckAt).getTime()) / (1000 * 60 * 60);
    return hours > CONFIG.escalationHours;
  }).length;

  const result = {
    stats: {
      total: stats.total,
      healthy: stats.healthy,
      warning: stats.warning,
      critical: stats.critical,
      offline: stats.offline,
      avgHealth: stats.avgHealth
    },
    urgentStores,
    uncheckedCount: unchecked,
    recentIssues: issues,
    pendingNotifications: notifications,
    timestamp: Date.now()
  };

  cachePut("dashboard", result);
  return result;
}

function getEngineerStats() {
  const stores = getStores();
  const users = getUsers().filter(u => u.role === "engineer" && u.status === "active");

  const stats = users.map(u => {
    const engineerStores = stores.filter(s => s.eng === u.name || s.eng === u.ref);
    const checkedToday = engineerStores.filter(s => {
      if (!s.lastCheckAt) return false;
      const checkDate = new Date(s.lastCheckAt).toDateString();
      return checkDate === new Date().toDateString();
    }).length;

    const pending = engineerStores.filter(s => s.status !== "healthy").length;
    const lastActivity = engineerStores.length > 0 
      ? engineerStores.map(s => s.lastCheckAt).filter(Boolean).sort().pop() 
      : null;

    return {
      name: u.name,
      username: u.username,
      totalBranches: engineerStores.length,
      checkedToday,
      pending,
      lastActivity,
      avgHealth: engineerStores.length > 0 
        ? Math.round(engineerStores.reduce((sum, s) => sum + (s.healthScore || 0), 0) / engineerStores.length)
        : 0
    };
  });

  return stats;
}

// ============================================================
//  WRITE FUNCTIONS
// ============================================================

function updateStore(data, user) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.stores);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idCol   = headers.indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(data.id)) {
      headers.forEach((h, j) => {
        if (data.hasOwnProperty(h)) sheet.getRange(i+1, j+1).setValue(data[h]);
      });
      return { ok: true, id: data.id };
    }
  }
  throw new Error("Store not found: " + data.id);
}

function addStore(data, user) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.stores);
  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  const maxId   = rows.slice(1).reduce((m, r) => {
    const n = parseInt(r[headers.indexOf("id")]) || 0;
    return n > m ? n : m;
  }, 200);
  data.id = maxId + 1;
  const newRow = headers.map(h => data.hasOwnProperty(h) ? data[h] : "");
  sheet.appendRow(newRow);
  return { ok: true, id: data.id };
}

function deleteStore(id, user) {
  if (!id) throw new Error("Missing id");
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.stores);
  const rows  = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  throw new Error("Store not found: " + id);
}

function addUser(data) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.users);
  const headers = sheet.getDataRange().getValues()[0];
  data.id       = "u" + Date.now();
  if (!data.status) data.status = CONFIG.defaultStatus;
  const newRow  = headers.map(h => data[h] !== undefined ? data[h] : "");
  sheet.appendRow(newRow);
  return { ok: true, id: data.id };
}

function removeUser(id, by) {
  if (!id) throw new Error("Missing id");
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.users);
  const rows  = sheet.getDataRange().getValues();
  const idCol = rows[0].indexOf("id");

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idCol]) === String(id)) {
      const uname = rows[i][rows[0].indexOf("username")] || id;
      sheet.deleteRow(i + 1);
      logAudit("USER_DELETE", by || "admin", "Deleted user: " + uname);
      return { ok: true };
    }
  }
  throw new Error("User not found");
}

function addListItem(list, value) {
  if (!list || !value) throw new Error("Missing list or value");
  const names = { engineers:SHEETS.engineers, ops:SHEETS.ops, areas:SHEETS.areas, devices:SHEETS.devices };
  if (!names[list]) throw new Error("Unknown list: " + list);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, names[list]).appendRow([sanitizeInput(value)]);
  cacheRemove("lists");
  return { list, value };
}

function removeListItem(list, value) {
  if (!list || !value) throw new Error("Missing list or value");
  const names = { engineers:SHEETS.engineers, ops:SHEETS.ops, areas:SHEETS.areas, devices:SHEETS.devices };
  if (!names[list]) throw new Error("Unknown list: " + list);
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, names[list]);
  const rows  = sheet.getDataRange().getValues();

  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(value).trim()) {
      sheet.deleteRow(i + 1);
      cacheRemove("lists");
      return { list, value };
    }
  }
  throw new Error("Value not found: " + value);
}

// ============================================================
//  AUDIT LOG & HISTORY
// ============================================================

function logAudit(type, user, detail, storeId) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEETS.log);
  if (sheet.getLastRow() === 0)
    sheet.appendRow(["timestamp","type","user","detail","storeId"]);
  sheet.appendRow([
    new Date().toISOString(),
    type || "",
    user || "",
    detail || "",
    storeId || ""
  ]);
  return { ok: true };
}

function saveStoreHistory(data, user) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = getOrCreateSheet(ss, SHEETS.history);
  const devs    = CONFIG.deviceFields;
  const snapshot = devs.map(d => (data[d] ? "OK" : "Issue")).join(",");
  sheet.appendRow([
    new Date().toISOString(),
    data.id,
    data.branch,
    user || "",
    snapshot,
    data.notes || "",
    data.healthScore || 0,
    data.status || ""
  ]);
}

// ============================================================
//  HELPERS
// ============================================================

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const hmap = {
      [SHEETS.stores]:         [getStoreHeaders()],
      [SHEETS.users]:          [["id","username","password","role","name","ref","status"]],
      [SHEETS.engineers]:      [["Value"]],
      [SHEETS.ops]:            [["Value"]],
      [SHEETS.areas]:          [["Value"]],
      [SHEETS.devices]:        [["Value"]],
      [SHEETS.log]:            [["timestamp","type","user","detail","storeId"]],
      [SHEETS.history]:        [["timestamp","storeId","branch","changedBy","deviceSnapshot","notes","healthScore","status"]],
      [SHEETS.issues]:         [["storeId","branch","issueStatus","resolutionNotes","createdAt","createdBy","resolvedAt","resolvedBy"]],
      [SHEETS.notifications]:  [["id","type","target","message","status","createdAt"]]
    };
    if (hmap[name]) sheet.getRange(1,1,1,hmap[name][0].length).setValues(hmap[name]);
  }
  return sheet;
}

function regenerateToken() {
  const props = PropertiesService.getScriptProperties();
  const newToken = generateSecureToken();
  props.setProperty(CONFIG.tokenKey, newToken);
  logAudit("SECURITY", "admin", "API token regenerated");
  return newToken;
}

// ============================================================
//  IMPORT FROM YOUR SHEET (handles merged cells, TRUE/FALSE)
// ============================================================

function importStoresFromYourSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sourceSheet = ss.getSheetByName("Shawarmer IT check list");

  if (!sourceSheet) {
    const sheets = ss.getSheets();
    const targetSheet = sheets.find(s => 
      s.getName().toLowerCase().includes("shawarmer") || 
      s.getName().toLowerCase().includes("check")
    );
    if (!targetSheet) {
      SpreadsheetApp.getUi().alert("❌ Could not find your data sheet. Please rename it to 'Shawarmer IT check list' or update the function.");
      return;
    }
    sourceSheet = targetSheet;
  }

  const allData = sourceSheet.getDataRange().getValues();

  let headerRow = -1;
  for (let i = 0; i < Math.min(10, allData.length); i++) {
    const row = allData[i];
    if (row[0] && String(row[0]).toLowerCase().includes("eng")) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    SpreadsheetApp.getUi().alert("❌ Could not find header row with 'Eng.Name'");
    return;
  }

  const headers = allData[headerRow];
  Logger.log("Found headers at row " + (headerRow + 1));

  const colEng = headers.findIndex(h => h && String(h).toLowerCase().includes("eng"));
  const colBranch = headers.findIndex(h => h && String(h).toLowerCase().includes("branch"));
  const colOps = headers.findIndex(h => h && String(h).toLowerCase().includes("ops"));
  const colArea = headers.findIndex(h => h && String(h).toLowerCase().includes("area"));
  const colDMB = headers.findIndex(h => h && String(h).toUpperCase() === "DMB");
  const colKitchen = headers.findIndex(h => h && String(h).toLowerCase().includes("kitchen"));
  const colPOS = headers.findIndex(h => h && String(h).toUpperCase() === "POS");
  const colKiosk = headers.findIndex(h => h && String(h).toLowerCase().includes("kiosk"));
  const colTablet = headers.findIndex(h => h && String(h).toLowerCase().includes("tablet"));

  let imported = 0;
  let skipped = 0;
  let currentEngineer = "";

  for (let i = headerRow + 1; i < allData.length; i++) {
    const row = allData[i];

    if (!row[colBranch] || String(row[colBranch]).trim() === "") {
      skipped++;
      continue;
    }

    if (row[colEng] && String(row[colEng]).trim() !== "") {
      currentEngineer = String(row[colEng]).trim();
    }

    const parseDevice = (val) => {
      if (val === true || val === "TRUE" || val === 1 || val === "1") return 1;
      if (val === false || val === "FALSE" || val === 0 || val === "0") return 0;
      return 0;
    };

    const data = {
      branch: sanitizeInput(String(row[colBranch]).trim()),
      eng: sanitizeInput(currentEngineer),
      ops: sanitizeInput(row[colOps] ? String(row[colOps]).trim() : ""),
      area: sanitizeInput(row[colArea] ? String(row[colArea]).trim() : ""),
      DMB: parseDevice(row[colDMB]),
      Kitchen: parseDevice(row[colKitchen]),
      POS: parseDevice(row[colPOS]),
      Kiosk: parseDevice(row[colKiosk]),
      Tablet: parseDevice(row[colTablet]),
      notes: "",
      status: "healthy",
      healthScore: 0,
      escalationLevel: "none",
      escalationReason: "",
      lastCheckAt: new Date().toISOString(),
      lastCheckBy: "import",
      createdBy: "import",
      createdAt: new Date().toISOString(),
      updatedBy: "import",
      updatedAt: new Date().toISOString()
    };

    data.healthScore = calculateHealthScore(data);
    data.status = determineStoreStatus(data);

    const escalation = checkEscalation(data);
    data.escalationLevel = escalation.level;
    data.escalationReason = escalation.reason;

    addStore(data, "import");
    imported++;

    if (imported % 10 === 0) {
      Logger.log("Imported " + imported + " stores...");
    }
  }

  invalidateStoreCache();
  logAudit("IMPORT", "system", "Imported " + imported + " stores. Skipped " + skipped + " empty rows.");

  SpreadsheetApp.getUi().alert(
    "✅ Import Complete!\n\n" +
    "Imported: " + imported + " stores\n" +
    "Skipped: " + skipped + " empty rows\n\n" +
    "Next: Add branch manager contacts manually in the app."
  );

  return { imported, skipped };
}

// ============================================================
//  MANUAL SETUP & UTILITIES
// ============================================================

function setupInitialDataManual() {
  const result = handleSetupInitialData();

  SpreadsheetApp.getUi().alert(
    "✅ v6.1 Setup Complete!\n\n" +
    "✓ Users sheet updated (hashed passwords)\n" +
    "✓ Engineers, Ops, Areas, Devices populated\n" +
    "✓ All auxiliary sheets created\n" +
    "✓ verifyLogin endpoint ready\n\n" +
    "Now go to Deploy → New deployment to publish."
  );
}

function testAPI() {
  Logger.log("=== v6.1 API Test ===");
  const data = getAllData();
  Logger.log("Stores: " + data.stores.length);
  Logger.log("Users: " + data.users.length);
  Logger.log("Engineers: " + data.lists.engineers.join(", "));

  const stats = getStats();
  Logger.log("Healthy: " + stats.healthy + "/" + stats.total);
  Logger.log("Avg Health: " + stats.avgHealth + "%");

  const dash = getDashboardSummary();
  Logger.log("Urgent: " + dash.urgentStores.length);
  Logger.log("Unchecked: " + dash.uncheckedCount);

  const engStats = getEngineerStats();
  Logger.log("Engineers: " + engStats.length);
}
