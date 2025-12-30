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

// GET /ventas - listar todas las ventas
router.get("/", (req, res) => {
  try {
    const ventas = readVentas();
    res.json(ventas);
  } catch (err) {
    console.error("Error leyendo ventas:", err);
    res.status(500).json({ error: "Error leyendo ventas" });
  }
});

// POST /ventas - registrar una venta
router.post("/", (req, res) => {
  try {
    const {
      productoId,
      cantidad,
      precioUnitario,
      canal,          // feria / online / presencial (opcional)
      feriaId,        // id de feria si canal === "feria"
      origen,         // texto libre (Instagram, conocido, etc.)
      detalleModelo,  // texto libre extra
      modeloId,       // id del modelo si elegiste uno
      categoriaModelo // categoría del modelo si se eligió
    } = req.body;

    if (!productoId) {
      return res.status(400).json({ error: "productoId es obligatorio" });
    }

    const cantNum = Number(cantidad);
    if (!cantidad || Number.isNaN(cantNum) || cantNum <= 0) {
      return res
        .status(400)
        .json({ error: "cantidad debe ser un número mayor a 0" });
    }

    const productos = readProductos();
    const modelos = readModelos();

    const productoIndex = productos.findIndex((p) => p.id === productoId);
    if (productoIndex === -1) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = productos[productoIndex];

    // Por defecto, si no hay controlStock, lo tomamos como "automatico"
    const controlStock = producto.controlStock || "automatico";

    const stockActual = producto.stock || 0;

    // Solo validamos stock cuando el producto es automático
    if (controlStock === "automatico") {
      if (stockActual < cantNum) {
        return res.status(400).json({
          error: "Stock insuficiente para realizar la venta",
          detalle: {
            stockActual,
            cantidadSolicitada: cantNum,
          },
        });
      }
    }

    // Determinar precioUnitario a usar:
    let precioUnitarioNum;
    if (precioUnitario !== undefined && precioUnitario !== null) {
      precioUnitarioNum = Number(precioUnitario);
      if (Number.isNaN(precioUnitarioNum) || precioUnitarioNum < 0) {
        return res.status(400).json({
          error: "precioUnitario debe ser un número mayor o igual a 0",
        });
      }
    } else {
      precioUnitarioNum = Number(producto.precio || 0);
    }

    const montoTotal = precioUnitarioNum * cantNum;

    const stockAntes = stockActual;
    let stockDespues = stockAntes;

    // Solo bajamos stock del producto si es automático
    if (controlStock === "automatico") {
      stockDespues = stockAntes - cantNum;
      productos[productoIndex].stock = stockDespues;
      writeProductos(productos);
    }

    // 🔹 Actualizar stockModelo si corresponde (sin dejarlo negativo)
    if (controlStock === "automatico" && modeloId) {
      const modelosLista = Array.isArray(modelos) ? [...modelos] : [];
      const idxModelo = modelosLista.findIndex((m) => m.id === modeloId);
      if (idxModelo !== -1) {
        const actual = Number(modelosLista[idxModelo].stockModelo || 0);
        let nuevoStockModelo = actual - cantNum;

        // Si por migración o ventas viejas da negativo, lo pisamos en 0
        if (nuevoStockModelo < 0) {
          nuevoStockModelo = 0;
        }

        modelosLista[idxModelo].stockModelo = nuevoStockModelo;
        writeModelos(modelosLista);
      }
    }

    // Registrar venta en ventas.json
    const ventas = readVentas();
    const nuevaVenta = {
      id: `venta-${Date.now()}`,
      productoId,
      cantidad: cantNum,
      precioUnitario: precioUnitarioNum,
      montoTotal,
      fecha: new Date().toISOString(),

      // campos de canal
      canal: canal || null, // "feria" | "online" | "presencial" | null
      feriaId: canal === "feria" && feriaId ? feriaId : null,
      origen: origen || null,

      // detalle modelo (texto libre) + referencia al modelo real y categoría
      detalleModelo: detalleModelo || null,
      modeloId: modeloId || null,
      categoriaModelo: categoriaModelo || null,
    };
    ventas.push(nuevaVenta);
    writeVentas(ventas);

    // Registrar movimiento en historial-stock.json solo si el producto
    // se maneja con stock automático
    if (controlStock === "automatico") {
      const historial = readHistorialStock();
      const nuevoMovimiento = {
        id: `mov-${Date.now()}-venta`,
        productoId,
        tipoMovimiento: "venta",
        cantidad: -cantNum, // cambio de stock (negativo)
        stockAntes,
        stockDespues,
        ventaId: nuevaVenta.id,
        fecha: nuevaVenta.fecha,
      };
      historial.push(nuevoMovimiento);
      writeHistorialStock(historial);
    }

    res.status(201).json({
      venta: nuevaVenta,
      productoActualizado: productos[productoIndex],
    });
  } catch (err) {
    console.error("Error registrando venta:", err);
    res.status(500).json({ error: "Error interno registrando venta" });
  }
});

module.exports = router;
