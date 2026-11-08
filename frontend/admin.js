// --- MOCK API LAYER (Local Storage Backend) ---
const originalFetch = window.fetch;

// Clean up any legacy dummy pre-seeded users
(function cleanLegacyData() {
  try {
    const rawUsers = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const cleanedUsers = rawUsers.filter(u => 
      u.email !== 'priya@example.com' && 
      u.name !== 'Priya Patel' && 
      u.email !== 'mock@example.com' && 
      u.name !== 'Mock User' &&
      !(u._id === 'u_2' && u.email === 'rahul@example.com' && !u.password)
    );
    if (!cleanedUsers.some(u => u.email === 'admin@admin.com')) {
      cleanedUsers.unshift({ _id: 'u_admin', name: 'Admin User', email: 'admin@admin.com', phone: '9876543210', role: 'Admin' });
    }
    localStorage.setItem('mock_users', JSON.stringify(cleanedUsers));
  } catch(e) {}
})();

window.fetch = async (url, options) => {
  // If backend is reachable, use real backend
  try {
    const realResponse = await originalFetch(url, options);
    return realResponse;
  } catch (netErr) {
    console.warn("Backend unavailable, falling back to mock storage for:", url);
  }

  const delay = (ms) => new Promise(res => setTimeout(res, ms));
  await delay(100);

  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify([
      { _id: 'u_admin', name: 'Admin User', email: 'admin@admin.com', phone: '9876543210', role: 'Admin' }
    ]));
  }

  const respond = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const method = (options?.method || 'GET').toUpperCase();

  // Users CRUD
  if (url.includes('/api/v1/users') && method === 'GET') {
    return respond(200, { success: true, data: JSON.parse(localStorage.getItem('mock_users') || '[]') });
  }
  if (url.includes('/api/v1/users') && method === 'POST') {
    const u = JSON.parse(options.body || '{}');
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    u._id = 'u_' + Date.now();
    users.unshift(u);
    localStorage.setItem('mock_users', JSON.stringify(users));
    return respond(201, { success: true, data: u });
  }
  if (url.match(/\/api\/v1\/users\/(.+)/) && method === 'PUT') {
    const id = url.match(/\/api\/v1\/users\/(.+)/)[1];
    const update = JSON.parse(options.body || '{}');
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const idx = users.findIndex(u => u._id === id);
    if (idx > -1) {
      Object.assign(users[idx], update);
      localStorage.setItem('mock_users', JSON.stringify(users));
      return respond(200, { success: true, data: users[idx] });
    }
    return respond(404, { error: 'Not found' });
  }
  if (url.match(/\/api\/v1\/users\/(.+)/) && method === 'DELETE') {
    const id = url.match(/\/api\/v1\/users\/(.+)/)[1];
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const updated = users.filter(u => u._id !== id);
    localStorage.setItem('mock_users', JSON.stringify(updated));
    return respond(200, { success: true });
  }

  // Services CRUD
  if (url.includes('/api/v1/services') && method === 'GET') {
    return respond(200, { success: true, data: JSON.parse(localStorage.getItem('mock_services') || '[]') });
  }
  if (url.includes('/api/v1/services') && method === 'POST') {
    const s = JSON.parse(options.body || '{}');
    const services = JSON.parse(localStorage.getItem('mock_services') || '[]');
    s._id = 's_' + Date.now();
    s.title = s.name || s.title || 'New Service';
    s.price = Number(s.price) || 100;
    s.duration = Number(s.duration) || 30;
    s.description = s.description || 'Professional car cleaning service';
    services.unshift(s);
    localStorage.setItem('mock_services', JSON.stringify(services));
    return respond(201, { success: true, data: s });
  }
  if (url.match(/\/api\/v1\/services\/(.+)/) && method === 'PUT') {
    const id = url.match(/\/api\/v1\/services\/(.+)/)[1];
    const update = JSON.parse(options.body || '{}');
    const services = JSON.parse(localStorage.getItem('mock_services') || '[]');
    const idx = services.findIndex(s => s._id === id);
    if (idx > -1) {
      if (update.name) update.title = update.name;
      Object.assign(services[idx], update);
      localStorage.setItem('mock_services', JSON.stringify(services));
      return respond(200, { success: true, data: services[idx] });
    }
    return respond(404, { error: 'Not found' });
  }
  if (url.match(/\/api\/v1\/services\/(.+)/) && method === 'DELETE') {
    const id = url.match(/\/api\/v1\/services\/(.+)/)[1];
    const services = JSON.parse(localStorage.getItem('mock_services') || '[]');
    const updated = services.filter(s => s._id !== id);
    localStorage.setItem('mock_services', JSON.stringify(updated));
    return respond(200, { success: true });
  }

  // Bookings CRUD
  if (url.includes('/api/v1/bookings') && method === 'GET') {
    return respond(200, { success: true, data: JSON.parse(localStorage.getItem('mock_bookings') || '[]') });
  }
  if (url.match(/\/api\/v1\/bookings\/(.+)/) && method === 'PUT') {
    const id = url.match(/\/api\/v1\/bookings\/(.+)/)[1];
    const update = JSON.parse(options.body || '{}');
    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const idx = bookings.findIndex(b => b._id === id);
    if (idx > -1) {
      Object.assign(bookings[idx], update);
      localStorage.setItem('mock_bookings', JSON.stringify(bookings));
      return respond(200, { success: true, data: bookings[idx] });
    }
    return respond(404, { error: 'Not found' });
  }
  if (url.match(/\/api\/v1\/bookings\/(.+)/) && method === 'DELETE') {
    const id = url.match(/\/api\/v1\/bookings\/(.+)/)[1];
    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const updated = bookings.filter(b => b._id !== id);
    localStorage.setItem('mock_bookings', JSON.stringify(updated));
    return respond(200, { success: true });
  }

  try {
    return await originalFetch(url, options);
  } catch(e) {
    return respond(200, { data: [] });
  }
};
// --- END MOCK API LAYER ---

