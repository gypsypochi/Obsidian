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

  // ✅ NUEVO: materiales
  readMaterials,
  writeMaterials,
} = require("../utils/fileDB");

function normTipoBase(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function parsePosInt(v) {
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

// ✅ Para STICKER: si hay UN (1) producto base general tipo STICKER, impactamos stock ahí.
// Si hay varios, usamos el seleccionado.
function resolveStockTarget(productos, productoSeleccionado) {
  const tipo = normTipoBase(productoSeleccionado?.tipoBase);
  if (tipo !== "STICKER") return productoSeleccionado;

  const basesSticker = productos.filter(
    (p) => p?.esBase === true && normTipoBase(p?.tipoBase) === "STICKER"
  );

  if (basesSticker.length === 1) return basesSticker[0];
  return productoSeleccionado;
}

// Normaliza consumos de materiales (array opcional)
function normalizeMaterialesConsumidos(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => ({
      materialId: String(x?.materialId || "").trim(),
      cantidad: Number(x?.cantidad),
    }))
    .filter((x) => x.materialId && !Number.isNaN(x.cantidad) && x.cantidad > 0);
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
// ingreso de stock (producción o compra)
// body recomendado:
// {
//   productoBaseId,
//   tipoMovimiento:"produccion"|"compra",
//   cantidad?,
//   modeloId?,
//   detalle?,
//   // stickers:
//   planchasBuenas?,
//   unidadesBuenas?,
//   // ✅ NUEVO (solo producción):
//   materialesConsumidos?: [{ materialId, cantidad }]
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

      // ✅ NUEVO
      materialesConsumidos,
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

    // producto seleccionado (variante elegida en UI)
    const productos = readProductos();
    const idxSel = productos.findIndex((p) => p.id === productoBaseId);
    if (idxSel === -1) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const prodSeleccionado = productos[idxSel];

    // mantenemos regla: se opera sobre variantes base (esBase === true)
    if (prodSeleccionado.esBase !== true) {
      return res
        .status(400)
        .json({ error: "El producto seleccionado no es una variante base (esBase)" });
    }

    const tipoBaseSel = normTipoBase(prodSeleccionado.tipoBase);

    // ✅ resolver target real del stock (para stickers: stock general)
    const prodTarget = resolveStockTarget(productos, prodSeleccionado);
    const idxTarget = productos.findIndex((p) => p.id === prodTarget.id);
    if (idxTarget === -1) {
      return res.status(500).json({ error: "No se pudo resolver producto de stock" });
    }

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

        if (tipoBaseSel === "STICKER" && tipoModelo === "STICKER" && upp > 0) {
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

    // compra: detalle obligatorio
    const detalleFinal = String(detalle || "").trim();
    if (mov === "compra" && !detalleFinal) {
      return res.status(400).json({ error: "En compras, detalle es obligatorio" });
    }

    // ========= ✅ MATERIALES (solo producción) =========
    const consumos = mov === "produccion" ? normalizeMaterialesConsumidos(materialesConsumidos) : [];

    if (mov === "produccion" && consumos.length > 0) {
      const materiales = readMaterials();

      // Validación fuerte: existencia + stock suficiente
      for (const c of consumos) {
        const idxMat = materiales.findIndex((m) => m.id === c.materialId);
        if (idxMat === -1) {
          return res.status(400).json({ error: `Material no encontrado: ${c.materialId}` });
        }

        const stockMat = Number(materiales[idxMat].stock || 0);
        const cantCons = Number(c.cantidad || 0);

        if (Number.isNaN(cantCons) || cantCons <= 0) {
          return res.status(400).json({ error: "Cantidad de material consumido inválida" });
        }

        if (stockMat < cantCons) {
          return res.status(400).json({
            error: `Stock insuficiente en material "${materiales[idxMat].nombre || c.materialId}"`,
            detalle: { materialId: c.materialId, stockActual: stockMat, cantidadSolicitada: cantCons },
          });
        }
      }

      // Descontar
      for (const c of consumos) {
        const idxMat = materiales.findIndex((m) => m.id === c.materialId);
        const stockMat = Number(materiales[idxMat].stock || 0);
        materiales[idxMat].stock = stockMat - Number(c.cantidad);
      }

      writeMaterials(materiales);
    }

    // ========= sumar stock producto TARGET =========
    const stockAntes = Number(productos[idxTarget].stock || 0);
    const stockDespues = stockAntes + cantFinal;

    productos[idxTarget].stock = stockDespues;
    writeProductos(productos);

    // ========= sumar stockModelo (solo si viene modeloId y existe) =========
    // (para stickers suma UNIDADES; para otros suma cantidad directa)
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

      // lo que eligió el usuario (variante)
      productoBaseId: prodSeleccionado.id,

      // donde impactó el stock real (para stickers puede ser otro)
      productoStockId: prodTarget.id,

      tipoBase: tipoBaseSel,

      modeloId: mov === "produccion" ? (modeloId || null) : null,

      // cantidad final sumada
      cantidad: cantFinal,
      incrementoStock: cantFinal,

      // extras (auditoría stickers)
      stickerInfo: stickerInfo || null,

      // ✅ NUEVO: auditoría de consumos
      materialesConsumidos: mov === "produccion" ? consumos : [],

      detalle: detalleFinal,
      fecha: new Date().toISOString(),
    };

    producciones.push(nueva);
    writeProducciones(producciones);

    // historial stock (productos)
    const historial = readHistorialStock();
    historial.push({
      id: `hist-${Date.now()}`,
      // impacta stock real del producto
      productoId: prodTarget.id,
      tipoMovimiento: mov,
      cantidad: cantFinal,
      stockAntes,
      stockDespues,
      produccionId: nueva.id,
      fecha: nueva.fecha,

      // auditoría
      productoVarianteId: prodSeleccionado.id,
      modeloId: nueva.modeloId,
      detalle: nueva.detalle,
      stickerInfo: nueva.stickerInfo,
    });
    writeHistorialStock(historial);

    res.status(201).json({
      movimiento: nueva,

      // ✅ mantenemos tus nombres actuales
      productoStockActualizado: productos[idxTarget],
      productoVariante: prodSeleccionado,

      // ✅ ALIAS para que el front no dependa del nombre
      productoBaseActualizado: productos[idxTarget],
    });
  } catch (err) {
    console.error("Error registrando ingreso:", err);
    res.status(500).json({ error: "Error interno registrando ingreso" });
  }
});

module.exports = router;
