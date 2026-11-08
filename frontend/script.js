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

    const curr = JSON.parse(localStorage.getItem('mock_user') || 'null');
    if (curr && (curr.name === 'Mock User' || curr.email === 'mock@example.com' || curr.name === 'Priya Patel')) {
      localStorage.removeItem('mock_user');
      localStorage.removeItem('token');
    }
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

  if (!localStorage.getItem('mock_bookings')) localStorage.setItem('mock_bookings', JSON.stringify([]));
  if (!localStorage.getItem('mock_vehicles')) localStorage.setItem('mock_vehicles', JSON.stringify([]));
  if (!localStorage.getItem('mock_users')) {
    localStorage.setItem('mock_users', JSON.stringify([
      { _id: 'u_admin', name: 'Admin User', email: 'admin@admin.com', phone: '9876543210', role: 'Admin' }
    ]));
  }
  if (!localStorage.getItem('mock_services')) localStorage.setItem('mock_services', JSON.stringify([
    { _id: 's1', title: 'Basic Wash', description: 'Exterior wash and dry', duration: 30, price: 150 },
    { _id: 's2', title: 'Premium Wash', description: 'Exterior + Interior vacuum', duration: 60, price: 350 },
    { _id: 's3', title: 'Full Detailing', description: 'Deep clean, polish & wax', duration: 120, price: 800 }
  ]));

  const respond = (status, data) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) });
  const method = (options?.method || 'GET').toUpperCase();
  const getCurrentUser = () => JSON.parse(localStorage.getItem('mock_user') || '{}');

  // Auth: Login
  if (url.includes('/api/v1/auth/login')) {
    let email = 'user@example.com';
    let password = '';
    if (options && options.body) {
      try {
        const body = JSON.parse(options.body);
        email = (body.email || '').trim().toLowerCase();
        password = body.password || '';
      } catch(e){}
    }

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    let user = users.find(u => (u.email || '').toLowerCase() === email);

    if (!user) {
      // Auto-create account if logging in for first time
      const isAdmin = email === 'admin' || email === 'admin@admin.com' || email.includes('admin');
      user = {
        _id: isAdmin ? 'u_admin' : ('u_' + Date.now()),
        name: isAdmin ? 'Admin User' : (email.split('@')[0] || 'User'),
        email: email,
        phone: isAdmin ? '9876543210' : '',
        role: isAdmin ? 'Admin' : 'Customer'
      };
      users.push(user);
      localStorage.setItem('mock_users', JSON.stringify(users));
    }

    localStorage.setItem('mock_user', JSON.stringify(user));
    localStorage.setItem('token', 'mock_token_' + user._id);
    return respond(200, { token: 'mock_token_' + user._id, user });
  }

  // Auth: Register
  if (url.includes('/api/v1/auth/register')) {
    let name = 'New User';
    let email = 'user@example.com';
    let phone = '';
    let password = '';
    let role = 'Customer';
    if (options && options.body) {
      try {
        const body = JSON.parse(options.body);
        name = (body.name || '').trim() || name;
        email = (body.email || '').trim().toLowerCase();
        phone = (body.phone || '').trim();
        password = body.password || '';
        if (email.includes('admin')) role = 'Admin';
      } catch(e){}
    }

    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const existingIdx = users.findIndex(u => (u.email || '').toLowerCase() === email);
    const newUser = { _id: 'u_' + Date.now(), name, email, phone, role, password };

    if (existingIdx > -1) {
      users[existingIdx] = newUser;
    } else {
      users.push(newUser);
    }

    localStorage.setItem('mock_users', JSON.stringify(users));
    localStorage.setItem('mock_user', JSON.stringify(newUser));
    localStorage.setItem('token', 'mock_token_' + newUser._id);
    return respond(201, { token: 'mock_token_' + newUser._id, user: newUser });
  }

  // Auth: Current User Stats
  if (url.includes('/api/v1/auth/me/stats')) {
    const curr = getCurrentUser();
    const currEmail = (curr.email || '').toLowerCase();
    const currId = curr._id;

    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const vehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]');

    const userBookings = bookings.filter(b => 
      (b.userEmail && b.userEmail.toLowerCase() === currEmail) || 
      (b.userId && b.userId === currId) ||
      (b.customerId && b.customerId.email && b.customerId.email.toLowerCase() === currEmail) ||
      (b.customerId && b.customerId._id && b.customerId._id === currId)
    );

    const userVehicles = vehicles.filter(v => 
      (v.userEmail && v.userEmail.toLowerCase() === currEmail) || 
      (v.userId && v.userId === currId)
    );

    const completed = userBookings.filter(b => b.status === 'Completed');
    const totalSpent = completed.reduce((a, b) => a + (b.price || 0), 0);

    return respond(200, {
      data: {
        totalWashes: completed.length,
        totalSpent: totalSpent,
        rewardPoints: completed.length * 10,
        savedCars: userVehicles.length
      }
    });
  }

  // Auth: Update Profile
  if (url.includes('/api/v1/auth/me') && method === 'PUT') {
    const payload = JSON.parse(options.body || '{}');
    const curr = getCurrentUser();
    const oldEmail = (curr.email || '').toLowerCase();

    if (payload.name) curr.name = payload.name;
    if (payload.email) curr.email = payload.email.trim().toLowerCase();
    if (payload.phone) curr.phone = payload.phone;

    localStorage.setItem('mock_user', JSON.stringify(curr));

    // Update in mock_users
    const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
    const uIdx = users.findIndex(u => u._id === curr._id || (u.email && u.email.toLowerCase() === oldEmail));
    if (uIdx > -1) {
      Object.assign(users[uIdx], curr);
      localStorage.setItem('mock_users', JSON.stringify(users));
    }

    // Sync in mock_bookings
    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    bookings.forEach(b => {
      if (b.userId === curr._id || (b.userEmail && b.userEmail.toLowerCase() === oldEmail)) {
        b.userEmail = curr.email;
        if (b.customerId) {
          b.customerId.name = curr.name;
          b.customerId.email = curr.email;
          b.customerId.phone = curr.phone;
        }
      }
    });
    localStorage.setItem('mock_bookings', JSON.stringify(bookings));

    // Sync in mock_vehicles
    const vehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]');
    vehicles.forEach(v => {
      if (v.userId === curr._id || (v.userEmail && v.userEmail.toLowerCase() === oldEmail)) {
        v.userEmail = curr.email;
      }
    });
    localStorage.setItem('mock_vehicles', JSON.stringify(vehicles));

    return respond(200, { success: true, data: curr });
  }

  // Auth: Get Profile
  if (url.includes('/api/v1/auth/me')) {
    const curr = getCurrentUser();
    return respond(200, { data: curr });
  }

  // Vehicles Mock Handlers (User Scoped)
  if (url.includes('/api/v1/vehicles') && method === 'POST') {
    const curr = getCurrentUser();
    const v = JSON.parse(options.body || '{}');
    const vehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]');
    
    v._id = 'v_' + Date.now();
    v.userId = curr._id || ('u_' + Date.now());
    v.userEmail = (curr.email || '').toLowerCase();

    const userVehicles = vehicles.filter(veh => 
      (veh.userEmail && veh.userEmail.toLowerCase() === v.userEmail) || 
      (veh.userId && veh.userId === v.userId)
    );

    if (v.isPrimary || userVehicles.length === 0) {
      vehicles.forEach(veh => {
        if ((veh.userEmail && veh.userEmail.toLowerCase() === v.userEmail) || (veh.userId && veh.userId === v.userId)) {
          veh.isPrimary = false;
        }
      });
      v.isPrimary = true;
    }

    vehicles.unshift(v);
    localStorage.setItem('mock_vehicles', JSON.stringify(vehicles));
    return respond(201, { success: true, data: v });
  }

  if (url.includes('/api/v1/vehicles') && method === 'GET') {
    const curr = getCurrentUser();
    const currEmail = (curr.email || '').toLowerCase();
    const currId = curr._id;
    const vehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]');

    const userVehicles = vehicles.filter(v => 
      (v.userEmail && v.userEmail.toLowerCase() === currEmail) || 
      (v.userId && v.userId === currId)
    );

    return respond(200, { success: true, data: userVehicles });
  }

  if (url.match(/\/api\/v1\/vehicles\/(.+)/) && method === 'DELETE') {
    const id = url.match(/\/api\/v1\/vehicles\/(.+)/)[1];
    const curr = getCurrentUser();
    const currEmail = (curr.email || '').toLowerCase();
    const vehicles = JSON.parse(localStorage.getItem('mock_vehicles') || '[]');

    const updated = vehicles.filter(veh => {
      if (veh._id === id) {
        if (curr.role === 'Admin' || (veh.userEmail && veh.userEmail.toLowerCase() === currEmail) || veh.userId === curr._id) {
          return false;
        }
      }
      return true;
    });

    localStorage.setItem('mock_vehicles', JSON.stringify(updated));
    return respond(200, { success: true });
  }

  // Services
  if (url.includes('/api/v1/services')) {
    return respond(200, { data: JSON.parse(localStorage.getItem('mock_services') || '[]') });
  }

  // Bookings (User Scoped for customer, all for admin)
  if (url.includes('/api/v1/bookings') && method === 'GET') {
    const curr = getCurrentUser();
    const currEmail = (curr.email || '').toLowerCase();
    const currId = curr._id;
    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');

    if (curr.role === 'Admin' && window.location.pathname.includes('admin.html')) {
      return respond(200, { success: true, data: bookings });
    }

    const userBookings = bookings.filter(b => 
      (b.userEmail && b.userEmail.toLowerCase() === currEmail) || 
      (b.userId && b.userId === currId) ||
      (b.customerId && b.customerId.email && b.customerId.email.toLowerCase() === currEmail) ||
      (b.customerId && b.customerId._id && b.customerId._id === currId)
    );

    return respond(200, { success: true, data: userBookings });
  }

  if (url.includes('/api/v1/bookings') && method === 'POST') {
    const curr = getCurrentUser();
    const b = JSON.parse(options.body || '{}');
    const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
    const services = JSON.parse(localStorage.getItem('mock_services') || '[]');

    let service = services.find(s => s._id === b.serviceId);
    if (!service) {
      service = { _id: b.serviceId || 's1', title: 'Car Wash Service', price: b.price || 150 };
    }

    b._id = 'b_' + Date.now();
    b.status = b.status || 'Pending';
    b.serviceId = service;
    b.userId = curr._id || ('u_' + Date.now());
    b.userEmail = (curr.email || '').toLowerCase();
    b.customerId = {
      _id: curr._id || b.userId,
      name: curr.name || (curr.email ? curr.email.split('@')[0] : 'Customer'),
      email: curr.email || '',
      phone: curr.phone || ''
    };

    bookings.unshift(b);
    localStorage.setItem('mock_bookings', JSON.stringify(bookings));
    return respond(201, { success: true, data: b });
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

  // Fallback to original fetch for anything else
  try {
    return await originalFetch(url, options);
  } catch(e) {
    console.warn("Backend unavailable, using fallback mock response for:", url);
    return respond(200, { data: [] });
  }
};
// --- END MOCK API LAYER ---

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('mock_user') || '{}');

  if (token) {
    document.querySelectorAll('.login-btn').forEach(btn => btn.style.display = 'none');
  }

  if (user && user.role === 'Admin') {
    document.querySelectorAll('.nav-links, .mobile-menu').forEach(nav => {
      if (!nav.querySelector('.admin-nav-link')) {
        const a = document.createElement('a');
        a.className = 'nav-btn admin-nav-link';
        a.href = 'admin.html';
        a.style.color = '#d97706';
        a.style.fontWeight = '700';
        a.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Admin';
        nav.appendChild(a);
      }
    });
  }

  // Dynamic Homepage Banner
  const heroTitle = document.getElementById('heroCampaignTitle');
  const heroSubtitle = document.getElementById('heroCampaignSubtitle');
  const heroBtn = document.getElementById('heroCampaignBtn');
  
  if (heroTitle && heroSubtitle) {
    const campaigns = JSON.parse(localStorage.getItem('activeCampaigns') || '[]');
    const activeCampaign = campaigns.find(c => c.active);
    
    if (activeCampaign) {
      heroTitle.textContent = activeCampaign.title;
      heroSubtitle.textContent = activeCampaign.subtitle;
      if (heroBtn) {
        heroBtn.style.display = 'block';
        heroBtn.textContent = 'Explore Offer';
      }
    } else {
      heroTitle.textContent = 'Premium Car Wash Services';
      heroSubtitle.textContent = 'Book Your Slot Today';
      if (heroBtn) heroBtn.style.display = 'none';
    }
  }
});

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));
}

