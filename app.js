// Karmic Canteen - Vanilla JS SPA

// ===== Config =====
// Weekly schedule (South Indian focus). Edit as needed.
const SCHEDULE = {
  Monday: {
    breakfast: { name: "Dosa", desc: "Crispy dosa with chutney & sambar", calories: 420 },
    lunch: { name: "Sambar Rice", desc: "Rice with vegetable sambar", calories: 520 },
    dinner: { name: "Idli", desc: "Soft idlis with chutney & sambar", calories: 380 },
  },
  Tuesday: {
    breakfast: { name: "Upma", desc: "Semolina upma with veggies", calories: 360 },
    lunch: { name: "Curd Rice", desc: "Tempered curd rice", calories: 450 },
    dinner: { name: "Lemon Rice", desc: "Zesty lemon rice with peanuts", calories: 500 },
  },
  Wednesday: {
    breakfast: { name: "Pongal", desc: "Ven pongal with ghee & pepper", calories: 520 },
    lunch: { name: "Rasam Rice", desc: "Peppery rasam with rice", calories: 440 },
    dinner: { name: "Uttapam", desc: "Onion-tomato uttapam", calories: 560 },
  },
  Thursday: {
    breakfast: { name: "Pesarattu", desc: "Moong dal dosa with chutney", calories: 430 },
    lunch: { name: "Veg Thali", desc: "Rice, sambar, poriyal, curd", calories: 680 },
    dinner: { name: "Chapati & Kurma", desc: "Wheat chapati with veg kurma", calories: 600 },
  },
  Friday: {
    breakfast: { name: "Poha", desc: "Flattened rice with peanuts", calories: 390 },
    lunch: { name: "Bisibele Bath", desc: "Lentil-rice hot pot", calories: 640 },
    dinner: { name: "Tomato Rice", desc: "Spiced tomato rice", calories: 520 },
  },
  Saturday: {
    breakfast: { name: "Rava Dosa", desc: "Semolina dosa, lacy & crisp", calories: 500 },
    lunch: { name: "Curd Rice", desc: "Comfort classic", calories: 450 },
    dinner: { name: "Idiyappam", desc: "String hoppers with stew", calories: 560 },
  },
  Sunday: {
    breakfast: { name: "Medu Vada", desc: "Crisp lentil donuts", calories: 480 },
    lunch: { name: "Lemon Rice", desc: "Zesty lemon rice", calories: 500 },
    dinner: { name: "Masala Dosa", desc: "Classic with potato masala", calories: 620 },
  },
};

// Per-meal deadlines and cancel windows
const DEADLINES = {
  breakfast: { orderCutoff: "09:00", cancelWindowMin: 10 },
  lunch: { orderCutoff: "12:00", cancelWindowMin: 15 },
  dinner: { orderCutoff: "19:00", cancelWindowMin: 20 },
};

 

// ===== Utilities =====
const qs = (sel, el=document) => el.querySelector(sel);
const ce = (tag, props={}) => Object.assign(document.createElement(tag), props);
const fmtTime = ms => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const daysSinceEpoch = () => Math.floor(Date.now() / 86400000);
const weekdayName = (d = new Date()) => d.toLocaleDateString(undefined, { weekday: 'long' });
const todaySchedule = () => SCHEDULE[weekdayName()] || SCHEDULE.Monday;
const todayAt = (hhmm) => {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return +d;
};
const clampCancelUntil = (placedAt, meal) => placedAt + DEADLINES[meal].cancelWindowMin * 60000;

// Storage helpers
const storage = {
  get(key, def=null) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },
  del(key) { localStorage.removeItem(key); }
};

// Session helpers
const sessionKey = 'kc_session';
const getSession = () => storage.get(sessionKey);
const setSession = (s) => storage.set(sessionKey, s);
const clearSession = () => storage.del(sessionKey);

// Orders helpers
const ordersKey = 'kc_orders_v2';
const loadOrders = () => storage.get(ordersKey, {});
const saveOrders = (o) => storage.set(ordersKey, o);
const orderId = (employeeId, dateKey, meal) => `${employeeId}__${dateKey}__${meal}`;
const isFinalized = (o) => Date.now() > o.cancelUntil;