const token = localStorage.getItem('token');
if (!token || token === 'mock' || token.startsWith('mock_token_')) {
  window.location.href = 'login.html';
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let currentTab = 'users';
let currentData = { users: [], bookings: [], services: [], offers: [] };
let editId = null;

let filterUserId = null;

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    filterUserId = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    currentTab = btn.dataset.target;
    document.getElementById(`${currentTab}Tab`).classList.add('active');
    
    document.getElementById('pageTitle').textContent = `Manage ${currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}`;
    loadData();
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('mock_user');
  window.location.href = 'login.html';
});

// Load Data
async function loadData() {
  if (currentTab === 'offers') {
    let offers = JSON.parse(localStorage.getItem('mock_offers'));
    if (!offers) {
      offers = [
        { _id: 'o1', code: 'CLEAN20', type: 'Flat ₹20 Off', discount: 20, isPercentage: false, start: '2025-01-01', end: '2027-12-31', uses: 12 }
      ];
      localStorage.setItem('mock_offers', JSON.stringify(offers));
    }
    
    let campaigns = JSON.parse(localStorage.getItem('activeCampaigns'));
    if (!campaigns) {
      campaigns = [
        { _id: 'c1', title: 'Summer Shine Special', subtitle: '20% Off All Services', active: true }
      ];
      localStorage.setItem('activeCampaigns', JSON.stringify(campaigns));
    }
    
    currentData.offers = offers;
    currentData.campaigns = campaigns;
    renderTable();
    return;
  }

  try {
    const res = await fetch(`/api/v1/${currentTab}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    currentData[currentTab] = data.data;
    renderTable();
  } catch (err) {
    console.error(err);
    alert('Error loading data. Are you an Admin?');
  }
}

function renderTable() {
  const tbody = document.getElementById(`${currentTab}TableBody`);
  tbody.innerHTML = '';

  let data = currentData[currentTab] || [];
  if (currentTab === 'bookings' && filterUserId) {
    data = data.filter(b => 
      (b.customerId && (b.customerId._id === filterUserId || b.customerId.email === filterUserId)) ||
      b.userId === filterUserId ||
      b.userEmail === filterUserId
    );
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6b7280;">No records found.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    if (currentTab === 'users') {
      tr.innerHTML = `
        <td><div style="font-weight:500;">${item.name}</div></td>
        <td>${item.email}</td>
        <td>${item.phone}</td>
        <td><span class="status-badge ${item.role === 'Admin' ? 'admin' : 'customer'}">${item.role}</span></td>
        <td class="actions-cell">
          <button class="icon-btn view-bookings-btn" data-id="${item._id}" data-email="${item.email}" title="View Bookings"><i class="fa-solid fa-calendar-check"></i></button>
          <button class="icon-btn edit-btn" data-id="${item._id}"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn delete delete-btn" data-id="${item._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
    } else if (currentTab === 'bookings') {
      const dateStr = item.bookingDate ? new Date(item.bookingDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
      
      let paymentHtml = `<div style="font-size:13px; color:#6b7280;">N/A</div>`;
      if (item.paymentStatus) {
        if (item.paymentStatus === 'Partial - Advance Paid') {
          paymentHtml = `
            <div style="font-size:12px; font-weight:600; color:#b45309; background:#fef3c7; padding:2px 6px; border-radius:4px; display:inline-block; margin-bottom:4px;">Deposit Paid</div>
            <div style="font-size:13px;">Bal: ₹${item.balanceDue}</div>
            <button class="collect-btn" data-id="${item._id}" style="margin-top:4px; padding:4px 8px; font-size:11px; font-weight:600; border:none; background:#2563eb; color:white; border-radius:4px; cursor:pointer;">Collect Balance</button>
          `;
        } else {
          paymentHtml = `<div style="font-size:12px; font-weight:600; color:#065f46; background:#d1fae5; padding:2px 6px; border-radius:4px; display:inline-block;">Fully Paid</div>`;
        }
      }

      tr.innerHTML = `
        <td>${item.customerId ? item.customerId.name : 'Unknown'}</td>
        <td>${item.serviceId ? item.serviceId.title : 'Unknown'}</td>
        <td>${dateStr} ${item.bookingTime || ''}</td>
        <td>${paymentHtml}</td>
        <td>
          <select class="status-select" data-id="${item._id}" style="padding:4px; border-radius:4px; border:1px solid #d1d5db; font-size: 13px;">
            <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" ${item.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Washing" ${item.status === 'Washing' ? 'selected' : ''}>Washing</option>
            <option value="Polishing" ${item.status === 'Polishing' ? 'selected' : ''}>Polishing</option>
            <option value="Ready for Pickup" ${item.status === 'Ready for Pickup' ? 'selected' : ''}>Ready for Pickup</option>
            <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Cancelled" ${item.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td class="actions-cell">
          <button class="icon-btn delete delete-btn" data-id="${item._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
    } else if (currentTab === 'services') {
      tr.innerHTML = `
        <td><div style="font-weight:500;">${item.name || item.title}</div></td>
        <td>₹${item.price}</td>
        <td>${item.duration} mins</td>
        <td class="actions-cell">
          <button class="icon-btn edit-btn" data-id="${item._id}"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn delete delete-btn" data-id="${item._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
    } else if (currentTab === 'offers') {
      const now = new Date();
      const end = item.end ? new Date(item.end) : null;
      const start = item.start ? new Date(item.start) : null;
      let status = 'Active';
      let badgeColor = '#d1fae5'; let textColor = '#065f46';
      
      if (end && now > end) { status = 'Expired'; badgeColor = '#fee2e2'; textColor = '#991b1b'; }
      else if (start && now < start) { status = 'Upcoming'; badgeColor = '#fef3c7'; textColor = '#92400e'; }

      tr.innerHTML = `
        <td><div style="font-weight:600; color:#2563eb;">${item.code}</div></td>
        <td>${item.type}</td>
        <td><span class="status-badge" style="background:${badgeColor}; color:${textColor};">${status}</span></td>
        <td>${item.start || '-'} to ${item.end || '-'}</td>
        <td class="actions-cell">
          <button class="icon-btn delete delete-btn" data-id="${item._id}"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
    }
    tbody.appendChild(tr);
  });

  if (currentTab === 'offers') {
    const campaignsContainer = document.getElementById('campaignsContainer');
    if (campaignsContainer) {
      campaignsContainer.innerHTML = '';
      const campaigns = currentData.campaigns || [];
      campaigns.forEach(c => {
        const div = document.createElement('div');
        div.style.padding = '16px';
        div.style.border = '1px solid #e5e7eb';
        div.style.borderRadius = '8px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `
          <div>
            <div style="font-weight:600; font-size:15px; color:#111827;">${c.title}</div>
            <div style="font-size:13px; color:#6b7280;">${c.subtitle}</div>
          </div>
          <div>
            <button class="toggle-campaign-btn" data-id="${c._id}" style="padding:8px 16px; border:none; border-radius:6px; font-weight:600; cursor:pointer; background:${c.active ? '#fee2e2' : '#d1fae5'}; color:${c.active ? '#991b1b' : '#065f46'};">
              ${c.active ? 'Disable' : 'Enable'}
            </button>
          </div>
        `;
        campaignsContainer.appendChild(div);
      });

      document.querySelectorAll('.toggle-campaign-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          let camps = JSON.parse(localStorage.getItem('activeCampaigns'));
          const idx = camps.findIndex(x => x._id === id);
          if (idx > -1) {
            camps[idx].active = !camps[idx].active;
            localStorage.setItem('activeCampaigns', JSON.stringify(camps));
            loadData();
          }
        });
      });
    }
  }

  // Attach Listeners
  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openModal(btn.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => deleteRecord(btn.dataset.id)));
  document.querySelectorAll('.status-select').forEach(sel => sel.addEventListener('change', (e) => updateBookingStatus(e.target.dataset.id, e.target.value)));
  
  document.querySelectorAll('.collect-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = e.target.dataset.id;
    if (confirm("Collect remaining balance and mark as Fully Paid?")) {
      const b = (currentData.bookings || []).find(x => x._id === id);
      const adv = b ? (b.advancePaid || 0) : 0;
      const bal = b ? (b.balanceDue || 0) : 0;

      try {
        const res = await fetch(`/api/v1/bookings/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            paymentStatus: 'Fully Paid',
            advancePaid: adv + bal,
            balanceDue: 0,
            settledAt: new Date().toISOString()
          })
        });

        if (res.ok) {
          loadData();
          return;
        }
      } catch (err) {
        console.warn("Backend update failed, updating local storage:", err);
      }

      let bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
      const idx = bookings.findIndex(x => x._id === id);
      if (idx > -1) {
        bookings[idx].paymentStatus = 'Fully Paid';
        bookings[idx].advancePaid += bookings[idx].balanceDue;
        bookings[idx].balanceDue = 0;
        bookings[idx].settledAt = new Date().toISOString();
        localStorage.setItem('mock_bookings', JSON.stringify(bookings));
        loadData();
      }
    }
  }));

  document.querySelectorAll('.view-bookings-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filterUserId = btn.dataset.id;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      const bookingNav = document.querySelector('.nav-btn[data-target="bookings"]');
      if(bookingNav) bookingNav.classList.add('active');
      
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('bookingsTab').classList.add('active');
      currentTab = 'bookings';
      document.getElementById('pageTitle').textContent = `Manage Bookings (Filtered)`;
      loadData();
    });
  });

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      try {
        const res = await fetch(`/api/v1/bookings/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status })
        });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + data.error);
        }
      } catch (err) {
        console.error(err);
      }
    });
  });
}

// Modal Logic
const modal = document.getElementById('modalOverlay');
document.getElementById('createBtn').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);

function closeModal() {
  modal.classList.remove('active');
  editId = null;
}

function openModal(id = null) {
  editId = id;
  document.getElementById('modalTitle').textContent = id ? `Edit ${currentTab.slice(0,-1)}` : `Create New ${currentTab.slice(0,-1)}`;
  
  const body = document.getElementById('modalBody');
  let item = null;
  if (id) {
    item = currentData[currentTab].find(x => x._id === id);
  }

  if (currentTab === 'users') {
    body.innerHTML = `
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="f_name" value="${item ? item.name : ''}">
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="f_email" value="${item ? item.email : ''}">
      </div>
      <div class="form-group">
        <label>Phone</label>
        <input type="text" id="f_phone" value="${item ? item.phone : ''}">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="f_role">
          <option value="Customer" ${item && item.role === 'Customer' ? 'selected' : ''}>Customer</option>
          <option value="Admin" ${item && item.role === 'Admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      ${!id ? `
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="f_password">
      </div>` : ''}
    `;
  } else if (currentTab === 'services') {
    body.innerHTML = `
      <div class="form-group">
        <label>Service Name</label>
        <input type="text" id="f_name" value="${item ? item.name : ''}">
      </div>
      <div class="form-group">
        <label>Price (₹)</label>
        <input type="number" id="f_price" value="${item ? item.price : ''}">
      </div>
      <div class="form-group">
        <label>Duration (mins)</label>
        <input type="number" id="f_duration" value="${item ? item.duration : ''}">
      </div>
    `;
  } else if (currentTab === 'offers') {
    body.innerHTML = `
      <div class="form-group">
        <label>Promo Code</label>
        <input type="text" id="f_code">
      </div>
      <div class="form-group">
        <label>Discount Type</label>
        <select id="f_type">
          <option value="flat">Flat Amount (₹)</option>
          <option value="percent">Percentage (%)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Discount Value</label>
        <input type="number" id="f_discount">
      </div>
      <div class="form-group">
        <label>Valid From (Start Date)</label>
        <input type="date" id="f_start">
      </div>
      <div class="form-group">
        <label>Valid Until (Expiry Date)</label>
        <input type="date" id="f_end">
      </div>
    `;
  } else {
    body.innerHTML = `<p>Creation/Editing not fully supported for this tab via this simple UI yet.</p>`;
  }

  modal.classList.add('active');
}

document.getElementById('saveModal').addEventListener('click', async () => {
  if (currentTab === 'bookings') return closeModal(); // Placeholder

  if (currentTab === 'offers') {
    const isPercent = document.getElementById('f_type').value === 'percent';
    const val = document.getElementById('f_discount').value;
    const newOffer = {
      _id: 'o_' + Date.now(),
      code: document.getElementById('f_code').value.toUpperCase(),
      type: isPercent ? `Percentage ${val}% Off` : `Flat ₹${val} Off`,
      discount: parseFloat(val),
      isPercentage: isPercent,
      start: document.getElementById('f_start').value,
      end: document.getElementById('f_end').value,
      uses: 0
    };
    const offers = JSON.parse(localStorage.getItem('mock_offers') || '[]');
    offers.push(newOffer);
    localStorage.setItem('mock_offers', JSON.stringify(offers));
    closeModal();
    loadData();
    return;
  }

  let payload = {};
  if (currentTab === 'users') {
    payload = {
      name: document.getElementById('f_name').value,
      email: document.getElementById('f_email').value,
      phone: document.getElementById('f_phone').value,
      role: document.getElementById('f_role').value
    };
    if (!editId) payload.password = document.getElementById('f_password').value;
  } else if (currentTab === 'services') {
    payload = {
      name: document.getElementById('f_name').value,
      price: document.getElementById('f_price').value,
      duration: document.getElementById('f_duration').value
    };
  }

  try {
    const url = editId ? `/api/v1/${currentTab}/${editId}` : `/api/v1/${currentTab}`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    if (res.ok) {
      closeModal();
      loadData();
    } else {
      const data = await res.json();
      alert('Error: ' + data.error);
    }
  } catch (err) {
    console.error(err);
  }
});

async function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  if (currentTab === 'offers') {
    const offers = JSON.parse(localStorage.getItem('mock_offers') || '[]');
    localStorage.setItem('mock_offers', JSON.stringify(offers.filter(o => o._id !== id)));
    loadData();
    return;
  }

  try {
    const res = await fetch(`/api/v1/${currentTab}/${id}`, { method: 'DELETE', headers });
    if (res.ok) loadData();
    else alert('Failed to delete.');
  } catch (err) {
    console.error(err);
  }
}

// Init
loadData();
