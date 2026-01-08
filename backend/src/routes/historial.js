// backend/src/routes/historial.js
const express = require("express");
const router = express.Router();

const {
  readHistorialStock,
  writeHistorialStock,
  readProductos,
  writeProductos,
  readModelos,
  writeModelos,
  readProducciones,
  readMaterials,
  writeMaterials,
} = require("../utils/fileDB");

function normTipoBase(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function safeNum(v, def = 0) {
  const n = Number(v);
  return Number.isNaN(n) ? def : n;
}

function findMaterialesConsumidosDeProduccion(produccionId) {
  if (!produccionId) return [];
  try {
    const prods = readProducciones();
    const p = (prods || []).find((x) => x.id === produccionId);
    const arr = Array.isArray(p?.materialesConsumidos) ? p.materialesConsumidos : [];
    return arr
      .map((x) => ({
        materialId: String(x?.materialId || "").trim(),
        cantidad: Number(x?.cantidad),
      }))
      .filter((x) => x.materialId && !Number.isNaN(x.cantidad) && x.cantidad > 0);
  } catch {
    return [];
  }
}

// GET /historial
router.get("/", (req, res) => {
  try {
    const historial = readHistorialStock();
    res.json(historial);
  } catch (err) {
    console.error("Error leyendo historial de stock:", err);
    res.status(500).json({ error: "Error leyendo historial de stock" });
  }
});

/**
 * POST /historial/:id/deshacer
 * Body:
 * {
 *   motivo: "me equivoqué al cargar",
 *   reponerMateriales?: true|false (default true)
 * }
 *
 * Crea un movimiento inverso ("reversion") y marca el original como revertido.
 */
router.post("/:id/deshacer", (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const motivo = String(body.motivo || "").trim();
    const reponerMateriales =
      body.reponerMateriales === undefined ? true : Boolean(body.reponerMateriales);

    if (!motivo) {
      return res.status(400).json({ error: "El motivo es obligatorio para deshacer." });
    }

    const historial = readHistorialStock();
    const idx = (historial || []).findIndex((m) => m.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Movimiento no encontrado en historial" });
    }

    const original = historial[idx];

    // No revertimos reversiones
    if (String(original.tipoMovimiento || "").toLowerCase() === "reversion") {
      return res.status(400).json({ error: "No se puede deshacer una reversión" });
    }

    // No revertir 2 veces
    if (original.revertido === true) {
      return res.status(400).json({ error: "Este movimiento ya fue deshecho anteriormente" });
    }

    const productoId = String(original.productoId || "").trim();
    if (!productoId) {
      return res.status(400).json({ error: "Movimiento inválido: falta productoId" });
    }

    const cantidadOriginal = safeNum(original.cantidad, 0);
    if (!cantidadOriginal) {
      return res.status(400).json({ error: "Movimiento inválido: cantidad inválida" });
    }

    // delta inverso: si original fue +10 => delta -10; si original fue -5 => delta +5
    const delta = -cantidadOriginal;

    const productos = readProductos();
    const idxProd = (productos || []).findIndex((p) => p.id === productoId);

    if (idxProd === -1) {
      return res.status(404).json({ error: "Producto no encontrado para este movimiento" });
    }

    const stockAntes = safeNum(productos[idxProd].stock, 0);
    const stockDespues = stockAntes + delta;

    // Evitar stock negativo
    if (stockDespues < 0) {
      return res.status(400).json({
        error: "No se puede deshacer: el stock quedaría negativo",
        detalle: { stockAntes, delta, stockDespues },
      });
    }

    // ✅ Aplicar al producto
    productos[idxProd].stock = stockDespues;
    writeProductos(productos);

    // ✅ Ajuste de stockModelo si aplica (informativo)
    const modeloId = original.modeloId ? String(original.modeloId).trim() : "";
    if (modeloId) {
      try {
        const modelos = readModelos();
        const idxMod = (modelos || []).findIndex((m) => m.id === modeloId);
        if (idxMod !== -1) {
          const actual = safeNum(modelos[idxMod].stockModelo, 0);
          let nuevo = actual + delta;
          if (nuevo < 0) nuevo = 0;
          modelos[idxMod].stockModelo = nuevo;
          writeModelos(modelos);
        }
      } catch (e) {
        console.error("Error ajustando stockModelo en deshacer:", e.message);
      }
    }

    // ✅ Reponer materiales si correspondía (producción con consumos)
    const tipoMovOrig = String(original.tipoMovimiento || "").toLowerCase();
    const produccionId = original.produccionId ? String(original.produccionId).trim() : "";

    let materialesRepuestos = [];
    if (reponerMateriales && tipoMovOrig === "produccion" && produccionId) {
      const consumos = findMaterialesConsumidosDeProduccion(produccionId);

      if (consumos.length > 0) {
        try {
          const materiales = readMaterials();
          for (const c of consumos) {
            const idxMat = materiales.findIndex((m) => m.id === c.materialId);
            if (idxMat !== -1) {
              const stockMat = safeNum(materiales[idxMat].stock, 0);
              materiales[idxMat].stock = stockMat + Number(c.cantidad);
              materialesRepuestos.push({
                materialId: c.materialId,
                cantidad: Number(c.cantidad),
              });
            }
          }
          writeMaterials(materiales);
        } catch (e) {
          console.error("Error reponiendo materiales en deshacer:", e.message);
        }
      }
    }

    // ✅ Crear reversión en historial
    const fechaRev = new Date().toISOString();
    const reversionId = `hist-${Date.now()}-reversion`;

    const reversion = {
      id: reversionId,
      productoId,
      tipoMovimiento: "reversion",
      cantidad: delta,
      stockAntes,
      stockDespues,
      fecha: fechaRev,

      // vínculo
      reversionDe: original.id,

      // auditoría
      tipoBase: original.tipoBase ? normTipoBase(original.tipoBase) : null,
      modeloId: modeloId || null,
      detalle: `Reversión: ${motivo}`,
      materialesRepuestos: materialesRepuestos.length > 0 ? materialesRepuestos : null,

      ventaId: original.ventaId || null,
      produccionId: original.produccionId || null,
      productoVarianteId: original.productoVarianteId || null,
      stickerInfo: original.stickerInfo || null,
    };

    // ✅ Marcar original como revertido
    historial[idx] = {
      ...original,
      revertido: true,
      revertidoFecha: fechaRev,
      revertidoPor: reversionId,
      revertidoMotivo: motivo,
    };

    historial.push(reversion);
    writeHistorialStock(historial);

    return res.status(201).json({
      ok: true,
      original: historial[idx],
      reversion,
      productoStock: productos[idxProd],
      materialesRepuestos,
    });
  } catch (err) {
    console.error("Error deshaciendo movimiento en historial:", err);
    res.status(500).json({ error: "Error interno deshaciendo movimiento" });
  }
});

module.exports = router;