// Events, Reports, Feedback
const EVENTS_KEY = 'kc_events_v1';
const REPORTS_KEY = 'kc_reports_v1';
const FEEDBACK_KEY = 'kc_feedback_v1';
const loadEvents = () => storage.get(EVENTS_KEY, []);
const saveEvents = (arr) => storage.set(EVENTS_KEY, arr);
function pushEvent(evt) { const all = loadEvents(); all.push({ id: Date.now()+"_"+Math.random().toString(36).slice(2), ts: Date.now(), ...evt }); saveEvents(all); }
const loadReports = () => storage.get(REPORTS_KEY, {});
const saveReports = (r) => storage.set(REPORTS_KEY, r);
const loadFeedback = () => storage.get(FEEDBACK_KEY, {});
const saveFeedback = (f) => storage.set(FEEDBACK_KEY, f);
const feedbackId = (employeeId, dateKey, meal) => `${employeeId}__${dateKey}__${meal}`;

// Router (hash-based)
const routes = {};
function route(path, render) { routes[path] = render; }
function navigate(path) { if (location.hash !== `#${path}`) location.hash = `#${path}`; render(); }
window.addEventListener('hashchange', render);

function requireAuth(nextPath) {
  const s = getSession();
  if (!s) {
    navigate('/login');
    return false;
  }
  if (nextPath) navigate(nextPath);
  return true;
}

function header() {
  const s = getSession();
  const h = ce('div', { className: 'header' });
  const brand = ce('div', { className: 'brand', innerText: 'Karmic Canteen' });
  const nav = ce('div', { className: 'nav' });

  const aHome = ce('a', { href: '#/', innerText: 'Home' });
  const aMenu = ce('a', { href: '#/menu', innerText: 'Menu' });
  const aReports = ce('a', { href: '#/reports', innerText: 'Reports' });
  const aChef = ce('a', { href: '#/chef-dashboard', innerText: 'Chef' });
  const aFeedback = ce('a', { href: '#/feedback', innerText: 'Feedback' });
  nav.append(aHome, aMenu, aReports, aChef, aFeedback);

  if (s) {
    const welcome = ce('span', { className: 'badge', innerText: s.name ? `Hi, ${s.name}` : `ID: ${s.employeeId}` });
    const logout = ce('button', { className: 'btn ghost', innerText: 'Logout' });
    logout.onclick = () => { clearSession(); navigate('/'); };
    const right = ce('div', { className: 'row' });
    right.append(welcome, logout);
    h.append(brand, right);
  } else {
    h.append(brand, nav);
  }
  return h;
}

// Pages
route('/', () => {
  const c = ce('div', { className: 'container' });
  c.append(header());

  const p1 = ce('div', { className: 'panel' });
  p1.append(ce('h2', { innerText: 'Welcome to Karmic Canteen' }));
  p1.append(ce('p', { className: 'muted', innerText: 'Breakfast, Lunch and Dinner • South Indian weekly schedule' }));
  const go = ce('button', { className: 'btn primary', innerText: 'Employees Login' });
  go.onclick = () => navigate('/login');
  p1.append(go);

  const p2 = ce('div', { className: 'panel' });
  const titleRow = ce('div', { className: 'row' });
  titleRow.append(ce('h3', { innerText: `Specials` }));
  titleRow.append(ce('div', { className: 'spacer' }));
  const daySel = ce('select', { className: 'input', style: 'max-width:200px' });
  const days = Object.keys(SCHEDULE);
  days.forEach(d => daySel.append(ce('option', { value: d, innerText: d })));
  daySel.value = weekdayName();
  titleRow.append(daySel);
  p2.append(titleRow);

  const list = ce('div', { className: 'grid two' });
  function renderDay(name) {
    const sched = SCHEDULE[name] || todaySchedule();
    list.innerHTML = '';
    ["breakfast","lunch","dinner"].forEach(meal => {
      const d = sched[meal];
      const card = ce('div', { className: 'card' });
      card.append(ce('h4', { innerText: meal[0].toUpperCase() + meal.slice(1) }));
      card.append(ce('div', { className: 'muted', innerText: `${d.name} • ${d.desc}` }));
      list.append(card);
    });
  }
  renderDay(daySel.value);
  daySel.onchange = () => renderDay(daySel.value);
  p2.append(list);

  c.append(p1, p2);
  return c;
});

