// ---------------------------------------------
// 1. SIDEBAR SECTION SWITCHING
// ---------------------------------------------

const sidebarItems = document.querySelectorAll("#sidebar ul li");
const sections = document.querySelectorAll(".section");

// Show the first section by default
document.getElementById("user-info").classList.add("active");

sidebarItems.forEach(item => {
    item.addEventListener("click", () => {

        // Ignore items without a data-target (like logout)
        const target = item.getAttribute("data-target");
        if (!target) return;

        // Remove active class from all sidebar items
        sidebarItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        // Hide all sections
        sections.forEach(sec => sec.classList.remove("active"));

        // Show the selected section
        document.getElementById(target).classList.add("active");
    });
});


// ---------------------------------------------
// 2. LOAD REAL USER DATA
// ---------------------------------------------

// Example user data (replace with real backend later)
const userData = {
    name: "Cauley",
    email: "cauley@example.com",
    joinDate: "January 2025",
    lessonsCompleted: 14,
    simulationsRun: 22,
    forumPosts: 9,
    achievements: [
        "Completed 10 lessons",
        "First simulation run",
        "Joined Wonder Labs"
    ]
};

// Fill user info section
document.querySelector("#user-info").innerHTML = `
    <h2>User Information</h2>
    <p><strong>Name:</strong> ${userData.name}</p>
    <p><strong>Email:</strong> ${userData.email}</p>
    <p><strong>Member since:</strong> ${userData.joinDate}</p>
`;

// Fill stats section
document.querySelector("#stats").innerHTML = `
    <h2>Account Stats</h2>
    <p><strong>Lessons Completed:</strong> ${userData.lessonsCompleted}</p>
    <p><strong>Simulations Run:</strong> ${userData.simulationsRun}</p>
    <p><strong>Forum Posts:</strong> ${userData.forumPosts}</p>
`;

// Fill achievements section
document.querySelector("#achievements").innerHTML = `
    <h2>Achievements</h2>
    <ul>
        ${userData.achievements.map(a => `<li>${a}</li>`).join("")}
    </ul>
`;


// ---------------------------------------------
// 3. LOGOUT HANDLER
// ---------------------------------------------

const logoutItem = document.querySelector("#sidebar ul li:last-child");

logoutItem.addEventListener("click", () => {
    alert("You have been logged out.");
    // Clear user data if stored in localStorage
    localStorage.removeItem("user");
    window.location.href = "../login.html";
});