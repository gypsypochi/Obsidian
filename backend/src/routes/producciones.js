// backend/src/routes/producciones.js
const express = require("express");
const router = express.Router();

const {
  readProductos,
  writeProductos,
  readProducciones,
  writeProducciones,
  readHistorialStock,
  writeHistorialStock,
  readModelos,
  writeModelos,
} = require("../utils/fileDB");

// GET /producciones
router.get("/", (req, res) => {
  try {
    const producciones = readProducciones();
    res.json(producciones);
  } catch (err) {
    console.error("Error leyendo producciones:", err);
    res.status(500).json({ error: "Error leyendo producciones" });
  }
});

// POST /producciones
// ✅ ingreso de stock (producción o compra)
// body:
// { productoBaseId, tipoMovimiento:"produccion"|"compra", cantidad, modeloId?, detalle? }
router.post("/", (req, res) => {
  try {
    const { productoBaseId, tipoMovimiento, cantidad, modeloId, detalle } = req.body;

    if (!productoBaseId) {
      return res.status(400).json({ error: "productoBaseId es obligatorio" });
    }

    const mov = String(tipoMovimiento || "produccion").toLowerCase();
    if (!["produccion", "compra"].includes(mov)) {
      return res.status(400).json({ error: "tipoMovimiento inválido (produccion|compra)" });
    }

    const cant = Number(cantidad);
    if (Number.isNaN(cant) || cant <= 0) {
      return res.status(400).json({ error: "cantidad debe ser un número mayor a 0" });
    }

    const productos = readProductos();
    const idx = productos.findIndex((p) => p.id === productoBaseId);

    if (idx === -1) {
      return res.status(404).json({ error: "Producto base no encontrado" });
    }

    const prod = productos[idx];
    if (prod.esBase !== true) {
      return res.status(400).json({ error: "El producto seleccionado no es un producto base" });
    }

    // sumar stock producto base
    const stockAntes = Number(prod.stock || 0);
    const stockDespues = stockAntes + cant;
    productos[idx].stock = stockDespues;
    writeProductos(productos);

    // sumar stock al modelo SOLO si viene modeloId (y existe)
    if (modeloId) {
      const modelos = readModelos();
      const idxModelo = modelos.findIndex((m) => m.id === modeloId);
      if (idxModelo !== -1) {
        const actual = Number(modelos[idxModelo].stockModelo || 0);
        modelos[idxModelo].stockModelo = actual + cant;
        writeModelos(modelos);
      }
    }

    const producciones = readProducciones();
    const nueva = {
      id: `mov-${Date.now()}`,
      tipoMovimiento: mov, // "produccion" | "compra"
      productoBaseId,
      modeloId: modeloId || null,
      cantidad: cant,
      incrementoStock: cant,
      detalle: String(detalle || "").trim(), // ✅ para “7 Mafalda + 7 Ghibli”
      fecha: new Date().toISOString(),
    };

    producciones.push(nueva);
    writeProducciones(producciones);

    const historial = readHistorialStock();
    historial.push({
      id: `hist-${Date.now()}`,
      productoId: productoBaseId,
      tipoMovimiento: mov,
      cantidad: cant,
      stockAntes,
      stockDespues,
      produccionId: nueva.id,
      fecha: nueva.fecha,
      modeloId: modeloId || null,
      detalle: nueva.detalle,
    });
    writeHistorialStock(historial);

    res.status(201).json({
      movimiento: nueva,
      productoBaseActualizado: productos[idx],
    });
  } catch (err) {
    console.error("Error registrando ingreso:", err);
    res.status(500).json({ error: "Error interno registrando ingreso" });
  }
});

module.exports = router;
