// backend/src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const materialesRoutes = require("./routes/materiales");
const proveedoresRoutes = require("./routes/proveedores");
const productosRoutes = require("./routes/productos");
const recetasRoutes = require("./routes/recetas");
const produccionesRoutes = require("./routes/producciones");
const historialRoutes = require("./routes/historial");
const ventasRoutes = require("./routes/ventas");
const pedidosRoutes = require("./routes/pedidos");

// NUEVO: ferias
const feriasRoutes = require("./routes/ferias");

// NUEVO: modelos
const modelosRoutes = require("./routes/modelos");

// NUEVO: rutas de upload
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos subidos (imagenes / pdf)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, name: "obsidian-api", time: new Date().toISOString() });
});

// Rutas
app.use("/materiales", materialesRoutes);
app.use("/proveedores", proveedoresRoutes);
app.use("/productos", productosRoutes);
app.use("/recetas", recetasRoutes);
app.use("/producciones", produccionesRoutes);
app.use("/historial", historialRoutes);
app.use("/ventas", ventasRoutes);
app.use("/pedidos", pedidosRoutes);

// NUEVO: ferias
app.use("/ferias", feriasRoutes);

// NUEVO: modelos
app.use("/modelos", modelosRoutes);

// NUEVO: endpoint para subir archivos
app.use("/upload", uploadRoutes);

app.listen(PORT, () => {
  console.log(`✅ Obsidian API running on http://localhost:${PORT}`);
});