// Portal route with buttons similar to screenshot
route('/portal', () => {
  if (!requireAuth()) return ce('div');
  const s = getSession();
  const c = ce('div', { className: 'container' });

  const panel = ce('div', { className: 'panel', style: 'max-width:420px; margin: 80px auto 0' });
  panel.append(ce('h2', { innerText: `Welcome, ${s.name || s.employeeId}` }));

  const btns = ce('div', { className: 'grid' });
  const empBtn = ce('button', { className: 'btn primary', innerText: 'Employee Menu' });
  const chefBtn = ce('button', { className: 'btn', innerText: 'Chef Menu' });
  const fbBtn = ce('button', { className: 'btn', innerText: 'Feedback' });
  const logoutBtn = ce('button', { className: 'btn danger', innerText: 'Logout' });
  const resetBtn = ce('button', { className: 'btn', innerText: 'Reset Demo Data' });
  empBtn.onclick = () => navigate('/menu');
  chefBtn.onclick = () => navigate('/chef-dashboard');
  fbBtn.onclick = () => navigate('/feedback');
  logoutBtn.onclick = () => { clearSession(); navigate('/'); };
  resetBtn.onclick = () => { [ordersKey, EVENTS_KEY, REPORTS_KEY, FEEDBACK_KEY].forEach(k => storage.del(k)); location.reload(); };
  btns.append(empBtn, chefBtn, fbBtn, resetBtn, logoutBtn);
  panel.append(btns);
  c.append(panel);
  return c;
});

// Simple Chef Dashboard with counts and Back button
route('/chef-dashboard', () => {
  if (!requireAuth()) return ce('div');
  const c = ce('div', { className: 'container' });

  const panel = ce('div', { className: 'panel', style: 'max-width:420px; margin: 60px auto 0' });
  panel.append(ce('h2', { innerText: 'Chef Dashboard' }));

  const box = ce('div', { className: 'card' });
  const bRow = ce('div', { className: 'row' });
  const lRow = ce('div', { className: 'row' });
  const dRow = ce('div', { className: 'row' });
  const bPrep = ce('div', { className: 'badge' });
  const lPrep = ce('div', { className: 'badge' });
  const dPrep = ce('div', { className: 'badge' });
  bRow.append(ce('div', { innerText: 'Breakfast • To Prepare:' }), ce('div', { className: 'spacer' }), bPrep);
  lRow.append(ce('div', { innerText: 'Lunch • To Prepare:' }), ce('div', { className: 'spacer' }), lPrep);
  dRow.append(ce('div', { innerText: 'Dinner • To Prepare:' }), ce('div', { className: 'spacer' }), dPrep);
  box.append(bRow, lRow, dRow);

  const back = ce('button', { className: 'btn ghost', innerText: 'Back' });
  back.onclick = () => navigate('/portal');

  panel.append(box, ce('div', { style: 'height:12px' }), back);
  c.append(panel);

  function renderCounts() {
    const orders = loadOrders();
    const date = todayKey();
    const placed = { breakfast: 0, lunch: 0, dinner: 0 };
    Object.entries(orders).forEach(([key, o]) => {
      if (!key.includes(`__${date}__`)) return;
      placed[o.meal] = (placed[o.meal] || 0) + 1;
    });
    bPrep.innerText = String(placed.breakfast || 0);
    lPrep.innerText = String(placed.lunch || 0);
    dPrep.innerText = String(placed.dinner || 0);
  }
  renderCounts();
  const t = setInterval(renderCounts, 1000);
  function onStorage(e) { if (e && e.key === ordersKey) renderCounts(); }
  window.addEventListener('storage', onStorage);
  setTimeout(() => {
    window.addEventListener('hashchange', () => { clearInterval(t); window.removeEventListener('storage', onStorage); }, { once: true });
  });

  return c;
});

