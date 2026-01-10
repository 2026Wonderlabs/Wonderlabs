document.addEventListener('DOMContentLoaded', () => {
  // --- AUTH UI ---
  const user = localStorage.getItem('currentUser');
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

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    location.reload();
  });

  // --- LOCAL STORAGE HELPERS ---
  function getClimateData() {
    const raw = localStorage.getItem('climateData') || '[]';
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function saveClimateData(data){
    localStorage.setItem('climateData', JSON.stringify(data));
    renderTable();
    renderCharts();
  }

  // --- FORM SUBMISSION ---
  const form = document.getElementById('climate-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const location = document.getElementById('location').value.trim();
    const date = document.getElementById('date').value;
    const temp = parseFloat(document.getElementById('temperature').value);
    const precipitation = parseFloat(document.getElementById('Persipitation').value);
    const precipType = document.getElementById('precipitation-type').value;
    const notes = document.getElementById('notes').value.trim();

    if(!location || !date || isNaN(temp) || isNaN(precipitation)){
      return alert('Please fill in all required fields 🌡️💧');
    }

    const data = getClimateData();
    data.push({
      location,
      date,
      temperature: temp,
      precipitation,
      precipType,
      notes
    });
    saveClimateData(data);

    form.reset();
  });

  // --- TABLE RENDERING ---
  const tableWrap = document.getElementById('climate-table-wrap');
  function renderTable(){
    const data = getClimateData();
    if(!data.length){
      tableWrap.innerHTML = '<p>No data yet. Add your climate records above 🌍</p>';
      return;
    }

    const rows = data.map((d,i) => `
      <tr>
        <td>${d.date}</td>
        <td>${d.location}</td>
        <td>${d.temperature}°C</td>
        <td>${d.precipitation}mm (${d.precipType})</td>
        <td>${d.notes}</td>
        <td><button data-index="${i}" class="delete-btn">❌</button></td>
      </tr>
    `);

    tableWrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Date 📅</th>
            <th>Location 🌍</th>
            <th>Temperature 🌡️</th>
            <th>Precipitation 💧</th>
            <th>Notes 📝</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;

    tableWrap.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        if(confirm('Delete this entry?')){
          data.splice(index,1);
          saveClimateData(data);
        }
      });
    });
  }

  // --- CLEAR ALL DATA ---
  document.getElementById('clear-log').addEventListener('click', () => {
    if(confirm('Clear all climate data?')){
      localStorage.removeItem('climateData');
      renderTable();
      renderCharts();
    }
  });

  // --- CHARTS ---
  let tempChart, precipChart;
function renderCharts(){
  const data = getClimateData().sort((a,b)=> new Date(a.date)-new Date(b.date));
  const labels = data.map(d=>d.date);
  const temps = data.map(d=>d.temperature);

  // Separate precipitation by type
  const rainData = data.map(d => d.precipType==='rain' ? d.precipitation : 0);
  const snowData = data.map(d => d.precipType==='snow' ? d.precipitation : 0);
  const hailData = data.map(d => d.precipType==='hail' ? d.precipitation : 0);

  const tempCtx = document.getElementById('temp-chart').getContext('2d');
  const precipCtx = document.getElementById('rain-chart').getContext('2d');

  if(tempChart) tempChart.destroy();
  if(precipChart) precipChart.destroy();

  tempChart = new Chart(tempCtx, {
    type: 'line',
    data: { 
      labels, 
      datasets:[{
        label: 'Temperature (°C) 🌡️',
        data: temps,
        borderColor: 'tomato',
        backgroundColor: 'rgba(255,99,132,0.2)',
        tension: 0.3
      }]
    },
    options:{ responsive:true, plugins:{ legend:{display:true} } }
  });

  precipChart = new Chart(precipCtx, {
    type: 'bar',
    data: {
      labels,
      datasets:[
        { label: 'Rain 💧', data: rainData, backgroundColor: 'skyblue' },
        { label: 'Snow ❄️', data: snowData, backgroundColor: 'lightgray' },
        { label: 'Hail 🌨️', data: hailData, backgroundColor: 'lightyellow' }
      ]
    },
    options:{
      responsive:true,
      plugins:{ legend:{display:true} },
      scales: { x:{ stacked:true }, y:{ stacked:true } } // stack bars
    }
  });
}


  renderTable();
  renderCharts();
});
