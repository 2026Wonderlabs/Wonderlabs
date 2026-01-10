document.addEventListener('DOMContentLoaded', () => {
  // --- AUTH ---
  const user = localStorage.getItem('currentUser') || null;
  const greeting = document.getElementById('user-greeting');
  const logoutBtn = document.getElementById('logout-btn');
  const loginBtn = document.querySelector('.login-btn');

  if(user){
    greeting.textContent = `Hi, ${user} 👋`;
    logoutBtn.style.display = 'inline-block';
    loginBtn.style.display = 'none';
  } else {
    greeting.textContent = '';
    logoutBtn.style.display = 'none';
    loginBtn.style.display = 'inline-block';
  }

  logoutBtn?.addEventListener('click', ()=>{
    localStorage.removeItem('currentUser');
    location.reload();
  });

  // --- STORAGE HELPERS ---
  function getQuestions() {
    try{
      const raw = localStorage.getItem('forumQuestions');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveQuestions(questions){
    localStorage.setItem('forumQuestions', JSON.stringify(questions));
    renderQuestions();
  }

  // --- PRELOAD 15 QUESTIONS ---
  function preloadQuestions(){
    let questions = getQuestions();
    if(questions.length) return; // already loaded

    const levels = ['gcse','alevel','advanced'];
    const categories = ['biology','chemistry','physics'];

    questions = [];

    categories.forEach(category=>{
      levels.forEach(level=>{
        for(let i=1;i<=5;i++){
          questions.push({
            id: `${category}-${level}-${i}`,
            title: `Unanswered ${category} Q${i} (${level})`,
            category,
            level,
            status: 'open',
            description: `This is an unanswered question about ${category} at ${level} level. Collaborate to solve it.`,
            known: '',
            publicContributors: [],
            teams: [], // each team: {name:'Team A', members:['user1','user2'], whiteboard:[]}
          });
        }
      });
    });

    saveQuestions(questions);
  }

  preloadQuestions();

  // --- RENDER QUESTIONS ---
  const questionsListEl = document.getElementById('questions-list');
  const searchInput = document.getElementById('search-questions');
  const filterCategory = document.getElementById('filter-category');
  const filterLevel = document.getElementById('filter-level');
  const filterStatus = document.getElementById('filter-status');

  function renderQuestions(){
    const questions = getQuestions();
    const search = searchInput.value.toLowerCase();
    const cat = filterCategory.value;
    const level = filterLevel.value;
    const status = filterStatus.value;

    const filtered = questions.filter(q=>{
      const matchSearch = q.title.toLowerCase().includes(search) || q.description.toLowerCase().includes(search);
      const matchCat = !cat || q.category===cat;
      const matchLevel = !level || q.level===level;
      const matchStatus = !status || q.status===status;
      return matchSearch && matchCat && matchLevel && matchStatus;
    });

    if(!filtered.length){
      questionsListEl.innerHTML = '<p>No questions match filters/search.</p>';
      return;
    }

    questionsListEl.innerHTML = filtered.map(q=>{
      // TEAMS display
      const teamsHtml = q.teams.map((t,idx)=>`
        <div class="team">
          <strong>${t.name}</strong> - Members: ${t.members.join(', ') || 'No members yet'}
          <button data-qid="${q.id}" data-teamidx="${idx}" class="join-team-btn">Join Team</button>
          <div class="whiteboard" id="whiteboard-${q.id}-${idx}">
            <em>Whiteboard for ${t.name}</em>
            <ul>${t.whiteboard.map(w=>`<li>${w.user}: ${w.message}</li>`).join('')}</ul>
            <input type="text" placeholder="Add message" data-qid="${q.id}" data-teamidx="${idx}" class="whiteboard-input">
          </div>
        </div>
      `).join('');

      // Public board
      const publicHtml = `
        <div class="public-board">
          <strong>Public Contributors:</strong> ${q.publicContributors.join(', ') || 'No contributions yet'}
          <div class="whiteboard" id="public-${q.id}">
            <ul>${(q.publicWhiteboard||[]).map(w=>`<li>${w.user}: ${w.message}</li>`).join('')}</ul>
            <input type="text" placeholder="Add message publicly" data-qid="${q.id}" class="public-input">
          </div>
        </div>
      `;

      return `
        <article class="question-card" id="${q.id}">
          <h3>${q.title}</h3>
          <p class="meta">Category: ${q.category} | Level: ${q.level} | Status: ${q.status}</p>
          <p>${q.description}</p>
          ${teamsHtml || '<em>No teams yet</em>'}
          ${publicHtml}
          <button data-qid="${q.id}" class="create-team-btn">➕ Create Team</button>
        </article>
      `;
    }).join('');

    // --- EVENT LISTENERS ---
    // Create team
    document.querySelectorAll('.create-team-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(!user) return alert('Log in to create a team');
        const qid = btn.dataset.qid;
        const teamName = prompt('Team Name:');
        if(!teamName) return;
        const questions = getQuestions();
        const q = questions.find(qq=>qq.id===qid);
        q.teams.push({name:teamName,members:[user],whiteboard:[]});
        saveQuestions(questions);
      });
    });

    // Join team
    document.querySelectorAll('.join-team-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        if(!user) return alert('Log in to join team');
        const qid = btn.dataset.qid;
        const teamIdx = parseInt(btn.dataset.teamidx);
        const questions = getQuestions();
        const q = questions.find(qq=>qq.id===qid);
        const team = q.teams[teamIdx];
        if(!team.members.includes(user)){
          team.members.push(user);
          saveQuestions(questions);
        } else {
          alert('You are already in this team');
        }
      });
    });

    // Whiteboard input per team
    document.querySelectorAll('.whiteboard-input').forEach(input=>{
      input.addEventListener('keypress', (e)=>{
        if(e.key==='Enter' && user){
          const qid = input.dataset.qid;
          const teamIdx = parseInt(input.dataset.teamidx);
          const msg = input.value.trim();
          if(!msg) return;
          const questions = getQuestions();
          const q = questions.find(qq=>qq.id===qid);
          const team = q.teams[teamIdx];
          team.whiteboard.push({user,msg});
          saveQuestions(questions);
        }
      });
    });

    // Public whiteboard
    document.querySelectorAll('.public-input').forEach(input=>{
      input.addEventListener('keypress',(e)=>{
        if(e.key==='Enter' && user){
          const qid = input.dataset.qid;
          const msg = input.value.trim();
          if(!msg) return;
          const questions = getQuestions();
          const q = questions.find(qq=>qq.id===qid);
          if(!q.publicWhiteboard) q.publicWhiteboard=[];
          q.publicWhiteboard.push({user,msg});
          if(!q.publicContributors.includes(user)) q.publicContributors.push(user);
          saveQuestions(questions);
        }
      });
    });

  }

  // --- FILTER & SEARCH EVENTS ---
  [searchInput, filterCategory, filterLevel, filterStatus].forEach(el=>{
    el.addEventListener('input', renderQuestions);
    el.addEventListener('change', renderQuestions);
  });

  // --- ASK QUESTION MODAL ---
  const askBtn = document.getElementById('ask-question-btn');
  const askSection = document.getElementById('ask-question');
  const cancelBtn = document.getElementById('cancel-question');
  const form = document.getElementById('question-form');

  askBtn.addEventListener('click', ()=> askSection.style.display='block');
  cancelBtn.addEventListener('click', ()=> askSection.style.display='none');

  form.addEventListener('submit', e=>{
    e.preventDefault();
    if(!user) return alert('Log in to ask questions');
    const questions = getQuestions();
    const id = `user-${Date.now()}`;
    questions.push({
      id,
      title: document.getElementById('question-title').value,
      category: document.getElementById('question-category').value,
      level: document.getElementById('question-level').value,
      status: 'open',
      description: document.getElementById('question-description').value,
      known: document.getElementById('question-known').value,
      publicContributors: [],
      publicWhiteboard: [],
      teams: []
    });
    saveQuestions(questions);
    form.reset();
    askSection.style.display='none';
  });

  renderQuestions();
});