// Highlight active nav based on <body data-page="...">
const activePage = document.body.dataset.page;
if (activePage) {
  document.querySelectorAll('[data-nav]').forEach(el => {
    if (el.dataset.nav === activePage) el.classList.add('active');
  });
}

// Hero carousel (home only)
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
if (slides.length && dots.length) {
  let current = 0;
  const goTo = (i) => {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = i;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  };
  dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.i)));
  setInterval(() => goTo((current + 1) % slides.length), 4000);
}

// Vehicle selection (home only)
const addVehicleModal = document.getElementById('addVehicleModal');
document.querySelectorAll('.v-card').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('.v-card').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to save a vehicle');
      window.location.href = 'login.html';
      return;
    }
    
    if (addVehicleModal) {
      document.getElementById('vehicleType').value = c.dataset.type;
      addVehicleModal.style.display = 'flex';
    }
  });
});

if (addVehicleModal) {
  document.getElementById('cancelVehicleBtn').addEventListener('click', () => {
    addVehicleModal.style.display = 'none';
  });

  document.getElementById('saveVehicleBtn').addEventListener('click', async () => {
    const type = document.getElementById('vehicleType').value;
    const name = document.getElementById('vehicleName').value;
    const plate = document.getElementById('vehiclePlate').value;
    const color = document.getElementById('vehicleColor').value;
    const isPrimary = document.getElementById('vehiclePrimary').checked;

    if (!name || !plate || !color) return alert('Please fill all fields');

    try {
      const res = await fetch('/api/v1/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, name, plate, color, isPrimary })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Vehicle saved to garage!');
        addVehicleModal.style.display = 'none';
        document.getElementById('vehicleName').value = '';
        document.getElementById('vehiclePlate').value = '';
        document.getElementById('vehicleColor').value = '';
        document.getElementById('vehiclePrimary').checked = false;
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle');
    }
  });
}

