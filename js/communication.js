/* =====================================================
   communication.js — Branch & Area Communication System v5.1
   WhatsApp + Phone integration with auto-filled messages
   ===================================================== */
const COMM = {

  // ── Open Communication Modal for a Store ─────────────
  openStoreCommunication(storeId) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) { UI.toast('Store not found', 'err'); return; }

    const contacts = STATE.getStoreContacts(storeId);
    const devs = STATE.devList();

    // Build contacts list
    const contactsHtml = contacts.length 
      ? contacts.map(c => COMM._contactCard(c, store)).join('')
      : `<div class="empty-state" style="padding:2rem"><i class="ti ti-user-off"></i><p>No contacts configured for this branch</p><p class="empty-state-sub">Add contacts in Admin > Settings</p></div>`;

    // Build device status preview
    const devicesHtml = devs.map(d => `
      <div class="mobile-device-btn ${store[d] ? 'ok' : 'issue'}">
        <i class="ti ${store[d] ? 'ti-check' : 'ti-x'}"></i>
        <span>${d}</span>
      </div>
    `).join('');

    UI.openModal(
      `${store.branch} — Communication`,
      `<div class="comm-tabs">
        <div class="comm-tab active" onclick="COMM.switchTab(this,'contacts')">Contacts</div>
        <div class="comm-tab" onclick="COMM.switchTab(this,'report')">Branch Report</div>
        <div class="comm-tab" onclick="COMM.switchTab(this,'area')">Area Report</div>
      </div>

      <div id="comm-contacts" class="comm-section">
        <div class="comm-section-title"><i class="ti ti-users"></i> Branch Contacts</div>
        ${contactsHtml}
        <div class="comm-section-title" style="margin-top:16px"><i class="ti ti-device-laptop"></i> Current Device Status</div>
        <div class="mobile-store-devices">${devicesHtml}</div>
      </div>

      <div id="comm-report" class="comm-section hidden">
        <div class="comm-section-title"><i class="ti ti-file-text"></i> Single Branch Report</div>
        <div class="comm-preview-label">Preview Message</div>
        <div class="comm-preview" id="singleBranchPreview">${COMM.buildSingleBranchMessage(store)}</div>
        <div class="comm-action-btns">
          <button class="btn btn-brand" onclick="COMM.sendWhatsAppReport('single',${store.id})">
            <i class="ti ti-brand-whatsapp"></i> Send via WhatsApp
          </button>
          <button class="btn btn-secondary" onclick="COMM.copyMessage('singleBranchPreview')">
            <i class="ti ti-copy"></i> Copy
          </button>
        </div>
      </div>

      <div id="comm-area" class="comm-section hidden">
        <div class="comm-section-title"><i class="ti ti-map"></i> Full Area Summary</div>
        <div class="comm-preview-label">Preview Message</div>
        <div class="comm-preview" id="areaSummaryPreview">${COMM.buildAreaSummaryMessage(store.area)}</div>
        <div class="comm-action-btns">
          <button class="btn btn-brand" onclick="COMM.sendWhatsAppReport('area','${store.area}')">
            <i class="ti ti-brand-whatsapp"></i> Send via WhatsApp
          </button>
          <button class="btn btn-secondary" onclick="COMM.copyMessage('areaSummaryPreview')">
            <i class="ti ti-copy"></i> Copy
          </button>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>`
    );
  },

  // ── Contact Card ─────────────────────────────────────
  _contactCard(contact, store) {
    const phone = contact.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(COMM.buildWhatsAppChecklist(store))}` : '#';
    const callLink = cleanPhone ? `tel:${phone}` : '#';

    return `
      <div class="contact-card">
        <div class="contact-avatar">${UI.initials(contact.name)}</div>
        <div class="contact-info">
          <div class="contact-name">${contact.name}</div>
          <div class="contact-role">${contact.role || 'Contact'}</div>
          ${phone ? `<div class="contact-phone"><i class="ti ti-phone" style="font-size:11px"></i> ${phone}</div>` : ''}
        </div>
        <div class="contact-actions">
          <a href="${waLink}" target="_blank" class="contact-btn whatsapp" title="WhatsApp" ${!cleanPhone ? 'style="opacity:0.4;pointer-events:none"' : ''}>
            <i class="ti ti-brand-whatsapp"></i>
          </a>
          <a href="${callLink}" class="contact-btn call" title="Call" ${!phone ? 'style="opacity:0.4;pointer-events:none"' : ''}>
            <i class="ti ti-phone"></i>
          </a>
        </div>
      </div>`;
  },

  // ── Tab Switching ────────────────────────────────────
  switchTab(el, tabId) {
    document.querySelectorAll('.comm-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.comm-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('comm-' + tabId).classList.remove('hidden');
  },

  // ── Build WhatsApp Checklist Message ─────────────────
  buildWhatsAppChecklist(store) {
    const u = STATE.currentUser;
    const devs = STATE.devList();

    let msg = `Hello,

`;
    msg += `This is Shawarmer IT Support.

`;
    msg += `Engineer: ${u?.name || 'IT Support'}
`;
    msg += `Branch: ${store.branch}

`;
    msg += `Please confirm the current status of the following devices:

`;

    devs.forEach(d => {
      const status = store[d] ? '✅ Working' : '❌ Issue / Offline';
      msg += `• ${d}: ${status}
`;
    });

    msg += `
Kindly report any issue or offline device.

`;
    msg += `Thank you.`;

    return msg;
  },

  // ── Build Single Branch Report ─────────────────────
  buildSingleBranchMessage(store) {
    const u = STATE.currentUser;
    const devs = STATE.devList();
    const areaMgr = STATE.db.users.find(user => user.role === 'area' && user.ref === store.area);

    let msg = `Hello ${areaMgr?.name || 'Manager'},

