// backend/src/routes/pedidos.js
const express = require("express");
const router = express.Router();

const {
  readPedidos,
  writePedidos,
  readProductos,
  writeProductos,
  readVentas,
  writeVentas,
  readHistorialStock,
  writeHistorialStock,
} = require("../utils/fileDB");

// Estados permitidos
const ESTADOS_VALIDOS = [
  "pendiente",
  "en_produccion",
  "listo",
  "entregado",
  "cancelado",
];

// GET /pedidos - listar todos
router.get("/", (req, res) => {
  try {
    const pedidos = readPedidos();
    res.json(pedidos);
  } catch (err) {
    console.error("Error leyendo pedidos:", err);
    res.status(500).json({ error: "Error leyendo pedidos" });
  }
});

// POST /pedidos - crear nuevo pedido
router.post("/", (req, res) => {
  try {
    const { cliente, productoId, cantidad, notas } = req.body;

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
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const pedidos = readPedidos();

    const nuevoPedido = {
      id: `ped-${Date.now()}`,
      cliente: (cliente || "").toString().trim(),
      estado: "pendiente",
      items: [
        {
          productoId,
          cantidad: cantNum,
        },
      ],
      notas: (notas || "").toString().trim(),
      fechaCreacion: new Date().toISOString(),
      fechaEntrega: null,
      ventasIds: [],
    };

    pedidos.push(nuevoPedido);
    writePedidos(pedidos);

    res.status(201).json(nuevoPedido);
  } catch (err) {
    console.error("Error creando pedido:", err);
    res.status(500).json({ error: "Error interno creando pedido" });
  }
});

// PUT /pedidos/:id - actualizar (estado / cliente / notas)
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { estado, cliente, notas } = req.body;

    const pedidos = readPedidos();
    const idx = pedidos.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const pedido = pedidos[idx];
    const estadoAnterior = pedido.estado;

    // Actualizar datos básicos
    if (cliente !== undefined) {
      pedido.cliente = cliente.toString().trim();
    }
    if (notas !== undefined) {
      pedido.notas = notas.toString().trim();
    }

    // Si no se cambia estado, solo guardamos cambios básicos
    if (estado === undefined || estado === estadoAnterior) {
      pedidos[idx] = pedido;
      writePedidos(pedidos);
      return res.json(pedido);
    }

    // Validar estado nuevo
    if (!ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    // Si pasamos a ENTREGADO -> impactar stock + ventas + historial
    if (estado === "entregado") {
      if (estadoAnterior === "entregado") {
        return res
          .status(400)
          .json({ error: "El pedido ya estaba marcado como entregado" });
      }

      const productos = readProductos();
      const ventas = readVentas();
      const historial = readHistorialStock();

      // Validar stock suficiente para TODOS los items antes de tocar nada
      const faltantes = [];

      for (const item of pedido.items) {
        const prod = productos.find((p) => p.id === item.productoId);
        if (!prod) {
          faltantes.push({
            productoId: item.productoId,
            motivo: "Producto no encontrado",
          });
          continue;
        }
        const stockActual = prod.stock || 0;
        if (stockActual < item.cantidad) {
          faltantes.push({
            productoId: item.productoId,
            nombreProducto: prod.nombre,
            stockActual,
            cantidadRequerida: item.cantidad,
          });
        }
      }

      if (faltantes.length > 0) {
        return res.status(400).json({
          error:
            "Stock insuficiente para marcar el pedido como entregado. Revisá los productos.",
          faltantes,
        });
      }

      // Si hay stock suficiente, aplicamos cambios:
      const nuevasVentasIds = [];

      for (const item of pedido.items) {
        const prodIndex = productos.findIndex(
          (p) => p.id === item.productoId
        );
        if (prodIndex === -1) continue; // ya validado arriba

        const prod = productos[prodIndex];
        const stockAntes = prod.stock || 0;
        const cantidadVendida = item.cantidad;
        const stockDespues = stockAntes - cantidadVendida;

        // Actualizar stock
        productos[prodIndex].stock = stockDespues;

        // Precio unitario: desde producto
        const precioUnitarioNum = Number(prod.precio || 0);
        const montoTotal = precioUnitarioNum * cantidadVendida;

        // Crear venta
        const nuevaVenta = {
          id: `venta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productoId: item.productoId,
          cantidad: cantidadVendida,
          precioUnitario: precioUnitarioNum,
          montoTotal,
          fecha: new Date().toISOString(),
        };
        ventas.push(nuevaVenta);
        nuevasVentasIds.push(nuevaVenta.id);

        // Movimiento de historial
        const nuevoMovimiento = {
          id: `mov-${Date.now()}-venta-pedido-${Math.floor(
            Math.random() * 1000
          )}`,
          productoId: item.productoId,
          tipoMovimiento: "venta",
          cantidad: -cantidadVendida,
          stockAntes,
          stockDespues,
          ventaId: nuevaVenta.id,
          pedidoId: pedido.id,
          fecha: nuevaVenta.fecha,
        };
        historial.push(nuevoMovimiento);
      }

      // Guardar cambios en productos, ventas, historial
      writeProductos(productos);
      writeVentas(ventas);
      writeHistorialStock(historial);

      // Actualizar pedido
      pedido.estado = "entregado";
      pedido.fechaEntrega = new Date().toISOString();
      pedido.ventasIds = (pedido.ventasIds || []).concat(nuevasVentasIds);
    } else {
      // Cambio de estado normal (pendiente / en_produccion / listo / cancelado)
      pedido.estado = estado;
    }

    pedidos[idx] = pedido;
    writePedidos(pedidos);

    res.json(pedido);
  } catch (err) {
    console.error("Error actualizando pedido:", err);
    res.status(500).json({ error: "Error interno actualizando pedido" });
  }
});

module.exports = router;
