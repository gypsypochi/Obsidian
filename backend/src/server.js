const express = require("express");
const cors = require("cors");

const materialesRoutes = require("./routes/materiales");
const proveedoresRoutes = require("./routes/proveedores"); // <-- NUEVO

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, name: "obsidian-api", time: new Date().toISOString() });
});

// Rutas
app.use("/materiales", materialesRoutes);
app.use("/proveedores", proveedoresRoutes); // <-- NUEVO

app.listen(PORT, () => {
  console.log(`✅ Obsidian API running on http://localhost:${PORT}`);
});