`;
    msg += `This is Shawarmer IT Support.

`;
    msg += `Engineer: ${u?.name || 'IT Support'}
`;
    msg += `Branch: ${store.branch}

`;
    msg += `Current Branch Operational Status:

`;

    devs.forEach(d => {
      const status = store[d] ? '✅ Working' : '❌ Issue / Offline';
      msg += `• ${d}: ${status}
`;
    });

    const notes = store.dailyNotes || store.notes || store.persistentNotes;
    if (notes) {
      msg += `
Latest Notes: ${notes}
`;
    }

    msg += `
Thank you.`;

    return msg;
  },

  // ── Build Area Summary Message ─────────────────────
  buildAreaSummaryMessage(areaName) {
    const u = STATE.currentUser;
    const devs = STATE.devList();
    const areaStores = STATE.myStores().filter(s => s.area === areaName);
    const areaMgr = STATE.db.users.find(user => user.role === 'area' && user.ref === areaName);

    if (!areaStores.length) return 'No stores found in this area.';

    let msg = `Hello ${areaMgr?.name || 'Manager'},

`;
    msg += `This is Shawarmer IT Support.

`;
    msg += `Engineer: ${u?.name || 'IT Support'}
`;
    msg += `Area: ${areaName}

`;
    msg += `Area Operational Summary:

`;

    areaStores.forEach(s => {
      msg += `📍 ${s.branch}
`;
      devs.forEach(d => {
        const status = s[d] ? '✅ Working' : '❌ Issue';
        msg += `   • ${d}: ${status}
`;
      });
      msg += `
`;
    });

    const criticalCount = areaStores.filter(s => STATE.healthLabel(s) === 'critical').length;
    const uncheckedCount = areaStores.filter(s => !STATE.isCheckedToday(s.id)).length;

    msg += `Critical Branches: ${criticalCount}
`;
    msg += `Unchecked Branches: ${uncheckedCount}

`;

    // Collect all notes
    const allNotes = areaStores.map(s => s.dailyNotes || s.notes).filter(n => n).join('; ');
    if (allNotes) {
      msg += `Latest Notes: ${allNotes}

`;
    }

    msg += `Thank you.`;

    return msg;
  },

  // ── Send WhatsApp Report ───────────────────────────
  sendWhatsAppReport(type, target) {
    let message = '';
    let phone = '';

    if (type === 'single') {
      const store = STATE.db.stores.find(s => String(s.id) === String(target));
      if (!store) return;
      message = COMM.buildSingleBranchMessage(store);
      // Try to find area manager phone
      const contacts = STATE.getStoreContacts(store.id);
      const areaMgrContact = contacts.find(c => c.role?.toLowerCase().includes('area'));
      phone = areaMgrContact?.phone || '';
    } else if (type === 'area') {
      message = COMM.buildAreaSummaryMessage(target);
      // Try to find area manager
      const areaMgr = STATE.db.users.find(u => u.role === 'area' && u.ref === target);
      // In a real system, you'd have the area manager's phone stored
      // For now, we'll open WhatsApp web/app without a specific number
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://web.whatsapp.com/`; // Fallback to WhatsApp Web

    window.open(waUrl, '_blank');
    UI.toast('Opening WhatsApp...', 'info');

    // Log the communication
    STATE.addActivity('communication', 
      type === 'single' ? STATE.db.stores.find(s => String(s.id) === String(target)) : null,
      `Sent ${type} report via WhatsApp`
    );
  },

  // ── Copy Message to Clipboard ──────────────────────
  async copyMessage(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.textContent);
      UI.toast('Message copied to clipboard', 'ok');
    } catch(e) {
      // Fallback
      const range = document.createRange();
      range.selectNode(el);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
      document.execCommand('copy');
      window.getSelection().removeAllRanges();
      UI.toast('Message copied to clipboard', 'ok');
    }
  },

  // ── Quick WhatsApp from Store Card ───────────────────
  quickWhatsApp(storeId, contactIndex = 0) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;

    const contacts = STATE.getStoreContacts(storeId);
    if (!contacts.length || !contacts[contactIndex]) {
      UI.toast('No contacts available for this branch', 'err');
      return;
    }

    const contact = contacts[contactIndex];
    const phone = (contact.phone || '').replace(/\D/g, '');
    if (!phone) {
      UI.toast('No phone number available', 'err');
      return;
    }

    const message = COMM.buildWhatsAppChecklist(store);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    UI.toast(`Opening WhatsApp for ${contact.name}...`, 'info');
  },

  // ── Quick Call ─────────────────────────────────────
  quickCall(storeId, contactIndex = 0) {
    const store = STATE.db.stores.find(s => String(s.id) === String(storeId));
    if (!store) return;

    const contacts = STATE.getStoreContacts(storeId);
    if (!contacts.length || !contacts[contactIndex]) {
      UI.toast('No contacts available', 'err');
      return;
    }

    const phone = contacts[contactIndex].phone;
    if (!phone) {
      UI.toast('No phone number available', 'err');
      return;
    }

    window.location.href = `tel:${phone}`;
  },

  // ── Render Communication Button in Store Row ───────
  renderCommButton(storeId, size = 'sm') {
    const btnClass = size === 'sm' ? 'btn btn-sm btn-ghost' : 'btn btn-secondary';
    return `
      <button class="${btnClass}" onclick="COMM.openStoreCommunication(${storeId})" title="Communication">
        <i class="ti ti-message-circle"></i> ${size === 'lg' ? 'Contact' : ''}
      </button>`;
  }
};