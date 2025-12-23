const express = require("express");
const router = express.Router();
const { readProductos, writeProductos } = require("../utils/fileDB");

// GET /productos
router.get("/", (req, res) => {
  const productos = readProductos();
  res.json(productos);
});

// POST /productos
router.post("/", (req, res) => {
  const { nombre, categoria, precio, stock, unidad, proveedorId } = req.body;

  if (!nombre || String(nombre).trim() === "") {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  if (stock !== undefined && typeof stock !== "number") {
    return res.status(400).json({ error: "Stock debe ser numérico" });
  }

  if (precio !== undefined && typeof precio !== "number") {
    return res.status(400).json({ error: "Precio debe ser numérico" });
  }

  const productos = readProductos();

  const nuevoProducto = {
    id: `prod-${Date.now()}`,
    nombre: String(nombre).trim(),
    categoria: categoria ? String(categoria).trim() : "",
    precio: precio ?? 0,
    stock: stock ?? 0,
    unidad: unidad ? String(unidad).trim() : "",
    proveedorId: proveedorId ? String(proveedorId).trim() : ""
  };

  productos.push(nuevoProducto);
  writeProductos(productos);

  res.status(201).json(nuevoProducto);
});

// PUT /productos/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, categoria, precio, stock, unidad, proveedorId } = req.body;

  const productos = readProductos();
  const index = productos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  if (nombre !== undefined && String(nombre).trim() === "") {
    return res.status(400).json({ error: "El nombre no puede ser vacío" });
  }

  if (stock !== undefined && typeof stock !== "number") {
    return res.status(400).json({ error: "Stock debe ser numérico" });
  }

  if (precio !== undefined && typeof precio !== "number") {
    return res.status(400).json({ error: "Precio debe ser numérico" });
  }

  const actual = productos[index];

  const actualizado = {
    ...actual,
    nombre: nombre !== undefined ? String(nombre).trim() : actual.nombre,
    categoria: categoria !== undefined ? String(categoria).trim() : actual.categoria,
    precio: precio !== undefined ? precio : actual.precio,
    stock: stock !== undefined ? stock : actual.stock,
    unidad: unidad !== undefined ? String(unidad).trim() : actual.unidad,
    proveedorId:
      proveedorId !== undefined ? String(proveedorId).trim() : actual.proveedorId,
  };

  productos[index] = actualizado;
  writeProductos(productos);

  res.json(actualizado);
});

// DELETE /productos/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const productos = readProductos();
  const index = productos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  const eliminado = productos.splice(index, 1)[0];
  writeProductos(productos);

  res.json({ ok: true, eliminado });
});

module.exports = router;
