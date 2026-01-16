async function loadScienceNews() {
    const url = "https://content.guardianapis.com/science?api-key=test&show-fields=trailText,body,shortUrl";

    try {
        const response = await fetch(url);
        const data = await response.json();

        const container = document.getElementById("science-news");
        container.innerHTML = "";

        data.response.results.forEach(article => {
            const item = document.createElement("div");
            item.className = "news-item";

            item.innerHTML = `
                <h3>${article.webTitle}</h3>
                <p>${article.fields?.trailText || ""}</p>
                <button class="read-more-btn">Read more</button>
                <hr>
            `;

            // Open modal when clicked
            item.querySelector(".read-more-btn").addEventListener("click", () => {
                openModal(article);
            });

            container.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading news:", error);
    }
}

function openModal(article) {
    document.getElementById("modal-title").textContent = article.webTitle;

    // Guardian returns HTML in fields.body
    const body = article.fields?.body;
    const trail = article.fields?.trailText;

    document.getElementById("modal-body").innerHTML =
        body || trail || "<p>No preview available.</p>";

    document.getElementById("modal-link").href = article.webUrl;

    document.getElementById("news-modal").style.display = "flex";
}

// Close button
document.getElementById("modal-close").addEventListener("click", () => {
    document.getElementById("news-modal").style.display = "none";
});

// Click outside modal to close
document.getElementById("news-modal").addEventListener("click", (e) => {
    if (e.target.id === "news-modal") {
        document.getElementById("news-modal").style.display = "none";
    }
});

loadScienceNews();