// Chef page with notifications and daily reports
route('/chef', () => {
  if (!requireAuth()) return ce('div');
  const c = ce('div', { className: 'container' });
  c.append(header());

  const panel = ce('div', { className: 'panel' });
  panel.append(ce('h2', { innerText: 'Chef Dashboard' }));

  // Notifications
  const notifBox = ce('div', { className: 'card' });
  notifBox.append(ce('h3', { innerText: 'Live Notifications (Today)' }));
  const notifList = ce('div');
  notifBox.append(notifList);

  function renderNotifs() {
    const evts = loadEvents().filter(e => e.date === todayKey());
    notifList.innerHTML = '';
    evts.slice(-50).reverse().forEach(e => {
      const row = ce('div', { className: 'row' });
      const title = e.type === 'order_placed' ? 'Order placed' : e.type === 'order_cancelled' ? 'Order cancelled' : 'Event';
      row.append(ce('div', { innerText: `${title}: ${e.meal} • ${e.dish} • ID ${e.employeeId}` }));
      row.append(ce('div', { className: 'spacer' }));
      row.append(ce('div', { className: 'small', innerText: new Date(e.ts).toLocaleTimeString() }));
      notifList.append(row);
    });
  }
  renderNotifs();
  const notifTimer = setInterval(renderNotifs, 2000);

  // Live counts
  const countsBox = ce('div', { className: 'card' });
  countsBox.append(ce('h3', { innerText: 'Live Order Counts (Today)' }));
  const countsContent = ce('div');
  countsBox.append(countsContent);

  function renderCounts() {
    const orders = loadOrders();
    const date = todayKey();
    const now = Date.now();
    const totals = { breakfast: 0, lunch: 0, dinner: 0 };
    const cancellable = { breakfast: 0, lunch: 0, dinner: 0 };
    const locked = { breakfast: 0, lunch: 0, dinner: 0 };
    const byDish = { breakfast: {}, lunch: {}, dinner: {} };
    Object.entries(orders).forEach(([key, o]) => {
      if (!key.includes(`__${date}__`)) return;
      const meal = o.meal;
      const cutoff = todayAt(DEADLINES[meal].orderCutoff);
      totals[meal]++;
      byDish[meal][o.dish] = (byDish[meal][o.dish] || 0) + 1;
      const isLocked = now > o.cancelUntil || now > cutoff;
      if (isLocked) locked[meal]++; else cancellable[meal]++;
    });
    countsContent.innerHTML = '';
    const overallConfirmed = locked.breakfast + locked.lunch + locked.dinner;
    const overallRow = ce('div', { className: 'row' });
    overallRow.append(ce('div', { innerText: 'Overall Confirmed (Today)' }));
    overallRow.append(ce('div', { className: 'spacer' }));
    overallRow.append(ce('div', { className: 'badge', innerText: String(overallConfirmed) }));
    countsContent.append(overallRow);
    countsContent.append(ce('div', { style: 'height:6px' }));
    ["breakfast","lunch","dinner"].forEach(meal => {
      const row = ce('div', { className: 'row' });
      row.append(ce('div', { innerText: meal[0].toUpperCase()+meal.slice(1) }));
      row.append(ce('div', { className: 'spacer' }));
      row.append(ce('div', { className: 'badge', innerText: `Total: ${totals[meal]}` }));
      row.append(ce('div', { className: 'badge', innerText: `Cancellable: ${cancellable[meal]}` }));
      row.append(ce('div', { className: 'badge', innerText: `Finalized: ${locked[meal]}` }));
      countsContent.append(row);
      const dishes = Object.entries(byDish[meal]).sort((a,b)=>b[1]-a[1]).map(([d,c])=>`${d}: ${c}`).join(', ') || '—';
      countsContent.append(ce('div', { className: 'small', innerText: `Dishes: ${dishes}` }));
    });
  }
  renderCounts();
  const countsTimer = setInterval(renderCounts, 2000);

  // Daily report
  const reportBox = ce('div', { className: 'card' });
  reportBox.append(ce('h3', { innerText: 'Today’s Report' }));
  const repContent = ce('div');
  const genBtn = ce('button', { className: 'btn primary', innerText: 'Generate & Save Report' });
  reportBox.append(repContent, ce('div', { style: 'height:8px' }), genBtn);

  function makeReport() {
    const orders = loadOrders();
    const date = todayKey();
    const totals = { breakfast: 0, lunch: 0, dinner: 0 };
    const byDish = { breakfast: {}, lunch: {}, dinner: {} };
    Object.entries(orders).forEach(([key, o]) => {
      if (!key.includes(`__${date}__`)) return;
      const meal = o.meal;
      const cutoff = todayAt(DEADLINES[meal].orderCutoff);
      if (Date.now() > cutoff || isFinalized(o)) {
        totals[meal]++;
        byDish[meal][o.dish] = (byDish[meal][o.dish] || 0) + 1;
      }
    });
    return { date, totals, byDish };
  }
  function saveReportIfNew(r) {
    const reports = loadReports();
    const id = `${r.date}`;
    reports[id] = r; // overwrite for simplicity
    saveReports(reports);
  }
  function renderReport(r) {
    repContent.innerHTML = '';
    ["breakfast","lunch","dinner"].forEach(meal => {
      const sec = ce('div', { className: 'row' });
      const dishList = Object.entries(r.byDish[meal]).sort((a,b)=>b[1]-a[1]).map(([d,c])=>`${d}: ${c}`).join(', ') || '—';
      sec.append(ce('div', { innerText: meal[0].toUpperCase()+meal.slice(1) }));
      sec.append(ce('div', { className: 'spacer' }));
      sec.append(ce('div', { className: 'badge', innerText: String(r.totals[meal]) }));
      repContent.append(sec);
      repContent.append(ce('div', { className: 'small', innerText: `Dishes: ${dishList}` }));
    });
  }
  function autoReport() {
    // If all meals past cutoff, generate
    const done = ["breakfast","lunch","dinner"].every(m => Date.now() > todayAt(DEADLINES[m].orderCutoff));
    if (done) {
      const r = makeReport();
      saveReportIfNew(r);
      renderReport(r);
    }
  }
  genBtn.onclick = () => { const r = makeReport(); saveReportIfNew(r); renderReport(r); };
  autoReport();
  const repTimer = setInterval(autoReport, 60000);

  panel.append(notifBox, ce('div', { style: 'height:12px' }), countsBox, ce('div', { style: 'height:12px' }), reportBox);
  c.append(panel);

  // cleanup when route changes
  setTimeout(() => {
    window.addEventListener('hashchange', () => { clearInterval(notifTimer); clearInterval(countsTimer); clearInterval(repTimer); }, { once: true });
  });

  return c;
});

