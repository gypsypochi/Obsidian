// backend/src/routes/admin.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Carpeta data (misma estructura que venís usando)
const DATA_DIR = path.join(__dirname, "../../../data");

// Archivos que maneja el sistema (ajustá si agregás otros)
const DATA_FILES = {
  materiales: "materiales.json",
  proveedores: "proveedores.json",
  productos: "productos.json",
  producciones: "producciones.json",
  historialStock: "historial-stock.json",
  modelos: "modelos.json",
  ventas: "ventas.json",
  pedidos: "pedidos.json",
  ferias: "ferias.json",
  gastos: "gastos.json",
};

function resolvePath(filename) {
  return path.join(DATA_DIR, filename);
}

/**
 * GET /admin/backup
 * Devuelve un bundle con todos los JSON (para guardar backup en el front).
 */
router.get("/backup", (req, res) => {
  try {
    const bundle = {};
    for (const [key, filename] of Object.entries(DATA_FILES)) {
      bundle[key] = readJsonSafe(resolvePath(filename), []);
    }

    res.json({
      ok: true,
      createdAt: new Date().toISOString(),
      version: 1,
      data: bundle,
    });
  } catch (err) {
    console.error("Error creando backup:", err);
    res.status(500).json({ error: "Error creando backup" });
  }
});

/**
 * POST /admin/restore
 * Restaura TODOS los JSON desde un bundle.
 * Body esperado:
 * { confirm: "RESTAURAR", data: { materiales:[], ... } }
 */
router.post("/restore", (req, res) => {
  try {
    const { confirm, data } = req.body || {};

    if (String(confirm || "").trim().toUpperCase() !== "RESTAURAR") {
      return res.status(400).json({
        error: 'Confirmación inválida. Enviá { confirm: "RESTAURAR", data: {...} }',
      });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ error: "Falta data (bundle) para restaurar" });
    }

    // Validación mínima: asegurar que existan claves conocidas.
    // Si falta alguna, la dejamos como [] para no romper.
    const summary = {};

    for (const [key, filename] of Object.entries(DATA_FILES)) {
      const value = Array.isArray(data[key]) ? data[key] : [];
      writeJson(resolvePath(filename), value);
      summary[key] = { items: value.length };
    }

    res.json({
      ok: true,
      restoredAt: new Date().toISOString(),
      summary,
    });
  } catch (err) {
    console.error("Error restaurando backup:", err);
    res.status(500).json({ error: "Error restaurando backup" });
  }
});

/**
 * POST /admin/reset
 * Limpia todos los JSON (los deja en []).
 * Body esperado:
 * { confirm: "BORRAR_TODO", motivo: "..." }
 */
router.post("/reset", (req, res) => {
  try {
    const { confirm, motivo } = req.body || {};
    if (String(confirm || "").trim().toUpperCase() !== "BORRAR_TODO") {
      return res.status(400).json({
        error: 'Confirmación inválida. Enviá { confirm: "BORRAR_TODO", motivo: "..." }',
      });
    }

    const mot = String(motivo || "").trim();
    if (!mot) {
      return res.status(400).json({ error: "Motivo obligatorio para borrar todo" });
    }

    const summary = {};
    for (const [key, filename] of Object.entries(DATA_FILES)) {
      writeJson(resolvePath(filename), []);
      summary[key] = { items: 0 };
    }

    res.json({
      ok: true,
      resetAt: new Date().toISOString(),
      motivo: mot,
      summary,
    });
  } catch (err) {
    console.error("Error reseteando data:", err);
    res.status(500).json({ error: "Error reseteando data" });
  }
});

module.exports = router;
