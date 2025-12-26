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
    const { productoId, cantidad, precioUnitario } = req.body;

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
    const productoIndex = productos.findIndex((p) => p.id === productoId);
    if (productoIndex === -1) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const producto = productos[productoIndex];

    const stockActual = producto.stock || 0;
    if (stockActual < cantNum) {
      return res.status(400).json({
        error: "Stock insuficiente para realizar la venta",
        detalle: {
          stockActual,
          cantidadSolicitada: cantNum,
        },
      });
    }

    // Determinar precioUnitario a usar:
    // si viene en el body, lo usamos; si no, usamos el precio del producto.
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
    const stockDespues = stockAntes - cantNum;

    // Actualizar stock del producto
    productos[productoIndex].stock = stockDespues;
    writeProductos(productos);

    // Registrar venta en ventas.json
    const ventas = readVentas();
    const nuevaVenta = {
      id: `venta-${Date.now()}`,
      productoId,
      cantidad: cantNum,
      precioUnitario: precioUnitarioNum,
      montoTotal,
      fecha: new Date().toISOString(),
    };
    ventas.push(nuevaVenta);
    writeVentas(ventas);

    // Registrar movimiento en historial-stock.json
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
