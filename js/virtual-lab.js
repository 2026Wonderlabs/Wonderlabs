const sidebar = document.getElementById("sidebar"); //get the sidebar element
const toggleBtn = document.getElementById("toggleBtn");//this will toggle the sidebar visibility

toggleBtn.addEventListener("click", () => { //toggle the "open" class on sidebar
    sidebar.classList.toggle("open"); // Toggle the "open" class on sidebar
});