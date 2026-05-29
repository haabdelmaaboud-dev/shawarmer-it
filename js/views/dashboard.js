/* =====================================================
   views/dashboard.js — Enterprise Dashboard v5.1
   KPI Cards | Engineer Progress | Heat Grid | Daily Mission
   Activity Feed | Critical Stores | Smart Insights | Top Issues
   ===================================================== */
const DashboardView = {
  render() {
    const stores = STATE.myStores();
    const stats = STATE.getEngineerStats();
    const devs = STATE.devList();

    // KPI data
    const tot = stores.length;
    const checked = stats.checked;
    const critical = stats.critical;
    const needVisit = stores.filter(s => STATE.healthLabel(s) === 'critical' || !STATE.isCheckedToday(s.id)).length;

    // Mock sparkline data (would come from API in production)
    const sparkData = [65, 72, 68, 80, 75, 82, 78, 85, 88, 92];

    const kpiSection = `
      <div class="kpi-section">
        <div class="kpi-grid">
          ${UI.kpiCard({
            icon: 'ti-building-store', iconClass: 'brand',
            label: 'Total Stores', value: tot,
            sub: 'Assigned to you',
            trend: '+4%', trendDir: 'up'
          })}
          ${UI.kpiCard({
            icon: 'ti-circle-check', iconClass: 'success',
            label: 'Checked Today', value: checked,
            sub: `${stats.pct}% Completed`,
            trend: '+12%', trendDir: 'up'
          })}
          ${UI.kpiCard({
            icon: 'ti-alert-triangle', iconClass: 'danger',
            label: 'Critical Stores', value: critical,
            sub: 'Require immediate action',
            trend: '-2', trendDir: 'down'
          })}
          ${UI.kpiCard({
            icon: 'ti-map-pin', iconClass: 'warning',
            label: 'Need Visit', value: needVisit,
            sub: 'On-site visit required',
            trend: '+1', trendDir: 'up'
          })}
        </div>
      </div>`;

    // Engineer Progress (for engineers) or Team Overview (for managers
    const isEng = STATE.isEngineer();
    const progressSection = isEng ? DashboardView._engineerProgress(stats) : DashboardView._teamOverview(stores);

    // Heat Grid
    const heatSection = stores.length ? `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-grid-dots"></i> Store Health Overview</h3>
          <span class="view-all" onclick="APP.showTab('stores')">View All</span>
        </div>
        <div class="card-body">
          ${UI.heatGrid(stores)}
        </div>
      </div>` : '';

    // Daily Mission (engineer only)
    const missionSection = isEng ? DashboardView._dailyMission(stats) : '';

    // Recent Activity
    const activities = STATE.getRecentActivities(6);
    const activitySection = `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-activity"></i> Recent Activity</h3>
          <span class="view-all" onclick="APP.showTab('alerts')">View All</span>
        </div>
        <div class="card-body">
          <div class="activity-list">
            ${activities.length ? activities.map(a => UI.activityItem(a)).join('') : 
              '<div class="empty-state"><i class="ti ti-clock"></i><p>No recent activity</p></div>'}
          </div>
        </div>
      </div>`;

    // Critical Stores
    const criticalStores = stores.filter(s => STATE.healthLabel(s) === 'critical').slice(0, 5);
    const criticalSection = criticalStores.length ? `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-alert-circle"></i> Critical Stores</h3>
          <span class="view-all" onclick="APP.showTab('critical')">View All</span>
        </div>
        <div class="card-body">
          <div class="critical-list">
            ${criticalStores.map(s => UI.criticalItem(s)).join('')}
          </div>
        </div>
      </div>` : '';

    // Smart Insights
    const insights = STATE.getInsights();
    const insightSection = insights.length ? `
      <div class="insight-card">
        <div class="insight-header">
          <i class="ti ti-bulb"></i>
          <span>Smart Insight</span>
        </div>
        <div class="insight-text">${insights[0].text}</div>
      </div>` : '';

    // Top Issues
    const issueCounts = {};
    stores.forEach(s => {
      devs.forEach(d => {
        if (!s[d]) issueCounts[d] = (issueCounts[d] || 0) + 1;
      });
    });
    const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxIssues = topIssues.length ? topIssues[0][1] : 1;
    const issuesSection = topIssues.length ? `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-chart-bar"></i> Top Issues Today</h3>
        </div>
        <div class="card-body">
          <div class="issue-rank-list">
            ${topIssues.map(([device, count], i) => `
              <div class="issue-rank-item">
                <div class="issue-rank-num ${i < 3 ? 'top' : ''}">${i + 1}</div>
                <div class="issue-rank-info">
                  <div class="issue-rank-name">${device} Issue</div>
                  <div class="issue-rank-bar">
                    <div class="issue-rank-bar-fill" style="width:${(count/maxIssues*100)}%;background:${i===0?'var(--danger)':i===1?'var(--warning)':'var(--info)'};opacity:${1-i*0.15}"></div>
                  </div>
                </div>
                <div class="issue-rank-count">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>` : '';

    // Streak & Weekly (engineer only)
    const streakSection = isEng ? `
      <div class="mini-stat-grid">
        <div class="mini-stat">
          <div class="mini-stat-icon">🔥</div>
          <div class="mini-stat-value">7 Days</div>
          <div class="mini-stat-label">Current Streak</div>
          <div class="mini-stat-sub">Great job!</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-icon">📈</div>
          <div class="mini-stat-value">96%</div>
          <div class="mini-stat-label">Weekly Completion</div>
          <div class="mini-stat-sub">+12% from last week</div>
        </div>
      </div>` : '';

    return `
      <div class="animate-fade-in">
        ${kpiSection}
        <div class="dash-layout">
          <div class="dash-main">
            ${progressSection}
            ${heatSection}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
              ${activitySection}
              ${criticalSection || issuesSection}
            </div>
          </div>
          <div class="dash-side">
            ${missionSection}
            ${insightSection}
            ${issuesSection && criticalSection ? issuesSection : ''}
            ${streakSection}
          </div>
        </div>
      </div>`;
  },

  _engineerProgress(stats) {
    return `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-chart-pie"></i> Engineer Progress</h3>
          <span class="view-all">Today</span>
        </div>
        <div class="card-body">
          <div class="eng-progress">
            ${UI.progressRing(stats.pct, 140)}
            <div class="progress-stats">
              <div class="progress-stat">
                <div class="progress-stat-dot completed"></div>
                <div class="progress-stat-info">
                  <div class="progress-stat-value">${stats.checked}</div>
                  <div class="progress-stat-label">Completed</div>
                </div>
              </div>
              <div class="progress-stat">
                <div class="progress-stat-dot remaining"></div>
                <div class="progress-stat-info">
                  <div class="progress-stat-value">${stats.remaining}</div>
                  <div class="progress-stat-label">Remaining</div>
                </div>
              </div>
              <div class="progress-stat">
                <div class="progress-stat-dot critical"></div>
                <div class="progress-stat-info">
                  <div class="progress-stat-value">${stats.critical}</div>
                  <div class="progress-stat-label">Critical</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  _teamOverview(stores) {
    const byEng = {};
    stores.forEach(s => {
      if (!byEng[s.eng]) byEng[s.eng] = { t:0, ok:0, checked:0 };
      byEng[s.eng].t++;
      if (!STATE.hasIssue(s)) byEng[s.eng].ok++;
      if (STATE.isCheckedToday(s.id)) byEng[s.eng].checked++;
    });

    return `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-users"></i> Team Overview</h3>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Engineer</th><th>Stores</th><th>Checked</th><th>Issues</th><th>Health</th></tr>
              </thead>
              <tbody>
                ${Object.entries(byEng).map(([name, d]) => {
                  const pct = Math.round(d.checked / d.t * 100);
                  return `<tr>
                    <td><div style="display:flex;align-items:center;gap:8px">
                      <div style="width:28px;height:28px;border-radius:50%;background:var(--brand-light);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${UI.initials(name)}</div>
                      ${name}
                    </div></td>
                    <td>${d.t}</td>
                    <td>${d.checked}/${d.t}</td>
                    <td style="color:${d.t-d.ok>0?'var(--danger)':'var(--success)'}">${d.t-d.ok||'—'}</td>
                    <td><span class="score-pill ${pct>=80?'healthy':'warning'}">${pct}%</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  },

  _dailyMission(stats) {
    const stores = STATE.myStores();
    const remaining = stats.remaining;
    const critical = stats.critical;

    return `
      <div class="card">
        <div class="card-header">
          <h3><i class="ti ti-target"></i> Daily Mission</h3>
          <span class="view-all">Today</span>
        </div>
        <div class="card-body">
          <div class="mission-list">
            <div class="mission-item">
              <div class="mission-icon info"><i class="ti ti-building-store"></i></div>
              <div class="mission-info">
                <div class="mission-label">Total Stores</div>
              </div>
              <div class="mission-value">${stats.total}</div>
            </div>
            <div class="mission-item">
              <div class="mission-icon success"><i class="ti ti-circle-check"></i></div>
              <div class="mission-info">
                <div class="mission-label">Checked</div>
              </div>
              <div class="mission-value">${stats.checked}</div>
              <div class="mission-bar"><div class="mission-bar-fill" style="width:${stats.pct}%;background:var(--success)"></div></div>
            </div>
            <div class="mission-item">
              <div class="mission-icon warning"><i class="ti ti-clock"></i></div>
              <div class="mission-info">
                <div class="mission-label">Remaining</div>
              </div>
              <div class="mission-value">${remaining}</div>
            </div>
            <div class="mission-item">
              <div class="mission-icon danger"><i class="ti ti-alert-triangle"></i></div>
              <div class="mission-info">
                <div class="mission-label">Critical</div>
              </div>
              <div class="mission-value">${critical}</div>
            </div>
          </div>
          <button class="mission-btn" onclick="APP.showTab('stores')">
            View My Stores <i class="ti ti-chevron-right"></i>
          </button>
        </div>
      </div>`;
  },

  async refresh() {
    UI.showContentLoader(true);
    try {
      const data = await API.getAll();
      STATE.db.stores = data.data.stores || STATE.db.stores;
      APP.buildSidebar();
      APP.refreshTab();
    } catch(e) {
      UI.toast('Refresh failed: ' + e.message, 'err');
    } finally {
      UI.showContentLoader(false);
    }
  }
};