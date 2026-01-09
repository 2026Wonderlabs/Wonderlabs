document.addEventListener('DOMContentLoaded', () => {
  // --- ADMIN CHECK ---
  const currentUser = localStorage.getItem('currentUser') || '';
  const isAdmin = currentUser.toLowerCase() === 'admin123';

  if (!isAdmin) {
    document.getElementById('access-denied').style.display = 'flex';
    document.getElementById('admin-main').style.display = 'none';
    document.querySelector('.admin-nav').style.display = 'none';
    return;
  }

  // --- TAB SWITCHING ---
  document.querySelectorAll('.admin-nav button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.panel;
      document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
      const el = document.getElementById('panel-' + panel);
      if (el) el.style.display = 'block';
    });
  });

  // --- TOAST ---
  const toastEl = document.getElementById('admin-toast');
  function showToast(msg, type='success') {
    toastEl.textContent = msg;
    toastEl.className = 'toast ' + (type === 'success' ? 'toast-success' : 'toast-error');
    toastEl.style.display = 'block';
    setTimeout(()=>{ toastEl.style.display='none'; }, 3000);
  }

  // --- USER STORAGE HELPERS ---
  function getUsers() {
    try {
      let users = JSON.parse(localStorage.getItem('users') || '{}');
      if (Array.isArray(users)) {
        const tmp = {};
        users.forEach((u,i)=>{
          const k = (u.username || u.displayName || `user${i}`).toLowerCase().trim();
          tmp[k] = u;
        });
        users = tmp;
        localStorage.setItem('users', JSON.stringify(users));
      }
      return typeof users === 'object' ? users : {};
    } catch {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
    updateStats();
  }

  function updateStats() {
    const users = getUsers();
    document.getElementById('stat-users').textContent = Object.keys(users).length;
  }
  updateStats();

  // --- USERS PANEL ---
  const wrap = document.getElementById('users-table-wrap');
  const searchEl = document.getElementById('user-search');
  const roleFilter = document.getElementById('filter-role');
  const statusFilter = document.getElementById('filter-status');

  function renderUsers() {
    const users = getUsers();
    const keys = Object.keys(users).sort();
    const q = (searchEl.value || '').trim().toLowerCase();
    const rf = roleFilter.value;
    const sf = statusFilter.value;
    const rows = [];

    keys.forEach(k => {
      const u = users[k];
      if (!u) return;
      if (q && !`${k} ${u.displayName||''} ${u.email||''}`.toLowerCase().includes(q)) return;
      if (rf && (u.role||'user') !== rf) return;
      if (sf && (u.status||'active') !== sf) return;

      const join = u.joinDate ? new Date(u.joinDate).toLocaleString() : '';
      const last = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '';

      // Suspension info display
      let suspendText = '';
      if (u.status === 'suspended' && u.suspendedUntil) {
        const remaining = new Date(u.suspendedUntil) - new Date();
        if (remaining > 0) {
          const h = Math.floor(remaining/3600000);
          const m = Math.floor((remaining%3600000)/60000);
          suspendText = ` (${h}h ${m}m left)`;
        } else {
          u.status = 'active';
          delete u.suspendedUntil;
          saveUsers(users);
        }
      }

      rows.push(`<tr>
        <td>${k}</td>
        <td>${u.displayName || ''}</td>
        <td>${u.email || ''}</td>
        <td><select data-username="${k}" class="role-select">
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select></td>
        <td><select data-username="${k}" class="status-select">
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>${suspendText}</td>
        <td>${join}</td>
        <td>${last}</td>
        <td>
          <button class="small-btn" data-action="reset" data-user="${k}">Reset PW</button>
          <button class="small-btn" data-action="view" data-user="${k}">View</button>
          <button class="small-btn" data-action="delete" data-user="${k}">Delete</button>
        </td>
      </tr>`);
    });

    if (!rows.length) {
      wrap.innerHTML = '<p>No users match filters.</p>';
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead><tr><th>Username</th><th>Display</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;

    wrap.querySelectorAll('.role-select').forEach(s=>{
      s.value = users[s.dataset.username].role || 'user';
      s.addEventListener('change', ()=>changeRole(s.dataset.username,s.value));
    });
    wrap.querySelectorAll('.status-select').forEach(s=>{
      s.value = users[s.dataset.username].status || 'active';
      s.addEventListener('change', ()=>changeStatus(s.dataset.username,s.value));
    });
    wrap.querySelectorAll('button').forEach(b=>b.addEventListener('click',onActionClick));
  }

  function onActionClick(e){
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const username = btn.dataset.user;
    if (action==='delete') deleteUser(username);
    if (action==='reset'){
      const pw = prompt(`Set new password for ${username}:`);
      if (pw!==null) setPassword(username,pw);
    }
    if (action==='view') viewUser(username);
  }

  function viewUser(username){
    const users = getUsers();
    const u = users[username];
    if(!u) return showToast('User not found','error');
    const online = u.lastLogin && (new Date() - new Date(u.lastLogin)) < 300000 ? 'Online' : 'Offline'; // last 5min
    const suspendedInfo = (u.status==='suspended' && u.suspendedUntil) ?
      `Suspended until: ${new Date(u.suspendedUntil).toLocaleString()}` : '';
    alert(`Username: ${username}
Display: ${u.displayName||''}
Email: ${u.email||''}
Role: ${u.role||'user'}
Status: ${u.status||'active'} ${suspendedInfo}
Joined: ${u.joinDate||''}
Last login: ${u.lastLogin||''}
Online: ${online}`);
  }

  function setPassword(username,pw){
    const users = getUsers();
    if(!users[username]) return showToast('User not found','error');
    users[username].password = pw;
    saveUsers(users);
    showToast('Password reset');
  }

  function changeRole(username,role){
    const users = getUsers();
    if(!users[username]) return showToast('User not found','error');
    const admins = Object.keys(users).filter(k=>users[k].role==='admin');
    if(users[username].role==='admin' && role!=='admin' && admins.length<=1){
      alert('Cannot remove last admin');
      renderUsers(); return;
    }
    users[username].role = role;
    saveUsers(users);
    showToast('Role updated');
  }

  function changeStatus(username,status){
    const users = getUsers();
    if(!users[username]) return showToast('User not found','error');

    // Prompt for suspension duration if suspended
    if(status==='suspended'){
      const mins = prompt(`Suspend ${username} for how many minutes?`, '60');
      if(mins){
        const until = new Date(Date.now() + parseInt(mins)*60000);
        users[username].suspendedUntil = until.toISOString();
      }
    } else {
      delete users[username].suspendedUntil;
    }

    users[username].status = status;
    saveUsers(users);
    renderUsers();
    showToast('Status updated');
  }

  function deleteUser(username){
    const users = getUsers();
    if(!users[username]) return showToast('User not found','error');
    const admins = Object.keys(users).filter(k=>users[k].role==='admin');
    if(users[username].role==='admin' && admins.length<=1) return alert('Cannot delete last admin');
    if(!confirm(`Delete user ${username}? This cannot be undone.`)) return;
    delete users[username];
    saveUsers(users);
    renderUsers();
    showToast('User deleted');
  }

  // SEARCH / FILTER
  [searchEl,roleFilter,statusFilter].forEach(el=>{
    el.addEventListener('input', renderUsers);
    el.addEventListener('change', renderUsers);
  });

  // CREATE USER
  document.getElementById('create-user-btn').addEventListener('click',()=>{ document.getElementById('create-user-form').style.display='block'; });
  document.getElementById('cancel-new-user').addEventListener('click',()=>{ document.getElementById('create-user-form').style.display='none'; });
  document.getElementById('save-new-user').addEventListener('click', ()=>{
    const username = document.getElementById('new-username').value.trim().toLowerCase();
    const display = document.getElementById('new-display').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const password = document.getElementById('new-password').value;
    const role = document.getElementById('new-role').value || 'user';
    if(!username||!password) return alert('Username and password required');
    const users = getUsers();
    if(users[username]) return alert('Username exists');
    users[username] = { displayName: display, email, password, role, status:'active', joinDate:new Date().toISOString(), lastLogin:null };
    saveUsers(users);
    renderUsers();
    document.getElementById('create-user-form').style.display='none';
    document.getElementById('new-username').value='';
    document.getElementById('new-display').value='';
    document.getElementById('new-email').value='';
    document.getElementById('new-password').value='';
    document.getElementById('new-role').value='user';
    showToast('User created');
  });

  document.getElementById('refresh-users').addEventListener('click', ()=>{ renderUsers(); showToast('Refreshed'); });

  renderUsers();

  // --- LIVE SUSPENSION DISPLAY ON DASHBOARD ---
  function showSuspensionStatus(){
    const user = localStorage.getItem('currentUser');
    if(!user) return;
    const u = Object.values(getUsers()).find(u=>u.displayName===user);
    const el = document.getElementById('suspend-info');
    if(!u || !el) return;
    if(u.status==='suspended' && u.suspendedUntil){
      const remaining = new Date(u.suspendedUntil)-new Date();
      if(remaining>0){
        const h = Math.floor(remaining/3600000);
        const m = Math.floor((remaining%3600000)/60000);
        const s = Math.floor((remaining%60000)/1000);
        el.textContent = `Suspended for ${h}h ${m}m ${s}s`;
      } else {
        el.textContent='';
        u.status='active';
        delete u.suspendedUntil;
        saveUsers(getUsers());
      }
    } else el.textContent='';
  }
  setInterval(showSuspensionStatus,1000);
  showSuspensionStatus();

});
