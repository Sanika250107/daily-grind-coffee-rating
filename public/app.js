const grid = document.getElementById("coffee-grid");
const searchInput = document.getElementById("search");
const roastFilter = document.getElementById("roast-filter");
const showMoreBtn = document.getElementById("show-more");
const resultsLabel = document.getElementById("results-label");
const notice = document.getElementById("notice");
let coffees = [];
let visibleCount = 12;
let votingIds = new Set();
let noticeTimer;

const palettes = {
  Brazil: ["#ead6bf", "#c7d0b5"],
  Colombia: ["#e9c9a7", "#e4d6b9"],
  Ethiopia: ["#d6d8c1", "#e9c5a7"],
  India: ["#d7c2ad", "#c8d3c0"]
};

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function showNotice(message) {
  notice.textContent = message;
  notice.classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove("show"), 2600);
}
function formatRating(value) { return Number(value).toFixed(1); }

async function fetchCoffees() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (roastFilter.value !== "All") params.set("roast", roastFilter.value);
  grid.innerHTML = '<div class="loading">Brewing the collection…</div>';
  try {
    const response = await fetch(`/api/coffees?${params}`);
    if (!response.ok) throw new Error("Could not load coffees");
    coffees = await response.json();
    renderGrid();
    updateStats();
  } catch (error) {
    grid.innerHTML = '<div class="empty">Could not load the coffee collection. Please refresh and try again.</div>';
  }
}
function renderGrid() {
  const shown = coffees.slice(0, visibleCount);
  if (!shown.length) grid.innerHTML = '<div class="empty">No blends found. Try a different search.</div>';
  else grid.innerHTML = shown.map((coffee, index) => {
    const palette = palettes[coffee.origin] || ["#e7d6c3", "#c9d2bb"];
    return `
      <article class="coffee-card">
        <div class="card-art" style="--artbg:${palette[index % palette.length]}">
          <span class="origin-tag">${escapeHTML(coffee.origin)}</span><div class="mini-cup"></div>
        </div>
        <div class="card-body">
          <div class="card-top">
            <div><h3>${escapeHTML(coffee.name)}</h3><div class="roast">${escapeHTML(coffee.roast)} roast · ${escapeHTML(coffee.origin)}</div></div>
            <div class="rating"><span>★</span>${formatRating(coffee.rating)}</div>
          </div>
          <div class="vote-meta"><span>${Number(coffee.votes).toLocaleString()} community votes</span><span>Rate this blend</span></div>
          <div class="stars" aria-label="Rate ${escapeHTML(coffee.name)} from 1 to 5 stars">
            ${[1,2,3,4,5].map(score => `<button class="star-btn" type="button" data-id="${coffee.id}" data-score="${score}" aria-label="Give ${score} stars to ${escapeHTML(coffee.name)}" title="${score} star${score>1?'s':''}">★</button>`).join("")}
          </div>
          <div class="vote-help">Tap a star to cast your vote</div>
        </div>
      </article>`;
  }).join("");
  resultsLabel.textContent = `Showing ${shown.length} of ${coffees.length} blends`;
  showMoreBtn.hidden = visibleCount >= coffees.length;
  grid.querySelectorAll(".star-btn").forEach(button => {
    button.addEventListener("click", () => vote(Number(button.dataset.id), Number(button.dataset.score), button));
  });
}
async function vote(id, score, button) {
  if (votingIds.has(id)) return;
  votingIds.add(id);
  grid.querySelectorAll(`.star-btn[data-id="${id}"]`).forEach(b => b.disabled = true);
  try {
    const response = await fetch(`/api/coffees/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Vote failed");
    const index = coffees.findIndex(item => item.id === id);
    if (index !== -1) coffees[index] = payload.coffee;
    renderGrid();
    updateStats();
    await loadLeaderboard();
    showNotice(`Your ${score}-star vote has been saved. Thanks for rating!`);
  } catch (error) {
    showNotice(error.message || "Could not save vote. Please try again.");
  } finally {
    votingIds.delete(id);
  }
}
function updateStats() {
  document.getElementById("coffee-count").textContent = coffees.length || 60;
  document.getElementById("vote-count").textContent = coffees.reduce((sum, coffee) => sum + Number(coffee.votes), 0).toLocaleString();
  const top = [...coffees].sort((a,b) => b.rating-a.rating)[0];
  document.getElementById("top-score").textContent = top ? formatRating(top.rating) + " ★" : "—";
}
async function loadLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  try {
    const response = await fetch("/api/leaderboard?limit=5");
    if (!response.ok) throw new Error("Leaderboard unavailable");
    const leaders = await response.json();
    container.innerHTML = leaders.map((coffee, index) => `
      <div class="leader-row">
        <div class="rank">${String(index + 1).padStart(2, "0")}</div>
        <div><div class="leader-name">${escapeHTML(coffee.name)}</div><div class="leader-sub">${escapeHTML(coffee.origin)} · ${escapeHTML(coffee.roast)} roast</div></div>
        <div class="leader-score"><span>★</span> ${formatRating(coffee.rating)}<small>${Number(coffee.votes).toLocaleString()} votes</small></div>
      </div>`).join("");
  } catch {
    container.innerHTML = '<div class="empty">Leaderboard is temporarily unavailable.</div>';
  }
}
let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { visibleCount = 12; fetchCoffees(); }, 180);
});
roastFilter.addEventListener("change", () => { visibleCount = 12; fetchCoffees(); });
showMoreBtn.addEventListener("click", () => { visibleCount += 12; renderGrid(); });
fetchCoffees();
loadLeaderboard();