// Feedback page: rate and suggest per meal
route('/feedback', () => {
  if (!requireAuth()) return ce('div');
  const s = getSession();
  const date = todayKey();
  const c = ce('div', { className: 'container' });
  c.append(header());

  const p = ce('div', { className: 'panel' });
  p.append(ce('h2', { innerText: 'Meal Feedback' }));
  p.append(ce('div', { className: 'small', innerText: 'Rate today’s meals and leave suggestions.' }));
  const backRow = ce('div', { className: 'row' });
  const backBtn = ce('button', { className: 'btn ghost', innerText: 'Back to Dashboard' });
  backBtn.onclick = () => navigate('/portal');
  backRow.append(backBtn);
  p.append(backRow);

  ["breakfast","lunch","dinner"].forEach(meal => {
    const card = ce('div', { className: 'card' });
    card.append(ce('h3', { innerText: meal[0].toUpperCase()+meal.slice(1) }));
    const row = ce('div', { className: 'row' });
    row.append(ce('div', { innerText: 'Rating:' }));
    const ratingSel = ce('select', { className: 'input', style: 'max-width:120px' });
    ["","1","2","3","4","5"].forEach(v => ratingSel.append(ce('option', { value: v, innerText: v || 'Select' })));
    const ta = ce('textarea', { className: 'input', placeholder: 'Suggestions (optional)', rows: 2 });
    const saveBtn = ce('button', { className: 'btn primary', innerText: 'Submit' });
    row.append(ratingSel, ce('div', { className: 'spacer' }), saveBtn);
    card.append(row);
    card.append(ta);

    // preload if exists
    const fid = feedbackId(s.employeeId, date, meal);
    const all = loadFeedback();
    const cur = all[fid];
    if (cur) { ratingSel.value = String(cur.rating || ''); ta.value = cur.text || ''; }

    saveBtn.onclick = () => {
      const rating = Number(ratingSel.value || 0);
      const text = ta.value.trim();
      if (!rating) { alert('Please select a rating (1-5).'); return; }
      const all = loadFeedback();
      all[fid] = { employeeId: s.employeeId, date, meal, rating, text, ts: Date.now() };
      saveFeedback(all);
      pushEvent({ type: 'feedback', employeeId: s.employeeId, meal, rating, time: Date.now(), date });
      saveBtn.innerText = 'Saved'; setTimeout(()=>saveBtn.innerText='Submit', 1200);
    };

    p.append(card);
  });

  c.append(p);
  return c;
});