// Services Page Logic
const servicesGrid = document.getElementById('servicesGrid');
if (servicesGrid) {
  let selectedServiceId = null;
  let allServicesList = [];

  async function loadServices() {
    try {
      const res = await fetch('/api/v1/services');
      const data = await res.json();
      if (res.ok && data.data) {
        allServicesList = data.data;
        localStorage.setItem('mock_services', JSON.stringify(data.data));

        servicesGrid.innerHTML = data.data.map(s => `
          <div class="service-card" data-id="${s._id}" data-price="${s.price}" data-title="${s.title}">
            <div class="service-icon" style="background:#dbeafe;color:#2563eb"><i class="fa-solid fa-droplet"></i></div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <ul>
              <li><i class="fa-solid fa-check"></i> Duration: ${s.duration} mins</li>
            </ul>
            <div class="service-footer">
              <span class="service-price">₹${s.price}</span>
              <button class="book-btn" data-id="${s._id}" data-price="${s.price}">Book Now</button>
            </div>
          </div>
        `).join('');

        // Attach listeners
        document.querySelectorAll('.service-card').forEach(c => {
          c.addEventListener('click', () => {
            document.querySelectorAll('.service-card').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
          });
          c.style.cursor = 'pointer';
        });

        document.querySelectorAll('.book-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent card click
            const token = localStorage.getItem('token');
            if (!token) {
              window.location.href = 'login.html';
              return;
            }
            selectedServiceId = btn.dataset.id;
            const priceVal = Number(btn.dataset.price);
            if (!isNaN(priceVal) && priceVal > 0) {
              basePrice = priceVal;
              finalPrice = basePrice;
              if (finalPriceDisplay) finalPriceDisplay.textContent = '₹' + finalPrice;
            }
            document.getElementById('bookingModal').style.display = 'flex';
          });
        });
      }
    } catch(err) { console.error('Failed to load services', err); }
  }

  loadServices();

  const bookingModal = document.getElementById('bookingModal');
  const cancelBtn = document.getElementById('cancelBookingBtn');
  const proceedToPayBtn = document.getElementById('proceedToPayBtn');
  const paymentModal = document.getElementById('paymentModal');
  const cancelPayBtn = document.getElementById('cancelPayBtn');
  const confirmPayBtn = document.getElementById('confirmPayBtn');
  const dateInput = document.getElementById('bookingDate');
  const timeSelect = document.getElementById('bookingTime');
  const promoInput = document.getElementById('promoCode');
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  const finalPriceDisplay = document.getElementById('finalPriceDisplay');
  const autoDiscountNotice = document.getElementById('autoDiscountNotice');
  
  let basePrice = 0;
  let finalPrice = 0;
  let discountApplied = false;

  if (bookingModal) {
    const d = new Date();
    const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    dateInput.min = today;

    // Smart Slots: Disable already booked slots for the selected date
    dateInput.addEventListener('change', () => {
      const selectedDate = dateInput.value;
      const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
      const bookedSlots = bookings.filter(b => b.bookingDate === selectedDate && b.status !== 'Cancelled').map(b => b.bookingTime);
      
      Array.from(timeSelect.options).forEach(opt => {
        if (!opt.value) return; // skip "Select a time" placeholder
        if (bookedSlots.includes(opt.value)) {
          opt.disabled = true;
          opt.textContent = opt.value + " (Booked)";
        } else {
          opt.disabled = false;
          const isAm = parseInt(opt.value, 10) < 12;
          let hour = parseInt(opt.value, 10);
          if (hour > 12) hour -= 12;
          opt.textContent = `${String(hour).padStart(2,'0')}:00 ${isAm ? 'AM' : 'PM'}`;
        }
      });
      timeSelect.value = ""; // reset
    });

    // Reset modal on open
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === 'style' && bookingModal.style.display === 'flex') {
          // Resolve service from memory list, localStorage, or DOM element
          let s = allServicesList.find(x => String(x._id) === String(selectedServiceId));
          if (!s) {
            const cachedServices = JSON.parse(localStorage.getItem('mock_services') || '[]');
            s = cachedServices.find(x => String(x._id) === String(selectedServiceId));
          }

          if (s && s.price !== undefined) {
            basePrice = Number(s.price);
          } else {
            const cardEl = document.querySelector(`.service-card[data-id="${selectedServiceId}"]`);
            if (cardEl && cardEl.dataset.price) {
              basePrice = Number(cardEl.dataset.price);
            }
          }

          finalPrice = basePrice;
          
          // Zero-Friction Auto-Discounts (User Scoped)
          const currUser = JSON.parse(localStorage.getItem('mock_user') || localStorage.getItem('user') || '{}');
          const currEmail = (currUser.email || '').toLowerCase();
          const currId = currUser._id || currUser.id;

          const bookings = JSON.parse(localStorage.getItem('mock_bookings') || '[]');
          const userBookings = bookings.filter(b => 
            (b.userEmail && b.userEmail.toLowerCase() === currEmail) || 
            (b.userId && (b.userId === currId || b.userId === currUser.id)) ||
            (b.customerId && b.customerId.email && b.customerId.email.toLowerCase() === currEmail) ||
            (b.customerId && (b.customerId._id === currId || b.customerId === currId))
          );

          const nonCancelledBookings = userBookings.filter(b => b.status !== 'Cancelled');
          const completedWashes = userBookings.filter(b => b.status === 'Completed').length;
          
          discountApplied = false;
          if (autoDiscountNotice) autoDiscountNotice.style.display = 'none';
          
          if (nonCancelledBookings.length === 0 && basePrice > 0) {
            // First-Time User (only on their very first booking)
            finalPrice = Math.round(basePrice * 0.8);
            discountApplied = true;
            if (autoDiscountNotice) {
              autoDiscountNotice.style.display = 'block';
              autoDiscountNotice.style.backgroundColor = '#d1fae5';
              autoDiscountNotice.style.color = '#065f46';
              autoDiscountNotice.innerHTML = `🎉 20% First-Time User Discount Auto-Applied!`;
            }
          } else if (completedWashes > 0 && (completedWashes + 1) % 5 === 0 && basePrice > 0) {
            // Loyalty Reward on every 5th wash
            finalPrice = Math.round(basePrice * 0.8);
            discountApplied = true;
            if (autoDiscountNotice) {
              autoDiscountNotice.style.display = 'block';
              autoDiscountNotice.style.backgroundColor = '#fef3c7';
              autoDiscountNotice.style.color = '#92400e';
              autoDiscountNotice.innerHTML = `⭐ 5th Wash Loyalty Reward Auto-Applied! 20% Off.`;
            }
          }
          finalPriceDisplay.textContent = '₹' + finalPrice;

          // Populate Available Offers
          const availableOffersContainer = document.getElementById('availableOffersContainer');
          const availableOffersList = document.getElementById('availableOffersList');
          if (availableOffersContainer && availableOffersList) {
            const offers = JSON.parse(localStorage.getItem('mock_offers') || '[]');
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const activeOffers = offers.filter(o => {
              if (o.start && today < new Date(o.start)) return false;
              if (o.end && today > new Date(o.end)) return false;
              return true;
            });

            if (activeOffers.length > 0) {
              availableOffersContainer.style.display = 'flex';
              availableOffersList.innerHTML = activeOffers.map(o => `
                <div>• Use code <strong>${o.code}</strong> for ${o.type}</div>
              `).join('');
              
              // Also render Promo Suggestion Chips
              const promoChipsContainer = document.getElementById('promoChipsContainer');
              if (promoChipsContainer) {
                promoChipsContainer.innerHTML = activeOffers.map(o => `
                  <div class="promo-chip" data-code="${o.code}" style="padding:6px 12px; background:#e0e7ff; color:#3730a3; border-radius:16px; font-size:12px; font-weight:600; cursor:pointer;">
                    ${o.code}
                  </div>
                `).join('');
                
                // Add click listener to chips
                document.querySelectorAll('.promo-chip').forEach(chip => {
                  chip.addEventListener('click', () => {
                    document.getElementById('promoCode').value = chip.dataset.code;
                    document.getElementById('applyPromoBtn').click();
                  });
                });
              }
            } else {
              availableOffersContainer.style.display = 'none';
              const promoChipsContainer = document.getElementById('promoChipsContainer');
              if (promoChipsContainer) promoChipsContainer.innerHTML = '';
            }
          }
        }
      });
    });
    observer.observe(bookingModal, { attributes: true });

    // Payment Tabs Logic
    document.querySelectorAll('.pay-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.pay-tab').forEach(t => {
          t.classList.remove('active');
          t.style.borderBottomColor = 'transparent';
          t.style.color = '#6b7280';
        });
        e.target.classList.add('active');
        e.target.style.borderBottomColor = '#635bff';
        e.target.style.color = '#635bff';

        document.querySelectorAll('.pay-tab-content').forEach(c => {
          c.style.display = 'none';
          c.classList.remove('active');
        });
        const targetTab = document.getElementById('tab-' + e.target.dataset.tab);
        if (targetTab) {
          targetTab.style.display = 'flex';
          targetTab.classList.add('active');
        }
      });
    });

    // Promo Code Logic
    applyPromoBtn.addEventListener('click', () => {
      if (discountApplied) return alert("A discount is already applied!");
      const enteredCode = promoInput.value.toUpperCase();
      
      const offers = JSON.parse(localStorage.getItem('mock_offers') || '[]');
      // Fallback in case admin hasn't opened Offers tab yet to initialize
      if (offers.length === 0) {
        offers.push({ _id: 'o1', code: 'CLEAN20', discount: 20, isPercentage: false });
      }
      
      const offer = offers.find(o => o.code === enteredCode);
      
      if (offer) {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (offer.start) {
          const start = new Date(offer.start);
          if (today < start) return alert("This promo code is not active yet!");
        }
        if (offer.end) {
          const end = new Date(offer.end);
          if (today > end) return alert("This promo code has expired!");
        }
        
        if (offer.isPercentage) {
          finalPrice = basePrice - (basePrice * (offer.discount / 100));
        } else {
          finalPrice = Math.max(0, basePrice - offer.discount);
        }
        
        finalPriceDisplay.textContent = '₹' + finalPrice;
        discountApplied = true;
        if (autoDiscountNotice) {
          autoDiscountNotice.style.display = 'block';
          autoDiscountNotice.style.backgroundColor = '#e0e7ff';
          autoDiscountNotice.style.color = '#3730a3';
          autoDiscountNotice.innerHTML = `<i class="fa-solid fa-tag"></i> Promo ${offer.code} applied!`;
        }
      } else {
        alert("Invalid promo code");
      }
    });

    cancelBtn.addEventListener('click', () => {
      bookingModal.style.display = 'none';
      selectedServiceId = null;
    });

    const updatePaymentDisplay = () => {
      const mode = document.querySelector('input[name="paymentMode"]:checked').value;
      let advance = 0;
      let balance = 0;
      if (mode === 'token') {
        advance = Math.min(100, finalPrice);
        balance = finalPrice - advance;
      } else {
        advance = finalPrice;
        balance = 0;
      }
      document.getElementById('payTotalDisplay').textContent = '₹' + finalPrice;
      document.getElementById('payAmountDisplay').textContent = '₹' + advance;
      document.getElementById('payBalanceDisplay').textContent = '₹' + balance;
    };

    document.querySelectorAll('input[name="paymentMode"]').forEach(radio => {
      radio.addEventListener('change', updatePaymentDisplay);
    });

    proceedToPayBtn.addEventListener('click', () => {
      const date = dateInput.value;
      const time = timeSelect.value;
      if (!date || !time) return alert('Please select a date and time');
      
      bookingModal.style.display = 'none';
      updatePaymentDisplay();
      paymentModal.style.display = 'flex';
    });

    cancelPayBtn.addEventListener('click', () => {
      paymentModal.style.display = 'none';
      bookingModal.style.display = 'flex'; // go back
    });

    confirmPayBtn.addEventListener('click', async () => {
      const date = dateInput.value;
      const time = timeSelect.value;
      const token = localStorage.getItem('token') || 'mock';
      
      const mode = document.querySelector('input[name="paymentMode"]:checked').value;
      let advance = mode === 'token' ? Math.min(100, finalPrice) : finalPrice;
      let balance = finalPrice - advance;
      let status = balance > 0 ? 'Partial - Advance Paid' : 'Fully Paid';

      confirmPayBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;
      
      try {
        const res = await fetch('/api/v1/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceId: selectedServiceId,
            bookingDate: date,
            bookingTime: time,
            price: finalPrice,
            advancePaid: advance,
            balanceDue: balance,
            paymentStatus: status
          })
        });
        const data = await res.json();
        if (res.ok) {
          setTimeout(() => {
            alert('Payment Successful! Booking confirmed.');
            paymentModal.style.display = 'none';
            confirmPayBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pay & Book`;
            window.location.href = 'history.html';
          }, 1000);
        } else {
          alert('Error: ' + data.error);
          confirmPayBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pay & Book`;
        }
      } catch(err) {
        console.error(err);
        alert('Booking failed');
        confirmPayBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Pay & Book`;
      }
    });
  }
}

// Wash cards (home only)
const washes = [
  { name: 'Mycarwash Downtown', img: 'assets/car1-DnydQkoI.jpg', km: '2.3 km', rating: '4.8', reviews: 245, time: '8:00 AM - 8:00 PM', price: '₹150 - ₹500' },
  { name: 'Mycarwash Uptown', img: 'assets/car2-Byaux8S_.jpg', km: '3.7 km', rating: '4.9', reviews: 312, time: '7:00 AM - 9:00 PM', price: '₹200 - ₹750' },
  { name: 'Mycarwash Westside', img: 'assets/car3-BoRTYY8t.jpg', km: '5.1 km', rating: '4.7', reviews: 189, time: '8:00 AM - 7:00 PM', price: '₹120 - ₹400' },
  { name: 'Mycarwash NorthWest', img: 'assets/car1-DnydQkoI.jpg', km: '5.3 km', rating: '4.8', reviews: 245, time: '8:00 AM - 6:00 PM', price: '₹350 - ₹800' },
];

function cardHTML(w) {
  return `
    <div class="card">
      <div class="card-img">
        <img src="${w.img}" alt="${w.name}" />
        <span class="km-badge"><i class="fa-solid fa-location-arrow"></i> ${w.km}</span>
        <span class="rating"><i class="fa-solid fa-star"></i>${w.rating} (${w.reviews})</span>
      </div>
      <div class="card-body">
        <h3>${w.name}</h3>
        <div class="time"><i class="fa-regular fa-clock"></i> ${w.time}</div>
        <div class="price-row">
          <div>
            <div class="price-range">Price Range</div>
            <div class="price">${w.price}</div>
          </div>
          <button class="book-now">Book Now</button>
        </div>
      </div>
    </div>
  `;
}

['near', 'popular', 'suggested'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = washes.map(cardHTML).join('');
});

// Attach redirect to book-now buttons
document.querySelectorAll('.book-now').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = 'services.html';
  });
});

document.querySelectorAll('.c-arrow').forEach(btn => {
  btn.addEventListener('click', () => {
    const el = document.getElementById(btn.dataset.target);
    if (el) el.scrollBy({ left: btn.classList.contains('right') ? 340 : -340, behavior: 'smooth' });
  });
});

// History tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.history-item').forEach(item => {
      item.style.display = (tab === 'all' || item.dataset.status === tab) ? '' : 'none';
    });
  });
});

// History Page Logic
if (document.body.dataset.page === 'history') {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
  } else {
    fetch('/api/v1/bookings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject('Failed to load bookings'))
    .then(data => {
      const historyList = document.getElementById('historyList');
      if (historyList) {
        if (!data.data || data.data.length === 0) {
          historyList.innerHTML = '<p class="muted" style="padding: 16px;">No bookings found.</p>';
          return;
        }

        const services = JSON.parse(localStorage.getItem('mock_services') || '[]');

        historyList.innerHTML = data.data.map(b => {
          const statusLower = (b.status || 'Pending').toLowerCase();
          const d = b.bookingDate ? new Date(b.bookingDate) : new Date();
          const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : (b.bookingDate || 'N/A');
          const timeStr = b.bookingTime || 'N/A';
          
          let title = 'Car Wash Service';
          if (b.serviceId && typeof b.serviceId === 'object' && b.serviceId.title) {
            title = b.serviceId.title;
          } else if (typeof b.serviceId === 'string') {
            const matchS = services.find(s => s._id === b.serviceId);
            if (matchS) title = matchS.title;
          }

          const price = b.price !== undefined ? b.price : (b.serviceId && b.serviceId.price ? b.serviceId.price : 0);
          const advancePaid = b.advancePaid || 0;
          const balanceDue = b.balanceDue || 0;
          const paymentStatus = b.paymentStatus || 'N/A';
          const settledAt = b.settledAt ? new Date(b.settledAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A';
          
          let trackerHtml = '';
          const statusSteps = ['Pending', 'In Progress', 'Washing', 'Polishing', 'Ready for Pickup', 'Completed'];
          const currentStepIndex = statusSteps.findIndex(s => s.toLowerCase() === statusLower);
          if (statusLower !== 'cancelled') {
            trackerHtml = `
              <div class="status-tracker">
                ${statusSteps.map((step, idx) => `
                  <div class="step ${idx <= currentStepIndex ? 'active' : ''}">
                    <div class="step-dot"></div>
                    <div class="step-label">${step}</div>
                  </div>
                `).join('')}
              </div>
            `;
          }

          let btn = '';
          btn += `<button class="book-btn ghost print-receipt-btn" data-id="${b._id}" style="margin-right:8px;"><i class="fa-solid fa-print"></i> Receipt</button>`;
          if (statusLower === 'upcoming' || statusLower === 'pending') {
            btn += `<button class="book-btn ghost cancel-booking-btn" data-id="${b._id}">Cancel</button>`;
          } else {
            btn += `<button class="book-btn" onclick="window.location.href='services.html'">Book Again</button>`;
          }

          // Trigger toast if ready for pickup
          if (statusLower === 'ready for pickup') {
            setTimeout(() => showToast(`Your car for booking ${dateStr} is Ready for Pickup!`), 500);
          }

          let printHeaderHtml = '';
          let printBreakdownHtml = '';
          
          if (paymentStatus === 'Partial - Advance Paid') {
            printHeaderHtml = `
              <div class="print-only" style="display:none; text-align:center; padding:12px; border:2px dashed #b45309; color:#b45309; font-weight:800; font-size:18px; margin-bottom:16px; background:#fef3c7; border-radius:8px;">
                PARTIAL - DEPOSIT PAID
              </div>
            `;
            printBreakdownHtml = `
              <div class="print-only" style="display:none; margin-top:16px; padding:16px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Total Package Cost:</span> <strong>₹${price}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#b45309;"><span>Advance Deposit Paid:</span> <strong>₹${advancePaid}</strong></div>
                <hr style="border:none; border-top:1px solid #d1d5db; margin:8px 0;" />
                <div style="display:flex; justify-content:space-between; font-size:16px; color:#991b1b;"><span>Outstanding Balance Due at Station:</span> <strong>₹${balanceDue}</strong></div>
              </div>
            `;
          } else if (paymentStatus === 'Fully Paid') {
            printHeaderHtml = `
              <div class="print-only" style="display:none; text-align:center; padding:12px; border:2px dashed #065f46; color:#065f46; font-weight:800; font-size:18px; margin-bottom:16px; background:#d1fae5; border-radius:8px;">
                FINAL TAX INVOICE - PAID IN FULL
              </div>
            `;
            printBreakdownHtml = `
              <div class="print-only" style="display:none; margin-top:16px; padding:16px; border:1px solid #e5e7eb; border-radius:8px; background:#f9fafb;">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Total Package Cost:</span> <strong>₹${price}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Advance Paid:</span> <strong>₹${advancePaid > 0 ? advancePaid : price}</strong></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span>Balance Settled (${settledAt}):</span> <strong>₹${balanceDue === 0 && advancePaid < price ? price - advancePaid : 0}</strong></div>
                <hr style="border:none; border-top:1px solid #d1d5db; margin:8px 0;" />
                <div style="display:flex; justify-content:space-between; font-size:16px; color:#065f46;"><span>Total Paid:</span> <strong>₹${price}</strong></div>
              </div>
            `;
          }

          return `
            <div class="history-item printable-item" id="print_${b._id}" data-status="${statusLower === 'pending' ? 'upcoming' : statusLower}">
              <img src="assets/car1-DnydQkoI.jpg" alt="wash" class="hide-print" />
              <div class="hi-body" style="width:100%">
                <div class="hi-top">
                  <h3>Mycarwash Outlet</h3>
                  <span class="status ${statusLower === 'pending' ? 'upcoming' : (statusLower === 'ready for pickup' ? 'ready' : statusLower)} hide-print">${b.status}</span>
                </div>
                
                ${printHeaderHtml}
                
                <p class="hi-meta"><i class="fa-solid fa-droplet hide-print"></i> <strong>Service:</strong> ${title}</p>
                <p class="hi-meta"><i class="fa-regular fa-calendar hide-print"></i> <strong>Date:</strong> ${dateStr} · ${timeStr}</p>
                <p class="hi-meta print-only" style="display:none;"><strong>Booking ID:</strong> ${b._id}</p>
                
                ${trackerHtml}
                
                ${printBreakdownHtml}
                
                <div class="hi-footer hide-print">
                  <span class="hi-price">
                    <strong>${paymentStatus === 'Partial - Advance Paid' ? 'Deposit Paid' : 'Total Paid'}:</strong> 
                    ₹${paymentStatus === 'Partial - Advance Paid' ? advancePaid : price}
                  </span>
                  <div class="action-btns">
                    ${btn}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');

        document.querySelectorAll('.cancel-booking-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (!confirm('Are you sure you want to cancel this booking?')) return;
            try {
              const cancelRes = await fetch(`/api/v1/bookings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'Cancelled' })
              });
              if (cancelRes.ok) {
                alert('Booking cancelled successfully');
                window.location.reload();
              } else {
                const cancelData = await cancelRes.json();
                alert('Error: ' + cancelData.error);
              }
            } catch (err) {
              console.error(err);
              alert('Failed to cancel booking');
            }
          });
        });

        // Print Receipt logic
        document.querySelectorAll('.print-receipt-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            const item = document.getElementById('print_' + id);
            
            // Add a print-active class to the body
            document.body.classList.add('print-mode');
            // Hide all other history items
            document.querySelectorAll('.history-item').forEach(hi => {
              if (hi.id !== 'print_' + id) hi.classList.add('no-print');
            });
            
            window.print();
            
            // Revert
            document.body.classList.remove('print-mode');
            document.querySelectorAll('.history-item').forEach(hi => hi.classList.remove('no-print'));
          });
        });
      }
    })
    .catch(console.error);
  }
}

// Global Toast logic
function showToast(msg) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Auth tabs
document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.auth;
    document.getElementById('signinForm')?.classList.toggle('hidden', target !== 'signin');
    document.getElementById('signupForm')?.classList.toggle('hidden', target !== 'signup');
  });
});

const signinForm = document.getElementById('signinForm');
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('mock_user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        alert('Login successful');
        if (data.user && data.user.role === 'Admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Login failed');
    }
  });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const phone = document.getElementById('signupPhone').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        if (data.user) {
          localStorage.setItem('mock_user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        alert('Registration successful');
        window.location.href = 'index.html';
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Registration failed');
    }
  });
}

// Profile Page Logic
if (document.body.dataset.page === 'profile') {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
  } else {
    // Fetch User Info
    fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject('Not authorized'))
    .then(data => {
      if (data.data) {
        document.getElementById('profileName').textContent = data.data.name;
        document.getElementById('profileEmail').textContent = data.data.email;
        document.getElementById('profilePhone').textContent = data.data.phone;
        document.getElementById('profileRole').textContent = data.data.role;
      }
    })
    .catch(err => {
      console.error(err);
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });

    // Fetch Stats
    fetch('/api/v1/auth/me/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch stats'))
    .then(data => {
      if (data.data) {
        document.getElementById('statWashes').textContent = data.data.totalWashes;
        document.getElementById('statSpent').textContent = '₹' + data.data.totalSpent;
        document.getElementById('statCars').textContent = data.data.savedCars;
        document.getElementById('statPoints').textContent = data.data.rewardPoints;
      }
    })
    .catch(console.error);

    // Fetch Vehicles
    fetch('/api/v1/vehicles', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch vehicles'))
    .then(data => {
      if (data.data) {
        const list = document.getElementById('vehiclesList');
        if (data.data.length === 0) {
          list.innerHTML = '<p class="muted" style="padding: 16px;">No vehicles saved yet. Go to Home to add one!</p>';
        } else {
          list.innerHTML = data.data.map(v => `
            <div class="vehicle-item">
              <i class="fa-solid ${v.type === 'bike' ? 'fa-motorcycle' : (v.type === 'heavy' ? 'fa-truck' : 'fa-car')}"></i>
              <div>
                <div class="vh-title">${v.name}</div>
                <div class="muted">${v.plate} · ${v.color}</div>
              </div>
              ${v.isPrimary ? '<span class="chip">Primary</span>' : ''}
            </div>
          `).join('');
        }
      }
    })
    .catch(console.error);
  }

  const signOutBtn = document.getElementById('profileSignOut');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });
    signOutBtn.style.cursor = 'pointer';
  }

  // Edit Profile Logic
  const editBtn = document.getElementById('editProfile');
  const editModal = document.getElementById('editProfileModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');

  if (editBtn && editModal) {
    editBtn.addEventListener('click', () => {
      document.getElementById('editName').value = document.getElementById('profileName').textContent;
      document.getElementById('editEmail').value = document.getElementById('profileEmail').textContent;
      document.getElementById('editPhone').value = document.getElementById('profilePhone').textContent;
      document.getElementById('editCurrentPassword').value = '';
      document.getElementById('editNewPassword').value = '';
      editModal.style.display = 'flex';
    });

    cancelEditBtn.addEventListener('click', () => {
      editModal.style.display = 'none';
    });

    saveEditBtn.addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value
      };
      
      const currentPassword = document.getElementById('editCurrentPassword').value;
      const newPassword = document.getElementById('editNewPassword').value;

      if (newPassword) {
        if (!currentPassword) return alert('Please enter your current password to change it.');
        payload.currentPassword = currentPassword;
        payload.password = newPassword;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
          alert('Profile updated successfully');
          if (data.token) localStorage.setItem('token', data.token);
          editModal.style.display = 'none';
          window.location.reload();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to update profile');
      }
    });
  }
}

// Password Toggle Logic
document.querySelectorAll('.toggle-password').forEach(button => {
  button.addEventListener('click', () => {
    const input = button.previousElementSibling;
    const icon = button.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });
});
