# Shawarmer IT Operations v5.1

## Enterprise IT Operations Command Center

### What's New in v5.1
- **Modern Enterprise Dashboard** — KPI cards, engineer progress, health heat grid
- **Burgundy Branding** — Shawarmer brand colors (#6E0F1F)
- **Daily Mission Widget** — Track daily progress for engineers
- **Smart Insights** — AI-powered operational hints
- **Activity Feed** — Real-time activity timeline
- **Critical Stores** — Priority view for urgent issues
- **Mobile-First Design** — Responsive with mobile action footer
- **Dark Mode** — Toggle between light and dark themes
- **Smooth Animations** — Card hover, progress rings, toast notifications

### File Structure
```
/
├── index.html          # Main HTML entry point
├── css/
│   └── main.css        # Complete stylesheet (light + dark)
├── js/
│   ├── config.js       # API config & feature flags
│   ├── api.js          # Google Sheets API layer
│   ├── state.js        # Global state + daily tracking
│   ├── ui.js           # UI components & helpers
│   ├── notifications.js # In-app notification system
│   ├── app.js          # Main app controller
│   ├── modals.js       # All modal dialogs
│   └── views/
│       ├── dashboard.js    # Enterprise dashboard
│       ├── stores.js      # Store list with filters
│       ├── critical.js    # Critical stores view
│       ├── reports.js     # Export reports
│       ├── engineers.js   # Team overview
│       ├── alerts.js      # Activity & alerts
│       ├── admin.js      # Settings / admin panel
│       ├── auditlog.js   # Audit log viewer
│       ├── history.js    # Store history
│       └── profile.js    # User profile
└── assets/
    └── favicon.svg       # Shawarmer brand icon
```

### Setup Instructions
1. Deploy the Google Apps Script backend (same as v5.0)
2. Update `js/config.js` with your API_URL after deployment
3. Upload all files to your web server or hosting
4. Ensure the file paths match your server structure

### Navigation Structure
- **Dashboard** — Overview with KPIs, progress, heat grid
- **My Stores** — Filterable store list with quick actions
- **Critical Stores** — Priority view for urgent issues
- **Reports** — Excel/PDF export
- **Engineers** — Team progress (admin/ops only)
- **Alerts** — Activity timeline & notifications
- **Settings** — User management (admin only)
- **My Profile** — Password change

### Key Features
- Role-based access (Engineer, Area Manager, Ops, Admin)
- Daily reset workflow (progress resets each day)
- Persistent vs daily notes
- Store health scoring with history weight
- Real-time polling (15s interval)
- One-click device status updates
- WhatsApp integration ready (contacts system)

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+