route('/login', () => {
  const c = ce('div', { className: 'container' });
  c.append(header());

  const card = ce('div', { className: 'panel' });
  card.append(ce('h2', { innerText: 'Employees Login' }));

  const form = ce('div', { className: 'grid' });

  const idLabel = ce('label', { className: 'label', innerText: 'Employee ID' });
  const idInput = ce('input', { className: 'input', placeholder: 'e.g. E1234' });
  form.append(idLabel, idInput);

  const nameLabel = ce('label', { className: 'label', innerText: 'Name (optional)' });
  const nameInput = ce('input', { className: 'input', placeholder: 'Your name' });
  form.append(nameLabel, nameInput);

  const pinLabel = ce('label', { className: 'label', innerText: 'PIN (demo: 1234)' });
  const pinInput = ce('input', { className: 'input', type: 'password', placeholder: 'PIN' });
  form.append(pinLabel, pinInput);

  const actions = ce('div', { className: 'row' });
  const loginBtn = ce('button', { className: 'btn primary', innerText: 'Login' });
  const cancelBtn = ce('button', { className: 'btn ghost', innerText: 'Back' });
  actions.append(loginBtn, cancelBtn);

  const err = ce('div', { className: 'small', style: 'color: #fca5a5; min-height: 18px;' });

  loginBtn.onclick = () => {
    const id = idInput.value.trim();
    const pin = pinInput.value.trim();
    if (!id) { err.innerText = 'Enter Employee ID'; return; }
    if (pin !== '1234') { err.innerText = 'Invalid PIN (hint: 1234)'; return; }
    setSession({ employeeId: id, name: nameInput.value.trim() });
    navigate('/portal');
  };
  cancelBtn.onclick = () => navigate('/');

  card.append(form, ce('div', { style: 'height:8px' }), err, actions);
  c.append(card);
  return c;
});

