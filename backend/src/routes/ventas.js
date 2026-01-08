// backend/src/routes/ventas.js
const express = require("express");
const router = express.Router();

const {
  readProductos,
  writeProductos,
  readVentas,
  writeVentas,
  readHistorialStock,
  writeHistorialStock,
  readModelos,
  writeModelos,
} = require("../utils/fileDB");

function normTipoBase(v) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "_");
}

// Resuelve el producto “stock general STICKER”
// - si hay 1 base sticker -> ese
// - si hay varios -> si mandan productoStockId, usa ese; si no, error
function resolveStickerStockProduct(productos, productoStockId) {
  const basesSticker = (productos || []).filter(
    (p) => p?.esBase === true && normTipoBase(p?.tipoBase) === "STICKER"
  );

  if (basesSticker.length === 1) return basesSticker[0];

  if (productoStockId) {
    const p = productos.find((x) => x.id === productoStockId);
    if (p && p.esBase === true && normTipoBase(p.tipoBase) === "STICKER") return p;
  }

  return null;
}

// GET /ventas
router.get("/", (req, res) => {
  try {
    const ventas = readVentas();
    res.json(ventas);
  } catch (err) {
    console.error("Error leyendo ventas:", err);
    res.status(500).json({ error: "Error leyendo ventas" });
  }
});

