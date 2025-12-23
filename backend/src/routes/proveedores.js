const express = require("express");
const router = express.Router();
const { readProveedores, writeProveedores } = require("../utils/fileDB");

// GET /proveedores
router.get("/", (req, res) => {
  const proveedores = readProveedores();
  res.json(proveedores);
});

// POST /proveedores
router.post("/", (req, res) => {
  const { nombre, contacto, telefono, email, notas } = req.body;

  if (!nombre || String(nombre).trim() === "") {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  const proveedores = readProveedores();

  const nuevoProveedor = {
    id: `prov-${Date.now()}`,
    nombre: String(nombre).trim(),
    contacto: contacto ? String(contacto).trim() : "",
    telefono: telefono ? String(telefono).trim() : "",
    email: email ? String(email).trim() : "",
    notas: notas ? String(notas).trim() : "",
  };

  proveedores.push(nuevoProveedor);
  writeProveedores(proveedores);

  res.status(201).json(nuevoProveedor);
});

// PUT /proveedores/:id
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, contacto, telefono, email, notas } = req.body;

  const proveedores = readProveedores();
  const index = proveedores.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Proveedor no encontrado" });
  }

  if (nombre !== undefined && String(nombre).trim() === "") {
    return res.status(400).json({ error: "El nombre no puede ser vacío" });
  }

  const proveedorActual = proveedores[index];

  const proveedorActualizado = {
    ...proveedorActual,
    nombre: nombre !== undefined ? String(nombre).trim() : proveedorActual.nombre,
    contacto:
      contacto !== undefined ? String(contacto).trim() : proveedorActual.contacto,
    telefono:
      telefono !== undefined ? String(telefono).trim() : proveedorActual.telefono,
    email: email !== undefined ? String(email).trim() : proveedorActual.email,
    notas: notas !== undefined ? String(notas).trim() : proveedorActual.notas,
  };

  proveedores[index] = proveedorActualizado;
  writeProveedores(proveedores);

  res.json(proveedorActualizado);
});

// DELETE /proveedores/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const proveedores = readProveedores();
  const index = proveedores.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Proveedor no encontrado" });
  }

  const eliminado = proveedores.splice(index, 1)[0];
  writeProveedores(proveedores);

  res.json({ ok: true, eliminado });
});

module.exports = router;
