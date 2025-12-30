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
  readModelos,
  writeModelos,
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

    if (cantidad === undefined || typeof cantidad !== "number" || cantidad <= 0) {
      return res
        .status(400)
        .json({ error: "cantidad debe ser un número mayor a 0" });
    }

    const productos = readProductos();
    const materiales = readMaterials();
    const recetas = readRecetas();
    const modelos = readModelos();

    const producto = productos.find((p) => p.id === productoId);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const controlStock = producto.controlStock || "automatico";

    const recetasProducto = recetas.filter((r) => r.productoId === productoId);
    if (recetasProducto.length === 0) {
      return res
        .status(400)
        .json({ error: "El producto no tiene receta asociada" });
    }

    const tipoProduccion = recetasProducto[0].tipoProduccion || "unidad";

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

      const factor = cantidad;
      const cantidadNecesaria = (r.cantidad || 0) * factor;

      return {
        materialId: material.id,
        nombreMaterial: material.nombre,
        requerido: cantidadNecesaria,
        stockActual: material.stock || 0,
      };
    });

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

    // Descontar materiales SIEMPRE
    for (const reqMat of requerimientos) {
      const idx = materiales.findIndex((m) => m.id === reqMat.materialId);
      if (idx !== -1) {
        materiales[idx].stock =
          (materiales[idx].stock || 0) - reqMat.requerido;
      }
    }

    const productoIndex = productos.findIndex((p) => p.id === productoId);

    let incrementoStock;
    if (tipoProduccion === "lote") {
      incrementoStock = unidadesBuenasNum;
    } else {
      incrementoStock = cantidad;
    }

    const stockAntes = productos[productoIndex].stock || 0;
    let stockDespues = stockAntes;

    if (controlStock === "automatico") {
      stockDespues = stockAntes + incrementoStock;
      productos[productoIndex].stock = stockDespues;
    }

    // Guardar materiales y productos
    writeMaterials(materiales);
    writeProductos(productos);

    // 🔹 NUEVO: actualizar stockModelo si corresponde
    if (controlStock === "automatico" && modeloId) {
      const modelosLista = Array.isArray(modelos) ? [...modelos] : [];
      const idxModelo = modelosLista.findIndex((m) => m.id === modeloId);
      if (idxModelo !== -1) {
        const actual = Number(modelosLista[idxModelo].stockModelo || 0);
        modelosLista[idxModelo].stockModelo = actual + incrementoStock;
        writeModelos(modelosLista);
      }
    }

    const producciones = readProducciones();
    const nuevaProduccion = {
      id: `prodop-${Date.now()}`,
      productoId,
      modeloId: modeloId || null,
      cantidad,
      tipoProduccion,
      unidadesBuenas: tipoProduccion === "lote" ? incrementoStock : null,
      incrementoStock,
      fecha: new Date().toISOString(),
      materialesUsados: requerimientos.map((r) => ({
        materialId: r.materialId,
        cantidad: r.requerido,
      })),
    };

    producciones.push(nuevaProduccion);
    writeProducciones(producciones);

    if (controlStock === "automatico") {
      const historial = readHistorialStock();
      const nuevoMovimiento = {
        id: `mov-${Date.now()}`,
        productoId,
        tipoMovimiento: "produccion",
        cantidad: incrementoStock,
        stockAntes,
        stockDespues,
        produccionId: nuevaProduccion.id,
        fecha: nuevaProduccion.fecha,
        modeloId: modeloId || null,
      };
      historial.push(nuevoMovimiento);
      writeHistorialStock(historial);
    }

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
