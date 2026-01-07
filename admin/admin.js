document.addEventListener('DOMContentLoaded', ()=>{
  const current = (localStorage.getItem('currentUser')||'').toString().trim();
  const ok = current && current.toLowerCase() === 'admin123';
  if (!ok){
    document.getElementById('access-denied').style.display='flex';
    document.getElementById('admin-main').style.display='none';
    document.querySelector('.admin-nav').style.display='none';
    return;
  }

  // Tabs
  document.querySelectorAll('.admin-nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.admin-nav button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.getAttribute('data-panel');
      document.querySelectorAll('.panel').forEach(p=>p.style.display='none');
      const el = document.getElementById('panel-'+panel);
      if (el) el.style.display='block';
    });
  });

  const toastEl = document.getElementById('admin-toast');
  function showToast(msg, type='success'){
    toastEl.textContent = msg; toastEl.className = '';
    toastEl.style.display = 'block';
    toastEl.classList.add(type==='success' ? 'toast-success' : 'toast-error');
    setTimeout(()=>{ toastEl.style.display='none'; }, 3000);
  }

  // storage helpers
  function getUsers(){
    try{
      let users = JSON.parse(localStorage.getItem('users')||'{}');
      if (Array.isArray(users)){ const tmp={}; users.forEach((it,i)=>{ if (!it) return; const k=(it.username||it.displayName||it.name||`user${i}`).toString().trim().toLowerCase(); tmp[k]=it; }); users=tmp; localStorage.setItem('users', JSON.stringify(users)); }
      if (!users || typeof users !== 'object') users = {};
      return users;
    }catch(e){ return {}; }
  }
  function saveUsers(u){ localStorage.setItem('users', JSON.stringify(u)); updateStats(); }

  function updateStats(){ const users = getUsers(); document.getElementById('stat-users').textContent = Object.keys(users).length; }
  updateStats();

  // Users UI
  const wrap = document.getElementById('users-table-wrap');
  const searchEl = document.getElementById('user-search');
  const roleFilter = document.getElementById('filter-role');
  const statusFilter = document.getElementById('filter-status');

  function renderUsers(){
    const users = getUsers();
    const keys = Object.keys(users).sort();
    const q = (searchEl.value||'').toString().trim().toLowerCase();
    const rf = roleFilter.value; const sf = statusFilter.value;
    const rows = [];
    keys.forEach(k=>{
      const u = users[k] || {};
      if (q){ const hay = `${k} ${u.displayName||''} ${u.email||''}`.toLowerCase(); if (!hay.includes(q)) return; }
      if (rf && (u.role||'user') !== rf) return;
      if (sf && (u.status||'active') !== sf) return;
      const join = u.joinDate ? new Date(u.joinDate).toLocaleString() : '';
      const last = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '';
      rows.push(`<tr>
        <td>${k}</td>
        <td>${(u.displayName||'')}</td>
        <td>${(u.email||'')}</td>
        <td><select data-username="${k}" class="role-select"><option value="user">User</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></td>
        <td><select data-username="${k}" class="status-select"><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select></td>
        <td>${join}</td>
        <td>${last}</td>
        <td>
          <button class="small-btn" data-action="reset" data-user="${k}">Reset PW</button>
          <button class="small-btn" data-action="view" data-user="${k}">View</button>
          <button class="small-btn" data-action="delete" data-user="${k}">Delete</button>
        </td>
      </tr>`);
    });

    if (!rows.length){ wrap.innerHTML = '<p>No users match filters.</p>'; return; }
    const table = `
      <table>
        <thead><tr><th>Username</th><th>Display</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody>${rows.join('\n')}</tbody>
      </table>
    `;
    wrap.innerHTML = table;

    // set select values and attach listeners
    wrap.querySelectorAll('.role-select').forEach(s=>{ s.value = (getUsers()[s.dataset.username].role||'user'); s.addEventListener('change', (e)=>{ changeRole(s.dataset.username, s.value); }); });
    wrap.querySelectorAll('.status-select').forEach(s=>{ s.value = (getUsers()[s.dataset.username].status||'active'); s.addEventListener('change', (e)=>{ changeStatus(s.dataset.username, s.value); }); });
    wrap.querySelectorAll('button').forEach(b=>{ b.addEventListener('click', onActionClick); });
  }

  function onActionClick(e){ const btn = e.currentTarget; const action = btn.dataset.action; const username = btn.dataset.user; if (action==='delete'){ return deleteUser(username); } if (action==='reset'){ const p = prompt(`Set new password for ${username}:`); if (p===null) return; setPassword(username, p); } if (action==='view'){ viewUser(username); } }

  function viewUser(username){ const users = getUsers(); const u = users[username]; if (!u) return alert('User not found'); alert(`Username: ${username}\nDisplay: ${u.displayName||''}\nEmail: ${u.email||''}\nRole: ${u.role||'user'}\nStatus: ${u.status||'active'}\nJoined: ${u.joinDate||''}\nLast login: ${u.lastLogin||''}`); }

  function setPassword(username, pw){ const users = getUsers(); if (!users[username]) return showToast('User not found', 'error'); users[username].password = pw; saveUsers(users); showToast('Password reset'); }

  function changeRole(username, role){ const users = getUsers(); if (!users[username]) return showToast('User not found','error');
    // prevent removing last admin
    const admins = Object.keys(users).filter(k=> (users[k].role||'user') === 'admin');
    if (users[username].role === 'admin' && role !== 'admin' && admins.length <= 1){ alert('Cannot remove last admin.'); renderUsers(); return; }
    users[username].role = role; saveUsers(users); showToast('Role updated'); }

  function changeStatus(username, status){ const users = getUsers(); if (!users[username]) return showToast('User not found','error'); users[username].status = status; saveUsers(users); showToast('Status updated'); }

  function deleteUser(username){ const users = getUsers(); if (!users[username]) return showToast('User not found','error'); if (!confirm(`Delete user ${username}? This cannot be undone.`)) return; const admins = Object.keys(users).filter(k=> (users[k].role||'user') === 'admin'); if ((users[username].role||'user')==='admin' && admins.length<=1){ return alert('Cannot delete the last admin.'); } delete users[username]; saveUsers(users); renderUsers(); showToast('User deleted'); }

  // search / filters
  [searchEl, roleFilter, statusFilter].forEach(el=>{ el.addEventListener('input', ()=>renderUsers()); el.addEventListener('change', ()=>renderUsers()); });

  // create user flow
  document.getElementById('create-user-btn').addEventListener('click', ()=>{ document.getElementById('create-user-form').style.display='block'; });
  document.getElementById('cancel-new-user').addEventListener('click', ()=>{ document.getElementById('create-user-form').style.display='none'; });
  document.getElementById('save-new-user').addEventListener('click', ()=>{
    const usernameRaw = document.getElementById('new-username').value; const username = usernameRaw.toString().trim().toLowerCase(); const display = document.getElementById('new-display').value; const email = document.getElementById('new-email').value; const password = document.getElementById('new-password').value; const role = document.getElementById('new-role').value || 'user';
    if (!username || !password){ return alert('Please provide username and password'); }
    const users = getUsers(); if (users[username]) return alert('Username already exists');
    users[username] = { password, email, displayName:display, role, status:'active', joinDate: new Date().toISOString(), lastLogin: null };
    saveUsers(users); document.getElementById('create-user-form').style.display='none'; renderUsers(); showToast('User created');
  });

  document.getElementById('refresh-users').addEventListener('click', ()=>{ renderUsers(); showToast('Refreshed'); });

  renderUsers();

});