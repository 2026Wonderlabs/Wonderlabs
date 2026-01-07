document.addEventListener('DOMContentLoaded', () => {
  // Register handler
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
      // convert arrays or malformed storage into an object map so additions persist
      if (!users || typeof users !== 'object' || Array.isArray(users)) {
        if (Array.isArray(users)) {
          const tmp = {};
          users.forEach((item, i) => {
            if (!item || typeof item !== 'object') return;
            const key = (item.username || item.displayName || item.name || `user${i}`).toString().trim().toLowerCase();
            tmp[key] = item;
          });
          users = tmp;
        } else {
          users = {};
        }
      }
      console.log('Register attempt:', { username, email, usersKeys: Object.keys(users) });
      if (users[username]) {
        if (msg) { msg.textContent = 'Username already taken.'; msg.style.color = 'red'; }
        return;
      }

      // store username normalized and original display name
      users[username] = { password, email, displayName: usernameRaw.trim() };
      localStorage.setItem('users', JSON.stringify(users));
      console.log('Saved users keys:', Object.keys(users));
      if (msg) { msg.textContent = 'Registration successful — redirecting to login...'; msg.style.color = 'green'; }
      setTimeout(() => { window.location.href = 'login.html'; }, 1000);
    });
  }

  // Login handler
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
      console.log('Login attempt:', { username });
      console.log('Stored users keys:', Object.keys(users));

      if (users[username] && users[username].password === password) {
        localStorage.setItem('currentUser', users[username].displayName || username);
        window.location.href = 'index.html';
      } else {
        if (err) { err.textContent = 'Invalid username or password.'; err.style.display = 'block'; }
      }
    });
  }
});
let current = 0;
const cards = document.querySelectorAll(".feature-card");

function showCard(i) {
  cards.forEach(c => c.classList.remove("active"));
  cards[i].classList.add("active");
}

function nextCard() {
  current = (current + 1) % cards.length;
  showCard(current);
}

function prevCard() {
  current = (current - 1 + cards.length) % cards.length;
  showCard(current);
}
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

const toggle = document.getElementById('theme-toggle');
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
    if (toggle) toggle.textContent = '☀️';
  } else {
    document.body.classList.remove('light');
    if (toggle) toggle.textContent = '🌙';
  }
}
applyTheme(localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

toggle?.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  applyTheme(isLight ? 'light' : 'dark');
});
