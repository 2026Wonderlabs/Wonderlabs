/* virtual-lab.js — lightweight virtual lab engine for Wonder Labs

Features implemented:
- Enter Lab transition (fade/zoom)
- Dynamically builds the lab workspace and toolbox
- Draggable objects (chemicals, organisms, tools)
- Simple mixing logic (two chemicals produce a reaction with color/fizz)
- Microscope panel with zoom control for organisms
- Pendulum physics demo (basic harmonic motion)
- Save / restore session to localStorage and reset
- Minimal CSS injected to keep this self-contained and portable

Notes: This is an extendable, data-driven foundation — add items to the ITEMS array or load JSON.
*/
(function () {
  'use strict';

  const STORAGE_KEY = 'virtual_lab_state_v1';

  const ITEMS = [
    { id: 'chem-acid', type: 'chemical', title: 'Hydrochloric Acid', color: '#f44336', formula: 'HCl' },
    { id: 'chem-base', type: 'chemical', title: 'Sodium Hydroxide', color: '#2196f3', formula: 'NaOH' },
    { id: 'chem-indicator', type: 'chemical', title: 'Phenolphthalein', color: '#ff9800', formula: 'C20H14O4' },
    { id: 'org-amoeba', type: 'organism', title: 'Amoeba', image: '../assets/amoeba.png' },
    { id: 'org-bacteria', type: 'organism', title: 'Bacteria', image: '../assets/bacteria.png' },
    { id: 'tool-microscope', type: 'tool', title: 'Microscope' },
    { id: 'tool-pipette', type: 'tool', title: 'Pipette' },
    { id: 'demo-pendulum', type: 'demo', title: 'Pendulum' }
  ];

  // Insert small CSS for lab components
  function injectStyles() {
    const css = `
      /* Virtual Lab styles */
      #lab-workspace { display:flex; height: calc(100vh - 60px); }
      .lab-sidebar { width: 240px; background:#f8fafb; border-right:1px solid #e3e7eb; padding:12px; box-sizing:border-box; overflow:auto; }
      .lab-canvas { flex:1; position:relative; background:linear-gradient(180deg,#ffffff,#eef3f7); overflow:hidden; }
      .lab-toolbar { height:48px; display:flex; gap:8px; align-items:center; padding:8px; border-bottom:1px solid #e3e7eb; background:#fff; }
      .lab-item { display:flex; gap:8px; align-items:center; padding:8px; margin-bottom:8px; background:#fff; border-radius:8px; cursor:grab; box-shadow:0 1px 2px rgba(0,0,0,0.04); }
      .lab-item .swatch { width:36px; height:36px; border-radius:6px; flex:0 0 36px; }
      .lab-object { position:absolute; touch-action:none; user-select:none; cursor:grab; transition:transform 0.08s linear; }
      .chemical { padding:8px; border-radius:8px; min-width:120px; color:#111; box-shadow:0 2px 6px rgba(0,0,0,0.12); }
      .mixing-station { position:absolute; right:12px; bottom:12px; width:200px; height:140px; background:rgba(255,255,255,0.9); border-radius:10px; border:2px dashed #d1d5db; display:flex; align-items:center; justify-content:center; text-align:center; padding:12px; }
      .mix-bubble { position:absolute; border-radius:50%; pointer-events:none; opacity:0.9; mix-blend-mode:screen; }
      .microscope-panel { position:absolute; right:12px; top:12px; width:320px; height:240px; background:#fff; box-shadow:0 6px 18px rgba(0,0,0,0.12); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px; }
      .microscope-view { flex:1; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center; }
      .btn { background:#111827; color:#fff; padding:8px 12px; border-radius:6px; cursor:pointer; border:none; }
      .lab-item[title]:hover { box-shadow: 0 6px 18px rgba(0,0,0,0.08); transform: translateY(-2px); }
      .info-panel { position:absolute; right:12px; top:270px; width:260px; background:#fff; padding:10px; border-radius:8px; box-shadow:0 8px 20px rgba(0,0,0,0.12); font-size:14px; z-index:40; }
      .lab-anim-enter { animation: lab-enter .6s ease both; }
      @keyframes lab-enter { from { opacity:0; transform:scale(0.98) translateY(12px); } to { opacity:1; transform:none; } }
    `;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  // Utilities
  const $ = (sel, root = document) => root.querySelector(sel);

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => { if (c) el.appendChild(c); });
    return el;
  }

  // Drag system for toolkit -> canvas
  function makeDraggable(handle, options = {}) {
    let dragging = null;
    let offsetX = 0, offsetY = 0;

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const rect = handle.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      dragging = { el: handle, id: handle.dataset.instanceId || handle.dataset.sourceId };
      handle.classList.add('dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp, { once: true });
    });

    function onMove(e) {
      if (!dragging) return;
      const canvas = $('.lab-canvas');
      const rc = canvas.getBoundingClientRect();
      // If element was dragged from toolbar, clone it
      if (!dragging.el.classList.contains('lab-object')) {
        const clone = dragging.el.cloneNode(true);
        clone.classList.add('lab-object');
        clone.style.position = 'absolute';
        clone.style.left = (e.clientX - rc.left - offsetX) + 'px';
        clone.style.top = (e.clientY - rc.top - offsetY) + 'px';
        // unique instance id
        clone.dataset.instanceId = 'inst-' + Date.now();
        // if dragging original from sidebar, append to canvas once
        canvas.appendChild(clone);
        // set up interactive behaviors on clone
        initWorkspaceObject(clone);
        dragging.el = clone;
      } else {
        dragging.el.style.left = (e.clientX - rc.left - offsetX) + 'px';
        dragging.el.style.top = (e.clientY - rc.top - offsetY) + 'px';
      }
    }

    function onUp(e) {
      if (!dragging) return;
      dragging.el.classList.remove('dragging');
      // check if dropped in mixing station
      const mix = $('.mixing-station');
      const rc = mixingRect(mix);
      const elRc = dragging.el.getBoundingClientRect();
      if (rectsOverlap(rc, elRc)) {
        handleMixingDrop(dragging.el);
        // remove the object (simulate pouring) unless we expect it to stay
        dragging.el.remove();
      }
      saveState();
      dragging = null;
      document.removeEventListener('pointermove', onMove);
    }
  }

  function rectsOverlap(a, b) {
    return !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top);
  }

  function mixingRect(mixEl) {
    if (!mixEl) return { left:0, right:0, top:0, bottom:0 };
    return mixEl.getBoundingClientRect();
  }

  // When an object is dropped in mixing station
  const MIX_BUFFER = [];
  function handleMixingDrop(el) {
    // only chemicals can be mixed
    const type = el.dataset.type;
    if (type !== 'chemical') return;
    const id = el.dataset.sourceId;
    MIX_BUFFER.push(id);
    showMixingFeedback();

    if (MIX_BUFFER.length >= 2) {
      const a = MIX_BUFFER.shift();
      const b = MIX_BUFFER.shift();
      // run reaction
      runReaction(a, b);
    }
  }

  function showMixingFeedback() {
    const mix = $('.mixing-station');
    if (!mix) return;
    mix.style.borderColor = '#4ade80';
    setTimeout(() => mix.style.borderColor = '', 600);
  }

  function runReaction(idA, idB) {
    // very basic reaction rules (demo purposes)
    const a = ITEMS.find(x => x.id === idA);
    const b = ITEMS.find(x => x.id === idB);
    const canvas = $('.lab-canvas');
    const x = canvas.clientWidth / 2 - 40;
    const y = canvas.clientHeight / 2 - 40;

    // produce result color
    const color = mixColors(a.color || '#ddd', b.color || '#ddd');

    const result = createEl('div', { class: 'lab-object chemical', text: 'Reaction'});
    result.style.left = (x) + 'px';
    result.style.top = (y) + 'px';
    result.style.width = '120px';
    result.style.height = '80px';
    result.style.display = 'flex';
    result.style.alignItems = 'center';
    result.style.justifyContent = 'center';
    result.style.background = color;
    canvas.appendChild(result);

    // fizz animation
    fizzAt(x + 20, y + 20, color);

    setTimeout(() => {
      result.textContent = 'Product';
      saveState();
    }, 400);
  }

  function mixColors(c1, c2) {
    // simple average of RGB components
    try {
      const p1 = hexToRgb(c1);
      const p2 = hexToRgb(c2);
      const r = Math.round((p1.r + p2.r) / 2);
      const g = Math.round((p1.g + p2.g) / 2);
      const b = Math.round((p1.b + p2.b) / 2);
      return `rgb(${r}, ${g}, ${b})`;
    } catch (e) { return '#b3b3b3'; }
  }
  function hexToRgb(hex) {
    if (!hex) return {r:200,g:200,b:200};
    hex = hex.replace('#','');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function fizzAt(x, y, color) {
    const bubble = createEl('div', { class: 'mix-bubble' });
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    bubble.style.width = '12px';
    bubble.style.height = '12px';
    bubble.style.background = color;
    document.querySelector('.lab-canvas').appendChild(bubble);
    // animate
    bubble.animate([
      { transform: 'translateY(0) scale(1)', opacity: 0.9 },
      { transform: 'translateY(-40px) scale(1.8)', opacity: 0 }
    ], { duration: 900, easing: 'ease-out' }).onfinish = () => bubble.remove();
  }

  // Initialize interactive object on workspace (after clone)
  function initWorkspaceObject(el) {
    const type = el.dataset.type;
    // set accessible title if missing
    if (!el.title) el.title = el.dataset.sourceId || '';

    // simple pointer drag to position
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const canvasRect = document.querySelector('.lab-canvas').getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      function onMove(ev) {
        el.style.left = (ev.clientX - canvasRect.left - offsetX) + 'px';
        el.style.top = (ev.clientY - canvasRect.top - offsetY) + 'px';
      }
      function onUp(ev) {
        el.releasePointerCapture(ev.pointerId);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        saveState();
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp, { once: true });
    });

    // open info panel on click
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      showInfoPanelFor(el);
    });

    // Tool interactions
    if (type === 'tool' && el.dataset.sourceId === 'tool-microscope') {
      el.addEventListener('dblclick', () => openMicroscope(null));
    }

    // demo pendulum: start/stop
    if (el.dataset.sourceId === 'demo-pendulum') {
      startPendulum(el);
    }
  }

  // Microscope panel
  let microscopePanel = null;
  function openMicroscope(sample) {
    if (!microscopePanel) {
      microscopePanel = createEl('div', { class: 'microscope-panel' });
      const title = createEl('div', { text: 'Microscope' });
      const view = createEl('div', { class: 'microscope-view' });
      const slider = createEl('input', { type: 'range', min: '0.5', max: '3', step: '0.01', value: '1' });
      slider.style.width = '100%';
      microscopePanel.appendChild(title);
      microscopePanel.appendChild(view);
      microscopePanel.appendChild(slider);
      document.querySelector('.lab-canvas').appendChild(microscopePanel);

      // sample image
      const img = createEl('img', { src: sample?.image || '../assets/amoeba.png', alt: sample?.title || 'Sample' });
      img.style.width = '200%';
      img.style.transformOrigin = 'center center';
      view.appendChild(img);

      slider.addEventListener('input', (e) => {
        const s = Number(e.target.value);
        img.style.transform = `scale(${s})`;
      });
    } else {
      const img = microscopePanel.querySelector('img');
      if (img && sample) img.src = sample.image;
      microscopePanel.style.display = 'block';
    }
  }

  // Small info panel for objects
  function showInfoPanelFor(el) {
    const canvas = document.querySelector('.lab-canvas');
    if (!canvas) return;
    let panel = canvas.querySelector('.info-panel');
    if (!panel) {
      panel = createEl('div', { class: 'info-panel' });
      canvas.appendChild(panel);
    }
    const source = ITEMS.find(x => x.id === el.dataset.sourceId) || {};
    panel.innerHTML = '';
    const title = createEl('div', { html: `<strong>${source.title || el.dataset.sourceId}</strong>` });
    const subtype = createEl('div', { html: `<div style="font-size:12px;color:#666">${source.type || el.dataset.type}</div>` });
    panel.appendChild(title);
    panel.appendChild(subtype);
    if (source.formula) panel.appendChild(createEl('div', { html: `<strong>Formula:</strong> ${source.formula}` }));
    if (source.color) panel.appendChild(createEl('div', { html: `<strong>Color:</strong> <span style="display:inline-block;width:18px;height:14px;background:${source.color};margin-left:6px;border-radius:3px"></span>` }));

    const controls = createEl('div', { html: `<div style="margin-top:8px"><button class='btn' id='info-close'>Close</button> <button class='btn' id='info-zoom'>Open in Microscope</button></div>` });
    panel.appendChild(controls);

    panel.querySelector('#info-close')?.addEventListener('click', () => panel.remove());
    panel.querySelector('#info-zoom')?.addEventListener('click', () => openMicroscope(source));
  }

  // Close info when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.info-panel') && !e.target.closest('.lab-object')) {
      const p = document.querySelector('.info-panel'); if (p) p.remove();
    }
  });

  // Pendulum simulation (basic)
  function startPendulum(el) {
    // create a ball inside the element
    el.style.width = '180px';
    el.style.height = '160px';
    el.style.background = '#fff';
    const bob = createEl('div', { class: 'pendulum-bob' });
    bob.style.width = '28px';
    bob.style.height = '28px';
    bob.style.borderRadius = '50%';
    bob.style.background = '#111827';
    bob.style.position = 'absolute';
    bob.style.left = '80px';
    bob.style.top = '40px';
    el.appendChild(bob);

    let t0 = null;
    const length = 80; // px
    const omega = 1.2; // speed
    function frame(ts) {
      if (!t0) t0 = ts;
      const dt = (ts - t0) / 1000;
      const angle = Math.sin(dt * omega) * 0.6; // radians
      const x = 80 + Math.sin(angle) * length;
      const y = 40 + Math.cos(angle) * length;
      bob.style.left = x + 'px';
      bob.style.top = y + 'px';
      el._pendulumRAF = requestAnimationFrame(frame);
    }
    el._pendulumRAF = requestAnimationFrame(frame);
  }

  // Serialization: save objects on canvas
  function saveState() {
    const canvas = $('.lab-canvas');
    if (!canvas) return;
    const items = Array.from(canvas.querySelectorAll('.lab-object')).map(o => {
      const rect = o.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      return {
        sourceId: o.dataset.sourceId,
        type: o.dataset.type,
        left: rect.left - canvasRect.left,
        top: rect.top - canvasRect.top,
        html: o.innerHTML
      };
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function restoreState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const items = JSON.parse(raw);
      const canvas = $('.lab-canvas');
      items.forEach(it => {
        const source = ITEMS.find(x => x.id === it.sourceId) || {};
        const el = buildObjectElement(source);
        el.style.left = (it.left || 60) + 'px';
        el.style.top = (it.top || 60) + 'px';
        canvas.appendChild(el);
        initWorkspaceObject(el);
      });
    } catch (e) { console.warn('failed to restore lab state', e); }
  }

  function buildObjectElement(item) {
    const el = createEl('div', { class: 'lab-object' });
    el.dataset.sourceId = item.id || '';
    el.dataset.type = item.type || '';
    el.title = item.title || '';
    if (item.type === 'chemical') {
      el.classList.add('chemical');
      el.style.background = item.color || '#ddd';
      el.textContent = item.title;
      el.style.padding = '8px';
      if (item.formula) el.dataset.formula = item.formula;
    } else if (item.type === 'organism') {
      el.classList.add('organism');
      const img = createEl('img', { src: item.image || '../assets/amoeba.png', alt: item.title });
      img.style.width = '120px';
      el.appendChild(img);
      // clicking organism opens microscope preview
      el.addEventListener('dblclick', () => openMicroscope(item));
    } else if (item.type === 'tool') {
      el.classList.add('tool');
      el.style.padding = '8px';
      el.textContent = item.title;
    } else if (item.type === 'demo') {
      el.classList.add('demo');
      el.style.padding = '8px';
      el.textContent = item.title;
    }
    return el;
  }

  // Build lab UI
  function buildLab() {
    injectStyles();
    const main = $('#lab-landing');
    // hide hero and preview with fade
    const hero = $('#lab-hero');
    const preview = $('#lab-preview');
    if (hero) hero.style.transition = 'opacity 300ms ease, transform 400ms ease';
    if (preview) preview.style.transition = 'opacity 300ms ease, transform 400ms ease';
    if (hero) { hero.style.opacity = 0; hero.style.transform = 'scale(0.98) translateY(-8px)'; }
    if (preview) preview.style.opacity = 0; preview.style.transform = 'translateY(8px)';

    setTimeout(() => {
      if (hero) hero.style.display = 'none';
      if (preview) preview.style.display = 'none';

      const wrapper = createEl('div', { id: 'lab-workspace' });

      // sidebar
      const sidebar = createEl('aside', { class: 'lab-sidebar' });
      const toolbar = createEl('div', { class: 'lab-toolbar' });
      const saveBtn = createEl('button', { class: 'btn', text: 'Save' });
      const resetBtn = createEl('button', { class: 'btn', text: 'Reset' });
      const exitBtn = createEl('button', { class: 'btn', text: 'Exit' });
      toolbar.appendChild(saveBtn);
      toolbar.appendChild(resetBtn);
      toolbar.appendChild(exitBtn);
      sidebar.appendChild(toolbar);

      const itemList = createEl('div', {});
      ITEMS.forEach(it => {
        const itemEl = createEl('div', { class: 'lab-item' });
        itemEl.dataset.sourceId = it.id;
        itemEl.dataset.type = it.type;
        itemEl.title = `${it.title} (${it.type})`;
        itemEl.setAttribute('role', 'button');
        itemEl.setAttribute('tabindex', '0');
        const sw = createEl('div', { class: 'swatch' });
        if (it.type === 'chemical') sw.style.background = it.color;
        if (it.type === 'organism' && it.image) sw.style.backgroundImage = `url(${it.image})`;
        sw.style.backgroundSize = 'cover';
        const label = createEl('div', { html: `<strong>${it.title}</strong><div style="font-size:12px;color:#555">${it.type}</div>` });
        itemEl.appendChild(sw);
        itemEl.appendChild(label);
        itemList.appendChild(itemEl);
        // wire drag start (pointer) and keyboard quick-insert
        makeDraggable(itemEl);
        itemEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const canvas = document.querySelector('.lab-canvas');
            const el = buildObjectElement(it);
            el.style.left = '80px';
            el.style.top = '80px';
            canvas.appendChild(el);
            initWorkspaceObject(el);
            saveState();
          }
        });
      });
      sidebar.appendChild(itemList);

      // canvas
      const canvasWrap = createEl('section', { class: 'lab-canvas' });

      // mixing station
      const mix = createEl('div', { class: 'mixing-station', html: '<strong>Mixing Station</strong><div style="font-size:12px;color:#666">Drop chemicals here</div>' });
      canvasWrap.appendChild(mix);

      wrapper.appendChild(sidebar);
      wrapper.appendChild(canvasWrap);
      main.appendChild(wrapper);

      // Restore saved objects
      restoreState();

      // button handlers
      saveBtn.addEventListener('click', () => { saveState(); alert('Lab saved.'); });
      resetBtn.addEventListener('click', () => {
        if (!confirm('Clear the lab and reset the session?')) return;
        localStorage.removeItem(STORAGE_KEY);
        const canvas = document.querySelector('.lab-canvas');
        canvas.querySelectorAll('.lab-object').forEach(n => n.remove());
      });
      exitBtn.addEventListener('click', () => location.reload());

      // small guided animation for entry
      wrapper.classList.add('lab-anim-enter');

    }, 380);
  }

  // Enter lab button
  function wireEnterButton() {
    const btn = $('#enter-lab-btn');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      btn.disabled = true;
      btn.textContent = 'Entering…';
      document.body.style.overflow = 'hidden';
      buildLab();
    });
  }

  // Init
  function init() {
    wireEnterButton();
    // auto-restore if state exists (show quick resume)
    if (localStorage.getItem(STORAGE_KEY)) {
      const promptResume = confirm('A saved session was found. Resume your lab?');
      if (promptResume) {
        // simulate click
        $('#enter-lab-btn')?.click();
      }
    }

    // Accessibility hint: Enter key on main button
    const enterBtn = $('#enter-lab-btn');
    enterBtn?.addEventListener('keyup', (e) => { if (e.key === 'Enter') enterBtn.click(); });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();