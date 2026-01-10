document.addEventListener("DOMContentLoaded", () => {
  const announcementsEl = document.getElementById("announcements");
  const adminPanel = document.getElementById("admin-announcements");
  const form = document.getElementById("announcement-form");

  const currentUser = localStorage.getItem("currentUser");
  const admins = ["Admin123"]; // add more admin usernames here

  /* ------------------------
     ADMIN VISIBILITY
  ------------------------- */
  if (admins.includes(currentUser)) {
    adminPanel.style.display = "block";
  }

  /* ------------------------
     STORAGE HELPERS
  ------------------------- */
  function getAnnouncements() {
    return JSON.parse(localStorage.getItem("announcements") || "[]");
  }

  function saveAnnouncements(data) {
    localStorage.setItem("announcements", JSON.stringify(data));
    renderAnnouncements();
  }

  /* ------------------------
     RENDER ANNOUNCEMENTS
  ------------------------- */
  let editingTs = null;

  function renderAnnouncements() {
    const announcements = getAnnouncements();

    if (announcements.length === 0) {
      announcementsEl.innerHTML =
        "<p style='text-align:center;'>No announcements yet 📭</p>";
      return;
    }

    announcementsEl.innerHTML = announcements
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(a => `
        <article class="announcement ${a.priority}" data-ts="${a.timestamp}">
          <div class="ann-body">
            <h3>${a.title}</h3>
            <p>${a.message}</p>
            <small>
              ${new Date(a.timestamp).toLocaleString()} • 
              <strong>${a.priority.toUpperCase()}</strong>
            </small>
          </div>
          ${admins.includes(currentUser) ? `
            <div class="controls">
              <button class="edit-btn" data-ts="${a.timestamp}">Edit</button>
              <button class="delete-btn" data-ts="${a.timestamp}">Delete</button>
            </div>
          ` : ''}
        </article>
      `)
      .join("");

    // attach admin actions (if visible)
    if (admins.includes(currentUser)) {
      announcementsEl.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => startEdit(Number(btn.dataset.ts)));
      });

      announcementsEl.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAnnouncement(Number(btn.dataset.ts)));
      });
    }
  }

  function startEdit(ts) {
    const announcements = getAnnouncements();
    const item = announcements.find(a => a.timestamp === ts);
    if (!item) return;

    document.getElementById("announcement-title").value = item.title;
    document.getElementById("announcement-message").value = item.message;
    document.getElementById("announcement-priority").value = item.priority;

    form.dataset.editing = ts;
    editingTs = ts;
    document.getElementById('announcement-submit').textContent = '💾 Save Changes';
    document.getElementById('announcement-cancel').style.display = 'inline-block';
    // scroll to admin form for convenience
    adminPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelEdit() {
    form.reset();
    delete form.dataset.editing;
    editingTs = null;
    document.getElementById('announcement-submit').textContent = '📢 Publish Announcement';
    document.getElementById('announcement-cancel').style.display = 'none';
  }

  function deleteAnnouncement(ts) {
    if (!confirm('Delete this announcement? This cannot be undone.')) return;
    const announcements = getAnnouncements().filter(a => a.timestamp !== ts);
    saveAnnouncements(announcements);

    if (form.dataset.editing && Number(form.dataset.editing) === ts) {
      cancelEdit();
    }
  }

  /* ------------------------
     FORM SUBMIT (ADMIN)
  ------------------------- */
  form?.addEventListener("submit", e => {
    e.preventDefault();

    const title = document.getElementById("announcement-title").value.trim();
    const message = document.getElementById("announcement-message").value.trim();
    const priority = document.getElementById("announcement-priority").value;

    if (!title || !message) return;

    let announcements = getAnnouncements();

    if (form.dataset.editing) {
      const ts = Number(form.dataset.editing);
      const idx = announcements.findIndex(a => a.timestamp === ts);
      if (idx > -1) {
        announcements[idx] = {
          ...announcements[idx],
          title,
          message,
          priority,
          timestamp: Date.now(), // push edited to top
          author: currentUser
        };
      }
      cancelEdit();
    } else {
      announcements.push({
        title,
        message,
        priority,
        author: currentUser,
        timestamp: Date.now()
      });
    }

    saveAnnouncements(announcements);
    form.reset();
  });

  document.getElementById('announcement-cancel')?.addEventListener('click', cancelEdit);

  renderAnnouncements();
});