function renderMealSection(root, s, meal) {
  const dateKey = todayKey();
  const sched = todaySchedule();
  const dish = sched[meal];
  const cutoffAt = todayAt(DEADLINES[meal].orderCutoff);
  const oid = orderId(s.employeeId, dateKey, meal);

  const orderCard = ce('div', { className: 'card' });
  orderCard.append(ce('h3', { innerText: meal[0].toUpperCase()+meal.slice(1) }));
  const info = ce('div', { className: 'kv' });
  info.append(ce('div', { className: 'key', innerText: 'Dish' }), ce('div', { innerText: dish.name }));
  info.append(ce('div', { className: 'key', innerText: 'Description' }), ce('div', { innerText: dish.desc }));
  info.append(ce('div', { className: 'key', innerText: 'Calories' }), ce('div', { innerText: dish.calories + ' kcal' }));
  info.append(ce('div', { className: 'key', innerText: 'Order cutoff' }), ce('div', { innerText: fmtTime(cutoffAt) }));
  orderCard.append(info);

  const actions = ce('div', { className: 'row' });
  const status = ce('div', { className: 'spacer' });
  const placeBtn = ce('button', { className: 'btn success', innerText: 'Place Order' });
  const cancelBtn = ce('button', { className: 'btn danger', innerText: 'Cancel Order' });
  actions.append(status, placeBtn, cancelBtn);
  orderCard.append(ce('div', { style: 'height: 8px' }));
  orderCard.append(actions);

  const totalBox = ce('div', { className: 'small', style: 'margin-top:8px' });
  orderCard.append(totalBox);

  let timerId = null;
  function updateUI() {
    const now = Date.now();
    const orders = loadOrders();
    const ex = orders[oid];
    const afterCutoff = now > cutoffAt;
    if (ex) {
      placeBtn.disabled = true;
      const remaining = ex.cancelUntil - now;
      if (remaining > 0) {
        cancelBtn.disabled = false;
        const mm = String(Math.floor(remaining / 60000)).padStart(2,'0');
        const ss = String(Math.floor((remaining % 60000)/1000)).padStart(2,'0');
        status.innerText = `Ordered at ${fmtTime(ex.placedAt)} • Cancel within ${mm}:${ss}`;
      } else {
        cancelBtn.disabled = true;
        status.innerText = `Finalized • Ordered at ${fmtTime(ex.placedAt)}`;
        if (timerId) { clearInterval(timerId); timerId = null; }
      }
    } else {
      placeBtn.disabled = afterCutoff;
      cancelBtn.disabled = true;
      status.innerText = afterCutoff ? 'Ordering closed for this meal.' : 'No order placed yet.';
    }

    const myCount = (() => {
      const idPrefix = s.employeeId + "__" + dateKey + "__";
      let n = 0;
      Object.entries(orders).forEach(([key, o]) => { if (key.startsWith(idPrefix)) n++; });
      return n;
    })();
    totalBox.innerText = `Your orders today: ${myCount}`;
  }

  placeBtn.onclick = () => {
    const now = Date.now();
    if (now > cutoffAt) return; // cannot order
    const orders = loadOrders();
    if (orders[oid]) return; // already
    const cancelUntil = clampCancelUntil(now, meal);
    orders[oid] = {
      dish: dish.name,
      meal,
      placedAt: now,
      cancelUntil,
    };
    saveOrders(orders);
    pushEvent({ type: 'order_placed', employeeId: s.employeeId, meal, dish: dish.name, time: now, date: todayKey() });
    updateUI();
  };

  cancelBtn.onclick = () => {
    const orders = loadOrders();
    const ex = orders[oid];
    if (!ex) return;
    if (Date.now() > ex.cancelUntil) return; // window over
    delete orders[oid];
    saveOrders(orders);
    pushEvent({ type: 'order_cancelled', employeeId: s.employeeId, meal, dish: dish.name, time: Date.now(), date: todayKey() });
    updateUI();
  };

  updateUI();
  timerId = setInterval(updateUI, 1000);

  root.append(orderCard);
}

route('/menu', () => {
  if (!requireAuth()) return ce('div');
  const s = getSession();

  const c = ce('div', { className: 'container' });
  c.append(header());

  const p = ce('div', { className: 'panel' });
  p.append(ce('h2', { innerText: 'Today\'s Menu' }));
  const backRow = ce('div', { className: 'row' });
  const backBtn = ce('button', { className: 'btn ghost', innerText: 'Back to Dashboard' });
  backBtn.onclick = () => navigate('/portal');
  backRow.append(backBtn);
  p.append(backRow);
  const sched = todaySchedule();

  ["breakfast","lunch","dinner"].forEach(meal => {
    renderMealSection(p, s, meal);
  });

  const notes = ce('div', { className: 'small', style: 'margin-top:8px' });
  notes.innerText = `Order cutoffs — Breakfast: ${DEADLINES.breakfast.orderCutoff}, Lunch: ${DEADLINES.lunch.orderCutoff}, Dinner: ${DEADLINES.dinner.orderCutoff}. Cancel windows (min) — B: ${DEADLINES.breakfast.cancelWindowMin}, L: ${DEADLINES.lunch.cancelWindowMin}, D: ${DEADLINES.dinner.cancelWindowMin}.`;
  p.append(notes);

  c.append(p);
  return c;
});

