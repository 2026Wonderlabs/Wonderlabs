// -----------------------------
// ELEMENT REFERENCES
// -----------------------------
const topicItems = document.querySelectorAll("#topic-list li");
const topicGroups = document.querySelectorAll(".topic-group");
const questionItems = document.querySelectorAll(".topic-group li");
const detailsBox = document.getElementById("details-content");
const collabBox = document.getElementById("collab-options");

// -----------------------------
// TOPIC FILTERING
// -----------------------------
topicItems.forEach(item => {
  item.addEventListener("click", () => {
    // Highlight selected topic
    topicItems.forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const topic = item.dataset.topic;

    // Show only matching groups
    topicGroups.forEach(group => {
      if (group.dataset.topic === topic) {
        group.style.display = "block";
      } else {
        group.style.display = "none";
      }
    });

    // Reset details panel
    detailsBox.innerHTML = "<p>Select a question to view details.</p>";
    collabBox.classList.add("hidden");
  });
});

// -----------------------------
// QUESTION SELECTION
// -----------------------------
questionItems.forEach(q => {
  q.addEventListener("click", () => {
    const questionText = q.textContent;
    const questionId = q.dataset.id;

    // Load details
    detailsBox.innerHTML = `
      <h3>${questionText}</h3>
      <p><strong>Question ID:</strong> ${questionId}</p>
      <p>This is one of the major unsolved scientific questions. Choose how you want to work on it.</p>
    `;

    // Show collaboration options
    collabBox.classList.remove("hidden");
  });
});

// -----------------------------
// COLLABORATION BUTTONS
// -----------------------------
collabBox.addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;

  const mode = e.target.dataset.mode;

  if (mode === "solo") {
    alert("Starting a solo workspace...");
  }

  if (mode === "team") {
    alert("Creating a team room...");
  }

  if (mode === "public") {
    alert("Joining the public room...");
  }
});