// POST /ventas
// V2 soporta 2 flujos:
//
// A) STICKERS (promos)
// {
//   tipoBase: "STICKER",
//   promos: 16,
//   unidadesPorPromo: 5,        // default 5
//   precioPorPromo: 1000,       // default 1000
//   detalle,
//   canal, feriaId, origen,
//   productoStockId?            // solo si hay varios base sticker
// }
//
// B) NO-STICKERS (detalle)
// {
//   productoId,                 // puede ser base o variante (lo que tenga stock real)
//   cantidad,
//   precioUnitario,
//   canal, feriaId, origen,
//   modeloId?,
//   detalle?
// }
//
// (Se mantiene compatibilidad parcial con el body anterior si te quedó algún front viejo.)
router.post("/", (req, res) => {
  try {
    const {
      // flujo sticker
      tipoBase,
      promos,
      unidadesPorPromo,
      precioPorPromo,
      productoStockId, // opcional si hay múltiples base sticker

      // flujo normal
      productoId,
      productoBaseId, // compat viejo
      cantidad,
      precioUnitario,
      modeloId,

      canal,
      feriaId,
      origen,
      detalle,
    } = req.body;

    const productos = readProductos();

    // ----------------------------
    // ✅ FLUJO STICKERS (promos)
    // ----------------------------
    const tipoNorm = normTipoBase(tipoBase);

    if (tipoNorm === "STICKER") {
      const promosNum = Number(promos);
      const upu = unidadesPorPromo === undefined || unidadesPorPromo === null ? 5 : Number(unidadesPorPromo);
      const ppp = precioPorPromo === undefined || precioPorPromo === null ? 1000 : Number(precioPorPromo);

      if (Number.isNaN(promosNum) || promosNum <= 0) {
        return res.status(400).json({ error: "promos debe ser un número mayor a 0" });
      }
      if (Number.isNaN(upu) || upu <= 0) {
        return res.status(400).json({ error: "unidadesPorPromo debe ser un número mayor a 0" });
      }
      if (Number.isNaN(ppp) || ppp < 0) {
        return res.status(400).json({ error: "precioPorPromo inválido (>=0)" });
      }

      const prodSticker = resolveStickerStockProduct(productos, productoStockId);
      if (!prodSticker) {
        return res.status(400).json({
          error:
            "No se pudo resolver el producto base STICKER para stock general. Revisá que exista (esBase=true, tipoBase=STICKER) y que sea único, o mandá productoStockId.",
        });
      }

      const idxTarget = productos.findIndex((p) => p.id === prodSticker.id);
      if (idxTarget === -1) return res.status(500).json({ error: "No se pudo resolver producto de stock" });

      const controlStock = productos[idxTarget].controlStock || "automatico";
      const stockActual = Number(productos[idxTarget].stock || 0);

      const unidadesVendidas = promosNum * upu;
      const montoTotal = promosNum * ppp;
      const precioUnit = unidadesVendidas > 0 ? montoTotal / unidadesVendidas : 0;

      if (controlStock === "automatico" && stockActual < unidadesVendidas) {
        return res.status(400).json({
          error: "Stock insuficiente para realizar la venta de stickers",
          detalle: { stockActual, unidadesVendidas },
        });
      }

      const stockAntes = stockActual;
      let stockDespues = stockAntes;

      if (controlStock === "automatico") {
        stockDespues = stockAntes - unidadesVendidas;
        productos[idxTarget].stock = stockDespues;
        writeProductos(productos);
      }

      const ventas = readVentas();
      const nuevaVenta = {
        id: `venta-${Date.now()}`,
        fecha: new Date().toISOString(),

        tipoBase: "STICKER",
        productoStockId: prodSticker.id, // donde impactó stock real
        productoId: null, // no aplica

        // datos promo
        promos: promosNum,
        unidadesPorPromo: upu,
        unidadesVendidas,
        precioPorPromo: ppp,

        // auditoría general
        cantidad: unidadesVendidas, // para compat con tablas actuales
        precioUnitario: Number(precioUnit.toFixed(2)),
        montoTotal,

        canal: canal || null,
        feriaId: canal === "feria" && feriaId ? feriaId : null,
        origen: canal !== "feria" ? (origen || null) : null,

        detalle: String(detalle || "").trim() || null,

        modeloId: null, // stickers no usan modelos en venta
      };

      ventas.push(nuevaVenta);
      writeVentas(ventas);

      if (controlStock === "automatico") {
        const historial = readHistorialStock();
        historial.push({
          id: `mov-${Date.now()}-venta-sticker`,
          productoId: prodSticker.id,
          tipoMovimiento: "venta",
          cantidad: -unidadesVendidas,
          stockAntes,
          stockDespues,
          ventaId: nuevaVenta.id,
          fecha: nuevaVenta.fecha,

          tipoBase: "STICKER",
          detalle: nuevaVenta.detalle,
          promo: true,
          promos: promosNum,
          unidadesPorPromo: upu,
        });
        writeHistorialStock(historial);
      }

      return res.status(201).json({
        venta: nuevaVenta,
        productoStockActualizado: productos[idxTarget],
      });
    }

    // ----------------------------
    // ✅ FLUJO NORMAL (NO-STICKER)
    // ----------------------------
    const productoIdFinal = productoId || productoBaseId; // compat viejo

    if (!productoIdFinal) {
      return res.status(400).json({ error: "productoId es obligatorio para NO-STICKERS" });
    }

    const cantNum = Number(cantidad);
    if (Number.isNaN(cantNum) || cantNum <= 0) {
      return res.status(400).json({ error: "cantidad debe ser un número mayor a 0" });
    }

    const idxSel = productos.findIndex((p) => p.id === productoIdFinal);
    if (idxSel === -1) return res.status(404).json({ error: "Producto no encontrado" });

    const prodSel = productos[idxSel];
    const tipoBaseSel = normTipoBase(prodSel.tipoBase);

    // 🧠 en NO-STICKERS el stock impacta en el mismo producto seleccionado (base o variante)
    const idxTarget = idxSel;

    const controlStock = productos[idxTarget].controlStock || "automatico";
    const stockActual = Number(productos[idxTarget].stock || 0);

    const precioNum =
      precioUnitario !== undefined && precioUnitario !== null
        ? Number(precioUnitario)
        : Number(productos[idxTarget].precio || 0);

    if (Number.isNaN(precioNum) || precioNum < 0) {
      return res.status(400).json({ error: "precioUnitario inválido (>=0)" });
    }

    if (controlStock === "automatico" && stockActual < cantNum) {
      return res.status(400).json({
        error: "Stock insuficiente para realizar la venta",
        detalle: { stockActual, cantidadSolicitada: cantNum },
      });
    }

    const stockAntes = stockActual;
    let stockDespues = stockAntes;

    if (controlStock === "automatico") {
      stockDespues = stockAntes - cantNum;
      productos[idxTarget].stock = stockDespues;
      writeProductos(productos);
    }

    // stockModelo informativo (solo si hay modeloId)
    const modeloIdFinal = modeloId || null;
    if (controlStock === "automatico" && modeloIdFinal) {
      const modelos = readModelos();
      const idxModelo = modelos.findIndex((m) => m.id === modeloIdFinal);
      if (idxModelo !== -1) {
        const actual = Number(modelos[idxModelo].stockModelo || 0);
        let nuevo = actual - cantNum;
        if (nuevo < 0) nuevo = 0;
        modelos[idxModelo].stockModelo = nuevo;
        writeModelos(modelos);
      }
    }

    const montoTotal = precioNum * cantNum;

    const ventas = readVentas();
    const nuevaVenta = {
      id: `venta-${Date.now()}`,
      fecha: new Date().toISOString(),

      tipoBase: tipoBaseSel,
      productoId: prodSel.id, // el que vendiste (base o variante)
      productoStockId: prodSel.id, // donde impactó stock

      cantidad: cantNum,
      precioUnitario: precioNum,
      montoTotal,

      canal: canal || null,
      feriaId: canal === "feria" && feriaId ? feriaId : null,
      origen: canal !== "feria" ? (origen || null) : null,

      detalle: String(detalle || "").trim() || null,
      modeloId: modeloIdFinal,

      // campos promo stickers (null acá)
      promos: null,
      unidadesPorPromo: null,
      unidadesVendidas: null,
      precioPorPromo: null,
    };

    ventas.push(nuevaVenta);
    writeVentas(ventas);

    if (controlStock === "automatico") {
      const historial = readHistorialStock();
      historial.push({
        id: `mov-${Date.now()}-venta`,
        productoId: prodSel.id,
        tipoMovimiento: "venta",
        cantidad: -cantNum,
        stockAntes,
        stockDespues,
        ventaId: nuevaVenta.id,
        fecha: nuevaVenta.fecha,

        tipoBase: tipoBaseSel,
        modeloId: modeloIdFinal,
        detalle: nuevaVenta.detalle,
      });
      writeHistorialStock(historial);
    }

    res.status(201).json({
      venta: nuevaVenta,
      productoStockActualizado: productos[idxTarget],
      productoVendido: prodSel,
    });
  } catch (err) {
    console.error("Error registrando venta:", err);
    res.status(500).json({ error: "Error interno registrando venta" });
  }
});

module.exports = router;
