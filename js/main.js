document.addEventListener('DOMContentLoaded', () => {
  // Ensure users storage is an object so registrations persist
  (function ensureUsersObject() {
    const raw = localStorage.getItem('users');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const tmp = {};
        parsed.forEach((item, i) => {
          if (!item || typeof item !== 'object') return;
          const key = (item.username || item.displayName || item.name || `user${i}`).toString().trim().toLowerCase();
          tmp[key] = item;
        });
        localStorage.setItem('users', JSON.stringify(tmp));
        console.log('Normalized users storage (array -> object)');
      }
    } catch (e) { console.warn('failed to parse users in ensureUsersObject', e); }
  })();

  function updateUserCount() {
    try {
      let users = JSON.parse(localStorage.getItem('users') || '{}');
      if (Array.isArray(users)) users = users.filter(Boolean);
      const count = Object.keys(users).length;
      const el = document.getElementById('users-count');
      if (el) el.textContent = count;
    } catch (e) { console.warn('updateUserCount', e); }
  }
  updateUserCount();

  // MOBILE NAV TOGGLE
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      document.body.classList.toggle('nav-open');
      console.log('nav toggle:', !expanded);
    });
  }

  // EXPORT / IMPORT USERS (register page)
  const exportBtn = document.getElementById('export-users');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const users = localStorage.getItem('users') || '{}';
      try { await navigator.clipboard.writeText(users); alert('Users JSON copied to clipboard.'); }
      catch (e) { prompt('Copy the users JSON manually:', users); }
    });
  }
  const importBtn = document.getElementById('import-users');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const pasted = prompt('Paste users JSON to import (this will overwrite stored users):');
      if (!pasted) return;
      try {
        const parsed = JSON.parse(pasted);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem('users', JSON.stringify(parsed));
          updateUserCount();
          alert('Users imported successfully.');
        } else alert('Invalid users JSON.');
      } catch (e) { alert('Invalid JSON: ' + e.message); }
    });
  }

  // REGISTER HANDLER
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameRaw = document.getElementById('username').value;
      const username = usernameRaw.trim().toLowerCase();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const msg = document.getElementById('register-msg');

      if (!username || !password) {
        if (msg) { msg.textContent = 'Please enter a username and password.'; msg.style.color = 'red'; }
        return;
      }

      let users = JSON.parse(localStorage.getItem('users') || '{}');
      if (!users || typeof users !== 'object' || Array.isArray(users)) {
        if (Array.isArray(users)) {
          const tmp = {};
          users.forEach((item, i) => {
            if (!item || typeof item !== 'object') return;
            const key = (item.username || item.displayName || item.name || `user${i}`).toString().trim().toLowerCase();
            tmp[key] = item;
          });
          users = tmp;
        } else users = {};
      }

      if (users[username]) {
        if (msg) { msg.textContent = 'Username already taken.'; msg.style.color = 'red'; }
        return;
      }

      users[username] = { password, email, displayName: usernameRaw.trim(), status: 'active' };
      localStorage.setItem('users', JSON.stringify(users));
      updateUserCount();
      if (msg) { msg.textContent = 'Registration successful — redirecting to login...'; msg.style.color = 'green'; }
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    });
  }

  // LOGIN HANDLER (UPDATED TO CHECK STATUS)
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const usernameRaw = document.getElementById('login-username').value;
      const username = usernameRaw.trim().toLowerCase();
      const password = document.getElementById('login-password').value;
      const err = document.getElementById('login-error');

      if (!username || !password) {
        if (err) { err.textContent = 'Please enter username and password.'; err.style.display = 'block'; }
        return;
      }

      let users = JSON.parse(localStorage.getItem('users') || '{}');
      if (Array.isArray(users)) {
        const tmp = {};
        users.forEach((item, i) => {
          if (!item || typeof item !== 'object') return;
          const key = (item.username || item.displayName || item.name || `user${i}`).toString().trim().toLowerCase();
          tmp[key] = item;
        });
        users = tmp;
      }

      if (users[username] && users[username].password === password) {
        const status = users[username].status || 'active';
        if (status === 'banned') {
          if (err) { err.textContent = 'Your account is banned.'; err.style.display = 'block'; }
          return;
        }
        if (status === 'suspended') {
          if (err) { err.textContent = 'Your account is suspended.'; err.style.display = 'block'; }
          return;
        }
        localStorage.setItem('currentUser', users[username].displayName || username);
        window.location.href = 'index.html';
      } else {
        if (err) { err.textContent = 'Invalid username or password.'; err.style.display = 'block'; }
      }
    });
  }

  // FEATURE CARD NAVIGATION
  let current = 0;
  const cards = document.querySelectorAll(".feature-card");
  function showCard(i) {
    cards.forEach(c => c.classList.remove("active"));
    if (cards[i]) cards[i].classList.add("active");
  }
  function nextCard() { current = (current + 1) % cards.length; showCard(current); }
  function prevCard() { current = (current - 1 + cards.length) % cards.length; showCard(current); }

  // UPDATE AUTH UI
  function updateAuthUI() {
    const user = localStorage.getItem('currentUser');
    const greeting = document.getElementById('user-greeting');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.querySelector('.login-btn');
    if (user) {
      if (greeting) greeting.textContent = `Hi, ${user}`;
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (loginBtn) loginBtn.style.display = 'none';
    } else {
      if (greeting) greeting.textContent = '';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-block';
    }
  }
  updateAuthUI();

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    updateAuthUI();
    location.reload();
  });

  // THEME TOGGLE
  const toggle = document.getElementById('theme-toggle');
  function applyTheme(theme) {
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
  }
  applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  toggle?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyTheme(isLight ? 'light' : 'dark');
  });

  // ADMIN DASHBOARD SHORTCUT
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      const user = (localStorage.getItem('currentUser') || '').trim().toLowerCase();
      if (user === 'admin123') {
        const path = window.location.pathname || '';
        const adminPath = path.includes('/pages/') ? '../admin/admin.html' : 'admin/admin.html';
        window.location.href = adminPath;
      } else alert('Access denied: Admin only.');
    }
  });
});
