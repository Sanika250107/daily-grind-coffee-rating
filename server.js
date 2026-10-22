const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "coffees.json");
const SEED_FILE = path.join(__dirname, "coffee_rating_seed.json");

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
  const coffees = seed.map(item => ({
    ...item,
    rating: Number(item.rating),
    votes: Number(item.votes),
    ratingSum: Number(item.rating) * Number(item.votes)
  }));
  saveData(coffees);
  return coffees;
}

function saveData(coffees) {
  const tempFile = DATA_FILE + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(coffees, null, 2), "utf8");
  fs.renameSync(tempFile, DATA_FILE);
}

let coffees = loadData();
let writeQueue = Promise.resolve();

function publicCoffee(coffee) {
  return {
    id: coffee.id,
    name: coffee.name,
    origin: coffee.origin,
    roast: coffee.roast,
    rating: Math.round(Number(coffee.rating) * 100) / 100,
    votes: Number(coffee.votes)
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/coffees", (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  const roast = String(req.query.roast || "All");
  let result = coffees;
  if (search) {
    result = result.filter(c =>
      `${c.name} ${c.origin} ${c.roast}`.toLowerCase().includes(search)
    );
  }
  if (roast !== "All") result = result.filter(c => c.roast === roast);
  res.json(result.map(publicCoffee));
});

app.get("/api/leaderboard", (req, res) => {
  const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
  const leaders = [...coffees]
    .sort((a, b) => Number(b.rating) - Number(a.rating) || Number(b.votes) - Number(a.votes))
    .slice(0, limit);
  res.json(leaders.map(publicCoffee));
});

app.post("/api/coffees/:id/vote", async (req, res) => {
  const id = Number(req.params.id);
  const score = Number(req.body.score);
  if (!Number.isInteger(id) || !Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: "Provide a coffee ID and a score from 1 to 5." });
  }
  const coffee = coffees.find(c => Number(c.id) === id);
  if (!coffee) return res.status(404).json({ error: "Coffee not found." });

  // Serialize writes so simultaneous votes do not overwrite each other.
  const update = writeQueue.then(() => {
    const current = coffees.find(c => Number(c.id) === id);
    current.ratingSum = Number(current.ratingSum ?? (current.rating * current.votes)) + score;
    current.votes = Number(current.votes) + 1;
    current.rating = current.ratingSum / current.votes;
    saveData(coffees);
    return publicCoffee(current);
  });
  writeQueue = update.then(() => undefined, () => undefined);

  try {
    const updated = await update;
    res.json({ message: "Vote saved", coffee: updated });
  } catch (error) {
    console.error("Failed to save vote:", error);
    res.status(500).json({ error: "Could not save your vote. Please try again." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Coffee Rating App running at http://localhost:${PORT}`);
});
