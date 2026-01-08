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

function normTipoBase(v) {
  return String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function parsePosInt(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

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
// body recomendado:
// {
//   productoBaseId,
//   tipoMovimiento:"produccion"|"compra",
//   cantidad?,
//   modeloId?,
//   detalle?,
//   // stickers:
//   planchasBuenas?,
//   unidadesBuenas?
// }
router.post("/", (req, res) => {
  try {
    const {
      productoBaseId,
      tipoMovimiento,
      cantidad,
      modeloId,
      detalle,
      planchasBuenas,
      unidadesBuenas,
    } = req.body;

    if (!productoBaseId) {
      return res.status(400).json({ error: "productoBaseId es obligatorio" });
    }

    const mov = String(tipoMovimiento || "produccion").toLowerCase();
    if (!["produccion", "compra"].includes(mov)) {
      return res
        .status(400)
        .json({ error: "tipoMovimiento inválido (produccion|compra)" });
    }

    // producto
    const productos = readProductos();
    const idx = productos.findIndex((p) => p.id === productoBaseId);
    if (idx === -1) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const prod = productos[idx];

    // mantenemos la regla: el stock se suma a "variantes base" (esBase === true)
    if (prod.esBase !== true) {
      return res
        .status(400)
        .json({ error: "El producto seleccionado no es una variante base (esBase)" });
    }

    const tipoBaseProd = normTipoBase(prod.tipoBase);

    // ========= determinar cantidad final a sumar =========
    let cantFinal = null;

    // ✅ Caso stickers: si viene modelo y el modelo tiene unidadesPorPlancha,
    // podemos calcular desde planchasBuenas, o usar unidadesBuenas override.
    let stickerInfo = null;

    if (mov === "produccion" && modeloId) {
      const modelos = readModelos();
      const m = modelos.find((x) => x.id === modeloId);

      if (m) {
        const tipoModelo = normTipoBase(m.productoBaseTipo);
        const upp = Number(m.unidadesPorPlancha || 0);

        if (tipoBaseProd === "STICKER" && tipoModelo === "STICKER" && upp > 0) {
          // prioridad: unidadesBuenas override
          if (unidadesBuenas !== undefined && String(unidadesBuenas).trim() !== "") {
            const ub = parsePosInt(unidadesBuenas);
            if (!ub) return res.status(400).json({ error: "unidadesBuenas inválidas" });
            cantFinal = ub;
            stickerInfo = { unidadesPorPlancha: upp, planchasBuenas: null, unidadesBuenas: ub };
          } else if (planchasBuenas !== undefined && String(planchasBuenas).trim() !== "") {
            const pb = parsePosInt(planchasBuenas);
            if (!pb) return res.status(400).json({ error: "planchasBuenas inválidas" });
            cantFinal = pb * upp;
            stickerInfo = { unidadesPorPlancha: upp, planchasBuenas: pb, unidadesBuenas: cantFinal };
          }
        }
      }
    }

    // fallback: cantidad directa
    if (cantFinal === null) {
      const cant = parsePosInt(cantidad);
      if (!cant) {
        return res
          .status(400)
          .json({ error: "cantidad debe ser un número mayor a 0" });
      }
      cantFinal = cant;
    }

    // compra: detalle obligatorio (recomendación fuerte)
    const detalleFinal = String(detalle || "").trim();
    if (mov === "compra" && !detalleFinal) {
      return res
        .status(400)
        .json({ error: "En compras, detalle es obligatorio" });
    }

    // ========= sumar stock producto =========
    const stockAntes = Number(prod.stock || 0);
    const stockDespues = stockAntes + cantFinal;
    productos[idx].stock = stockDespues;
    writeProductos(productos);

    // ========= sumar stockModelo (solo si viene modeloId y existe) =========
    // (para stickers esto suma UNIDADES; para otros suma cantidad directa)
    if (mov === "produccion" && modeloId) {
      const modelos = readModelos();
      const idxModelo = modelos.findIndex((m) => m.id === modeloId);
      if (idxModelo !== -1) {
        const actual = Number(modelos[idxModelo].stockModelo || 0);
        modelos[idxModelo].stockModelo = actual + cantFinal;
        writeModelos(modelos);
      }
    }

    // ========= guardar movimiento =========
    const producciones = readProducciones();
    const nueva = {
      id: `mov-${Date.now()}`,
      tipoMovimiento: mov, // "produccion" | "compra"
      productoBaseId,
      modeloId: mov === "produccion" ? (modeloId || null) : null,

      // cantidad final sumada
      cantidad: cantFinal,
      incrementoStock: cantFinal,

      // extras (auditoría stickers)
      stickerInfo: stickerInfo || null,

      detalle: detalleFinal,
      fecha: new Date().toISOString(),
    };

    producciones.push(nueva);
    writeProducciones(producciones);

    // historial stock
    const historial = readHistorialStock();
    historial.push({
      id: `hist-${Date.now()}`,
      productoId: productoBaseId,
      tipoMovimiento: mov,
      cantidad: cantFinal,
      stockAntes,
      stockDespues,
      produccionId: nueva.id,
      fecha: nueva.fecha,
      modeloId: nueva.modeloId,
      detalle: nueva.detalle,
      stickerInfo: nueva.stickerInfo,
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
