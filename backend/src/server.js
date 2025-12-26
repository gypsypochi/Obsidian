const express = require("express");
const cors = require("cors");

const materialesRoutes = require("./routes/materiales");
const proveedoresRoutes = require("./routes/proveedores");
const productosRoutes = require("./routes/productos");
const recetasRoutes = require("./routes/recetas"); // NUEVO
const produccionesRoutes = require("./routes/producciones");


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
app.use("/proveedores", proveedoresRoutes);
app.use("/productos", productosRoutes);
app.use("/recetas", recetasRoutes); // NUEVO
app.use("/producciones", produccionesRoutes);


app.listen(PORT, () => {
  console.log(`✅ Obsidian API running on http://localhost:${PORT}`);
});