// Reports
route('/reports', () => {
  if (!requireAuth()) return ce('div');
  const s = getSession();
  const c = ce('div', { className: 'container' });
  c.append(header());

  const p = ce('div', { className: 'panel' });
  p.append(ce('h2', { innerText: 'Food Sold (Finalized Orders)' }));

  const orders = loadOrders();
  const now = Date.now();
  const mealTotals = { breakfast: 0, lunch: 0, dinner: 0 };
  const dishTotals = {};
  const myTotals = { breakfast: 0, lunch: 0, dinner: 0 };
  Object.entries(orders).forEach(([key, o]) => {
    if (isFinalized(o)) {
      mealTotals[o.meal] = (mealTotals[o.meal] || 0) + 1;
      dishTotals[o.dish] = (dishTotals[o.dish] || 0) + 1;
      if (key.startsWith(s.employeeId + "__")) {
        myTotals[o.meal] = (myTotals[o.meal] || 0) + 1;
      }
    }
  });

  const canvas = ce('canvas', { width: 700, height: 260, style: 'width:100%; max-width:700px; height:260px; background:#0f1728; border:1px solid #23314a; border-radius:8px;' });
  p.append(canvas);
  const ctx = canvas.getContext('2d');
  function drawGroupedBarChart(labels, series) {
    const W = canvas.width, H = canvas.height, pad = 40;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#9aa3b2';
    ctx.font = '12px sans-serif';
    const flat = series.flatMap(s => s.values);
    const max = Math.max(1, ...flat);
    const groups = labels.length;
    const groupW = (W - pad*2) / groups;
    const barW = groupW * 0.28; // two bars + spacing
    labels.forEach((label, i) => {
      const gx = pad + i * groupW;
      // draw label
      ctx.fillStyle = '#9aa3b2';
      ctx.fillText(label, gx + 2, H - pad + 14);
      // bars
      series.forEach((s, si) => {
        const v = s.values[i];
        const h = (H - pad*2) * (v / max);
        const y = H - pad - h;
        const x = gx + 10 + si * (barW + 8);
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, barW, h);
        ctx.fillStyle = '#eef2ff';
        ctx.fillText(String(v), x + barW/2 - 6, y - 6);
      });
    });
    // legend
    let lx = W - pad - 150, ly = pad - 10;
    series.forEach(s => {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly, 12, 12);
      ctx.fillStyle = '#eef2ff';
      ctx.fillText(s.name, lx + 18, ly + 11);
      ly += 18;
    });
  }
  const labels = ['Breakfast','Lunch','Dinner'];
  drawGroupedBarChart(labels, [
    { name: 'All', color: '#3d7eff', values: [mealTotals.breakfast, mealTotals.lunch, mealTotals.dinner] },
    { name: 'Me', color: '#22c55e', values: [myTotals.breakfast, myTotals.lunch, myTotals.dinner] },
  ]);

  const grid = ce('div', { className: 'grid two', style: 'margin-top:12px' });
  const allBox = ce('div', { className: 'card' });
  allBox.append(ce('h3', { innerText: 'Top Dishes (All Users, Finalized)' }));
  const list = ce('div');
  Object.entries(dishTotals).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([dish, count]) => {
    const row = ce('div', { className: 'row' });
    row.append(ce('div', { innerText: dish }));
    row.append(ce('div', { className: 'spacer' }));
    row.append(ce('div', { className: 'badge', innerText: String(count) }));
    list.append(row);
  });
  allBox.append(list);

  const myBox = ce('div', { className: 'card' });
  myBox.append(ce('h3', { innerText: 'My Finalized Orders' }));
  myBox.append(ce('div', { className: 'muted', innerText: `Breakfast: ${myTotals.breakfast} • Lunch: ${myTotals.lunch} • Dinner: ${myTotals.dinner}` }));

  grid.append(allBox, myBox);
  p.append(grid);

  c.append(p);
  return c;
});

function render() {
  const hash = location.hash.slice(1) || '/';
  const mount = qs('#app');
  mount.innerHTML = '';

  const r = routes[hash] || routes['/'];
  const node = r();
  mount.append(node);
}

// Start app
render();
