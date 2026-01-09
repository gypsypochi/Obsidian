// backend/src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const materialesRoutes = require("./routes/materiales");
const proveedoresRoutes = require("./routes/proveedores");
const productosRoutes = require("./routes/productos");
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

// NUEVO: gastos
const gastosRoutes = require("./routes/gastos");

// ✅ NUEVO: admin
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
// ✅ subimos el límite para poder restaurar backups grandes
app.use(express.json({ limit: "20mb" }));

// Servir archivos estáticos subidos (imagenes / pdf)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, name: "obsidian-api", time: new Date().toISOString() });
});

// Rutas API
app.use("/materiales", materialesRoutes);
app.use("/proveedores", proveedoresRoutes);
app.use("/productos", productosRoutes);
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

// NUEVO: gastos
app.use("/gastos", gastosRoutes);

// ✅ NUEVO: admin
app.use("/admin", adminRoutes);

// =========================
// Servir FRONTEND (build Vite)
// =========================
const frontendPath = path.join(__dirname, "../../frontend/dist");

// Servir archivos estáticos del build
app.use(express.static(frontendPath));

// Para React Router: devolver siempre index.html en rutas no-API
// (Express 5: usamos app.use en vez de app.get("*"))
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Obsidian API running on http://localhost:${PORT}`);
});
