# Shawarmer IT Operations v6.1

Enterprise IT Operations Command Center for Shawarmer Stores.

## 🚀 Quick Deploy to GitHub Pages

### Method 1: GitHub Web UI (Easiest - No Git needed)

1. **Create a new repository** on GitHub (e.g., `shawarmer-it`)
2. **Upload files:**
   - Go to your repo → Click **"Add file"** → **"Upload files"**
   - Drag & drop ALL files from this folder (not the zip)
   - Make sure folder structure is preserved:
     ```
     /
     ├── index.html
     ├── manifest.json
     ├── sw.js
     ├── css/
     │   └── main.css
     ├── assets/
     │   └── favicon.svg
     ├── js/
     │   ├── config.js
     │   ├── api.js
     │   ├── state.js
     │   ├── ui.js
     │   ├── notifications.js
     │   ├── communication.js
     │   ├── modals.js
     │   ├── app.js
     │   └── views/
     │       ├── dashboard.js
     │       ├── stores.js
     │       ├── critical.js
     │       ├── reports.js
     │       ├── engineers.js
     │       ├── alerts.js
     │       ├── admin.js
     │       ├── auditlog.js
     │       ├── history.js
     │       └── profile.js
     └── .github/
         └── workflows/
             └── deploy.yml
     ```
3. **Enable GitHub Pages:**
   - Go to **Settings** → **Pages**
   - Source: **GitHub Actions**
4. **Wait 1-2 minutes** for deployment
5. **Your site is live!** URL: `https://YOUR_USERNAME.github.io/shawarmer-it/`

### Method 2: Git Command Line

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/shawarmer-it.git
git push -u origin main
```

## 🔧 Backend Setup (Google Apps Script)

1. Open [Google Apps Script](https://script.google.com)
2. Create new project → Paste code from `Shawarmer_Backend_v6.1.txt`
3. Deploy as **Web App** (Execute as: Me, Access: Anyone)
4. Copy the deployment URL
5. Update `js/config.js` → `APP_CONFIG.API_URL` with your URL

## 🔑 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Shawarmer@2025 | Administrator |
| eng.waled | pass123 | Engineer |
| area.ismaeil | pass123 | Area Manager |
| ops.asif | pass123 | Ops Manager |

## 🛠️ Errors Fixed in This Version

- ✅ Removed temp module stubs from app.js
- ✅ Fixed showTab to use correct view objects (DashboardView, StoresView, etc.)
- ✅ Added missing `APP.refreshTab()` method
- ✅ Fixed `NOTIF.renderList()` → `NOTIF.renderPanel()`
- ✅ Added missing `UI.devChip()` and `UI.scorePill()` helpers
- ✅ Added missing `NOTIF.checkIssues()` method
- ✅ Fixed `API.loadAll()` → `API.getAll()` in dashboard.js
- ✅ Fixed API calls with incorrect extra user arguments
- ✅ Fixed file paths for proper folder structure
- ✅ Added GitHub Actions auto-deployment workflow

## 📱 Features

- Role-based access (Admin, Engineer, Area Manager, Ops)
- Real-time store health dashboard
- Device status tracking (DMB, Kitchen, POS, Kiosk, Tablet)
- WhatsApp integration for branch communication
- Export reports (Excel/PDF)
- Audit log & history
- Dark mode support
- Mobile-responsive PWA
- Offline support with Service Worker
