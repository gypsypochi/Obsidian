const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, name: "obsidian-api", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Obsidian API running on http://localhost:${PORT}`);
});
