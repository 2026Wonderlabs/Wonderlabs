/* simulations.js — Wonder Labs

 - Data-driven simulation manager
 - Renders cards, supports subject & difficulty filtering, search, states (live, coming-soon, locked), and simple localStorage tracking
 - Easy to extend: add objects to the `SIMULATIONS` array or replace with a fetch() to load JSON
*/

(function () {
  'use strict';

  const STORAGE_KEYS = {
    openCounts: 'sim_open_counts',
    recent: 'sim_recent',
  };

  // Sample dataset — add more objects or load from JSON in future
  const SIMULATIONS = [
    {
      id: 'proj-motion',
      title: 'Projectile Motion',
      subject: 'physics',
      level: 'intermediate',
      description: 'Investigate how angle, velocity, and gravity affect projectile paths.',
      link: '../simulations/projectile.html',
      state: 'live',
      tags: ['forces', 'motion']
    },
    {
      id: 'acid-base-titration',
      title: 'Acid-Base Titration',
      subject: 'chemistry',
      level: 'gcse',
      description: 'Simulate titrations, indicators and pH curves.',
      link: '../simulations/titration.html',
      state: 'live',
      tags: ['acid', 'pH']
    },
    {
      id: 'cell-division',
      title: 'Cell Division',
      subject: 'biology',
      level: 'gcse',
      description: 'Visualise mitosis and meiosis stages and compare outcomes.',
      link: '../simulations/cell-division.html',
      state: 'locked',
      tags: ['cells', 'genetics']
    },
    {
      id: 'orbital-mechanics',
      title: 'Orbital Mechanics',
      subject: 'space',
      level: 'advanced',
      description: 'Explore orbits, transfer maneuvers, and gravity assists.',
      link: '../simulations/orbits.html',
      state: 'coming-soon',
      tags: ['orbit', 'gravity']
    },
    {
      id: 'graph-transform',
      title: 'Graph Transformations',
      subject: 'maths',
      level: 'intermediate',
      description: 'Experiment with functions, translations and scaling.',
      link: '../simulations/graphs.html',
      state: 'live',
      tags: ['algebra', 'functions']
    }
  ];

  // Utilities
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Simple debounce
  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // Safe localStorage helpers
  function getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (e) {
      console.warn('getJSON failed', key, e);
      return fallback;
    }
  }
  function setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('setJSON failed', key, e); }
  }

  // Tracking
  function incrementOpenCount(id) {
    const counts = getJSON(STORAGE_KEYS.openCounts, {});
    counts[id] = (counts[id] || 0) + 1;
    setJSON(STORAGE_KEYS.openCounts, counts);
  }

  function pushRecent(id) {
    const recent = getJSON(STORAGE_KEYS.recent, []);
    const now = Date.now();
    // keep unique, move to front
    const filtered = recent.filter(r => r.id !== id);
    filtered.unshift({ id, ts: now });
    setJSON(STORAGE_KEYS.recent, filtered.slice(0, 10));
  }

  // Rendering
  function createCard(sim) {
    const article = document.createElement('article');
    article.className = 'simulation-card';
    article.dataset.id = sim.id;
    article.dataset.subject = sim.subject;
    article.dataset.level = sim.level;

    const title = document.createElement('h3');
    title.textContent = sim.title;

    const meta = document.createElement('p');
    meta.className = 'sim-meta';
    meta.textContent = `${capitalize(sim.subject)} • ${capitalize(sim.level)}`;

    const desc = document.createElement('p');
    desc.className = 'sim-desc';
    desc.textContent = sim.description;

    const controls = document.createElement('div');
    controls.className = 'sim-controls';

    const openBtn = document.createElement('button');
    openBtn.className = 'sim-open-btn';
    openBtn.type = 'button';

    if (sim.state === 'live') {
      openBtn.textContent = 'Open Simulation';
      openBtn.addEventListener('click', () => {
        incrementOpenCount(sim.id);
        pushRecent(sim.id);
        // navigate cleanly
        try { window.location.href = sim.link; } catch (e) { window.open(sim.link, '_blank'); }
      });
    } else if (sim.state === 'coming-soon') {
      const label = document.createElement('span');
      label.className = 'sim-state sim-coming-soon';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = 'Coming Soon';
      controls.appendChild(label);
      openBtn.textContent = 'Preview';
      openBtn.disabled = true;
      openBtn.title = 'This simulation is coming soon';
    } else if (sim.state === 'locked') {
      const label = document.createElement('span');
      label.className = 'sim-state sim-locked';
      label.setAttribute('aria-hidden', 'true');
      label.textContent = 'Locked';
      controls.appendChild(label);
      openBtn.textContent = 'Locked';
      openBtn.disabled = true;
      openBtn.title = 'This simulation is locked for your account';
    }

    // show open counts
    const counts = getJSON(STORAGE_KEYS.openCounts, {});
    const countEl = document.createElement('span');
    countEl.className = 'sim-count';
    countEl.textContent = (counts[sim.id] || 0) > 0 ? `${counts[sim.id]} views` : '';

    controls.appendChild(openBtn);
    controls.appendChild(countEl);

    article.appendChild(title);
    article.appendChild(meta);
    article.appendChild(desc);
    article.appendChild(controls);

    return article;
  }

  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // State
  const state = {
    subject: 'all',
    query: '',
  };

  function renderGrid(list) {
    const grid = document.getElementById('simulations-grid');
    const empty = document.getElementById('simulations-empty');
    if (!grid) return;
    grid.innerHTML = '';

    if (!list.length) {
      grid.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;
    grid.hidden = false;

    const frag = document.createDocumentFragment();
    list.forEach(sim => frag.appendChild(createCard(sim)));
    grid.appendChild(frag);
  }

  function applyFilters() {
    const q = (state.query || '').trim().toLowerCase();
    const subject = state.subject || 'all';

    const filtered = SIMULATIONS.filter(sim => {
      if (subject !== 'all' && sim.subject !== subject) return false;
      if (!q) return true;
      const hay = [sim.title, sim.description, (sim.tags || []).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });

    renderGrid(filtered);
  }

  // UI wiring
  function setupTabs() {
    const tabs = document.getElementById('simulation-tabs');
    if (!tabs) return;
    const buttons = qsa('button[data-subject]', tabs);
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subj = btn.dataset.subject || 'all';
        state.subject = subj;
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        applyFilters();
      });
    });
    // set default active
    const start = tabs.querySelector('button[data-subject="all"]');
    if (start) start.classList.add('active');
  }

  function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const handler = debounce((e) => {
      state.query = e.target.value || '';
      applyFilters();
    }, 180);
    input.addEventListener('input', handler);
  }

  // Public init
  function init() {
    // If we ever want to load from JSON file, do it here and fallback to SIMULATIONS
    // fetch('./simulations.json').then(r => r.json()).then(data => { ... }).catch(() => { render fallback })

    setupTabs();
    setupSearch();
    applyFilters();

    // Expose some helpers for debugging / future features
    window.WonderLabsSim = {
      SIMULATIONS,
      getOpenCounts: () => getJSON(STORAGE_KEYS.openCounts, {}),
      getRecent: () => getJSON(STORAGE_KEYS.recent, []),
      refresh: applyFilters,
    };
  }

  // Kick off after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

})();
