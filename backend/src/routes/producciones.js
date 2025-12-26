// backend/src/routes/producciones.js
const express = require("express");
const router = express.Router();

const {
  readProductos,
  writeProductos,
  readMaterials,
  writeMaterials,
  readRecetas,
  readProducciones,
  writeProducciones,
  readHistorialStock,
  writeHistorialStock,
  // NUEVO: para validar modeloId
  readModelos,
} = require("../utils/fileDB");

// GET /producciones - listar historial de producciones
router.get("/", (req, res) => {
  try {
    const producciones = readProducciones();
    res.json(producciones);
  } catch (err) {
    console.error("Error leyendo producciones:", err);
    res.status(500).json({ error: "Error leyendo producciones" });
  }
});

// POST /producciones - registrar una producción
router.post("/", (req, res) => {
  try {
    const { productoId, cantidad, unidadesBuenas, modeloId } = req.body;

    if (!productoId) {
      return res.status(400).json({ error: "productoId es obligatorio" });
    }

    if (
      cantidad === undefined ||
      typeof cantidad !== "number" ||
      cantidad <= 0
    ) {
      return res
        .status(400)
        .json({ error: "cantidad debe ser un número mayor a 0" });
    }

    const productos = readProductos();
    const materiales = readMaterials();
    const recetas = readRecetas();

    const producto = productos.find((p) => p.id === productoId);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const recetasProducto = recetas.filter((r) => r.productoId === productoId);
    if (recetasProducto.length === 0) {
      return res
        .status(400)
        .json({ error: "El producto no tiene receta asociada" });
    }

    // Asumimos mismo tipoProduccion para todas las filas de receta de ese producto
    const tipoProduccion = recetasProducto[0].tipoProduccion || "unidad";

    // ✅ NUEVO: validar modeloId (si viene) contra modelos.json
    let modeloAsociado = null;
    if (modeloId) {
      const modelos = readModelos();
      modeloAsociado = modelos.find((m) => m.id === modeloId);

      if (!modeloAsociado) {
        return res
          .status(400)
          .json({ error: "Modelo asociado no encontrado" });
      }

      if (modeloAsociado.productoId !== productoId) {
        return res.status(400).json({
          error:
            "El modelo seleccionado no pertenece al producto indicado. Revisá la selección.",
        });
      }
    }

    // Si es lote, unidadesBuenas es obligatorio (porque el rendimiento es variable)
    let unidadesBuenasNum = undefined;
    if (tipoProduccion === "lote") {
      if (unidadesBuenas === undefined) {
        return res.status(400).json({
          error:
            "Para productos de tipo 'lote' tenés que indicar cuántas unidades buenas vas a sumar (unidadesBuenas)",
        });
      }
      unidadesBuenasNum = Number(unidadesBuenas);
      if (Number.isNaN(unidadesBuenasNum) || unidadesBuenasNum <= 0) {
        return res.status(400).json({
          error:
            "unidadesBuenas debe ser un número mayor a 0 para productos de tipo 'lote'",
        });
      }
    }

    // Calculamos requerimientos de materiales
    const requerimientos = recetasProducto.map((r) => {
      const material = materiales.find((m) => m.id === r.materialId);

      if (!material) {
        throw new Error(
          `Material de receta no encontrado (materialId: ${r.materialId})`
        );
      }

      // factor = cantidad de producción (unidades o lotes)
      const factor = cantidad;
      const cantidadNecesaria = (r.cantidad || 0) * factor;

      return {
        materialId: material.id,
        nombreMaterial: material.nombre,
        requerido: cantidadNecesaria,
        stockActual: material.stock || 0,
      };
    });

    // Verificar stock suficiente
    const faltantes = requerimientos.filter(
      (req) => req.requerido > req.stockActual
    );

    if (faltantes.length > 0) {
      return res.status(400).json({
        error: "Stock insuficiente para producir la cantidad indicada",
        detalles: faltantes.map((f) => ({
          materialId: f.materialId,
          nombreMaterial: f.nombreMaterial,
          requerido: f.requerido,
          stockActual: f.stockActual,
        })),
      });
    }

    // Descontar materiales
    for (const reqMat of requerimientos) {
      const idx = materiales.findIndex((m) => m.id === reqMat.materialId);
      if (idx !== -1) {
        materiales[idx].stock =
          (materiales[idx].stock || 0) - reqMat.requerido;
      }
    }

    // Aumentar stock del producto
    const productoIndex = productos.findIndex((p) => p.id === productoId);

    const stockAntes = productos[productoIndex].stock || 0;

    let incrementoStock;
    if (tipoProduccion === "lote") {
      // En lote, sumamos la cantidad real de unidades buenas
      incrementoStock = unidadesBuenasNum;
    } else {
      // En unidad, 1 producción = 1 unidad
      incrementoStock = cantidad;
    }

    const stockDespues = stockAntes + incrementoStock;
    productos[productoIndex].stock = stockDespues;

    // Guardar cambios en materiales y productos
    writeMaterials(materiales);
    writeProductos(productos);

    // Registrar la producción en producciones.json
    const producciones = readProducciones();
    const nuevaProduccion = {
      id: `prodop-${Date.now()}`,
      productoId,
      cantidad, // unidades o lotes, según tipoProduccion
      tipoProduccion,
      unidadesBuenas: tipoProduccion === "lote" ? incrementoStock : null,
      incrementoStock,
      // ✅ guardamos modeloId si vino (sino null)
      modeloId: modeloAsociado ? modeloAsociado.id : null,
      fecha: new Date().toISOString(),
      materialesUsados: requerimientos.map((r) => ({
        materialId: r.materialId,
        cantidad: r.requerido,
      })),
    };

    producciones.push(nuevaProduccion);
    writeProducciones(producciones);

    // 📌 Registro en historial-stock.json
    const historial = readHistorialStock();
    const nuevoMovimiento = {
      id: `mov-${Date.now()}`,
      productoId,
      tipoMovimiento: "produccion",
      cantidad: incrementoStock, // cuánto cambió el stock (+)
      stockAntes,
      stockDespues,
      produccionId: nuevaProduccion.id,
      fecha: nuevaProduccion.fecha,
    };
    historial.push(nuevoMovimiento);
    writeHistorialStock(historial);

    res.status(201).json({
      produccion: nuevaProduccion,
      productoActualizado: productos[productoIndex],
    });
  } catch (err) {
    console.error("Error registrando producción:", err);
    res.status(500).json({ error: "Error interno registrando producción" });
  }
});

module.exports = router;
